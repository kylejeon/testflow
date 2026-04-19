interface ActivityLogLike {
  id: string;
  type: string;
  testCaseName: string;
  runName: string;
  timestamp: Date;
  author: string;
}

interface Activity24hFeedProps {
  logs: ActivityLogLike[];
  onViewAll: () => void;
}

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

/**
 * Design-spec §4-2 (F) — Activity 24h feed (span 2).
 */
export default function Activity24hFeed({ logs, onViewAll }: Activity24hFeedProps) {
  const feedLogs = logs.slice(0, 4);

  return (
    <article className="mo-panel span-2" aria-label="Activity last 24 hours">
      <div className="mo-panel-head">
        <i className="ri-history-line" style={{ color: 'var(--text-muted)' }} />
        Activity — Last 24h
        <button type="button" className="right link" onClick={onViewAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          View full activity →
        </button>
      </div>
      {feedLogs.length === 0 ? (
        <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '11.5px' }}>
          No activity in the last 24 hours
        </div>
      ) : (
        <div className="mo-feed">
          {feedLogs.map(log => {
            const dotCls =
              log.type === 'passed' ? 'success'
              : log.type === 'failed' || log.type === 'blocked' ? 'fail'
              : log.type === 'note' ? 'info'
              : 'info';
            const action =
              log.type === 'passed' ? 'passed'
              : log.type === 'failed' ? 'failed'
              : log.type === 'blocked' ? 'blocked'
              : log.type === 'retest' ? 'retested'
              : 'noted';
            return (
              <div key={log.id} className="mo-feed-row">
                <span className={`mo-feed-dot ${dotCls}`} />
                <span className="what">
                  <b>{log.author || 'Someone'}</b> {action} <b>{log.testCaseName}</b>
                  {log.runName ? <> in {log.runName}</> : null}
                </span>
                <span className="when">{relativeTime(log.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
