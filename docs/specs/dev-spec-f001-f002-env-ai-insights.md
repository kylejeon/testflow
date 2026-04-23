# Dev Spec: f001 + f002 — Environment AI Insights (Real Claude) + Chip Workflows

> **작성일:** 2026-04-24
> **작성자:** PM (@planner)
> **상태:** Draft → Review → Approved
> **관련 리서치:** `docs/research/env-ai-insights-research.md`
> **관련 디자인:** `docs/specs/design-spec-f001-f002-env-ai-insights.md` (TBD — @designer 로 라우팅)
> **의존:**
>   - `docs/specs/dev-spec-f018-ai-credit-race-condition.md` — `consumeAiCredit()` + `consume_ai_credit_and_log` RPC 재사용
>   - `docs/specs/dev-spec-milestone-ai-risk-insight.md` — Claude Haiku + JSONB 캐시 선례 (패턴 동일)
>   - `docs/specs/dev-spec-f021-claude-locale.md` — `resolveLocale()` / `maybeAppendLocaleInstruction()`
> **선행:** f001 → f002 (f002 Chip 들은 f001 이 반환하는 AI payload 를 컨텍스트로 사용)

---

## 1. 개요

- **문제:** 현재 `EnvironmentAIInsights` 사이드바는 rule-based 집계(pass rate < 40%, untested ≥ 50%)로 critical env / coverage gap / baseline 을 표시하지만,
  (1) **AI 가 아니다** — "AI Insights" 브랜딩과 달리 자연어 설명이 없다,
  (2) **Chip 버튼(Create issue / Filter / Assign run) 이 전부 "Coming soon" 토스트**다 (§AC-V13 / OOS §9-2).
  유저는 "왜 이 env 가 위험한지" 를 다른 탭에서 수동으로 추적해야 하고, rule-based 출력 이상의 액션을 취할 수 없다.

- **해결:**
  - **f001** — rule-based 를 유지한 채 "Regenerate with AI" 버튼(`AITriggerButton`)으로 Claude Haiku 를 호출해 env×TC 컨텍스트 기반 자연어 headline / critical env / coverage gap 설명 / 2~4 개 recommendations 를 추가 표시 (additive, rule-based 를 대체하지 않음). 24 시간 JSONB 캐시(`test_plans.ai_env_insights_cache`) + `consumeAiCredit()` 으로 1 credit flat 차감 + owner shared pool 공유 (race-safe).
  - **f002** — 세 개 칩을 실제 워크플로우로 연결: (a) **Create issue** → 인라인 `IssueCreateInlineModal` 로 `create-jira-issue` / `create-github-issue` Edge Function 직접 호출 (AI headline + recommendations pre-fill), (b) **Filter** → plan-detail `highlightedEnv` state 로 히트맵 column CSS highlight 및 토글, (c) **Assign run** → plan-detail 내 runs 섹션으로 scrollIntoView + 안내 토스트.

- **성공 지표:**
  - Env AI Insights 버튼 클릭 수 / WAU (타겟: Starter+ plan detail 방문자의 ≥ 15%)
  - Chip 클릭 → Issue 생성 완료율 (AI insight 가 실제 이슈로 이어지는 전환)
  - AI 호출 당 cache hit rate (타겟: ≥ 50% — 대부분 첫 방문 외엔 캐시)
  - 재생성 버튼 클릭 대비 `rate_limited_post_check` 비율 < 1% (f018 적용 확인)

---

## 2. 유저 스토리

- **US-1 (f001):** As a Manager (Starter plan), I want to click "Regenerate with AI" on the Environment Coverage sidebar, so that I see a 1-sentence headline, concrete critical env explanation, and 2–4 actionable recommendations citing env names and TC IDs.
- **US-2 (f001):** As a Professional plan Owner, I want cached AI insights to reload instantly within 24 hours without consuming credits, so that my team does not burn shared pool quota re-reading the same analysis.
- **US-3 (f001):** As a Free plan user, I want to see a clear "Starter plan required" upsell on the AI trigger button, so that I understand why the button is disabled.
- **US-4 (f001):** As a Manager whose plan has < 5 executed results, I want the AI call to short-circuit with a "too little data" indicator (no credit consumed), so that I do not waste quota on unreliable AI output.
- **US-5 (f002-a):** As a Tester, I want to click "Create issue" on a Critical card and see an inline modal pre-filled with the AI headline as title and AI reasoning + recommendations as description, so that I can file a Jira / GitHub issue in 2 clicks without leaving the plan detail page.
- **US-6 (f002-b):** As a QA lead, I want to click "Filter {envName}" and have the heatmap highlight that env's column with a visible border + dim other columns, so that I can visually isolate the critical env. Clicking the same chip again clears the highlight.
- **US-7 (f002-c):** As a Manager, I want to click "Assign run" on the Coverage Gap card and have the page scroll to the runs section with a toast "Add a run targeting this TC to close the gap", so that I know the next step.

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-A — 패키지 / Config (백엔드 + 프론트 동기)

- [ ] **AC-A1:** `supabase/functions/_shared/ai-config.ts` 의 `AI_FEATURES` 에 `environment_ai_insights` 키가 추가되어 있고, 값이 정확히 `{ minTier: 3, creditCost: 1, label: 'AI Environment Insights', mode: 'env-ai-insights' }` 이다.
- [ ] **AC-A2:** `src/hooks/useAiFeature.ts` 의 `AI_FEATURES` 에도 동일 키가 미러링되어 있고 `{ minTier: 3, creditCost: 1, label: 'AI Environment Insights' }` 이다 (백엔드 `mode` 필드 제외).
- [ ] **AC-A3:** `useAiFeature('environment_ai_insights')` 를 호출했을 때 Free/Hobby 플랜은 `tierOk === false`, Starter 이상은 `tierOk === true` 를 반환한다 (vitest 단위 테스트).
- [ ] **AC-A4:** 기존 `AiFeatureKey` union 타입 확장으로 인한 TypeScript 컴파일 에러가 0 건이다 (`pnpm typecheck` 통과).

### AC-B — DB 마이그레이션

- [ ] **AC-B1:** 마이그레이션 파일 `supabase/migrations/20260424_f001_ai_env_insights_cache.sql` 이 존재한다.
- [ ] **AC-B2:** 마이그레이션 적용 후 `test_plans` 테이블에 `ai_env_insights_cache JSONB NULL` 컬럼이 존재한다.
- [ ] **AC-B3:** 마이그레이션 적용 후 `test_plans` 테이블에 `ai_env_insights_cached_at TIMESTAMPTZ NULL` 컬럼이 존재한다 (보조 컬럼 — JSONB 내 `generated_at` 과 이중화; 인덱스 용도).
- [ ] **AC-B4:** 모든 컬럼 추가는 `ADD COLUMN IF NOT EXISTS` 로 idempotent 하다 (마이그레이션 재실행 시 에러 없음).
- [ ] **AC-B5:** `COMMENT ON COLUMN test_plans.ai_env_insights_cache IS '...'` 이 설정되어 있고 payload 구조 설명을 포함한다.
- [ ] **AC-B6:** 인덱스 `idx_test_plans_ai_env_insights_cached_at` 가 `test_plans(ai_env_insights_cached_at)` 에 `WHERE ai_env_insights_cache IS NOT NULL` 부분 인덱스로 생성되어 있다.
- [ ] **AC-B7:** 기존 `test_plans` RLS 정책은 변경되지 않으며, Edge Function 은 `SUPABASE_SERVICE_ROLE_KEY` 로 RLS bypass UPDATE 한다 (milestone-risk-predictor 패턴 동일).

