import type { ProgressTone } from '../lib/statusPill';

export type { ProgressTone };

export interface ProgressBarProps {
  /** 0–100. NaN / undefined / negative → 0. > 100 → 100. */
  value: number;
  /** Fill color hint. Default `'blue'`. */
  tone?: ProgressTone;
  /** Track width in px. Default 80 (matches legacy Sub Milestone bar). */
  width?: number;
  /** Track height in px. Default 6 (Dev Spec AC-9). */
  height?: number;
  /** Show the `{pct}%` label to the right of the bar. Default `true`. */
  showLabel?: boolean;
  className?: string;
}

const FILL_CLASSES: Record<ProgressTone, string> = {
  blue:  'bg-blue-500',
  green: 'bg-green-500',
  red:   'bg-red-500',
  gray:  'bg-gray-400',
};

const LABEL_TONE_CLASSES: Record<ProgressTone, string> = {
  blue:  'text-gray-900',
  green: 'text-green-700',
  red:   'text-red-700',
  gray:  'text-gray-500',
};

function clampPct(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return raw;
}

/**
 * Plain progress bar — track + fill + optional percent label.
 *
 * Dev Spec: pm/specs/dev-spec-milestone-badge-progress-consistency.md §5.2
 * Design Spec: pm/specs/design-spec-milestone-badge-progress-consistency.md §2
 *
 * The outer wrapper carries `.progress-bar-wrap` so `index.css` can hide it on
 * mobile breakpoints (<768px) per Design Spec §6.
 */
export default function ProgressBar({
  value,
  tone = 'blue',
  width = 80,
  height = 6,
  showLabel = true,
  className = '',
}: ProgressBarProps) {
  const pct = clampPct(value);
  const radius = height / 2;
  return (
    <div
      className={`progress-bar-wrap inline-flex items-center ${showLabel ? 'gap-[10px]' : ''} ${className}`}
    >
      <div
        className="relative overflow-hidden bg-gray-200"
        style={{ width, height, borderRadius: radius }}
      >
        <div
          className={`absolute inset-y-0 left-0 ${FILL_CLASSES[tone]} transition-[width] duration-200 ease-out`}
          style={{ width: `${pct}%`, borderRadius: radius }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span
          className={`min-w-[38px] text-right text-[13px] font-semibold ${LABEL_TONE_CLASSES[tone]}`}
        >
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
