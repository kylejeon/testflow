import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price ID → Tier 매핑 (src/lib/paddle.ts 의 PADDLE_PRICE_IDS 역방향)
// Tier numbering: 1=Free, 2=Hobby($19), 3=Starter($49), 4=Professional($99),
//                 5=Enterprise S($249), 6=Enterprise M($499), 7=Enterprise L(Custom)
const PRICE_ID_TO_TIER: Record<string, number> = {
  // Hobby ($19) — set price IDs after creating in Paddle dashboard
  'PADDLE_HOBBY_MONTHLY_PRICE_ID': 2, // Hobby monthly (placeholder)
  'PADDLE_HOBBY_ANNUAL_PRICE_ID': 2,  // Hobby annual (placeholder)
  'pri_01kmfhvvyvrqzjhbzzmdy27szb': 3, // Starter monthly
  'pri_01kmfhx9p3qb6m4v3m1zqde7td': 3, // Starter annual
  'pri_01kmfhrfcww99zkqdmwktgqf3y': 4, // Professional monthly
  'pri_01kmfht5fwdmamdh375zwwtcca': 4, // Professional annual
  'pri_01kmfhpz212sdy3tvk7syebkr5': 5, // Enterprise S monthly
  'pri_01kmfhnynq27f86xsr42hhqmxh': 5, // Enterprise S annual
  'pri_01kmfgx4n2vvcmbckw9d725hp8': 6, // Enterprise M monthly
  'pri_01kmfhmgzsje7wdw8thnddzc9k': 6, // Enterprise M annual
};

/** Paddle ts+h1 서명 검증 */
async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  // paddle-signature: ts=1234567890;h1=abc...
  const parts = signatureHeader.split(';');
  const tsPart = parts.find(p => p.startsWith('ts='));
  const h1Part = parts.find(p => p.startsWith('h1='));
  if (!tsPart || !h1Part) return false;

  const ts = tsPart.slice(3);
  const h1 = h1Part.slice(3);
  const payload = `${ts}:${rawBody}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === h1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. 서명 검증
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('paddle-signature');
  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET');

  if (!secret) {
    console.error('PADDLE_WEBHOOK_SECRET not set');
    return new Response('Server configuration error', { status: 500 });
  }

  if (!signatureHeader) {
    return new Response('Missing paddle-signature header', { status: 401 });
  }

  const valid = await verifyPaddleSignature(rawBody, signatureHeader, secret);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType: string = payload.event_type;
  const userId: string | undefined = payload.data?.custom_data?.user_id;

  if (!userId) {
    return new Response('Missing user_id in custom_data', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 2. 이벤트 처리
  switch (eventType) {
    case 'subscription.created':
    case 'subscription.updated': {
      const sub = payload.data;
      if (!sub) break;

      // Price ID에서 tier 추출
      const items = sub.items ?? [];
      const priceId = items[0]?.price?.id ?? '';
      const tier = PRICE_ID_TO_TIER[priceId] ?? 1;

      if (sub.status === 'active') {
        const { error } = await supabase.from('profiles').update({
          subscription_tier: tier,
          is_trial: false,
          payment_provider: 'paddle',
          provider_customer_id: String(sub.customer_id),
          provider_subscription_id: String(sub.id),
          subscription_ends_at: sub.next_billed_at ?? null,
        }).eq('id', userId);
        if (error) console.error('[paddle-webhook] update error:', error);
      }
      break;
    }
    case 'subscription.cancelled': {
      // 즉시 다운그레이드 안 함 — ends_at까지 유지
      const { error } = await supabase.from('profiles').update({
        subscription_ends_at: payload.data?.canceled_at ?? null,
      }).eq('id', userId);
      if (error) console.error('[paddle-webhook] cancel update error:', error);
      break;
    }
    case 'subscription.past_due': {
      console.warn(`[paddle-webhook] Subscription past_due for user ${userId}`);
      break;
    }
    case 'transaction.completed': {
      // 결제 완료 — 구독 갱신일 업데이트
      const nextBilledAt = payload.data?.subscription_id
        ? null // subscription.updated 이벤트에서 처리됨
        : null;
      if (nextBilledAt) {
        await supabase.from('profiles').update({
          subscription_ends_at: nextBilledAt,
        }).eq('id', userId);
      }
      break;
    }
    case 'transaction.payment_failed': {
      console.warn(`[paddle-webhook] Payment failed for user ${userId}`);
      break;
    }
    default:
      console.log(`[paddle-webhook] Unhandled event: ${eventType}`);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
