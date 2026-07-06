-- 20260706_organization_invitations.sql
-- 조직(org) 단위 이메일 초대링크 기능.
-- organization_members.user_id 는 NOT NULL FK(auth.users)라 미가입자는 넣을 수 없으므로
-- 가입 전까지 대기하는 pending 초대 저장소가 필요하다.
-- 기존 project_invitations 와 동일한 형태(project 단위)의 org 버전.
-- 멱등적(IF NOT EXISTS) — 재실행 안전.

CREATE TABLE IF NOT EXISTS organization_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL DEFAULT 'tester'
                              CHECK (role IN ('owner','admin','manager','tester','viewer','guest')),
  full_name       text,
  token           text        NOT NULL,
  invited_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_invitations_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_org_inv_org   ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_inv_token ON organization_invitations(token);

-- 동일 org + email 로는 미수락(pending) 초대가 1건만 존재하도록 강제 (재초대 시 upsert).
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_inv_pending
  ON organization_invitations(organization_id, lower(email))
  WHERE accepted_at IS NULL;

-- ── RLS ─────────────────────────────────────────────────────────────
-- 실제 verify/insert/accept 는 엣지함수가 서비스 롤(RLS 우회)로 수행한다.
-- 아래 정책은 프론트가 직접 초대 목록 조회/취소할 때의 안전망이며,
-- admin/owner 만 허용한다. get_user_admin_org_ids() 는
-- 20260403_fix_rls_infinite_recursion.sql:12 에 정의됨.
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_admins_can_view_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_view_invitations"
  ON organization_invitations FOR SELECT
  USING (organization_id = ANY(get_user_admin_org_ids()));

DROP POLICY IF EXISTS "org_admins_can_create_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_create_invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (organization_id = ANY(get_user_admin_org_ids()));

DROP POLICY IF EXISTS "org_admins_can_update_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_update_invitations"
  ON organization_invitations FOR UPDATE
  USING (organization_id = ANY(get_user_admin_org_ids()))
  WITH CHECK (organization_id = ANY(get_user_admin_org_ids()));

DROP POLICY IF EXISTS "org_admins_can_delete_invitations" ON organization_invitations;
CREATE POLICY "org_admins_can_delete_invitations"
  ON organization_invitations FOR DELETE
  USING (organization_id = ANY(get_user_admin_org_ids()));
