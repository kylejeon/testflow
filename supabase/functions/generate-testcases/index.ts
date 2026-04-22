import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, rateLimitResponse, RATE_CONFIGS } from '../_shared/rate-limit.ts';
import {
  AI_FEATURES,
  PLAN_LIMITS,
} from '../_shared/ai-config.ts';
import {
  getEffectiveTier,
  getOwnerTeamUserIds,
  getSharedPoolUsage,
  checkAiAccess,
} from '../_shared/ai-usage.ts';
import {
  sanitizeShortName,
  sanitizeTitle,
  sanitizeLong,
  sanitizeTag,
} from '../_shared/promptSanitize.ts';
import {
  resolveLocale,
  maybeAppendLocaleInstruction,
  localeInstructionFor,
  type SupportedLocale,
} from '../_shared/localePrompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// PLAN_LIMITS는 _shared/ai-config.ts에서 import
const SESSION_MIN_TIER = 4;  // Professional+
const JIRA_MIN_TIER = 2;     // Hobby+

interface GenerateRequest {
  project_id?: string;
  mode?: 'text' | 'jira' | 'session';
  step?: 1 | 2;
  action?: 'preview' | 'summarize-run' | 'coverage-gap' | 'analyze-flaky' | 'suggest-from-requirement';
  input_text?: string;
  session_id?: string;
  jira_issue_keys?: string[];
  selected_titles?: string[];
  run_id?: string;
  // coverage-gap
  test_cases?: { folder: string; title: string; priority: string }[];
  // analyze-flaky
  flaky_tests?: { test_case_id: string; title: string; folder_path: string; recent_statuses: string[]; flaky_score: number }[];
  // suggest-from-requirement
  requirement_id?: string;
  requirement_title?: string;
  requirement_description?: string;
  existing_tcs?: { custom_id: string; title: string }[];
  milestone_id?: string;
  force_reanalyze?: boolean;
  /** f021 — 'ko' | 'en' (그 외 값은 'en' 으로 fallback) */
  locale?: unknown;
}

interface JiraIssueData {
  key: string;
  summary: string;
  description?: string;
  priority?: string;
  acceptanceCriteria?: string;
}

interface JiraFetchError {
  key: string;
  reason: string;
}

/** Atlassian Document Format → plain text */
function adfToText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'mention') return node.attrs?.text || '';
  if (Array.isArray(node.content)) {
    const parts = node.content.map(adfToText).join('');
    // Add line breaks after block nodes
    const blockNodes = new Set(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock']);
    if (blockNodes.has(node.type)) return parts + '\n';
    return parts;
  }
  return '';
}

