-- ============================================================
-- github_settings: GitHub PAT 연동 설정 (per-user)
-- ============================================================

CREATE TABLE IF NOT EXISTS github_settings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token               TEXT        NOT NULL,        -- GitHub Personal Access Token
  owner               TEXT        NOT NULL,        -- GitHub username or org
  repo                TEXT        NOT NULL,        -- Default repository name
  default_labels      TEXT[]      NOT NULL DEFAULT '{}',
  auto_create_enabled BOOLEAN     NOT NULL DEFAULT false,
  auto_assign_enabled BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT github_settings_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_github_settings_user_id ON github_settings (user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_github_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_github_settings_updated_at ON github_settings;
CREATE TRIGGER trg_github_settings_updated_at
  BEFORE UPDATE ON github_settings
  FOR EACH ROW EXECUTE FUNCTION set_github_settings_updated_at();

-- RLS
ALTER TABLE github_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own github settings" ON github_settings;
CREATE POLICY "Users manage own github settings"
  ON github_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
