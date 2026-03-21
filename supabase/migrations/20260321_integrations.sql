-- Slack & Teams webhook integrations
CREATE TABLE IF NOT EXISTS integrations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('slack', 'teams')),
  webhook_url TEXT        NOT NULL,
  channel_name TEXT,
  events      TEXT[]      NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integrations_project_id_idx ON integrations(project_id);

-- Delivery log per webhook send attempt
CREATE TABLE IF NOT EXISTS integration_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  UUID        NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  payload         JSONB,
  status          TEXT        NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  response_code   INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx     ON integration_logs(created_at DESC);

-- RLS: only project members can read/write integrations
ALTER TABLE integrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can manage integrations"
  ON integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = integrations.project_id
        AND project_members.user_id    = auth.uid()
    )
  );

CREATE POLICY "project members can view integration logs"
  ON integration_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN project_members pm ON pm.project_id = i.project_id
      WHERE i.id = integration_logs.integration_id
        AND pm.user_id = auth.uid()
    )
  );
