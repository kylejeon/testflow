-- Add auto_create_on_failure setting to jira_settings
ALTER TABLE jira_settings
  ADD COLUMN IF NOT EXISTS auto_create_on_failure TEXT DEFAULT 'disabled'
  CHECK (auto_create_on_failure IN ('disabled', 'all_failures', 'first_failure_only'));
