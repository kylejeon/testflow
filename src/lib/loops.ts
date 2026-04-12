import { supabase } from './supabase';

const TIER_PLAN_NAMES: Record<number, string> = {
  1: 'free',
  2: 'hobby',
  3: 'starter',
  4: 'professional',
  5: 'enterprise_s',
  6: 'enterprise_m',
  7: 'enterprise_l',
};

export function tierToPlanName(tier: number): string {
  return TIER_PLAN_NAMES[tier] ?? 'free';
}

export async function sendLoopsEvent(
  email: string,
  eventName: string,
  contactProperties: Record<string, string>,
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-loops-event', {
      body: { email, eventName, contactProperties },
    });
    if (error) {
      console.error('[loops] invoke error for', eventName, error);
    } else if (data && !data.ok) {
      console.warn('[loops] Loops API non-ok for', eventName, data.status);
    }
  } catch (err) {
    console.error('[loops] sendLoopsEvent failed for', eventName, err);
  }
}