### AC-C — Edge Function

- [ ] **AC-C1:** `supabase/functions/env-ai-insights/index.ts` 파일이 존재하고 `Deno.serve` 핸들러를 export 한다.
- [ ] **AC-C2:** `supabase/functions/env-ai-insights/config.toml` 이 존재하고 `verify_jwt = false` (anon JWT + x-user-token 패턴에 필요).
- [ ] **AC-C3:** Request body 는 `{ plan_id: string, force_refresh?: boolean, locale?: 'en' | 'ko' }` 를 받고, `plan_id` 누락 시 400 `{ error: 'bad_request', detail: 'plan_id is required' }` 를 반환한다.
- [ ] **AC-C4:** `x-user-token` 헤더 또는 `Authorization: Bearer <jwt>` 누락 시 401 `{ error: 'unauthorized' }` 를 반환한다 (milestone-risk-predictor 와 동일한 auth 블록 사용).
- [ ] **AC-C5:** `plan_id` 로 `test_plans` 조회해 row 없으면 404 `{ error: 'not_found' }` 를 반환한다.
- [ ] **AC-C6:** 조회된 plan 의 `project_id` 로 `project_members` 를 조회하고, 호출자 role level < 4 (= Viewer/Tester/Guest) 면 403 `{ error: 'forbidden', detail: 'Only Manager or above can trigger AI analysis.' }` 를 반환한다.
- [ ] **AC-C7:** `getEffectiveTier()` 로 tier 계산 후 `tier < 3` 이면 403 `{ error: 'tier_too_low', requiredTier: 3, upgradeUrl: 'https://testably.app/pricing' }` 를 반환한다.
- [ ] **AC-C8:** Rate limit: `checkRateLimit(supabase, userId, 'env_ai_insights', { capacity: 5, refillRate: 1/12 })` 로 5 req/min 제한을 적용한다 (cache hit 이후 / credit 체크 이전 위치).
- [ ] **AC-C9:** context 수집은 `environments` (plan 과 매칭되는 env 목록), `test_plan_test_cases` (plan 의 TC 목록 + priority / title / custom_id), `test_runs` (plan_id 로 필터), `test_results` (runs 의 run_id in 필터) 4 개 쿼리로 수행한다.
- [ ] **AC-C10:** **최소 데이터 임계값 — 총 executed < 5** 이면 Claude 호출 없이 200 `{ too_little_data: true, headline: null, critical_env: null, coverage_gap_tc: null, recommendations: [], confidence: 0, meta: { from_cache: false, credits_used: 0, ... } }` 를 반환하고 `consumeAiCredit` 을 호출하지 않는다.
- [ ] **AC-C11:** Claude 프롬프트 system = "QA env coverage analyst. Respond ONLY with valid JSON. Cite specific env names, TC titles, and numbers." + `maybeAppendLocaleInstruction(..., locale)`.
- [ ] **AC-C12:** Claude 프롬프트 user 는 plan 이름, total TCs, overall pass rate, per-env breakdown ({env_name} ({os} / {browser}): {passed} passed, {failed} failed, {untested} untested → {pass_rate}%), critical+high priority TCs untested count, top untested TC, 7-day execution trend 를 모두 포함한다 (Research §2 에 정의된 초안과 동일 필드).
- [ ] **AC-C13:** Claude 모델 = `claude-haiku-4-5-20251001`, `max_tokens=1024`, `temperature=0`, 25 초 timeout (`AbortController`).
- [ ] **AC-C14:** timeout 발생 시 504 `{ error: 'ai_timeout' }` 반환하고 credit 차감하지 않는다.
- [ ] **AC-C15:** Claude 429 응답 시 429 `{ error: 'upstream_rate_limit', retry_after_sec: 60 }` 반환하고 credit 차감하지 않는다.
- [ ] **AC-C16:** Claude 응답 JSON 파싱 실패 시 422 `{ error: 'ai_parse_failed' }` 반환하고 credit 차감하지 않는다.
- [ ] **AC-C17:** Claude 반환 JSON 은 `{ headline, critical_env, critical_reason, coverage_gap_tc, coverage_gap_reason, recommendations[], confidence }` 스키마이고, 파싱 후:
  - `headline` 은 String 300 자 clamp
  - `critical_env` / `coverage_gap_tc` 는 String 또는 null
  - `critical_reason` / `coverage_gap_reason` 은 String 500 자 clamp 또는 null
  - `recommendations` 는 Array<String> max 4 개 (초과 시 slice)
  - `confidence` 는 Math.max(0, Math.min(100, Math.round(Number(x)))) 로 정규화
- [ ] **AC-C18:** Response success (200) body = `{ headline, critical_env, critical_reason, coverage_gap_tc, coverage_gap_reason, recommendations, confidence, generated_at, meta: { from_cache, credits_used, credits_remaining, monthly_limit, tokens_used, latency_ms, log_id?, too_little_data?, rate_limited_post_check? } }`.

### AC-D — 캐시 동작

- [ ] **AC-D1:** 캐시 payload 구조 = `{ generated_at, stale_after, headline, critical_env, critical_reason, coverage_gap_tc, coverage_gap_reason, recommendations[], confidence, meta: { model, tokens_used, latency_ms, locale, input_snapshot: { total_tcs, total_envs, overall_pass_rate, executed_count } } }` (milestone-risk-predictor 패턴 동일).
- [ ] **AC-D2:** `force_refresh !== true` 이고 `cache !== null` 이고 `now() - cache.generated_at < 24h` 이고 `cache.meta.locale === locale` 이면 Claude 호출 없이 cache payload 를 `meta.from_cache: true, credits_used: 0` 으로 반환한다.
- [ ] **AC-D3:** `force_refresh === true` 이면 cache 무시하고 Claude 를 재호출한다 (credit 1 소비).
- [ ] **AC-D4:** `cache.meta.locale !== locale` (locale mismatch) 이면 cache 무시하고 Claude 를 재호출한다 (f021 BR-5 동일 패턴).
- [ ] **AC-D5:** Claude 호출 성공 시 `test_plans.ai_env_insights_cache` 와 `ai_env_insights_cached_at = now()` 를 UPDATE 한다.
- [ ] **AC-D6:** cache hit 반환 시에도 `meta.credits_remaining` 은 `getSharedPoolUsage()` 를 기반으로 실시간 계산되어 반환된다 (stale 아님).

### AC-E — 크레딧 / f018 연동

