import { invokeEdge } from './aiFetch';

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
  // Loops 이벤트는 비로그인/로그인 둘 다 가능 — allowAnonymous.
  const { data, error } = await invokeEdge<{ ok?: boolean; status?: number }>('send-loops-event', {
    allowAnonymous: true,
    body: { email, eventName, contactProperties },
  });
  if (error) {
    console.error('[loops] invoke error for', eventName, error);
  } else if (data && !data.ok) {
    console.warn('[loops] Loops API non-ok for', eventName, data.status);
  }
}
