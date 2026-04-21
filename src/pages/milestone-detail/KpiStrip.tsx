import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('milestones');
  // ETA cell derived display
  const etaHasDate = etaDaysLeft !== null;
  const etaGap = etaHasDate && etaProjDays != null ? etaProjDays - etaDaysLeft! : null;
  const etaPrimary = !etaHasDate
    ? '—'
    : etaDaysLeft! < 0
      ? `D+${Math.abs(etaDaysLeft!)}`
      : `D-${etaDaysLeft!}`;
  const etaSubText = !etaHasDate
    ? t('detail.overview.kpi.etaNoDate')
    : etaProjDays == null
      ? t('detail.overview.kpi.targetSuffix', { days: etaDaysLeft })
      : etaOnTrack
        ? t('detail.overview.kpi.etaOnTrack', { days: etaProjDays })
        : etaGap != null && etaGap > 0
          ? t('detail.overview.kpi.etaOffTrack', { days: etaGap })
          : t('detail.overview.kpi.projectedSuffix', { days: etaProjDays });
  const etaColorClass = etaHasDate ? (etaOnTrack ? 'on-track' : 'off-track') : '';

  return (
    <div className="mo-kpi-strip">
      <div className="mo-kpi">
        <div className="l">{t('detail.overview.kpi.remaining')}</div>
        <div className="v">{remaining}</div>
        <div className="sub">{t('detail.overview.kpi.totalSuffix', { n: total })}</div>
      </div>
      <div className="mo-kpi">
        <div className="l">{t('detail.overview.kpi.executed')}</div>
        <div className="v">{executed}</div>
        <div className="sub">{t('detail.overview.kpi.ofTotal', { n: total })}</div>
      </div>
      <div className="mo-kpi">
        <div className="l">{t('detail.overview.kpi.velocity')}</div>
        <div className="v">{velocityPerDay != null ? velocityPerDay.toFixed(1) : '—'}</div>
        <div className="sub">{t('detail.overview.kpi.tcsPerDay')}</div>
      </div>
      <div className="mo-kpi">
        <div className="l">{t('detail.overview.kpi.passRate')}</div>
        <div className="v" style={{ color: passRate >= 70 ? 'var(--success-600)' : passRate >= 40 ? 'var(--warning)' : 'var(--danger-600)' }}>{passRate}%</div>
        <div className="sub">{t('detail.overview.kpi.passedSuffix', { count: passed })}</div>
      </div>
      <div className="mo-kpi eta">
        <div className="l">{t('detail.overview.kpi.eta')}</div>
        <div className={`v ${etaColorClass}`}>{etaPrimary}</div>
        <div className="sub">{etaSubText}</div>
      </div>
    </div>
  );
}
