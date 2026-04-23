/**
 * env-ai-insights Edge Function
 *
 * f001 — Environment Coverage AI Insights.
 * Rule-based EnvironmentAIInsights 사이드바 카드를 Claude Haiku 로 증강한다.
 *
 * Pattern reference: supabase/functions/milestone-risk-predictor/index.ts
 * Dev Spec: docs/specs/dev-spec-f001-f002-env-ai-insights.md
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  AI_FEATURES,
  PLAN_LIMITS,
  TIER_NAMES,
} from '../_shared/ai-config.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';
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

interface EnvAiInsightsRequest {
  plan_id: string;
  force_refresh?: boolean;
  locale?: unknown;
}

interface EnvAiInsightsResult {
  headline: string | null;
  critical_env: string | null;
  critical_reason: string | null;
  coverage_gap_tc: string | null;
  coverage_gap_reason: string | null;
  recommendations: string[];
  confidence: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoNow(): string {
  return new Date().toISOString();
}

function isoAfter(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

function isStale(generatedAt: string | null | undefined): boolean {
  if (!generatedAt) return true;
  const t = Date.parse(generatedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > 24 * 3600_000;
}

function clampStr(s: unknown, maxLen: number): string | null {
  if (s === null || s === undefined) return null;
  const str = String(s).trim();
  if (!str) return null;
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
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

    // ── Auth (ES256-safe, milestone-risk-predictor 패턴) ─────────────────────
    const userTokenHeader = req.headers.get('x-user-token');
    const authHeader = req.headers.get('Authorization');
    const token = userTokenHeader
      || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
    if (!token) {
      return jsonResponse({ error: 'unauthorized', detail: 'Missing user token' }, 401);
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
      return jsonResponse({ error: 'unauthorized', detail: String(e) }, 401);
    }

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    // ── Request parsing ──────────────────────────────────────────────────────
    const body: EnvAiInsightsRequest = await req.json().catch(() => ({} as EnvAiInsightsRequest));
    const { plan_id, force_refresh } = body;
    const locale: SupportedLocale = resolveLocale(body.locale);

    if (!plan_id) {
      return jsonResponse({ error: 'bad_request', detail: 'plan_id is required' }, 400);
    }

    // ── Fetch plan ───────────────────────────────────────────────────────────
    const { data: plan, error: planError } = await supabase
      .from('test_plans')
      .select('id, project_id, name, ai_env_insights_cache')
      .eq('id', plan_id)
      .maybeSingle();

    if (planError || !plan) {
      return jsonResponse({ error: 'not_found', detail: 'Plan not found' }, 404);
    }

    const projectId = plan.project_id as string;

    // ── Membership + role gate (Manager 이상) ────────────────────────────────
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    const roleLevelMap: Record<string, number> = {
      owner: 6, admin: 5, manager: 4, tester: 3, viewer: 2, guest: 1,
    };
    const userLevel = roleLevelMap[member?.role ?? ''] ?? 0;

    if (userLevel < 4) {
      return jsonResponse({
        error: 'forbidden',
        detail: 'Only Manager or above can trigger AI analysis.',
      }, 403);
    }

    // ── Tier gate ────────────────────────────────────────────────────────────
    const feature = AI_FEATURES['environment_ai_insights'];
    const { tier, ownerId } = await getEffectiveTier(supabase, user.id);

    if (tier < feature.minTier) {
      return jsonResponse({
        error: 'tier_too_low',
        detail: `AI Environment Insights requires ${TIER_NAMES[feature.minTier]} plan or higher.`,
        requiredTier: feature.minTier,
        upgradeUrl: 'https://testably.app/pricing',
      }, 403);
    }

    // ── Cache hit check ──────────────────────────────────────────────────────
    const cache = (plan.ai_env_insights_cache as Record<string, any> | null) || null;
    const cachedLocale: SupportedLocale | undefined =
      cache?.meta?.locale === 'ko' ? 'ko'
      : cache?.meta?.locale === 'en' ? 'en'
      : undefined;
    const localeMismatch = cache !== null && cachedLocale !== locale;
    if (!force_refresh && cache && !isStale(cache.generated_at) && !localeMismatch) {
      const monthlyLimit = PLAN_LIMITS[tier] ?? -1;
      const usedNow = await getSharedPoolUsage(supabase, ownerId);
      return jsonResponse({
        headline: cache.headline ?? null,
        critical_env: cache.critical_env ?? null,
        critical_reason: cache.critical_reason ?? null,
        coverage_gap_tc: cache.coverage_gap_tc ?? null,
        coverage_gap_reason: cache.coverage_gap_reason ?? null,
        recommendations: Array.isArray(cache.recommendations) ? cache.recommendations : [],
        confidence: typeof cache.confidence === 'number' ? cache.confidence : 0,
        generated_at: cache.generated_at,
        meta: {
          from_cache: true,
          credits_used: 0,
          credits_remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedNow),
          monthly_limit: monthlyLimit,
          tokens_used: 0,
          latency_ms: Date.now() - startTime,
          locale,
          input_snapshot: cache.meta?.input_snapshot,
        },
      });
    }

    // ── Rate limit (5 req/min per user) ──────────────────────────────────────
    const rlResult = await checkRateLimit(supabase, user.id, 'env_ai_insights', {
      capacity: 5,
      refillRate: 1 / 12,
    });
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult, corsHeaders);
    }

    // ── Monthly credit pre-flight ────────────────────────────────────────────
    const monthlyLimit = PLAN_LIMITS[tier] ?? -1;
    const usedCredits = await getSharedPoolUsage(supabase, ownerId);
    if (monthlyLimit !== -1 && usedCredits + feature.creditCost > monthlyLimit) {
      return jsonResponse({
        error: 'monthly_limit_reached',
        detail: 'Monthly AI credit limit reached. Upgrade your plan for more credits.',
        used: usedCredits,
        limit: monthlyLimit,
        upgradeUrl: 'https://testably.app/pricing',
      }, 429);
    }

    // ── Gather env coverage context ──────────────────────────────────────────
    // 1) plan TCs
    const { data: planTcJoin } = await supabase
      .from('test_plan_test_cases')
      .select('test_case_id, test_case:test_cases(id, title, custom_id, priority)')
      .eq('test_plan_id', plan_id);
    const planTcs = ((planTcJoin as any[]) ?? []).map((ptc: any) => ptc.test_case)
      .filter((tc: any): tc is { id: string; title: string; custom_id: string | null; priority: string } => !!tc);

    // 2) plan runs (structured)
    const { data: runsData } = await supabase
      .from('test_runs')
      .select('id, environment_id, created_at')
      .eq('test_plan_id', plan_id);
    const runs = ((runsData as any[]) ?? []).filter((r: any) => !!r.environment_id);

    // 3) environments used by runs
    const envIds = [...new Set(runs.map((r: any) => r.environment_id as string))];
    let envs: Array<{ id: string; name: string; os_name: string | null; browser_name: string | null }> = [];
    if (envIds.length > 0) {
      const { data: envsData } = await supabase
        .from('environments')
        .select('id, name, os_name, browser_name')
        .in('id', envIds);
      envs = (envsData as any[]) ?? [];
    }

    // 4) test results for those runs
    const runIds = runs.map((r: any) => r.id as string);
    let results: Array<{ run_id: string; test_case_id: string; status: string; created_at: string }> = [];
    if (runIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status, created_at')
        .in('run_id', runIds);
      results = ((resultsData as any[]) ?? []) as any;
    }

    // Build env-by-env aggregate
    const runEnvById = new Map(runs.map((r: any) => [r.id as string, r.environment_id as string]));
    const envById = new Map(envs.map(e => [e.id, e]));
    const tcsById = new Map(planTcs.map(tc => [tc.id, tc]));

    type EnvAgg = {
      id: string;
      name: string;
      os_name: string | null;
      browser_name: string | null;
      passed: number;
      failed: number;
      blocked: number;
      retest: number;
      untested: number;
    };
    const envAggs: Map<string, EnvAgg> = new Map();
    for (const e of envs) {
      envAggs.set(e.id, {
        id: e.id,
        name: e.name,
        os_name: e.os_name,
        browser_name: e.browser_name,
        passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0,
      });
    }

    // per-tc-per-env status: only count test cases that belong to the plan (so
    // untested cells reflect plan scope, not run scope).
    type LatestKey = string; // `${envId}||${tcId}`
    const latestByEnvTc = new Map<LatestKey, string>(); // status
    for (const r of results) {
      const envId = runEnvById.get(r.run_id);
      if (!envId) continue;
      if (!tcsById.has(r.test_case_id)) continue;
      const key: LatestKey = `${envId}||${r.test_case_id}`;
      // keep latest (results already ordered? we sort by created_at desc)
      const existing = latestByEnvTc.get(key);
      if (!existing) latestByEnvTc.set(key, r.status);
      // we'll sort below properly
    }
    // Re-do with proper latest-per-key using created_at ordering
    latestByEnvTc.clear();
    const sortedResults = [...results].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    for (const r of sortedResults) {
      const envId = runEnvById.get(r.run_id);
      if (!envId) continue;
      if (!tcsById.has(r.test_case_id)) continue;
      const key = `${envId}||${r.test_case_id}`;
      if (!latestByEnvTc.has(key)) latestByEnvTc.set(key, r.status);
    }

    // For each env, bucket each plan TC
    for (const envAgg of envAggs.values()) {
      for (const tc of planTcs) {
        const key = `${envAgg.id}||${tc.id}`;
        const status = latestByEnvTc.get(key);
        if (!status || status === 'untested') envAgg.untested++;
        else if (status === 'passed') envAgg.passed++;
        else if (status === 'failed') envAgg.failed++;
        else if (status === 'blocked') envAgg.blocked++;
        else if (status === 'retest') envAgg.retest++;
        else envAgg.untested++;
      }
    }

    const totalTcs = planTcs.length;
    const totalEnvs = envAggs.size;
    let totalPassed = 0, totalFailed = 0, totalBlocked = 0, totalRetest = 0;
    for (const envAgg of envAggs.values()) {
      totalPassed += envAgg.passed;
      totalFailed += envAgg.failed;
      totalBlocked += envAgg.blocked;
      totalRetest += envAgg.retest;
    }
    const totalExecuted = totalPassed + totalFailed + totalBlocked + totalRetest;
    const overallPassRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;

    // ── Too little data short-circuit (AC-C10) ───────────────────────────────
    if (totalExecuted < 5 || totalEnvs === 0 || totalTcs === 0) {
      return jsonResponse({
        headline: null,
        critical_env: null,
        critical_reason: null,
        coverage_gap_tc: null,
        coverage_gap_reason: null,
        recommendations: [],
        confidence: 0,
        too_little_data: true,
        generated_at: isoNow(),
        meta: {
          from_cache: false,
          credits_used: 0,
          credits_remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits),
          monthly_limit: monthlyLimit,
          tokens_used: 0,
          latency_ms: Date.now() - startTime,
          too_little_data: true,
          locale,
          input_snapshot: {
            total_tcs: totalTcs,
            total_envs: totalEnvs,
            overall_pass_rate: overallPassRate,
            executed_count: totalExecuted,
          },
        },
      });
    }

    // Top untested TC (untested in most envs)
    const tcUntestedCount = new Map<string, number>();
    for (const tc of planTcs) {
      let count = 0;
      for (const envAgg of envAggs.values()) {
        const key = `${envAgg.id}||${tc.id}`;
        const status = latestByEnvTc.get(key);
        if (!status || status === 'untested') count++;
      }
      tcUntestedCount.set(tc.id, count);
    }
    const topUntestedTc = planTcs
      .slice()
      .sort((a, b) => (tcUntestedCount.get(b.id) ?? 0) - (tcUntestedCount.get(a.id) ?? 0))[0];
    const topUntestedCount = topUntestedTc ? (tcUntestedCount.get(topUntestedTc.id) ?? 0) : 0;

    // Critical/high priority untested count
    const critHighTcs = planTcs.filter(tc => tc.priority === 'critical' || tc.priority === 'high');
    let critHighUntested = 0;
    for (const tc of critHighTcs) {
      const count = tcUntestedCount.get(tc.id) ?? 0;
      if (count >= Math.ceil(totalEnvs / 2)) critHighUntested++;
    }

    // Last 7 days trend (executions per day)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const execPerDay = new Map<string, number>();
    for (const r of results) {
      if (!r.created_at) continue;
      if (r.status === 'untested') continue;
      const key = r.created_at.slice(0, 10);
      execPerDay.set(key, (execPerDay.get(key) ?? 0) + 1);
    }
    const trend7d: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000);
      trend7d.push(execPerDay.get(d.toISOString().slice(0, 10)) ?? 0);
    }

    // ── Claude API call ──────────────────────────────────────────────────────
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) {
      return jsonResponse({ error: 'internal', detail: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    const systemPromptBase = `You are an expert QA Environment Coverage analyst embedded in a test management platform.
Given an env×TC coverage snapshot, identify the single most-critical environment, the largest coverage gap (test case untested in most envs), and recommend 2-4 concrete actions.
Respond ONLY with valid JSON matching the specified schema. No markdown, no prose wrapper.
Cite specific env names, TC titles, and numbers. Avoid generic advice.`;
    const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

    const envBreakdownLines = [...envAggs.values()].map(envAgg => {
      const executed = envAgg.passed + envAgg.failed + envAgg.blocked + envAgg.retest;
      const rate = executed > 0 ? Math.round((envAgg.passed / executed) * 100) : 0;
      const envLabel = sanitizeShortName(envAgg.name);
      const osLabel = sanitizeShortName(envAgg.os_name ?? '—');
      const browserLabel = sanitizeShortName(envAgg.browser_name ?? '—');
      return `- ${envLabel} (${osLabel} / ${browserLabel}): ${envAgg.passed} passed, ${envAgg.failed} failed, ${envAgg.untested} untested → ${rate}% pass rate`;
    });

    const userPrompt = `Environment Coverage Analysis for Test Plan: "${sanitizeShortName(plan.name)}"

Scope:
- Total TCs in plan: ${totalTcs}
- Total environments: ${totalEnvs}
- Overall pass rate (of executed): ${overallPassRate}%
- Total executed results: ${totalExecuted} (Passed: ${totalPassed} | Failed: ${totalFailed} | Blocked: ${totalBlocked} | Retest: ${totalRetest})

Environment Breakdown:
${envBreakdownLines.length > 0 ? envBreakdownLines.join('\n') : '- (none)'}

Critical + High priority TCs untested in ≥ half of envs: ${critHighUntested}
${topUntestedTc ? `Top untested TC (by env count): "${sanitizeTitle(topUntestedTc.title)}"${topUntestedTc.custom_id ? ` [${topUntestedTc.custom_id}]` : ''} — untested in ${topUntestedCount}/${totalEnvs} envs (priority: ${topUntestedTc.priority ?? '—'})` : 'Top untested TC: (none)'}

Recent 7-day execution trend (results/day, oldest → newest): [${trend7d.join(', ')}]

Return this exact JSON structure (no markdown, no surrounding text):
{
  "headline": "<1 sentence, max 120 chars, cite env name + metric>",
  "critical_env": "<env or browser name or null>",
  "critical_reason": "<why this env is risky, cite pass rate and TC count, max 500 chars or null>",
  "coverage_gap_tc": "<TC title or null>",
  "coverage_gap_reason": "<why this TC needs attention, max 500 chars or null>",
  "recommendations": ["<action 1>", "<action 2>"],
  "confidence": <0-100 integer>
}

Rules:
- critical_env = env with lowest pass rate among envs with >= 3 executed TCs (or null if no env qualifies)
- coverage_gap_tc = TC untested in >= 50% of envs (or null)
- recommendations must be specific — cite env names, TC IDs, numbers. 2-4 items. Each actionable within 1-3 days.
- If total executed < 10, confidence <= 50`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);

    let claudeRes: Response;
    try {
      claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
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
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        return jsonResponse({
          error: 'ai_timeout',
          detail: 'AI analysis timed out. Try again.',
        }, 504);
      }
      return jsonResponse({ error: 'internal', detail: String(err) }, 500);
    }
    clearTimeout(timeoutId);

    if (!claudeRes.ok) {
      const errText = await claudeRes.text().catch(() => '');
      if (claudeRes.status === 429) {
        return jsonResponse({
          error: 'upstream_rate_limit',
          detail: 'Claude is rate-limited. Try again soon.',
          retry_after_sec: 60,
        }, 429);
      }
      return jsonResponse({
        error: 'internal',
        detail: `Claude API error: ${claudeRes.status} — ${errText.slice(0, 200)}`,
      }, 500);
    }

    const claudeData = await claudeRes.json();
    const rawContent = claudeData.content?.[0]?.text ?? '{}';
    const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);

    let result: EnvAiInsightsResult;
    try {
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) ||
                        rawContent.match(/```\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
      result = JSON.parse(jsonStr.trim());
    } catch {
      return jsonResponse({
        error: 'ai_parse_failed',
        detail: 'AI returned malformed JSON.',
        raw_snippet: rawContent.slice(0, 200),
      }, 422);
    }

    if (!result || typeof result !== 'object') {
      return jsonResponse({ error: 'ai_parse_failed', detail: 'Empty AI result' }, 422);
    }

    // ── Normalize + clamp (AC-C17) ───────────────────────────────────────────
    const normalized: EnvAiInsightsResult = {
      headline: clampStr(result.headline, 300),
      critical_env: clampStr(result.critical_env, 200),
      critical_reason: clampStr(result.critical_reason, 500),
      coverage_gap_tc: clampStr(result.coverage_gap_tc, 500),
      coverage_gap_reason: clampStr(result.coverage_gap_reason, 500),
      recommendations: Array.isArray(result.recommendations)
        ? result.recommendations.slice(0, 4).map((r) => String(r)).filter(r => r.trim().length > 0)
        : [],
      confidence: Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 0))),
    };

    const latencyMs = Date.now() - startTime;
    const generatedAt = isoNow();
    const staleAfter = isoAfter(24);

    // ── Write cache ──────────────────────────────────────────────────────────
    const cachePayload = {
      generated_at: generatedAt,
      stale_after: staleAfter,
      headline: normalized.headline,
      critical_env: normalized.critical_env,
      critical_reason: normalized.critical_reason,
      coverage_gap_tc: normalized.coverage_gap_tc,
      coverage_gap_reason: normalized.coverage_gap_reason,
      recommendations: normalized.recommendations,
      confidence: normalized.confidence,
      meta: {
        model: 'claude-haiku-4-5-20251001',
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
        locale,
        input_snapshot: {
          total_tcs: totalTcs,
          total_envs: totalEnvs,
          overall_pass_rate: overallPassRate,
          executed_count: totalExecuted,
        },
      },
    };

    await supabase
      .from('test_plans')
      .update({
        ai_env_insights_cache: cachePayload,
        ai_env_insights_cached_at: generatedAt,
      })
      .eq('id', plan_id);

    // ── f018 — Atomic credit consume ─────────────────────────────────────────
    try {
      const consume = await consumeAiCredit(supabase, {
        userId: user.id,
        ownerId,
        projectId,
        mode: 'env-ai-insights',
        step: 1,
        creditCost: feature.creditCost,
        limit: monthlyLimit,
        tokensUsed,
        latencyMs,
        inputData: {
          plan_id,
          total_tcs: totalTcs,
          total_envs: totalEnvs,
          overall_pass_rate: overallPassRate,
          executed_count: totalExecuted,
          locale,
        },
        outputData: normalized,
      });
      if (!consume.allowed) {
        console.warn('[f018] race-lost env-ai-insights owner=', ownerId, 'used=', consume.used);
        return jsonResponse({
          error: 'monthly_limit_reached',
          detail: 'Monthly AI credit limit reached. Upgrade your plan for more credits.',
          used: consume.used,
          limit: consume.limit,
          upgradeUrl: 'https://testably.app/pricing',
          // AI payload 보존
          headline: normalized.headline,
          critical_env: normalized.critical_env,
          critical_reason: normalized.critical_reason,
          coverage_gap_tc: normalized.coverage_gap_tc,
          coverage_gap_reason: normalized.coverage_gap_reason,
          recommendations: normalized.recommendations,
          confidence: normalized.confidence,
          generated_at: generatedAt,
          meta: {
            from_cache: false,
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
        headline: normalized.headline,
        critical_env: normalized.critical_env,
        critical_reason: normalized.critical_reason,
        coverage_gap_tc: normalized.coverage_gap_tc,
        coverage_gap_reason: normalized.coverage_gap_reason,
        recommendations: normalized.recommendations,
        confidence: normalized.confidence,
        generated_at: generatedAt,
        meta: {
          from_cache: false,
          credits_used: consume.creditCost,
          credits_remaining: consume.limit === -1 ? -1 : Math.max(0, consume.limit - consume.used),
          monthly_limit: consume.limit,
          tokens_used: tokensUsed,
          latency_ms: latencyMs,
          log_id: consume.logId,
          locale,
        },
      });
    } catch (err) {
      if (err instanceof ConsumeAiCreditError) {
        console.error('[f018] consume_ai_credit_and_log failed', { ownerId, mode: 'env-ai-insights', err: String(err.cause ?? err.message) });
        return jsonResponse({
          headline: normalized.headline,
          critical_env: normalized.critical_env,
          critical_reason: normalized.critical_reason,
          coverage_gap_tc: normalized.coverage_gap_tc,
          coverage_gap_reason: normalized.coverage_gap_reason,
          recommendations: normalized.recommendations,
          confidence: normalized.confidence,
          generated_at: generatedAt,
          meta: {
            from_cache: false,
            credits_used: 0,
            credits_logged: false,
            error: 'credit_log_failed',
            monthly_limit: monthlyLimit,
            tokens_used: tokensUsed,
            latency_ms: latencyMs,
            locale,
          },
        });
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('env-ai-insights error:', message);
    return jsonResponse({ error: 'internal', detail: message }, 500);
  }
});
