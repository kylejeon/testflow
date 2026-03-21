import { supabase } from '../lib/supabase';

/**
 * Fires project webhooks for a given event.
 * Calls the send-webhook Edge Function in a fire-and-forget manner
 * so it never blocks the UI action that triggered it.
 */
export async function triggerWebhook(
  projectId: string,
  eventType: WebhookEventType,
  eventData: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    // Fire-and-forget — don't await the full response
    fetch(
      `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId, event_type: eventType, event_data: eventData }),
      },
    ).catch((err) => console.warn('Webhook delivery error:', err));
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
  | 'milestone_past_due';

export const WEBHOOK_EVENTS: { type: WebhookEventType; label: string; description: string }[] = [
  { type: 'invitation_received',  label: 'Invitation Received',  description: 'When a user is invited to the project' },
  { type: 'member_joined',        label: 'New Member Joined',     description: 'When a new member joins the project' },
  { type: 'run_created',          label: 'New Run Created',       description: 'When a new test run is created' },
  { type: 'run_completed',        label: 'Run Completed',         description: 'When a test run is marked as completed (includes pass/fail counts)' },
  { type: 'milestone_started',    label: 'Milestone Started',     description: 'When a milestone is started' },
  { type: 'milestone_completed',  label: 'Milestone Completed',   description: 'When a milestone is marked as completed' },
  { type: 'milestone_past_due',   label: 'Milestone Past Due',    description: 'When a milestone passes its due date' },
];
