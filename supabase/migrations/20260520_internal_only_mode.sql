-- Migration: Internal-only mode — pin subscription tier to highest, drop
-- trial mechanics.
--
-- Rationale: Project has pivoted from public SaaS to internal-company tool.
-- All authenticated users should have access to every feature without tier
-- gating. The application code (src/lib/rbac.ts, src/hooks/useAiFeature.ts,
-- src/lib/aiUsage.ts) already treats every user as the highest tier (7);
-- this migration aligns the database with that runtime behavior.
--
-- Strategy: We deliberately do NOT drop the `subscription_tier`, `is_trial`,
-- `trial_*`, `subscription_ends_at`, or `payment_provider` columns because
-- application queries still SELECT them (e.g. settings/page.tsx). Dropping
-- them would cause runtime errors. Instead:
--   1. ALTER DEFAULT — new rows automatically get tier 7
--   2. UPDATE existing rows to tier 7 with trial fields cleared
--   3. Replace handle_new_user() trigger to insert tier 7 on signup
--   4. DROP trial_history table (no longer relevant to internal flow)
--
-- Safety: idempotent, can be re-applied without harm. No CASCADE used.

-- ─── 1. Pin column defaults to internal-mode values ─────────────────────────

ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 7;

ALTER TABLE public.profiles
  ALTER COLUMN is_trial SET DEFAULT FALSE;

-- ─── 2. Update existing rows ────────────────────────────────────────────────

UPDATE public.profiles
SET
  subscription_tier      = 7,
  is_trial               = FALSE,
  trial_started_at       = NULL,
  trial_ends_at          = NULL,
  subscription_ends_at   = NULL,
  trial_ending_soon_sent = FALSE,
  trial_expired_sent     = FALSE;

-- ─── 3. Update handle_new_user trigger — new accounts default to tier 7 ─────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    subscription_tier,
    is_trial
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULL
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(NEW.raw_user_meta_data->>'picture', ''),
      NULL
    ),
    'member',
    7,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = CASE
                   WHEN EXCLUDED.full_name IS NOT NULL THEN EXCLUDED.full_name
                   ELSE profiles.full_name
                 END,
    avatar_url = CASE
                   WHEN EXCLUDED.avatar_url IS NOT NULL THEN EXCLUDED.avatar_url
                   ELSE profiles.avatar_url
                 END;

  RETURN NEW;
END;
$$;

-- ─── 4. Drop trial_history table (no longer used) ───────────────────────────

DROP TABLE IF EXISTS public.trial_history;

-- ─── Notes for future cleanup ───────────────────────────────────────────────
-- Columns retained for backward compatibility with application code:
--   profiles.subscription_tier    (pinned to 7)
--   profiles.is_trial             (pinned to false)
--   profiles.trial_started_at     (always null)
--   profiles.trial_ends_at        (always null)
--   profiles.subscription_ends_at (always null)
--   profiles.payment_provider     (unused)
--   profiles.provider_customer_id (unused)
--   profiles.provider_subscription_id (unused)
-- A future migration may drop these columns once all SELECT clauses are
-- removed from the source tree.
