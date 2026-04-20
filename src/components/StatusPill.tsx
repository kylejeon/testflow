import { resolveStatus, type StatusVariant } from '../lib/statusPill';

export type { StatusVariant };

export interface StatusPillProps {
  /** DB status string (e.g. 'in_progress', 'active', 'past_due'). Required. */
  status: string;
  /** Override label. Defaults to the mapped label (or humanized status for unknown values). */
  label?: string;
  /** Force a variant. Defaults to the internal mapping. */
  variant?: StatusVariant;
  /** Size preset. `sm` reserved for future use — only `md` is wired in this spec. */
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  gray:  'bg-gray-100 text-gray-700',
  blue:  'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  red:   'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
};

const BASE =
  'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold';

/**
 * Status pill for entity-level statuses (Milestone / Plan / Run / Session).
 *
 * Dev Spec: pm/specs/dev-spec-milestone-badge-progress-consistency.md §5.1
 * Design Spec: pm/specs/design-spec-milestone-badge-progress-consistency.md §1
 *
 * NOT to be confused with `<StatusBadge />` (test result dot badge — passed/failed/etc.).
 * Static component. Hover/click/focus belongs to the parent `<Link>`.
 */
export default function StatusPill({
  status,
  label,
  variant,
  size: _size = 'md',
  className = '',
}: StatusPillProps) {
  const resolved = resolveStatus(status);
  const v: StatusVariant = variant ?? resolved.variant;
  const text = label ?? resolved.label;
  return (
    <span
      className={`${BASE} ${VARIANT_CLASSES[v]} ${className}`}
      aria-label={`Status: ${text}`}
    >
      {text}
    </span>
  );
}
