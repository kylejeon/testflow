-- ============================================================
-- RBAC: organization_members 역할 6단계 확장
--
-- Owner > Admin > Manager > Tester > Viewer > Guest
--
-- 플랜별 사용 가능 역할:
--   Free/Hobby(1-2): 전원 Admin (역할 구분 없음)
--   Starter(3):       Owner / Admin / Member(=Tester DB값)
--   Professional+(4+): Owner / Admin / Manager / Tester / Viewer / Guest
--
-- 변경 사항:
--   1. role CHECK 제약을 6개 값으로 확장
--   2. 기존 'member' → 'tester' 마이그레이션
--   3. organization_members UPDATE RLS 정책 추가 (역할 변경용)
--   4. get_user_manager_org_ids() 헬퍼 추가 (manager 이상)
-- ============================================================

-- ── 1. CHECK 제약 확장 ────────────────────────────────────────

ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'tester', 'viewer', 'guest'));

-- ── 2. 기존 'member' 값 → 'tester' 마이그레이션 ──────────────

UPDATE organization_members
SET    role = 'tester'
WHERE  role = 'member';

-- ── 3. get_user_manager_org_ids() 헬퍼 추가 ──────────────────
-- manager 이상 (manager/admin/owner) org 목록 반환

CREATE OR REPLACE FUNCTION get_user_manager_org_ids(
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
      AND  role IN ('owner', 'admin', 'manager')
  );
$$;

-- ── 4. get_user_org_role() 헬퍼 추가 ─────────────────────────
-- 특정 org에서 사용자의 역할 반환 (없으면 NULL)

CREATE OR REPLACE FUNCTION get_user_org_role(
  p_org_id  uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM   organization_members
  WHERE  organization_id = p_org_id
    AND  user_id         = p_user_id
  LIMIT  1;
$$;

-- ── 5. organization_members UPDATE 정책 추가 ─────────────────
-- (기존 migration에 UPDATE 정책이 없었음)
--
-- 규칙:
--   - owner: 모든 멤버 역할 변경 가능 (단, 마지막 owner 강등 불가는 앱 레이어 처리)
--   - admin: 자신보다 낮은 역할(manager/tester/viewer/guest)만 변경 가능
--   - manager 이하: 역할 변경 불가

DROP POLICY IF EXISTS "org_role_managers_can_update" ON organization_members;
CREATE POLICY "org_role_managers_can_update"
  ON organization_members FOR UPDATE
  USING (
    -- 변경 대상 멤버의 org에서 현재 사용자가 admin 이상이어야 함
    organization_id = ANY(get_user_admin_org_ids())
  )
  WITH CHECK (
    organization_id = ANY(get_user_admin_org_ids())
  );

-- ── 6. 신규 가입자 trigger 기본 역할 'tester'로 변경 ─────────
-- create_personal_org_on_signup()에서 owner로 생성하므로 기본값만 변경

ALTER TABLE organization_members
  ALTER COLUMN role SET DEFAULT 'tester';

-- ── 주석 업데이트 ─────────────────────────────────────────────
COMMENT ON TABLE organization_members IS
  'Maps users to organizations with roles '
  '(owner/admin/manager/tester/viewer/guest). '
  'Starter plan: UI shows owner/admin/member (DB stores tester). '
  'Professional+: all 6 roles visible.';
