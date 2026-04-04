// Lemon Squeezy Variant ID 매핑
export const LEMON_VARIANT_IDS: Record<string, Record<'monthly' | 'annual', number>> = {
  Starter:        { monthly: 935688, annual: 935691 },
  Professional:   { monthly: 935695, annual: 935696 },
  'Enterprise S': { monthly: 935705, annual: 935708 },
  'Enterprise M': { monthly: 935714, annual: 935716 },
};

declare global {
  interface Window {
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}

export function openLemonCheckout(
  planName: string,
  billingPeriod: 'monthly' | 'annual',
  userEmail: string,
  userId: string,
): boolean {
  const variants = LEMON_VARIANT_IDS[planName];
  if (!variants) return false;

  const variantId = variants[billingPeriod];
  const storeId = import.meta.env.VITE_LEMON_STORE_ID;
  if (!storeId) {
    console.error('[Lemon] VITE_LEMON_STORE_ID is not set');
    return false;
  }

  const url =
    `https://${storeId}.lemonsqueezy.com/checkout/buy/${variantId}?` +
    new URLSearchParams({
      'checkout[email]': userEmail,
      'checkout[custom][user_id]': userId,
      embed: '1',
    }).toString();

  if (window.LemonSqueezy) {
    window.LemonSqueezy.Url.Open(url);
  } else {
    window.open(url, '_blank');
  }
  return true;
}
