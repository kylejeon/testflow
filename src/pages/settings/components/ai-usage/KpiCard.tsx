/**
 * f011 — Generic KPI card primitive
 * Design Spec §3-2 (card layout, eyebrow + primary metric + sub + optional progress/badge)
 *
 * Specialised wrappers: BurnRateCard composes KpiCard.
 */

import type { ReactNode } from 'react';

export interface KpiCardProps {
  /** Short uppercase label above the metric (e.g. "THIS MONTH") */
  eyebrow: string;
  /** Primary metric — e.g. "37" or "1.8 credits/day" */
  primary: ReactNode;
  /** Smaller secondary copy rendered under primary */
  sub?: ReactNode;
  /** Optional footer (progress bar, trend badge, avatar stack, etc.) */
  footer?: ReactNode;
  /** Extra className on outer container */
  className?: string;
  /** a11y label for the card as a whole */
  ariaLabel?: string;
  testId?: string;
}

export default function KpiCard({
  eyebrow,
  primary,
  sub,
  footer,
  className = '',
  ariaLabel,
  testId,
}: KpiCardProps) {
  return (
    <section
      aria-label={ariaLabel ?? eyebrow}
      data-testid={testId}
      className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col dark:bg-slate-800 dark:border-white/10 ${className}`}
    >
      <div className="text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
        {eyebrow}
      </div>
      <div className="text-[1.75rem] font-bold text-slate-900 dark:text-white leading-none tabular-nums">
        {primary}
      </div>
      {sub && (
        <div className="text-[0.75rem] text-slate-500 dark:text-slate-400 mt-1">{sub}</div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </section>
  );
}
