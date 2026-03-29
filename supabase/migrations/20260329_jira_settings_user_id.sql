-- Add user_id to jira_settings for per-user isolation (security fix)
ALTER TABLE jira_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows: assign to the first admin user if any exist
-- (Skip NOT NULL for now if existing rows have no user_id — CEO should verify)

-- Add unique constraint so each user has at most one jira config
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jira_settings_user_id_unique'
  ) THEN
    ALTER TABLE jira_settings ADD CONSTRAINT jira_settings_user_id_unique UNIQUE(user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE jira_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users manage own jira settings" ON jira_settings;

-- Create per-user RLS policy
CREATE POLICY "Users manage own jira settings"
  ON jira_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
