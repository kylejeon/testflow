-- Migration: Server-side Loops contact creation on profile signup
--
-- When a new row is inserted into public.profiles, this trigger fires and
-- calls send-loops-event via pg_net. This guarantees contact creation in
-- Loops regardless of any frontend call failures (race conditions, network
-- errors, fire-and-forget issues).
--
-- The frontend sendLoopsEvent calls remain in place as a fast-path; the
-- trigger is the reliable fallback. If both fire, the second contacts/create
-- returns 409 → contacts/update (idempotent).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Trigger function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.loops_notify_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  v_full_name  TEXT;
  v_parts      TEXT[];
  v_first_name TEXT;
  v_last_name  TEXT;
  v_payload    JSONB;
BEGIN
  -- Skip if no email (should never happen, but be safe)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  v_full_name  := COALESCE(NEW.full_name, '');
  v_parts      := ARRAY(
                    SELECT trim(p)
                    FROM unnest(string_to_array(trim(v_full_name), ' ')) AS p
                    WHERE trim(p) <> ''
                  );
  v_first_name := COALESCE(v_parts[1], split_part(NEW.email, '@', 1));
  v_last_name  := CASE
                    WHEN array_length(v_parts, 1) > 1
                    THEN array_to_string(v_parts[2:array_length(v_parts,1)], ' ')
                    ELSE ''
                  END;

  v_payload := jsonb_build_object(
    'email',        NEW.email,
    'eventName',    'user_signup',
    'contactProperties', jsonb_build_object(
      'firstName',       v_first_name,
      'lastName',        v_last_name,
      'planType',        'free',
      'signupDate',      to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
      'testCaseCount',   '0',
      'testRunCount',    '0',
      'teamMemberCount', '1'
    )
  );

  PERFORM net.http_post(
    url     := 'https://ahzfskzuyzcmgilcvozn.supabase.co/functions/v1/send-loops-event',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer EkilIAiWkfGcO87maKa/SbYE82uWiR9KuTEMeOiuaxseWehAMOzFwPVAXRJibmr4',
                 'Content-Type',  'application/json'
               ),
    body    := v_payload
  );

  RETURN NEW;
END;
$$;

-- ── Trigger ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_profile_created_notify_loops ON public.profiles;

CREATE TRIGGER on_profile_created_notify_loops
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.loops_notify_signup();
