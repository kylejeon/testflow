/**
 * Issue Metadata Utilities
 *
 * Jira / GitHub priority & status mapping.
 * Referenced by dev-spec §4-2 (BR-1 ~ BR-4) and design-spec §2-3.
 */

export type IssuePriority = 'critical' | 'high' | 'medium' | 'low' | null;
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | null;

/**
 * Jira priority → normalized priority
 * BR-1: Jira "Highest"/"High" → Critical/High, "Medium" → Medium, "Low"/"Lowest" → Low.
 */
export function mapJiraPriority(jiraPriority: string | null | undefined): IssuePriority {
  if (!jiraPriority) return null;
  const p = String(jiraPriority).toLowerCase().trim();
  if (p === 'highest') return 'critical';
  if (p === 'high') return 'high';
  if (p === 'medium') return 'medium';
  if (p === 'low' || p === 'lowest') return 'low';
  return null;
}

/**
 * Jira status → normalized status
 * BR-3: "Done"/"Closed"/"Resolved" → resolved, "In Progress" → in_progress, "To Do" → open.
 */
export function mapJiraStatus(jiraStatus: string | null | undefined): IssueStatus {
  if (!jiraStatus) return null;
  const s = String(jiraStatus).toLowerCase().trim();
  if (s === 'done' || s === 'resolved') return 'resolved';
  if (s === 'closed') return 'closed';
  if (s === 'in progress' || s === 'in review' || s === 'in-progress') return 'in_progress';
  if (s === 'to do' || s === 'todo' || s === 'open' || s === 'new' || s === 'backlog') return 'open';
  return null;
}

/**
 * GitHub labels → priority (BR-2: label with priority/* prefix).
 */
export function mapGitHubPriority(labels: Array<{ name?: string } | string> | null | undefined): IssuePriority {
  if (!Array.isArray(labels)) return null;
  for (const lab of labels) {
    const name = typeof lab === 'string' ? lab : (lab?.name || '');
    const lower = name.toLowerCase();
    if (!lower.startsWith('priority/') && !lower.startsWith('priority-') && !lower.startsWith('p:')) continue;
    const value = lower.replace(/^(priority\/|priority-|p:)/, '').trim();
    if (value === 'critical' || value === 'p0') return 'critical';
    if (value === 'high' || value === 'p1') return 'high';
    if (value === 'medium' || value === 'med' || value === 'p2') return 'medium';
    if (value === 'low' || value === 'p3' || value === 'p4') return 'low';
  }
  return null;
}

/**
 * GitHub state → normalized status (BR-4).
 */
export function mapGitHubState(state: string | null | undefined): IssueStatus {
  if (!state) return null;
  const s = String(state).toLowerCase().trim();
  if (s === 'open') return 'open';
  if (s === 'closed') return 'closed';
  return null;
}

/**
 * Relative time formatter — returns "3m", "2h", "1d" etc.
 * Input: ISO 8601 string or null.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * Priority display label (EN).
 */
export function priorityLabel(p: IssuePriority): string {
  if (p === 'critical') return 'Critical';
  if (p === 'high') return 'High';
  if (p === 'medium') return 'Medium';
  if (p === 'low') return 'Low';
  return '—';
}

/**
 * Status display label (EN).
 */
export function statusLabel(s: IssueStatus): string {
  if (s === 'open') return 'Open';
  if (s === 'in_progress') return 'In Progress';
  if (s === 'resolved') return 'Resolved';
  if (s === 'closed') return 'Closed';
  return '—';
}

/**
 * Jira metadata row shape (matches test_results.jira_issues_meta element).
 */
export interface JiraIssueMeta {
  key: string;
  url?: string | null;
  priority?: string | null;
  status?: string | null;
  assignee_account_id?: string | null;
  assignee_display_name?: string | null;
  assignee_avatar_url?: string | null;
  last_synced_at?: string | null;
  error?: 'not_found' | 'forbidden' | string | null;
}

/**
 * GitHub metadata row shape.
 */
export interface GitHubIssueMeta {
  number: number;
  url?: string | null;
  repo?: string | null;
  priority?: string | null;
  state?: string | null;
  assignee_login?: string | null;
  assignee_display_name?: string | null;
  assignee_avatar_url?: string | null;
  last_synced_at?: string | null;
  error?: 'not_found' | 'forbidden' | string | null;
  labels?: Array<{ name?: string } | string> | null;
}
