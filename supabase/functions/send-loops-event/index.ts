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
      subscribed: true,  // ensure contact is subscribed even if previously deleted/unsubscribed
      ...(contactProperties && typeof contactProperties === 'object' ? contactProperties : {}),
    }

    const createRes = await loopsRequest(apiKey, 'POST', '/contacts/create', contactBody)
    let contactAction = 'created'

    if (!createRes.ok && createRes.status !== 409) {
      console.error('[send-loops-event] contacts/create failed for', email, createRes.status, JSON.stringify(createRes.data))
      contactAction = 'create_failed'
    }

    if (createRes.status === 409) {
      // Contact exists → update properties (including subscribed: true to re-subscribe if needed)
      contactAction = 'updated'
      const updateRes = await loopsRequest(apiKey, 'PUT', '/contacts/update', contactBody)
      if (!updateRes.ok) {
        console.error('[send-loops-event] contacts/update failed for', email, updateRes.status, JSON.stringify(updateRes.data))
        contactAction = 'update_failed'
      }
    }

    // ── 2. Send event (triggers Loops Sequences / drip) ──────
    const eventRes = await loopsRequest(apiKey, 'POST', '/events/send', {
      email,
      eventName,
    })

    if (!eventRes.ok) {
      console.error('[send-loops-event] events/send failed for', email, eventName, eventRes.status, JSON.stringify(eventRes.data))
    }

    // ── 3. Welcome transactional email (user_signup only) ────
    // Sends the Welcome email immediately via Transactional API,
    // independent of Loops Sequence status. Drip emails (day 3/7/14)
    // continue to be handled by the Loops Sequence triggered in step 2.
    let transactionalRes: { ok: boolean; status: number; data: unknown } | null = null

    if (eventName === 'user_signup') {
      const welcomeTemplateId = Deno.env.get('LOOPS_TEMPLATE_WELCOME')
      if (welcomeTemplateId) {
        const props = (contactProperties && typeof contactProperties === 'object')
          ? contactProperties as Record<string, unknown>
          : {}
        transactionalRes = await loopsRequest(apiKey, 'POST', '/transactional', {
          transactionalId: welcomeTemplateId,
          email,
          dataVariables: {
            firstName: props.firstName ?? email.split('@')[0],
            ctaUrl: 'https://testably.app/projects',
          },
        })
        if (!transactionalRes.ok) {
          console.error('[send-loops-event] transactional welcome failed for', email, transactionalRes.status, JSON.stringify(transactionalRes.data))
        }
      } else {
        console.warn('[send-loops-event] LOOPS_TEMPLATE_WELCOME not set — skipping transactional welcome')
      }
    }

    return new Response(
      JSON.stringify({
        contact: { action: contactAction, createStatus: createRes.status },
        event: { ok: eventRes.ok, status: eventRes.status, data: eventRes.data },
        ...(transactionalRes !== null && {
          transactional: { ok: transactionalRes.ok, status: transactionalRes.status, data: transactionalRes.data },
        }),
      }),
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
