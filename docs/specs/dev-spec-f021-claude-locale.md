# Dev Spec: f021 — Claude 다국어 출력 (KO locale 시 한국어 응답)

> **작성일:** 2026-04-21
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **우선순위:** P2 (feature_list.json f021)
> **Impact:** Medium / Effort: Small
> **관련 디자인:** N/A — UI 변화 없음 (본 문서 §11 참조)
> **의존성:** f017 (promptSanitize) 와 **연계 전제**. 본 티켓은 f017 위에 얹는다.

---

## 1. 개요

- **문제:** 현재 모든 AI 기능(Milestone Risk, Plan Assistant, Risk Predictor, Run Summary, Coverage Gap, Flaky Analysis, Requirement Suggest, TC Generation)이 사용자 locale 과 무관하게 **항상 영어**로 응답한다. 한국어 사용자가 AI 결과를 읽을 때 즉시 이해하기 어렵고, 팀 내부 공유 시 재번역 부담이 발생한다.
- **해결:** 클라이언트가 현재 `i18n.language` (`ko` | `en`) 를 Edge Function body 에 `locale` 파라미터로 전달하고, Edge Function 은 `locale === 'ko'` 일 때 Claude system prompt 마지막에 한국어 응답 지시 블록을 주입한다. JSON 구조(키 이름)는 영문 유지, value 만 한국어로 생성되어 기존 파서/UI 호환성을 유지한다.
- **성공 지표:**
  1. KO 로케일 사용자의 AI 응답에서 본문(summary/bullets/recommendations/narrative/rootCause 등 자연어 필드)의 **90% 이상이 한국어**로 렌더됨 (수동 샘플링 10건, 8건 이상 통과).
  2. EN 로케일 사용자의 응답 품질/포맷은 **회귀 없음** (기존 vitest 및 JSON 파서 통과율 100%).
  3. AI 호출 Edge Function 8개 전체에 `locale` 파라미터가 일관 전달됨 (grep 으로 호출 사이트 검증).

---

## 2. 유저 스토리

- As a **한국어 사용자 (Owner/Admin/Manager/Tester)**, I want to **AI Milestone Risk / Plan Assistant / Run Summary 등의 결과가 한국어로 표시되는 것을**, so that **번역 없이 즉시 읽고 팀에 공유할 수 있다**.
- As a **다국어 팀의 QA Lead**, I want to **각 팀원의 UI 언어 설정에 따라 같은 데이터에서 각기 다른 언어 응답을 받는 것을**, so that **팀원 개개인이 자신의 언어로 리스크를 이해하고 의사결정할 수 있다**.
- As a **영어 사용자**, I want to **내 EN 응답이 기존과 동일한 품질/포맷으로 유지되는 것을**, so that **기존 워크플로우·스크린샷·문서가 그대로 재사용**된다.
- As a **Developer**, I want to **locale 파라미터가 단일 allowlist 로 검증되는 것을**, so that **임의 값(`fr`, `ja` 등)이 프롬프트에 들어가 Claude 가 예측 불가능한 언어로 응답하지 않도록** 한다.

---

## 3. 수용 기준 (Acceptance Criteria)

> 모두 테스트 가능한 문장. CI gate 필수.

- [ ] **AC-1 (클라이언트 전달 일관성):** `src/i18n/index.ts` 의 현재 `i18n.language` 값이 `ko` 일 때, 아래 Claude 호출 8개 사이트 전부 request body 에 `locale: 'ko'` 를 포함한다. `en` 일 때는 `locale: 'en'` 를 포함한다 (명시 전달 — fallback 의존 금지):
  1. `src/pages/milestone-detail/useMilestoneAiRisk.ts:77` (`milestone-risk-predictor`)
  2. `src/pages/plan-detail/page.tsx:244` (`risk-predictor`)
  3. `src/pages/project-plans/AIPlanAssistantModal.tsx:96` (`plan-assistant`)
  4. `src/pages/run-detail/components/AIRunSummaryPanel.tsx:205` (`generate-testcases` action=`summarize-run`)
  5. `src/pages/project-detail/components/CoverageGapModal.tsx:75` (`generate-testcases` action=`coverage-gap`)
  6. `src/pages/project-detail/widgets/FlakyDetector.tsx:286` (`generate-testcases` action=`analyze-flaky`)
  7. `src/hooks/useRequirementLinks.ts:502` (`generate-testcases` action=`suggest-from-requirement`)
  8. `src/pages/project-detail/components/AIAssistModal.tsx:142` (`generate-testcases` text mode via `supabase.functions.invoke`)

  grep 검증: `grep -rn "functions.invoke\|functions/v1/" src/ | grep -E "(risk-predictor|plan-assistant|generate-testcases|milestone-risk-predictor)"` 결과 사이트 수 == `locale` 파라미터 포함 사이트 수.

