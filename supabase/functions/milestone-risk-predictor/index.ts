import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  AI_FEATURES,
  PLAN_LIMITS,
  TIER_NAMES,
} from '../_shared/ai-config.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MilestoneRiskRequest {
  milestone_id: string;
  force_refresh?: boolean;
}

interface MilestoneRiskResult {
  risk_level: 'on_track' | 'at_risk' | 'critical';
  confidence: number;
  summary: string;
  bullets: string[];
  recommendations: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getEffectiveTier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ tier: number; ownerId: string }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  let ownTier = profile?.subscription_tier || 1;
  if (profile?.is_trial && profile?.trial_ends_at) {
    if (new Date() > new Date(profile.trial_ends_at)) ownTier = 1;
  }
  if (ownTier > 1) return { tier: ownTier, ownerId: userId };

  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  if (!memberships?.length) return { tier: ownTier, ownerId: userId };

  const projectIds = memberships.map((m: any) => m.project_id);
  const { data: owners } = await supabase
    .from('project_members')
    .select('user_id, role')
    .in('project_id', projectIds)
    .eq('role', 'owner');

  if (!owners?.length) return { tier: ownTier, ownerId: userId };

  const ownerIds = [...new Set(owners.map((o: any) => o.user_id))];
  const { data: ownerProfiles } = await supabase
    .from('profiles')
    .select('id, subscription_tier, is_trial, trial_ends_at')
    .in('id', ownerIds);

  let bestTier = ownTier;
  let bestOwner = userId;
  for (const p of ownerProfiles || []) {
    let t = p.subscription_tier || 1;
    if (p.is_trial && p.trial_ends_at && new Date() > new Date(p.trial_ends_at)) t = 1;
    if (t > bestTier) { bestTier = t; bestOwner = p.id; }
  }
  return { tier: bestTier, ownerId: bestOwner };
}

