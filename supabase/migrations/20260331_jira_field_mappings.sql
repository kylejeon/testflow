-- Add field_mappings JSONB column to jira_settings
-- Format: [{"testably_field":"tc_tags","jira_field_id":"customfield_10001","jira_field_name":"Tags"}, ...]
ALTER TABLE jira_settings
  ADD COLUMN IF NOT EXISTS field_mappings JSONB DEFAULT '[]';
