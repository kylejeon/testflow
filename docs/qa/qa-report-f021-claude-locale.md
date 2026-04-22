# QA Report: f021 — Claude 다국어 출력 (KO locale 시 한국어 응답)
> 검수일: 2026-04-21
> 개발지시서: docs/specs/dev-spec-f021-claude-locale.md
> 디자인 명세: N/A (UI 변화 없음 — Dev Spec §11)

## 요약
- 총 검수 항목: 32개
- 통과: 30개
- 실패: 0개
- 경고: 1개
- Nit: 1개

---

## Critical (반드시 수정)

없음.

---

## Warning (수정 권장)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| W-1 | AIGenerateModal locale 누락 | `src/pages/project-testcases/components/AIGenerateModal.tsx`는 `generate-testcases` step1/step2를 호출하는 9번째 call site이나 AC-1의 8개 사이트 목록에서 제외되었다. `locale` 파라미터를 전달하지 않아 KO 사용자가 이 모달로 TC를 생성할 때 항상 EN 응답을 받는다. Dev Spec §9 OOS가 아닌 단순 누락 가능성. 별도 티켓 또는 f021 후속 커밋으로 대응 필요. | `src/pages/project-testcases/components/AIGenerateModal.tsx:242~263` |

---

## Nit (선택적 개선)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| N-1 | BR-10 클라이언트 정규화 중복 | Dev Spec BR-10: "클라이언트 전달 시 `locale` 값은 순수 `i18n.language` 값. 서버 `resolveLocale` 가 단일 진입점." 그러나 구현은 8개 사이트 모두 `normalizeLocale(i18n.language)`로 클라이언트에서 먼저 정규화 후 전달한다. 현재 `i18n.language`가 `'ko'`/`'en'`만 반환하므로 기능적 차이는 없으나, 향후 `i18n.language`가 `'ko-KR'` 등으로 바뀔 경우 클라이언트가 `'en'` fallback으로 잘못 변환해 서버 방어선을 우회할 수 있다. 실질적 리스크는 낮지만 BR-10 의도와 상이. | 8개 호출 사이트 전체 |

---

## Passed

### AC 전수 대조

- [x] **AC-1 클라이언트 전달 일관성**: Dev Spec 명시 8개 사이트 전부 `normalizeLocale(i18n.language)` 포함 확인. grep 결과 8개 사이트 모두 `locale:` 필드 포함.
  - `useMilestoneAiRisk.ts:83`
  - `plan-detail/page.tsx:254`
  - `AIPlanAssistantModal.tsx:106`
  - `AIRunSummaryPanel.tsx:216`
  - `CoverageGapModal.tsx:88`
  - `FlakyDetector.tsx:300`
  - `useRequirementLinks.ts:518`
  - `AIAssistModal.tsx:151`
- [x] **AC-2 서버 프롬프트 주입**: Edge Function 4개 모두 `resolveLocale(body.locale)` 호출 후 `maybeAppendLocaleInstruction(systemPromptBase, locale)` 패턴 적용 확인.
  - `milestone-risk-predictor/index.ts:117,391`
  - `risk-predictor/index.ts:107,235`
  - `plan-assistant/index.ts:115,214`
  - `generate-testcases/index.ts:364` + 4 actions + step1/step2
- [x] **AC-3 Allowlist fallback**: `claudeLocale.test.ts` 27 케이스 전수 PASS. `'KO'`, `'ko-KR'`, `' ko '`, `''`, `null`, `undefined`, `123`, `{}` 전부 `'en'` fallback 확인. `en-US` → `'en'`(기술적 en fallback, 기능 동일) 포함.
- [x] **AC-4 사용자 입력 interpolation 불변**: 모든 Edge Function에서 `sanitizeForPrompt` 계열 함수(`sanitizeShortName`, `sanitizeTitle`, `sanitizeLong`, `sanitizeTag`)가 locale 분기 외부(공통 경로)에서 먼저 적용됨. `localeInstructionFor(locale)` append는 최후 위치. f017 sanitize와 독립 동작 확인.
- [x] **AC-5 JSON 파서 회귀 없음**: `claudeLocale.test.ts` AC-5 구간 6 케이스 PASS. KO 응답 fixture 3건(milestone-risk, plan-assistant, run-summary) JSON.parse 성공, 영문 키 보존(`risk_level`, `riskLevel`, `goNoGo`, `priority` 등) 확인.
- [x] **AC-6 CI gate**:
  - `npx tsc --noEmit`: PASS (출력 없음 = 에러 0)
  - `npm run build`: PASS (`✓ built in 6.45s`)
  - `npm run test -- --run`: PASS (170 tests, 10 files)
  - `npm run scan:i18n:check`: PASS (`0 hardcoded matches`)
  - `npm run scan:i18n:parity`: PASS (`en ↔ ko key trees match (0 diff)`)
  - `npm run lint`: 스크립트 미존재 (기존 프로젝트 구성 그대로 — 본 티켓 이전부터 동일)
