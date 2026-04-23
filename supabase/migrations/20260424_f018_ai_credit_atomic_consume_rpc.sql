-- ============================================================
-- f018 — AI Credit 원자적 소비 RPC (Advisory Lock)
--
-- Related spec: docs/specs/dev-spec-f018-ai-credit-race-condition.md
--
-- 목적:
--   checkAiAccess 의 SELECT SUM 과 ai_generation_logs INSERT 사이에 있는
--   race condition 을 owner 단위 advisory lock 으로 직렬화한다.
--   락 획득 후 usage 를 재계산하여 limit 초과 시 INSERT 하지 않는다.
--
-- 호출자:
--   supabase/functions/generate-testcases/index.ts        (5개 지점)
--   supabase/functions/milestone-risk-predictor/index.ts  (1개 지점)
--   supabase/functions/risk-predictor/index.ts            (1개 지점)
--   supabase/functions/plan-assistant/index.ts            (1개 지점)
--
-- 옵션 A 채택 (Dev Spec §16): 신규 `consume_ai_credit_and_log()` 로
-- (lock → re-SELECT usage → INSERT) 를 1 트랜잭션에 묶는다.
-- Lock key = hashtextextended('ai_credit:' || owner_id::text, 0) — 64-bit.
-- 충돌 확률은 N=1M owners 기준 ≈ 2.7e-8 (Dev Spec §11, 무시 가능).
--
-- Idempotency: CREATE OR REPLACE FUNCTION
-- Rollback: 본 파일 하단 주석 참조
-- ============================================================

CREATE OR REPLACE FUNCTION consume_ai_credit_and_log(
  p_user_id           uuid,
  p_owner_id          uuid,
  p_project_id        uuid,
  p_mode              text,
  p_step              int,
  p_credit_cost       int,
  p_limit             int,
  p_tokens_used       int       DEFAULT 0,
  p_latency_ms        int       DEFAULT 0,
  p_input_data        jsonb     DEFAULT NULL,
  p_output_data       jsonb     DEFAULT NULL,
  p_titles_generated  int       DEFAULT NULL,
  p_titles_selected   int       DEFAULT NULL,
  p_model_used        text      DEFAULT NULL,
  p_session_id        uuid      DEFAULT NULL,
  p_input_text        text      DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key       bigint;
  v_lock_start     timestamptz := clock_timestamp();
  v_lock_wait_ms   int;
  v_used           bigint;
  v_log_id         uuid;
  v_month_start    timestamptz := (date_trunc('month', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC');
BEGIN
  -- Input validation (AC-1, AC-5)
  IF p_owner_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_owner_id and p_user_id are required';
  END IF;
  IF p_credit_cost < 0 THEN
    RAISE EXCEPTION 'p_credit_cost must be >= 0';
  END IF;

  -- 1) Advisory xact-lock: owner 단위 직렬화 (AC-3, AC-8).
  --    hashtextextended 는 64-bit. seed=0.
  --    prefix 'ai_credit:' 로 네임스페이스 격리 (타 기능과 충돌 불가).
  v_lock_key := hashtextextended('ai_credit:' || p_owner_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Observability: lock 획득까지 걸린 시간 기록 (50ms 초과만 로깅) — AC-16
  v_lock_wait_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_lock_start))::int;
  IF v_lock_wait_ms > 50 THEN
    RAISE NOTICE '[f018] lock contention owner=% wait_ms=%', p_owner_id, v_lock_wait_ms;
  END IF;

  -- 2) 재검증: 락 안에서 usage 를 다시 계산 (AC-4).
  --    기존 get_ai_shared_pool_usage 재사용 (20260420_ai_usage_rpc.sql).
  v_used := get_ai_shared_pool_usage(p_owner_id, v_month_start);

  -- 3) Quota 초과 판정 (AC-5: p_limit = -1 이면 무제한 → skip).
  IF p_limit >= 0 AND (v_used + p_credit_cost) > p_limit THEN
    RETURN jsonb_build_object(
      'allowed',     false,
      'reason',      'quota_exceeded',
      'used',        v_used,
      'limit',       p_limit,
      'credit_cost', p_credit_cost,
      'log_id',      NULL
    );
  END IF;

  -- 4) INSERT (원자적으로 lock 안에서 수행)
  INSERT INTO ai_generation_logs (
    user_id, project_id, mode, step,
    credits_used, tokens_used, latency_ms,
    input_data, output_data,
    titles_generated, titles_selected,
    model_used, session_id, input_text
  ) VALUES (
    p_user_id, p_project_id, p_mode, p_step,
    p_credit_cost, COALESCE(p_tokens_used, 0), COALESCE(p_latency_ms, 0),
    p_input_data, p_output_data,
    p_titles_generated, p_titles_selected,
    p_model_used, p_session_id, p_input_text
  )
  RETURNING id INTO v_log_id;

  -- 5) 성공 반환 (used 는 INSERT 이후 합계)
  RETURN jsonb_build_object(
    'allowed',     true,
    'used',        v_used + p_credit_cost,
    'limit',       p_limit,
    'credit_cost', p_credit_cost,
    'log_id',      v_log_id,
    'reason',      NULL
  );
END;
$$;

COMMENT ON FUNCTION consume_ai_credit_and_log(
  uuid, uuid, uuid, text, int, int, int,
  int, int, jsonb, jsonb, int, int, text, uuid, text
) IS
  'f018 — owner-level advisory lock + re-check + INSERT. '
  'Guarantees SUM(credits_used) <= p_limit under concurrent requests. '
  'Callers: generate-testcases, milestone-risk-predictor, risk-predictor, plan-assistant. '
  'Related: checkAiAccess is pre-flight only; this RPC is authoritative.';

REVOKE ALL ON FUNCTION consume_ai_credit_and_log(
  uuid, uuid, uuid, text, int, int, int,
  int, int, jsonb, jsonb, int, int, text, uuid, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION consume_ai_credit_and_log(
  uuid, uuid, uuid, text, int, int, int,
  int, int, jsonb, jsonb, int, int, text, uuid, text
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ── Rollback (수동 실행) ─────────────────────────────────────────
-- DROP FUNCTION IF EXISTS consume_ai_credit_and_log(
--   uuid, uuid, uuid, text, int, int, int,
--   int, int, jsonb, jsonb, int, int, text, uuid, text
-- );
-- NOTIFY pgrst, 'reload schema';
-- 호출 사이트 revert: git revert <commit-sha>
