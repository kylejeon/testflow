/**
 * trial-ending-reminder Edge Function
 *
 * Runs daily via pg_cron (00:00 UTC).
 * Finds users whose trial ends in exactly 3 days and sends a
 * `trial_ending_soon` event to Loops — once per user (idempotent flag).
 *
 * Profiles schema used: id, email, full_name, is_trial, trial_ends_at,
 *                        trial_ending_soon_sent
 * Related tables: projects (created_by), test_cases (project_id),
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
  // Get project IDs owned by this user
  const { data: projects } = await adminClient
    .from('projects')
    .select('id')
    .eq('created_by', userId);

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

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
  const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const loopsApiKey     = Deno.env.get('LOOPS_API_KEY');

  if (!loopsApiKey) {
    console.error('[trial-ending-reminder] LOOPS_API_KEY not set');
    return jsonResponse({ error: 'LOOPS_API_KEY not configured' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Window: trial_ends_at ∈ [now+3d, now+4d)
  // This gives a 24-hour window so the daily cron never misses a user.
  const now           = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fourDaysLater  = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, trial_ends_at')
    .eq('is_trial', true)
    .eq('trial_ending_soon_sent', false)
    .gte('trial_ends_at', threeDaysLater.toISOString())
    .lt('trial_ends_at', fourDaysLater.toISOString());

  if (error) {
    console.error('[trial-ending-reminder] Query error:', error);
    return jsonResponse({ error: error.message }, 500);
  }

  const candidates = users ?? [];
  let sent = 0;

  for (const user of candidates) {
    try {
      const stats = await getUserStats(adminClient, user.id);
      const firstName = (user.full_name as string | null)?.split(' ')[0] ?? '';

      const loopsRes = await fetch('https://app.loops.so/api/v1/events/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loopsApiKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          eventName: 'trial_ending_soon',
          contactProperties: {
            firstName,
            trialEndsAt: user.trial_ends_at,
            daysRemaining: '3',
            testCaseCount: String(stats.testCaseCount),
            testRunCount: String(stats.testRunCount),
            teamMemberCount: String(stats.teamMemberCount),
            upgradeUrl: 'https://testably.app/settings?tab=billing',
          },
        }),
      });

      if (!loopsRes.ok) {
        console.error('[trial-ending-reminder] Loops error for', user.id, loopsRes.status);
        continue;
      }

      // Mark as sent so we never re-send
      await adminClient
        .from('profiles')
        .update({ trial_ending_soon_sent: true })
        .eq('id', user.id);

      sent++;
    } catch (err) {
      console.error('[trial-ending-reminder] Error processing user', user.id, err);
    }
  }

  const result = { processed: candidates.length, sent };
  console.log('[trial-ending-reminder]', JSON.stringify(result));
  return jsonResponse(result);
});
