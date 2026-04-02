-- ============================================================
-- HOTFIX: organization_members RLS 무한 재귀 해결
--
-- 원인: organization_members의 RLS 정책들이 자기 자신을 서브쿼리
--       → projects 조회 시 무한 재귀 → 500 Internal Server Error
--
-- 해결: SECURITY DEFINER 헬퍼 함수를 사용하여 RLS 우회
--       get_user_org_ids()는 이미 SECURITY DEFINER로 정의되어 있음
-- ============================================================

-- ── 1. Admin org 목록 반환 헬퍼 (SECURITY DEFINER → RLS 우회) ──
CREATE OR REPLACE FUNCTION get_user_admin_org_ids(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT organization_id
    FROM   organization_members
    WHERE  user_id = p_user_id
      AND  role IN ('owner', 'admin')
  );
$$;

-- ── 2. organization_members 자기참조 정책 수정 ─────────────────

-- Fix: SELECT 정책 - 자기참조 서브쿼리 → SECURITY DEFINER 함수로 교체
DROP POLICY IF EXISTS "org_members_can_view_members" ON organization_members;
CREATE POLICY "org_members_can_view_members"
  ON organization_members FOR SELECT
  USING (organization_id = ANY(get_user_org_ids()));

-- Fix: INSERT 정책 - 자기참조 EXISTS → SECURITY DEFINER 함수로 교체
DROP POLICY IF EXISTS "org_admins_can_add_members" ON organization_members;
CREATE POLICY "org_admins_can_add_members"
  ON organization_members FOR INSERT
  WITH CHECK (organization_id = ANY(get_user_admin_org_ids()));

-- Fix: DELETE 정책 - 자기참조 EXISTS → SECURITY DEFINER 함수로 교체
DROP POLICY IF EXISTS "org_admins_or_self_can_remove" ON organization_members;
CREATE POLICY "org_admins_or_self_can_remove"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR organization_id = ANY(get_user_admin_org_ids())
  );

-- ── 3. projects 정책도 SECURITY DEFINER 함수 사용으로 통일 ─────
DROP POLICY IF EXISTS "org_isolated_project_access" ON projects;
CREATE POLICY "org_isolated_project_access"
  ON projects FOR ALL
  USING (
    -- Case A: org 지정 프로젝트 → SECURITY DEFINER 함수로 org 확인
    (
      organization_id IS NOT NULL
      AND organization_id = ANY(get_user_org_ids())
    )
    OR
    -- Case B: org 미지정 프로젝트 → 기존 project_members 폴백 (하위 호환)
    (
      organization_id IS NULL
      AND id IN (
        SELECT project_id FROM project_members
        WHERE  user_id = auth.uid()
      )
    )
  );
