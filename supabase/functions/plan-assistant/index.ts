import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  AI_FEATURES,
  PLAN_LIMITS,
  TIER_NAMES,
} from '../_shared/ai-config.ts';
import {
  getEffectiveTier,
  getSharedPoolUsage,
} from '../_shared/ai-usage.ts';
import {
  sanitizeShortName,
  sanitizeTitle,
  sanitizeLong,
  sanitizeTag,
  sanitizeArrayForPrompt,
} from '../_shared/promptSanitize.ts';
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

interface PlanAssistantRequest {
  project_id: string;
  affected_areas?: string[];        // 태그/영역 (e.g. ['login', 'payment'])
  target_milestone_id?: string;     // 연결할 Milestone (optional)
  test_plan_id?: string;            // 기존 Plan 업데이트용 (optional)
  context?: string;                 // 추가 컨텍스트 (자유 텍스트)
  /** f021 — 'ko' | 'en' (그 외 값은 'en' 으로 fallback) */
  locale?: unknown;
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
    // ES256 전환 이후 Authorization 에는 HS256 anon key 만, 유저 JWT 는 x-user-token 커스텀 헤더로 옴.
    // 구 패턴 (Authorization Bearer 에 유저 JWT) 도 fallback 으로 수용.
    const userTokenHeader = req.headers.get('x-user-token');
    const authHeader = req.headers.get('Authorization');
    const token = userTokenHeader
      || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    const locale: SupportedLocale = resolveLocale(body.locale);

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
    const usedCredits = await getSharedPoolUsage(supabase, ownerId);
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
        milestoneInfo = `Target Milestone: "${sanitizeShortName(ms.name)}" (due: ${ms.end_date || 'TBD'}, status: ${ms.status})`;
      }
    }

    // ── Claude API 호출 ────────────────────────────────────────────────────────
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // test_cases.tags 는 DB 에 쉼표 구분 text 로 저장됨 (20260404_folders_tags.sql).
    // array 아니므로 split 후 sanitize.
    const parseTags = (raw: unknown): string[] => {
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const tcList = relevantTcs
      .slice(0, 80)
      .map((tc: any) => {
        const safeTitle = sanitizeTitle(tc.title);
        const safeFolder = tc.folder ? ` [${sanitizeTag(tc.folder)}]` : '';
        const tagsArr = parseTags(tc.tags);
        const safeTags = tagsArr.length
          ? ` #${sanitizeArrayForPrompt(tagsArr, { maxLength: 40 }).join(' #')}`
          : '';
        return `[${tc.id}] (${tc.priority}) ${safeTitle}${safeFolder}${safeTags}`;
      })
      .join('\n');

    const systemPromptBase = `You are an expert QA architect helping teams plan efficient test campaigns.
Given a list of test cases, affected areas, and optional milestone context, recommend which test cases to include in a test plan and estimate the effort.
Respond ONLY with valid JSON matching the specified schema. Be concise but precise.`;
    // f021: KO 일 때만 suffix append. EN 은 원본 그대로 (BR-4).
    const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

    const userPrompt = `Project test cases (up to 80 shown):
${tcList || '(no test cases found)'}

${milestoneInfo}
Affected areas / changed components: ${affected_areas.length > 0 ? sanitizeArrayForPrompt(affected_areas as unknown[], { maxLength: 40 }).join(', ') : 'general regression'}
${context ? `\nAdditional context: ${sanitizeLong(context)}` : ''}

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
        max_tokens: 4096,
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
      // JSON 블록 추출: 우선순위
      //   1. ```json ... ``` 펜스 내부
      //   2. ``` ... ``` 일반 펜스 내부
      //   3. 응답 전체에서 첫 '{' 부터 마지막 '}' 까지 (preamble/epilogue 텍스트 제거)
      const fenced = rawContent.match(/```json\s*([\s\S]*?)```/) ||
                     rawContent.match(/```\s*([\s\S]*?)```/);
      let jsonStr = fenced ? fenced[1] : rawContent;
      if (!fenced) {
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
        }
      }
      result = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error('plan-assistant JSON parse failure', {
        err: String(parseErr),
        rawPreview: rawContent.slice(0, 500),
      });
      throw new Error('Failed to parse Claude response as JSON');
    }

    // ── credit 소비 로그 기록 ─────────────────────────────────────────────────
    // ai_generation_logs 컬럼: input_data (JSONB). `metadata` 컬럼 없음 — 과거 오타로 silent fail.
    const { error: logErr } = await supabase.from('ai_generation_logs').insert({
      user_id: user.id,
      project_id,
      mode: 'plan-assistant',
      step: 1,
      credits_used: feature.creditCost,
      input_data: {
        affected_areas,
        target_milestone_id: target_milestone_id || null,
        tc_count: relevantTcs.length,
        suggested_count: result.suggested_test_cases?.length || 0,
        locale, // f021 BR-6
      },
    });
    if (logErr) {
      // 로그 실패는 사용자 응답을 블록하지 않되 서버 로그에 반드시 노출.
      console.error('plan-assistant ai_generation_logs insert failed:', logErr);
    }

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
