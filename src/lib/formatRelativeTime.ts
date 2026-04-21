import type { TFunction } from 'i18next';

/**
 * i18n-aware relative time formatter.
 *
 * Contract (design-spec-i18n-coverage §4-1, AC-7):
 * - Takes an ISO 8601 string (or null/undefined) + i18next t() function.
 * - Returns a localized string like "5m ago" / "5분 전" / "just now" / "방금 전".
 * - Uses i18next plural suffixes (`_one` / `_other`) under `common:time.*`.
 *
 * Callers MUST bind t via `useTranslation('common')` (or multi-namespace) and
 * pass the returned t directly. Do not cache the result — t is stable per
 * render, and the language can change at runtime.
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  t: TFunction,
): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return t('common:time.justNow');
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return t('common:time.justNow');
  if (mins < 60) return t('common:time.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('common:time.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('common:time.daysAgo', { count: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t('common:time.monthsAgo', { count: months });
  const years = Math.floor(months / 12);
  return t('common:time.yearsAgo', { count: years });
}

export default formatRelativeTime;
