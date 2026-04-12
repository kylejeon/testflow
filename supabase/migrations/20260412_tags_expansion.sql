-- ============================================================
-- 태그 시스템 확장: test_runs + projects 에 tags 컬럼 추가
-- saved_views 테이블 추가 (개인 저장 필터)
-- tag_colors 테이블 추가 (프로젝트별 태그 색상)
-- ============================================================

-- ── 1. test_runs: tags 컬럼 ────────────────────────────────────
-- 프론트엔드 인터페이스 이미 tags: string[] 선언
-- 이미 있으면 무시 (IF NOT EXISTS)
ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- ── 2. projects: tags 컬럼 ────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- ── 3. saved_views 테이블 ─────────────────────────────────────
-- 사용자별 필터 뷰 저장
CREATE TABLE IF NOT EXISTS saved_views (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  entity_type text        NOT NULL
                CHECK (entity_type IN ('testcase', 'run')),
  filters     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_project
  ON saved_views (user_id, project_id, entity_type);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_saved_views"
  ON saved_views FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. tag_colors 테이블 ─────────────────────────────────────
-- 프로젝트별 태그 색상 (8 프리셋)
CREATE TABLE IF NOT EXISTS tag_colors (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag         text        NOT NULL,
  color       text        NOT NULL DEFAULT 'indigo'
              CHECK (color IN ('indigo','violet','pink','emerald','amber','cyan','red','teal')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tag_colors_unique_per_project UNIQUE (project_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tag_colors_project_id
  ON tag_colors (project_id);

ALTER TABLE tag_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_manage_tag_colors"
  ON tag_colors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tag_colors.project_id
        AND project_members.user_id    = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tag_colors.project_id
        AND project_members.user_id    = auth.uid()
    )
  );

COMMENT ON TABLE saved_views IS
  'User-scoped saved filter views for test cases and test runs.';

COMMENT ON TABLE tag_colors IS
  'Project-scoped tag color assignments (8 preset colors).';
