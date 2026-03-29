-- Add user preference and profile columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'YYYY-MM-DD',
  ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS default_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS auto_detect_tz BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
