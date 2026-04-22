/**
 * POST /functions/v1/log-consent
 *
 * 개인정보보호법 입증책임 대응용 동의 로그 서버 저장.
 * - ip_address, user_agent를 서버 측에서 추출하여 함께 저장
 * - service_role key로 RLS 우회 insert
 * - verify_jwt = false (회원가입 시점에는 anon 세션)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, user_id, consent_type, policy_version, consents, source } = body;

    if (!consent_type || !policy_version || !consents) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: consent_type, policy_version, consents' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 서버 측에서 ip/ua 추출
    const ip_address =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const user_agent = req.headers.get('user-agent') ?? null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from('consent_logs').insert({
      user_id: user_id || null,
      email: email || null,
      consent_type,
      policy_version,
      consents,
      ip_address,
      user_agent,
      source: source || 'web',
    });

    if (error) {
      console.error('[log-consent] insert error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[log-consent] unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