- [x] **AC-7 크레딧 차감 불변**: 4개 Edge Function 모두 `credits_used: feature.creditCost` 고정. locale 값은 `input_data.locale` 또는 `metadata.locale`에만 저장. `getSharedPoolUsage` / 월한도 로직 무변경 확인.
- [x] **AC-8 Fallback 동작**: `resolveLocale(undefined) → 'en'` — vitest AC-3 케이스 포함. Edge Function에서 `locale` 누락을 에러로 처리하지 않음 확인.
- [x] **AC-9 i18n 키 변경 없음**: parity PASS (0 diff). 신규 키 추가 없음.

### BR 대조

- [x] **BR-5 milestone-risk-predictor 캐시 locale 분리**: `cachedLocale !== locale` 조건이 `isStale` 과 함께 `!force_refresh && cache && !isStale(...) && !localeMismatch` 조건에 포함됨 (`index.ts:175~196`). 기존 row (`meta.locale` 누락) → `cachedLocale === undefined !== locale` → mismatch → 재생성 의도된 1회성 동작.
- [x] **BR-6 로그 locale 기록**: 4개 Edge Function 모두 `resolveLocale` 결과를 `input_data.locale` (또는 `metadata.locale`) 에 저장. 원본 body 값이 아닌 정규화된 값 저장 확인.
- [x] **BR-7 credits_used 불변**: `ai_generation_logs.credits_used`에는 항상 `feature.creditCost` 고정. 로케일에 따른 차감 분기 없음.
- [x] **BR-8 LOCALE_INSTRUCTION_KO 품질**:
  - "Respond in natural Korean (한국어). Use polite form (존댓말 — ~습니다/~합니다 어미)" 포함
  - "All JSON keys/field names MUST remain in English" 포함
  - "Enum values ... MUST remain in English" 포함
  - "Test Case", "Test Run", "Test Plan", "Milestone", "Sprint", "Run", "Plan", "Pass Rate", "Flaky" 등 기술 용어 보존 지시 포함
  - `_shared/localePrompt.ts` 단일 소스, 4개 Edge Function import 확인
- [x] **BR-9 f017 sanitize 독립 동작**: `sanitizeForPrompt` 계열이 locale instruction append 전에 동작. 독립성 확인.
- [x] **BR-10**: Nit N-1 참조 (기능적 차이 없음).

### LOCALE_INSTRUCTION_KO 상세 검증

- [x] "keys MUST remain in English" 명시: `src/supabase/functions/_shared/localePrompt.ts:41`
- [x] "only VALUES of natural-language fields ... translate to Korean" 명시
- [x] 기술 용어 보존 ("Test Case", "Run", "Milestone", "Plan", "Pass Rate" 등): `localePrompt.ts:46~51`
- [x] 존댓말 지시 (~습니다/~합니다): `localePrompt.ts:38`
- [x] 클라이언트 mirror (`src/lib/claudeLocale.ts`)와 서버 (`supabase/functions/_shared/localePrompt.ts`) 동기화 확인

### 캐시 분리 로직 (milestone-risk-predictor)

- [x] 기존 row (`meta.locale` 누락) → `cachedLocale = undefined` → `localeMismatch = true` → 1회성 재생성: `index.ts:175`
- [x] EN → KO 전환 시 재생성: `localeMismatch` 조건이 locale 불일치를 stale로 처리
- [x] 덮어쓰기 방식 (별도 슬롯 분리 OOS): `index.ts:550~553` 단일 `ai_risk_cache` 업데이트

### 보안 리뷰

- [x] locale allowlist 정규화: `resolveLocale(input === 'ko' ? 'ko' : 'en')` — 단일 삼항식, allowlist 외 값 프롬프트 주입 불가
- [x] 클라이언트 `normalizeLocale` → 서버 `resolveLocale` 이중 방어. 공격자가 직접 API 호출 시에도 서버에서 정규화
- [x] f017 sanitize 이후 locale instruction append — 사용자 입력이 locale 지시문에 혼입 불가
- [x] `LOCALE_INSTRUCTION_KO`는 서버 코드 상수 — 클라이언트 코드에 노출 없음

---

## 코드 품질

- `tsc --noEmit`: **PASS** (에러 0)
- `npm run build`: **PASS** (`✓ built in 6.45s`)
- `npm run test -- --run`: **PASS** (170 tests passed, claudeLocale 27건 포함)
- `npm run scan:i18n:check`: **PASS** (0 match)
- `npm run scan:i18n:parity`: **PASS** (0 diff)
- ESLint (`npm run lint`): 스크립트 미존재 — 기존 구성 동일 (본 티켓 이전부터)

---

## 결론

**릴리즈 가능.**

Blocker 0, Major 0. 모든 AC-1 ~ AC-9, BR-5/6/7/8/9 충족. 170개 vitest 전수 통과.

W-1(`AIGenerateModal.tsx` locale 누락)은 Dev Spec AC-1에서 명시적으로 제외된 call site이나, KO 사용자의 TC 생성 모달에서 한국어 응답이 안 되는 기능 공백이므로 후속 티켓 개설을 권장한다. N-1(BR-10 클라이언트 중복 정규화)은 현 i18n 구성에서 기능적 차이가 없으나 `i18n.language` 반환값이 BCP47 태그(`ko-KR`)로 변경될 경우 위험해지므로 중기 정리 대상.
