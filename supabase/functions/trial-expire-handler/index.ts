/**
 * trial-expire-handler Edge Function
 *
 * Runs daily via pg_cron (00:00 UTC).
 * Finds users whose trial has expired and:
 *   1. Downgrades subscription_tier → 1 (Free) + clears is_trial flag
 *   2. Sends `trial_expired` event to Loops (once per user, idempotent)
 *
 * Profiles schema used: id, email, full_name, is_trial, trial_ends_at,
 *                        trial_expired_sent, subscription_tier
 * Related tables: projects (owner_id), test_cases (project_id),
 *                 test_runs (project_id), project_members (project_id, user_id)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getUserStats(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ testCaseCount: number; testRunCount: number; teamMemberCount: number }> {
  const { data: projects } = await adminClient
    .from('projects')
    .select('id')
    .eq('owner_id', userId);

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) {
    return { testCaseCount: 0, testRunCount: 0, teamMemberCount: 1 };
  }

  const [tcResult, trResult, pmResult] = await Promise.all([
    adminClient
      .from('test_cases')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds),
    adminClient
      .from('test_runs')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds),
    adminClient
      .from('project_members')
      .select('user_id', { count: 'exact', head: true })
      .in('project_id', projectIds),
  ]);

  return {
    testCaseCount: tcResult.count ?? 0,
    testRunCount: trResult.count ?? 0,
    teamMemberCount: Math.max(pmResult.count ?? 1, 1),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const loopsApiKey = Deno.env.get('LOOPS_API_KEY');

  if (!loopsApiKey) {
    console.error('[trial-expire-handler] LOOPS_API_KEY not set');
    return jsonResponse({ error: 'LOOPS_API_KEY not configured' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date().toISOString();

  // Find trials that have expired but haven't been processed yet
  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, trial_ends_at')
    .eq('is_trial', true)
    .eq('trial_expired_sent', false)
    .lt('trial_ends_at', now);

  if (error) {
    console.error('[trial-expire-handler] Query error:', error);
    return jsonResponse({ error: error.message }, 500);
  }

  const candidates = users ?? [];
  let expired = 0;

  for (const user of candidates) {
    try {
      const stats = await getUserStats(adminClient, user.id);
      const firstName = (user.full_name as string | null)?.split(' ')[0] ?? '';

      // 1. Downgrade to Free + mark as processed
      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({
          subscription_tier: 1,
          is_trial: false,
          trial_expired_sent: true,
        })
        .eq('id', user.id);

      if (updateErr) {
        console.error('[trial-expire-handler] Update error for', user.id, updateErr);
        continue;
      }

      // 2. Send trial_expired event to Loops
      const loopsRes = await fetch('https://app.loops.so/api/v1/events/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loopsApiKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          eventName: 'trial_expired',
          contactProperties: {
            firstName,
            testCaseCount: String(stats.testCaseCount),
            testRunCount: String(stats.testRunCount),
            teamMemberCount: String(stats.teamMemberCount),
            upgradeUrl: 'https://testably.app/settings?tab=billing',
          },
        }),
      });

      if (!loopsRes.ok) {
        console.warn('[trial-expire-handler] Loops error for', user.id, loopsRes.status);
        // Don't re-process — profile is already downgraded. Loops event is best-effort.
      }

      expired++;
    } catch (err) {
      console.error('[trial-expire-handler] Error processing user', user.id, err);
    }
  }

  const result = { processed: candidates.length, expired };
  console.log('[trial-expire-handler]', JSON.stringify(result));
  return jsonResponse(result);
});
