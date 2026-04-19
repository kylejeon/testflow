import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * @deprecated Use `sync-jira-metadata` instead.
 *
 * This stub is kept for backwards compatibility. Once all callers migrate
 * (dev-spec §7), this directory can be removed.
 *
 * Sync Jira Status (Outbound: Testably → Jira) — legacy placeholder.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain, email, apiToken, issueKey, transitionId, projectId, runId, tcId } = await req.json();

    console.log(`[sync-jira-status] Issue: ${issueKey}, Transition: ${transitionId}`);

    // Phase 2: Execute Jira transition
    // 1. POST /rest/api/3/issue/{issueKey}/transitions with { transition: { id: transitionId } }
    // 2. Log result to jira_sync_log
    // 3. Handle conflict resolution (last-write-wins or configurable)

    return new Response(
      JSON.stringify({ success: true, message: 'Phase 2 — not yet implemented' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-jira-status] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
