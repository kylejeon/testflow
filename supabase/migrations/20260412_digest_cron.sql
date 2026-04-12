-- Migration: Register pg_cron job for daily/weekly notification digest
--
-- Runs at UTC 00:00 daily (= KST 09:00).
-- The send-digest Edge Function handles frequency filtering internally:
--   frequency = 'daily'  → sends every day
--   frequency = 'weekly' → sends only on Monday
--
-- Prerequisites (already enabled from earlier migrations):
--   pg_cron  — cron job scheduler
--   pg_net   — HTTP calls from PostgreSQL

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- ── daily-notification-digest ────────────────────────────────────────────────

SELECT cron.unschedule('daily-notification-digest')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-notification-digest'
);

SELECT cron.schedule(
  'daily-notification-digest',
  '0 0 * * *',   -- UTC 00:00 = KST 09:00, runs every day
  $cron$
    SELECT net.http_post(
      url     := 'https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/send-digest',
      headers := '{"Authorization": "Bearer EkilIAiWkfGcO87maKa/SbYE82uWiR9KuTEMeOiuaxseWehAMOzFwPVAXRJibmr4", "Content-Type": "application/json"}'::jsonb,
      body    := '{"triggered_by": "pg-cron"}'::jsonb
    ) AS request_id;
  $cron$
);
