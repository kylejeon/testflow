import type { IssueStatus } from '../../lib/issueMetadata';

interface IssueStatusBadgeProps {
  status: IssueStatus;
}

/**
 * Status badge — reuses existing `.iss-status.open/.prog/.resolved/.closed` CSS classes.
 * Design spec §2-3.
 */
export default function IssueStatusBadge({ status }: IssueStatusBadgeProps) {
  if (!status) {
    return <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>;
  }
  const map: Record<Exclude<IssueStatus, null>, { cls: string; label: string }> = {
    open:        { cls: 'iss-status open',     label: 'Open' },
    in_progress: { cls: 'iss-status prog',     label: 'In Progress' },
    resolved:    { cls: 'iss-status resolved', label: 'Resolved' },
    closed:      { cls: 'iss-status closed',   label: 'Closed' },
  };
  const entry = map[status];
  return <span className={entry.cls}>{entry.label}</span>;
}