- [ ] **AC-E1:** Claude 호출 성공 후 `consumeAiCredit()` 헬퍼 (f018) 를 정확히 1 회 호출하고, 파라미터는 `{ userId, ownerId, projectId: plan.project_id, mode: 'env-ai-insights', step: 1, creditCost: 1, limit: monthlyLimit, tokensUsed, latencyMs, inputData: { plan_id, total_tcs, total_envs, overall_pass_rate, executed_count, locale }, outputData: result }` 이다.
- [ ] **AC-E2:** `consumeAiCredit()` 이 `allowed: false, reason: 'quota_exceeded'` 반환 (race-lost) 시 429 `{ error: 'monthly_limit_reached', ...AI payload 보존, meta: { rate_limited_post_check: true, credits_logged: false } }` 를 반환한다 (milestone-risk-predictor AC-15 동일 패턴).
- [ ] **AC-E3:** `consumeAiCredit()` 이 `ConsumeAiCreditError` throw (DB error) 시 AI payload 는 보존하고 `meta.credits_logged: false, meta.error: 'credit_log_failed'` 로 200 응답한다 (f018 AC-14 동일 패턴).
- [ ] **AC-E4:** `consumeAiCredit()` 성공 시 `meta.credits_used = 1, meta.log_id = <uuid>, meta.credits_remaining = limit - used` 로 200 응답한다.
- [ ] **AC-E5:** pre-flight `PLAN_LIMITS[tier]` quota 체크가 유지된다 (monthlyLimit !== -1 && used + 1 > monthlyLimit → 429 `monthly_limit_reached`).
- [ ] **AC-E6:** cache hit / `too_little_data` 분기에서는 `consumeAiCredit()` 을 호출하지 않고 `meta.credits_used: 0` 으로 응답한다.
- [ ] **AC-E7:** `ai_generation_logs` 테이블에 insert 된 row 의 `mode` 컬럼 값은 정확히 `'env-ai-insights'` 이고 `step = 1` 이다.

### AC-F — Frontend hook

- [ ] **AC-F1:** 훅 `useEnvAiInsights(planId: string | null, locale: SupportedLocale)` 가 `src/hooks/useEnvAiInsights.ts` 에 export 되어 있다.
- [ ] **AC-F2:** 훅은 `useQuery` 기반이고 `queryKey = ['env-ai-insights', planId, locale]`, `enabled: false` 로 자동 실행되지 않는다 (버튼 클릭 시에만 `refetch()` / 별도 mutation 으로 호출).
- [ ] **AC-F3:** 훅은 `{ data: EnvAiInsightsResult | null, isLoading: boolean, error: Error | null, regenerate: (forceRefresh: boolean) => Promise<void>, isFromCache: boolean, creditsUsed: number, creditsRemaining: number }` 를 반환한다.
- [ ] **AC-F4:** 훅 내부에서 `invokeEdge('env-ai-insights', { body: { plan_id, force_refresh, locale } })` 로 Edge Function 을 호출한다 (ES256 호환).
- [ ] **AC-F5:** 호출 성공 시 `showAiCreditToast(showToast, t, response)` 를 호출해 credits_used 토스트를 띄운다.
- [ ] **AC-F6:** 호출 성공 시 `useAiFeature('environment_ai_insights').refetch()` 를 호출해 remaining credits 를 갱신한다.
- [ ] **AC-F7:** 에러 응답 (`error: 'tier_too_low'` / `'monthly_limit_reached'` / `'forbidden'` / `'ai_timeout'` / `'too_little_data'` — 마지막은 200 이지만 data 표시용) 각각에 대해 i18n 키로 구분된 토스트를 띄운다.

### AC-G — EnvironmentAIInsights props + AI 렌더

- [ ] **AC-G1:** `EnvironmentAIInsights` props 가 확장된다: `{ matrix, aiInsight?, isGenerating?, onRegenerate?, canUseAi?, creditCost?, remainingCredits?, requiresTierName?, onHighlightEnv?, onCreateIssue?, onAssignRun? }` (rule-based 전용 호출도 호환되도록 AI 관련 prop 모두 optional).
- [ ] **AC-G2:** `aiInsight !== null` 이면 기존 `CriticalCard` headline 자리에 `aiInsight.headline` 을 1 순위로 렌더한다 (없으면 fallback 으로 rule-based title).
- [ ] **AC-G3:** `aiInsight.critical_env` + `aiInsight.critical_reason` 이 있으면 `CriticalCard` detail 부분에 `{critical_reason}` 을 렌더한다 (rule-based detail 대체).
- [ ] **AC-G4:** `aiInsight.coverage_gap_tc` + `aiInsight.coverage_gap_reason` 이 있으면 `CoverageGapCard` 에 렌더한다.
- [ ] **AC-G5:** `aiInsight.recommendations` 가 있으면 `QuickStatsCard` 아래에 신규 `RecommendationsCard` 로 `<ul>` 렌더한다 (max 4 개).
- [ ] **AC-G6:** 사이드바 상단에 `AITriggerButton variant="ghost" size="sm" label="Regenerate with AI"` 가 렌더되고, `canUseAi === false` 이면 `disabled` + tooltip 으로 `Requires {requiresTierName} plan` / `No credits left` 를 표시한다.
- [ ] **AC-G7:** `isGenerating === true` 동안 버튼은 `disabled` + spinner 아이콘 + 텍스트 "Generating…" 으로 바뀐다.
- [ ] **AC-G8:** `aiInsight.confidence < 40` 이면 headline 옆에 `"Low confidence · {confidence}%"` 뱃지가 표시된다.
- [ ] **AC-G9:** `aiInsight === null && isGenerating === false` (최초 상태) 이면 기존 rule-based 만 렌더된다 (AI 섹션 숨김) — 회귀 방지.
- [ ] **AC-G10:** `too_little_data === true` 응답 시 AI 영역에 "Not enough data yet — run at least 5 test results to get AI insights." 가 info 색으로 표시되고 credit 은 0 유지.

### AC-H — f002 Create Issue chip

- [ ] **AC-H1:** Critical card 의 "Create issue" 칩 클릭 시 `onCreateIssue()` 콜백이 호출된다 (EnvironmentAIInsights → plan-detail).
- [ ] **AC-H2:** plan-detail 에서 `onCreateIssue` 는 신규 `IssueCreateInlineModal` 을 연다 (`showIssueCreateModal` state).
- [ ] **AC-H3:** 모달에 Jira / GitHub 두 개 탭이 표시되며, 기본 탭은 프로젝트의 `jira_settings` 가 있으면 Jira, 없으면 GitHub, 둘 다 없으면 "Connect an issue tracker first" empty state 와 `/settings?tab=integrations` 링크.
- [ ] **AC-H4:** title 은 `aiInsight?.headline ?? \`Critical env coverage: ${critical.label}\`` 로 pre-fill 된다.
- [ ] **AC-H5:** description/body 는 `aiInsight?.critical_reason + '\n\nRecommendations:\n- ' + aiInsight.recommendations.join('\n- ') + '\n\n—\nContext: Test Plan: {plan.name}\nGenerated by Testably AI'` 로 pre-fill 된다. `aiInsight === null` 이면 rule-based detail 문자열로 fallback.
- [ ] **AC-H6:** "Create" 버튼 클릭 시 Jira 탭이면 `invokeEdge('create-jira-issue', { body: { project_id, summary, description, priority: 'High', labels: ['testably', 'env-coverage'] } })`, GitHub 탭이면 `invokeEdge('create-github-issue', { body: { project_id, title, body, labels: ['testably', 'env-coverage'] } })` 호출.
- [ ] **AC-H7:** 생성 성공 시 모달 닫고 `showToast(t('plan.env.ai.issueCreated', { url }), 'success')` 표시. 응답에 `issue_url` 이 있으면 토스트에 "View issue" 링크를 포함.
- [ ] **AC-H8:** 생성 실패 시 모달 내 에러 배너에 `t('plan.env.ai.issueCreateFailed')` + 원본 에러 메시지를 표시 (모달은 닫지 않음).
- [ ] **AC-H9:** 모달 우측 상단 닫기 버튼 / ESC / 바깥 클릭으로 닫을 수 있다.
- [ ] **AC-H10:** 모달이 열려 있는 동안 Create 버튼은 제출 중이면 `disabled` + "Creating…".

