interface EtaCardProps {
  daysLeft: number | null;
  daysElapsed: number;
  daysTotal: number;
  projDays: number | null; // projected days until completion based on velocity
  onTrack: boolean;
}

/**
 * Design-spec §4-2 (D) — ETA vs Target D-day.
 */
export default function EtaCard({ daysLeft, daysElapsed, daysTotal, projDays, onTrack }: EtaCardProps) {
  const elapsedPct = daysTotal > 0 ? Math.min(100, Math.round((daysElapsed / daysTotal) * 100)) : 0;

  if (daysLeft == null) {
    return (
      <article className="mo-panel" aria-label="ETA versus target">
        <div className="mo-panel-head">
          <i className="ri-time-line" style={{ color: 'var(--warning)' }} />
          ETA
        </div>
        <div style={{ padding: '8px 0', color: 'var(--text-subtle)', fontSize: '11.5px', textAlign: 'center' }}>
          Set milestone dates to see ETA
        </div>
      </article>
    );
  }

  const gapDays = projDays != null ? (projDays - daysLeft) : null;
  const dLabel = daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`;

  return (
    <article className="mo-panel" aria-label="ETA versus target">
      <div className="mo-panel-head">
        <i className="ri-time-line" style={{ color: 'var(--warning)' }} />
        ETA vs Target
        <span className="right" style={{ fontWeight: 600, color: onTrack ? 'var(--success-600)' : 'var(--danger-600)' }}>
          {dLabel}
        </span>
      </div>
      <div className="mo-eta-values">
        <span className="eta-primary" style={{ color: onTrack ? 'var(--success-600)' : 'var(--danger-600)' }}>
          {projDays != null ? `${projDays}d` : '—'}
        </span>
        <span className="vs">vs</span>
        <span className="target">{daysLeft}d target</span>
      </div>
      <div className="mo-eta-bar">
        <div className="actual" style={{ width: `${elapsedPct}%` }} />
        <div className="now" style={{ left: `${elapsedPct}%` }} />
      </div>
      <div className="mo-eta-footer">
        {daysElapsed}d elapsed of {daysTotal}d
        {gapDays != null && (
          <> · <span className={gapDays <= 0 ? 'gap-pos' : 'gap-neg'}>
            {gapDays <= 0 ? 'on track' : `+${gapDays}d gap`}
          </span></>
        )}
      </div>
    </article>
  );
}
