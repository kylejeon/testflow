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
  /** 'card' (default, original span-2 panel) or 'strip' (horizontal inline row). */
  variant?: 'card' | 'strip';
}

function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

function actionFor(type: string): string {
  return type === 'passed' ? 'passed'
    : type === 'failed' ? 'failed'
    : type === 'blocked' ? 'blocked'
    : type === 'retest' ? 'retested'
    : 'noted';
}

function dotFor(type: string): 'success' | 'fail' | 'info' {
  return type === 'passed' ? 'success'
    : type === 'failed' || type === 'blocked' ? 'fail'
    : 'info';
}

/**
 * Activity 24h feed.
 * - `variant="card"` (default): original span-2 panel used in v1 Intel grid.
 * - `variant="strip"`: compact horizontal row used by v2 Overview between Intel Strip and Bottom Row.
 */
export default function Activity24hFeed({ logs, onViewAll, variant = 'card' }: Activity24hFeedProps) {
  if (variant === 'strip') {
    const stripLogs = logs.slice(0, 4);
    return (
      <div className="mo-activity-strip" role="region" aria-label="Activity in the last 24 hours">
        <span className="label">
          <i className="ri-history-line" aria-hidden="true" /> Last 24h
        </span>
        {stripLogs.length === 0 ? (
          <span className="empty">No activity in the last 24 hours</span>
        ) : (
          <div className="events">
            {stripLogs.map(log => (
              <span key={log.id} className="ev" title={`${log.author} ${actionFor(log.type)} ${log.testCaseName}`}>
                <span className={`dot ${dotFor(log.type)}`} />
                <b>{log.author || 'Someone'}</b>&nbsp;{actionFor(log.type)}&nbsp;{log.testCaseName}
                <span className="when">{relativeTime(log.timestamp)}</span>
              </span>
            ))}
          </div>
        )}
        <button type="button" className="view-all" onClick={onViewAll}>
          View all →
        </button>
      </div>
    );
  }

  // Default: original card variant (kept for backward compat / other uses)
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
          {feedLogs.map(log => (
            <div key={log.id} className="mo-feed-row">
              <span className={`mo-feed-dot ${dotFor(log.type)}`} />
              <span className="what">
                <b>{log.author || 'Someone'}</b> {actionFor(log.type)} <b>{log.testCaseName}</b>
                {log.runName ? <> in {log.runName}</> : null}
              </span>
              <span className="when">{relativeTime(log.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
