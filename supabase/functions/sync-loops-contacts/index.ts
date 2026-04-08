/**
 * sync-loops-contacts Edge Function
 *
 * Runs daily via pg_cron (01:00 UTC — after trial-ending-reminder and trial-expire-handler).
 * For every active trial user, fetches live counts from the DB and PUTs them
 * to the Loops contacts API so merge tags are always fresh.
 *
 * Updated contact properties per user:
 *   - testCaseCount    (total TCs across all user-owned projects)
 *   - testRunCount     (total runs across all user-owned projects)
 *   - teamMemberCount  (total project members across all user-owned projects)
 *   - trialDaysLeft    (days remaining in the trial, floored at 0)
 *   - planType         ("trial" while is_trial=true)
 *
 * This keeps {{testCaseCount}} etc. accurate in Loops email templates that
 * fire mid-trial (e.g. trial_day_7 sent via Loops delay from trial_started).
 *
 * Profiles schema used: id, email, is_trial, trial_ends_at
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const loopsApiKey = Deno.env.get('LOOPS_API_KEY');

  if (!loopsApiKey) {
    console.error('[sync-loops-contacts] LOOPS_API_KEY not set');
    return jsonResponse({ error: 'LOOPS_API_KEY not configured' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch all active trial users
  const { data: users, error } = await adminClient
    .from('profiles')
    .select('id, email, trial_ends_at')
    .eq('is_trial', true);

  if (error) {
    console.error('[sync-loops-contacts] Query error:', error);
    return jsonResponse({ error: error.message }, 500);
  }

  const candidates = users ?? [];
  const now = new Date();
  let synced = 0;
  let failed = 0;

  for (const user of candidates) {
    try {
      const stats = await getUserStats(adminClient, user.id);

      const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
      const trialDaysLeft = trialEnd
        ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      const res = await fetch('https://app.loops.so/api/v1/contacts/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loopsApiKey}`,
        },
        body: JSON.stringify({
          email: user.email,
          planType: 'trial',
          trialEndsAt: user.trial_ends_at ?? '',
          trialDaysLeft: String(trialDaysLeft),
          testCaseCount: String(stats.testCaseCount),
          testRunCount: String(stats.testRunCount),
          teamMemberCount: String(stats.teamMemberCount),
        }),
      });

      if (!res.ok) {
        console.error('[sync-loops-contacts] Loops error for', user.id, res.status);
        failed++;
      } else {
        synced++;
      }
    } catch (err) {
      console.error('[sync-loops-contacts] Error processing user', user.id, err);
      failed++;
    }
  }

  const result = { processed: candidates.length, synced, failed };
  console.log('[sync-loops-contacts]', JSON.stringify(result));
  return jsonResponse(result);
});
