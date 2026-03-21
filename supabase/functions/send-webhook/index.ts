import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface RequestBody {
  project_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
}

interface Integration {
  id: string;
  type: 'slack' | 'teams';
  webhook_url: string;
  channel_name: string | null;
  events: string[];
  is_active: boolean;
}

// ── Message formatters ────────────────────────────────────────────────────────

const APP_URL = Deno.env.get('APP_URL') ?? 'https://testably.io';

function eventMeta(eventType: string, data: Record<string, unknown>): { title: string; body: string; link: string } {
  const projectName = (data.project_name as string) ?? 'Project';
  const projectId   = (data.project_id   as string) ?? '';

  switch (eventType) {
    case 'invitation_received':
      return {
        title: 'You have been invited to a project',
        body:  `*${data.invited_by ?? 'Someone'}* invited you to *${projectName}* as ${data.role ?? 'member'}.`,
        link:  `${APP_URL}/projects/${projectId}`,
      };
    case 'member_joined':
      return {
        title: 'New member joined',
        body:  `*${data.member_name ?? data.member_email ?? 'Someone'}* joined *${projectName}* as ${data.role ?? 'member'}.`,
        link:  `${APP_URL}/projects/${projectId}`,
      };
    case 'run_created':
      return {
        title: 'New test run created',
        body:  `Run *${data.run_name ?? 'Unnamed'}* was created in *${projectName}*.`,
        link:  `${APP_URL}/projects/${projectId}/runs/${data.run_id ?? ''}`,
      };
    case 'run_completed': {
      const passed  = data.passed  as number ?? 0;
      const failed  = data.failed  as number ?? 0;
      const total   = data.total   as number ?? (passed + failed);
      return {
        title: 'Test run completed',
        body:  `Run *${data.run_name ?? 'Unnamed'}* finished in *${projectName}* — ✅ ${passed} passed, ❌ ${failed} failed (${total} total).`,
        link:  `${APP_URL}/projects/${projectId}/runs/${data.run_id ?? ''}`,
      };
    }
    case 'milestone_started':
      return {
        title: 'Milestone started',
        body:  `Milestone *${data.milestone_name ?? 'Unnamed'}* has started in *${projectName}*.`,
        link:  `${APP_URL}/projects/${projectId}/milestones/${data.milestone_id ?? ''}`,
      };
    case 'milestone_completed':
      return {
        title: 'Milestone completed',
        body:  `Milestone *${data.milestone_name ?? 'Unnamed'}* was completed in *${projectName}*.`,
        link:  `${APP_URL}/projects/${projectId}/milestones/${data.milestone_id ?? ''}`,
      };
    case 'milestone_past_due':
      return {
        title: 'Milestone past due',
        body:  `Milestone *${data.milestone_name ?? 'Unnamed'}* is past due in *${projectName}* (was due ${data.end_date ?? 'unknown'}).`,
        link:  `${APP_URL}/projects/${projectId}/milestones/${data.milestone_id ?? ''}`,
      };
    default:
      return {
        title: 'Testably notification',
        body:  `Event \`${eventType}\` occurred in *${projectName}*.`,
        link:  `${APP_URL}/projects/${projectId}`,
      };
  }
}

function buildSlackPayload(meta: ReturnType<typeof eventMeta>): unknown {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🧪 ${meta.title}`, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: meta.body },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Testably', emoji: true },
            url: meta.link,
            style: 'primary',
          },
        ],
      },
      { type: 'divider' },
    ],
  };
}

function buildTeamsPayload(meta: ReturnType<typeof eventMeta>): unknown {
  // Plain text body for Teams (strip Slack-style *bold*)
  const plainBody = meta.body.replace(/\*/g, '**');

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
            {
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: `🧪 ${meta.title}`,
            },
            {
              type: 'TextBlock',
              text: plainBody,
              wrap: true,
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View in Testably',
              url: meta.link,
            },
          ],
        },
      },
    ],
  };
}

// ── Delivery with retry ───────────────────────────────────────────────────────

async function sendWithRetry(
  webhookUrl: string,
  payload: unknown,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number; error?: string }> {
  let lastError = '';
  let lastStatus = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      lastStatus = res.status;

      if (res.ok) return { ok: true, status: res.status };

      const text = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}: ${text.substring(0, 200)}`;

      // Don't retry on 4xx client errors (bad URL, auth, etc.)
      if (res.status >= 400 && res.status < 500) break;
    } catch (err) {
      lastError = (err as Error).message ?? String(err);
    }

    // Exponential back-off: 1s, 2s, 4s …
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  return { ok: false, status: lastStatus, error: lastError };
}

// ── Edge function entry point ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is an authenticated Testably user
    const userToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: RequestBody = await req.json();
    const { project_id, event_type, event_data } = body;

    if (!project_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'project_id and event_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify caller is a project member
    const { data: memberCheck } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberCheck) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch active integrations subscribed to this event
    const { data: integrations, error: intErr } = await supabase
      .from('integrations')
      .select('id, type, webhook_url, channel_name, events, is_active')
      .eq('project_id', project_id)
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (intErr) throw intErr;
    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No matching integrations' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build event meta once
    const meta = eventMeta(event_type, event_data ?? {});
    const results: { id: string; ok: boolean }[] = [];

    // Send to each integration
    await Promise.all(
      (integrations as Integration[]).map(async (integration) => {
        const payload =
          integration.type === 'slack'
            ? buildSlackPayload(meta)
            : buildTeamsPayload(meta);

        const result = await sendWithRetry(integration.webhook_url, payload);
        results.push({ id: integration.id, ok: result.ok });

        // Log the delivery attempt
        await supabase.from('integration_logs').insert({
          integration_id: integration.id,
          event_type,
          payload: { event_data, message: meta },
          status: result.ok ? 'success' : 'failed',
          response_code: result.status || null,
          error_message: result.error ?? null,
        });
      }),
    );

    const successCount = results.filter(r => r.ok).length;

    return new Response(
      JSON.stringify({
        sent: successCount,
        total: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
