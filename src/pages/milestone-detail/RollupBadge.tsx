import { useTranslation } from 'react-i18next';

interface RollupBadgeProps {
  /** Number of sub milestones. Badge only renders when visible && count >= 1. */
  count: number;
  /** isAggregated — true when parent has sub milestones with rollup stats. */
  visible: boolean;
}

/**
 * Header inline pill indicating the milestone stats are aggregated from N sub milestones.
 * Design-spec v3 §2. Static (no click interaction). `visible === false` returns null
 * (no space reservation). No internal loading state to avoid flicker during data fetch
 * — relies on the page-level skeleton (§12-2 #3).
 */
export default function RollupBadge({ count, visible }: RollupBadgeProps) {
  const { t } = useTranslation();
  if (!visible || count < 1) return null;

  const key = count === 1 ? 'milestones.rollupBadgeSingular' : 'milestones.rollupBadgePlural';
  const label = t(key, { n: count });

  return (
    <span
      className="mo-rollup-badge"
      data-count={count}
      role="img"
      aria-label={label}
      title={label}
    >
      <i className="ri-loop-left-line" aria-hidden="true" />
      <span className="label-text">{label}</span>
    </span>
  );
}
