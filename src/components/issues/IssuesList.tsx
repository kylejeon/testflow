import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import {
  mapJiraPriority,
  mapJiraStatus,
  mapGitHubPriority,
  mapGitHubState,
  type IssuePriority,
  type IssueStatus,
  type JiraIssueMeta,
  type GitHubIssueMeta,
} from '../../lib/issueMetadata';
import IssuePriorityBadge from './IssuePriorityBadge';
import IssueStatusBadge from './IssueStatusBadge';
import IssueAssignee from './IssueAssignee';
import LastSyncedLabel from './LastSyncedLabel';

export interface IssuesListProps {
  runIds: string[];
  onCountChange?: (count: number) => void;
  allowRefresh?: boolean;
}

interface IssueRow {
  source: 'jira' | 'github';
  key: string;
  url: string | null;
  runId: string;
  tcId: string | null;
  tcTitle?: string | null;
  priority: IssuePriority;
  priorityRaw: string | null;
  status: IssueStatus;
  statusRaw: string | null;
  assigneeDisplay: string | null;
  assigneeLogin: string | null;
  assigneeAvatar: string | null;
  lastSyncedAt: string | null;
  error: string | null;
  createdAt: string;
}

interface LoadResult {
  issues: IssueRow[];
  lastSyncedAt: string | null;
}

async function loadIssues(runIds: string[]): Promise<LoadResult> {
  if (runIds.length === 0) return { issues: [], lastSyncedAt: null };

  const { data: resultsData } = await supabase
    .from('test_results')
    .select('id, run_id, test_case_id, status, created_at, issues, jira_issues_meta, github_issues')
    .in('run_id', runIds)
    .limit(200);

  const rows = resultsData || [];

  // Collect unique TC ids for title lookup
  const tcIds = new Set<string>();
  rows.forEach(r => { if (r.test_case_id) tcIds.add(r.test_case_id); });
  const tcTitleMap = new Map<string, string>();
  if (tcIds.size > 0) {
    const { data: tcData } = await supabase
      .from('test_cases')
      .select('id, title')
      .in('id', Array.from(tcIds));
    (tcData || []).forEach((tc: any) => {
      tcTitleMap.set(tc.id, tc.title);
    });
  }

  const all: IssueRow[] = [];
  const seen = new Set<string>();
  let latestSync: string | null = null;

  const trackSync = (iso: string | null | undefined) => {
    if (!iso) return;
    if (!latestSync || iso > latestSync) latestSync = iso;
  };

  for (const r of rows) {
    // Jira metadata
    const jiraMeta: JiraIssueMeta[] = Array.isArray(r.jira_issues_meta) ? (r.jira_issues_meta as JiraIssueMeta[]) : [];
    for (const meta of jiraMeta) {
      if (!meta?.key) continue;
      const dedup = `jira:${meta.key}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      trackSync(meta.last_synced_at || null);
      all.push({
        source: 'jira',
        key: meta.key,
        url: meta.url || null,
        runId: r.run_id,
        tcId: r.test_case_id || null,
        tcTitle: r.test_case_id ? tcTitleMap.get(r.test_case_id) : undefined,
        priority: mapJiraPriority(meta.priority),
        priorityRaw: meta.priority || null,
        status: mapJiraStatus(meta.status),
        statusRaw: meta.status || null,
        assigneeDisplay: meta.assignee_display_name || null,
        assigneeLogin: meta.assignee_account_id || null,
        assigneeAvatar: meta.assignee_avatar_url || null,
        lastSyncedAt: meta.last_synced_at || null,
        error: meta.error || null,
        createdAt: r.created_at,
      });
    }

    // Fallback: legacy `issues` text[] (key only, no metadata yet)
    const legacyKeys: string[] = Array.isArray(r.issues) ? r.issues : [];
    for (const key of legacyKeys) {
      if (!key) continue;
      const dedup = `jira:${key}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      all.push({
        source: 'jira',
        key,
        url: null,
        runId: r.run_id,
        tcId: r.test_case_id || null,
        tcTitle: r.test_case_id ? tcTitleMap.get(r.test_case_id) : undefined,
        priority: null,
        priorityRaw: null,
        status: null,
        statusRaw: null,
        assigneeDisplay: null,
        assigneeLogin: null,
        assigneeAvatar: null,
        lastSyncedAt: null,
        error: null,
        createdAt: r.created_at,
      });
    }

    // GitHub metadata
    const ghIssues: GitHubIssueMeta[] = Array.isArray(r.github_issues) ? (r.github_issues as GitHubIssueMeta[]) : [];
    for (const gi of ghIssues) {
      if (!gi?.number) continue;
      const dedup = `gh:${gi.repo || ''}:${gi.number}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      trackSync(gi.last_synced_at || null);
      const priority = gi.priority
        ? mapJiraPriority(gi.priority) // priority field may already be normalized
        : mapGitHubPriority(gi.labels || null);
      all.push({
        source: 'github',
        key: `#${gi.number}`,
        url: gi.url || null,
        runId: r.run_id,
        tcId: r.test_case_id || null,
        tcTitle: r.test_case_id ? tcTitleMap.get(r.test_case_id) : undefined,
        priority,
        priorityRaw: gi.priority || null,
        status: mapGitHubState(gi.state),
        statusRaw: gi.state || null,
        assigneeDisplay: gi.assignee_display_name || gi.assignee_login || null,
        assigneeLogin: gi.assignee_login || null,
        assigneeAvatar: gi.assignee_avatar_url || null,
        lastSyncedAt: gi.last_synced_at || null,
        error: gi.error || null,
        createdAt: r.created_at,
      });
    }
  }

  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { issues: all, lastSyncedAt: latestSync };
}

