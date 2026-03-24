const LOOPS_API_URL = 'https://app.loops.so/api/v1/events/send';

const TIER_PLAN_NAMES: Record<number, string> = {
  1: 'free',
  2: 'starter',
  3: 'professional',
  4: 'enterprise_s',
  5: 'enterprise_m',
  6: 'enterprise_l',
};

export function tierToPlanName(tier: number): string {
  return TIER_PLAN_NAMES[tier] ?? 'free';
}

export async function sendLoopsEvent(
  email: string,
  eventName: string,
  contactProperties: Record<string, string>,
): Promise<void> {
  const apiKey = import.meta.env.VITE_LOOPS_API_KEY;
  if (!apiKey) return;

  try {
    await fetch(LOOPS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email, eventName, contactProperties }),
    });
  } catch (err) {
    console.warn('Loops event error:', err);
  }
}
