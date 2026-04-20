export interface Segment {
  /** Count contributing to this segment. Must be >= 0. */
  count: number;
  /** Tailwind background class for the fill, e.g. `bg-indigo-500`. */
  className: string;
  /** Optional label used for aria-label summary (e.g. `Note`, `Bug`). */
  label?: string;
}

export interface SegmentedBarProps {
  segments: Segment[];
  /** Track width in px. Default 80 (matches ProgressBar default). */
  width?: number;
  /** Track height in px. Default 6 (matches ProgressBar default). */
  height?: number;
  className?: string;
}

/**
 * Segmented activity bar — a track split into N proportional segments by count.
 *
 * Used by Milestone Overview's Exploratory section to visualise note / bug /
 * observation / step ratios from `session_logs.type` instead of a single-fill
 * progress bar (sessions without TCs have no "completion %" concept).
 *
 * Behaviour:
 * - total === 0 → empty gray track (no fills rendered).
 * - total > 0   → each segment takes `count / total` of the track width.
 *   Zero-count segments are hidden (do not render) so non-zero segments keep
 *   crisp borders.
 * - The outer wrapper carries `.progress-bar-wrap` so existing
 *   `index.css` media query hides it on <768px, matching <ProgressBar />.
 */
export default function SegmentedBar({
  segments,
  width = 80,
  height = 6,
  className = '',
}: SegmentedBarProps) {
  const safeSegments = segments.map(s => ({ ...s, count: Math.max(0, Math.floor(s.count || 0)) }));
  const total = safeSegments.reduce((sum, s) => sum + s.count, 0);
  const radius = height / 2;

  // Build accessible label: "Session activity: 2 notes, 3 bugs, 1 observation, 0 steps"
  const ariaLabel = total === 0
    ? 'Session activity: no entries'
    : 'Session activity: ' + safeSegments
        .map(s => `${s.count} ${s.label ?? 'entries'}`)
        .join(', ');

  const visibleSegments = total > 0
    ? safeSegments.filter(s => s.count > 0)
    : [];

  return (
    <div className={`progress-bar-wrap inline-flex items-center ${className}`}>
      <div
        className="relative flex overflow-hidden bg-gray-200"
        style={{ width, height, borderRadius: radius }}
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-label={ariaLabel}
      >
        {visibleSegments.map((seg, idx) => {
          const basis = (seg.count / total) * 100;
          // 1px white gap between segments (not after the last one).
          const isLast = idx === visibleSegments.length - 1;
          return (
            <div
              key={`${seg.label ?? 'seg'}-${idx}`}
              className={seg.className}
              style={{
                flexBasis: `${basis}%`,
                flexGrow: 0,
                flexShrink: 0,
                borderRight: isLast ? undefined : '1px solid #ffffff',
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}
