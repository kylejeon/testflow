-- Add assignee_username column to github_settings
ALTER TABLE github_settings ADD COLUMN IF NOT EXISTS assignee_username TEXT;
