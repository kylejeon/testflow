/**
 * f011 — Daily Usage chart (stacked bar by mode)
 * Design Spec §3-3 (DailyUsageChart)
 * AC-4 (stacked bar, 30d default), AC-16 (aria-label + SR table), AC-17 (brand palette)
 */

import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailySeriesPoint } from '../../../../types/aiUsage';
import type { DisplayMode } from '../../../../lib/aiUsageMeta';
import { MODE_COLORS, MODE_LABEL_KEYS } from '../../../../lib/aiUsageMeta';
import ChartTooltip from './ChartTooltip';

export interface DailyUsageChartProps {
  data: DailySeriesPoint[];
  /** Modes actually present in data (MODE_ORDER filtered) — chart stack keys */
  modes: DisplayMode[];
  /** 'YYYY-MM-DD' formatted period start (for subtitle) */
  fromLabel: string;
  /** 'YYYY-MM-DD' formatted period end (for subtitle) */
  toLabel: string;
  /** Override animation (used for reduced-motion preference) */
  animationEnabled?: boolean;
  className?: string;
}

export default function DailyUsageChart({
  data,
  modes,
  fromLabel,
  toLabel,
  animationEnabled = true,
  className = '',
}: DailyUsageChartProps) {
  const { t } = useTranslation('settings');

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 dark:bg-slate-800 dark:border-white/10 ${className}`}
      data-testid="ai-usage-daily-chart"
    >
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[0.9375rem] font-semibold text-slate-900 dark:text-white">
            {t('aiUsage.chart.title')}
          </h3>
          <p className="text-[0.75rem] text-slate-500 dark:text-slate-400 mt-0.5">
            {t('aiUsage.chart.period', { from: fromLabel, to: toLabel })}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="chart legend">
          {modes.map((mode) => (
            <li
              key={mode}
              className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-600 dark:text-slate-300"
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: MODE_COLORS[mode] }}
              />
              {t(MODE_LABEL_KEYS[mode])}
            </li>
          ))}
        </ul>
      </div>

      <div
        role="img"
        aria-label={t('aiUsage.chart.ariaLabel')}
        className="h-[280px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'rgba(99,102,241,0.06)' }}
            />
            {modes.map((mode, idx) => (
              <Bar
                key={mode}
                dataKey={mode}
                stackId="a"
                fill={MODE_COLORS[mode]}
                isAnimationActive={animationEnabled}
                radius={idx === modes.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AC-16 Screen reader alt table */}
      <table className="sr-only" aria-label={t('aiUsage.chart.srTableCaption')}>
        <caption>{t('aiUsage.chart.srTableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('aiUsage.chart.srColDate')}</th>
            {modes.map((mode) => (
              <th key={mode} scope="col">
                {t(MODE_LABEL_KEYS[mode])}
              </th>
            ))}
            <th scope="col">{t('aiUsage.chart.srColCredits')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              {modes.map((mode) => (
                <td key={mode}>{row[mode] ?? 0}</td>
              ))}
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
