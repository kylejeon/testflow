/**
 * delete-account Edge Function
 *
 * Permanently deletes the authenticated user's account.
 * Manually nullifies/removes all NO ACTION and RESTRICT FK references
 * before calling auth.admin.deleteUser to avoid constraint violations.
 *
 * POST /functions/v1/delete-account   (JWT required, --no-verify-jwt for CORS)
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Identify caller via JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  try {
    const uid = user.id;

    // ── 1. Record trial end if on active trial ───────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('is_trial, trial_ends_at')
      .eq('id', uid)
      .maybeSingle();

    if (profile?.is_trial && user.email) {
      await admin
        .from('trial_history')
        .update({ trial_ended_at: new Date().toISOString() })
        .eq('email', user.email.toLowerCase())
        .is('trial_ended_at', null);
    }

    // ── 2. Nullify NO ACTION FKs (audit / reference columns) ─────────
    // These columns allow NULL — just clear the reference
    await Promise.all([
      admin.from('activity_logs').update({ actor_id: null }).eq('actor_id', uid),
      admin.from('ci_upload_logs').update({ user_id: null }).eq('user_id', uid),
      admin.from('jira_created_issues').update({ created_by: null }).eq('created_by', uid),
      admin.from('project_members').update({ invited_by: null }).eq('invited_by', uid),
      admin.from('requirement_history').update({ user_id: null }).eq('user_id', uid),
      admin.from('requirement_tc_links').update({ linked_by: null }).eq('linked_by', uid),
      admin.from('requirements').update({ created_by: null }).eq('created_by', uid),
      admin.from('shared_step_usage').update({ linked_by: null }).eq('linked_by', uid),
      admin.from('shared_step_versions').update({ changed_by: null }).eq('changed_by', uid),
      admin.from('shared_steps').update({ updated_by: null }).eq('updated_by', uid),
      admin.from('shared_steps').update({ created_by: null }).eq('created_by', uid),
    ]);

    // ── 3. Handle projects where user is owner ───────────────────────
    // Reassign to another member, or delete if user is sole member
    const { data: ownedProjects } = await admin
      .from('projects')
      .select('id')
      .eq('owner_id', uid);

    for (const project of ownedProjects ?? []) {
      const { data: otherMembers } = await admin
        .from('project_members')
        .select('user_id')
        .eq('project_id', project.id)
        .neq('user_id', uid)
        .limit(1);

      if (otherMembers && otherMembers.length > 0) {
        // Transfer ownership to first other member
        await admin
          .from('projects')
          .update({ owner_id: otherMembers[0].user_id })
          .eq('id', project.id);
      } else {
        // No other members — orphan the project (set owner to null not possible if NOT NULL)
        // Instead, set owner_id to null if allowed, otherwise just leave for cascade cleanup
        await admin.from('projects').update({ owner_id: null }).eq('id', project.id);
      }
    }

    // ── 4. Handle organizations where user is owner (RESTRICT) ───────
    const { data: ownedOrgs } = await admin
      .from('organizations')
      .select('id')
      .eq('owner_id', uid);

    for (const org of ownedOrgs ?? []) {
      const { data: otherOwners } = await admin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('role', 'owner')
        .neq('user_id', uid)
        .limit(1);

      if (otherOwners && otherOwners.length > 0) {
        // Transfer org ownership to another owner
        await admin
          .from('organizations')
          .update({ owner_id: otherOwners[0].user_id })
          .eq('id', org.id);
      } else {
        // No other owners — delete the organization entirely
        await admin.from('organizations').delete().eq('id', org.id);
      }
    }

    // ── 5. Delete profile (NO ACTION → must delete before auth.users) ─
    await admin.from('profiles').delete().eq('id', uid);

    // ── 6. Hard-delete the auth user ─────────────────────────────────
    const { error: deleteErr } = await admin.auth.admin.deleteUser(uid);
    if (deleteErr) {
      console.error('[delete-account] deleteUser error:', deleteErr);
      return json({ error: 'Failed to delete account. Please try again.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error('[delete-account] unexpected error:', err);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
