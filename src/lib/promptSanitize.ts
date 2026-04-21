/**
 * Prompt Sanitize — Client mirror (UX helper only)
 *
 * 이 모듈은 `supabase/functions/_shared/promptSanitize.ts` 의 **거울(mirror)** 구현이다.
 * 클라이언트는 사전 UX 피드백(프리뷰/프리-플라이트 validation) 용도로만 사용하고,
 * **최종 방어선은 반드시 서버 측 Edge Function** 이다. 프론트 우회 요청
 * (예: 직접 fetch로 Edge Function 호출)에도 서버 측 sanitize 가 적용되어야 한다.
 *
 * Deno / Node 런타임 격리로 인해 서버 측과 코드가 중복된다. 두 파일을 **항상 동기화** 할 것.
 *
 * 관련 Dev Spec: docs/specs/dev-spec-f017-prompt-injection.md
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

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/g;
// Line/paragraph separators (U+2028/U+2029) — JSON-safe but can break prompt structure.
// BiDi control (U+202A-U+202E) — Trojan Source-style display spoofing defense.
const UNICODE_WS_REGEX = /[\u2028\u2029\u202A-\u202E]/g;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u2060]/g;
const STRUCTURAL_CHAR_REGEX = /[`"{}<>]/g;
const MULTI_SPACE_REGEX = /\s{2,}/g;

// ── Core helper ──────────────────────────────────────────────────────────────

function applySanitize(
  input: unknown,
  maxLen: number,
  fallback: string = EMPTY_FALLBACK,
): string {
  let s = input === null || input === undefined ? '' : String(input);

  s = s.replace(STRUCTURE_TOKEN_REGEX, '');
  s = s.replace(ZERO_WIDTH_REGEX, '');
  s = s.replace(UNICODE_WS_REGEX, ' ');
  s = s.replace(CONTROL_CHAR_REGEX, ' ');
  s = s.replace(STRUCTURAL_CHAR_REGEX, '');
  s = s.replace(MULTI_SPACE_REGEX, ' ').trim();

  if (maxLen > 0) {
    const codePoints = Array.from(s);
    if (codePoints.length > maxLen) {
      s = codePoints.slice(0, maxLen).join('');
    }
  }

  if (s.length === 0) return fallback;
  return s;
}

// ── Named exports ────────────────────────────────────────────────────────────

export function sanitizeShortName(input: unknown): string {
  return applySanitize(input, SHORT_NAME_MAX);
}
export function sanitizeTitle(input: unknown): string {
  return applySanitize(input, TITLE_MAX);
}
export function sanitizeLong(input: unknown): string {
  return applySanitize(input, LONG_TEXT_MAX);
}
export function sanitizeTag(input: unknown): string {
  return applySanitize(input, TAG_MAX);
}

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

export function sanitizeArrayForPrompt(
  inputs: unknown[],
  options?: SanitizeOptions,
): string[] {
  const fallback = options?.fallback ?? EMPTY_FALLBACK;
  return inputs
    .map((v) => sanitizeForPrompt(v, options))
    .filter((v) => v !== fallback);
}
