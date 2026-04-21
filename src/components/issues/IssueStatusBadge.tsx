import { useTranslation } from 'react-i18next';
import type { IssueStatus } from '../../lib/issueMetadata';

interface IssueStatusBadgeProps {
  status: IssueStatus;
}

/**
 * Status badge — reuses existing `.iss-status.open/.prog/.resolved/.closed` CSS classes.
 * Design spec §2-3.
 */
export default function IssueStatusBadge({ status }: IssueStatusBadgeProps) {
  const { t } = useTranslation('common');
  if (!status) {
    return <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>{t('issues.priority.none')}</span>;
  }
  const map: Record<Exclude<IssueStatus, null>, { cls: string; key: string }> = {
    open:        { cls: 'iss-status open',     key: 'issues.status.open' },
    in_progress: { cls: 'iss-status prog',     key: 'issues.status.inProgress' },
    resolved:    { cls: 'iss-status resolved', key: 'issues.status.resolved' },
    closed:      { cls: 'iss-status closed',   key: 'issues.status.closed' },
  };
  const entry = map[status];
  return <span className={entry.cls}>{t(entry.key)}</span>;
}
