import type { IssuePriority } from '../../lib/issueMetadata';

interface IssuePriorityBadgeProps {
  priority: IssuePriority;
}

/**
 * Priority badge — reuses existing `.sev.sev-crit/-major/-medium/-minor` CSS classes.
 * Design spec §2-3.
 */
export default function IssuePriorityBadge({ priority }: IssuePriorityBadgeProps) {
  if (!priority) {
    return <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>;
  }
  const cls =
    priority === 'critical' ? 'sev sev-crit'
    : priority === 'high'    ? 'sev sev-major'
    : priority === 'medium'  ? 'sev sev-medium'
    : 'sev sev-minor';
  const label =
    priority === 'critical' ? 'Critical'
    : priority === 'high'    ? 'High'
    : priority === 'medium'  ? 'Medium'
    : 'Low';
  return <span className={cls}>{label}</span>;
}
