-- ============================================================
-- f011 — AI Token Budget Monitoring Dashboard
--
-- Related spec: docs/specs/dev-spec-f011-ai-token-budget-dashboard.md (§5, §10)
--
-- 목적:
--   1) Owner/Admin 팀 단위 AI 사용량을 day × mode × user 단위로 집계
--      (기존 get_ai_shared_pool_usage 는 월 총합 1개 숫자만 반환)
--   2) RLS(auth.uid() = user_id) 를 우회하기 위해 SECURITY DEFINER RPC
--   3) caller 본인이 owner 이거나, owner 소유 프로젝트의 organization admin
--      이 아니면 빈 결과 반환 (에러 throw 하지 않음)
--   4) 집계 쿼리 최적화용 composite index 추가
--
-- Idempotency:
--   - CREATE INDEX IF NOT EXISTS
--   - CREATE OR REPLACE FUNCTION
--   `supabase db reset` 여러 번 실행해도 안전.
--
-- Rollback (주석):
--   DROP FUNCTION IF EXISTS get_ai_usage_breakdown(uuid, timestamptz, timestamptz);
--   DROP INDEX IF EXISTS idx_ai_generation_logs_owner_date;
-- ============================================================

-- ── 1. 집계 최적화용 composite index (AC-21) ──────────────────
-- WHERE user_id IN (...) AND step=1 AND created_at >= ? GROUP BY date, mode 패턴 지원.
-- 기존 idx_ai_generation_logs_credits (user_id, step, created_at DESC) INCLUDE (credits_used)
-- 는 mode / project_id 를 INCLUDE 하지 않아 index-only scan 이 불가하다.
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_owner_date
  ON ai_generation_logs (user_id, step, created_at DESC)
  INCLUDE (mode, credits_used, project_id, tokens_used)
  WHERE step = 1;

-- ── 2. get_ai_usage_breakdown RPC (AC-10) ─────────────────────
CREATE OR REPLACE FUNCTION get_ai_usage_breakdown(
  p_owner_id   uuid,
  p_from       timestamptz,
  p_to         timestamptz
)
RETURNS TABLE (
  day           date,
  mode          text,
  user_id       uuid,
  credits_sum   bigint,
  call_count    bigint,
  tokens_sum    bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH caller_authorized AS (
    -- 호출자(auth.uid()) 가 p_owner_id 본인이거나,
    -- p_owner_id 가 소유한 프로젝트에서 organization owner/admin 역할인 경우만 통과.
    -- 실패 시 아래 team_ids / 본 SELECT 가 EXISTS (SELECT 1 FROM caller_authorized) 로 차단됨.
    SELECT 1 AS ok
    WHERE  auth.uid() = p_owner_id
       OR  EXISTS (
             SELECT 1
             FROM   projects pr
             JOIN   organization_members om
               ON   om.organization_id = pr.organization_id
             WHERE  pr.owner_id = p_owner_id
               AND  om.user_id = auth.uid()
               AND  om.role IN ('owner', 'admin')
             LIMIT  1
           )
  ),
  team_ids AS (
    SELECT p_owner_id AS uid
    UNION
    SELECT pm.user_id
    FROM   project_members pm
    JOIN   projects p ON p.id = pm.project_id
    WHERE  p.owner_id = p_owner_id
  )
  SELECT
    (date_trunc('day', l.created_at AT TIME ZONE 'UTC'))::date       AS day,
    l.mode                                                           AS mode,
    l.user_id                                                        AS user_id,
    SUM(COALESCE(l.credits_used, 1))::bigint                         AS credits_sum,
    COUNT(*)::bigint                                                 AS call_count,
    COALESCE(SUM(l.tokens_used), 0)::bigint                          AS tokens_sum
  FROM   ai_generation_logs l
  WHERE  EXISTS (SELECT 1 FROM caller_authorized)
    -- Server-side window guard (QA P2-2): reject windows longer than 2 years
    -- to prevent accidental/malicious wide scans. 2y covers the widest UI
    -- option (12m in v1, 24m reserved for Enterprise) with headroom.
    AND  (p_to - p_from) <= INTERVAL '2 years'
    AND  l.user_id IN (SELECT uid FROM team_ids)
    AND  l.step = 1
    AND  l.created_at >= p_from
    AND  l.created_at <  p_to
  GROUP  BY day, mode, l.user_id;
$$;

COMMENT ON FUNCTION get_ai_usage_breakdown(uuid, timestamptz, timestamptz) IS
  'f011 AI Usage Dashboard — per-day, per-mode, per-user credit breakdown. '
  'SECURITY DEFINER with caller authorization: owner self or organization admin only. '
  'Returns empty set when caller is not authorized (does not throw).';

GRANT EXECUTE ON FUNCTION get_ai_usage_breakdown(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
