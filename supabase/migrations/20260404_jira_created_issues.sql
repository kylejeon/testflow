-- ============================================================
-- jira_created_issues: Flaky AI Analyze에서 생성된 Jira 이슈 기록
-- project_id + pattern_name 기준으로 중복 방지
-- ============================================================

CREATE TABLE IF NOT EXISTS jira_created_issues (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_name TEXT       NOT NULL,
  jira_issue_key TEXT     NOT NULL,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, pattern_name)
);

-- Index for fast lookup by project
CREATE INDEX IF NOT EXISTS idx_jira_created_issues_project
  ON jira_created_issues (project_id);

-- RLS
ALTER TABLE jira_created_issues ENABLE ROW LEVEL SECURITY;

-- Project members can read
CREATE POLICY "project members can read jira_created_issues"
  ON jira_created_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = jira_created_issues.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Project members can insert
CREATE POLICY "project members can insert jira_created_issues"
  ON jira_created_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = jira_created_issues.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Creator can delete (allow re-create after manual delete)
CREATE POLICY "creator can delete jira_created_issues"
  ON jira_created_issues FOR DELETE
  USING (created_by = auth.uid());