async function getMonthlyUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: logs } = await supabase
    .from('ai_generation_logs')
    .select('credits_used')
    .eq('user_id', userId)
    .eq('step', 1)
    .gte('created_at', startOfMonth.toISOString());

  return (logs || []).reduce((acc: number, row: any) => acc + (row.credits_used ?? 1), 0);
}

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized', detail: 'Missing authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
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
    const body: MilestoneRiskRequest = await req.json().catch(() => ({} as MilestoneRiskRequest));
    const { milestone_id, force_refresh } = body;

    if (!milestone_id) {
      return jsonResponse({ error: 'bad_request', detail: 'milestone_id is required' }, 400);
    }

    // ── Fetch milestone (to verify existence and ownership through RLS bypass) ──
    const { data: milestone, error: msError } = await supabase
      .from('milestones')
      .select('id, project_id, name, status, start_date, end_date, ai_risk_cache')
      .eq('id', milestone_id)
      .maybeSingle();

    if (msError || !milestone) {
      return jsonResponse({ error: 'not_found', detail: 'Milestone not found' }, 404);
    }

    const projectId = milestone.project_id;

    // ── Membership check (Tester+ 이상 조회 가능. Manager+ 이상 analyze 가능) ──
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
      // Viewer/Tester/Guest는 이 Edge Function 호출 자체를 허용하지 않음 (프론트에서 버튼 숨김, 서버에서도 차단)
      return jsonResponse({
        error: 'forbidden',
        detail: 'Only Manager or above can trigger AI analysis.',
      }, 403);
    }

    // ── Tier & Credit check ──────────────────────────────────────────────────
    const feature = AI_FEATURES['milestone_risk'];
    const { tier } = await getEffectiveTier(supabase, user.id);

    if (tier < feature.minTier) {
      return jsonResponse({
        error: 'tier_too_low',
        detail: `AI Milestone Risk requires ${TIER_NAMES[feature.minTier]} plan or higher.`,
        requiredTier: feature.minTier,
        upgradeUrl: 'https://testably.app/pricing',
      }, 403);
    }

    // ── Cache hit check ──────────────────────────────────────────────────────
    const cache = (milestone.ai_risk_cache as Record<string, any> | null) || null;
    if (!force_refresh && cache && !isStale(cache.generated_at)) {
      return jsonResponse({
        risk_level: cache.risk_level,
        confidence: cache.confidence,
        summary: cache.summary,
        bullets: cache.bullets || [],
        recommendations: cache.recommendations || [],
        generated_at: cache.generated_at,
        meta: {
          from_cache: true,
          credits_used: 0,
          credits_remaining: PLAN_LIMITS[tier] === -1
            ? -1
            : Math.max(0, (PLAN_LIMITS[tier] ?? 0) - (await getMonthlyUsage(supabase, user.id))),
          monthly_limit: PLAN_LIMITS[tier] ?? -1,
          tokens_used: 0,
          latency_ms: Date.now() - startTime,
        },
      });
    }

    // ── Rate limit (5 req/min per user, burst 5) ─────────────────────────────
    // Applied AFTER cache hit check so that fresh-cache responses don't consume a token.
    // Applied BEFORE monthly credit check to block runaway Claude API loops before any cost is counted.
    const rlResult = await checkRateLimit(supabase, user.id, 'milestone_risk', {
      capacity: 5,
      refillRate: 1 / 12, // 1 token every 12s ≈ 5 tokens/min steady-state
    });
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult, corsHeaders);
    }

    // ── Monthly credit check (AC-11) ─────────────────────────────────────────
    const monthlyLimit = PLAN_LIMITS[tier] ?? -1;
    const usedCredits = await getMonthlyUsage(supabase, user.id);
    if (monthlyLimit !== -1 && usedCredits + feature.creditCost > monthlyLimit) {
      return jsonResponse({
        error: 'monthly_limit_reached',
        detail: 'Monthly AI credit limit reached. Upgrade your plan for more credits.',
        used: usedCredits,
        limit: monthlyLimit,
        upgradeUrl: 'https://testably.app/pricing',
      }, 429);
    }

    // ── Gather milestone context ─────────────────────────────────────────────

    // Runs under this milestone
    const { data: runs } = await supabase
      .from('test_runs')
      .select('id, name, test_case_ids, status, created_at')
      .eq('milestone_id', milestone_id);

    const runIds = (runs || []).map((r: any) => r.id);
    const allTcIdsSet = new Set<string>();
    (runs || []).forEach((r: any) => {
      (r.test_case_ids || []).forEach((id: string) => allTcIdsSet.add(id));
    });
    const allTcIds = Array.from(allTcIdsSet);

    // Early return if no TCs (BR-3)
    if (allTcIds.length === 0) {
      return jsonResponse({
        risk_level: 'on_track',
        confidence: 0,
        summary: 'No test cases yet. Add TCs to enable risk analysis.',
        bullets: [],
        recommendations: ['Add test cases to this milestone.'],
        generated_at: isoNow(),
        meta: {
          from_cache: false,
          credits_used: 0,
          credits_remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits),
          monthly_limit: monthlyLimit,
          tokens_used: 0,
          latency_ms: Date.now() - startTime,
          no_tcs: true,
        },
      });
    }

    // Test results across all runs
    let resultsData: any[] = [];
    if (runIds.length > 0) {
      const { data } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at, run_id, author')
        .in('run_id', runIds)
        .order('created_at', { ascending: false });
      resultsData = data || [];
    }

    // Latest status per TC
    const latestPerTc = new Map<string, { status: string; created_at: string; run_id: string; author: string }>();
    for (const r of resultsData) {
      if (r.test_case_id && !latestPerTc.has(r.test_case_id)) {
        latestPerTc.set(r.test_case_id, { status: r.status, created_at: r.created_at, run_id: r.run_id, author: r.author });
      }
    }

    // Stats
    let passed = 0, failed = 0, blocked = 0, retest = 0, untested = 0;
    for (const tcId of allTcIds) {
      const r = latestPerTc.get(tcId);
      if (!r || r.status === 'untested') untested++;
      else if (r.status === 'passed') passed++;
      else if (r.status === 'failed') failed++;
      else if (r.status === 'blocked') blocked++;
      else if (r.status === 'retest') retest++;
    }
    const totalTcs = allTcIds.length;
    const executed = passed + failed + blocked + retest;
    const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

    // Days
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startDate = milestone.start_date ? new Date(milestone.start_date.split('T')[0]) : null;
    const endDate = milestone.end_date ? new Date(milestone.end_date.split('T')[0]) : null;
    const daysLeft = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / 86400_000) : null;
    const daysElapsed = startDate ? Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / 86400_000)) : 0;

    // Velocity last 7 days
    const executedPerDay = new Map<string, number>();
    resultsData.forEach((r: any) => {
      if (!r.created_at) return;
      if (r.status === 'untested') return;
      const key = r.created_at.slice(0, 10);
      executedPerDay.set(key, (executedPerDay.get(key) || 0) + 1);
    });
    const velocity7d: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000);
      velocity7d.push(executedPerDay.get(d.toISOString().slice(0, 10)) || 0);
    }
    const avgVelocity = velocity7d.reduce((a, b) => a + b, 0) / 7;
    const requiredVelocity = daysLeft != null && daysLeft > 0 ? Math.ceil(untested / Math.max(1, daysLeft)) : null;

    // Top-fail tags
    const failedTcIds = Array.from(latestPerTc.entries())
      .filter(([, r]) => r.status === 'failed')
      .map(([tcId]) => tcId);
    let topFailTags: Array<{ name: string; count: number }> = [];
    let failedTcTitles: Map<string, string> = new Map();
    if (failedTcIds.length > 0) {
      const { data: tcs } = await supabase
        .from('test_cases')
        .select('id, title, tags, priority, custom_id')
        .in('id', failedTcIds);
      const tagCount: Record<string, number> = {};
      (tcs || []).forEach((tc: any) => {
        const tags: string[] = typeof tc.tags === 'string'
          ? tc.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(tc.tags) ? tc.tags.filter(Boolean) : [];
        tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
        failedTcTitles.set(tc.id, `${tc.custom_id || tc.id.slice(0, 8)}: ${tc.title}`);
      });
      topFailTags = Object.entries(tagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    }

    // Failed + Blocked TCs (top 10 by recency)
    const failedBlockedEntries = Array.from(latestPerTc.entries())
      .filter(([, r]) => r.status === 'failed' || r.status === 'blocked')
      .sort(([, a], [, b]) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10);

    // Also get titles for blocked TCs
    const blockedOnlyIds = failedBlockedEntries
      .filter(([tcId, r]) => r.status === 'blocked' && !failedTcTitles.has(tcId))
      .map(([tcId]) => tcId);
    if (blockedOnlyIds.length > 0) {
      const { data: blockedTcs } = await supabase
        .from('test_cases')
        .select('id, title, custom_id')
        .in('id', blockedOnlyIds);
      (blockedTcs || []).forEach((tc: any) => {
        failedTcTitles.set(tc.id, `${tc.custom_id || tc.id.slice(0, 8)}: ${tc.title}`);
      });
    }

    const runNameById = new Map<string, string>();
    (runs || []).forEach((r: any) => runNameById.set(r.id, r.name));

    const failedBlockedLines = failedBlockedEntries.map(([tcId, r]) => {
      const label = failedTcTitles.get(tcId) || tcId.slice(0, 8);
      const runName = runNameById.get(r.run_id) || '—';
      return `[${r.status}] ${label} (Run: ${runName})`;
    });

    // Sub-milestones
    const { data: subMilestones } = await supabase
      .from('milestones')
      .select('id, name, status, end_date')
      .eq('parent_milestone_id', milestone_id);
    const subMsLines = (subMilestones || []).map((s: any) => `- ${s.name} (status: ${s.status})`);

    // Recent 7d activity count (from results)
    const cutoff7d = Date.now() - 7 * 86400_000;
    const recent7dCount = resultsData.filter((r: any) => Date.parse(r.created_at) >= cutoff7d).length;

    // ── Claude API call ──────────────────────────────────────────────────────
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) {
      return jsonResponse({ error: 'internal', detail: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    const systemPrompt = `You are an expert QA risk analyst embedded in a test management platform.
Given a milestone's execution data, analyze risks and recommend actions.
Respond ONLY with valid JSON matching the specified schema. No markdown, no prose wrapper.
Be data-driven, cite specific TC IDs and tags. Avoid generic advice.`;

    const userPrompt = `Milestone: "${milestone.name}"
Status: ${milestone.status} | Priority: N/A (milestone-level)
Start: ${milestone.start_date || 'Not set'} | End: ${milestone.end_date || 'Not set'} | D-day: ${daysLeft ?? '—'}

Execution Summary:
- Total TCs: ${totalTcs}
- Passed: ${passed} | Failed: ${failed} | Blocked: ${blocked} | Retest: ${retest} | Untested: ${untested}
- Pass Rate (of executed): ${passRate}%
- Velocity (last 7 days, TCs/day): [${velocity7d.join(', ')}] — avg ${avgVelocity.toFixed(1)}/day
- Required velocity to hit deadline: ${requiredVelocity != null ? `${requiredVelocity}/day` : '—'}
- Days elapsed since start: ${daysElapsed}

Top-Fail Tags (count of failed TCs):
${topFailTags.length > 0 ? topFailTags.map(t => `- #${t.name} (${t.count})`).join('\n') : '- (none)'}

Failed / Blocked TCs (top ${failedBlockedLines.length} by recency):
${failedBlockedLines.length > 0 ? failedBlockedLines.join('\n') : '- (none)'}

Sub-Milestones (${(subMilestones || []).length} total):
${subMsLines.length > 0 ? subMsLines.join('\n') : '- (none)'}

Recent Activity (last 7 days):
- ${recent7dCount} result events

Return this exact JSON structure (no markdown, no surrounding text):
{
  "risk_level": "on_track" | "at_risk" | "critical",
  "confidence": <0-100 integer>,
  "summary": "<1 sentence, max 140 chars>",
  "bullets": ["<observation 1>", "<observation 2>", "<observation 3>"],
  "recommendations": ["<action 1>", "<action 2>"]
}

Rules:
- risk_level = "critical" if days_left <= 3 AND pass_rate < 50
- risk_level = "at_risk" if days_left <= 7 AND pass_rate < 70
- risk_level = "on_track" otherwise
- confidence < 50 if untested > 50% of total
- Bullets must reference specific numbers, tags, or TC IDs — no generic statements
- Recommendations must be actionable within 1-3 days and cite priority when relevant
- bullets: 3-5 items, recommendations: 2-4 items`;

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

    let result: MilestoneRiskResult;
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

    // ── Validate + clamp result (BR-5) ───────────────────────────────────────
    if (!result || typeof result !== 'object') {
      return jsonResponse({ error: 'ai_parse_failed', detail: 'Empty AI result' }, 422);
    }
    if (!['on_track', 'at_risk', 'critical'].includes(result.risk_level)) {
      result.risk_level = 'at_risk';
    }
    result.confidence = Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 0)));
    result.summary = String(result.summary || '').slice(0, 300);
    if (result.summary.length >= 300) result.summary += '…';
    result.bullets = Array.isArray(result.bullets) ? result.bullets.slice(0, 5).map(String) : [];
    result.recommendations = Array.isArray(result.recommendations)
      ? result.recommendations.slice(0, 4).map(String)
      : [];

    // Quality guard: empty bullets → 422
    if (result.bullets.length === 0) {
      return jsonResponse({
        error: 'ai_parse_failed',
        detail: 'AI returned empty observations.',
      }, 422);
    }

    const latencyMs = Date.now() - startTime;
    const generatedAt = isoNow();
    const staleAfter = isoAfter(24);

    // ── Write cache ──────────────────────────────────────────────────────────
    const cachePayload = {
      generated_at: generatedAt,
      stale_after: staleAfter,
      risk_level: result.risk_level,
      confidence: result.confidence,
      summary: result.summary,
      bullets: result.bullets,
      recommendations: result.recommendations,
      meta: {
        model: 'claude-haiku-4-5-20251001',
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
        input_snapshot: {
          total_tcs: totalTcs,
          pass_rate: passRate,
          days_left: daysLeft,
        },
      },
    };

    await supabase
      .from('milestones')
      .update({ ai_risk_cache: cachePayload })
      .eq('id', milestone_id);

    // ── Log credit usage ─────────────────────────────────────────────────────
    await supabase.from('ai_generation_logs').insert({
      user_id: user.id,
      project_id: projectId,
      mode: 'milestone-risk',
      step: 1,
      credits_used: feature.creditCost,
      input_data: {
        milestone_id,
        total_tcs: totalTcs,
        passed,
        failed,
        blocked,
        retest,
        untested,
        pass_rate: passRate,
        days_left: daysLeft,
      },
      output_data: result,
      tokens_used: tokensUsed,
      latency_ms: latencyMs,
    });

    return jsonResponse({
      risk_level: result.risk_level,
      confidence: result.confidence,
      summary: result.summary,
      bullets: result.bullets,
      recommendations: result.recommendations,
      generated_at: generatedAt,
      meta: {
        from_cache: false,
        credits_used: feature.creditCost,
        credits_remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits - feature.creditCost),
        monthly_limit: monthlyLimit,
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('milestone-risk-predictor error:', message);
    return jsonResponse({ error: 'internal', detail: message }, 500);
  }
});
