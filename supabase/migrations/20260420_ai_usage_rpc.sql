-- ============================================================
-- AI Usage Shared Pool RPC 함수
-- 관련 스펙: pm/specs/dev-spec-ai-usage-shared-pool.md §5 / §6-5
--
-- 목적: ai_generation_logs의 RLS(본인 행만 조회) 때문에 프론트에서
--       owner 팀 전체 usage 합계를 조회할 수 없으므로 SECURITY DEFINER RPC로
--       owner 단위 shared pool 집계를 수행한다.
--
-- 정책:
--   Billing entity = projects.owner_id
--   Usage scope   = owner ∪ owner 소유 프로젝트 멤버(project_members.user_id)
--   Aggregate     = SUM(COALESCE(credits_used, 1)) WHERE step = 1
--                   AND created_at >= p_month_start
--   월 경계        = UTC 기준 month start (기본값: 현재 UTC 월 1일)
-- ============================================================

CREATE OR REPLACE FUNCTION get_ai_shared_pool_usage(
  p_owner_id uuid,
  p_month_start timestamptz DEFAULT date_trunc('month', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC'
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH owner_projects AS (
    SELECT id FROM projects WHERE owner_id = p_owner_id
  ),
  member_ids AS (
    SELECT p_owner_id AS uid
    UNION
    SELECT user_id FROM project_members
    WHERE project_id IN (SELECT id FROM owner_projects)
  )
  SELECT COALESCE(SUM(COALESCE(credits_used, 1)), 0)::bigint
  FROM ai_generation_logs
  WHERE user_id IN (SELECT uid FROM member_ids)
    AND step = 1
    AND created_at >= p_month_start;
$$;

COMMENT ON FUNCTION get_ai_shared_pool_usage(uuid, timestamptz) IS
  'AI 사용량 집계: owner의 팀 shared pool 월간 credit 합계(SUM). '
  'SECURITY DEFINER로 RLS 우회. '
  'owner = projects.owner_id. step=1만 집계. credits_used NULL은 1로 처리.';

GRANT EXECUTE ON FUNCTION get_ai_shared_pool_usage(uuid, timestamptz) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
