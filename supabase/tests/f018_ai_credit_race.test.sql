-- ============================================================
-- f018 — AI Credit Race Condition pgTAP test (AC-17)
--
-- Related spec: docs/specs/dev-spec-f018-ai-credit-race-condition.md §14
--
-- 실행법 (local supabase):
--   supabase test db --file supabase/tests/f018_ai_credit_race.test.sql
--
-- 혹은 psql 직접 호출:
--   psql "$DATABASE_URL" -f supabase/tests/f018_ai_credit_race.test.sql
--
-- 주의: pgTAP 미설치 시 `CREATE EXTENSION pgtap;` 필요.
-- 이 파일은 ROLLBACK 으로 마무리되어 DB 상태를 변경하지 않는다.
-- ============================================================

BEGIN;

-- pgTAP extension — supabase 는 기본 포함.
SET client_min_messages = WARNING;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(5);

-- ─── Setup ───────────────────────────────────────────────────
-- Hobby owner (limit=15) 에서 usage=14/15 상태로 시드.
INSERT INTO auth.users (id, email, instance_id, aud, role)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'f018owner@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, subscription_tier)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 2)
ON CONFLICT (id) DO UPDATE SET subscription_tier = 2;

INSERT INTO projects (id, name, owner_id)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'f018 race test project', '11111111-1111-1111-1111-111111111111'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 14 existing log rows at step=1 this month (usage = 14)
INSERT INTO ai_generation_logs (user_id, project_id, mode, step, credits_used, created_at)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'text',
  1,
  1,
  now()
FROM generate_series(1, 14);

-- ─── Test 1: boundary call should be allowed (14 + 1 = 15) ──
SELECT is(
  (consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 1, 15
  ) ->> 'allowed')::bool,
  true,
  'f018 AC-17.1: boundary consume (14→15) should be allowed'
);

-- ─── Test 2: next call should be blocked (15 + 1 > 15) ──────
SELECT is(
  consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 1, 15
  ) ->> 'reason',
  'quota_exceeded',
  'f018 AC-17.2: over-limit call should return quota_exceeded'
);

-- ─── Test 3: SUM(credits_used) must equal 15 exactly ────────
-- (14 initial seed + 1 boundary allowed = 15; the 2nd (blocked) did NOT INSERT)
SELECT is(
  (SELECT SUM(credits_used) FROM ai_generation_logs
    WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid
      AND step = 1
      AND created_at >= date_trunc('month', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC'),
  15::bigint,
  'f018 AC-17.3: final usage SUM must equal limit exactly (no over-shoot)'
);

-- ─── Test 4: unlimited tier (-1) always allowed + INSERT ─────
SELECT is(
  (consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 1, -1
  ) ->> 'allowed')::bool,
  true,
  'f018 AC-17.4: unlimited tier (limit=-1) should always allow'
);

-- ─── Test 5: credit_cost = 0 always allowed, regardless of limit ──
SELECT is(
  (consume_ai_credit_and_log(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'text', 1, 0, 15
  ) ->> 'allowed')::bool,
  true,
  'f018 AC-17.5: creditCost=0 should allow regardless of limit'
);

SELECT * FROM finish();
ROLLBACK;
