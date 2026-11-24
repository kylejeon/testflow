-- Migration: Force every profile to Enterprise L (tier 7) at the DB level.
--
-- Background: 20260520_internal_only_mode.sql set the default/trigger to tier 7,
-- but the frontend signup flow (src/pages/auth/page.tsx) upserted
-- subscription_tier = 1 right after the handle_new_user() trigger ran, so users
-- who signed up afterwards were left on Free (tier 1). Edge functions
-- (Jira/GitHub issue, CI upload, AI usage) read profiles.subscription_tier
-- directly, so those users were actually gated.
--
-- Fix: a BEFORE INSERT OR UPDATE trigger pins subscription_tier = 7 and
-- is_trial = FALSE regardless of which code path writes the row (frontend,
-- edge functions, cron, webhooks). Then backfill existing rows.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION public.force_enterprise_l_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.subscription_tier := 7;
  NEW.is_trial := FALSE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_enterprise_l_tier ON public.profiles;
CREATE TRIGGER trg_force_enterprise_l_tier
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.force_enterprise_l_tier();

-- Backfill (the trigger also enforces this on the UPDATE itself).
UPDATE public.profiles
SET subscription_tier = 7, is_trial = FALSE
WHERE subscription_tier IS DISTINCT FROM 7 OR is_trial IS DISTINCT FROM FALSE;
