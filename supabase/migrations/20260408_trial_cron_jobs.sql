-- Migration: Register pg_cron jobs for Loops Trial Sequence
--
-- Prerequisites (already enabled from 20260402_pg_cron_milestone_check.sql):
--   pg_cron  — cron job scheduler
--   pg_net   — HTTP calls from PostgreSQL
--
-- Both functions run at 00:00 UTC daily:
--   trial-ending-reminder  → sends trial_ending_soon event 3 days before expiry
--   trial-expire-handler   → downgrades expired trials + sends trial_expired event

-- Ensure extensions are enabled (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ── trial-ending-reminder ────────────────────────────────────────────────────

SELECT cron.unschedule('trial-ending-reminder')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trial-ending-reminder'
);

SELECT cron.schedule(
  'trial-ending-reminder',
  '0 0 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/trial-ending-reminder',
      headers := '{"Authorization": "Bearer EkilIAiWkfGcO87maKa/SbYE82uWiR9KuTEMeOiuaxseWehAMOzFwPVAXRJibmr4", "Content-Type": "application/json"}'::jsonb,
      body    := '{"triggered_by": "pg-cron"}'::jsonb
    ) AS request_id;
  $cron$
);

-- ── trial-expire-handler ─────────────────────────────────────────────────────

SELECT cron.unschedule('trial-expire-handler')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trial-expire-handler'
);

SELECT cron.schedule(
  'trial-expire-handler',
  '0 0 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/trial-expire-handler',
      headers := '{"Authorization": "Bearer EkilIAiWkfGcO87maKa/SbYE82uWiR9KuTEMeOiuaxseWehAMOzFwPVAXRJibmr4", "Content-Type": "application/json"}'::jsonb,
      body    := '{"triggered_by": "pg-cron"}'::jsonb
    ) AS request_id;
  $cron$
);
