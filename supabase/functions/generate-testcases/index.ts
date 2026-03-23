import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 플랜별 월 사용 한도
const PLAN_LIMITS: Record<number, number> = {
  1: 5,    // Free
  2: 30,   // Starter
  3: 150,  // Professional
  4: -1,   // Enterprise (무제한)
};

// Session 모드는 Professional(3) 이상만 허용
const SESSION_MIN_TIER = 3;

interface GenerateRequest {
  project_id: string;
  mode: 'text' | 'session';
  step: 1 | 2;
  // Step 1 (Text mode)
  input_text?: string;
  // Step 1 (Session mode)
  session_id?: string;
  // Step 2: 선택된 제목 목록
  selected_titles?: string[];
}

/** 유효 구독 티어 반환 (만료된 트라이얼은 Free=1 처리) */
async function getEffectiveTier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, is_trial, trial_ends_at')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return 1;

  let tier = data.subscription_tier || 1;
  if (data.is_trial && data.trial_ends_at) {
    if (new Date() > new Date(data.trial_ends_at)) tier = 1;
  }
  return tier;
}

/** 당월 사용 횟수 조회 */
async function getMonthlyUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_generation_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('step', 1) // Step 1 호출만 카운팅
    .gte('created_at', startOfMonth.toISOString());

  return count || 0;
}

/** Anthropic 에러 타입 */
interface AnthropicError {
  status: number;
  type: string;
  message: string;
}

/** Anthropic Claude API 호출 */
async function callClaude(prompt: string): Promise<{ content: string; tokens: number }> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    const err: AnthropicError = { status: 500, type: 'config_error', message: 'ANTHROPIC_API_KEY is not configured in Edge Function secrets.' };
    throw err;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let errorBody: any = {};
    try { errorBody = await response.json(); } catch { errorBody = { error: { message: await response.text() } }; }

    const anthropicMessage = errorBody?.error?.message || 'Unknown Anthropic API error';
    const anthropicType = errorBody?.error?.type || 'api_error';

    const err: AnthropicError = {
      status: response.status,
      type: anthropicType,
      message: anthropicMessage,
    };
    throw err;
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  return { content, tokens };
}

/** Step 1: 제목 목록 생성 프롬프트 (Text 모드) */
function buildTitlePromptText(inputText: string): string {
  return `You are a QA engineer creating test cases. Based on the following feature description, generate a list of test case titles.

Feature description:
${inputText}

Requirements:
- Generate 5 to 10 test case titles
- Cover happy paths, edge cases, and error scenarios
- Each title should be concise (under 80 characters) and descriptive
- Output ONLY a JSON array of strings, no markdown, no explanation

Example output:
["User can log in with valid credentials", "Login fails with incorrect password", "Login fails with empty email field"]

Output:`;
}

/** Step 1: 제목 목록 생성 프롬프트 (Session 모드) */
function buildTitlePromptSession(sessionSummary: string): string {
  return `You are a QA engineer analyzing an exploratory test session. Based on the session logs below, generate test case titles that capture the tested behaviors and discovered issues.

Session logs:
${sessionSummary}

Requirements:
- Generate 5 to 10 test case titles based on what was actually tested
- Include cases for bugs found, happy paths exercised, and untested edge cases observed
- Each title should be concise (under 80 characters) and descriptive
- Output ONLY a JSON array of strings, no markdown, no explanation

Output:`;
}

/** Step 2: 상세 테스트 케이스 생성 프롬프트 */
function buildDetailPrompt(titles: string[]): string {
  const titlesJson = JSON.stringify(titles, null, 2);
  return `You are a QA engineer creating detailed test cases. For each title below, generate a complete test case.

Titles:
${titlesJson}

Requirements:
- For each title produce: title, description, precondition, steps (array of strings), expected_result, priority
- priority must be one of: "critical", "high", "medium", "low"
- steps should be clear, numbered action steps
- expected_result should be the overall expected outcome
- Output ONLY a valid JSON array, no markdown, no explanation

Example output format:
[
  {
    "title": "User can log in with valid credentials",
    "description": "Verify that a registered user can successfully log in.",
    "precondition": "User account exists with email test@example.com and password Test1234!",
    "steps": ["Navigate to /login", "Enter email test@example.com", "Enter password Test1234!", "Click Login button"],
    "expected_result": "User is redirected to the dashboard and sees their name in the header.",
    "priority": "critical"
  }
]

Output:`;
}

