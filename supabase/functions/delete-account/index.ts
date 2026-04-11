/**
 * delete-account Edge Function
 *
 * Permanently deletes the authenticated user's account:
 *   1. Hard-deletes auth.users row (cascades to profiles, project_members,
 *      ai_generation_logs, onboarding_progress, jira_settings, etc. via
 *      ON DELETE CASCADE foreign keys).
 *   2. trial_history rows are intentionally NOT deleted — they are keyed
 *      by email and must survive account deletion to prevent trial re-use.
 *
 * POST /functions/v1/delete-account   (JWT required)
 * Body: {} — caller identity comes from the JWT
 *
 * Response:
 *   200 { success: true }
 *   401 { error: 'Unauthorized' }
 *   5xx { error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Identify caller via JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Update trial_history.trial_ended_at if an active trial exists
  const { data: profile } = await admin
    .from('profiles')
    .select('is_trial, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_trial && user.email) {
    await admin
      .from('trial_history')
      .update({ trial_ended_at: new Date().toISOString() })
      .eq('email', user.email.toLowerCase())
      .is('trial_ended_at', null);
  }

  // Hard-delete the user — cascades all related rows except trial_history
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error('[delete-account] deleteUser error:', deleteErr);
    return json({ error: 'Failed to delete account. Please try again.' }, 500);
  }

  return json({ success: true });
});
