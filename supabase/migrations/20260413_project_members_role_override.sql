-- ============================================================
-- 하이브리드 RBAC: project_members에 role_override 컬럼 추가
--
-- 동작 방식:
--   - role_override IS NULL  → Org 역할 사용 (기본)
--   - role_override IS NOT NULL → 해당 프로젝트에서 오버라이드된 역할 사용
--
-- 표시 규칙:
--   - NULL: "Tester (org)"   — org 역할 + "(org)" 라벨
--   - 값:   "Viewer (project)" — 오버라이드 역할 + "(project)" 라벨
-- ============================================================

ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS role_override TEXT NULL
  CHECK (role_override IN ('owner', 'admin', 'manager', 'tester', 'viewer', 'guest'));

COMMENT ON COLUMN project_members.role_override IS
  'Per-project role override. NULL = inherit org role from organization_members. '
  'Non-NULL = use this role for this project regardless of org role.';
