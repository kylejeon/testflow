import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  AI_FEATURES,
  PLAN_LIMITS,
  TIER_NAMES,
} from '../_shared/ai-config.ts';
import {
  getEffectiveTier,
  getSharedPoolUsage,
  consumeAiCredit,
  ConsumeAiCreditError,
} from '../_shared/ai-usage.ts';
import { sanitizeShortName, sanitizeTitle } from '../_shared/promptSanitize.ts';
import {
  resolveLocale,
  maybeAppendLocaleInstruction,
  type SupportedLocale,
} from '../_shared/localePrompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskPredictorRequest {
  project_id: string;
  plan_id: string;
  /** f021 — 'ko' | 'en' (그 외 값은 'en' 으로 fallback) */
  locale?: unknown;
}

interface RiskSignal {
  signal: string;
  severity: 'high' | 'medium' | 'low';
  badge: string;
}

interface RiskPredictorResponse {
  forecast_date: string;
  forecast_note: string;
  confidence: number;
  confidence_label: 'high' | 'moderate' | 'low';
  risk_signals: RiskSignal[];
  recommendation: string;
  summary: string;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── Auth ─────────────────────────────────────────────────────────────────
    // ES256 전환 이후 Authorization 에는 HS256 anon key 만, 유저 JWT 는 x-user-token 커스텀 헤더로 옴.
    const userTokenHeader = req.headers.get('x-user-token');
    const authHeader = req.headers.get('Authorization');
    const token = userTokenHeader
      || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
    if (!token) {
      return jsonResponse({ error: 'Missing user token' }, 401);
    }

