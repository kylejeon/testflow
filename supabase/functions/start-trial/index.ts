/**
 * start-trial Edge Function
 *
 * Authoritative trial-start endpoint. Runs server-side so it can:
 *   1. Check trial_history (service_role table) by email — blocks re-use
 *      after account deletion + re-signup with same email.
 *   2. Insert a row into trial_history.
 *   3. Update profiles (subscription_tier=3, is_trial=true, trial dates).
 *
 * All three steps are atomic in intent; if any write fails the error is
 * returned and the frontend shows a message without changing local state.
 *
 * POST /functions/v1/start-trial   (JWT required)
 * Body: {} — user identity comes from the JWT
 *
 * Response:
 *   200 { success: true, trial_ends_at: string }
 *   409 { error: 'already_used' }
 *   4xx/5xx { error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
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

  // Service-role client (admin + privileged tables)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ES256-safe caller identification (x-user-token > Authorization Bearer)
  const userTokenHeader = req.headers.get('x-user-token');
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = userTokenHeader
    || (authHeader.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/i, '') : '');
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  let userId: string;
  try {
    const [, payloadB64] = jwt.split('.');
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))),
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    userId = payload.sub;
    if (!userId) throw new Error('No sub');
  } catch {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { data: { user }, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  const email = user.email?.toLowerCase();
  if (!email) return json({ error: 'User has no email address' }, 400);

  // ── 1. Check trial_history by email ───────────────────────────────────────
  const { data: existing, error: histErr } = await admin
    .from('trial_history')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (histErr) {
    console.error('[start-trial] trial_history lookup error:', histErr);
    return json({ error: 'Internal error checking trial eligibility' }, 500);
  }

  if (existing) {
    return json({ error: 'already_used' }, 409);
  }

  // ── 2. Confirm profile is still on Free (prevent race condition) ───────────
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('subscription_tier, is_trial, trial_started_at')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) return json({ error: 'Profile not found' }, 404);
  if (profile.is_trial)          return json({ error: 'Trial already active' }, 409);
  if (profile.trial_started_at)  return json({ error: 'already_used' }, 409);

  // ── 3. Insert trial_history row ───────────────────────────────────────────
  const now       = new Date();
  const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { error: insertErr } = await admin.from('trial_history').insert({
    email,
    trial_started_at: now.toISOString(),
  });
  if (insertErr) {
    console.error('[start-trial] trial_history insert error:', insertErr);
    return json({ error: 'Failed to record trial — please try again' }, 500);
  }

  // ── 4. Update profiles ────────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from('profiles')
    .update({
      subscription_tier: 3,
      is_trial:          true,
      trial_started_at:  now.toISOString(),
      trial_ends_at:     trialEnds.toISOString(),
    })
    .eq('id', user.id);

  if (updateErr) {
    // Roll back trial_history insert on profile update failure
    await admin.from('trial_history').delete().eq('email', email).eq('trial_started_at', now.toISOString());
    console.error('[start-trial] profiles update error:', updateErr);
    return json({ error: 'Failed to activate trial — please try again' }, 500);
  }

  return json({
    success: true,
    trial_ends_at: trialEnds.toISOString(),
  });
});