const ghSvg = (
  <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
  </svg>
);

/**
 * Shared Jira / GitHub issue list — used by Plan Detail and Milestone Detail.
 * Design-spec §7, dev-spec AC-A1~A8.
 */
export default function IssuesList({ runIds, onCountChange, allowRefresh = true }: IssuesListProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [sourceFilter, setSourceFilter] = useState<'all' | 'jira' | 'github'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const lastRefreshRef = useRef<number>(0);

  const queryKey = useMemo(() => ['issues-list', [...runIds].sort().join(',')], [runIds]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => loadIssues(runIds),
    enabled: runIds.length > 0,
    staleTime: 30_000,
  });

  const issues = data?.issues ?? [];
  const lastSyncedAt = data?.lastSyncedAt ?? null;

  useEffect(() => {
    onCountChange?.(issues.length);
  }, [issues.length, onCountChange]);

  const jiraCount = issues.filter(i => i.source === 'jira').length;
  const ghCount = issues.filter(i => i.source === 'github').length;

  const filteredIssues = sourceFilter === 'all' ? issues : issues.filter(i => i.source === sourceFilter);

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 10_000) {
      showToast('Please wait before refreshing again', 'info');
      return;
    }
    lastRefreshRef.current = now;
    setIsSyncing(true);
    try {
      const [jiraRes, ghRes] = await Promise.allSettled([
        supabase.functions.invoke('sync-jira-metadata', { body: { scope: 'run_ids', run_ids: runIds, only_stale: false } }),
        supabase.functions.invoke('sync-github-metadata', { body: { scope: 'run_ids', run_ids: runIds, only_stale: false } }),
      ]);
      const jiraOk = jiraRes.status === 'fulfilled' && !(jiraRes.value?.error);
      const ghOk = ghRes.status === 'fulfilled' && !(ghRes.value?.error);
      if (!jiraOk && !ghOk) {
        showToast('Failed to refresh issues. Retry later.', 'error');
      } else {
        const jiraCount = jiraOk ? (jiraRes as any).value?.data?.synced_count ?? 0 : 0;
        const ghCount = ghOk ? (ghRes as any).value?.data?.synced_count ?? 0 : 0;
        showToast(`Synced ${jiraCount + ghCount} issues`, 'success');
      }
      await queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      console.error('[IssuesList] refresh error:', e);
      showToast('Failed to refresh issues. Retry later.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading issues…
      </div>
    );
  }

  const totalLinkedTcs = new Set(issues.map(i => i.tcId).filter(Boolean)).size;

  return (
    <div>
      {/* Source filter strip + Last synced */}
      <div className="int-strip" style={{ margin: '0 0 14px' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sources</span>
        <button className={`int-pill ${sourceFilter === 'all' ? 'active' : ''}`} onClick={() => setSourceFilter('all')}>
          All <span className="count">{issues.length}</span>
        </button>
        <button className={`int-pill jira ${sourceFilter === 'jira' ? 'active' : ''}`} onClick={() => setSourceFilter('jira')}>
          <span className="logo">J</span>Jira <span className="count">{jiraCount}</span>
        </button>
        <button className={`int-pill gh ${sourceFilter === 'github' ? 'active' : ''}`} onClick={() => setSourceFilter('github')}>
          <span className="logo">{ghSvg}</span>GitHub <span className="count">{ghCount}</span>
        </button>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <LastSyncedLabel
            lastSyncedAt={lastSyncedAt}
            onRefresh={handleRefresh}
            canRefresh={allowRefresh}
            isSyncing={isSyncing}
          />
        </span>
      </div>

      {/* KPIs */}
      <div className="iss-kpis" style={{ margin: '0 0 12px' }}>
        <div className="iss-kpi open">
          <div className="l">Total Issues</div>
          <div className="v">{issues.length}</div>
          <div className="sub">from {runIds.length} run{runIds.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="iss-kpi">
          <div className="l">Jira</div>
          <div className="v" style={{ color: '#0052cc' }}>{jiraCount}</div>
          <div className="sub">bug reports</div>
        </div>
        <div className="iss-kpi">
          <div className="l">GitHub</div>
          <div className="v" style={{ color: '#24292e' }}>{ghCount}</div>
          <div className="sub">issues</div>
        </div>
        <div className="iss-kpi">
          <div className="l">Linked TCs</div>
          <div className="v">{totalLinkedTcs}</div>
          <div className="sub">with issue</div>
        </div>
      </div>

      {/* Empty state */}
      {filteredIssues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed var(--border)', borderRadius: 10, background: '#fff' }}>
          <svg style={{ width: 32, height: 32, color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No issues linked yet.</p>
          <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: '6px 0 0' }}>
            Issues appear here once you link Jira or GitHub issues from failed test results.
          </p>
        </div>
      ) : (
        <div className="iss-list" style={{ margin: 0 }}>
          {filteredIssues.map((issue, idx) => {
            const isJira = issue.source === 'jira';
            const dateStr = issue.createdAt ? new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            const title = issue.tcTitle || `Issue from TC ${issue.tcId?.slice(-8) || ''}`;
            const hasErr = !!issue.error;
            return (
              <div
                key={`${issue.source}-${issue.key}-${idx}`}
                className="iss-row"
                onClick={() => { if (issue.url) window.open(issue.url, '_blank', 'noopener,noreferrer'); }}
                style={{ opacity: isSyncing ? 0.6 : 1, cursor: issue.url ? 'pointer' : 'default' }}
                role={issue.url ? 'link' : undefined}
                aria-label={`${issue.source} issue ${issue.key}, priority ${issue.priority || 'unknown'}, status ${issue.status || 'unknown'}`}
              >
                <div className={`iss-source ${isJira ? 'jira' : 'gh'}`}>
                  {isJira ? <span style={{ fontSize: 11, fontWeight: 700 }}>J</span> : ghSvg}
                </div>
                <div>
                  <div className="iss-id">{issue.key}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {isJira ? 'Jira · Bug' : 'GitHub'}
                  </div>
                </div>
                <div>
                  <div className="iss-title">{title}</div>
                  <div className="iss-meta">
                    {issue.tcId && <span className="linked">→ {issue.tcId.slice(-8)}</span>}
                    {dateStr && <span>{dateStr}</span>}
                    {hasErr && (
                      <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
                        <i className="ri-error-warning-line" /> Metadata unavailable
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {hasErr ? (
                    <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>
                  ) : (
                    <IssuePriorityBadge priority={issue.priority} />
                  )}
                </div>
                <div>
                  {hasErr ? (
                    <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>
                  ) : (
                    <IssueStatusBadge status={issue.status} />
                  )}
                </div>
                <div>
                  <IssueAssignee
                    avatarUrl={issue.assigneeAvatar}
                    displayName={issue.assigneeDisplay}
                    login={issue.assigneeLogin}
                  />
                </div>
                <div>
                  {issue.url && (
                    <svg style={{ width: 14, height: 14, color: 'var(--text-subtle)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 17L17 7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {issues.length > 0 && (
        <div style={{ margin: '14px 0 0', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {totalLinkedTcs} TC{totalLinkedTcs !== 1 ? 's' : ''} with linked issues.
          {jiraCount > 0 && ` ${jiraCount} Jira.`}
          {ghCount > 0 && ` ${ghCount} GitHub.`}
        </div>
      )}
    </div>
  );
}
