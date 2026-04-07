import { initializePaddle, type Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

// Module-level error handler — set once per page via registerPaddleErrorHandler()
let _onError: ((message: string) => void) | null = null;
let _onSuccess: (() => void) | null = null;

export function registerPaddleErrorHandler(cb: (message: string) => void) {
  _onError = cb;
}

export function registerPaddleSuccessHandler(cb: () => void) {
  _onSuccess = cb;
}

export async function getPaddle(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) return null;
  const environment = 'production';
  paddleInstance = await initializePaddle({
    token,
    environment,
    eventCallback(event) {
      if (event.name === 'checkout.completed') {
        _onSuccess?.();
      }
      if (event.name === 'checkout.error') {
        const msg = 'Payment processing is temporarily unavailable. Please try again later or contact support.';
        _onError?.(msg);
        console.error('[Paddle] checkout.error event:', event);
      }
    },
  });
  return paddleInstance;
}

// Maps plan name + billing period → Paddle Price ID
export const PADDLE_PRICE_IDS: Record<string, Record<'monthly' | 'annual', string>> = {
  Hobby: {
    monthly: 'pri_01knjrp6hfh0knkvqman14fnb8',
    annual:  'pri_01knjrq3r21va7m3f96ybajh9m',
  },
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
  userId?: string,
): Promise<boolean> {
  const priceId = PADDLE_PRICE_IDS[planName]?.[billingPeriod];
  if (!priceId) {
    _onError?.('This plan is not available for direct purchase. Please contact support.');
    return false;
  }

  let paddle: Paddle | null;
  try {
    paddle = await getPaddle();
  } catch {
    _onError?.('Payment system is currently unavailable. Please try again later.');
    return false;
  }

  if (!paddle) {
    _onError?.('Payment system is currently unavailable. Please try again later.');
    return false;
  }

  try {
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: userId ? { user_id: userId } : undefined,
    });
    return true;
  } catch {
    _onError?.('Payment processing is temporarily unavailable. Please try again later.');
    return false;
  }
}