    let userId: string;
    try {
      const [, payloadB64] = token.split('.');
      const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const json = new TextDecoder().decode(
        Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
      );
      const payload = JSON.parse(json);
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }
      userId = payload.sub;
      if (!userId) throw new Error('No sub in token');
    } catch (e) {
      return jsonResponse({ error: 'Invalid or expired token', detail: String(e) }, 401);
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // ── Request parsing ──────────────────────────────────────────────────────
    const body: RiskPredictorRequest = await req.json();
    const { project_id, plan_id } = body;
    const locale: SupportedLocale = resolveLocale(body.locale);

    if (!project_id || !plan_id) {
      return jsonResponse({ error: 'project_id and plan_id are required' }, 400);
    }

    // ── Tier & Credit check ──────────────────────────────────────────────────
    const feature = AI_FEATURES['risk_predictor'];
    const { tier, ownerId } = await getEffectiveTier(supabase, user.id);

    if (tier < feature.minTier) {
      return jsonResponse({
        error: `AI Risk Predictor requires ${TIER_NAMES[feature.minTier]} plan or higher.`,
        requiredTier: feature.minTier,
        upgradeUrl: 'https://testably.app/pricing',
      }, 403);
    }

    const monthlyLimit = PLAN_LIMITS[tier] ?? -1;
    const usedCredits = await getSharedPoolUsage(supabase, ownerId);
    if (monthlyLimit !== -1 && usedCredits + feature.creditCost > monthlyLimit) {
      return jsonResponse({
        error: 'Monthly AI credit limit reached. Upgrade your plan for more credits.',
        used: usedCredits,
        limit: monthlyLimit,
        upgradeUrl: 'https://testably.app/pricing',
      }, 429);
    }

    // ── Gather Plan data ─────────────────────────────────────────────────────

    // Plan info
    const { data: plan } = await supabase
      .from('test_plans')
      .select('name, status, priority, target_date, end_date, start_date, is_locked')
      .eq('id', plan_id)
      .maybeSingle();

    if (!plan) {
      return jsonResponse({ error: 'Plan not found' }, 404);
    }

    // Plan TCs
    const { data: planTcRows } = await supabase
      .from('test_plan_test_cases')
      .select('test_case_id')
      .eq('test_plan_id', plan_id);
    const tcIds = (planTcRows || []).map((r: any) => r.test_case_id);

    if (tcIds.length === 0) {
      return jsonResponse({
        forecast_date: '—',
        forecast_note: 'No test cases in plan',
        confidence: 0,
        confidence_label: 'low',
        risk_signals: [{ signal: 'Plan has no test cases', severity: 'high', badge: 'empty' }],
        recommendation: 'Add test cases to this plan to enable risk analysis.',
        summary: 'Cannot analyze risk without test cases.',
        meta: { credits_used: 0, credits_remaining: monthlyLimit === -1 ? -1 : monthlyLimit - usedCredits },
      });
    }

    // TC details
    const { data: tcs } = await supabase
      .from('test_cases')
      .select('id, title, priority, folder, tags, custom_id')
      .in('id', tcIds);

    // Runs for this plan
    const { data: runs } = await supabase
      .from('test_runs')
      .select('id, name, status, passed, failed, blocked, retest, untested, created_at')
      .eq('test_plan_id', plan_id)
      .order('created_at', { ascending: false });

    // Test results (latest per TC across all plan runs)
    const runIds = (runs || []).map((r: any) => r.id);
    let resultsData: any[] = [];
    if (runIds.length > 0) {
      const { data } = await supabase
        .from('test_results')
        .select('test_case_id, status, author, created_at')
        .in('run_id', runIds)
        .order('created_at', { ascending: false });
      resultsData = data || [];
    }

    // Dedup: latest result per TC
    const latestPerTc = new Map<string, { status: string; created_at: string }>();
    for (const r of resultsData) {
      if (r.test_case_id && !latestPerTc.has(r.test_case_id)) {
        latestPerTc.set(r.test_case_id, { status: r.status, created_at: r.created_at });
      }
    }

    // Compute stats
    let passed = 0, failed = 0, blocked = 0, untested = 0;
    for (const tcId of tcIds) {
      const result = latestPerTc.get(tcId);
      if (!result || result.status === 'untested') untested++;
      else if (result.status === 'passed') passed++;
      else if (result.status === 'failed') failed++;
      else if (result.status === 'blocked') blocked++;
    }
    const totalTCs = tcIds.length;
    const executed = passed + failed + blocked;
    const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

    // Build failed TC list
    const failedTCs = (tcs || []).filter((tc: any) => {
      const r = latestPerTc.get(tc.id);
      return r && r.status === 'failed';
    }).map((tc: any) => `${tc.custom_id || tc.id.slice(0, 8)}: ${sanitizeTitle(tc.title)}`);

    const blockedTCs = (tcs || []).filter((tc: any) => {
      const r = latestPerTc.get(tc.id);
      return r && r.status === 'blocked';
    }).map((tc: any) => `${tc.custom_id || tc.id.slice(0, 8)}: ${sanitizeTitle(tc.title)}`);

    // ── Claude API call ──────────────────────────────────────────────────────
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const targetDate = plan.target_date || plan.end_date || null;

    const systemPromptBase = `You are an expert QA risk analyst. Given a test plan's execution data, analyze failure risks and predict outcomes.
Respond ONLY with valid JSON matching the specified schema. Be data-driven and specific.`;
    // f021: KO 일 때만 suffix append. EN 은 원본 그대로 (BR-4).
    const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

    const userPrompt = `Test Plan: "${sanitizeShortName(plan.name)}"
Status: ${plan.status} | Priority: ${plan.priority} | Locked: ${plan.is_locked ? 'Yes' : 'No'}
Target Date: ${targetDate || 'Not set'}
Start Date: ${plan.start_date || 'Not set'}

Execution Summary:
- Total TCs: ${totalTCs}
- Passed: ${passed} | Failed: ${failed} | Blocked: ${blocked} | Untested: ${untested}
- Executed: ${executed}/${totalTCs} (${totalTCs > 0 ? Math.round(executed / totalTCs * 100) : 0}%)
- Pass Rate (of executed): ${passRate}%
- Total Runs: ${(runs || []).length}

${failedTCs.length > 0 ? `Failed TCs:\n${failedTCs.join('\n')}` : 'No failed TCs.'}

${blockedTCs.length > 0 ? `Blocked TCs:\n${blockedTCs.join('\n')}` : 'No blocked TCs.'}

TC Priority Distribution:
- Critical: ${(tcs || []).filter((t: any) => t.priority === 'critical').length}
- High: ${(tcs || []).filter((t: any) => t.priority === 'high').length}
- Medium: ${(tcs || []).filter((t: any) => t.priority === 'medium').length}
- Low: ${(tcs || []).filter((t: any) => t.priority === 'low').length}

Return a JSON object with this exact structure:
{
  "forecast_date": "<estimated completion date as 'Mon DD' (e.g. 'Jun 15'), or 'Complete' if all executed, or '—' if unable to estimate>",
  "forecast_note": "<1 short sentence about timing, e.g. '3 days before target' or '5 days past target'>",
  "confidence": <0-100 integer — how confident is this prediction>,
  "confidence_label": "<high|moderate|low>",
  "risk_signals": [
    { "signal": "<specific risk description>", "severity": "<high|medium|low>", "badge": "<short label like '+42%', 'critical', 'blocked', 'external'>" }
  ],
  "recommendation": "<2-3 sentence actionable recommendation referencing specific TCs if relevant>",
  "summary": "<1 sentence executive summary of the risk assessment>"
}

Rules:
- Include 2-4 risk signals, most severe first
- Reference specific TC IDs in recommendations when relevant
- If pass rate < 70%, confidence should be low
- If > 50% untested, mention execution gap as a risk
- If no target date, forecast_date should estimate based on execution pace
- Be specific and data-driven, not generic`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} — ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? '{}';
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

    let result: RiskPredictorResponse;
    try {
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) ||
                        rawContent.match(/```\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
      result = JSON.parse(jsonStr.trim());
    } catch {
      throw new Error('Failed to parse Claude response as JSON');
    }

    const latencyMs = Date.now() - startTime;

    // ── f018 — Atomic credit consume (AC-11) ─────────────────────────────────
    // owner-level advisory lock + re-check + INSERT.
    // RPC 실패 시 AI payload 는 보존하고 meta.credits_logged:false (AC-14).
    // quota 초과(race-lost) 시 AI payload 보존 + 429 (AC-15).
    try {
      const consume = await consumeAiCredit(supabase, {
        userId: user.id,
        ownerId,
        projectId: project_id,
        mode: 'risk-predictor',
        step: 1,
        creditCost: feature.creditCost,
        limit: monthlyLimit,
        tokensUsed,
        latencyMs,
        inputData: {
          plan_id,
          total_tcs: totalTCs,
          passed,
          failed,
          blocked,
          untested,
          pass_rate: passRate,
          run_count: (runs || []).length,
          locale,
        },
        outputData: result,
      });
      if (!consume.allowed) {
        console.warn('[f018] race-lost risk-predictor owner=', ownerId, 'used=', consume.used);
        return jsonResponse({
          error: 'Monthly AI credit limit reached. Upgrade your plan for more credits.',
          used: consume.used,
          limit: consume.limit,
          upgradeUrl: 'https://testably.app/pricing',
          // AI payload 보존
          ...result,
          meta: {
            credits_used: 0,
            credits_remaining: 0,
            credits_logged: false,
            rate_limited_post_check: true,
            monthly_limit: monthlyLimit,
            tokens_used: tokensUsed,
            latency_ms: latencyMs,
          },
        }, 429);
      }
      return jsonResponse({
        ...result,
        meta: {
          credits_used: consume.creditCost,
          credits_remaining: consume.limit === -1 ? -1 : Math.max(0, consume.limit - consume.used),
          monthly_limit: consume.limit,
          tokens_used: tokensUsed,
          latency_ms: latencyMs,
          log_id: consume.logId,
        },
      });
    } catch (err) {
      if (err instanceof ConsumeAiCreditError) {
        console.error('[f018] consume_ai_credit_and_log failed', { ownerId, mode: 'risk-predictor', err: String(err.cause ?? err.message) });
        return jsonResponse({
          ...result,
          meta: {
            credits_used: 0,
            credits_logged: false,
            error: 'credit_log_failed',
            monthly_limit: monthlyLimit,
            tokens_used: tokensUsed,
            latency_ms: latencyMs,
          },
        });
      }
      throw err;
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('risk-predictor error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
