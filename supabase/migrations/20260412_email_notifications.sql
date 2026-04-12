-- =============================================================
-- Email Notifications P0 – DB Schema
-- Creates:
--   1. notifications          – in-app real-time notifications
--   2. notification_preferences – in-app + email prefs per user
--   3. notification_queue     – digest queue for daily/weekly emails
-- =============================================================

-- ── 1. notifications (in-app) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  link        TEXT,
  project_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_notifications" ON public.notifications;
CREATE POLICY "users_own_notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ── 2. notification_preferences ───────────────────────────────
-- Columns:
--   in-app toggles  : invitation_sent, member_joined, run_created,
--                     run_completed, milestone_started/completed/past_due
--   email toggles   : email_run_created, email_run_completed,
--                     email_test_failed, email_project_invited, email_tc_assigned
--   email frequency : frequency  ('instant' | 'daily' | 'weekly' | 'off')
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                     BIGSERIAL   PRIMARY KEY,
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- in-app
  invitation_sent        BOOLEAN     NOT NULL DEFAULT true,
  member_joined          BOOLEAN     NOT NULL DEFAULT true,
  run_created            BOOLEAN     NOT NULL DEFAULT true,
  run_completed          BOOLEAN     NOT NULL DEFAULT true,
  milestone_started      BOOLEAN     NOT NULL DEFAULT true,
  milestone_completed    BOOLEAN     NOT NULL DEFAULT true,
  milestone_past_due     BOOLEAN     NOT NULL DEFAULT true,
  -- email (P0 events)
  email_run_created      BOOLEAN     NOT NULL DEFAULT true,
  email_run_completed    BOOLEAN     NOT NULL DEFAULT true,
  email_test_failed      BOOLEAN     NOT NULL DEFAULT true,
  email_project_invited  BOOLEAN     NOT NULL DEFAULT true,
  email_tc_assigned      BOOLEAN     NOT NULL DEFAULT true,
  -- delivery frequency
  frequency              TEXT        NOT NULL DEFAULT 'instant'
    CHECK (frequency IN ('instant', 'daily', 'weekly', 'off')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_prefs" ON public.notification_preferences;
CREATE POLICY "own_prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ── 3. notification_queue (digest) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL,
  sent        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_queue_user_sent_idx
  ON public.notification_queue(user_id, sent);
CREATE INDEX IF NOT EXISTS notification_queue_created_at_idx
  ON public.notification_queue(created_at DESC);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Only accessible via service_role (edge functions); no direct client access
DROP POLICY IF EXISTS "no_client_access" ON public.notification_queue;
CREATE POLICY "no_client_access" ON public.notification_queue
  FOR ALL USING (false);
