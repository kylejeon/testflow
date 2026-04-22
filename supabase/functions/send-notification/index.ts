import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

// Maps event_type → notification_preferences column
const PREF_COLUMN: Record<string, string> = {
  run_created:     'email_run_created',
  run_completed:   'email_run_completed',
  test_failed:     'email_test_failed',
  project_invited: 'email_project_invited',
  tc_assigned:     'email_tc_assigned',
};

// Maps event_type → Loops transactional template ID env var
const TEMPLATE_ENV: Record<string, string> = {
  run_created:     'LOOPS_TEMPLATE_RUN_CREATED',
  run_completed:   'LOOPS_TEMPLATE_RUN_COMPLETED',
  test_failed:     'LOOPS_TEMPLATE_TEST_FAILED',
  project_invited: 'LOOPS_TEMPLATE_PROJECT_INVITED',
  tc_assigned:     'LOOPS_TEMPLATE_TC_ASSIGNED',
};

interface Recipient {
  user_id: string | null;
  email: string;
}

interface NotificationPayload {
  project_name?: string;
  run_name?: string;
  pass_rate?: number;
  failed_count?: number;
  test_case_name?: string;
  cta_url?: string;
  user_name?: string;
  [key: string]: unknown;
}

// Retry a Loops API call up to 3 times with exponential backoff
async function withRetry(
  fn: () => Promise<Response>,
  attempts = 3,
): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fn();
      if (res.ok) return res;
      // 4xx → no retry
      if (res.status >= 400 && res.status < 500) return res;
    } catch (_err) {
      if (i === attempts - 1) throw _err;
    }
    await new Promise((r) => setTimeout(r, 300 * Math.pow(2, i)));
  }
  throw new Error('Loops API: max retries exceeded');
}

// Send one transactional email via Loops
async function sendLoopsTransactional(
  apiKey: string,
  email: string,
  transactionalId: string,
  dataVariables: Record<string, unknown>,
): Promise<void> {
  await withRetry(() =>
    fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ transactionalId, email, dataVariables }),
    })
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const loopsApiKey = Deno.env.get('LOOPS_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!loopsApiKey) {
      console.warn('LOOPS_API_KEY not set – skipping email delivery');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'LOOPS_API_KEY not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { event_type, payload, recipients } = await req.json() as {
      event_type: string;
      payload: NotificationPayload;
      recipients: Recipient[];
    };

    if (!event_type || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'event_type and recipients[] are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const templateId = Deno.env.get(TEMPLATE_ENV[event_type] ?? '');
    if (!templateId) {
      console.warn(`Template ID not configured for event_type="${event_type}" – skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: `No template for ${event_type}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const prefColumn = PREF_COLUMN[event_type];
    if (!prefColumn) {
      return new Response(
        JSON.stringify({ error: `Unknown event_type: ${event_type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch preferences for all known-user recipients in one query
    const knownUserIds = recipients
      .map((r) => r.user_id)
      .filter((id): id is string => !!id);

    const prefsMap = new Map<string, { frequency: string; enabled: boolean }>();

    if (knownUserIds.length > 0) {
      const { data: prefsRows } = await supabase
        .from('notification_preferences')
        .select(`user_id, frequency, ${prefColumn}`)
        .in('user_id', knownUserIds);

      for (const row of prefsRows ?? []) {
        prefsMap.set(row.user_id as string, {
          frequency: (row.frequency as string) ?? 'instant',
          enabled: (row[prefColumn] as boolean) !== false,
        });
      }
    }

    // ── Dedup: skip if same user+event sent in last 5 min ──────
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentRows } = await supabase
      .from('notification_queue')
      .select('user_id')
      .eq('event_type', event_type)
      .gte('created_at', fiveMinAgo);

    const recentlySent = new Set((recentRows ?? []).map((r: any) => r.user_id as string));

    // ── Process in batches of 10 ───────────────────────────────
    const BATCH = 10;
    const results = { sent: 0, queued: 0, skipped: 0 };

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);

      await Promise.allSettled(
        batch.map(async (recipient) => {
          const { user_id, email } = recipient;

          if (!email) { results.skipped++; return; }

          // Dedup check
          if (user_id && recentlySent.has(user_id)) {
            results.skipped++;
            return;
          }

          // Preference check (unknown users default to instant + enabled)
          const pref = user_id ? prefsMap.get(user_id) : undefined;
          const enabled = pref ? pref.enabled : true;
          const frequency = pref ? pref.frequency : 'instant';

          if (!enabled || frequency === 'off') {
            results.skipped++;
            return;
          }

          const dataVariables: Record<string, unknown> = {
            ...(payload as Record<string, unknown>),
            unsubscribeUrl: `${Deno.env.get('SITE_URL') ?? 'https://testably.app'}/settings?tab=notifications`,
          };

          if (frequency === 'instant') {
            // Log to queue as sent=true for dedup tracking
            await supabase.from('notification_queue').insert({
              user_id: user_id ?? null,
              event_type,
              payload: { email, ...dataVariables },
              sent: true,
            });

            await sendLoopsTransactional(loopsApiKey, email, templateId, dataVariables);
            results.sent++;
          } else {
            // daily / weekly → queue for later
            await supabase.from('notification_queue').insert({
              user_id: user_id ?? null,
              event_type,
              payload: { email, ...dataVariables },
              sent: false,
            });
            results.queued++;
          }
        }),
      );
    }

    return new Response(
      JSON.stringify({ ok: true, ...results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-notification error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
