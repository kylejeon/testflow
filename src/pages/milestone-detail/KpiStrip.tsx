interface KpiStripProps {
  remaining: number;
  executed: number;
  total: number;
  velocityPerDay: number | null;
  passed: number;
  passRate: number;
}

/**
 * 4 KPI strip under Burndown chart.
 * Design-spec §4-1 KPI Strip Data.
 */
export default function KpiStrip({ remaining, executed, total, velocityPerDay, passed, passRate }: KpiStripProps) {
  return (
    <div className="mo-kpi-strip">
      <div className="mo-kpi">
        <div className="l">Remaining</div>
        <div className="v">{remaining}</div>
        <div className="sub">{total} total</div>
      </div>
      <div className="mo-kpi">
        <div className="l">Executed</div>
        <div className="v">{executed}</div>
        <div className="sub">of {total}</div>
      </div>
      <div className="mo-kpi">
        <div className="l">Velocity</div>
        <div className="v">{velocityPerDay != null ? velocityPerDay.toFixed(1) : '—'}</div>
        <div className="sub">TCs / day</div>
      </div>
      <div className="mo-kpi">
        <div className="l">Pass Rate</div>
        <div className="v" style={{ color: passRate >= 70 ? 'var(--success-600)' : passRate >= 40 ? 'var(--warning)' : 'var(--danger-600)' }}>{passRate}%</div>
        <div className="sub">{passed} passed</div>
      </div>
    </div>
  );
}