/** JSON 파싱 (마크다운 코드 블록 제거 후 파싱) */
function parseJsonSafely(text: string): any {
  const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // 인증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 유저 확인 (anon key + JWT)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Service role client (RLS bypass 필요 작업용)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateRequest = await req.json();
    const { project_id, mode, step, input_text, session_id, selected_titles } = body;

    if (!project_id || !mode || !step) {
      return new Response(
        JSON.stringify({ error: 'project_id, mode, step are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 구독 티어 확인
    const tier = await getEffectiveTier(adminClient, user.id);

    // Session 모드: Professional+ 필요
    if (mode === 'session' && tier < SESSION_MIN_TIER) {
      return new Response(
        JSON.stringify({
          error: 'Session mode requires Professional plan or higher.',
          current_tier: tier,
          required_tier: SESSION_MIN_TIER,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 월 사용 한도 확인 (Step 1에서만 카운팅)
    if (step === 1) {
      const limit = PLAN_LIMITS[tier] ?? 5;
      if (limit !== -1) {
        const usage = await getMonthlyUsage(adminClient, user.id);
        if (usage >= limit) {
          return new Response(
            JSON.stringify({
              error: 'Monthly AI generation limit reached.',
              usage,
              limit,
              current_tier: tier,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    }

    const startTime = Date.now();
    let prompt = '';
    let responseData: any = {};

    // ── Step 1: 제목 목록 생성 ────────────────────────────────
    if (step === 1) {
      if (mode === 'text') {
        if (!input_text?.trim()) {
          return new Response(
            JSON.stringify({ error: 'input_text is required for text mode' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        prompt = buildTitlePromptText(input_text);
      } else {
        // session mode
        if (!session_id) {
          return new Response(
            JSON.stringify({ error: 'session_id is required for session mode' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // 세션 + 로그 조회
        const { data: sessionData } = await adminClient
          .from('sessions')
          .select('name, mission')
          .eq('id', session_id)
          .eq('project_id', project_id)
          .maybeSingle();

        if (!sessionData) {
          return new Response(
            JSON.stringify({ error: 'Session not found in this project' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const { data: logs } = await adminClient
          .from('session_logs')
          .select('type, content, created_at')
          .eq('session_id', session_id)
          .order('created_at', { ascending: true });

        const logSummary = (logs || [])
          .map((l: any) => `[${l.type.toUpperCase()}] ${l.content}`)
          .join('\n');

        const sessionSummary = `Session: ${sessionData.name}\nMission: ${sessionData.mission || '(none)'}\n\nLogs:\n${logSummary || '(no logs)'}`;
        prompt = buildTitlePromptSession(sessionSummary);
      }

      const { content, tokens } = await callClaude(prompt);
      const latency = Date.now() - startTime;

      let titles: string[] = [];
      try {
        titles = parseJsonSafely(content);
        if (!Array.isArray(titles)) throw new Error('not an array');
      } catch {
        return new Response(
          JSON.stringify({ error: 'Failed to parse AI response', raw: content }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // 로그 저장
      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id,
        mode,
        step: 1,
        input_text: mode === 'text' ? input_text : null,
        session_id: mode === 'session' ? session_id : null,
        titles_generated: titles.length,
        model_used: 'claude-sonnet-4-20250514',
        tokens_used: tokens,
        latency_ms: latency,
      });

      responseData = { titles, tokens_used: tokens, latency_ms: latency };

    // ── Step 2: 상세 케이스 생성 ──────────────────────────────
    } else {
      if (!selected_titles?.length) {
        return new Response(
          JSON.stringify({ error: 'selected_titles is required for step 2' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      prompt = buildDetailPrompt(selected_titles);
      const { content, tokens } = await callClaude(prompt);
      const latency = Date.now() - startTime;

      let cases: any[] = [];
      try {
        cases = parseJsonSafely(content);
        if (!Array.isArray(cases)) throw new Error('not an array');
      } catch {
        return new Response(
          JSON.stringify({ error: 'Failed to parse AI response', raw: content }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // 로그 저장
      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id,
        mode,
        step: 2,
        titles_selected: selected_titles.length,
        model_used: 'claude-sonnet-4-20250514',
        tokens_used: tokens,
        latency_ms: latency,
      });

      responseData = { cases, tokens_used: tokens, latency_ms: latency };
    }

    return new Response(
      JSON.stringify({ success: true, ...responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('generate-testcases error:', error);

    // Anthropic API 에러는 구체적인 메시지와 상태코드를 그대로 반환
    if (error?.type && error?.message && error?.status) {
      const httpStatus = error.status === 400 ? 402 : error.status >= 500 ? 502 : error.status;
      return new Response(
        JSON.stringify({
          error: 'AI API error',
          type: error.type,
          message: error.message,
        }),
        { status: httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
