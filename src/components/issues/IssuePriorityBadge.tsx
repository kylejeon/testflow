import { useTranslation } from 'react-i18next';
import type { IssuePriority } from '../../lib/issueMetadata';

interface IssuePriorityBadgeProps {
  priority: IssuePriority;
}

/**
 * Priority badge — reuses existing `.sev.sev-crit/-major/-medium/-minor` CSS classes.
 * Design spec §2-3.
 */
export default function IssuePriorityBadge({ priority }: IssuePriorityBadgeProps) {
  const { t } = useTranslation('common');
  if (!priority) {
    return <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>{t('issues.priority.none')}</span>;
  }
  const cls =
    priority === 'critical' ? 'sev sev-crit'
    : priority === 'high'    ? 'sev sev-major'
    : priority === 'medium'  ? 'sev sev-medium'
    : 'sev sev-minor';
  const labelKey =
    priority === 'critical' ? 'issues.priority.critical'
    : priority === 'high'    ? 'issues.priority.high'
    : priority === 'medium'  ? 'issues.priority.medium'
    : 'issues.priority.low';
  return <span className={cls}>{t(labelKey)}</span>;
}
