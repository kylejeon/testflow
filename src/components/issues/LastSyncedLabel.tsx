import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../../lib/formatRelativeTime';

interface LastSyncedLabelProps {
  lastSyncedAt: string | null;
  onRefresh: () => void | Promise<void>;
  canRefresh: boolean;
  isSyncing?: boolean;
}

/**
 * "Last synced X ago" text + "Refresh now" button.
 * Design-spec §7-1 / §7.16.
 */
export default function LastSyncedLabel({ lastSyncedAt, onRefresh, canRefresh, isSyncing }: LastSyncedLabelProps) {
  const { t } = useTranslation('common');
  const text = lastSyncedAt
    ? t('issues.lastSynced', { time: formatRelativeTime(lastSyncedAt, t) })
    : t('issues.notSyncedYet');

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="mo-last-synced">
        <i className="ri-time-line" />
        {isSyncing ? t('issues.syncing') : text}
      </span>
      {canRefresh && (
        <button
          type="button"
          className={`btn btn-sm mo-refresh-btn${isSyncing ? ' loading' : ''}`}
          onClick={() => { if (!isSyncing) void onRefresh(); }}
          disabled={isSyncing}
          aria-label={t('issues.a11y.refresh')}
          aria-busy={isSyncing ? 'true' : 'false'}
        >
          <i className="ri-refresh-line" />
          {t('issues.refreshNow')}
        </button>
      )}
    </span>
  );
}
