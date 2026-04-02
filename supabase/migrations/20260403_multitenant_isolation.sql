-- ============================================================
-- P2: 멀티테넌트 데이터 격리 강화
-- Row-level RLS → Organization 레벨 격리로 전환
-- 기존 데이터 완전 하위 호환 보장
-- ============================================================
--
-- 아키텍처:
--   auth.users
--       └── profiles (1:1)
--       └── organization_members (N:M)
--               └── organizations  ← 테넌트 경계
--                       └── projects
--                               └── test_cases, test_runs, ...
--
-- 격리 전략:
--   1. organizations 테이블이 최상위 테넌트 경계
--   2. 모든 프로젝트는 반드시 하나의 organization에 속함
--   3. RLS: 사용자는 자신이 속한 org의 데이터만 접근 가능
--   4. 헬퍼 함수로 Edge Function에서도 동일 격리 적용
--   5. schema_name 컬럼 예약 → 미래 PostgreSQL 스키마 분리 대비
-- ============================================================

-- ── 1. Organizations 테이블 (테넌트 엔티티) ──────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  slug          text        NOT NULL,
  owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  plan_tier     int         NOT NULL DEFAULT 1
                            CHECK (plan_tier BETWEEN 1 AND 4),
  max_members   int         NOT NULL DEFAULT 5,
  -- 미래 PostgreSQL 스키마 격리 준비용 (현재 미사용)
  schema_name   text        UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner
  ON organizations (owner_id);

-- ── 2. Organization 멤버십 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'member'
                              CHECK (role IN ('owner', 'admin', 'member')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org   ON organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user  ON organization_members (user_id);

-- ── 3. Projects에 organization_id 추가 ───────────────────────
-- 하위 호환: 기존 행은 NULL → 마이그레이션 후 채움
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_org
  ON projects (organization_id);

-- ── 4. 격리 헬퍼 함수 ────────────────────────────────────────

-- 현재 사용자가 속한 모든 org ID 배열 반환
CREATE OR REPLACE FUNCTION get_user_org_ids(
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
  );
$$;

-- 사용자가 특정 프로젝트의 org에 속하는지 검증
CREATE OR REPLACE FUNCTION user_in_project_org(
  p_project_id uuid,
  p_user_id    uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   projects p
    JOIN   organization_members om
           ON om.organization_id = p.organization_id
    WHERE  p.id      = p_project_id
      AND  om.user_id = p_user_id
  );
$$;

-- 사용자가 특정 org의 admin 이상인지 검증
CREATE OR REPLACE FUNCTION user_is_org_admin(
  p_org_id  uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members
    WHERE  organization_id = p_org_id
      AND  user_id         = p_user_id
      AND  role IN ('owner', 'admin')
  );
$$;

-- ── 5. RLS: organizations ─────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE  user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_can_create_org"
  ON organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_owners_can_update"
  ON organizations FOR UPDATE
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- org 삭제는 서비스 롤만 (안전장치)
CREATE POLICY "service_role_can_delete_org"
  ON organizations FOR DELETE
  USING (false);

-- ── 6. RLS: organization_members ─────────────────────────────
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 같은 org 멤버끼리 목록 조회 가능
CREATE POLICY "org_members_can_view_members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE  user_id = auth.uid()
    )
  );

-- admin/owner만 멤버 추가
CREATE POLICY "org_admins_can_add_members"
  ON organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE  om.organization_id = organization_members.organization_id
        AND  om.user_id         = auth.uid()
        AND  om.role IN ('owner', 'admin')
    )
  );

-- admin/owner 또는 본인 탈퇴
CREATE POLICY "org_admins_or_self_can_remove"
  ON organization_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE  om.organization_id = organization_members.organization_id
        AND  om.user_id         = auth.uid()
        AND  om.role IN ('owner', 'admin')
    )
  );

