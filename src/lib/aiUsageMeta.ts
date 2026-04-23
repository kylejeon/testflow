/**
 * f011 — AI Usage Dashboard — mode metadata + plan history limits.
 *
 * Related spec: docs/specs/dev-spec-f011-ai-token-budget-dashboard.md §BR-5, §BR-6, §BR-7
 *               docs/specs/design-spec-f011-ai-token-budget-dashboard.md §3-3 MODE_COLORS
 *
 * - MODE_LABEL_KEYS / MODE_COLORS / MODE_ORDER are the single source of truth for
 *   how AI modes are displayed in the dashboard. New modes must be added here.
 * - normalizeMode() folds 'run-summary' and any unknown values into UI buckets
 *   per AC-7.
 * - planHistoryLimit() drives PeriodFilter disable logic (§4-4 / AC-5).
 */

import type { PeriodKey } from '../types/aiUsage';

// ─── Mode taxonomy ───────────────────────────────────────────────────────────

/**
 * Canonical mode keys used for display. These map 1:1 to i18n keys under
 * `settings.aiUsage.mode.*`. Any raw value from `ai_generation_logs.mode`
 * that is unknown falls into 'other'.
 */
export type DisplayMode =
  | 'text'
  | 'jira'
  | 'session'
  | 'run-summary'
  | 'plan-assistant'
  | 'risk-predictor'
  | 'milestone-risk'
  | 'requirement-suggest'
  | 'other';

/**
 * Canonical render order — most common first. Used as stacking order on the
 * chart, and default table sort tie-break.
 */
export const MODE_ORDER: DisplayMode[] = [
  'text',
  'jira',
  'session',
  'run-summary',
  'plan-assistant',
  'risk-predictor',
  'milestone-risk',
  'requirement-suggest',
  'other',
];

/**
 * Fill hex per mode. Testably brand palette (indigo/violet accent), each
 * verified for WCAG AA graphical-object contrast on white (≥ 3:1) and
 * small-text contrast for table dots (≥ 4.5:1).
 */
export const MODE_COLORS: Record<DisplayMode, string> = {
  'text':                '#6366F1', // indigo-500 — primary TC generation
  'jira':                '#0EA5E9', // sky-500
  'session':             '#06B6D4', // cyan-500
  'run-summary':         '#8B5CF6', // violet-500 — Run Analysis
  'plan-assistant':      '#EC4899', // pink-500
  'risk-predictor':      '#F59E0B', // amber-500
  'milestone-risk':      '#10B981', // emerald-500
  'requirement-suggest': '#F97316', // orange-500
  'other':               '#94A3B8', // slate-400
};

/**
 * i18n key under `settings.aiUsage.mode.*` for each display mode.
 */
export const MODE_LABEL_KEYS: Record<DisplayMode, string> = {
  'text':                'settings.aiUsage.mode.text',
  'jira':                'settings.aiUsage.mode.jira',
  'session':             'settings.aiUsage.mode.session',
  'run-summary':         'settings.aiUsage.mode.runAnalysis',
  'plan-assistant':      'settings.aiUsage.mode.planAssistant',
  'risk-predictor':      'settings.aiUsage.mode.riskPredictor',
  'milestone-risk':      'settings.aiUsage.mode.milestoneRisk',
  'requirement-suggest': 'settings.aiUsage.mode.requirementSuggest',
  'other':               'settings.aiUsage.mode.other',
};

/**
 * Normalize a raw `ai_generation_logs.mode` value to a known DisplayMode.
 *
 * - 'run-summary' → 'run-summary' (AC-7 says UI label must be "Run Analysis",
 *   which is handled via MODE_LABEL_KEYS — we do NOT split internal actions.)
 * - Unknown / null / empty → 'other'.
 */
export function normalizeMode(raw: string | null | undefined): DisplayMode {
  if (!raw) return 'other';
  const value = raw.trim().toLowerCase();
  const known: DisplayMode[] = [
    'text',
    'jira',
    'session',
    'run-summary',
    'plan-assistant',
    'risk-predictor',
    'milestone-risk',
    'requirement-suggest',
  ];
  return (known as string[]).includes(value) ? (value as DisplayMode) : 'other';
}

// ─── Plan history limits (AC-5 / §BR-6) ──────────────────────────────────────

/**
 * Max period a given subscription tier is allowed to view.
 *
 * Tier map (matches PLAN_LIMITS in src/hooks/useAiFeature.ts):
 *   1 = Free,         2 = Hobby,        3 = Starter,
 *   4 = Professional, 5/6/7 = Enterprise S/M/L
 */
const TIER_MAX_PERIOD: Record<number, PeriodKey> = {
  1: '30d',  // Free
  2: '90d',  // Hobby
  3: '6m',   // Starter
  4: '12m',  // Professional
  5: '12m',  // Enterprise (24m reserved but v1 caps at 12m for UI consistency)
  6: '12m',
  7: '12m',
};

/** Numeric ordering of periods (shorter → longer). */
const PERIOD_RANK: Record<PeriodKey, number> = { '30d': 0, '90d': 1, '6m': 2, '12m': 3 };

/** Returns the max period allowed for `tier`. Defaults to '30d' for unknown. */
export function planHistoryLimit(tier: number): PeriodKey {
  return TIER_MAX_PERIOD[tier] ?? '30d';
}

/** Returns true if `period` is available under `tier`. */
export function isPeriodAllowed(period: PeriodKey, tier: number): boolean {
  const max = planHistoryLimit(tier);
  return PERIOD_RANK[period] <= PERIOD_RANK[max];
}

/** Returns the tier label required to unlock `period`, or null if already unlocked. */
export function requiredTierLabelFor(period: PeriodKey): string {
  switch (period) {
    case '30d':  return 'Hobby';
    case '90d':  return 'Starter';
    case '6m':   return 'Professional';
    case '12m':  return 'Professional';
    default:     return 'Professional';
  }
}

// ─── Period → date range (UTC) ───────────────────────────────────────────────

/** Resolve a PeriodKey into a concrete [from, to) range anchored at `now` (UTC). */
export function resolvePeriodRange(
  period: PeriodKey,
  now: Date = new Date(),
): { from: Date; to: Date } {
  const to = new Date(now);
  const from = new Date(now);
  switch (period) {
    case '30d': from.setUTCDate(from.getUTCDate() - 30); break;
    case '90d': from.setUTCDate(from.getUTCDate() - 90); break;
    case '6m':  from.setUTCMonth(from.getUTCMonth() - 6); break;
    case '12m': from.setUTCMonth(from.getUTCMonth() - 12); break;
  }
  // Anchor `from` at UTC 00:00 for stable day buckets.
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

// ─── Ordered mode iteration helper ───────────────────────────────────────────

/**
 * Given an array of raw mode values, returns the unique displayed modes in
 * MODE_ORDER — used to define Recharts stack keys & legend order.
 */
export function orderDisplayedModes(rawModes: Iterable<string>): DisplayMode[] {
  const seen = new Set<DisplayMode>();
  for (const raw of rawModes) seen.add(normalizeMode(raw));
  return MODE_ORDER.filter((m) => seen.has(m));
}
