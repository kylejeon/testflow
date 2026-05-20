/**
 * Payment — Stubbed for internal-only mode.
 *
 * Paddle and Lemon Squeezy checkout flows are no longer reachable. Existing
 * call sites (e.g. legacy Settings billing tab) are kept to avoid a sweeping
 * refactor; `openCheckout` is a no-op that logs and returns false so any
 * accidental click does nothing.
 */

export type PaymentProvider = 'paddle' | 'lemon';

export function getPaymentProvider(_userProfile: {
  payment_provider?: string | null;
  subscription_tier?: number | null;
}): PaymentProvider {
  return 'paddle';
}

export async function openCheckout(
  _planName: string,
  _billingPeriod: 'monthly' | 'annual',
  _provider: PaymentProvider,
  _userEmail: string,
  _userId: string,
): Promise<boolean> {
  console.warn('[payment] openCheckout called in internal-only mode — no-op');
  return false;
}
