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
  return (
    <article className="mo-panel span-2" aria-label="Failed and blocked test cases">
      <div className="mo-panel-head">
        <i className="ri-error-warning-line" style={{ color: 'var(--danger)' }} />
        Failed &amp; Blocked
        {totalCount > 4 && (
          <button type="button" className="right link" onClick={onViewAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            View all in Issues →
          </button>
        )}
      </div>
      {tcs.length === 0 ? (
        <div style={{ padding: '8px 0', color: 'var(--text-subtle)', fontSize: '11.5px', textAlign: 'center' }}>
          No failed or blocked TCs 🎉
        </div>
      ) : (
        tcs.slice(0, 4).map((tc, i) => (
          <div key={tc.tcId + i} className="mo-bl-row">
            <div className={`num${tc.status === 'blocked' ? ' warn' : ''}`}>
              {tc.status === 'failed' ? 'F' : 'B'}
            </div>
            <span className="lbl">{tc.tcName}</span>
            <span className="pct">{tc.runName?.slice(0, 12)}</span>
          </div>
        ))
      )}
    </article>
  );
}
