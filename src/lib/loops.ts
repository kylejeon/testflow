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
    await supabase.functions.invoke('send-loops-event', {
      body: { email, eventName, contactProperties },
    });
  } catch (err) {
    console.warn('Loops event error:', err);
  }
}
