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
  opts?: { withYear?: boolean },
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  const fmtOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (opts?.withYear) fmtOpts.year = 'numeric';
  return new Intl.DateTimeFormat(locale, fmtOpts).format(d);
}

/**
 * Locale-aware short date+time formatter used by Plan Detail (phase 2a).
 *
 * Matches: "Apr 21 · 14:30" (en) / "4월 21일 · 14:30" (ko).
 */
export function formatShortDateTime(
  iso: string | Date | null | undefined,
  lang?: string,
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  const datePart = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${datePart} · ${timePart}`;
}

/**
 * Locale-aware short time only formatter (Plan Detail phase 2a).
 *
 * Matches: "14:30" across both en/ko (24h format).
 */
export function formatShortTime(
  iso: string | Date | null | undefined,
  lang?: string,
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/**
 * Locale-aware weekday + short date (Phase 2a — Plan Detail ActivityTab).
 *
 * Matches: "Monday, Apr 21" (en) / "4월 21일 월요일" (ko).
 */
export function formatDayHeader(
  iso: string | Date | null | undefined,
  lang?: string,
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(d);
}

/**
 * Locale-aware long date+time formatter (Phase 2b — run-detail ResultDetailModal).
 *
 * Matches: "April 21, 2026, 02:15 PM" (en) / "2026년 4월 21일 오후 2:15" (ko).
 */
export function formatLongDateTime(
  iso: string | Date | null | undefined,
  lang?: string,
): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const locale = lang === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default formatShortDate;
