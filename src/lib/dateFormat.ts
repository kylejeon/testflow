/**
 * Locale-aware short date formatter.
 *
 * Contract (design-spec-i18n-coverage §4-2):
 * - Takes an ISO 8601 string / Date / null + optional language code.
 * - Returns a localized "Apr 21" (en-US) / "4월 21일" (ko-KR) style string.
 * - When iso is missing / invalid, returns an empty string.
 *
 * This is a pure wrapper around `Intl.DateTimeFormat` — no external deps.
 * When language is omitted the caller should pass `i18n.language` from
 * `useTranslation()`; this helper does not import i18n directly to stay
 * test-friendly and free of side effects.
 */
export function formatShortDate(
  iso: string | Date | null | undefined,
  lang?: string,
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
}

export default formatShortDate;