- [ ] **AC-2 (서버 프롬프트 주입):** Edge Function 4개(`milestone-risk-predictor`, `risk-predictor`, `plan-assistant`, `generate-testcases`) 모두 request body 에서 `locale` 을 추출하고, `resolveLocale(body.locale)` 로 `ko | en` 중 하나로 정규화한 뒤, `ko` 인 경우에만 `systemPrompt` 끝에 `LOCALE_INSTRUCTION_KO` 를 append 한다. `en` 은 기존 프롬프트 그대로 (명시 지시 없음).

- [ ] **AC-3 (Allowlist — fallback):** `resolveLocale` 은 `'ko' | 'en'` 만 허용하고 그 외(빈 문자열, `null`, `undefined`, `'fr'`, `'KO'` 대문자, `' ko '` 공백, `'ko-KR'`, 비문자열) 는 전부 `'en'` 으로 fallback 한다. 대소문자는 **정확 match 만 통과** (`.toLowerCase()` 정규화는 하지 않음 — 예측 가능성 우선). vitest 로 아래 table 검증:
  ```
  'ko' → 'ko'
  'en' → 'en'
  'KO' → 'en' (대문자 미허용)
  'ko-KR' → 'en'
  'fr' → 'en'
  ' ko ' → 'en'
  '' → 'en'
  null → 'en'
  undefined → 'en'
  123 → 'en'
  {} → 'en'
  ```

- [ ] **AC-4 (사용자 입력 interpolation 불변):** milestone.name, tc.title, plan.name 등 사용자 입력 변수는 locale 과 무관하게 **그대로 보간**된다 (번역 시도 금지). f017 의 `sanitizeForPrompt` 는 locale 도입 후에도 동일하게 적용된다. grep: `sanitizeForPrompt` 호출 지점이 locale 분기 내부에 들어가지 않음을 확인.

- [ ] **AC-5 (JSON 파서 회귀 없음):** 기존 JSON 응답 구조(예: `{ risk_level, confidence, summary, bullets, recommendations }`, `{ riskLevel, narrative, clusters, goNoGo }`, `{ suggested_test_cases, estimated_effort_hours }`, `{ gaps, typeBalance }`, `{ patterns }`, `{ titles: [] }`, `{ cases: [] }`) 의 **키 이름은 전부 영문 유지** — `LOCALE_INSTRUCTION_KO` 는 "keys remain in English; only VALUES of natural-language fields translate to Korean" 을 명시한다. 기존 `parseJsonSafely` / `JSON.parse` 로 KO 응답도 100% 파싱 통과한다 (vitest 로 KO 응답 샘플 fixture 3개 파싱 테스트).

- [ ] **AC-6 (CI gate):**
  - `npm run typecheck` (= `tsc --noEmit`) PASS
  - `npm run build` PASS
  - `npm run test -- --run` PASS (신규 vitest 포함)
  - `npm run scan:i18n` PASS (i18n 키 parity, 본 티켓은 신규 키 0개 — AC-9)
  - `deno check supabase/functions/**/*.ts` PASS
- [ ] **AC-7 (크레딧 차감 불변):** `ai_generation_logs.credits_used` 는 locale 과 **무관하게 기존 `feature.creditCost` 그대로** 기록된다. `locale` 값은 `ai_generation_logs.input_data.locale` 필드에만 추가 저장 (모니터링용). 기존 `getSharedPoolUsage` / 월한도 로직 **무변경**.
- [ ] **AC-8 (Fallback 동작):** 클라이언트에서 `locale` 파라미터를 누락하거나 Edge Function 을 curl 직접 호출 시 `locale` 이 없으면 `'en'` 으로 동작한다. Edge Function 은 `locale` 누락을 에러로 처리하지 않는다 (하위호환).
- [ ] **AC-9 (i18n 키 변경 없음):** 본 티켓은 UI 텍스트 수정 없음 — `src/i18n/local/{en,ko}/*.ts` 의 키 추가/변경 **0건**. parity 스캔 영향 없음.

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

**정상 흐름 (Happy Path — KO 사용자):**
1. 유저가 `app_language = 'ko'` 설정 상태에서 Milestone Detail 페이지의 "Analyze with AI" 버튼 클릭.
2. 클라이언트 `useMilestoneAiRisk.ts` 가 `supabase.functions.invoke('milestone-risk-predictor', { body: { milestone_id, force_refresh, locale: i18n.language } })` 호출.
3. Edge Function 이 `resolveLocale(body.locale)` → `'ko'` 획득.
4. systemPrompt 기본부(영어 QA 분석 지시) 뒤에 `LOCALE_INSTRUCTION_KO` (~200자) 를 append.
5. Claude API 호출 → 응답의 JSON 키는 영어(`risk_level`, `summary`, `bullets`), 자연어 값은 한국어("마일스톤이 위험 상태입니다. 실패 태그 #payment 에 집중하세요…").
6. 기존 JSON 파서가 정상 파싱 → UI 에 한국어 summary/bullets 렌더.
7. `ai_generation_logs.input_data.locale = 'ko'` 기록.

