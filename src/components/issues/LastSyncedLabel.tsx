import { formatRelativeTime } from '../../lib/issueMetadata';

interface LastSyncedLabelProps {
  lastSyncedAt: string | null;
  onRefresh: () => void | Promise<void>;
  canRefresh: boolean;
  isSyncing?: boolean;
}

/**
 * "Last synced X ago" text + "Refresh now" button.
 * Design-spec §7-1.
 */
export default function LastSyncedLabel({ lastSyncedAt, onRefresh, canRefresh, isSyncing }: LastSyncedLabelProps) {
  const text = lastSyncedAt ? `Last synced ${formatRelativeTime(lastSyncedAt)}` : 'Not synced yet';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="mo-last-synced">
        <i className="ri-time-line" />
        {isSyncing ? 'Syncing…' : text}
      </span>
      {canRefresh && (
        <button
          type="button"
          className={`btn btn-sm mo-refresh-btn${isSyncing ? ' loading' : ''}`}
          onClick={() => { if (!isSyncing) void onRefresh(); }}
          disabled={isSyncing}
          aria-label="Refresh issue metadata"
          aria-busy={isSyncing ? 'true' : 'false'}
        >
          <i className="ri-refresh-line" />
          Refresh now
        </button>
      )}
    </span>
  );
}
