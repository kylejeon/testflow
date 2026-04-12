/**
 * send-digest Edge Function
 *
 * Processes notification_queue and sends digest emails via Loops transactional API.
 * Called daily at UTC 00:00 (KST 09:00) by pg_cron.
 *
 * Behavior:
 *   frequency = 'daily'  → sends every invocation
 *   frequency = 'weekly' → sends only when today is Monday (UTC)
 *   frequency = 'instant' | 'off' → skipped (handled by send-notification)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueRow {
  id: number;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface UserDigest {
  userId: string;
  email: string;
  userName: string;
  frequency: 'daily' | 'weekly';
  rows: QueueRow[];
}

// Retry Loops API call up to 3 times with exponential backoff
async function withRetry(fn: () => Promise<Response>, attempts = 3): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fn();
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500) return res; // 4xx → no retry
    } catch (err) {
      if (i === attempts - 1) throw err;
    }
    await new Promise((r) => setTimeout(r, 300 * Math.pow(2, i)));
  }
  throw new Error('send-digest: Loops API max retries exceeded');
}

// Friendly label for event types used in digest summary lines
function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    run_created:     'New test run created',
    run_completed:   'Test run completed',
    test_failed:     'Test case failed',
    project_invited: 'Invited to a project',
    tc_assigned:     'Test case assigned to you',
  };
  return labels[eventType] ?? eventType;
}

// Build a one-line summary for a queued notification
function buildSummary(row: QueueRow): string {
  const p = row.payload;
  const label = eventLabel(row.event_type);
  if (row.event_type === 'run_completed' && p.run_name) {
    return `${label}: "${p.run_name}" — pass rate ${p.pass_rate ?? '?'}%, ${p.failed_count ?? 0} failed`;
  }
  if (row.event_type === 'test_failed' && p.test_case_name) {
    return `${label}: "${p.test_case_name}" in "${p.run_name ?? ''}"`;
  }
  if (row.event_type === 'run_created' && p.run_name) {
    return `${label}: "${p.run_name}" (${p.tc_count ?? '?'} test cases)`;
  }
  if (row.event_type === 'tc_assigned' && p.test_case_name) {
    return `${label}: "${p.test_case_name}"`;
  }
  if (p.project_name) return `${label} — ${p.project_name}`;
  return label;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();

  try {
    const supabaseUrl     = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const loopsApiKey     = Deno.env.get('LOOPS_API_KEY');
    const siteUrl         = Deno.env.get('SITE_URL') ?? 'https://testably.app';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!loopsApiKey) {
      console.warn('send-digest: LOOPS_API_KEY not set – skipping');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'LOOPS_API_KEY not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse optional body (pg_cron sends triggered_by)
    let triggeredBy = 'unknown';
    try {
      const body = await req.json();
      triggeredBy = body?.triggered_by ?? 'manual';
    } catch (_) { triggeredBy = 'manual'; }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Is today Monday? (UTC, 0 = Sunday, 1 = Monday) ────────
    const todayUTC = new Date();
    const isMonday = todayUTC.getUTCDay() === 1;

    // ── 1. Fetch all unsent queue rows ─────────────────────────
    const { data: queueRows, error: qErr } = await supabase
      .from('notification_queue')
      .select('id, user_id, event_type, payload, created_at')
      .eq('sent', false)
      .order('created_at', { ascending: true });

    if (qErr) throw qErr;
    if (!queueRows || queueRows.length === 0) {
      console.log('send-digest: queue is empty — nothing to send');
      return new Response(
        JSON.stringify({ ok: true, sent: 0, skipped: 0, reason: 'queue empty', triggered_by: triggeredBy }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 2. Group rows by user_id ───────────────────────────────
    const byUser = new Map<string, QueueRow[]>();
    for (const row of queueRows as QueueRow[]) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row);
      byUser.set(row.user_id, list);
    }

    const userIds = Array.from(byUser.keys());

    // ── 3. Fetch preferences + profiles for all users ──────────
    const [prefsRes, profilesRes] = await Promise.all([
      supabase
        .from('notification_preferences')
        .select('user_id, frequency')
        .in('user_id', userIds),
      supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds),
    ]);

    const prefsMap = new Map<string, string>();
    for (const p of prefsRes.data ?? []) {
      prefsMap.set(p.user_id as string, (p.frequency as string) ?? 'instant');
    }

    const profileMap = new Map<string, { email: string; full_name: string | null }>();
    for (const p of profilesRes.data ?? []) {
      profileMap.set(p.id as string, { email: p.email as string, full_name: p.full_name as string | null });
    }

    // ── 4. Build list of digests to send ───────────────────────
    const digests: UserDigest[] = [];
    for (const [userId, rows] of byUser) {
      const freq = prefsMap.get(userId) ?? 'instant';
      if (freq !== 'daily' && freq !== 'weekly') continue; // instant/off handled elsewhere
      if (freq === 'weekly' && !isMonday) continue;        // weekly only on Mondays

      const profile = profileMap.get(userId);
      if (!profile?.email) continue; // no email on record

      digests.push({
        userId,
        email: profile.email,
        userName: profile.full_name || profile.email.split('@')[0],
        frequency: freq as 'daily' | 'weekly',
        rows,
      });
    }

    if (digests.length === 0) {
      console.log(`send-digest: no eligible users (isMonday=${isMonday})`);
      return new Response(
        JSON.stringify({ ok: true, sent: 0, skipped: userIds.length, triggered_by: triggeredBy }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 5. Send digests in batches of 10 ──────────────────────
    const BATCH = 10;
    const results = { sent: 0, failed: 0 };
    const sentRowIds: number[] = [];

    for (let i = 0; i < digests.length; i += BATCH) {
      const batch = digests.slice(i, i + BATCH);

      await Promise.allSettled(
        batch.map(async (digest) => {
          const templateEnvKey = digest.frequency === 'weekly'
            ? 'LOOPS_TEMPLATE_WEEKLY_DIGEST'
            : 'LOOPS_TEMPLATE_DAILY_DIGEST';
          const templateId = Deno.env.get(templateEnvKey);

          if (!templateId) {
            console.warn(`send-digest: ${templateEnvKey} not set — skipping ${digest.email}`);
            results.failed++;
            return;
          }

          const notifications = digest.rows.map((row) => ({
            event_type: row.event_type,
            summary:    buildSummary(row),
            cta_url:    (row.payload.cta_url as string) ?? siteUrl,
            timestamp:  row.created_at,
          }));

          const dataVariables = {
            userName:          digest.userName,
            notificationCount: digest.rows.length,
            notifications:     JSON.stringify(notifications), // Loops supports string vars
            unsubscribeUrl:    `${siteUrl}/settings?tab=notifications`,
          };

          try {
            await withRetry(() =>
              fetch('https://app.loops.so/api/v1/transactional', {
                method:  'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization:  `Bearer ${loopsApiKey}`,
                },
                body: JSON.stringify({ transactionalId: templateId, email: digest.email, dataVariables }),
              })
            );

            // Mark rows as sent on success
            sentRowIds.push(...digest.rows.map((r) => r.id));
            results.sent++;
          } catch (err) {
            console.error(`send-digest: failed for ${digest.email}:`, err);
            results.failed++;
            // sent = false → will retry on next invocation
          }
        }),
      );
    }

    // ── 6. Mark sent rows as sent = true ─────────────────────
    if (sentRowIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('notification_queue')
        .update({ sent: true })
        .in('id', sentRowIds);
      if (updateErr) console.error('send-digest: failed to mark rows sent:', updateErr);
    }

    // ── 7. Cleanup: delete sent rows older than 7 days ────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cleanupErr } = await supabase
      .from('notification_queue')
      .delete()
      .eq('sent', true)
      .lt('created_at', sevenDaysAgo);
    if (cleanupErr) console.error('send-digest: cleanup error:', cleanupErr);

    console.log(`send-digest: done. sent=${results.sent} failed=${results.failed} triggered_by=${triggeredBy}`);

    return new Response(
      JSON.stringify({
        ok: true,
        ...results,
        is_monday: isMonday,
        started_at: startedAt,
        triggered_by: triggeredBy,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-digest: unhandled error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
