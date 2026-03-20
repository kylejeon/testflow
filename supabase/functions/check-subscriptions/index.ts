import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Service Role 키로 RLS 우회
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    // ── 1. 무료 체험 만료 → Free (tier=1) 전환 ──────────────────────
    const { data: expiredTrials, error: trialError } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier')
      .eq('is_trial', true)
      .not('trial_ends_at', 'is', null)
      .lt('trial_ends_at', now);

    if (trialError) throw trialError;

    let trialDowngraded = 0;
    if (expiredTrials && expiredTrials.length > 0) {
      const trialIds = expiredTrials.map((u: { id: string }) => u.id);
      const { error: trialUpdateError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 1,
          is_trial: false,
        })
        .in('id', trialIds);

      if (trialUpdateError) throw trialUpdateError;
      trialDowngraded = expiredTrials.length;
    }

    // ── 2. 유료 구독 만료 → Free (tier=1) 전환 ──────────────────────
    const { data: expiredPaid, error: paidError } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier')
      .gt('subscription_tier', 1)
      .eq('is_trial', false)
      .not('subscription_ends_at', 'is', null)
      .lt('subscription_ends_at', now);

    if (paidError) throw paidError;

    let paidDowngraded = 0;
    if (expiredPaid && expiredPaid.length > 0) {
      const paidIds = expiredPaid.map((u: { id: string }) => u.id);
      const { error: paidUpdateError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 1,
          subscription_ends_at: null,
        })
        .in('id', paidIds);

      if (paidUpdateError) throw paidUpdateError;
      paidDowngraded = expiredPaid.length;
    }

    const result = {
      success: true,
      checked_at: now,
      trial_downgraded: trialDowngraded,
      paid_downgraded: paidDowngraded,
      total_downgraded: trialDowngraded + paidDowngraded,
    };

    console.log('[check-subscriptions]', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-subscriptions] Error:', errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
