-- Migration: Register pg_cron job for daily Loops contact property sync
--
-- Runs at 01:00 UTC daily (after trial-ending-reminder and trial-expire-handler at 00:00).
-- Calls sync-loops-contacts Edge Function which PUTs fresh testCaseCount,
-- testRunCount, teamMemberCount, trialDaysLeft to Loops for all active trial users.
-- This keeps merge tags accurate in mid-trial emails (e.g. trial_day_7).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ── sync-loops-contacts ──────────────────────────────────────────────────────

SELECT cron.unschedule('sync-loops-contacts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-loops-contacts'
);

SELECT cron.schedule(
  'sync-loops-contacts',
  '0 1 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/sync-loops-contacts',
      headers := '{"Authorization": "Bearer EkilIAiWkfGcO87maKa/SbYE82uWiR9KuTEMeOiuaxseWehAMOzFwPVAXRJibmr4", "Content-Type": "application/json"}'::jsonb,
      body    := '{"triggered_by": "pg-cron"}'::jsonb
    ) AS request_id;
  $cron$
);
