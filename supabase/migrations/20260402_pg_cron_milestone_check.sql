-- Migration: Replace Vercel Cron with pg_cron for milestone past-due checks
-- Schedule: UTC 00:00, 06:00, 12:00, 18:00 (4x daily)
--
-- Prerequisites (Supabase Dashboard > Database > Extensions):
--   pg_cron  — cron job scheduler
--   pg_net   — HTTP calls from PostgreSQL

-- Enable extensions (safe to run even if already enabled)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Remove any previously registered job with this name (idempotent)
select cron.unschedule('check-milestone-past-due')
where exists (
  select 1 from cron.job where jobname = 'check-milestone-past-due'
);

-- Schedule the milestone past-due check via Edge Function HTTP call
select cron.schedule(
  'check-milestone-past-due',              -- job name
  '0 0,6,12,18 * * *',                    -- UTC 00:00 / 06:00 / 12:00 / 18:00
  $cron$
    select net.http_post(
      url     := 'https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/check-milestone-past-due',
      headers := '{"Authorization": "Bearer EkilIAiWkfGcO87maKa/SbYE82uWiR9KuTEMeOiuaxseWehAMOzFwPVAXRJibmr4", "Content-Type": "application/json"}'::jsonb,
      body    := '{"triggered_by": "pg-cron"}'::jsonb
    ) as request_id;
  $cron$
);