**정상 흐름 (Happy Path — EN 사용자):**
1. `i18n.language = 'en'` → `locale: 'en'` 전달 → `resolveLocale` → `'en'`.
2. systemPrompt 에 **아무 추가 지시 없음** (현행 그대로).
3. Claude 응답 → 기존과 동일한 영어.

**대안 흐름 (Alternative — 캐시 히트 KO):**
1. `milestone-risk-predictor` 는 `ai_risk_cache.locale !== 'ko'` 인 기존 캐시가 있으면 (아래 §4-2 BR-5) **캐시 미스**로 처리하여 재생성한다. 즉 캐시 키에 locale 이 포함된다.
2. 같은 milestone 에서 EN 사용자가 조회하면 EN 캐시를, KO 사용자는 KO 캐시를 각자 사용.

**대안 흐름 (Alternative — 팀원 간 언어 혼용):**
1. Owner(KO) 가 먼저 분석 → KO 캐시 저장 (`ai_risk_cache.locale = 'ko'`).
2. Admin(EN) 이 같은 Milestone 조회 → 캐시 locale 불일치 → 재분석 → EN 캐시로 **덮어씀**.
3. 다시 Owner(KO) 가 조회 → KO 재분석.
4. 이는 의도된 동작. 월 credit 소비 증가 리스크는 §11 에 명시. 후속 최적화 티켓에서 `ai_risk_cache_ko` / `ai_risk_cache_en` 분리 저장 검토.

**에러 흐름:**
1. `locale` 이 비문자열/비허용값 → `resolveLocale` 이 조용히 `'en'` fallback, 에러 반환 **안 함** (하위호환).
2. Claude 가 한국어 지시에도 영어로 응답하는 경우 → 그대로 UI 에 노출. **재시도 없음** (비용/지연 회피). QA 샘플링에서 발견 시 프롬프트 조정 (별도 티켓).
3. Claude 가 JSON 키를 한국어로 생성하는 경우(예: `"위험도":`) → 기존 파서에서 key lookup 실패 → 422 `ai_parse_failed` 반환 (기존 동작). 이 경우 사용자에게 "AI returned malformed JSON" 토스트 (기존 i18n 키 재사용).

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | 지원 locale: `'ko'`, `'en'` 만. 그 외 전부 `'en'` fallback. | 본 티켓 범위. `ja/zh` 는 OOS. |
| BR-2 | locale 전달 방식: **request body 의 `locale` 필드** (query string 사용 안 함). 기존 `invoke` body 에 한 필드만 추가. | POST JSON body 통일. |
| BR-3 | `LOCALE_INSTRUCTION_KO` 는 `_shared/localePrompt.ts` 단일 소스에 정의되고 Edge Function 4개가 모두 import 한다. | 문구 drift 방지. |
| BR-4 | `LOCALE_INSTRUCTION_KO` 주입 위치: `systemPrompt` **마지막**. user prompt 수정 금지. | 기존 구조 영향 최소화. |
| BR-5 | `milestone-risk-predictor` 의 `ai_risk_cache` 캐시 히트 판정 시, 캐시 payload 의 `meta.locale` 이 현재 요청 `locale` 과 다르면 **stale 로 취급** 하여 재생성. | 언어별 응답을 보장. |
| BR-6 | `ai_generation_logs.input_data.locale` 에 해결된 locale(`'ko'` 또는 `'en'`) 을 기록. 원본 입력값이 아닌 `resolveLocale` 결과를 저장. | 모니터링 일관성. |
| BR-7 | 크레딧 차감(`credits_used`)은 locale 무관 **항상 `feature.creditCost`**. KO 토큰 증가분은 `tokens_used` 에만 반영. | 과금 정책 무변경 (§11 리스크 명시). |
| BR-8 | `LOCALE_INSTRUCTION_KO` 는 (1) 한국어로 응답, (2) 존댓말(`~습니다`/`~합니다`), (3) JSON 키는 영문 유지, (4) 기술 용어 보존(`Test Case`, `Run`, `Milestone`, `Plan`, `Pass Rate`, `Sprint`) 을 포함한다. | 오역 방어. §6-2 전문. |
| BR-9 | 사용자 입력 변수(milestone.name, tc.title 등) 는 locale 과 무관하게 원문 보간. 번역/치환 금지. | f017 sanitize 만 적용. |
| BR-10 | 클라이언트 전달 시 `locale` 값은 순수 `i18n.language` 값. trimming/대문자 변환 금지 — 서버 `resolveLocale` 가 단일 진입점. | 클라/서버 중복 로직 방지. |

### 4-3. 권한 (RBAC)

