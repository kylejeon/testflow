-- ============================================================
-- f007 — Environment `is_active` 변경은 Admin+ 만 가능 (DB-level)
--
-- 배경:
--   기존 RLS `environments_update` 정책은 Tester+ 의 모든 UPDATE 를 허용.
--   UI 는 `canDeactivate = can('delete_project')` (Admin+) 로 is_active
--   토글을 제한하지만, Supabase anon key 를 가진 Tester 가 supabase-js
--   직접 호출로 is_active=false 를 우회해 설정 가능.
--
-- 수정:
--   BEFORE UPDATE 트리거에서 NEW.is_active <> OLD.is_active 일 때만
--   Admin+ 역할 검증. 일반 필드 (name, os_name, browser_name 등) 업데이트는
--   기존과 동일하게 Tester+ 허용 — 관리 효율성 + 보안 경계 모두 확보.
--
-- 관련 문서:
--   - feature_list.json f007
--   - qa-report-environment-workflow M-1 (클라이언트 가드만 적용된 상태)
--
-- 적용 방식:
--   CEO 가 Supabase Dashboard SQL Editor 에서 수동 실행.
--   f011 / f018 / f001 선례와 동일.
-- ============================================================

-- ── 트리거 함수 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_environments_enforce_active_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- is_active 가 변경되지 않았으면 검증 생략 (Tester+ 의 일반 업데이트 허용)
  IF NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
    RETURN NEW;
  END IF;

  -- 현재 유저의 해당 프로젝트 역할 조회 (role_override > org role > 'viewer')
  SELECT COALESCE(pm.role_override, om.role, 'viewer')
    INTO v_role
  FROM   project_members pm
  LEFT JOIN organization_members om
    ON   om.organization_id = (
           SELECT organization_id FROM projects WHERE id = pm.project_id
         )
   AND   om.user_id = pm.user_id
  WHERE  pm.user_id = auth.uid()
    AND  pm.project_id = NEW.project_id
  LIMIT 1;

  -- Admin+ 아니면 거부
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION
      'Environment activation toggle requires Admin role or higher (current: %)',
      COALESCE(v_role, 'no access')
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_environments_enforce_active_admin() IS
  'f007 — BEFORE UPDATE 트리거로 environments.is_active 변경을 Admin+ 로 제한. '
  'RLS UPDATE 정책(Tester+) 은 변경 없음 — 일반 필드 수정은 기존대로 허용.';

-- ── 트리거 등록 ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_environments_enforce_active_admin ON environments;
CREATE TRIGGER trg_environments_enforce_active_admin
  BEFORE UPDATE ON environments
  FOR EACH ROW
  WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
  EXECUTE FUNCTION fn_environments_enforce_active_admin();

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_environments_enforce_active_admin ON environments;
--   DROP FUNCTION IF EXISTS fn_environments_enforce_active_admin();
--   NOTIFY pgrst, 'reload schema';
-- ============================================================
