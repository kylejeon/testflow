interface KpiStripProps {
  remaining: number;
  executed: number;
  total: number;
  velocityPerDay: number | null;
  passed: number;
  passRate: number;
  /** Days remaining until milestone end (null if no end date). */
  etaDaysLeft: number | null;
  /** Projected days until completion based on current velocity (null if no velocity). */
  etaProjDays: number | null;
  /** Whether projection completes before the milestone end. */
  etaOnTrack: boolean;
}

/**
 * 5 KPI strip under Burndown chart (Design-spec v3 §1-5).
 * Cells: Remaining | Executed | Velocity | Pass Rate | ETA (absorbed from v2 EtaCard).
 */
export default function KpiStrip({
  remaining, executed, total, velocityPerDay, passed, passRate,
  etaDaysLeft, etaProjDays, etaOnTrack,
}: KpiStripProps) {
  // ETA cell derived display
  const etaHasDate = etaDaysLeft !== null;
  const etaGap = etaHasDate && etaProjDays != null ? etaProjDays - etaDaysLeft! : null;
  const etaPrimary = !etaHasDate
    ? '—'
    : etaDaysLeft! < 0
      ? `D+${Math.abs(etaDaysLeft!)}`
      : `D-${etaDaysLeft!}`;
  const etaSubText = !etaHasDate
    ? 'No date set'
    : etaProjDays == null
      ? `${etaDaysLeft}d target`
      : etaOnTrack
        ? `on track · ${etaProjDays}d proj`
        : etaGap != null && etaGap > 0
          ? `+${etaGap}d gap`
          : `${etaProjDays}d proj`;
  const etaColorClass = etaHasDate ? (etaOnTrack ? 'on-track' : 'off-track') : '';

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
      <div className="mo-kpi eta">
        <div className="l">ETA</div>
        <div className={`v ${etaColorClass}`}>{etaPrimary}</div>
        <div className="sub">{etaSubText}</div>
      </div>
    </div>
  );
}
