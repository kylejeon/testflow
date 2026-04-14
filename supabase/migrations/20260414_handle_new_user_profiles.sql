-- Migration: Auto-create profiles row on auth.users INSERT
--
-- Previously profiles were created only by the frontend (ensureProfileExists).
-- This trigger ensures a profile row always exists regardless of frontend issues
-- (race conditions, network errors, PKCE flow timing).
--
-- Correct column names: subscription_tier (not tier), no plan_name column.
-- Uses a separate trigger name so it doesn't conflict with the existing
-- on_auth_user_created trigger (which creates user_onboarding rows).

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
    1,
    false
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

-- Note: 'on_auth_user_created' is already used by create_onboarding_record().
-- Use a distinct name for this trigger.
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
