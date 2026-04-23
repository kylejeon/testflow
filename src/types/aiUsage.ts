/**
 * f011 — AI Token Budget Monitoring Dashboard
 * Related spec: docs/specs/dev-spec-f011-ai-token-budget-dashboard.md §6
 *
 * Shared types for:
 *   - Team View RPC (`get_ai_usage_breakdown`) response rows
 *   - Self View direct-query rows (ai_generation_logs)
 *   - Derived/aggregated shapes consumed by charts & tables
 */

// ─── RPC response ────────────────────────────────────────────────────────────

/** Raw row shape returned by `rpc('get_ai_usage_breakdown')`. */
export interface AiUsageBreakdownRow {
  /** 'YYYY-MM-DD' — UTC-anchored day bucket */
  day: string;
  /** raw mode value stored in ai_generation_logs (e.g. 'text', 'run-summary') */
  mode: string;
  /** uuid of the user who triggered the AI call */
  user_id: string;
  credits_sum: number;
  call_count: number;
  tokens_sum: number;
}

// ─── Self View direct-query rows ─────────────────────────────────────────────

/** Raw row shape returned by `supabase.from('ai_generation_logs').select(...)` (Self View). */
export interface AiGenerationLogRow {
  created_at: string;
  mode: string;
  credits_used: number | null;
  tokens_used?: number | null;
}

// ─── Derived shapes (client-side aggregation) ────────────────────────────────

/** Per-day bucket — stacked bar chart data point (one entry per mode key as dynamic prop). */
export interface DailySeriesPoint {
  /** 'YYYY-MM-DD' (UTC) */
  day: string;
  /** Recharts XAxis display label (e.g. 'Apr 12') */
  label: string;
  /** Sum of all modes for that day */
  total: number;
  /** Dynamic keys, one per mode (e.g. text: 3, jira: 2, 'run-summary': 1) */
  [mode: string]: string | number;
}

/** Mode breakdown row for the "Breakdown by Feature" table. */
export interface ModeBreakdownRow {
  mode: string;
  label: string;
  credits: number;
  calls: number;
  /** 0..100 — share of total credits for the period */
  percent: number;
  /** hex color from MODE_COLORS */
  color: string;
}

/** Member contribution row for the "Team Contribution" table. */
export interface MemberContributionRow {
  userId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  credits: number;
  percent: number;
}

// ─── Filter / plan helpers ───────────────────────────────────────────────────

/**
 * Period filter keys.
 * - `thisMonth`: calendar-month-to-date in UTC (matches sidebar `getSharedPoolUsage` scope).
 *               Default on page load so panel, KPI and CSV all agree on the same window.
 * - `30d` / `90d` / `6m` / `12m`: rolling windows anchored at `now`.
 */
export type PeriodKey = 'thisMonth' | '30d' | '90d' | '6m' | '12m';

export interface PeriodRange {
  from: Date;
  to: Date;
}
