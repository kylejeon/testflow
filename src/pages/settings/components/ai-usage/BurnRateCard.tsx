/**
 * f011 — Burn Rate card (AC-3, AC-12)
 * Design Spec §3-2 "Card 2 — Burn Rate" + "Card 1 — This Month (Enterprise variant)"
 *
 * Two variants:
 *   - 'thisMonth' (card 1): used / limit, progress bar, Enterprise unlimited branch
 *   - 'burnRate'  (card 2): credits/day + estimated depletion + on-track/warning badge
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import KpiCard from './KpiCard';

export type BurnRateVariant = 'thisMonth' | 'burnRate';

export interface BurnRateCardProps {
  variant: BurnRateVariant;
  /** Total credits used in the current billing cycle */
  used: number;
  /** Monthly plan limit (-1 means unlimited / Enterprise) */
  limit: number;
  /** Days remaining in the current billing cycle (1..31) */
  daysLeftInCycle: number;
  /** Days that have elapsed in the current cycle (1..31). Used to compute per-day rate. */
  daysElapsedInCycle: number;
  className?: string;
  testId?: string;
}

/**
 * Pure helpers — exported for unit tests.
 */
export function calcBurnRatePerDay(used: number, daysElapsedInCycle: number): number {
  if (daysElapsedInCycle <= 0) return 0;
  return used / daysElapsedInCycle;
}

export function calcEstimatedDepletionDays(
  used: number,
  limit: number,
  perDay: number,
): number | null {
  if (limit < 0) return null; // unlimited
  if (perDay <= 0) return null;
  const remaining = Math.max(0, limit - used);
  if (remaining === 0) return 0;
  return Math.floor(remaining / perDay);
}

export function formatDepletionDate(daysFromNow: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BurnRateCard({
  variant,
  used,
  limit,
  daysLeftInCycle,
  daysElapsedInCycle,
  className = '',
  testId,
}: BurnRateCardProps) {
  const { t } = useTranslation('settings');

  const perDay = useMemo(
    () => calcBurnRatePerDay(used, daysElapsedInCycle),
    [used, daysElapsedInCycle],
  );
  const daysToDeplete = useMemo(
    () => calcEstimatedDepletionDays(used, limit, perDay),
    [used, limit, perDay],
  );

  // ── Variant: thisMonth (card 1) ───────────────────────────────────────────
  if (variant === 'thisMonth') {
    if (limit < 0) {
      return (
        <KpiCard
          testId={testId ?? 'ai-usage-kpi-this-month'}
          eyebrow={t('aiUsage.kpi.thisMonthLabel')}
          primary={
            <span className="text-emerald-600 dark:text-emerald-400">
              {t('aiUsage.burnRate.unlimited', { used })}
            </span>
          }
          sub={
            <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">
              <span aria-hidden="true">∞</span> Enterprise
            </span>
          }
          className={className}
        />
      );
    }

    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const fillClass =
      pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';

    return (
      <KpiCard
        testId={testId ?? 'ai-usage-kpi-this-month'}
        eyebrow={t('aiUsage.kpi.thisMonthLabel')}
        primary={
          <>
            {used}
            <span className="text-slate-400 dark:text-slate-500 text-base font-normal ml-1">
              / {limit}
            </span>
          </>
        }
        sub={t('aiUsage.kpi.thisMonthSub', { pct })}
        footer={
          <>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${fillClass}`}
                style={{ width: `${pct}%` }}
                data-testid="burn-rate-progress-fill"
              />
            </div>
            <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-2">
              {t('aiUsage.burnRate.daysLeft', { n: daysLeftInCycle })}
            </div>
          </>
        }
        className={className}
      />
    );
  }

  // ── Variant: burnRate (card 2) ────────────────────────────────────────────
  const perDayRounded = Math.round(perDay * 10) / 10;

  // on-track: (perDay × daysLeft + used) <= limit
  const projected = used + perDay * daysLeftInCycle;
  const onTrack = limit < 0 || projected <= limit;

  const depletionStr =
    daysToDeplete !== null ? formatDepletionDate(daysToDeplete) : '—';

  return (
    <KpiCard
      testId={testId ?? 'ai-usage-kpi-burn-rate'}
      eyebrow={t('aiUsage.kpi.burnRateLabel')}
      primary={
        <span>
          {perDayRounded}
          <span className="text-slate-400 dark:text-slate-500 text-base font-normal ml-1">
            /day
          </span>
        </span>
      }
      sub={
        limit < 0
          ? t('aiUsage.burnRate.unlimited', { used })
          : t('aiUsage.burnRate.estimatedDepletion', { date: depletionStr })
      }
      footer={
        limit < 0 ? null : (
          <span
            className={`inline-flex items-center gap-1 text-[0.6875rem] font-semibold rounded-full px-2 py-0.5 ${
              onTrack
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
            data-testid={onTrack ? 'burn-rate-on-track' : 'burn-rate-warning'}
          >
            <i
              className={onTrack ? 'ri-check-line' : 'ri-alert-line'}
              aria-hidden="true"
            />
            {onTrack
              ? t('aiUsage.burnRate.onTrack')
              : t('aiUsage.burnRate.warning')}
          </span>
        )
      }
      className={className}
    />
  );
}
