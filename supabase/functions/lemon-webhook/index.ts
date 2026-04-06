import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tier numbering: 1=Free, 2=Hobby($19), 3=Starter($49), 4=Professional($99),
//                 5=Enterprise S($249), 6=Enterprise M($499), 7=Enterprise L(Custom)
function variantToTier(variantId: number): number {
  const map: Record<number, number> = {
    950531: 2, 950542: 2,   // Hobby
    935688: 3, 935691: 3,   // Starter
    935695: 4, 935696: 4,   // Professional
    935705: 5, 935708: 5,   // Enterprise S
    935714: 6, 935716: 6,   // Enterprise M
  };
  return map[variantId] ?? 1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. 서명 검증
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');
  const secret = Deno.env.get('LEMON_WEBHOOK_SECRET');

  if (!secret) {
    console.error('LEMON_WEBHOOK_SECRET not set');
    return new Response('Server configuration error', { status: 500 });
  }

  if (!signature) {
    return new Response('Missing signature', { status: 401 });
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected !== signature) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventName: string = payload.meta?.event_name;
  const userId: string | undefined = payload.meta?.custom_data?.user_id;

  if (!userId) {
    return new Response('Missing user_id in custom_data', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 2. 이벤트 처리
  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated': {
      const sub = payload.data?.attributes;
      if (!sub) break;
      const tier = variantToTier(Number(sub.variant_id));
      if (sub.status === 'active') {
        const { error } = await supabase.from('profiles').update({
          subscription_tier: tier,
          is_trial: false,
          payment_provider: 'lemon',
          provider_customer_id: String(sub.customer_id),
          provider_subscription_id: String(payload.data.id),
          subscription_ends_at: sub.renews_at ?? null,
        }).eq('id', userId);
        if (error) console.error(`[lemon-webhook] update error:`, error);
      }
      break;
    }
    case 'subscription_cancelled': {
      // 즉시 다운그레이드 안 함 — ends_at까지 유지
      const { error } = await supabase.from('profiles').update({
        subscription_ends_at: payload.data?.attributes?.ends_at ?? null,
      }).eq('id', userId);
      if (error) console.error(`[lemon-webhook] cancel update error:`, error);
      break;
    }
    case 'subscription_expired': {
      const { error } = await supabase.from('profiles').update({
        subscription_tier: 1,
        payment_provider: null,
        provider_subscription_id: null,
        subscription_ends_at: null,
      }).eq('id', userId);
      if (error) console.error(`[lemon-webhook] expire update error:`, error);
      break;
    }
    case 'subscription_payment_success': {
      const { error } = await supabase.from('profiles').update({
        subscription_ends_at: payload.data?.attributes?.renews_at ?? null,
      }).eq('id', userId);
      if (error) console.error(`[lemon-webhook] payment success update error:`, error);
      break;
    }
    case 'subscription_payment_failed': {
      console.warn(`[lemon-webhook] Payment failed for user ${userId}`);
      break;
    }
    default:
      console.log(`[lemon-webhook] Unhandled event: ${eventName}`);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