### AC-I — f002 Filter chip

- [ ] **AC-I1:** Critical card 의 "Filter {envName}" 칩 클릭 시 `onHighlightEnv(label: string)` 콜백이 호출된다.
- [ ] **AC-I2:** plan-detail 에 `highlightedEnv: string | null` state 가 추가되고, `onHighlightEnv(label)` 는 `setHighlightedEnv(prev => prev === label ? null : label)` 로 토글한다 (동일 칩 재클릭 → 해제).
- [ ] **AC-I3:** heatmap 의 `columns.map(col => ...)` 렌더 시 `col.env.name === highlightedEnv || col.env.browser_name === highlightedEnv` 이면 column header + 전체 cells 에 `outline: 2px solid var(--primary); outline-offset: -2px;` CSS 를 적용한다.
- [ ] **AC-I4:** 다른 env column 은 `opacity: 0.45` 로 dim 처리되어 대비를 만든다.
- [ ] **AC-I5:** `highlightedEnv !== null` 일 때 heatmap 상단에 "Showing {env} · Clear" pill 이 표시되고, Clear 클릭 시 `setHighlightedEnv(null)` 호출.
- [ ] **AC-I6:** `highlightedEnv === null` 상태에서는 opacity 나 outline 이 적용되지 않아야 한다 (회귀 방지).
- [ ] **AC-I7:** `aiInsight.critical_env` 가 `browser_cross_os_low.label` (= browser name) 인 경우에도 매칭되어야 한다 (AC-I3 의 `browser_name` 비교로 커버됨).

### AC-J — f002 Assign Run chip

- [ ] **AC-J1:** Coverage Gap card 의 "Assign run" 칩 클릭 시 `onAssignRun()` 콜백이 호출된다.
- [ ] **AC-J2:** plan-detail 에서 `onAssignRun` 은 runs 섹션 DOM (`id="plan-runs-section"`) 을 `scrollIntoView({ behavior: 'smooth', block: 'start' })` 한다.
- [ ] **AC-J3:** 스크롤 후 `showToast(t('plan.env.ai.assignRunToast', { tc: coverageGap.tcTitle }), 'info', { duration: 6000 })` 를 표시한다 (6 초).
- [ ] **AC-J4:** runs 섹션이 DOM 에 없거나 null 이면 fallback 으로 "Runs section not found — navigate to the Runs tab" 에러 토스트를 띄운다 (회귀 방어).
- [ ] **AC-J5:** AddRunModal 자동 오픈은 **OOS** — 이번 스코프에서 구현하지 않는다 (§9-3).

### AC-K — i18n

- [ ] **AC-K1:** `src/i18n/local/en/environments.ts` 의 `heatmap.ai` 네임스페이스에 아래 키가 추가되어 있다 (EN 값 원문):
  - `regenerate: 'Regenerate with AI'`
  - `regenerating: 'Generating…'`
  - `ai.confidence: '{{rate}}% confidence'`
  - `ai.lowConfidence: 'Low confidence · {{rate}}%'`
  - `ai.tooLittleData: 'Not enough data yet — run at least 5 test results to get AI insights.'`
  - `ai.requiresTier: 'Requires {{plan}} plan'`
  - `ai.noCredits: 'No AI credits left this month'`
  - `ai.recommendationsTag: 'Recommendations'`
  - `ai.cacheBadge: 'Cached'`
  - `toast.generated: 'AI insights generated'`
  - `toast.regenerated: 'AI insights refreshed'`
  - `toast.tierTooLow: 'Starter plan required for AI insights'`
  - `toast.limitReached: 'Monthly AI credit limit reached'`
  - `toast.aiTimeout: 'AI analysis timed out. Try again.'`
- [ ] **AC-K2:** `src/i18n/local/ko/environments.ts` 의 동일 위치에 동일 키가 한국어 번역으로 존재한다 (예: `regenerate: 'AI로 다시 분석'`, `regenerating: '분석 중…'`, `ai.tooLittleData: '데이터가 부족합니다 — 최소 5건의 테스트 결과가 필요합니다.'` 등).
- [ ] **AC-K3:** 신규 f002 chip 용 키 `plan.env.ai.issueCreated / issueCreateFailed / assignRunToast / issueModalTitle / issueModalTabJira / issueModalTabGithub / issueModalCreate / issueModalCancel / issueModalNoIntegration` 이 `src/i18n/local/{en,ko}/` 해당 네임스페이스 (plan-detail 은 `projects` 또는 신규 `plan` 네임스페이스) 에 EN / KO parity 로 존재한다.
- [ ] **AC-K4:** 기존 `heatmap.ai.toast.createIssue / filter / assignRun` ("Coming soon") 키는 삭제 또는 deprecate 주석 처리한다 (AC-V13 해소).
- [ ] **AC-K5:** EN / KO 키 개수 / 구조가 정확히 동일하다 (`diff -u <(jq 'paths' en.json) <(jq 'paths' ko.json)` 차이 없음).

### AC-L — 테스트

- [ ] **AC-L1:** Edge Function Deno 테스트 `supabase/functions/env-ai-insights/index.test.ts` 가 추가되어 아래 케이스를 커버한다:
  - (a) plan_id 없음 → 400
  - (b) unauthenticated → 401
  - (c) plan not found → 404
  - (d) Viewer role → 403 forbidden
  - (e) Free tier → 403 tier_too_low
  - (f) executed < 5 → 200 `too_little_data: true, credits_used: 0`
  - (g) cache hit within 24h same locale → from_cache: true, credits_used: 0
  - (h) force_refresh: true → Claude 재호출
  - (i) locale mismatch → Claude 재호출
  - (j) Claude 429 → 504/429 error, credit 미차감
  - (k) Claude malformed JSON → 422, credit 미차감
  - (l) happy path → consumeAiCredit 호출 + cache UPDATE + 200 with meta.log_id
  - (m) race-lost (consumeAiCredit allowed:false) → 429 + AI payload 보존
- [ ] **AC-L2:** Frontend vitest `src/hooks/useEnvAiInsights.test.ts` 가 mock `invokeEdge` 로 아래를 커버한다:
  - (a) regenerate(false) 성공 → data / isFromCache 업데이트
  - (b) too_little_data 응답 → data.too_little_data === true 유지, 토스트 info 발생
  - (c) tier_too_low 에러 → error 세팅 + 토스트
  - (d) monthly_limit_reached → error + 토스트
