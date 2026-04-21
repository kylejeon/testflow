/**
 * Prompt Sanitize — Deno / Edge Function utility (final defence line)
 *
 * 사용자 입력을 Claude 프롬프트 템플릿에 그대로 interpolate 하는 것을 방지하기 위한
 * 순수 함수 sanitize 유틸. 이 모듈은 **서버 측 최종 방어선**이다. 클라이언트 측에도
 * 동일 로직의 거울 구현이 `src/lib/promptSanitize.ts` 에 존재하지만, 클라이언트는
 * UX 피드백 용도일 뿐 프론트 우회(예: 직접 fetch) 공격에도 서버 측 본 모듈이 반드시
 * 재적용되어야 한다.
 *
 * 관련 Dev Spec: docs/specs/dev-spec-f017-prompt-injection.md
 *
 * 주의:
 * - Deno 런타임과 Node(Vitest) 런타임이 격리되어 있어 src/lib/promptSanitize.ts 와
 *   코드가 중복된다. 두 파일을 **항상 동기화** 할 것.
 * - surrogate pair 안전 truncate를 위해 Array.from 사용 (emoji/한자 깨짐 방지).
 * - 싱글따옴표 `'` 는 유지한다 — 한국어 조사("'의'") 및 영어 축약형("don't") 보존 목적.
 */

// ── Field-specific length policy ─────────────────────────────────────────────

/** milestone / plan / project / run / session 이름 등 짧은 이름 필드 */
export const SHORT_NAME_MAX = 50;
/** test case / requirement 제목 등 */
export const TITLE_MAX = 120;
/** description / charter / mission 등 긴 텍스트 */
export const LONG_TEXT_MAX = 500;
/** folder / tag 등 */
export const TAG_MAX = 40;

/** sanitize 결과가 빈 문자열일 때의 fallback (ASCII 고정, i18n 제외) */
export const EMPTY_FALLBACK = '(untitled)';

// ── Regex 상수 ───────────────────────────────────────────────────────────────

/**
 * 프롬프트 구조 토큰 (대소문자 무시). Claude/GPT 계열 특수 토큰과
 * 템플릿 엔진 마커를 포함한다.
 */
const STRUCTURE_TOKEN_REGEX = new RegExp(
  [
    '<\\|im_start\\|>',
    '<\\|im_end\\|>',
    '<\\|endoftext\\|>',
    '</system>',
    '<system>',
    '</user>',
    '<user>',
    '</assistant>',
    '<assistant>',
    '\\[INST\\]',
    '\\[/INST\\]',
    '\\{\\{',
    '\\}\\}',
  ].join('|'),
  'gi',
);

/** 제어문자: \x00-\x1F (탭/개행도 포함), \x7F DEL */
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/g;

/** Zero-width / BOM / word joiner 계열 */
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u2060]/g;

/** 제거할 구조 기호: 쌍따옴표, 백틱, 중괄호, 꺾쇠 (싱글따옴표는 유지) */
const STRUCTURAL_CHAR_REGEX = /[`"{}<>]/g;

/** 연속 공백 압축 */
const MULTI_SPACE_REGEX = /\s{2,}/g;

// ── Core helper ──────────────────────────────────────────────────────────────

/**
 * 공통 sanitize 파이프라인.
 *
 * 순서 (변경 시 우회 취약):
 *   1. String 변환 (null/undefined/number 등도 허용)
 *   2. 구조 토큰 제거 (`</system>` 등)
 *   3. Zero-width 제거
 *   4. 제어문자 제거 (탭/개행은 이 단계에서 공백 치환은 안 함 — 아래 5번에서 처리)
 *      → 제어문자 제거는 모든 `\x00-\x1F\x7F` 를 빈 문자열로 치환하므로
 *         이 단계에서 탭/개행도 공백이 아닌 빈 문자열로 날아간다. 의도된 동작.
 *   5. 구조 기호 제거 (`"`, `` ` ``, `{`, `}`, `<`, `>`)
 *   6. 연속 공백 압축 + trim
 *   7. surrogate-pair 안전 truncate (code-point 단위)
 *   8. 빈 문자열이면 fallback
 */
function applySanitize(
  input: unknown,
  maxLen: number,
  fallback: string = EMPTY_FALLBACK,
): string {
  // 1. String 변환
  let s = input === null || input === undefined ? '' : String(input);

  // 2. 구조 토큰 제거
  s = s.replace(STRUCTURE_TOKEN_REGEX, '');

  // 3. Zero-width 제거
  s = s.replace(ZERO_WIDTH_REGEX, '');

  // 4. 제어문자(개행/탭 포함) → 공백 치환
  //    "ignoresystem" 이 아닌 "ignore system" 형태를 유지하기 위해 공백 치환 선택.
  s = s.replace(CONTROL_CHAR_REGEX, ' ');

  // 5. 구조 기호 제거 (싱글따옴표는 유지)
  s = s.replace(STRUCTURAL_CHAR_REGEX, '');

  // 6. 연속 공백 압축 + trim
  s = s.replace(MULTI_SPACE_REGEX, ' ').trim();

  // 7. code-point 단위 truncate (surrogate pair 보존)
  if (maxLen > 0) {
    const codePoints = Array.from(s);
    if (codePoints.length > maxLen) {
      s = codePoints.slice(0, maxLen).join('');
    }
  }

  // 8. 빈 문자열 fallback
  if (s.length === 0) return fallback;
  return s;
}

// ── Named exports (field-specific wrappers) ──────────────────────────────────

/** milestone / plan / project / run / session name — 50 code points */
export function sanitizeShortName(input: unknown): string {
  return applySanitize(input, SHORT_NAME_MAX);
}

/** test case / requirement title — 120 code points */
export function sanitizeTitle(input: unknown): string {
  return applySanitize(input, TITLE_MAX);
}

/** description / charter / mission — 500 code points */
export function sanitizeLong(input: unknown): string {
  return applySanitize(input, LONG_TEXT_MAX);
}

/** folder / tag — 40 code points */
export function sanitizeTag(input: unknown): string {
  return applySanitize(input, TAG_MAX);
}

/**
 * 커스텀 length override 가 필요한 지점용 일반 함수.
 * Dev Spec §6-1 SanitizeOptions 시그니처와 호환.
 */
export interface SanitizeOptions {
  maxLength?: number;
  fallback?: string;
}
export function sanitizeForPrompt(
  input: unknown,
  options?: SanitizeOptions,
): string {
  return applySanitize(
    input,
    options?.maxLength ?? SHORT_NAME_MAX,
    options?.fallback ?? EMPTY_FALLBACK,
  );
}

/** 배열 전용: 각 원소 sanitize 후 빈(fallback) 결과 제외. */
export function sanitizeArrayForPrompt(
  inputs: unknown[],
  options?: SanitizeOptions,
): string[] {
  const fallback = options?.fallback ?? EMPTY_FALLBACK;
  return inputs
    .map((v) => sanitizeForPrompt(v, options))
    .filter((v) => v !== fallback);
}
