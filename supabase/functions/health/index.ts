/**
 * GET /functions/v1/health
 *
 * Pings Supabase DB, Paddle API, and Loops API.
 * Returns HTTP 200 with JSON when all dependencies are healthy,
 * HTTP 503 when any dependency is down.
 *
 * Used by BetterStack uptime monitoring.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CheckResult = {
  ok: boolean;
  latency_ms: number;
  error?: string;
};

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY not set');

    // Lightweight REST ping — select 1 row from a known small table
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, latency_ms: Date.now() - start };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkPaddle(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const apiKey = Deno.env.get('PADDLE_API_KEY');
    if (!apiKey) return { ok: true, latency_ms: 0, error: 'PADDLE_API_KEY not configured (skipped)' };

    // Paddle health: list prices (cheap read-only call)
    const res = await fetch('https://api.paddle.com/prices?per_page=1', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, latency_ms: Date.now() - start };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - start, error: String(e) };
  }
}

async function checkLoops(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const apiKey = Deno.env.get('LOOPS_API_KEY');
    if (!apiKey) return { ok: true, latency_ms: 0, error: 'LOOPS_API_KEY not configured (skipped)' };

    // Loops health check endpoint
    const res = await fetch('https://app.loops.so/api/v1/api-key', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, latency_ms: Date.now() - start };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - start, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const [supabase, paddle, loops] = await Promise.all([
    checkSupabase(),
    checkPaddle(),
    checkLoops(),
  ]);

  const allOk = supabase.ok && paddle.ok && loops.ok;
  const status = allOk ? 200 : 503;

  const body = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: { supabase, paddle, loops },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
