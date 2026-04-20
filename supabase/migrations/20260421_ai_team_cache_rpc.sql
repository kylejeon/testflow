-- ============================================================
-- AI 캐시 조회 — Owner 팀 Shared Pool 확장 (RPC)
-- 관련 스펙: pm/specs/dev-spec-ai-usage-shared-pool.md §6-6 (팀 캐시 공유)
--
-- 배경:
--   ai_generation_logs 의 RLS 가 본인(auth.uid() = user_id) 행만 SELECT 허용.
--   이 때문에 프론트가 직접 ai_generation_logs 를 조회하면 같은 owner 팀의
--   다른 멤버가 생성한 AI 결과(예: risk-predictor plan 분석)를 볼 수 없어
--   팀원이 각자 AI 호출하면 credit 이 중복 차감된다.
--
--   AI usage shared pool 은 이미 owner 단위로 집계되지만(b87189b / 0a08a8b /
--   ebf7db2), 캐시 조회 경로는 여전히 self-only 였다. 이 마이그레이션은 owner
--   팀 내에서 캐시를 공유할 수 있도록 두 개의 SECURITY DEFINER RPC 를 추가한다.
--
-- 정책:
--   Team scope   = owner ∪ owner 소유 프로젝트의 project_members.user_id
--   Cache scope  = 동일 owner 팀의 최신 1건 (mode + input_data 매칭)
--   INSERT 는 건드리지 않는다 (호출자 자신의 user_id 로 계속 기록됨).
-- ============================================================

-- 1) Owner 팀의 전체 user_id 목록 (owner + 소유 프로젝트 멤버) ----------------
CREATE OR REPLACE FUNCTION get_owner_team_user_ids(p_owner_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_owner_id AS uid
  UNION
  SELECT pm.user_id
  FROM project_members pm
  JOIN projects p ON p.id = pm.project_id
  WHERE p.owner_id = p_owner_id;
$$;

COMMENT ON FUNCTION get_owner_team_user_ids(uuid) IS
  'Owner 팀 user_id 목록 (owner 본인 + owner 소유 프로젝트의 project_members). '
  'AI 캐시/사용량 shared pool 집계의 공통 범위로 사용.';

GRANT EXECUTE ON FUNCTION get_owner_team_user_ids(uuid) TO authenticated, service_role;


-- 2) Owner 팀의 AI 로그 캐시 최신 1건 조회 -----------------------------------
--
--   호출자 검증: 호출자(auth.uid()) 가 p_owner_id 본인이거나 p_owner_id 가
--   소유한 프로젝트의 멤버여야 함. 그렇지 않으면 NULL 반환.
--
--   검색 조건:
--     - mode = p_mode
--     - step = 1 (quota 집계 대상과 동일)
--     - input_data @> p_input_match (JSONB 부분 매칭)
--     - user_id IN get_owner_team_user_ids(p_owner_id)
--
--   반환: 최신 created_at 기준 1건의 output_data + created_at + user_id.
--         일치 캐시 없으면 row 0 개.
-- ------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_team_ai_log(
  p_owner_id uuid,
  p_mode text,
  p_input_match jsonb
)
RETURNS TABLE (
  output_data jsonb,
  created_at timestamptz,
  user_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_authorized boolean;
BEGIN
  IF v_caller IS NULL THEN
    RETURN;
  END IF;

  -- 호출자가 owner 본인이거나 owner 팀 멤버인지 확인
  SELECT EXISTS (
    SELECT 1 FROM get_owner_team_user_ids(p_owner_id) AS t(uid)
    WHERE t.uid = v_caller
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT l.output_data, l.created_at, l.user_id
  FROM ai_generation_logs l
  WHERE l.mode = p_mode
    AND l.step = 1
    AND l.input_data @> p_input_match
    AND l.user_id IN (SELECT uid FROM get_owner_team_user_ids(p_owner_id) AS t(uid))
  ORDER BY l.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_team_ai_log(uuid, text, jsonb) IS
  'AI 캐시 조회 (owner 팀 공유). mode + input_data 매칭으로 최신 1건 반환. '
  'RLS 우회용 SECURITY DEFINER. 호출자가 owner 본인 또는 owner 팀 멤버가 아니면 빈 결과.';

GRANT EXECUTE ON FUNCTION get_team_ai_log(uuid, text, jsonb) TO authenticated, service_role;


NOTIFY pgrst, 'reload schema';
