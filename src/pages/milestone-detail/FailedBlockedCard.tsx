import { useTranslation } from 'react-i18next';

interface TcItem {
  tcId: string;
  tcName: string;
  status: 'failed' | 'blocked';
  runName: string;
}

interface FailedBlockedCardProps {
  tcs: TcItem[];
  onViewAll: () => void;
  totalCount: number;
}

/**
 * Design-spec §4-2 (A) — Failed & Blocked top 4.
 */
export default function FailedBlockedCard({ tcs, onViewAll, totalCount }: FailedBlockedCardProps) {
  const { t } = useTranslation('milestones');
  return (
    <article className="mo-panel" aria-label={t('detail.overview.failedBlocked.a11y.region')}>
      <div className="mo-panel-head">
        <i className="ri-error-warning-line" style={{ color: 'var(--danger)' }} />
        {t('detail.overview.failedBlocked.title')}
        {totalCount > 3 && (
          <button type="button" className="right link" onClick={onViewAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('detail.overview.failedBlocked.viewAll')}
          </button>
        )}
      </div>
      {tcs.length === 0 ? (
        <div style={{ padding: '8px 0', color: 'var(--text-subtle)', fontSize: '11.5px', textAlign: 'center' }}>
          {t('detail.overview.failedBlocked.empty')}
        </div>
      ) : (
        tcs.slice(0, 3).map((tc, i) => (
          <div key={tc.tcId + i} className="mo-bl-row">
            <div className={`num${tc.status === 'blocked' ? ' warn' : ''}`}>
              {tc.status === 'failed' ? 'F' : 'B'}
            </div>
            <span className="lbl">{tc.tcName}</span>
          </div>
        ))
      )}
    </article>
  );
}
