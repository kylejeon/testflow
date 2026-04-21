import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../../lib/formatRelativeTime';

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
  const { t } = useTranslation(['milestones', 'common']);

  const actionFor = (type: string): string => {
    if (type === 'passed') return t('milestones:detail.overview.activity.action.passed');
    if (type === 'failed') return t('milestones:detail.overview.activity.action.failed');
    if (type === 'blocked') return t('milestones:detail.overview.activity.action.blocked');
    if (type === 'retest') return t('milestones:detail.overview.activity.action.retest');
    return t('milestones:detail.overview.activity.action.default');
  };

  if (variant === 'strip') {
    const stripLogs = logs.slice(0, 4);
    return (
      <div className="mo-activity-strip" role="region" aria-label={t('milestones:detail.overview.activity.a11y.region')}>
        <span className="label">
          <i className="ri-history-line" aria-hidden="true" /> {t('milestones:detail.overview.activity.last24h')}
        </span>
        {stripLogs.length === 0 ? (
          <span className="empty">{t('milestones:detail.overview.activity.empty')}</span>
        ) : (
          <div className="events">
            {stripLogs.map(log => (
              <span
                key={log.id}
                className="ev"
                title={`${log.author || t('milestones:detail.overview.activity.someone')} ${actionFor(log.type)} ${log.testCaseName}`}
              >
                <span className={`dot ${dotFor(log.type)}`} />
                <b>{log.author || t('milestones:detail.overview.activity.someone')}</b>&nbsp;{actionFor(log.type)}&nbsp;{log.testCaseName}
                <span className="when">{formatRelativeTime(log.timestamp.toISOString(), t)}</span>
              </span>
            ))}
          </div>
        )}
        <button type="button" className="view-all" onClick={onViewAll}>
          {t('milestones:detail.overview.activity.viewAllShort')}
        </button>
      </div>
    );
  }

  // Default: original card variant (kept for backward compat / other uses)
  const feedLogs = logs.slice(0, 4);
  return (
    <article className="mo-panel span-2" aria-label={t('milestones:detail.overview.activity.a11y.cardRegion')}>
      <div className="mo-panel-head">
        <i className="ri-history-line" style={{ color: 'var(--text-muted)' }} />
        {t('milestones:detail.overview.activity.header')}
        <button type="button" className="right link" onClick={onViewAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('milestones:detail.overview.activity.viewAllFull')}
        </button>
      </div>
      {feedLogs.length === 0 ? (
        <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '11.5px' }}>
          {t('milestones:detail.overview.activity.empty')}
        </div>
      ) : (
        <div className="mo-feed">
          {feedLogs.map(log => (
            <div key={log.id} className="mo-feed-row">
              <span className={`mo-feed-dot ${dotFor(log.type)}`} />
              <span className="what">
                <b>{log.author || t('milestones:detail.overview.activity.someone')}</b> {actionFor(log.type)} <b>{log.testCaseName}</b>
                {log.runName ? <> {t('milestones:detail.overview.activity.inRun', { runName: log.runName })}</> : null}
              </span>
              <span className="when">{formatRelativeTime(log.timestamp.toISOString(), t)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
