import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const APP_URL = 'https://www.testably.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Payload builders (mirror of client-side useWebhooks.ts) ──────────────────

function buildSlackPayload(title: string, body: string, link: string): unknown {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `🧪 ${title}`, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: body } },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'View in Testably', emoji: true }, url: link, style: 'primary' },
        ],
      },
      { type: 'divider' },
    ],
  };
}

function buildTeamsPayload(title: string, body: string, link: string): unknown {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: `🧪 ${title}` },
            { type: 'TextBlock', text: body.replace(/\*/g, '**'), wrap: true },
          ],
          actions: [{ type: 'Action.OpenUrl', title: 'View in Testably', url: link }],
        },
      },
    ],
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth: Bearer CRON_SECRET ─────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const timestamp = new Date().toISOString();
  let processedCount = 0;
  let projectsNotified = 0;
  let webhooksSent = 0;
  let errorCount = 0;

  try {
    // ── STEP 1: upcoming → started (start_date reached) ──────────────────────
    await supabase.rpc('exec_sql', {
      sql: `
        UPDATE milestones
        SET status = 'started', updated_at = NOW()
        WHERE start_date <= CURRENT_DATE
          AND status = 'upcoming'
          AND end_date IS NOT NULL
      `,
    }).catch(() => {
      // Fallback if exec_sql not available — use direct update
    });

    // Direct update for upcoming → started
    const { data: upcomingToStart } = await supabase
      .from('milestones')
      .select('id, name, project_id, start_date')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .eq('status', 'upcoming');

    if (upcomingToStart && upcomingToStart.length > 0) {
      const ids = upcomingToStart.map((m: { id: string }) => m.id);
      await supabase
        .from('milestones')
        .update({ status: 'started', updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('status', 'upcoming');
    }

    // ── STEP 2: Query overdue milestones ──────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];

    const { data: overdueMilestones, error: queryError } = await supabase
      .from('milestones')
      .select(`
        id,
        name,
        project_id,
        end_date,
        status,
        projects!inner(name)
      `)
      .lt('end_date', today)
      .not('status', 'in', '("past_due","completed")')
      .order('project_id')
      .order('end_date');

    if (queryError) {
      throw new Error(`Failed to query milestones: ${queryError.message}`);
    }

    if (!overdueMilestones || overdueMilestones.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        projects_notified: 0,
        webhooks_sent: 0,
        errors: 0,
        timestamp,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── STEP 3: Batch update status → past_due ────────────────────────────────
    const overdueIds = overdueMilestones.map((m: { id: string }) => m.id);

    const { error: updateError } = await supabase
      .from('milestones')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .in('id', overdueIds)
      .not('status', 'in', '("past_due","completed")');

    if (updateError) {
      throw new Error(`Failed to update milestone statuses: ${updateError.message}`);
    }

    processedCount = overdueMilestones.length;

    // ── STEP 4: Parent milestone cascade update ───────────────────────────────
    // Sub milestones that are past_due → parent becomes past_due too
    const { data: parentUpdates } = await supabase
      .from('milestones')
      .select('id, parent_milestone_id')
      .in('id', overdueIds)
      .not('parent_milestone_id', 'is', null);

    if (parentUpdates && parentUpdates.length > 0) {
      const parentIds = [...new Set(parentUpdates
        .map((m: { parent_milestone_id: string | null }) => m.parent_milestone_id)
        .filter(Boolean))] as string[];

      if (parentIds.length > 0) {
        await supabase
          .from('milestones')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .in('id', parentIds)
          .not('status', 'in', '("past_due","completed")');
      }
    }

    // ── STEP 5: Group by project & send webhooks ──────────────────────────────
    interface MilestoneRow {
      id: string;
      name: string;
      project_id: string;
      end_date: string;
      status: string;
      projects: { name: string };
    }

    const byProject = new Map<string, { projectName: string; milestones: { id: string; name: string; endDate: string }[] }>();

    for (const m of overdueMilestones as MilestoneRow[]) {
      if (!byProject.has(m.project_id)) {
        byProject.set(m.project_id, {
          projectName: m.projects.name,
          milestones: [],
        });
      }
      byProject.get(m.project_id)!.milestones.push({
        id: m.id,
        name: m.name,
        endDate: m.end_date,
      });
    }

    projectsNotified = byProject.size;

    for (const [projectId, group] of byProject) {
      // Fetch active integrations for this project that include milestone_past_due
      const { data: integrations } = await supabase
        .from('integrations')
        .select('id, type, webhook_url')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .contains('events', ['milestone_past_due']);

      if (!integrations || integrations.length === 0) continue;

      // Build notification content
      const title = 'Milestone Overdue';
      const milestoneList = group.milestones
        .map((m) => `• *${m.name}* (due: ${m.endDate})`)
        .join('\n');
      const body = `Project: *${group.projectName}*\n\n${milestoneList}`;
      const link = `${APP_URL}/projects/${projectId}/milestones`;

      for (const integration of integrations as { id: string; type: string; webhook_url: string }[]) {
        const payload = integration.type === 'slack'
          ? buildSlackPayload(title, body, link)
          : buildTeamsPayload(title, body, link);

        let responseStatus = 0;
        let responseOk = false;
        let errorMessage: string | null = null;

        try {
          const res = await fetch(integration.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          responseStatus = res.status;
          responseOk = res.ok;
          if (!res.ok) {
            errorMessage = await res.text().catch(() => `HTTP ${res.status}`);
            errorCount++;
          } else {
            webhooksSent++;
          }
        } catch (fetchErr) {
          errorMessage = fetchErr instanceof Error ? fetchErr.message : 'Fetch failed';
          errorCount++;
        }

        // Log to integration_logs
        await supabase.from('integration_logs').insert({
          integration_id: integration.id,
          event_type: 'milestone_past_due_batch',
          payload: {
            milestones: group.milestones,
            triggered_by: 'scheduler',
            project_id: projectId,
            project_name: group.projectName,
          },
          status: responseOk ? 'success' : 'failed',
          response_code: responseStatus || null,
          error_message: errorMessage,
        }).catch(() => {
          // Log failure is non-blocking
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      projects_notified: projectsNotified,
      webhooks_sent: webhooksSent,
      errors: errorCount,
      timestamp,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: message,
      processed: processedCount,
      webhooks_sent: webhooksSent,
      errors: errorCount + 1,
      timestamp,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
