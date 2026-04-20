-- ============================================================
-- Migration: environments (project-scoped Environment Catalog)
--
-- 목적:
--   OS/Browser/Device 조합을 구조화 필드로 관리하여 Plan Detail의
--   Environment Coverage Matrix(heatmap)를 실데이터로 구동한다.
--
-- 참고:
--   - test_runs.environment (text) 컬럼은 그대로 유지 (legacy fallback).
--   - test_runs.environment_id UUID 추가 (FK, ON DELETE SET NULL).
--   - RLS 역할 해석은 COALESCE(project_members.role_override, organization_members.role)
--     (기존 20260413_rbac_roles.sql + 20260413_project_members_role_override.sql 패턴).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. environments 테이블
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS environments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  os_name          TEXT        NULL,
  os_version       TEXT        NULL,
  browser_name     TEXT        NULL,
  browser_version  TEXT        NULL,
  device_type      TEXT        NOT NULL DEFAULT 'desktop'
                     CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  description      TEXT        NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by       UUID        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT environments_name_length_chk CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT environments_project_name_unique UNIQUE (project_id, name)
);

COMMENT ON TABLE environments IS
  'Project-scoped Environment Catalog (OS/Browser/Device combos). '
  'Referenced by test_runs.environment_id for structured heatmap aggregation. '
  'Legacy freeform text stays in test_runs.environment.';

-- ─────────────────────────────────────────────────────────────
-- 2. 인덱스
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_environments_project_active
  ON environments (project_id, is_active);

CREATE INDEX IF NOT EXISTS idx_environments_project_os
  ON environments (project_id, os_name)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_environments_project_browser
  ON environments (project_id, browser_name)
  WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────
-- 3. updated_at trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_environments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_environments_updated_at ON environments;
CREATE TRIGGER trg_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW
  EXECUTE FUNCTION fn_environments_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

-- SELECT: project 멤버 누구나
DROP POLICY IF EXISTS "environments_select" ON environments;
CREATE POLICY "environments_select"
  ON environments FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Tester 이상 (owner/admin/manager/tester)
DROP POLICY IF EXISTS "environments_insert" ON environments;
CREATE POLICY "environments_insert"
  ON environments FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id
      FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (
          SELECT organization_id FROM projects WHERE id = pm.project_id
        )
       AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer')
            IN ('owner','admin','manager','tester')
    )
  );

-- UPDATE: Tester 이상 (deactivate 포함)
DROP POLICY IF EXISTS "environments_update" ON environments;
CREATE POLICY "environments_update"
  ON environments FOR UPDATE
  USING (
    project_id IN (
      SELECT pm.project_id
      FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (
          SELECT organization_id FROM projects WHERE id = pm.project_id
        )
       AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer')
            IN ('owner','admin','manager','tester')
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id
      FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (
          SELECT organization_id FROM projects WHERE id = pm.project_id
        )
       AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer')
            IN ('owner','admin','manager','tester')
    )
  );

-- DELETE (hard delete): Admin 이상
DROP POLICY IF EXISTS "environments_delete" ON environments;
CREATE POLICY "environments_delete"
  ON environments FOR DELETE
  USING (
    project_id IN (
      SELECT pm.project_id
      FROM project_members pm
      LEFT JOIN organization_members om
        ON om.organization_id = (
          SELECT organization_id FROM projects WHERE id = pm.project_id
        )
       AND om.user_id = pm.user_id
      WHERE pm.user_id = auth.uid()
        AND COALESCE(pm.role_override, om.role, 'viewer')
            IN ('owner','admin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. test_runs.environment_id 추가 (legacy environment TEXT 유지)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS environment_id UUID NULL
  REFERENCES environments(id) ON DELETE SET NULL;

COMMENT ON COLUMN test_runs.environment_id IS
  'Structured environment ref (FK → environments.id). '
  'Coexists with legacy test_runs.environment TEXT column for backward compat.';

CREATE INDEX IF NOT EXISTS idx_test_runs_environment_id
  ON test_runs (environment_id)
  WHERE environment_id IS NOT NULL;
