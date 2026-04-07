import { openPaddleCheckout } from './paddle';
import { openLemonCheckout } from './lemon';

export type PaymentProvider = 'paddle' | 'lemon';

/**
 * 유저 프로필에 따라 결제 제공자를 결정합니다.
 * - 기존 Lemon Squeezy 유료 유저 → Lemon Squeezy 유지
 * - 그 외 모든 유저 → Paddle (기본)
 */
export function getPaymentProvider(userProfile: {
  payment_provider?: string | null;
  subscription_tier?: number | null;
}): PaymentProvider {
  if (
    userProfile.payment_provider === 'lemon' &&
    (userProfile.subscription_tier ?? 1) > 1
  ) {
    return 'lemon';
  }
  return 'paddle';
}

/**
 * 결제 제공자에 따라 체크아웃을 엽니다.
 */
export async function openCheckout(
  planName: string,
  billingPeriod: 'monthly' | 'annual',
  provider: PaymentProvider,
  userEmail: string,
  userId: string,
): Promise<boolean> {
  if (provider === 'paddle') {
    return openPaddleCheckout(planName, billingPeriod, userId);
  }
  return openLemonCheckout(planName, billingPeriod, userEmail, userId);
}
