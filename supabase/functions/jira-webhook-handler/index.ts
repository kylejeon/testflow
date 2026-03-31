import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Jira Webhook Handler (Inbound: Jira → Testably)
 *
 * Receives Jira issue status change webhooks and updates
 * the corresponding test case status in Testably.
 *
 * Phase 2 implementation — currently returns 200 OK with logging.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const webhookEvent = payload.webhookEvent;
    const issueKey = payload.issue?.key;
    const newStatus = payload.issue?.fields?.status?.name;

    console.log(`[jira-webhook] Event: ${webhookEvent}, Issue: ${issueKey}, Status: ${newStatus}`);

    // Phase 2: Validate webhook secret, look up linked TC, update status
    // 1. Verify webhook_secret from jira_settings
    // 2. Find test_results linked to this jira_issue_key
    // 3. Apply status_mappings to determine new Testably status
    // 4. Update test_results status
    // 5. Log to jira_sync_log

    return new Response(
      JSON.stringify({ received: true, event: webhookEvent, issue: issueKey }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[jira-webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
