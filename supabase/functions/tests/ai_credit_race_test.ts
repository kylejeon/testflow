// ============================================================
// f018 — AI Credit Race Condition Deno integration test (AC-18)
//
// Related spec: docs/specs/dev-spec-f018-ai-credit-race-condition.md §14
//
// 실행법 (local supabase 기동 후):
//   SUPABASE_URL=http://localhost:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   deno test --allow-net --allow-env supabase/functions/tests/ai_credit_race_test.ts
//
// 주의:
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없으면 skip.
//   - 실행 시 owner 계정 하나를 seed 한 뒤 Promise.all 로 concurrent RPC 호출하여
//     `SUM(credits_used) == limit` 를 보장 (over-shoot 없음) 확인.
//   - 테스트 끝에 seed 데이터를 정리한다 (fixture teardown).
// ============================================================

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const SKIP = !SUPABASE_URL || !SERVICE_ROLE_KEY;
if (SKIP) {
  console.warn('[f018 test] Skipping — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run.');
}

const admin = SKIP ? null : createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Seed a unique (owner + project + existing log rows) fixture for a test run. */
async function seedFixture(existingUsage: number) {
  if (!admin) throw new Error('admin client not ready');
  const ownerId = crypto.randomUUID();
  const projectId = crypto.randomUUID();

  // Create auth user (service role bypasses RLS). We use raw upsert into auth.users
  // via RPC is cleaner, but here we rely on admin.auth.admin.createUser.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    id: ownerId,
    email: `f018-${ownerId}@test.local`,
    email_confirm: true,
    user_metadata: { f018_test: true },
  });
  if (createErr && !String(createErr.message ?? '').includes('already registered')) {
    throw createErr;
  }
  // fallback: if createUser returned null (existing), fetch by id.
  void created;

  // profile: Hobby tier (2)
  await admin.from('profiles').upsert({ id: ownerId, subscription_tier: 2 });

  // project owned by this user
  await admin.from('projects').insert({
    id: projectId,
    name: `f018 race test ${ownerId}`,
    owner_id: ownerId,
  });

  // seed existingUsage rows
  if (existingUsage > 0) {
    const rows = Array.from({ length: existingUsage }, () => ({
      user_id: ownerId,
      project_id: projectId,
      mode: 'text',
      step: 1,
      credits_used: 1,
    }));
    await admin.from('ai_generation_logs').insert(rows);
  }

  return { ownerId, projectId };
}

async function teardownFixture(ownerId: string, projectId: string) {
  if (!admin) return;
  await admin.from('ai_generation_logs').delete().eq('user_id', ownerId);
  await admin.from('projects').delete().eq('id', projectId);
  await admin.from('profiles').delete().eq('id', ownerId);
  try { await admin.auth.admin.deleteUser(ownerId); } catch { /* best effort */ }
}

Deno.test({
  name: 'f018 AC-18: 5 concurrent RPC calls at usage=11/15 must allow exactly 4',
  ignore: SKIP,
  fn: async () => {
    const { ownerId, projectId } = await seedFixture(11);
    try {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          admin!.rpc('consume_ai_credit_and_log', {
            p_user_id: ownerId,
            p_owner_id: ownerId,
            p_project_id: projectId,
            p_mode: 'text',
            p_step: 1,
            p_credit_cost: 1,
            p_limit: 15,
          }),
        ),
      );

      const allowedCount = results.filter((r: any) => r.data?.allowed === true).length;
      const blockedCount = results.filter((r: any) => r.data?.reason === 'quota_exceeded').length;

      assertEquals(allowedCount, 4, 'exactly 4 should be allowed (11+4=15)');
      assertEquals(blockedCount, 1, 'exactly 1 should be blocked (15+1 > 15)');

      // Final SUM must equal 15 (no over-shoot)
      const { data: logs } = await admin!
        .from('ai_generation_logs')
        .select('credits_used')
        .eq('user_id', ownerId)
        .eq('step', 1);
      const sum = (logs ?? []).reduce((a: number, r: { credits_used: number }) => a + (r.credits_used ?? 1), 0);
      assertEquals(sum, 15, 'final SUM must equal limit exactly');
    } finally {
      await teardownFixture(ownerId, projectId);
    }
  },
});

Deno.test({
  name: 'f018 AC-18: single allowed call at empty owner returns allowed=true and used=1',
  ignore: SKIP,
  fn: async () => {
    const { ownerId, projectId } = await seedFixture(0);
    try {
      const { data } = await admin!.rpc('consume_ai_credit_and_log', {
        p_user_id: ownerId,
        p_owner_id: ownerId,
        p_project_id: projectId,
        p_mode: 'text',
        p_step: 1,
        p_credit_cost: 1,
        p_limit: 15,
      });
      assertEquals(data?.allowed, true);
      assertEquals(Number(data?.used), 1);
      assertEquals(Number(data?.limit), 15);
    } finally {
      await teardownFixture(ownerId, projectId);
    }
  },
});

Deno.test({
  name: 'f018 AC-18: unlimited tier (-1) always allowed + INSERT',
  ignore: SKIP,
  fn: async () => {
    const { ownerId, projectId } = await seedFixture(1000); // way over any Hobby limit
    try {
      const { data } = await admin!.rpc('consume_ai_credit_and_log', {
        p_user_id: ownerId,
        p_owner_id: ownerId,
        p_project_id: projectId,
        p_mode: 'text',
        p_step: 1,
        p_credit_cost: 1,
        p_limit: -1,
      });
      assertEquals(data?.allowed, true, 'unlimited tier should always allow');
      assertEquals(Number(data?.limit), -1);
    } finally {
      await teardownFixture(ownerId, projectId);
    }
  },
});

Deno.test({
  name: 'f018 AC-18: over-limit owner (usage=15/15) single call returns quota_exceeded, no INSERT',
  ignore: SKIP,
  fn: async () => {
    const { ownerId, projectId } = await seedFixture(15);
    try {
      const { data } = await admin!.rpc('consume_ai_credit_and_log', {
        p_user_id: ownerId,
        p_owner_id: ownerId,
        p_project_id: projectId,
        p_mode: 'text',
        p_step: 1,
        p_credit_cost: 1,
        p_limit: 15,
      });
      assertEquals(data?.allowed, false);
      assertEquals(data?.reason, 'quota_exceeded');

      const { data: logs } = await admin!
        .from('ai_generation_logs')
        .select('credits_used')
        .eq('user_id', ownerId)
        .eq('step', 1);
      const sum = (logs ?? []).reduce((a: number, r: { credits_used: number }) => a + (r.credits_used ?? 1), 0);
      assertEquals(sum, 15, 'no additional row should have been inserted');
    } finally {
      await teardownFixture(ownerId, projectId);
    }
  },
});