/** Jira issue 단건 fetch */
async function fetchJiraIssue(
  domain: string,
  email: string,
  apiToken: string,
  issueKey: string,
): Promise<JiraIssueData> {
  const cleanDomain = domain
    .replace(/^https?:?\/?\/?\/?/i, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/');
  const basicAuth = btoa(`${email}:${apiToken}`);
  // Request summary, description, priority, labels, and common AC custom field IDs
  const fields = 'summary,description,priority,labels,customfield_10014,customfield_10016,customfield_acceptance';
  const url = `https://${cleanDomain}/rest/api/3/issue/${issueKey}?fields=${fields}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 404) {
    throw { type: 'not_found', key: issueKey, message: `Issue ${issueKey} not found` };
  }
  if (response.status === 401 || response.status === 403) {
    throw { type: 'auth_error', key: issueKey, message: 'Jira credentials are invalid or expired' };
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw { type: 'api_error', key: issueKey, message: `Jira API returned HTTP ${response.status}: ${body.slice(0, 200)}` };
  }

  const data = await response.json();
  const f = data.fields || {};

  const summary: string = f.summary || '';
  const descriptionText = f.description ? adfToText(f.description).trim() : undefined;
  const priority: string | undefined = f.priority?.name;

  // Try common acceptance criteria field IDs
  const acRaw = f.customfield_10014 ?? f.customfield_acceptance ?? f.customfield_10016;
  let acText: string | undefined;
  if (acRaw) {
    acText = typeof acRaw === 'string' ? acRaw : adfToText(acRaw).trim();
    if (!acText) acText = undefined;
  }

  return { key: data.key, summary, description: descriptionText, priority, acceptanceCriteria: acText };
}

/** Anthropic 에러 타입 */
interface AnthropicError {
  status: number;
  type: string;
  message: string;
}

/** SHA-256 해시 계산 (캐시 키용) */
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    let errorBody: any = {};
    try { errorBody = await response.json(); } catch { errorBody = { error: { message: await response.text() } }; }

    const anthropicMessage = errorBody?.error?.message || 'Unknown Anthropic API error';
    const anthropicType = errorBody?.error?.type || 'api_error';

    const err: AnthropicError = { status: response.status, type: anthropicType, message: anthropicMessage };
    throw err;
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { content, tokens };
}

/** Step 1: 제목 생성 프롬프트 (Text 모드) */
function buildTitlePromptText(inputText: string): string {
  return `You are a QA engineer creating test cases. Based on the following feature description, generate a list of test case titles.

Feature description:
${sanitizeLong(inputText)}

Requirements:
- Generate 5 to 10 test case titles
- Cover happy paths, edge cases, and error scenarios
- Each title should be concise (under 80 characters) and descriptive
- Output ONLY a JSON array of strings, no markdown, no explanation

Example output:
["User can log in with valid credentials", "Login fails with incorrect password", "Login fails with empty email field"]

Output:`;
}

/** Step 1: 제목 생성 프롬프트 (Jira 모드) */
function buildTitlePromptJira(issues: JiraIssueData[]): string {
  const issueText = issues.map(issue => {
    let text = `Issue: ${issue.key} — ${sanitizeTitle(issue.summary)}`;
    if (issue.description) text += `\nDescription: ${sanitizeLong(issue.description)}`;
    if (issue.acceptanceCriteria) text += `\nAcceptance Criteria: ${sanitizeLong(issue.acceptanceCriteria)}`;
    if (issue.priority) text += `\nPriority: ${issue.priority}`;
    return text;
  }).join('\n\n---\n\n');

  return `You are a QA engineer creating test cases from Jira issues. Based on the following Jira issue(s), generate test case titles that thoroughly cover the requirements.

Jira Issues:
${issueText}

Requirements:
- Generate 5 to 10 test case titles that cover the requirements described in the issue(s)
- Include happy paths, edge cases, negative scenarios, and acceptance criteria validation
- Each title should be concise (under 80 characters) and descriptive
- Output ONLY a JSON array of strings, no markdown, no explanation

Output:`;
}

/** Step 1: 제목 생성 프롬프트 (Session 모드) */
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

/** Step 2: 상세 케이스 생성 프롬프트 */
function buildDetailPrompt(titles: string[]): string {
  const titlesJson = JSON.stringify(titles, null, 2);
  return `You are a QA engineer creating detailed test cases. For each title below, generate a complete test case.

Titles:
${titlesJson}

Requirements:
- For each title produce: title, description, precondition, steps (array of objects with "action" and "expected" fields), expected_result, priority
- priority must be one of: "critical", "high", "medium", "low"
- Each step must have an "action" (what the tester does) and "expected" (what should happen after this step)
- expected_result should be the overall expected outcome of the entire test case
- Output ONLY a valid JSON array, no markdown, no explanation

Example output format:
[
  {
    "title": "User can log in with valid credentials",
    "description": "Verify that a registered user can successfully log in.",
    "precondition": "User account exists with email test@example.com and password Test1234!",
    "steps": [
      {"action": "Navigate to /login", "expected": "Login page is displayed with email and password fields"},
      {"action": "Enter email test@example.com", "expected": "Email field shows the entered email"},
      {"action": "Enter password Test1234!", "expected": "Password field shows masked characters"},
      {"action": "Click Login button", "expected": "User is redirected to the dashboard"}
    ],
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

/** 공통 JSON 응답 헬퍼 */
function jsonResponse(body: object, status = 200): Response {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // JWT payload 직접 디코딩 (ES256 알고리즘 지원 문제 우회)
    // supabase.auth.getUser(token) / GoTrue /user endpoint 모두 ES256 거부하므로
    // payload에서 sub 추출 후 admin API로 사용자 존재 여부 확인
    const token = authHeader.replace('Bearer ', '');

    // Admin client (bypasses RLS, used for user lookup and all DB operations)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let user: { id: string; email?: string } | null = null;
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
      const sub = payload.sub as string;
      if (!sub) throw new Error('No sub');
      const { data: { user: adminUser }, error: adminErr } = await adminClient.auth.admin.getUserById(sub);
      if (adminErr || !adminUser) throw new Error('User not found');
      user = adminUser;
    } catch (e) {
      return jsonResponse({ error: 'Unauthorized', details: String(e) }, 401);
    }

    // ── Rate Limiting (Token Bucket) ──────────────────────────
    // user_id 기준 버킷: AI 생성은 월 한도 외에 burst도 제한
    const rlResult = await checkRateLimit(adminClient, user.id, 'ai_generate', RATE_CONFIGS['ai_generate']);
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult, corsHeaders);
    }

    const body: GenerateRequest = await req.json();
    const { project_id, mode, step, action, input_text, session_id, jira_issue_keys, selected_titles, run_id } = body;
    // f021: allowlist 로 정규화 — 'ko' | 'en' 만 허용, 그 외 전부 'en' fallback.
    const locale: SupportedLocale = resolveLocale(body.locale);

    // ── AI RUN SUMMARY (action: 'summarize-run') ──────────────
    if (action === 'summarize-run') {
      if (!run_id) {
        return jsonResponse({ error: 'run_id is required for summarize-run' }, 400);
      }

      const access = await checkAiAccess(adminClient, user.id, 'run_summary');
      if (!access.allowed) {
        return jsonResponse({ error: access.error, requiredTier: access.requiredTier, upgradeUrl: access.upgradeUrl, usage: access.usage, limit: access.limit, current_tier: access.tier }, access.requiredTier ? 403 : 429);
      }
      const { tier, ownerId } = access;

      // Check cache: same run_id with prior summary (owner 팀 shared pool 범위).
      // self-only 조회로는 팀원이 먼저 분석한 결과를 재사용할 수 없어 중복 credit 차감이 발생.
      if (!body.force_reanalyze) {
        const teamUserIds = await getOwnerTeamUserIds(adminClient, ownerId);
        const { data: cached } = await adminClient
          .from('ai_generation_logs')
          .select('output_data, created_at')
          .eq('mode', 'run-summary')
          .in('user_id', teamUserIds)
          .filter('input_data->>run_id', 'eq', run_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached?.output_data?.riskLevel) {
          return jsonResponse({ success: true, summary: cached.output_data, cached: true });
        }
      }

      // Fetch run metadata
      const { data: runData, error: runError } = await adminClient
        .from('test_runs')
        .select('id, name, created_at, status, project_id')
        .eq('id', run_id)
        .maybeSingle();

      if (runError || !runData) {
        return jsonResponse({ error: 'Run not found' }, 404);
      }

      // Project access check via project_members
      const { data: projectData } = await adminClient
        .from('projects')
        .select('id')
        .eq('id', runData.project_id)
        .maybeSingle();

      if (!projectData) {
        return jsonResponse({ error: 'Project not found' }, 404);
      }

      const { data: memberCheck } = await adminClient
        .from('project_members')
        .select('id')
        .eq('project_id', runData.project_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!memberCheck) {
        return jsonResponse({ error: 'Access denied' }, 403);
      }

      // Fetch test results (status + test_case_id)
      const { data: testResultsData } = await adminClient
        .from('test_results')
        .select('test_case_id, status, note')
        .eq('run_id', run_id);

      const allResults = testResultsData || [];
      if (allResults.length === 0) {
        return jsonResponse({ error: 'No test results to analyze' }, 422);
      }

      // Fetch TC metadata for failed/blocked cases
      const failedIds = allResults.filter((r: any) => r.status === 'failed').map((r: any) => r.test_case_id);
      const blockedIds = allResults.filter((r: any) => r.status === 'blocked').map((r: any) => r.test_case_id);
      const relevantIds = [...new Set([...failedIds, ...blockedIds])];

      type TCMeta = { id: string; title: string; folder?: string; priority: string };
      let tcMetaMap = new Map<string, TCMeta>();
      if (relevantIds.length > 0) {
        const { data: tcData } = await adminClient
          .from('test_cases')
          .select('id, title, folder, priority')
          .in('id', relevantIds);
        for (const tc of (tcData || []) as TCMeta[]) {
          tcMetaMap.set(tc.id, tc);
        }
      }

      const totalCount = allResults.length;
      const passedCount = allResults.filter((r: any) => r.status === 'passed').length;
      const failedCount = allResults.filter((r: any) => r.status === 'failed').length;
      const blockedCount = allResults.filter((r: any) => r.status === 'blocked').length;
      const skippedCount = allResults.filter((r: any) => r.status === 'skipped' || r.status === 'untested').length;

      const failedResults = allResults.filter((r: any) => r.status === 'failed');
      const blockedResults = allResults.filter((r: any) => r.status === 'blocked');

      // Group failures by folder
      const folderMap = new Map<string, number>();
      for (const r of failedResults as any[]) {
        const tc = tcMetaMap.get(r.test_case_id);
        const folder = tc?.folder || 'unknown';
        folderMap.set(folder, (folderMap.get(folder) || 0) + 1);
      }
      const failedByFolder = Array.from(folderMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([folder, count]) => ({ folder, count }));

      const failedDetails = (failedResults as any[])
        .slice(0, 30)
        .map((r) => {
          const tc = tcMetaMap.get(r.test_case_id);
          return `  - [${tc?.priority || 'medium'}] ${sanitizeTitle(tc?.title || '(unknown)')} (${sanitizeTag(tc?.folder || 'unknown')})`;
        });

      const blockedDetails = (blockedResults as any[])
        .slice(0, 10)
        .map((r) => {
          const tc = tcMetaMap.get(r.test_case_id);
          return `  - ${sanitizeTitle(tc?.title || '(unknown)')} (${sanitizeTag(tc?.folder || 'unknown')})${r.note ? ': ' + sanitizeLong(r.note) : ''}`;
        });

      const systemPromptBase = `You are a senior QA analyst. The user already sees pass/fail numbers on screen.
DO NOT repeat metrics. Instead provide:
1. WHY: Root cause hypothesis for each failure cluster (group by folder/pattern)
2. RISK: Overall risk level (HIGH/MEDIUM/LOW) with 1-sentence reasoning
3. ACTIONS: Top 3 specific, actionable recommendations
4. GO/NO-GO: Release decision with conditions
Keep total response under 200 words. Be direct, skip pleasantries.

Respond in valid JSON matching this schema:
{
  "riskLevel": "HIGH" | "MEDIUM" | "LOW",
  "riskReason": "string (1 sentence)",
  "narrative": "string (2-3 sentences, root cause analysis)",
  "clusters": [
    {
      "name": "string",
      "count": number,
      "rootCause": "string",
      "severity": "critical" | "major" | "minor",
      "testIds": ["string"]
    }
  ],
  "recommendations": ["string", "string", "string"],
  "goNoGo": "GO" | "NO-GO" | "CONDITIONAL",
  "goNoGoCondition": "string"
}`;
      // f021: KO 일 때만 suffix append. EN 은 원본 그대로 (BR-4).
      const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

      const userMessage = `Run: ${sanitizeShortName(runData.name)}, ${runData.created_at}, ${totalCount} TCs
Results: ${passedCount}P / ${failedCount}F / ${blockedCount}B / ${skippedCount}S

Failed tests by folder:
${failedByFolder.map((f) => `  ${sanitizeTag(f.folder)}: ${f.count} failures`).join('\n') || '  (none)'}

Failed test details:
${failedDetails.join('\n') || '  (none)'}

Blocked test details:
${blockedDetails.join('\n') || '  (none)'}

Quality Gates: Pass Rate ≥90%, Critical Failures = 0, Coverage ≥80%, Blocked ≤5%`;

      const startTime = Date.now();
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return jsonResponse({ error: 'AI service not configured' }, 500);
      }

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!claudeResp.ok) {
        if (claudeResp.status === 429) {
          return jsonResponse({ error: 'AI service busy. Please retry in 30 seconds.' }, 503);
        }
        return jsonResponse({ error: 'AI analysis failed' }, 500);
      }

      const claudeData = await claudeResp.json();
      const rawText = claudeData.content?.[0]?.text || '';
      const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
      const latencyMs = Date.now() - startTime;

      let aiSummary: any;
      try {
        aiSummary = parseJsonSafely(rawText);
        if (!aiSummary.riskLevel || !aiSummary.clusters || !aiSummary.goNoGo) {
          throw new Error('Missing required fields in AI response');
        }
      } catch (parseErr) {
        console.error('AI response parse error:', parseErr, 'Raw:', rawText);
        return jsonResponse({ error: 'Analysis failed — invalid response' }, 500);
      }

      // Log usage (step=1 so it counts against monthly quota)
      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id: runData.project_id,
        mode: 'run-summary',
        step: 1,
        input_data: { run_id: run_id, total_tcs: totalCount, locale }, // f021 BR-6
        output_data: aiSummary,
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
        credits_used: AI_FEATURES.run_summary.creditCost,
      });

      const usage = await getSharedPoolUsage(adminClient, ownerId);
      return jsonResponse({
        success: true,
        summary: aiSummary,
        usage: { current: usage, limit: PLAN_LIMITS[tier] },
      });
    }

    // ── COVERAGE GAP ANALYSIS (action: 'coverage-gap') ────────
    if (action === 'coverage-gap') {
      if (!project_id) {
        return jsonResponse({ error: 'project_id is required for coverage-gap' }, 400);
      }

      const access = await checkAiAccess(adminClient, user.id, 'coverage_gap');
      if (!access.allowed) {
        return jsonResponse({ error: access.error, requiredTier: access.requiredTier, upgradeUrl: access.upgradeUrl, usage: access.usage, limit: access.limit, current_tier: access.tier }, access.requiredTier ? 403 : 429);
      }
      const { tier, ownerId } = access;

      // Project access check
      const { data: projectData } = await adminClient
        .from('projects')
        .select('id, owner_id, name')
        .eq('id', project_id)
        .maybeSingle();

      if (!projectData) {
        return jsonResponse({ error: 'Project not found' }, 404);
      }

      if (projectData.owner_id !== user.id) {
        const { data: memberCheck } = await adminClient
          .from('project_members')
          .select('id')
          .eq('project_id', project_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!memberCheck) {
          return jsonResponse({ error: 'Access denied' }, 403);
        }
      }

      // Fetch all TCs from DB if not provided in body
      let tcList = body.test_cases;
      if (!tcList || tcList.length === 0) {
        const { data: dbTCs } = await adminClient
          .from('test_cases')
          .select('title, folder, priority')
          .eq('project_id', project_id);
        tcList = (dbTCs || []).map((tc: any) => ({
          folder: tc.folder || 'General',
          title: tc.title,
          priority: tc.priority || 'medium',
        }));
      }

      if (!tcList || tcList.length === 0) {
        return jsonResponse({ error: 'No test cases found in this project' }, 422);
      }

      // Hash-based cache: sort TCs for deterministic hash regardless of order
      const sortedForHash = [...tcList]
        .sort((a, b) => (a.folder + a.title).localeCompare(b.folder + b.title))
        .map(t => `${t.folder}|${t.title}|${t.priority}`)
        .join('\n');
      const contentHash = await computeHash(sortedForHash);

      if (!body.force_reanalyze) {
        const { data: cached } = await adminClient
          .from('ai_generation_logs')
          .select('output_data, created_at')
          .eq('mode', 'run-summary')
          .filter('input_data->>content_hash', 'eq', contentHash)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached?.output_data?.gaps) {
          return jsonResponse({ success: true, result: cached.output_data, cached: true });
        }
      }

      // Build folder summary for the prompt
      const folderMap = new Map<string, { titles: string[]; priorities: string[] }>();
      for (const tc of tcList) {
        const folder = tc.folder || 'General';
        if (!folderMap.has(folder)) folderMap.set(folder, { titles: [], priorities: [] });
        folderMap.get(folder)!.titles.push(tc.title);
        folderMap.get(folder)!.priorities.push(tc.priority);
      }

      const folderSummary = Array.from(folderMap.entries())
        .map(([folder, data]) => {
          const criticalCount = data.priorities.filter(p => p === 'critical').length;
          return `${sanitizeTag(folder)} (${data.titles.length} TCs, ${criticalCount} critical):\n${data.titles.slice(0, 10).map(t => `  - ${sanitizeTitle(t)}`).join('\n')}${data.titles.length > 10 ? `\n  ... and ${data.titles.length - 10} more` : ''}`;
        })
        .join('\n\n');

      // RTM 데이터 추가 (requirements가 존재하면 포함)
      const { data: requirements } = await adminClient
        .from('requirements')
        .select('custom_id, title, description, priority, category')
        .eq('project_id', project_id)
        .eq('status', 'active')
        .limit(100);

      let requirementsSummary = '';
      if (requirements && requirements.length > 0) {
        // 각 requirement에 연결된 TC 수 조회
        const reqIds = (requirements as any[]).map((r: any) => r.custom_id);
        const { data: coverageRows } = await adminClient
          .from('requirement_coverage_summary')
          .select('custom_id, total_linked_tcs, gap_type')
          .eq('project_id', project_id);

        const coverageMap = new Map<string, { total: number; gap: string }>();
        (coverageRows || []).forEach((row: any) => {
          coverageMap.set(row.custom_id, { total: row.total_linked_tcs, gap: row.gap_type });
        });

        const noTcReqs = (requirements as any[]).filter((r: any) => {
          const c = coverageMap.get(r.custom_id);
          return !c || c.total === 0;
        });
        const partialReqs = (requirements as any[]).filter((r: any) => {
          const c = coverageMap.get(r.custom_id);
          return c && c.total > 0 && c.gap !== 'covered';
        });

        requirementsSummary = `\n\nREQUIREMENTS AND TEST COVERAGE (${requirements.length} total):
No TC coverage (${noTcReqs.length} requirements — CRITICAL):
${noTcReqs.slice(0, 10).map((r: any) => `  - ${r.custom_id} [${r.priority}]: ${sanitizeTitle(r.title)}`).join('\n') || '  (none)'}

Partially covered / failing (${partialReqs.length} requirements):
${partialReqs.slice(0, 10).map((r: any) => {
  const c = coverageMap.get(r.custom_id);
  return `  - ${r.custom_id} [${r.priority}]: ${sanitizeTitle(r.title)} (gap: ${c?.gap})`;
}).join('\n') || '  (none)'}`;

        void reqIds; // suppress unused warning
      }

      const systemPromptBase = `You are a test coverage analyst. Given this project's TC distribution by folder${requirements && requirements.length > 0 ? ' AND requirements coverage' : ''}, identify coverage gaps.
DO NOT generate a heatmap or coverage % (user already sees this).
Instead:
1. GAPS: Identify folders and requirements with insufficient coverage. Rate: CRITICAL/HIGH/MEDIUM
2. MISSING TYPES: For each gap, identify what TC types are missing (negative, boundary, error_handling, security, performance)
3. SUGGESTIONS: For each gap, suggest 2-5 specific TC titles (actionable and specific, not generic)
4. TYPE BALANCE: Overall project TC type distribution assessment
${requirements && requirements.length > 0 ? '5. REQUIREMENT GAPS: Flag requirements with zero TC coverage as highest priority.' : ''}
Keep suggestions to max 15 total. Prioritize by business risk.

Respond in valid JSON:
{
  "gaps": [
    {
      "module": "folder name or requirement ID",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM",
      "currentCount": number,
      "missingTypes": ["error_handling", "boundary", ...],
      "reason": "string (1-2 sentences)",
      "requirementId": "REQ-001 or null",
      "suggestions": [
        { "title": "string", "type": "error_handling|boundary|negative|security|performance", "priority": "P1|P2|P3" }
      ]
    }
  ],
  "typeBalance": {
    "positive": number,
    "negative": number,
    "boundary": number,
    "errorHandling": number,
    "security": number,
    "performance": number
  },
  "typeAssessment": "string (1-2 sentences)"
}`;
      // f021: KO 일 때만 suffix append. EN 은 원본 그대로 (BR-4).
      const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

      const userMessage = `Project: ${sanitizeShortName(projectData.name)}\nTotal TCs: ${tcList.length}\n\nTC Distribution by Folder:\n${folderSummary}${requirementsSummary}`;

      const startTime = Date.now();
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return jsonResponse({ error: 'AI service not configured' }, 500);
      }

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!claudeResp.ok) {
        if (claudeResp.status === 429) {
          return jsonResponse({ error: 'AI service busy. Please retry in 30 seconds.' }, 503);
        }
        return jsonResponse({ error: 'AI analysis failed' }, 500);
      }

      const claudeData = await claudeResp.json();
      const rawText = claudeData.content?.[0]?.text || '';
      const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
      const latencyMs = Date.now() - startTime;

      let gapResult: any;
      try {
        gapResult = parseJsonSafely(rawText);
        if (!gapResult.gaps || !Array.isArray(gapResult.gaps)) {
          throw new Error('Missing gaps array in AI response');
        }
      } catch (parseErr) {
        console.error('Coverage gap parse error:', parseErr, 'Raw:', rawText);
        return jsonResponse({ error: 'Analysis failed — invalid response' }, 500);
      }

      // Log usage — store full result + hash for future cache hits
      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id,
        mode: 'run-summary',
        step: 1,
        input_data: { action: 'coverage-gap', total_tcs: tcList.length, content_hash: contentHash, locale }, // f021 BR-6
        output_data: gapResult,
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
        credits_used: AI_FEATURES.coverage_gap.creditCost,
      });

      const usage = await getSharedPoolUsage(adminClient, ownerId);
      return jsonResponse({
        success: true,
        result: gapResult,
        usage: { current: usage, limit: PLAN_LIMITS[tier] },
      });
    }

    // ── AI TC SUGGESTION FROM REQUIREMENT (action: 'suggest-from-requirement') ──
    if (action === 'suggest-from-requirement') {
      const { requirement_id, requirement_title, requirement_description, existing_tcs = [] } = body;

      if (!requirement_id || !requirement_title) {
        return jsonResponse({ error: 'requirement_id and requirement_title are required' }, 400);
      }

      const access = await checkAiAccess(adminClient, user.id, 'requirement_suggest');
      if (!access.allowed) {
        return jsonResponse({ error: access.error, requiredTier: access.requiredTier, upgradeUrl: access.upgradeUrl, usage: access.usage, limit: access.limit, current_tier: access.tier }, access.requiredTier ? 403 : 429);
      }
      const { tier, ownerId } = access;

      const existingList = (existing_tcs as { custom_id: string; title: string }[])
        .map(tc => `- ${tc.custom_id}: ${sanitizeTitle(tc.title)}`)
        .join('\n') || '(none)';

      const systemPromptBase = `You are a senior QA engineer. Analyze the given requirement and suggest test cases that are NOT already covered.
Generate test cases covering:
1. Happy path (positive) tests
2. Negative / error scenarios
3. Boundary value tests
4. Edge cases

For each suggestion return:
- title: concise, descriptive (under 80 chars)
- priority: "critical" | "high" | "medium" | "low"
- type: "positive" | "negative" | "boundary" | "error_handling" | "security"
- steps: array of { action: string, expected: string }
- precondition: string (may be empty)

Respond ONLY with a valid JSON array. Max 8 suggestions. No markdown, no explanation.`;
      // f021: KO 일 때만 suffix append. EN 은 원본 그대로 (BR-4).
      const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

      const userMessage = `REQUIREMENT:
Title: ${sanitizeTitle(requirement_title)}
Description: ${sanitizeLong(requirement_description || '(no description)')}

ALREADY LINKED TEST CASES:
${existingList}

Suggest test cases not yet covered.`;

      const startTime = Date.now();
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return jsonResponse({ error: 'AI service not configured' }, 500);
      }

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!claudeResp.ok) {
        if (claudeResp.status === 429) {
          return jsonResponse({ error: 'AI service busy. Please retry in 30 seconds.' }, 503);
        }
        return jsonResponse({ error: 'AI suggestion failed' }, 500);
      }

      const claudeData = await claudeResp.json();
      const rawText = claudeData.content?.[0]?.text || '';
      const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
      const latencyMs = Date.now() - startTime;

      let suggestions: any[];
      try {
        suggestions = parseJsonSafely(rawText);
        if (!Array.isArray(suggestions)) throw new Error('Expected JSON array');
      } catch (parseErr) {
        console.error('suggest-from-requirement parse error:', parseErr, 'Raw:', rawText);
        return jsonResponse({ error: 'AI returned an unexpected format' }, 500);
      }

      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id: project_id || null,
        mode: 'requirement-suggest',
        step: 1,
        input_data: { action: 'suggest-from-requirement', requirement_id, existing_tc_count: existing_tcs.length, locale }, // f021 BR-6
        output_data: { suggestions },
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
        credits_used: AI_FEATURES.requirement_suggest.creditCost,
      });

      const usage = await getSharedPoolUsage(adminClient, ownerId);
      return jsonResponse({
        success: true,
        suggestions,
        requirement_id,
        usage: { current: usage, limit: PLAN_LIMITS[tier] },
      });
    }

    // ── FLAKY ANALYSIS (action: 'analyze-flaky') ───────────────
    if (action === 'analyze-flaky') {
      if (!project_id) {
        return jsonResponse({ error: 'project_id is required for analyze-flaky' }, 400);
      }

      const access = await checkAiAccess(adminClient, user.id, 'flaky_analysis');
      if (!access.allowed) {
        return jsonResponse({ error: access.error, requiredTier: access.requiredTier, upgradeUrl: access.upgradeUrl, usage: access.usage, limit: access.limit, current_tier: access.tier }, access.requiredTier ? 403 : 429);
      }
      const { tier, ownerId } = access;

      const flakyTests: { test_case_id: string; title: string; folder_path: string; recent_statuses: string[]; flaky_score: number }[] = body.flaky_tests ?? [];
      if (!flakyTests.length) {
        return jsonResponse({ error: 'No flaky tests provided' }, 422);
      }

      // Hash-based cache: sort by test_case_id for deterministic key
      const sortedFlaky = [...flakyTests].sort((a, b) => a.test_case_id.localeCompare(b.test_case_id));
      const flakyHashInput = sortedFlaky.map(t => `${t.test_case_id}|${t.flaky_score}|${t.recent_statuses.join(',')}`).join('\n');
      const flakyHash = await computeHash(flakyHashInput);

      if (!body.force_reanalyze) {
        const { data: cachedFlaky } = await adminClient
          .from('ai_generation_logs')
          .select('output_data, created_at')
          .eq('mode', 'run-summary')
          .filter('input_data->>content_hash', 'eq', flakyHash)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cachedFlaky?.output_data?.patterns) {
          return jsonResponse({ success: true, result: cachedFlaky.output_data, cached: true });
        }
      }

      const testList = flakyTests.map(t =>
        `- [${t.test_case_id}] "${sanitizeTitle(t.title)}" (${sanitizeTag(t.folder_path || 'General')}) | Score: ${t.flaky_score}% | Sequence: ${t.recent_statuses.join('→')}`
      ).join('\n');

      const systemPromptBase = `You are a test stability expert. Given these flaky tests with their pass/fail sequences:
DO NOT recalculate flaky scores (user already sees them).
Instead:
1. CLUSTER: Group tests that are likely flaky for the same reason
2. ROOT CAUSE: For each cluster, hypothesize the most likely cause (race_condition, shared_state, env_dependency, data_dependency, timing)
3. FIX: For each cluster, suggest a specific, actionable fix (1-2 sentences)
Keep total response under 150 words. Be technical and direct.

Respond in valid JSON:
{
  "patterns": [
    {
      "name": "string (e.g. Race Condition)",
      "category": "race_condition" | "shared_state" | "env_dependency" | "data_dependency" | "timing",
      "testIds": ["test_case_id", ...],
      "rootCause": "string (1-2 sentences)",
      "fixSuggestion": "string (1-2 sentences)"
    }
  ]
}`;
      // f021: KO 일 때만 suffix append. EN 은 원본 그대로 (BR-4).
      const systemPrompt = maybeAppendLocaleInstruction(systemPromptBase, locale);

      const userMessage = `Flaky Tests:\n${testList}`;

      const startTime = Date.now();
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return jsonResponse({ error: 'AI service not configured' }, 500);
      }

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!claudeResp.ok) {
        if (claudeResp.status === 429) {
          return jsonResponse({ error: 'AI service busy. Please retry in 30 seconds.' }, 503);
        }
        return jsonResponse({ error: 'AI analysis failed' }, 500);
      }

      const claudeData = await claudeResp.json();
      const rawText = claudeData.content?.[0]?.text || '';
      const tokensUsed = (claudeData.usage?.input_tokens || 0) + (claudeData.usage?.output_tokens || 0);
      const latencyMs = Date.now() - startTime;

      let analysisResult: any;
      try {
        analysisResult = parseJsonSafely(rawText);
        if (!analysisResult.patterns || !Array.isArray(analysisResult.patterns)) {
          throw new Error('Missing patterns array in AI response');
        }
      } catch (parseErr) {
        console.error('Flaky analysis parse error:', parseErr, 'Raw:', rawText);
        return jsonResponse({ error: 'Analysis failed — invalid response' }, 500);
      }

      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id,
        mode: 'run-summary',
        step: 1,
        input_data: { action: 'analyze-flaky', flaky_count: flakyTests.length, content_hash: flakyHash, locale }, // f021 BR-6
        output_data: analysisResult,
        tokens_used: tokensUsed,
        latency_ms: latencyMs,
        credits_used: AI_FEATURES.flaky_analysis.creditCost,
      });

      const usage = await getSharedPoolUsage(adminClient, ownerId);
      return jsonResponse({
        success: true,
        result: analysisResult,
        usage: { current: usage, limit: PLAN_LIMITS[tier] },
      });
    }

    if (!project_id || !mode) {
      return jsonResponse({ error: 'project_id and mode are required' }, 400);
    }

    const { tier, ownerId } = await getEffectiveTier(adminClient, user.id);

    // ── JIRA PREVIEW (action: 'preview') ──────────────────────
    if (action === 'preview' && mode === 'jira') {
      if (tier < JIRA_MIN_TIER) {
        return jsonResponse({ error: 'Jira mode requires Hobby plan or higher.', current_tier: tier, required_tier: JIRA_MIN_TIER }, 403);
      }
      if (!jira_issue_keys?.length) {
        return jsonResponse({ error: 'jira_issue_keys is required for preview' }, 400);
      }

      // Get Jira credentials
      const { data: jiraCreds } = await adminClient
        .from('jira_settings')
        .select('domain, email, api_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!jiraCreds?.domain || !jiraCreds?.email || !jiraCreds?.api_token) {
        return jsonResponse({ error: 'Jira is not connected. Please connect in Settings > Integrations.', type: 'not_connected' }, 422);
      }

      const issues: JiraIssueData[] = [];
      const failed: JiraFetchError[] = [];

      for (const key of jira_issue_keys) {
        try {
          const issue = await fetchJiraIssue(jiraCreds.domain, jiraCreds.email, jiraCreds.api_token, key);
          issues.push(issue);
        } catch (err: any) {
          failed.push({ key: err.key || key, reason: err.message || 'Unknown error' });
        }
      }

      if (issues.length === 0 && failed.length > 0) {
        const firstError = failed[0];
        const isAuth = firstError.reason.includes('invalid or expired');
        return jsonResponse({
          error: isAuth ? firstError.reason : `No issues could be fetched. ${failed.map(f => `${f.key}: ${f.reason}`).join(', ')}`,
          type: isAuth ? 'auth_error' : 'not_found',
          failed,
        }, isAuth ? 401 : 404);
      }

      return jsonResponse({ success: true, issues, failed });
    }

    // ── GENERATE (step 1 or 2) ────────────────────────────────
    if (!step) {
      return jsonResponse({ error: 'step is required for generate requests' }, 400);
    }

    // Mode-level tier checks (tier/ownerId already fetched at line above for preview path)
    if (mode === 'session' && tier < SESSION_MIN_TIER) {
      return jsonResponse({ error: 'Session mode requires Professional plan or higher.', current_tier: tier, required_tier: SESSION_MIN_TIER }, 403);
    }
    if (mode === 'jira' && tier < JIRA_MIN_TIER) {
      return jsonResponse({ error: 'Jira mode requires Hobby plan or higher.', current_tier: tier, required_tier: JIRA_MIN_TIER }, 403);
    }

    // TC 개수 제한 체크 (프로젝트당 Free: 100, Hobby: 200, Starter+: 무제한)
    if (tier < 3) {
      const TC_LIMITS: Record<number, number> = { 1: 100, 2: 200 };
      const tcLimit = TC_LIMITS[tier];
      if (tcLimit !== undefined) {
        const { count: tcCount } = await adminClient
          .from('test_cases')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project_id);
        if ((tcCount ?? 0) >= tcLimit) {
          return jsonResponse({ error: `프로젝트당 최대 ${tcLimit}개의 테스트 케이스를 생성할 수 있습니다. 플랜을 업그레이드하세요.`, tc_count: tcCount, tc_limit: tcLimit, current_tier: tier }, 403);
        }
      }
    }

    // Monthly credit check (step 1 only — TC generation counts as 1 credit)
    if (step === 1) {
      const limit = PLAN_LIMITS[tier] ?? -1;
      if (limit !== -1) {
        const usage = await getSharedPoolUsage(adminClient, ownerId);
        if (limit - usage < AI_FEATURES.tc_generation_text.creditCost) {
          return jsonResponse({ error: 'Monthly AI credit limit reached.', usage, limit, current_tier: tier }, 429);
        }
      }
    }

    const startTime = Date.now();
    let prompt = '';
    let responseData: any = {};

    // ── Step 1: 제목 생성 ─────────────────────────────────────
    if (step === 1) {
      if (mode === 'text') {
        if (!input_text?.trim()) {
          return jsonResponse({ error: 'input_text is required for text mode' }, 400);
        }
        prompt = buildTitlePromptText(input_text);

      } else if (mode === 'jira') {
        if (!jira_issue_keys?.length) {
          return jsonResponse({ error: 'jira_issue_keys is required for jira mode' }, 400);
        }

        const { data: jiraCreds } = await adminClient
          .from('jira_settings')
          .select('domain, email, api_token')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!jiraCreds?.domain || !jiraCreds?.email || !jiraCreds?.api_token) {
          return jsonResponse({ error: 'Jira is not connected. Please connect in Settings > Integrations.', type: 'not_connected' }, 422);
        }

        const issues: JiraIssueData[] = [];
        const failed: JiraFetchError[] = [];

        for (const key of jira_issue_keys) {
          try {
            const issue = await fetchJiraIssue(jiraCreds.domain, jiraCreds.email, jiraCreds.api_token, key);
            issues.push(issue);
          } catch (err: any) {
            failed.push({ key: err.key || key, reason: err.message || 'Unknown error' });
          }
        }

        if (issues.length === 0) {
          const isAuth = failed[0]?.reason?.includes('invalid or expired');
          return jsonResponse({
            error: isAuth ? failed[0].reason : `Could not fetch any Jira issues. Failed: ${failed.map(f => `${f.key} (${f.reason})`).join(', ')}`,
            type: isAuth ? 'auth_error' : 'not_found',
            failed,
          }, isAuth ? 401 : 404);
        }

        prompt = buildTitlePromptJira(issues);

      } else {
        // session mode
        if (!session_id) {
          return jsonResponse({ error: 'session_id is required for session mode' }, 400);
        }

        const { data: sessionData } = await adminClient
          .from('sessions')
          .select('name, charter')
          .eq('id', session_id)
          .eq('project_id', project_id)
          .maybeSingle();

        if (!sessionData) {
          return jsonResponse({ error: 'Session not found in this project' }, 404);
        }

        const { data: logs } = await adminClient
          .from('session_logs')
          .select('type, content, created_at')
          .eq('session_id', session_id)
          .order('created_at', { ascending: true });

        const logSummary = (logs || [])
          .map((l: any) => `[${l.type.toUpperCase()}] ${l.content}`)
          .join('\n');

        const sessionSummary = `Session: ${sanitizeShortName(sessionData.name)}\nMission: ${sanitizeLong(sessionData.charter || '(none)')}\n\nLogs:\n${logSummary || '(no logs)'}`;
        prompt = buildTitlePromptSession(sessionSummary);
      }

      // f021: step1 은 user-message-only (system 없음) 구조 — prompt 끝에 KO suffix append.
      // EN 일 때는 localeInstructionFor('en') 이 빈 문자열 이라 원본 무변경 (BR-4).
      const { content, tokens } = await callClaude(prompt + localeInstructionFor(locale));
      const latency = Date.now() - startTime;

      let titles: string[] = [];
      try {
        titles = parseJsonSafely(content);
        if (!Array.isArray(titles)) throw new Error('not an array');
      } catch {
        return jsonResponse({ error: 'Failed to parse AI response', raw: content }, 500);
      }

      await adminClient.from('ai_generation_logs').insert({
        user_id: user.id,
        project_id,
        mode,
        step: 1,
        input_text: mode === 'text' ? input_text : mode === 'jira' ? jira_issue_keys?.join(',') : null,
        session_id: mode === 'session' ? session_id : null,
        titles_generated: titles.length,
        model_used: 'claude-sonnet-4-20250514',
        tokens_used: tokens,
        latency_ms: latency,
        credits_used: AI_FEATURES.tc_generation_text.creditCost,
        input_data: { locale }, // f021 BR-6
      });

      responseData = { titles, tokens_used: tokens, latency_ms: latency };

    // ── Step 2: 상세 케이스 생성 ──────────────────────────────
    } else {
      if (!selected_titles?.length) {
        return jsonResponse({ error: 'selected_titles is required for step 2' }, 400);
      }

      prompt = buildDetailPrompt(selected_titles);
      // f021: step2 도 user-message-only — prompt 끝에 KO suffix append (EN 은 빈 문자열).
      const { content, tokens } = await callClaude(prompt + localeInstructionFor(locale));
      const latency = Date.now() - startTime;

      let cases: any[] = [];
      try {
        cases = parseJsonSafely(content);
        if (!Array.isArray(cases)) throw new Error('not an array');
      } catch {
        return jsonResponse({ error: 'Failed to parse AI response', raw: content }, 500);
      }

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

    return jsonResponse({ success: true, ...responseData });

  } catch (error: any) {
    console.error('generate-testcases error:', error);

    if (error?.type && error?.message && error?.status) {
      const httpStatus = error.status === 400 ? 402 : error.status >= 500 ? 502 : error.status;
      return jsonResponse({ error: 'AI API error', type: error.type, message: error.message }, httpStatus);
    }

    return jsonResponse({ error: 'Internal server error', details: error?.message || String(error) }, 500);
  }
});