**N/A — 기존 RBAC 무변경.** 본 티켓은 응답 언어만 바꾸며, Edge Function 의 기존 role 체크(`milestone-risk-predictor` 의 `userLevel >= 4` 등) 는 그대로 유지.

### 4-4. 플랜별 제한

**N/A — 플랜 분기 없음.** 모든 플랜(Free ~ Enterprise)에서 동일 동작. 단, KO 응답의 토큰 수 증가로 월 credit 한도에 빠르게 도달할 리스크는 §11 에 기술 (credits_used 정책 자체는 BR-7 로 변경 없음).

---

## 5. 데이터 설계

### 신규 테이블

**N/A — 신규 테이블 없음.**

### 기존 테이블 변경

| 테이블 | 변경 내용 | 마이그레이션 필요 |
|--------|---------|----------------|
| `ai_generation_logs` | 변경 없음. `input_data` (JSONB) 에 `locale` 필드 추가 저장 (스키마 변경 아님 — JSONB free-form). | N |
| `milestones.ai_risk_cache` | 변경 없음. `meta.locale` 필드를 JSONB 안에 추가 저장 (스키마 변경 아님). 기존 row 는 `meta.locale` 누락 → stale 처리되어 자동 재생성. | N |

**마이그레이션 SQL — 불필요.** 전부 JSONB 내부 필드 확장으로 해결.

### RLS 정책

**N/A — RLS 정책 변경 없음.** 기존 `ai_generation_logs` RLS("Users can view/insert own ai generation logs") 그대로 유지.

---

## 6. API 설계

### 6-1. 신규 공유 모듈 — `supabase/functions/_shared/localePrompt.ts`

```typescript
/**
 * Claude locale 처리 공유 유틸 (f021).
 *
 * - 허용 locale 은 'ko' | 'en' 만.
 * - 그 외(대문자/공백/언어태그/비문자열/undefined) 는 'en' fallback.
 * - 대소문자 및 공백 정규화를 하지 않는 이유: 예측 가능성.
 */

export type SupportedLocale = 'ko' | 'en';

export function resolveLocale(input: unknown): SupportedLocale {
  return input === 'ko' ? 'ko' : 'en';
}

/**
 * KO 응답용 system prompt suffix.
 * Claude system prompt 기본부 뒤에 append.
 */
export const LOCALE_INSTRUCTION_KO = `

IMPORTANT — RESPONSE LANGUAGE:
Respond in natural Korean (한국어). Use polite form (존댓말 — ~습니다/~합니다 어미).

JSON STRUCTURE RULES:
- All JSON keys/field names MUST remain in English exactly as specified (e.g. "risk_level", "summary", "bullets", "recommendations", "suggested_test_cases", "cases", "titles").
- Only the VALUES of natural-language fields (summary, bullets, recommendations, narrative, rationale, rootCause, fixSuggestion, reason, riskReason, goNoGoCondition, typeAssessment, forecast_note, description, precondition, expected_result, step.action, step.expected) translate to Korean.
- Enum values (risk_level, severity, priority, type, category, goNoGo, confidence_label) MUST remain in English exactly as specified in the schema.
- Numbers, dates, IDs, test_case_id, custom_id, run_id, tag names, folder names, user-provided titles/names MUST be preserved verbatim — do NOT translate.

TECHNICAL TERMS TO PRESERVE (do NOT translate these words even in Korean sentences):
"Test Case", "Test Run", "Test Plan", "Milestone", "Sprint", "Run", "Plan",
"Pass Rate", "Flaky", "Coverage", "Priority" (critical/high/medium/low),
"Passed", "Failed", "Blocked", "Retest", "Untested", "Skipped".
Keep these terms in English for consistency with UI labels.

Example of correct output style:
{
  "risk_level": "at_risk",
  "summary": "Milestone 이 위험 상태입니다. #payment 태그의 Failed 가 누적되어 Pass Rate 가 52% 입니다.",
  "bullets": ["Test Case 총 120건 중 Untested 62건 (51.6%) 으로 진행률이 저조합니다."]
}
`;

/**
 * locale 에 따라 system prompt suffix 를 반환.
 * en 인 경우 빈 문자열 (기존 프롬프트 무변경).
 */
export function localeInstructionFor(locale: SupportedLocale): string {
  return locale === 'ko' ? LOCALE_INSTRUCTION_KO : '';
}
```

### 6-2. 각 Edge Function 변경 패턴

**공통 — request body 파싱 이후:**
```typescript
import { resolveLocale, localeInstructionFor } from '../_shared/localePrompt.ts';

const body = await req.json();
const locale = resolveLocale(body.locale);

// ... 기존 로직 ...

const systemPromptBase = `You are an expert QA risk analyst ...`;
const systemPrompt = systemPromptBase + localeInstructionFor(locale);
```

