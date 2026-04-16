import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  AI_FEATURES,
  PLAN_LIMITS,
  TIER_NAMES,
} from '../_shared/ai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PlanAssistantRequest {
  project_id: string;
  affected_areas?: string[];        // 태그/영역 (e.g. ['login', 'payment'])
  target_milestone_id?: string;     // 연결할 Milestone (optional)
  test_plan_id?: string;            // 기존 Plan 업데이트용 (optional)
  context?: string;                 // 추가 컨텍스트 (자유 텍스트)
}

interface SuggestedTC {
  id: string;
  title: string;
  folder?: string;
  priority: string;
  tags?: string[];
  rationale: string;
}

interface PlanAssistantResponse {
  suggested_test_cases: SuggestedTC[];
  estimated_effort_hours: number;
  summary: string;
  coverage_areas: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

/** 유효 구독 티어 반환 */
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

  // 소속 프로젝트 owner tier 조회
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

/** 당월 credit 사용량 조회 */
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Service role client for DB operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── 인증: JWT payload 직접 디코딩 후 admin API로 사용자 확인
    // (supabase.auth.getUser(token)은 ES256 알고리즘을 지원하지 않아 401 반환)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // JWT payload 디코딩 (서명 검증 없이 sub 추출)
    let userId: string;
    try {
      const [, payloadB64] = token.split('.');
      const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const json = new TextDecoder().decode(
        Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
      );
      const payload = JSON.parse(json);
      // exp 체크 — 만료된 토큰 거부
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }
      userId = payload.sub;
      if (!userId) throw new Error('No sub in token');
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token', detail: String(e) }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // admin API로 해당 userId가 실제로 존재하는 사용자인지 확인
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 요청 파싱 ─────────────────────────────────────────────────────────────
    const body: PlanAssistantRequest = await req.json();
    const { project_id, affected_areas = [], target_milestone_id, context = '' } = body;

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Tier & Credit 체크 ────────────────────────────────────────────────────
    const feature = AI_FEATURES['plan_assistant'];
    const { tier, ownerId } = await getEffectiveTier(supabase, user.id);

    if (tier < feature.minTier) {
      return new Response(JSON.stringify({
        error: `AI Plan Assistant requires ${TIER_NAMES[feature.minTier]} plan or higher.`,
        requiredTier: feature.minTier,
        upgradeUrl: 'https://testably.app/pricing',
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const monthlyLimit = PLAN_LIMITS[tier] ?? -1;
    const usedCredits = await getMonthlyUsage(supabase, user.id);
    if (monthlyLimit !== -1 && usedCredits + feature.creditCost > monthlyLimit) {
      return new Response(JSON.stringify({
        error: 'Monthly AI credit limit reached. Upgrade your plan for more credits.',
        used: usedCredits,
        limit: monthlyLimit,
        upgradeUrl: 'https://testably.app/pricing',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 프로젝트 TC 목록 조회 ──────────────────────────────────────────────────
    let tcQuery = supabase
      .from('test_cases')
      .select('id, title, folder, priority, tags, lifecycle_status')
      .eq('project_id', project_id)
      .neq('lifecycle_status', 'deprecated')
      .order('created_at', { ascending: false })
      .limit(200);

    // 특정 태그가 있으면 필터
    if (affected_areas.length > 0) {
      tcQuery = tcQuery.overlaps('tags', affected_areas);
    }

    const { data: testCases } = await tcQuery;

    // 관련 TC가 없으면 전체 TC에서 최대 50개 샘플링
    let relevantTcs = testCases || [];
    if (relevantTcs.length === 0 && affected_areas.length > 0) {
      const { data: allTcs } = await supabase
        .from('test_cases')
        .select('id, title, folder, priority, tags, lifecycle_status')
        .eq('project_id', project_id)
        .neq('lifecycle_status', 'deprecated')
        .limit(50);
      relevantTcs = allTcs || [];
    }

    // ── Milestone 정보 조회 (있으면) ──────────────────────────────────────────
    let milestoneInfo = '';
    if (target_milestone_id) {
      const { data: ms } = await supabase
        .from('milestones')
        .select('name, end_date, status')
        .eq('id', target_milestone_id)
        .maybeSingle();
      if (ms) {
        milestoneInfo = `Target Milestone: "${ms.name}" (due: ${ms.end_date || 'TBD'}, status: ${ms.status})`;
      }
    }

    // ── Claude API 호출 ────────────────────────────────────────────────────────
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const tcList = relevantTcs
      .slice(0, 80)
      .map((tc: any) => `[${tc.id}] (${tc.priority}) ${tc.title}${tc.folder ? ` [${tc.folder}]` : ''}${tc.tags?.length ? ` #${tc.tags.join(' #')}` : ''}`)
      .join('\n');

    const systemPrompt = `You are an expert QA architect helping teams plan efficient test campaigns.
Given a list of test cases, affected areas, and optional milestone context, recommend which test cases to include in a test plan and estimate the effort.
Respond ONLY with valid JSON matching the specified schema. Be concise but precise.`;

    const userPrompt = `Project test cases (up to 80 shown):
${tcList || '(no test cases found)'}

${milestoneInfo}
Affected areas / changed components: ${affected_areas.length > 0 ? affected_areas.join(', ') : 'general regression'}
${context ? `\nAdditional context: ${context}` : ''}

Return a JSON object with this exact structure:
{
  "suggested_test_cases": [
    {
      "id": "<test_case_id from list above>",
      "title": "<title>",
      "folder": "<folder or null>",
      "priority": "<critical|high|medium|low>",
      "tags": ["<tag>"],
      "rationale": "<1-sentence reason why this TC is relevant>"
    }
  ],
  "estimated_effort_hours": <number>,
  "summary": "<2-3 sentence plan summary>",
  "coverage_areas": ["<area1>", "<area2>"],
  "risk_level": "<low|medium|high|critical>"
}

Rules:
- Include 5-20 most relevant test cases
- Prioritize critical/high priority TCs for affected areas
- estimated_effort_hours: assume 15min per TC on average
- Be specific in rationale (mention what changed or why it matters)`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
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

    let result: PlanAssistantResponse;
    try {
      // JSON 블록 추출 (```json ... ``` 감싸인 경우 처리)
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) ||
                        rawContent.match(/```\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
      result = JSON.parse(jsonStr.trim());
    } catch {
      throw new Error('Failed to parse Claude response as JSON');
    }

    // ── credit 소비 로그 기록 ─────────────────────────────────────────────────
    await supabase.from('ai_generation_logs').insert({
      user_id: user.id,
      project_id,
      mode: 'plan-assistant',
      step: 1,
      credits_used: feature.creditCost,
      metadata: {
        affected_areas,
        target_milestone_id: target_milestone_id || null,
        tc_count: relevantTcs.length,
        suggested_count: result.suggested_test_cases?.length || 0,
      },
    });

    return new Response(JSON.stringify({
      ...result,
      meta: {
        credits_used: feature.creditCost,
        credits_remaining: monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - usedCredits - feature.creditCost),
        monthly_limit: monthlyLimit,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('plan-assistant error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