- [ ] **AC-L3:** `src/components/EnvironmentAIInsights.test.tsx` 가 추가되어 AI prop 유/무에 따른 렌더 분기 (AC-G2/G3/G4/G9/G10) 를 검증한다 (React Testing Library).
- [ ] **AC-L4:** 기존 `src/lib/environmentInsights.test.ts` 는 회귀 없이 green 이다 (rule-based 로직 변경 없음).
- [ ] **AC-L5:** `src/components/IssueCreateInlineModal.test.tsx` 가 추가되어 Jira / GitHub 탭 분기, pre-fill, 제출 성공/실패 플로우를 커버한다.
- [ ] **AC-L6:** CI 에서 `deno test --allow-all supabase/functions/env-ai-insights/` 와 `pnpm test` 모두 green.

### AC-M — Out of Scope 명시

- [ ] **AC-M1:** 본 Dev Spec §11 에 OOS 10 개 (Research §4 에서 가져온) 가 체크박스로 나열되어 있고, 구현 시 해당 기능에 대한 TODO / 주석 링크가 존재한다.

---

## 4. 기능 상세

### 4-1. 동작 흐름

#### Flow A — f001 AI Insights Happy Path

1. 유저가 plan-detail 페이지의 Environments 탭에 진입 → `EnvironmentAIInsights` 사이드바가 rule-based 카드만 렌더 (AI 섹션 hidden).
2. 사이드바 상단의 "Regenerate with AI · 1 credit" 버튼 클릭.
3. 프론트: `isGenerating = true`, 스피너 표시. `useEnvAiInsights.regenerate(false)` 호출.
4. Edge Function `env-ai-insights`:
   - auth / role / tier gate 통과
   - cache 존재 + fresh + locale match → cache 반환 (credits_used: 0)
   - 아니면 Claude Haiku 호출 → 파싱 → cache UPDATE → `consumeAiCredit()` (credits_used: 1) → 200 반환
5. 프론트: `aiInsight` state 업데이트 → AI headline / reason / recommendations 렌더. `showAiCreditToast` 로 "1 AI credit used" 토스트. `useAiFeature.refetch()` 로 remaining 갱신.

#### Flow B — f002-a Create Issue (happy)

1. AI 렌더된 Critical card 의 "Create issue" 칩 클릭.
2. plan-detail 의 `showIssueCreateModal = true`. 인라인 모달 오픈.
3. 모달: Jira 탭(기본) / GitHub 탭. title / description 이 AI payload 로 pre-fill.
4. 유저가 수정 후 "Create" 클릭.
5. `invokeEdge('create-jira-issue', { body: { ... } })` 호출 → 200 + `{ issue_url }` 반환.
6. 모달 닫기. success 토스트 "Issue created · View issue" (링크 포함).

#### Flow C — f002-b Filter

1. Critical card "Filter {env}" 칩 클릭.
2. plan-detail `highlightedEnv = env`. 히트맵에서 해당 column outline + 나머지 dim.
3. 히트맵 상단 "Showing {env} · Clear" pill 표시.
4. 동일 칩 재클릭 또는 Clear 클릭 → `highlightedEnv = null` → 원상 복구.

#### Flow D — f002-c Assign Run

1. Coverage Gap card "Assign run" 칩 클릭.
2. 페이지가 runs 섹션으로 smooth scroll.
3. 6 초짜리 info 토스트 "Add a run targeting {TC title} to close the coverage gap".

#### Alternative Flows

- **AF-1 (f001):** Free 유저 → 버튼 disabled + tooltip "Requires Starter plan". 클릭 시 `/settings?tab=billing` 로 navigate (기존 upsell 패턴).
- **AF-2 (f001):** monthly limit 소진 → 버튼은 활성이되 클릭 시 즉시 error 토스트 "Monthly AI credit limit reached. Upgrade plan?" + Upgrade 링크.
- **AF-3 (f001):** executed < 5 → Claude 호출 없음. AI 영역에 "Not enough data yet" info 뱃지 표시. credit 0.
- **AF-4 (f002-a):** Jira / GitHub 둘 다 연결 안 됨 → 모달 empty state "Connect an issue tracker first" + Settings 링크 버튼.

#### Error Flows

- **EF-1:** Claude timeout (25s) → 504 → 토스트 "AI analysis timed out. Try again." — credit 0.
- **EF-2:** Claude 429 / upstream rate limit → 429 → 토스트 "Claude is rate-limited. Try again soon." — credit 0.
- **EF-3:** Claude malformed JSON → 422 → 토스트 "AI returned invalid data. Try again." — credit 0.
- **EF-4:** `consumeAiCredit` race-lost → 429 + AI payload 보존. 프론트: 토스트 "Monthly limit reached but your insight is generated below" + 회색 처리된 payload 표시 (credit_logged: false 뱃지).
- **EF-5:** `consumeAiCredit` DB error → 200 with `credits_logged: false`. 프론트: 평소대로 렌더 + 콘솔 warn (유저 혼란 방지).
- **EF-6 (f002-a):** Edge Function 이슈 생성 실패 (Jira/GitHub API error) → 모달 내 에러 배너 + 원문 에러 표시. 모달 유지.
- **EF-7 (f002-c):** runs 섹션 DOM 없음 → error 토스트 + 콘솔 warn. 페이지 스크롤 시도하지 않음.

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | AI 호출은 1 call = 1 credit (flat). creditCost 차등 없음. | CEO 결정 2026-04-24 |
| BR-2 | 캐시 TTL = 24h. locale mismatch 또는 force_refresh 시 무효화. | milestone-risk-predictor 동일 |
| BR-3 | 최소 데이터 임계값: 총 executed results < 5 → Claude skip. too_little_data 반환. | credit 0 |
| BR-4 | Role gate: Manager (level 4) 이상만 호출 가능. Viewer/Tester/Guest 는 호출 불가. | milestone-risk-predictor 동일 |
| BR-5 | Tier gate: Starter (tier 3) 이상만 호출 가능. coverage_gap 과 동일 레벨. | AI_FEATURES.minTier=3 |
| BR-6 | Rate limit: 5 req/min per user. Token bucket (capacity 5, refill 1/12s). | shared helper 재사용 |
| BR-7 | Filter chip 은 toggle — 동일 env 재클릭 시 해제. 다른 env 클릭 시 직접 교체. | §4-1 Flow C |
| BR-8 | rule-based 와 AI insights 는 additive — AI 가 rule-based 를 제거하지 않고, AI null 이면 rule-based 만 표시. | AC-G9 |
| BR-9 | AI 호출의 `inputData` 는 Claude 에 들어간 핵심 숫자 snapshot 만 저장 (test_case_id / user PII 없음). | promptSanitize + input_snapshot |
| BR-10 | 인라인 Issue 모달은 "신규 공유 컴포넌트" 가 아니라 plan-detail 범위 로컬 컴포넌트. 다른 페이지에서 재사용 금지 (§9-4 OOS). | |

### 4-3. 권한 (RBAC)