**`milestone-risk-predictor` 캐시 분기 변경 (BR-5):**
```typescript
// L163-164 근방
const cache = (milestone.ai_risk_cache as Record<string, any> | null) || null;
const cachedLocale = cache?.meta?.locale;
const localeMismatch = cache && cachedLocale !== locale;
if (!force_refresh && cache && !isStale(cache.generated_at) && !localeMismatch) {
  // 캐시 히트
}

// 캐시 저장 시 (L514)
const cachePayload = {
  generated_at: generatedAt,
  stale_after: staleAfter,
  risk_level: result.risk_level,
  // ...
  meta: {
    model: 'claude-haiku-4-5-20251001',
    tokens_used: tokensUsed,
    latency_ms: latencyMs,
    locale,  // ← 추가
    input_snapshot: { /* ... */ },
  },
};
```

**`generate-testcases` 다중 action — 각 Claude 호출 지점 모두 locale 적용:**

`callClaude(prompt)` 는 단일 user message 만 받는 구조 → 시그니처를 `callClaude(prompt, systemSuffix?)` 로 확장하거나, `callClaude` 호출 시 `prompt` 앞에 suffix 를 prepend. 기존 user-message-only 패턴을 유지하기 위해 **권장 방식**:
```typescript
async function callClaude(
  prompt: string,
  opts?: { system?: string; locale?: SupportedLocale; model?: string; maxTokens?: number },
): Promise<{ content: string; tokens: number }>;
```
단, `generate-testcases` step1/step2 (`buildTitlePromptText` 등) 는 **user message 에 전부 들어가 있고 system 이 없음** → 이 경우 `LOCALE_INSTRUCTION_KO` 를 user prompt 끝에 append (동일 위치). 위치 통일성보다 "system 이 있으면 system 끝, 없으면 user 끝" 규칙으로 처리.

### 6-3. 클라이언트 호출 사이트 변경 패턴

**원칙:** `import i18n from '@/i18n'` (또는 기존 import 경로) 으로 `i18n.language` 를 읽어 body 에 추가. `useTranslation()` 훅을 쓰는 컴포넌트는 `const { i18n } = useTranslation();` 에서 바로 접근.

**예시 — `useMilestoneAiRisk.ts`:**
```typescript
// 기존
const { data, error } = await supabase.functions.invoke('milestone-risk-predictor', {
  body: { milestone_id: milestoneId, force_refresh: force },
});

// 변경 후
import i18n from '../../i18n';
// ...
const { data, error } = await supabase.functions.invoke('milestone-risk-predictor', {
  body: {
    milestone_id: milestoneId,
    force_refresh: force,
    locale: i18n.language,  // ← 추가
  },
});
```

**예시 — `AIPlanAssistantModal.tsx`, `CoverageGapModal.tsx`, `FlakyDetector.tsx`, `AIRunSummaryPanel.tsx`, `useRequirementLinks.ts`, `AIAssistModal.tsx`:** 동일 패턴으로 `body` 에 `locale: i18n.language` 한 줄 추가.

**예시 — `plan-detail/page.tsx:244`:** `useTranslation()` 이 이미 상단에 사용 중이므로 `i18n` 을 분해 할당해 사용.

### 6-4. Request/Response 스키마 변경

**Request — 모든 AI Edge Function 에 공통 추가 필드:**
```json
{
  "locale": "ko" | "en"   // optional, 누락 시 'en'
  // ... 기존 필드 전부 유지
}
```
**Response — 변경 없음** (구조 동일, value 만 KO 번역).

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `supabase/functions/_shared/localePrompt.ts` | `resolveLocale`, `LOCALE_INSTRUCTION_KO`, `localeInstructionFor` 공유 유틸 |
| `supabase/functions/_shared/localePrompt.test.ts` | Deno 유닛 테스트 (선택 — 주 검증은 vitest 미러). |
| `src/lib/localePrompt.ts` | 클라이언트 측 거울 구현 — `resolveLocale`, `type SupportedLocale` export. 클라이언트에서 `i18n.language` 를 body 에 보내기 직전 정규화 용도 (선택적 — 현재는 `i18n.language` 직접 전달로도 충분하지만 일관성·타입 안전성 목적). |
| `src/lib/localePrompt.test.ts` | vitest — AC-3 allowlist 테이블 전체 케이스 + 샘플 KO 응답 fixture 3건 JSON.parse 검증. |
| `src/__fixtures__/aiResponseKo.json` (또는 inline string) | KO 응답 샘플 3건 (milestone-risk / plan-assistant / run-summary). 파서 회귀 테스트용. |

### 수정 파일 — Edge Function (서버 4개)

