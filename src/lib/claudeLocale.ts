/**
 * Claude Locale — Client mirror (f021)
 *
 * 이 모듈은 `supabase/functions/_shared/localePrompt.ts` 의 **거울(mirror)** 구현이다.
 * 클라이언트는 AI Edge Function 호출 body 에 `locale` 파라미터를 넣기 직전 정규화
 * 용도로 사용한다. **최종 방어선은 서버 측 `resolveLocale`**.
 *
 * Deno / Node 런타임 격리로 인해 서버 측과 코드가 중복된다. 두 파일을 **항상 동기화** 할 것.
 *
 * 관련 Dev Spec: docs/specs/dev-spec-f021-claude-locale.md
 *
 * 정책:
 * - 허용 locale 은 'ko' | 'en' 만.
 * - 그 외(대문자/공백/BCP47 언어태그/비문자열/undefined) 는 전부 'en' fallback.
 * - 대소문자·공백 정규화를 하지 않는 이유: 예측 가능성 (Dev Spec §6-1).
 */

export type SupportedLocale = 'ko' | 'en';

/**
 * 허용 locale 을 단일 진입점에서 정규화한다.
 * `'ko'` (정확 match) 만 한국어로 취급하고, 그 외 모든 입력은 `'en'` fallback.
 */
export function resolveLocale(input: unknown): SupportedLocale {
  return input === 'ko' ? 'ko' : 'en';
}

/**
 * `i18n.language` 값을 body 에 전달하기 직전 호출하는 편의 alias.
 * 현재는 `resolveLocale` 과 동일 동작이지만, 향후 클라이언트 측에서만
 * 적용할 추가 정규화 로직이 생기면 여기에 얹는다.
 */
export function normalizeLocale(input: unknown): SupportedLocale {
  return resolveLocale(input);
}