| 역할 | Env AI Insights 조회 (rule-based) | AI Regenerate 호출 | Filter chip | Create Issue chip | Assign Run chip |
|------|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tester | ✓ | ✗ (403) | ✓ | ✓ | ✓ |
| Viewer | ✓ | ✗ (403) | ✓ | ✗ (필요 권한 없음) | ✗ |
| Guest | ✗ | ✗ | ✗ | ✗ | ✗ |

> Create Issue chip 은 Jira/GitHub Edge Function 이 자체 RBAC (Tester+) 을 갖고 있으므로 그 정책을 그대로 계승.

### 4-4. 플랜별 제한

| 플랜 | AI Regenerate | Monthly credits (shared pool) | 초과 시 |
|------|---|---|---|
| Free | ✗ | 3 | Tier gate 403 `tier_too_low` → Upgrade 유도 |
| Hobby | ✗ | 15 | Tier gate 403 → Upgrade 유도 |
| Starter | ✓ | 30 | monthly_limit_reached 429 → Upgrade 유도 |
| Professional | ✓ | 150 | monthly_limit_reached 429 → Upgrade 유도 |
| Enterprise S/M/L | ✓ | ∞ (-1) | - (무제한) |

> f002 Chip workflow 자체는 모든 유료 플랜에서 제한 없음. Create Issue 는 Jira / GitHub 통합 설정이 된 프로젝트에서만 활성. Free 플랜은 통합 연결은 되더라도 Issue 생성 호출 자체는 가능 (기존 create-jira-issue / create-github-issue 가 그렇게 동작).

---

## 5. 데이터 설계

### 신규 테이블
없음.

### 기존 테이블 변경

| 테이블 | 변경 내용 | 마이그레이션 |
|--------|---------|---|
| `test_plans` | `ai_env_insights_cache JSONB NULL` 추가 | `20260424_f001_ai_env_insights_cache.sql` |
| `test_plans` | `ai_env_insights_cached_at TIMESTAMPTZ NULL` 추가 | 상동 |

### 마이그레이션 SQL 초안

```sql
-- ============================================================
-- f001 — Environment AI Insights 캐시 컬럼
-- 24h TTL, env-ai-insights Edge Function 이 read/write
-- 관련 스펙: docs/specs/dev-spec-f001-f002-env-ai-insights.md §5
-- ============================================================

ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS ai_env_insights_cache JSONB NULL;

ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS ai_env_insights_cached_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN test_plans.ai_env_insights_cache IS
  'Claude-generated env×TC coverage insights. Structure: { generated_at, stale_after, headline, critical_env, critical_reason, coverage_gap_tc, coverage_gap_reason, recommendations[], confidence, meta: { model, tokens_used, latency_ms, locale, input_snapshot } }. TTL 24h — stale if generated_at < now() - 24h. NULL = no analysis yet.';

COMMENT ON COLUMN test_plans.ai_env_insights_cached_at IS
  'Denormalized timestamp of ai_env_insights_cache.generated_at for index-only scans. Updated alongside ai_env_insights_cache.';

-- 부분 인덱스 — cache 있는 row 에 대한 staleness 체크 빠르게
CREATE INDEX IF NOT EXISTS idx_test_plans_ai_env_insights_cached_at
  ON test_plans (ai_env_insights_cached_at)
  WHERE ai_env_insights_cache IS NOT NULL;

-- RLS 정책 변경 없음. 기존 test_plans RLS 를 그대로 상속:
--   SELECT: project_members 소속 유저
--   UPDATE: role IN ('owner','admin','manager','tester')
-- Edge Function 은 SUPABASE_SERVICE_ROLE_KEY 로 RLS bypass UPDATE.
```

### RLS 정책

변경 없음. `test_plans` 의 기존 RLS 가 JSONB 컬럼에 그대로 적용된다. Edge Function 은 service-role 키를 사용하므로 RLS 를 bypass 한다 (선례: `milestones.ai_risk_cache`).

### 캐시 payload 타입 (TypeScript)

```ts
// supabase/functions/env-ai-insights/types.ts (Deno) + src/types/envAiInsights.ts (frontend mirror)

export interface EnvAiInsightsResult {
  headline: string | null;
  critical_env: string | null;
  critical_reason: string | null;
  coverage_gap_tc: string | null;
  coverage_gap_reason: string | null;
  recommendations: string[];
  confidence: number;              // 0..100
  too_little_data?: boolean;       // true 이면 나머지 전부 null
  generated_at: string;            // ISO
  meta: {
    from_cache: boolean;
    credits_used: 0 | 1;
    credits_remaining: number;     // -1 = unlimited
    monthly_limit: number;         // -1 = unlimited
    tokens_used: number;
    latency_ms: number;
    log_id?: string | null;
    rate_limited_post_check?: boolean;
    credits_logged?: boolean;      // false 시 f018 fallback
  };
}
```

---

## 6. API 설계

### Edge Function: `POST /functions/v1/env-ai-insights`

**Headers:**
- `Authorization: Bearer <SUPABASE_ANON_KEY>` (gateway 용, HS256)
- `x-user-token: <user JWT>` (ES256)
- `Content-Type: application/json`

**Request:**
```json
{
  "plan_id": "uuid",
  "force_refresh": false,
  "locale": "en"
}
```

**Response 200 (happy / from_cache / too_little_data):**
```json
{
  "headline": "Safari 17 fails 63% of critical TCs — investigate before release.",
  "critical_env": "Safari 17 on macOS 14",
  "critical_reason": "Safari 17 shows 37% pass rate across 11 executed TCs, the lowest among 5 envs. 4 of 7 critical TCs fail here.",
  "coverage_gap_tc": "TC-142: Payment checkout — discount code",
  "coverage_gap_reason": "Untested in 4 of 5 envs. Critical priority.",
  "recommendations": [
    "Assign a run targeting Safari 17 with the 4 failing critical TCs by EOD.",
    "Schedule TC-142 on Chrome/Firefox in the next sprint."
  ],
  "confidence": 78,
  "generated_at": "2026-04-24T08:15:32.991Z",
  "meta": {
    "from_cache": false,
    "credits_used": 1,
    "credits_remaining": 24,
    "monthly_limit": 30,
    "tokens_used": 812,
    "latency_ms": 3241,
    "log_id": "af13e8d2-…"
  }
}
```

**Response errors:**
- 400 `{ error: 'bad_request', detail: 'plan_id is required' }`
- 401 `{ error: 'unauthorized' }`
- 403 `{ error: 'forbidden', detail: 'Only Manager or above can trigger AI analysis.' }`
- 403 `{ error: 'tier_too_low', requiredTier: 3, upgradeUrl: '...' }`
- 404 `{ error: 'not_found' }`
- 422 `{ error: 'ai_parse_failed' }`
- 429 `{ error: 'rate_limited', retry_after_sec, ...rateLimitResponse 포맷 }`
- 429 `{ error: 'monthly_limit_reached', used, limit, upgradeUrl }` (pre-flight)
- 429 `{ error: 'monthly_limit_reached', ...AI payload, meta: { rate_limited_post_check: true, credits_logged: false } }` (race-lost)
- 429 `{ error: 'upstream_rate_limit', retry_after_sec: 60 }`
- 500 `{ error: 'internal', detail: '...' }`
- 504 `{ error: 'ai_timeout' }`

