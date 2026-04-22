/**
 * Claude Locale — Edge Function shared utility (f021, server-side final defence line).
 *
 * 클라이언트가 request body 로 보낸 `locale` 값을 단일 진입점에서 정규화하고,
 * `'ko'` 인 경우에만 Claude system prompt 끝에 한국어 응답 지시 블록을 append한다.
 * JSON 응답 키는 영문 유지 — 자연어 value 만 한국어 번역 (기존 parser 호환).
 *
 * 거울 구현: `src/lib/claudeLocale.ts` (vitest 로 주 검증).
 * Deno / Node 런타임 격리로 코드가 중복된다. 두 파일을 **항상 동기화** 할 것.
 *
 * 관련 Dev Spec: docs/specs/dev-spec-f021-claude-locale.md
 */

export type SupportedLocale = 'ko' | 'en';

/**
 * 허용 locale: `'ko' | 'en'` 만. 대소문자/공백/BCP47 태그/비문자열은 전부 `'en'` fallback.
 * 정확 match 정책 — 예측 가능성 우선 (Dev Spec §6-1).
 */
export function resolveLocale(input: unknown): SupportedLocale {
  return input === 'ko' ? 'ko' : 'en';
}

/**
 * KO 응답용 system prompt suffix.
 * Claude system prompt 기본부 뒤에 append. (user prompt 는 건드리지 않음 — BR-4)
 *
 * 핵심 규칙:
 *   1. 한국어로 자연스럽게 응답하되 존댓말 (~습니다 / ~합니다).
 *   2. JSON 키 이름은 영문 유지 (기존 parser 호환).
 *   3. enum value 는 영문 스키마 그대로 (risk_level, severity, priority 등).
 *   4. 기술 용어 (Test Case / Run / Milestone / Plan / Pass Rate / Flaky ...) 보존.
 *   5. 숫자·날짜·ID·태그·폴더·사용자 입력 이름은 원문 그대로.
 */
export const LOCALE_INSTRUCTION_KO = `

IMPORTANT — RESPONSE LANGUAGE:
Respond in natural Korean (한국어). Use polite form (존댓말 — ~습니다/~합니다 어미).

JSON STRUCTURE RULES:
- All JSON keys/field names MUST remain in English exactly as specified (e.g. "risk_level", "summary", "bullets", "recommendations", "suggested_test_cases", "cases", "titles", "gaps", "patterns", "clusters", "goNoGo", "riskLevel", "narrative", "rootCause", "fixSuggestion").
- Only the VALUES of natural-language fields (summary, bullets, recommendations, narrative, rationale, rootCause, fixSuggestion, reason, riskReason, goNoGoCondition, typeAssessment, forecast_note, description, precondition, expected_result, step.action, step.expected) translate to Korean.
- Enum values (risk_level, severity, priority, type, category, goNoGo, confidence_label) MUST remain in English exactly as specified in the schema (e.g. "on_track", "at_risk", "critical", "HIGH", "MEDIUM", "LOW", "GO", "NO-GO", "CONDITIONAL", "critical", "high", "medium", "low").
- Numbers, dates, IDs, test_case_id, custom_id, run_id, tag names, folder names, user-provided titles/names MUST be preserved verbatim — do NOT translate.

TECHNICAL TERMS TO PRESERVE (do NOT translate these words even in Korean sentences):
"Test Case", "Test Run", "Test Plan", "Milestone", "Sprint", "Run", "Plan",
"Pass Rate", "Flaky", "Coverage", "Priority",
"Passed", "Failed", "Blocked", "Retest", "Untested", "Skipped",
"Environment", "Release", "Sprint".
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
 * `en` 인 경우 빈 문자열을 반환하여 기존 프롬프트를 그대로 사용한다.
 */
export function localeInstructionFor(locale: SupportedLocale): string {
  return locale === 'ko' ? LOCALE_INSTRUCTION_KO : '';
}

/**
 * 기본 systemPrompt 뒤에 locale instruction 을 append 하여 반환.
 * `en` 은 원본 그대로, `ko` 는 suffix 추가.
 */
export function maybeAppendLocaleInstruction(
  systemPrompt: string,
  locale: SupportedLocale,
): string {
  return systemPrompt + localeInstructionFor(locale);
}
