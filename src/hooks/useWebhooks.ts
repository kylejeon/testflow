import { supabase } from '../lib/supabase';

const APP_URL = 'https://www.testably.app';

// ── Event meta builder ────────────────────────────────────────────────────────

function buildEventMeta(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): { title: string; body: string; link: string } {
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
      const passed = (data.passed as number) ?? 0;
      const failed = (data.failed as number) ?? 0;
      const total  = (data.total  as number) ?? (passed + failed);
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
    case 'milestone_rollup_updated':
      return {
        title: 'Milestone roll-up updated',
        body:  `Sub milestone *${data.sub_milestone_name ?? 'Unnamed'}* updated — parent milestone *${data.milestone_name ?? ''}* roll-up recalculated in *${projectName}*.`,
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

export function buildSlackPayload(meta: { title: string; body: string; link: string }): unknown {
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

export function buildTeamsPayload(meta: { title: string; body: string; link: string }): unknown {
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
            { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: `🧪 ${meta.title}` },
            { type: 'TextBlock', text: plainBody, wrap: true },
          ],
          actions: [
            { type: 'Action.OpenUrl', title: 'View in Testably', url: meta.link },
          ],
        },
      },
    ],
  };
}

// ── Webhook trigger ───────────────────────────────────────────────────────────

/**
 * Fires project webhooks for a given event.
 * Fetches active integrations from DB, builds the platform-specific payload,
 * then calls the send-webhook Edge Function (fire-and-forget).
 */
export async function triggerWebhook(
  projectId: string,
  eventType: WebhookEventType,
  eventData: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, type, webhook_url')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (!integrations || integrations.length === 0) return;

    const meta = buildEventMeta(eventType, eventData);
    const edgeFnUrl = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-webhook`;

    for (const integration of integrations) {
      const payload = integration.type === 'slack'
        ? buildSlackPayload(meta)
        : buildTeamsPayload(meta);

      fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: integration.webhook_url, payload }),
      }).catch((err) => console.warn('Webhook delivery error:', err));
    }
  } catch (err) {
    console.warn('triggerWebhook setup error:', err);
  }
}

// ── Supported event types ─────────────────────────────────────────────────────

export type WebhookEventType =
  | 'invitation_received'
  | 'member_joined'
  | 'run_created'
  | 'run_completed'
  | 'milestone_started'
  | 'milestone_completed'
  | 'milestone_past_due'
  | 'milestone_rollup_updated';

export const WEBHOOK_EVENTS: { type: WebhookEventType; label: string; description: string }[] = [
  { type: 'invitation_received',  label: 'Invitation Received',  description: 'When a user is invited to the project' },
  { type: 'member_joined',        label: 'New Member Joined',     description: 'When a new member joins the project' },
  { type: 'run_created',          label: 'New Run Created',       description: 'When a new test run is created' },
  { type: 'run_completed',        label: 'Run Completed',         description: 'When a test run is marked as completed (includes pass/fail counts)' },
  { type: 'milestone_started',         label: 'Milestone In Progress',    description: 'When a milestone begins' },
  { type: 'milestone_completed',       label: 'Milestone Completed',      description: 'When a milestone is marked as completed' },
  { type: 'milestone_past_due',        label: 'Milestone Overdue',        description: 'When a milestone passes its due date' },
  { type: 'milestone_rollup_updated',  label: 'Milestone Roll-up Updated', description: 'When a sub milestone changes and parent roll-up is recalculated' },
];
