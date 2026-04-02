-- ============================================================
-- P2: API Rate Limiting — Token Bucket Implementation
-- ============================================================
-- Token bucket 방식 rate limiting:
-- - 각 식별자(user_id / ci_token_id) + scope 조합마다 버킷 유지
-- - 버킷에 tokens가 있으면 요청 허용, 없으면 429 반환
-- - 시간 경과에 따라 refill_rate 속도로 토큰 자동 보충
-- ============================================================

-- Rate limit 버킷 상태 테이블
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier      text        NOT NULL,           -- user_id 또는 ci_token_id
  scope           text        NOT NULL,           -- API 엔드포인트 구분자
  tokens          float       NOT NULL,           -- 현재 토큰 수
  capacity        float       NOT NULL,           -- 버킷 최대 용량
  refill_rate     float       NOT NULL,           -- 초당 보충 토큰 수
  last_refill_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_buckets_unique UNIQUE (identifier, scope)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_lookup
  ON rate_limit_buckets (identifier, scope);

-- 서비스 롤만 접근 가능 (RLS)
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_select" ON rate_limit_buckets
  FOR SELECT USING (false);
CREATE POLICY "service_role_only_insert" ON rate_limit_buckets
  FOR INSERT WITH CHECK (false);
CREATE POLICY "service_role_only_update" ON rate_limit_buckets
  FOR UPDATE USING (false);
CREATE POLICY "service_role_only_delete" ON rate_limit_buckets
  FOR DELETE USING (false);

-- ============================================================
-- 핵심 함수: 원자적 토큰 버킷 체크
-- ============================================================
-- 반환값 (jsonb):
--   allowed            bool    — 요청 허용 여부
--   tokens_remaining   float   — 소비 후 남은 토큰
--   retry_after_seconds float  — 거부 시 재시도까지 대기 시간(초)
-- ============================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier      text,
  p_scope           text,
  p_capacity        float DEFAULT 60,
  p_refill_rate     float DEFAULT 1.0,    -- 1 token/sec = 60 req/min
  p_cost            float DEFAULT 1.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now          timestamptz := clock_timestamp();
  v_elapsed      float;
  v_refilled     float;
  v_current      float;
  v_allowed      boolean;
  v_new_tokens   float;
  v_row          rate_limit_buckets%ROWTYPE;
BEGIN
  -- 동일 identifier+scope 동시 요청에 대한 직렬화 보장
  PERFORM pg_advisory_xact_lock(
    hashtext(p_identifier || '|' || p_scope)
  );

  -- 기존 버킷 조회 (FOR UPDATE로 락)
  SELECT * INTO v_row
  FROM rate_limit_buckets
  WHERE identifier = p_identifier AND scope = p_scope
  FOR UPDATE;

  -- ── 첫 번째 요청: 버킷 신규 생성 ──────────────────────────
  IF NOT FOUND THEN
    v_allowed    := p_capacity >= p_cost;
    v_new_tokens := p_capacity - p_cost;

    IF v_allowed THEN
      INSERT INTO rate_limit_buckets
        (identifier, scope, tokens, capacity, refill_rate, last_refill_at)
      VALUES
        (p_identifier, p_scope, v_new_tokens, p_capacity, p_refill_rate, v_now);
    END IF;

    RETURN jsonb_build_object(
      'allowed',              v_allowed,
      'tokens_remaining',     GREATEST(0, v_new_tokens),
      'retry_after_seconds',  CASE WHEN v_allowed THEN 0
                                   ELSE CEIL(p_cost / p_refill_rate)
                              END
    );
  END IF;

  -- ── 기존 버킷: 경과 시간만큼 토큰 보충 ───────────────────
  v_elapsed  := EXTRACT(EPOCH FROM (v_now - v_row.last_refill_at));
  v_refilled := v_elapsed * v_row.refill_rate;
  v_current  := LEAST(v_row.capacity, v_row.tokens + v_refilled);

  v_allowed := v_current >= p_cost;

  IF v_allowed THEN
    v_new_tokens := v_current - p_cost;
    UPDATE rate_limit_buckets
    SET tokens = v_new_tokens, last_refill_at = v_now
    WHERE identifier = p_identifier AND scope = p_scope;
  ELSE
    -- 거부 시에도 보충된 토큰 수는 반영 (시간 기준 유지)
    UPDATE rate_limit_buckets
    SET tokens = v_current, last_refill_at = v_now
    WHERE identifier = p_identifier AND scope = p_scope;
    v_new_tokens := v_current;
  END IF;

  RETURN jsonb_build_object(
    'allowed',              v_allowed,
    'tokens_remaining',     GREATEST(0, v_new_tokens),
    'retry_after_seconds',  CASE WHEN v_allowed THEN 0
                                 ELSE CEIL((p_cost - v_current) / v_row.refill_rate)
                            END
  );
END;
$$;

-- ============================================================
-- 정리 함수: 7일 이상 미사용 버킷 삭제 (주기적 호출용)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_rate_limit_buckets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM rate_limit_buckets
  WHERE last_refill_at < now() - interval '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================
-- Scope별 기본 설정 참고 (Edge Function에서 사용)
-- ============================================================
-- scope              capacity  refill_rate   의미
-- -----------------  --------  -----------   -------------------------
-- ci_upload          60        1.0           60 req/min burst, 1/s steady
-- ai_generate        10        0.167         10 burst, 10/min steady
-- webhook_send       30        0.5           30 burst, 30/min steady
-- jira_webhook       120       2.0           120 burst, 120/min steady
-- ============================================================

COMMENT ON TABLE rate_limit_buckets IS
  'Token bucket rate limiting state per (identifier, scope). '
  'identifier = user_id or ci_token_id. Managed exclusively by service role.';

COMMENT ON FUNCTION check_rate_limit IS
  'Atomically checks and consumes a token from the rate limit bucket. '
  'Returns allowed=true if a token was consumed, false with retry_after_seconds otherwise.';