### Supabase Client (frontend)

프런트는 Edge Function 만 호출. DB 에 직접 쓰지 않음 (캐시 UPDATE 는 Edge Function service_role 전용).

```ts
// src/hooks/useEnvAiInsights.ts (요약)
const { data, error } = await invokeEdge<EnvAiInsightsResult>('env-ai-insights', {
  body: { plan_id: planId, force_refresh: forceRefresh, locale },
});
```

### 재사용: Jira / GitHub Issue Edge Functions

f002-a Create Issue chip 은 **신규 Edge Function 을 만들지 않고** 기존 두 개를 그대로 호출:
- `POST /functions/v1/create-jira-issue` — `{ project_id, summary, description, priority, labels, assignee?, components?, fieldMappings? }`
- `POST /functions/v1/create-github-issue` — `{ project_id, title, body, labels, assignee? }`

응답 포맷은 두 함수의 기존 스펙을 그대로 따른다 (`{ issue_url, issue_key }` 류).

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260424_f001_ai_env_insights_cache.sql` | DB 마이그레이션 (§5) |
| `supabase/functions/env-ai-insights/index.ts` | Edge Function 본체 |
| `supabase/functions/env-ai-insights/config.toml` | Edge Function 설정 (`verify_jwt = false`) |
| `supabase/functions/env-ai-insights/index.test.ts` | Deno 테스트 (AC-L1) |
| `src/hooks/useEnvAiInsights.ts` | React Query 기반 훅 (AC-F) |
| `src/hooks/useEnvAiInsights.test.ts` | 훅 vitest (AC-L2) |
| `src/types/envAiInsights.ts` | `EnvAiInsightsResult` 공유 타입 |
| `src/components/IssueCreateInlineModal.tsx` | f002-a 인라인 모달 (plan-detail 로컬) |
| `src/components/IssueCreateInlineModal.test.tsx` | vitest (AC-L5) |
| `src/components/EnvironmentAIInsights.test.tsx` | AI prop 렌더 테스트 (AC-L3) |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `supabase/functions/_shared/ai-config.ts` | `AI_FEATURES.environment_ai_insights` 추가 (§AC-A1) |
| `src/hooks/useAiFeature.ts` | `AI_FEATURES.environment_ai_insights` 미러 추가 (§AC-A2) |
| `src/components/EnvironmentAIInsights.tsx` | props 확장 + AI 렌더 분기 + Regenerate 버튼 + RecommendationsCard (§AC-G) |
| `src/pages/plan-detail/page.tsx` | `useEnvAiInsights` 연결, `highlightedEnv` state, heatmap column highlight CSS, `IssueCreateInlineModal` 오픈, runs 섹션 id 추가, scrollIntoView 핸들러 (§AC-H / I / J) |
| `src/i18n/local/en/environments.ts` | AI 관련 신규 키 추가 (§AC-K1), `heatmap.ai.toast.*` "Coming soon" 키 deprecate |
| `src/i18n/local/ko/environments.ts` | 동일 키 KO (§AC-K2) |
| `src/i18n/local/en/projects.ts` | `plan.env.ai.*` (issue modal / assign run toast) 키 추가 |
| `src/i18n/local/ko/projects.ts` | 동일 키 KO |

### 변경 없음 (참조만)

- `supabase/functions/milestone-risk-predictor/index.ts` — 패턴 레퍼런스
- `supabase/functions/_shared/ai-usage.ts` — `consumeAiCredit` / `getEffectiveTier` 재사용
- `supabase/functions/_shared/rate-limit.ts` — `checkRateLimit` / `rateLimitResponse` 재사용
- `supabase/functions/_shared/localePrompt.ts` — `resolveLocale` / `maybeAppendLocaleInstruction` 재사용
- `supabase/functions/_shared/promptSanitize.ts` — `sanitizeShortName` / `sanitizeTitle` 재사용
- `supabase/functions/create-jira-issue/index.ts` — 그대로 호출
- `supabase/functions/create-github-issue/index.ts` — 그대로 호출
- `src/lib/environmentInsights.ts` — rule-based 로직 변경 없음 (AC-L4 회귀)

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 네트워크 끊김 (브라우저 offline) | `invokeEdge` throw → 훅이 `error` 세팅 + 토스트 "Network error. Check your connection." |
| 동시에 두 유저가 같은 plan 의 Regenerate 클릭 | 두 번째 호출은 캐시 hit (24h TTL 내) → credit 0. race 조건 없음. 만일 `force_refresh` 로 동시 호출되면 마지막 UPDATE 가 win (last-write-wins — milestone-risk-predictor 와 동일) |
| 동일 유저가 5 초 내 여러 번 클릭 | `isGenerating === true` 동안 버튼 disabled (AC-G7). 서버 rate limit 5 req/min fallback (AC-C8) |
| plan 에 env 가 0 개 | `total_envs === 0` → Claude skip, `too_little_data: true` 반환 (AC-C10 변형) |
| plan 에 TC 가 0 개 | `total_tcs === 0` → Claude skip, `too_little_data: true` (AC-C10 변형) |
| 권한 없는 접근 (URL 직접 호출) | Edge Function 에서 RBAC + tier gate 로 403. 프런트는 버튼 자체가 `disabled` 라 UI 진입 불가 |
| Claude 가 JSON 이 아닌 마크다운 wrap 응답 | ```json ... ``` 정규식 fallback 파싱 (milestone-risk-predictor 패턴). 실패 시 422 |
| Claude recommendations 가 0 개 | 파싱 후 `recommendations.length === 0` 이어도 422 throw 하지 않고 빈 배열로 렌더. headline 이 있으면 유효한 응답으로 간주 |
| 매우 긴 TC 제목 (> 200 자) | prompt 내 `sanitizeTitle()` 으로 100 자 truncate |
| Jira / GitHub 둘 다 미연결 (f002-a) | 모달 empty state + Settings 링크 (AC-H3) |
| Jira 연결 실패 토큰 만료 (f002-a) | 모달 내 에러 배너 "Jira authentication expired. Reconnect in Settings." + Settings 링크 |
| 다른 env 칩 클릭 중 (f002-b) | 새 env 로 교체 (toggle 아닌 replace — 명확성). 동일 env 재클릭은 toggle off |
| runs 섹션이 collapse 되어 있음 (f002-c) | `scrollIntoView` 는 여전히 동작. 토스트가 "Expand the Runs section" 힌트 포함 (optional — OOS §9-9) |
| locale 변경 직후 regenerate | 캐시 locale mismatch → Claude 재호출 (credit 1) |
| `ai_env_insights_cache` JSONB 구조가 구버전 (마이그레이션 후 첫 read) | `cache.headline` undefined → fallback rendering 후 force_refresh 권장 (1 회성 비용 수용) |

---

## 9. Out of Scope (이번에 안 하는 것)

> Research §4 OOS 10 개 + 추가 식별 항목. 구현 시 관련 코드에 `// OOS §9-N` 주석을 달아 추적한다.