-- ── 7. 강화된 Projects RLS ────────────────────────────────────
-- 기존 project_members 기반 정책을 유지하면서
-- organization 경계를 추가 레이어로 적용

DROP POLICY IF EXISTS "org_isolated_project_access" ON projects;

CREATE POLICY "org_isolated_project_access"
  ON projects FOR ALL
  USING (
    -- Case A: org가 지정된 프로젝트 → org 멤버십으로 격리
    (
      organization_id IS NOT NULL
      AND organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE  user_id = auth.uid()
      )
    )
    OR
    -- Case B: org 미지정 프로젝트 → 기존 project_members로 폴백 (하위 호환)
    (
      organization_id IS NULL
      AND id IN (
        SELECT project_id FROM project_members
        WHERE  user_id = auth.uid()
      )
    )
  );

-- ── 8. 데이터 마이그레이션: 기존 사용자 → Personal Org 자동 생성
DO $$
DECLARE
  v_profile record;
  v_org_id  uuid;
  v_slug    text;
BEGIN
  FOR v_profile IN SELECT id FROM profiles LOOP
    v_slug := 'org-' || replace(v_profile.id::text, '-', '');

    -- Personal org 생성 (이미 있으면 skip)
    INSERT INTO organizations (name, slug, owner_id, plan_tier)
    VALUES ('Personal', v_slug, v_profile.id, 1)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_org_id;

    -- 이미 존재하면 ID 조회
    IF v_org_id IS NULL THEN
      SELECT id INTO v_org_id
      FROM   organizations
      WHERE  owner_id = v_profile.id
      LIMIT  1;
    END IF;

    CONTINUE WHEN v_org_id IS NULL;

    -- owner 멤버로 등록 (이미 있으면 skip)
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_profile.id, 'owner')
    ON CONFLICT DO NOTHING;

    -- 이 사용자가 멤버인 프로젝트를 해당 org에 연결
    UPDATE projects p
    SET    organization_id = v_org_id
    FROM   project_members pm
    WHERE  pm.project_id = p.id
      AND  pm.user_id    = v_profile.id
      AND  p.organization_id IS NULL;

  END LOOP;
END;
$$;

-- ── 9. 트리거: 신규 사용자 가입 시 Personal Org 자동 생성 ─────
CREATE OR REPLACE FUNCTION create_personal_org_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_slug   text;
BEGIN
  v_slug := 'org-' || replace(NEW.id::text, '-', '');

  INSERT INTO organizations (name, slug, owner_id, plan_tier)
  VALUES ('Personal', v_slug, NEW.id, 1)
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- profiles INSERT 시 실행 (Supabase auth.users → profiles 연동 이후)
DROP TRIGGER IF EXISTS trg_create_personal_org ON profiles;
CREATE TRIGGER trg_create_personal_org
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_personal_org_on_signup();

-- ── 10. 트리거: 신규 프로젝트 생성 시 org 자동 배정 ───────────
CREATE OR REPLACE FUNCTION auto_assign_project_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    -- 생성자의 owner org에 자동 배정
    SELECT om.organization_id INTO NEW.organization_id
    FROM   organization_members om
    WHERE  om.user_id = auth.uid()
      AND  om.role    = 'owner'
    LIMIT  1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_project_org ON projects;
CREATE TRIGGER trg_auto_assign_project_org
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_project_org();

-- ── 11. updated_at 자동 갱신 ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- ── 주석 ──────────────────────────────────────────────────────
COMMENT ON TABLE organizations IS
  'Tenant boundary. Each organization owns projects and has members. '
  'schema_name reserved for future PostgreSQL-schema-per-tenant isolation.';

COMMENT ON TABLE organization_members IS
  'Maps users to organizations with roles (owner/admin/member). '
  'Determines cross-project data visibility within a tenant.';

COMMENT ON FUNCTION user_in_project_org IS
  'Returns true if the user belongs to the org that owns the given project. '
  'Use in Edge Functions for org-level access validation.';
