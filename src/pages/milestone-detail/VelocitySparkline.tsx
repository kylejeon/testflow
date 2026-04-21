import { useTranslation } from 'react-i18next';

interface VelocitySparklineProps {
  weekCounts: number[]; // length 7 (Mon..Sun most recent)
}

/**
 * Design-spec §4-2 (B) — 7-day sparkline.
 */
export default function VelocitySparkline({ weekCounts }: VelocitySparklineProps) {
  const { t } = useTranslation(['milestones', 'common']);
  const max = Math.max(1, ...weekCounts);
  const hasData = weekCounts.some(c => c > 0);
  const avg = hasData ? (weekCounts.reduce((a, b) => a + b, 0) / 7).toFixed(1) : '0';

  const dayLabels = [
    t('common:weekday.short.mon'),
    t('common:weekday.short.tue'),
    t('common:weekday.short.wed'),
    t('common:weekday.short.thu'),
    t('common:weekday.short.fri'),
    t('common:weekday.short.sat'),
    t('common:weekday.short.sun'),
  ];

  return (
    <article className="mo-panel" aria-label={t('milestones:detail.overview.velocity.a11y.region')}>
      <div className="mo-panel-head">
        <i className="ri-bar-chart-2-line" style={{ color: 'var(--primary)' }} />
        {t('milestones:detail.overview.velocity.title')}
        <span className="right">
          {hasData
            ? t('milestones:detail.overview.velocity.avgSuffix', { avg })
            : t('milestones:detail.overview.velocity.noExecutions')}
        </span>
      </div>
      <div className="mo-spark">
        {weekCounts.map((c, i) => {
          const isToday = i === weekCounts.length - 1;
          const pct = hasData ? Math.max(6, (c / max) * 100) : 6;
          const cls = isToday ? 'bar today' : (c > 0 ? 'bar' : 'bar low');
          return <div key={i} className={cls} style={{ height: `${pct}%` }} />;
        })}
      </div>
      <div className="mo-spark-x">
        {dayLabels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </article>
  );
}