- [ ] **§9-1** Critical env threshold 자동 튜닝 (rule-based 는 40% / 60% / 50% 하드코딩 유지)
- [ ] **§9-2** 다중 plan / workspace 집계 (현재는 plan 단위만)
- [ ] **§9-3** Slack / Teams / Discord 알림 연동
- [ ] **§9-4** `IssueCreateModal` 공유 컴포넌트 추출 (FocusMode 와 공유) — f002-a 는 plan-detail 로컬 구현
- [ ] **§9-5** AI insight 이력 히스토리 뷰 (현재는 24h cache 1 건만)
- [ ] **§9-6** Priority 기반 env 가중치 (critical TC 많은 env 우선)
- [ ] **§9-7** 실시간 스트리밍 응답 (SSE) — 현재는 단일 response
- [ ] **§9-8** 자동 트리거 (실행 완료 후 AI 자동 재생성) — 수동 버튼만
- [ ] **§9-9** AddRunModal 자동 오픈 (Assign Run chip) — scrollIntoView + 토스트까지
- [ ] **§9-10** 멀티 언어 프롬프트 A/B 테스트 — EN/KO suffix 로만 지원

---

## 10. i18n 키

### environments 네임스페이스 확장 (`heatmap.ai.*`)

| 키 | EN | KO |
|----|----|----|
| `heatmap.ai.regenerate` | "Regenerate with AI" | "AI로 다시 분석" |
| `heatmap.ai.regenerating` | "Generating…" | "분석 중…" |
| `heatmap.ai.cacheBadge` | "Cached" | "캐시됨" |
| `heatmap.ai.confidence` | "{{rate}}% confidence" | "신뢰도 {{rate}}%" |
| `heatmap.ai.lowConfidence` | "Low confidence · {{rate}}%" | "낮은 신뢰도 · {{rate}}%" |
| `heatmap.ai.tooLittleData` | "Not enough data yet — run at least 5 test results to get AI insights." | "데이터가 부족합니다 — 최소 5건의 테스트 결과가 필요합니다." |
| `heatmap.ai.requiresTier` | "Requires {{plan}} plan" | "{{plan}} 플랜 이상 필요" |
| `heatmap.ai.noCredits` | "No AI credits left this month" | "이번 달 AI 크레딧이 남아있지 않습니다" |
| `heatmap.ai.recommendationsTag` | "Recommendations" | "추천 액션" |
| `heatmap.ai.toast.generated` | "AI insights generated" | "AI 인사이트가 생성되었습니다" |
| `heatmap.ai.toast.regenerated` | "AI insights refreshed" | "AI 인사이트가 갱신되었습니다" |
| `heatmap.ai.toast.tierTooLow` | "Starter plan required for AI insights" | "AI 인사이트는 Starter 플랜 이상에서 사용 가능합니다" |
| `heatmap.ai.toast.limitReached` | "Monthly AI credit limit reached" | "이번 달 AI 크레딧 한도에 도달했습니다" |
| `heatmap.ai.toast.aiTimeout` | "AI analysis timed out. Try again." | "AI 분석 시간이 초과되었습니다. 다시 시도해주세요." |
| `heatmap.ai.toast.networkError` | "Network error. Check your connection." | "네트워크 오류. 연결을 확인해주세요." |

### projects 네임스페이스 확장 (`plan.env.ai.*`)

| 키 | EN | KO |
|----|----|----|
| `plan.env.ai.issueModalTitle` | "Create issue from AI insight" | "AI 인사이트로 이슈 생성" |
| `plan.env.ai.issueModalTabJira` | "Jira" | "Jira" |
| `plan.env.ai.issueModalTabGithub` | "GitHub" | "GitHub" |
| `plan.env.ai.issueModalTitleField` | "Title" | "제목" |
| `plan.env.ai.issueModalDescriptionField` | "Description" | "설명" |
| `plan.env.ai.issueModalCreate` | "Create issue" | "이슈 생성" |
| `plan.env.ai.issueModalCreating` | "Creating…" | "생성 중…" |
| `plan.env.ai.issueModalCancel` | "Cancel" | "취소" |
| `plan.env.ai.issueModalNoIntegration` | "Connect an issue tracker first." | "이슈 트래커를 먼저 연결해주세요." |
| `plan.env.ai.issueModalGoSettings` | "Open Settings" | "설정 열기" |
| `plan.env.ai.issueCreated` | "Issue created" | "이슈가 생성되었습니다" |
| `plan.env.ai.issueCreatedWithLink` | "Issue created · View" | "이슈가 생성되었습니다 · 보기" |
| `plan.env.ai.issueCreateFailed` | "Failed to create issue: {{detail}}" | "이슈 생성 실패: {{detail}}" |
| `plan.env.ai.assignRunToast` | "Add a run targeting \"{{tc}}\" to close the coverage gap." | "\"{{tc}}\" 커버리지를 채울 수 있도록 실행을 추가해주세요." |
| `plan.env.ai.filterActive` | "Showing {{env}}" | "{{env}} 필터 중" |
| `plan.env.ai.filterClear` | "Clear" | "해제" |
| `plan.env.ai.runsSectionNotFound` | "Runs section not found — navigate to the Runs tab." | "실행 섹션을 찾을 수 없습니다 — Runs 탭으로 이동해주세요." |

---

## 11. 롤아웃 계획

**Flag 없이 즉시 ship (additive).** 기존 rule-based 는 그대로 유지되고, AI 는 버튼을 눌러야만 호출되므로 UX 회귀 위험이 없다. 유저가 버튼을 모르면 rule-based 만 보이고 끝.

단계:
1. 마이그레이션 `20260424_f001_ai_env_insights_cache.sql` 먼저 배포 (컬럼 nullable, idempotent).
2. Edge Function `env-ai-insights` 배포 + config 동기 + `AI_FEATURES.environment_ai_insights` 추가.
3. Frontend 배포 (hook + component prop + plan-detail wiring).
4. QA (@qa) 검수 → AC 체크리스트 통과 확인.
5. Announcement: `docs/marketing/` 에 릴리스 노트 (@marketer 라우팅).

Rollback: Edge Function 비활성화 + frontend 의 `AITriggerButton` 을 `null` 렌더로 조건 분기 (환경 변수 `VITE_ENV_AI_INSIGHTS_ENABLED=false` 추가는 이번 스코프 아님 — 문제 발생 시 hotfix PR 로 간단 처리).

---

## 12. 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-A1 ~ AC-M1, 총 90+ 개)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (§5)
- [x] RLS 정책이 정의되었는가 (기존 test_plans RLS 상속 명시)
- [x] 플랜별 제한이 명시되었는가 (§4-4)
- [x] RBAC 권한 매트릭스가 있는가 (§4-3)
- [x] 변경 파일 목록이 구체적인가 (§7, 모두 실제 경로)
- [x] 엣지 케이스가 식별되었는가 (§8, 15 개)
- [x] Out of Scope 이 명시되었는가 (§9, 10 개)
- [x] i18n 키가 en/ko 둘 다 있는가 (§10)
- [ ] 관련 디자인 명세가 Approved 상태인가 → @designer 라우팅 필요 (`design-spec-f001-f002-env-ai-insights.md`)
