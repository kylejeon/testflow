import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, rateLimitResponse, RATE_CONFIGS } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 발신 project_id 또는 호출자 IP를 식별자로 사용
    // Authorization 헤더가 있으면 사용자 기준 rate limit 적용
    const authHeader = req.headers.get('Authorization');
    let identifier = req.headers.get('x-forwarded-for') || 'anonymous';

    if (authHeader?.startsWith('Bearer ')) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) identifier = user.id;
    }

    // ── Rate Limiting ─────────────────────────────────────────
    const rlResult = await checkRateLimit(supabase, identifier, 'webhook_send', RATE_CONFIGS['webhook_send']);
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult, corsHeaders);
    }

    const { url, payload } = await req.json()

    if (!url || !payload) {
      return new Response(JSON.stringify({ error: 'url and payload are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const status = res.status
    return new Response(JSON.stringify({ status, ok: res.ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
