/**
 * f011 — Recharts custom tooltip for the Daily Usage stacked bar.
 * Design Spec §3-3 Tooltip
 */

import { useTranslation } from 'react-i18next';
import type { DisplayMode } from '../../../../lib/aiUsageMeta';
import { MODE_COLORS, MODE_LABEL_KEYS, normalizeMode } from '../../../../lib/aiUsageMeta';

interface RechartsPayloadItem {
  value?: number;
  name?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: RechartsPayloadItem[];
  label?: string;
}

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  const { t } = useTranslation('settings');
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload
    .filter((p) => typeof p.value === 'number' && (p.value as number) > 0)
    .map((p) => ({
      mode: normalizeMode(p.dataKey as string),
      value: p.value as number,
    }))
    .sort((a, b) => b.value - a.value);

  const total = rows.reduce((sum, r) => sum + r.value, 0);

  return (
    <div
      role="tooltip"
      className="bg-white border border-slate-200 rounded-lg p-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)] min-w-[180px] dark:bg-slate-900 dark:border-white/10"
    >
      <div className="text-[0.6875rem] font-semibold text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-white/[0.06] mb-2">
        {label}
      </div>
      <div className="space-y-1">
        {rows.map(({ mode, value }) => (
          <div key={mode} className="flex items-center justify-between gap-4 text-[0.75rem]">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: MODE_COLORS[mode as DisplayMode] }}
              />
              {t(MODE_LABEL_KEYS[mode as DisplayMode])}
            </span>
            <span className="text-slate-900 dark:text-white tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[0.75rem] font-bold text-slate-900 dark:text-white">
        <span>{t('aiUsage.chart.total')}</span>
        <span className="tabular-nums">{total}</span>
      </div>
    </div>
  );
}
