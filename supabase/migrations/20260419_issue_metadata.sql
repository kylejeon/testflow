-- ============================================================
-- Issue Metadata 확장 (Option B)
-- test_results에 Jira/GitHub 이슈 메타데이터 저장
-- 관련 스펙: docs/specs/dev-spec-milestone-overview-redesign.md §5-2
-- ============================================================

-- 1. jira_issues_meta JSONB 컬럼 추가
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS jira_issues_meta JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN test_results.jira_issues_meta IS
  'Array of Jira issue metadata. Shape: [{key, url, priority, status, assignee_account_id, assignee_display_name, assignee_avatar_url, last_synced_at, error?}]. Synced every 6h via sync-jira-metadata cron.';

-- 2. 기존 issues text[] → jira_issues_meta로 1회성 백필
UPDATE test_results
SET jira_issues_meta = (
  SELECT jsonb_agg(jsonb_build_object(
    'key', key_val,
    'url', NULL,
    'priority', NULL,
    'status', NULL,
    'assignee_account_id', NULL,
    'assignee_display_name', NULL,
    'assignee_avatar_url', NULL,
    'last_synced_at', NULL
  ))
  FROM unnest(issues) AS key_val
)
WHERE issues IS NOT NULL
  AND array_length(issues, 1) > 0
  AND (jira_issues_meta IS NULL OR jsonb_array_length(jira_issues_meta) = 0);

-- 3. github_issues 스키마 문서화 업데이트
COMMENT ON COLUMN test_results.github_issues IS
  'Array of GitHub issue metadata. Shape: [{number, url, repo, priority?, state?, assignee_login?, assignee_display_name?, assignee_avatar_url?, last_synced_at?, error?}]. Synced every 6h via sync-github-metadata cron.';

-- 4. 인덱스: jira_issues_meta 내부 key 검색용 GIN
CREATE INDEX IF NOT EXISTS idx_test_results_jira_meta_gin
  ON test_results USING gin (jira_issues_meta);

-- 5. 인덱스: github_issues 내부 number 검색용 GIN
CREATE INDEX IF NOT EXISTS idx_test_results_github_issues_gin
  ON test_results USING gin (github_issues);

-- ============================================================
-- github_sync_log 테이블 신규 생성 (sync-github-metadata용)
-- ============================================================
CREATE TABLE IF NOT EXISTS github_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  github_issue_number TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  synced_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  testably_run_id UUID,
  testably_tc_id UUID
);

CREATE INDEX IF NOT EXISTS idx_github_sync_log_project
  ON github_sync_log(project_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_sync_log_issue
  ON github_sync_log(github_repo, github_issue_number);

-- RLS
ALTER TABLE github_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project members can read github_sync_log" ON github_sync_log;
CREATE POLICY "project members can read github_sync_log"
  ON github_sync_log FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- INSERT는 service_role only (Edge Function에서만) — 명시적 INSERT 정책 없음

-- ============================================================
-- pg_cron: sync-jira-metadata + sync-github-metadata (6시간마다)
-- 실제 등록은 Supabase Dashboard에서 수행. 템플릿만 주석으로 보관.
-- ============================================================
-- SELECT cron.schedule(
--   'sync-jira-metadata-6h',
--   '0 */6 * * *',
--   $$SELECT net.http_post(
--     url := 'https://{project}.supabase.co/functions/v1/sync-jira-metadata',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || '{service_role_key}')
--   )$$
-- );
-- SELECT cron.schedule(
--   'sync-github-metadata-6h',
--   '5 */6 * * *',
--   $$SELECT net.http_post(
--     url := 'https://{project}.supabase.co/functions/v1/sync-github-metadata',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || '{service_role_key}')
--   )$$
-- );
