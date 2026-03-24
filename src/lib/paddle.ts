import { initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) return null;
  paddleInstance = await initializePaddle({ token });
  return paddleInstance;
}

// Maps plan name + billing period → Paddle Price ID env var
export const PADDLE_PRICE_IDS: Record<string, Record<'monthly' | 'annual', string | undefined>> = {
  Starter: {
    monthly: import.meta.env.VITE_PADDLE_PRICE_STARTER_MONTHLY,
    annual: import.meta.env.VITE_PADDLE_PRICE_STARTER_ANNUAL,
  },
  Professional: {
    monthly: import.meta.env.VITE_PADDLE_PRICE_PROFESSIONAL_MONTHLY,
    annual: import.meta.env.VITE_PADDLE_PRICE_PROFESSIONAL_ANNUAL,
  },
  'Enterprise S': {
    monthly: import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_S_MONTHLY,
    annual: import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_S_ANNUAL,
  },
  'Enterprise M': {
    monthly: import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_M_MONTHLY,
    annual: import.meta.env.VITE_PADDLE_PRICE_ENTERPRISE_M_ANNUAL,
  },
};

export async function openPaddleCheckout(
  planName: string,
  billingPeriod: 'monthly' | 'annual',
): Promise<boolean> {
  const priceId = PADDLE_PRICE_IDS[planName]?.[billingPeriod];
  if (!priceId) return false;

  const paddle = await getPaddle();
  if (!paddle) return false;

  paddle.Checkout.open({ items: [{ priceId, quantity: 1 }] });
  return true;
}
