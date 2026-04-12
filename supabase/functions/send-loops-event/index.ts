import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function loopsRequest(
  apiKey: string,
  method: string,
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`https://app.loops.so/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  let data: unknown
  try { data = await res.json() } catch (_) { data = null }

  if (!res.ok) {
    console.error(`[send-loops-event] Loops ${method} ${path} → ${res.status}`, JSON.stringify(data))
  } else {
    console.log(`[send-loops-event] Loops ${method} ${path} → ${res.status} OK`)
  }
  return { ok: res.ok, status: res.status, data }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, eventName, contactProperties } = await req.json()

    if (!email || !eventName) {
      return new Response(JSON.stringify({ error: 'email and eventName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('LOOPS_API_KEY')
    if (!apiKey) {
      console.error('[send-loops-event] LOOPS_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'LOOPS_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 1. Upsert contact ────────────────────────────────────
    // Try create first; if the contact already exists (409), fall back to update.
    const contactBody: Record<string, unknown> = {
      email,
      ...(contactProperties && typeof contactProperties === 'object' ? contactProperties : {}),
    }

    const createRes = await loopsRequest(apiKey, 'POST', '/contacts/create', contactBody)

    if (!createRes.ok && createRes.status !== 409) {
      // 409 = contact already exists → fall through to update
      // anything else is a real error; log and continue (don't block event send)
      console.error('[send-loops-event] contacts/create failed for', email, createRes.status)
    }

    if (createRes.status === 409) {
      // Contact exists → update properties
      const updateRes = await loopsRequest(apiKey, 'PUT', '/contacts/update', contactBody)
      if (!updateRes.ok) {
        console.error('[send-loops-event] contacts/update failed for', email, updateRes.status)
      }
    }

    // ── 2. Send event ────────────────────────────────────────
    const eventRes = await loopsRequest(apiKey, 'POST', '/events/send', {
      email,
      eventName,
    })

    return new Response(
      JSON.stringify({ ok: eventRes.ok, status: eventRes.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[send-loops-event] Unhandled error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
