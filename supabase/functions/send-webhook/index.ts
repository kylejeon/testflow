Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.url) {
      return new Response(JSON.stringify({ error: 'Invalid payload: missing "url"' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const webhookUrl = body.url;
    const payload = body.payload ?? {};
    const method = (body.method ?? 'POST').toUpperCase();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, body.headers ?? {});

    const resp = await fetch(webhookUrl, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(payload),
    });

    const text = await resp.text();

    return new Response(JSON.stringify({ status: resp.status, body: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-webhook error', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
