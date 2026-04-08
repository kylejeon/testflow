-- Migration: Add trial email tracking columns for Loops Trial Sequence
-- Prevents duplicate sends for trial_ending_soon and trial_expired events.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ending_soon_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_expired_sent     BOOLEAN DEFAULT FALSE;

-- Composite index for cron job queries (trial-ending-reminder, trial-expire-handler)
-- Both functions filter on is_trial=true + a sent flag + trial_ends_at range.
CREATE INDEX IF NOT EXISTS idx_profiles_trial_cron
  ON profiles (is_trial, trial_ends_at, trial_ending_soon_sent, trial_expired_sent)
  WHERE is_trial = TRUE;
