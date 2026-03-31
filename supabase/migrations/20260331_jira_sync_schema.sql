-- Jira bidirectional sync schema (Phase 2 design)

-- Add sync-related columns to jira_settings
ALTER TABLE jira_settings
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'outbound'
    CHECK (sync_direction IN ('outbound', 'inbound', 'bidirectional')),
  ADD COLUMN IF NOT EXISTS status_mappings JSONB DEFAULT '[]';
-- status_mappings format: [{"testably_status":"failed","jira_transition_id":"31","jira_status_name":"Done"}, ...]

-- Sync log table for tracking all sync events
CREATE TABLE IF NOT EXISTS jira_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  jira_issue_key TEXT NOT NULL,
  jira_status TEXT,
  testably_run_id UUID,
  testably_tc_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  synced_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_project ON jira_sync_log(project_id);
CREATE INDEX IF NOT EXISTS idx_jira_sync_log_issue ON jira_sync_log(jira_issue_key);

-- RLS
ALTER TABLE jira_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync logs for their projects" ON jira_sync_log
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
