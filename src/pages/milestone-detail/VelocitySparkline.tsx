interface VelocitySparklineProps {
  weekCounts: number[]; // length 7 (Mon..Sun most recent)
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Design-spec §4-2 (B) — 7-day sparkline.
 */
export default function VelocitySparkline({ weekCounts }: VelocitySparklineProps) {
  const max = Math.max(1, ...weekCounts);
  const hasData = weekCounts.some(c => c > 0);
  const avg = hasData ? (weekCounts.reduce((a, b) => a + b, 0) / 7).toFixed(1) : '0';

  return (
    <article className="mo-panel" aria-label="Velocity last 7 days">
      <div className="mo-panel-head">
        <i className="ri-bar-chart-2-line" style={{ color: 'var(--primary)' }} />
        Velocity
        <span className="right">{hasData ? `${avg} avg` : 'no executions'}</span>
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
        {DAY_LABELS.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </article>
  );
}