| 파일 | 변경 내용 |
|------|---------|
| `supabase/functions/milestone-risk-predictor/index.ts` | L108 body 파싱 이후 `locale = resolveLocale(body.locale)` 추출. L163 캐시 히트 판정에 `cachedLocale === locale` 조건 추가. L373 systemPrompt 에 `localeInstructionFor(locale)` append. L514 cachePayload.meta.locale 저장. L546 `ai_generation_logs.input_data.locale` 저장. |
| `supabase/functions/risk-predictor/index.ts` | L98 body 파싱 이후 locale 추출. L224 systemPrompt 에 suffix append. L310 `ai_generation_logs.input_data.locale` 저장. |
| `supabase/functions/plan-assistant/index.ts` | L106 body 파싱 이후 locale 추출. L202 systemPrompt 에 suffix append. L272 `ai_generation_logs.metadata.locale` 저장 (이 파일은 `metadata` 필드 사용). |
| `supabase/functions/generate-testcases/index.ts` | L354 body 파싱 이후 locale 추출. action 별(`summarize-run` L481, `coverage-gap` L723, `suggest-from-requirement` L845, `analyze-flaky` L975) systemPrompt 에 suffix append. step1/step2 (user-message-only, L1234/L1268) 는 prompt 마지막에 append. `ai_generation_logs.input_data.locale` 저장 (step2 제외 — step2 는 step1 의 credit 을 상속해서 별도 로깅 단순). |

