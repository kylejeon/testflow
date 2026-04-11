-- Migration: trial_history table
--
-- Preserves trial usage records by email even after account deletion.
-- Prevents re-use of the free trial via sign-up with the same email.
--
-- RLS: no direct user access — service_role only (managed via Edge Functions).

CREATE TABLE IF NOT EXISTS trial_history (
  id               BIGSERIAL     PRIMARY KEY,
  email            TEXT          NOT NULL,
  trial_started_at TIMESTAMPTZ   NOT NULL,
  trial_ended_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trial_history_email ON trial_history (email);

-- RLS: enabled, no policies → only service_role can read/write
ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;
