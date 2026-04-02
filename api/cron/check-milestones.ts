/**
 * DISABLED: Vercel Cron bridge has been replaced by Supabase pg_cron.
 *
 * Milestone past-due checks now run via pg_cron calling the
 * check-milestone-past-due Edge Function directly at UTC 00:00, 06:00, 12:00, 18:00.
 *
 * See: supabase/migrations/20260402_pg_cron_milestone_check.sql
 */
