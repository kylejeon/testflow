/**
 * f011 — Breakdown by Feature table
 * Design Spec §3-4 (ModeBreakdownTable)
 * AC-6 (mode totals, %, call counts, DESC by credits)
 */

import { useTranslation } from 'react-i18next';
import type { ModeBreakdownRow } from '../../../../types/aiUsage';

export interface ModeBreakdownTableProps {
  rows: ModeBreakdownRow[];
  className?: string;
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export default function ModeBreakdownTable({ rows, className = '' }: ModeBreakdownTableProps) {
  const { t } = useTranslation('settings');

  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden dark:bg-slate-800 dark:border-white/10 ${className}`}
      data-testid="ai-usage-mode-breakdown"
    >
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-white/[0.06]">
        <h3 className="text-[0.9375rem] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <i className="ri-pie-chart-line text-violet-500" aria-hidden="true" />
          {t('aiUsage.modeBreakdown.title')}
        </h3>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50 dark:bg-white/[0.03] dark:border-white/[0.06]">
            <th
              scope="col"
              className="text-left px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.modeBreakdown.colFeature')}
            </th>
            <th
              scope="col"
              className="text-right px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.modeBreakdown.colCredits')}
            </th>
            <th
              scope="col"
              className="text-right px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.modeBreakdown.colPercent')}
            </th>
            <th
              scope="col"
              className="text-right px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            >
              {t('aiUsage.modeBreakdown.colCalls')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.mode}
              data-testid={`mode-row-${row.mode}`}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors dark:border-white/[0.06] dark:hover:bg-white/[0.04]"
            >
              <td className="px-4 py-3 text-[0.8125rem] text-slate-800 dark:text-slate-200 font-medium">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: row.color }}
                  />
                  <span className="truncate">{row.label}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-[0.8125rem] text-slate-900 dark:text-white font-semibold tabular-nums text-right">
                {row.credits}
              </td>
              <td className="px-4 py-3 text-[0.8125rem] text-slate-500 dark:text-slate-400 tabular-nums text-right">
                {formatPercent(row.percent)}
              </td>
              <td className="px-4 py-3 text-[0.8125rem] text-slate-500 dark:text-slate-400 tabular-nums text-right">
                {row.calls}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
