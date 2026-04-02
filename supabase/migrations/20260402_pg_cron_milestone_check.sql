-- Migration: Replace Vercel Cron with pg_cron for milestone past-due checks
-- Schedule: UTC 00:00, 06:00, 12:00, 18:00 (4x daily)
--
-- Prerequisites (run once in Supabase Dashboard > Database > Extensions):
--   pg_cron  — cron job scheduler
--   pg_net   — HTTP calls from PostgreSQL
--
-- Required: Set CRON_SECRET and Supabase URL as DB config before applying:
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<your-CRON_SECRET>';
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<ref>.supabase.co';
-- Or update the values inline below and replace the current_setting() calls.

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
      url     := current_setting('app.settings.supabase_url')
                   || '/functions/v1/check-milestone-past-due',
      headers := jsonb_build_object(
                   'Authorization', 'Bearer '
                     || current_setting('app.settings.cron_secret'),
                   'Content-Type',  'application/json'
                 ),
      body    := '{"triggered_by": "pg-cron"}'::jsonb
    ) as request_id;
  $cron$
);
