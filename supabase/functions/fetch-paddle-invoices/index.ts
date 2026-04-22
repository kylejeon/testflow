/**
 * fetch-paddle-invoices Edge Function
 *
 * Fetches completed transactions for the authenticated user from Paddle API.
 * Uses PADDLE_API_KEY secret — auto-detects sandbox vs production from key prefix.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
  const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const paddleApiKey    = Deno.env.get('PADDLE_API_KEY');

  if (!paddleApiKey) return jsonResponse({ error: 'Paddle API key not configured' }, 500);

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ES256-safe auth: x-user-token > Authorization Bearer
  const userTokenHeader = req.headers.get('x-user-token');
  const authHeader = req.headers.get('Authorization');
  const token = userTokenHeader
    || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);

  let userId: string;
  try {
    const [, payloadB64] = token.split('.');
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))),
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
    userId = payload.sub;
    if (!userId) throw new Error('No sub');
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const { data: { user }, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);
  const { data: profile } = await adminClient
    .from('profiles')
    .select('provider_customer_id, payment_provider')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.provider_customer_id || profile.payment_provider !== 'paddle') {
    return jsonResponse({ invoices: [] });
  }

  // Determine Paddle base URL from API key prefix
  const isSandbox = paddleApiKey.includes('sdbx');
  const paddleBase = isSandbox
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com';

  // Fetch transactions from Paddle API
  // Include both 'billed' (subscription payments) and 'completed' (one-time payments).
  // Sandbox subscription transactions typically have status 'billed'.
  const params = new URLSearchParams({
    customer_id: profile.provider_customer_id,
    per_page: '50',
  });

  const resp = await fetch(`${paddleBase}/transactions?${params}`, {
    headers: {
      Authorization: `Bearer ${paddleApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('[fetch-paddle-invoices] Paddle API error:', resp.status, errText);
    return jsonResponse({ error: `Paddle API error: ${resp.status}` }, 502);
  }

  const result = await resp.json();
  const allTx: any[] = result.data ?? [];
  // Only show transactions that represent actual charges (exclude draft/ready/cancelled)
  const transactions = allTx.filter((tx: any) =>
    ['billed', 'completed', 'past_due'].includes(tx.status),
  );

  const invoices = transactions.map((tx: any) => {
    const billedAt = tx.billed_at ?? tx.created_at;
    const totals = tx.details?.totals ?? {};
    const lineItems: any[] = tx.details?.line_items ?? [];
    const productName = lineItems[0]?.price?.description
      || lineItems[0]?.product?.name
      || 'Subscription';
    const billingCycle = lineItems[0]?.price?.billing_cycle?.interval ?? '';
    const description = billingCycle
      ? `${productName} — ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}ly`
      : productName;

    return {
      id: tx.id,
      date: billedAt ? new Date(billedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
      description,
      amount: totals.grand_total != null
        ? `$${(Number(totals.grand_total) / 100).toFixed(2)}`
        : totals.total != null
          ? `$${Number(totals.total).toFixed(2)}`
          : '—',
      currency: tx.currency_code ?? 'USD',
      status: tx.status ?? 'completed',
      invoice_pdf: tx.invoice_pdf ?? null,
    };
  });

  return jsonResponse({ invoices });
});
