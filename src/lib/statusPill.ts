/**
 * Status → variant mapping for `<StatusPill />` and tone decision for `<ProgressBar />`.
 *
 * Dev Spec: pm/specs/dev-spec-milestone-badge-progress-consistency.md §3 / §5.1
 * Design Spec: pm/specs/design-spec-milestone-badge-progress-consistency.md §1 / §2
 *
 * Scope: Milestone Detail Overview Execution cards.
 * Keep this map as the **single source of truth**. Adding new status strings: patch here only.
 */

export type StatusVariant = 'gray' | 'blue' | 'green' | 'red' | 'amber';
export type ProgressTone = 'blue' | 'green' | 'red' | 'gray';

interface StatusEntry {
  variant: StatusVariant;
  label: string;
}

const STATUS_TO_VARIANT: Record<string, StatusEntry> = {
  // Gray — not started / draft / planning states
  not_started: { variant: 'gray', label: 'Not Started' },
  new:         { variant: 'gray', label: 'New' },
  upcoming:    { variant: 'gray', label: 'Upcoming' },
  planning:    { variant: 'gray', label: 'Planning' },
  draft:       { variant: 'gray', label: 'Draft' },
  backlog:     { variant: 'gray', label: 'Backlog' },

  // Blue — in progress
  in_progress: { variant: 'blue', label: 'In Progress' },
  started:     { variant: 'blue', label: 'In Progress' },
  active:      { variant: 'blue', label: 'In Progress' },
  ongoing:     { variant: 'blue', label: 'In Progress' },
  open:        { variant: 'blue', label: 'Open' },

  // Green — done / completed
  completed: { variant: 'green', label: 'Completed' },
  done:      { variant: 'green', label: 'Done' },
  ready:     { variant: 'green', label: 'Ready' },
  closed:    { variant: 'green', label: 'Closed' },
  passed:    { variant: 'green', label: 'Passed' },

  // Red — failure / overdue / cancelled
  past_due:  { variant: 'red', label: 'Overdue' },
  overdue:   { variant: 'red', label: 'Overdue' },
  failed:    { variant: 'red', label: 'Failed' },
  blocked:   { variant: 'red', label: 'Blocked' },
  cancelled: { variant: 'red', label: 'Cancelled' },

  // Amber — at risk / on hold / paused / under review
  at_risk:      { variant: 'amber', label: 'At Risk' },
  on_hold:      { variant: 'amber', label: 'On Hold' },
  paused:       { variant: 'amber', label: 'Paused' },
  under_review: { variant: 'amber', label: 'Under Review' },
};

/** "on_hold_legacy" → "On Hold Legacy". Empty string → "Unknown" (Design Spec §4.1). */
export function humanizeStatus(status: string): string {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Resolve { variant, label } from a DB status string. Unknown → gray + humanized label. */
export function resolveStatus(status: string): StatusEntry {
  const hit = STATUS_TO_VARIANT[status];
  if (hit) return hit;
  return { variant: 'gray', label: humanizeStatus(status) };
}

/** Shorthand for callers that only need the variant. */
export function getStatusVariant(status: string): StatusVariant {
  return resolveStatus(status).variant;
}

/**
 * ProgressBar tone decision (Dev Spec AC-9 / AC-11).
 * - 100% → green (wins over overdue per AC-11)
 * - overdue/failed/blocked → red
 * - in progress (blue variant) → blue
 * - otherwise → gray (matches Sub Milestone prior "success" fallback behavior conceptually;
 *   callers may override if a specific tone is needed)
 *
 * NOTE: Dev Spec §5.2 leaves the final tone decision to the caller ("호출부가 tone을 결정").
 * This helper is a convenience that covers the common case. Caller may still pass tone directly.
 */
export function getProgressTone(
  status: string,
  progress: number,
  isOverdue?: boolean,
): ProgressTone {
  const pct = Number.isFinite(progress) ? progress : 0;
  if (pct >= 100) return 'green'; // AC-11: green wins over overdue at 100%
  if (isOverdue) return 'red';
  const variant = getStatusVariant(status);
  if (variant === 'red') return 'red';
  if (variant === 'green') return 'green';
  if (variant === 'blue') return 'blue';
  return 'gray';
}