### 수정 파일 — 클라이언트 (8개 호출 사이트)

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/milestone-detail/useMilestoneAiRisk.ts` | L78 body 에 `locale: i18n.language` 추가. `i18n` import. |
| `src/pages/plan-detail/page.tsx` | L250 body 에 `locale: i18n.language` 추가. |
| `src/pages/project-plans/AIPlanAssistantModal.tsx` | L99 body 에 `locale: i18n.language` 추가. |
| `src/pages/run-detail/components/AIRunSummaryPanel.tsx` | L212 body 에 `locale: i18n.language` 추가. |
| `src/pages/project-detail/components/CoverageGapModal.tsx` | L82 body 에 `locale: i18n.language` 추가. |
| `src/pages/project-detail/widgets/FlakyDetector.tsx` | L293 body 에 `locale: i18n.language` 추가. |
| `src/hooks/useRequirementLinks.ts` | L509 body 에 `locale: i18n.language` 추가. 파일 상단 `i18n` import. |
| `src/pages/project-detail/components/AIAssistModal.tsx` | L143 body 에 `locale: i18n.language` 추가. (이 파일은 현재 `source: 'text'` 등 구(舊) 필드를 보내고 있으나 본 티켓 스코프 외 — 필드 정합성 이슈는 별도 티켓) |

### 비대상 파일 (OOS — §9 참조)

- `supabase/functions/check-milestone-past-due/index.ts` — **Claude 호출 없음** (Slack 알림 only). grep 확인 완료.
- `supabase/functions/send-notification`, `send-digest`, `send-loops-event`, `send-webhook` — AI 아님.
- `supabase/functions/sync-*`, `fetch-*`, `create-*-issue`, `jira-webhook-handler` — 외부 API, AI 아님.
- `src/i18n/local/en/*.ts`, `src/i18n/local/ko/*.ts` — 신규 키 0건 (AC-9).

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 클라이언트 `locale` 누락 (legacy 경로) | 서버에서 `resolveLocale(undefined) → 'en'`. 기존과 동일 응답. 에러 아님. |
| `locale = 'ko-KR'` (BCP47 태그) | `resolveLocale → 'en'` fallback. 의도된 동작. 향후 넓힐 시 allowlist 에 추가. |
| `locale = 'KO'` 대문자 | `resolveLocale → 'en'`. 엄격 match 정책. |
| 공백 포함 `' ko '` | `resolveLocale → 'en'`. |
| 비문자열(`null`/`123`/`{}`) | `resolveLocale → 'en'`. |
| 캐시된 EN 응답이 있는 Milestone 에 KO 사용자가 접근 | 캐시 locale mismatch → 재생성 → KO 캐시로 덮어씀. EN 사용자가 다음에 접근 시 다시 재생성. (§4-1 대안 흐름, §11 리스크) |
| Claude 가 KO 지시에도 EN 으로 응답 | 그대로 UI 노출. 재시도 없음. 샘플링 QA 에서 빈도 추적. |
| Claude 가 JSON 키를 한국어로 생성 | `JSON.parse` 는 성공하지만 구조 validation 에서 필드 누락 → `ai_parse_failed` 422 응답 (기존 에러 경로). 사용자에게 기존 토스트. |
| Claude 가 기술 용어를 오역 (예: "Run" → "달리기") | 허용됨. BR-8 preserve 지시로 최소화. 반복 관측 시 프롬프트 조정 (별도 티켓). |
| 토큰 한도 초과(Claude 4096/2048 max_tokens) | 기존 동작 유지. KO 응답이 잘릴 수 있음 → JSON 파싱 실패 시 422. 완화는 OOS (max_tokens 조정 별도 티켓). |
| `callClaude` 에 system 미사용 (step1/step2) | LOCALE_INSTRUCTION_KO 를 user prompt 끝에 append (§6-2 주석). |
| 라이브 언어 전환 (사용자가 한참 쓰다가 KO→EN 전환) | 다음 AI 호출부터 반영. 이전 호출의 응답은 원 언어 유지 (캐시/이미 렌더). |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **3rd 언어 지원** (`ja`, `zh`, `es`, `fr` 등). allowlist 확장은 별도 티켓.
- [ ] **KO 응답 품질 검증** (원어민 리뷰, 톤 일관성). QA Gate 에 수동 샘플링만 포함.
- [ ] **max_tokens 증액** — KO 응답이 길어서 잘리는 경우의 대응. 별도 모니터링 후 티켓 분리.
- [ ] **AI response metadata 번역** (모델명, 생성 시각 라벨 등). 응답 본문만 대상.
- [ ] **KO 사용자에 한해 credit 차감 비율 조정** (예: 1.5x). 과금 정책 별도 의사결정.
- [ ] **캐시 무효화 UX** — 언어 전환 직후 기존 캐시 자동 삭제/수동 버튼. 기존 TTL 24h 로직에 맡김 (§4-1 BR-5 mismatch 처리로 재생성).
- [ ] **클라이언트 입력 힌트** — "AI 는 현재 언어로 응답합니다" 토스트/툴팁. Designer 티켓 후속 가능.
- [ ] **별도 언어 캐시 슬롯** (`ai_risk_cache_ko`, `ai_risk_cache_en` 분리). 덮어쓰기 방식이 단순하고 월 호출 빈도가 낮아 비용 허용. 관측 후 재검토.
- [ ] **system prompt 재설계 / hardening** — f017 연장선 별도 티켓.
- [ ] **기존 로그 마이그레이션** — `ai_generation_logs.input_data.locale` 이 없는 과거 로그를 backfill 하지 않음.

---

## 10. i18n 키

**N/A — 본 티켓은 UI 텍스트 신규 키 0건.**

- AI 응답 자체는 Claude 가 동적으로 생성하므로 i18n 키 대상 아님.
- 에러 토스트(예: "AI returned malformed JSON") 는 기존 키 재사용 (`runs:aiSummary.error.default`, `milestones:planDetail.aiRiskPredictor.error.*`).
- fallback 문자열 `'en'` 은 코드 상수 — 번역 대상 아님.

`npm run scan:i18n` / parity 스크립트 영향 없음.

---

## 11. Designer 개입 필요?

**불필요 — UI 변화 없음. Developer 직접 구현.**

판단 근거:
- 서버 프롬프트·클라이언트 body 필드 변경만. 화면 레이아웃/신규 버튼/아이콘/에러 토스트 **추가 없음**.
- AI 응답이 KO 로 바뀌는 것은 기존 render 영역(summary/bullets 텍스트 노드)의 **내용만** 변화. 컴포넌트·스타일 무변경.
- `LOCALE_INSTRUCTION_KO` 의 한국어 톤("자연스러운 한국어, 존댓말, 기술 용어 보존") 은 PM 이 본 Spec §6-1 에 확정. Designer 검토 불필요.
- 향후 UX 확장(언어 자동 감지 힌트, 믹스 언어 경고 등) 은 별도 Designer 티켓.

Developer 참고:
- f017 Dev Spec (`dev-spec-f017-prompt-injection.md`) — `_shared` 유틸 패턴 동일.
- `supabase/functions/_shared/rate-limit.ts` — 공유 모듈 구조 참조.

---

## 12. 테스트 계획

### 12-1. 유닛 테스트 — `src/lib/localePrompt.test.ts` (vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { resolveLocale } from '../lib/localePrompt';

describe('resolveLocale', () => {
  it.each([
    ['ko', 'ko'],
    ['en', 'en'],
    ['KO', 'en'],
    ['ko-KR', 'en'],
    ['fr', 'en'],
    [' ko ', 'en'],
    ['', 'en'],
    [null, 'en'],
    [undefined, 'en'],
    [123, 'en'],
    [{}, 'en'],
    [[], 'en'],
    [true, 'en'],
  ])('resolveLocale(%p) === %p', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe('KO AI response JSON fixtures parse successfully', () => {
  const fixtures = [
    // milestone-risk-predictor
    `{"risk_level":"at_risk","confidence":72,"summary":"Milestone 이 위험 상태입니다. Pass Rate 가 52% 입니다.","bullets":["Test Case 총 120건 중 Untested 62건이 남아 있습니다."],"recommendations":["#payment 태그의 Failed 를 우선 해결하세요."]}`,
    // plan-assistant
    `{"suggested_test_cases":[{"id":"abc","title":"로그인 실패","folder":"auth","priority":"high","tags":["auth"],"rationale":"회귀 테스트가 필요합니다."}],"estimated_effort_hours":4,"summary":"이번 스프린트 계획입니다.","coverage_areas":["auth"],"risk_level":"medium"}`,
    // run-summary
    `{"riskLevel":"MEDIUM","riskReason":"실패가 누적되었습니다.","narrative":"결제 경로에서 Failed 가 집중됩니다.","clusters":[],"recommendations":["#payment 를 재실행하세요."],"goNoGo":"CONDITIONAL","goNoGoCondition":"Pass Rate 90% 이상 시 GO."}`,
  ];
  it.each(fixtures)('parses fixture without throwing', (json) => {
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(typeof parsed).toBe('object');
  });
});
```

### 12-2. 수동 회귀 테스트

- Setting → Language → Korean 으로 전환 후:
  - Milestone Detail → "Analyze with AI" → summary/bullets/recommendations 전부 KO 확인
  - Plan Detail → "Risk Predictor" → forecast_note/recommendation/summary KO 확인
  - Run Detail → "AI Summary" → narrative/recommendations KO 확인
  - Coverage Gap / Flaky / Requirement Suggest → 자연어 필드 KO 확인
- English 로 재전환 후 동일 기능 호출 → EN 응답 확인 (캐시 덮어쓰기 검증)
- Claude 응답 JSON 을 DevTools Network 에서 열어 키가 영문인지 확인 (`risk_level`, `bullets` 등)

### 12-3. grep / CI 검증

```bash
# AC-1 — 호출 사이트 locale 포함 확인
grep -rn "functions.invoke\|functions/v1/" src/ \
  | grep -E "(risk-predictor|plan-assistant|generate-testcases|milestone-risk-predictor)" \
  | wc -l
# 기대: 8

grep -rn "locale: i18n.language\|locale: i18n\\.language" src/ | wc -l
# 기대: 8

# AC-2 — Edge Function 이 resolveLocale 호출하는지
grep -rn "resolveLocale" supabase/functions/ | wc -l
# 기대: 4 이상 (각 Edge Function + 공유 유틸)
```

---

## 13. 리스크 (구현자 주의)

| 리스크 | 완화 방법 |
|--------|----------|
| **KO 응답 토큰 1.5~2배** → Starter/Hobby 플랜 사용자가 월 한도를 빠르게 소진 | BR-7 로 `credits_used` 정책 무변경 유지. 관측 후 별도 티켓. 배포 후 2주간 `ai_generation_logs` 에서 locale 별 `tokens_used` 평균 비교 (운영 지표). |
| **캐시 locale mismatch 재생성으로 Claude 호출 급증** (KO/EN 사용자가 같은 Milestone 번갈아 조회) | BR-5 는 의도된 동작. 월 한도가 곧 cap 으로 작용. 심각한 경우 `ai_risk_cache_ko/en` 분리 슬롯(OOS)으로 확장. |
| **Claude 가 기술 용어를 오역** ("Run" → "달리기") | BR-8 preserve 지시. vitest 샘플 fixture 에는 포함하되 CI gate 는 JSON.parse 성공까지만 강제. 품질 회귀는 수동 QA. |
| **Claude 가 JSON 키를 번역해 파서 실패** | 기존 에러 경로(422 `ai_parse_failed`) 그대로. `LOCALE_INSTRUCTION_KO` 에 "keys MUST remain in English" 를 강조. 초기 2주간 422 발생률 모니터링. |
| **max_tokens 에 걸려 KO 응답이 잘림** | max_tokens 조정은 OOS. 발생 시 fixture 수집 → 별도 티켓. |
| **history 캐시의 `meta.locale` 누락으로 전체 재생성 러시** | 의도됨(첫 회 1회성). 운영적 impact 추정 < 1 token/user. 허용. |
| **AIAssistModal 이 `source: 'text'` 등 구(舊) 필드 사용 중** | 본 티켓 스코프 외. locale 필드만 추가하고 기존 버그는 건드리지 않음. |

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장 (AC-1 ~ AC-9)
- [x] DB 스키마 변경 없음 명시 (§5 — JSONB free-form 확장만)
- [x] RLS 정책 변경 없음 명시 (§5)
- [x] 플랜별 제한 변경 없음 명시 (§4-4, BR-7)
- [x] RBAC 매트릭스 변경 없음 명시 (§4-3)
- [x] 변경 파일 목록 실제 경로 + 라인번호 구체 (§7 — 서버 4개 / 클라이언트 8개)
- [x] 엣지 케이스 식별 (§8 — 11개)
- [x] Out of Scope 명시 (§9 — 10개)
- [x] i18n 키 변경 없음 명시 (§10)
- [x] Designer 개입 판단 명시 (§11 — 불필요)
- [x] 리스크 식별 + 완화 방법 (§13)
- [x] f017 의존성 명시 (헤더 + BR-9)
