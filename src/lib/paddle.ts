import { initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) return null;
  paddleInstance = await initializePaddle({ token });
  return paddleInstance;
}

// Maps plan name + billing period → Paddle Price ID
export const PADDLE_PRICE_IDS: Record<string, Record<'monthly' | 'annual', string>> = {
  Starter: {
    monthly: 'pri_01kmfhvvyvrqzjhbzzmdy27szb',
    annual: 'pri_01kmfhx9p3qb6m4v3m1zqde7td',
  },
  Professional: {
    monthly: 'pri_01kmfhrfcww99zkqdmwktgqf3y',
    annual: 'pri_01kmfht5fwdmamdh375zwwtcca',
  },
  'Enterprise S': {
    monthly: 'pri_01kmfhpz212sdy3tvk7syebkr5',
    annual: 'pri_01kmfhnynq27f86xsr42hhqmxh',
  },
  'Enterprise M': {
    monthly: 'pri_01kmfgx4n2vvcmbckw9d725hp8',
    annual: 'pri_01kmfhmgzsje7wdw8thnddzc9k',
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
