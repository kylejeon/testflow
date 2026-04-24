-- ============================================================
-- f007 — Environment is_active 토글 Admin+ 전용 pgTAP test
--
-- Related migration: supabase/migrations/20260424_f007_environments_deactivate_admin_only.sql
--
-- 실행법 (local supabase):
--   supabase test db --file supabase/tests/f007_env_deactivate_admin.test.sql
--
-- 이 파일은 BEGIN/ROLLBACK 으로 마무리되어 DB 상태를 변경하지 않는다.
-- ============================================================

BEGIN;

SET client_min_messages = WARNING;
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(4);

-- ─── Setup ───────────────────────────────────────────────────
-- 2 users: admin + tester, 1 project, 1 environment
INSERT INTO auth.users (id, email, instance_id, aud, role)
VALUES
  ('a0000007-0000-0000-0000-000000000001'::uuid, 'f007admin@test.local',  '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated'),
  ('a0000007-0000-0000-0000-000000000002'::uuid, 'f007tester@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, subscription_tier)
VALUES
  ('a0000007-0000-0000-0000-000000000001'::uuid, 4),  -- Professional
  ('a0000007-0000-0000-0000-000000000002'::uuid, 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, owner_id)
VALUES ('b0000007-0000-0000-0000-000000000001'::uuid, 'f007-project', 'a0000007-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO project_members (project_id, user_id, role_override)
VALUES
  ('b0000007-0000-0000-0000-000000000001'::uuid, 'a0000007-0000-0000-0000-000000000001'::uuid, 'admin'),
  ('b0000007-0000-0000-0000-000000000001'::uuid, 'a0000007-0000-0000-0000-000000000002'::uuid, 'tester')
ON CONFLICT DO NOTHING;

INSERT INTO environments (id, project_id, name, os_name, browser_name, device_type, is_active)
VALUES ('c0000007-0000-0000-0000-000000000001'::uuid, 'b0000007-0000-0000-0000-000000000001'::uuid,
        'Chrome/macOS', 'macOS', 'Chrome', 'desktop', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Test 1: Admin 이 is_active=false 로 변경 성공 ─────────────
SET LOCAL request.jwt.claims = '{"sub":"a0000007-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$ UPDATE environments SET is_active = false
     WHERE id = 'c0000007-0000-0000-0000-000000000001'::uuid $$,
  'Admin can deactivate environment'
);

-- 원복 (다음 테스트 준비)
UPDATE environments SET is_active = true
  WHERE id = 'c0000007-0000-0000-0000-000000000001'::uuid;

-- ─── Test 2: Tester 가 일반 필드(name) 변경 성공 ─────────────
SET LOCAL request.jwt.claims = '{"sub":"a0000007-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT lives_ok(
  $$ UPDATE environments SET name = 'Chrome/macOS (renamed)'
     WHERE id = 'c0000007-0000-0000-0000-000000000001'::uuid $$,
  'Tester can update non-is_active fields'
);

-- ─── Test 3: Tester 가 is_active=false 로 변경 시도 → 거부 ────
SELECT throws_ok(
  $$ UPDATE environments SET is_active = false
     WHERE id = 'c0000007-0000-0000-0000-000000000001'::uuid $$,
  '42501',
  NULL,
  'Tester cannot deactivate environment (raises insufficient_privilege)'
);

-- ─── Test 4: Tester 가 is_active + name 동시 변경 시도 → 거부 ─
SELECT throws_ok(
  $$ UPDATE environments
       SET is_active = false, name = 'sneaky'
     WHERE id = 'c0000007-0000-0000-0000-000000000001'::uuid $$,
  '42501',
  NULL,
  'Tester cannot bundle is_active=false with other field changes'
);

SELECT * FROM finish();

ROLLBACK;
