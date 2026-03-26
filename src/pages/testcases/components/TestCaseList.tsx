import { useState, useMemo } from 'react';
import PageLoader from '../../../components/PageLoader';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useFilteredTestCases, type ExecStatusFilter, type PeriodFilter } from '../../../hooks/useFilteredTestCases';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'active_run', label: 'Active Run' },
  { value: '7d',         label: 'Last 7 Days' },
  { value: '30d',        label: 'Last 30 Days' },
  { value: 'all',        label: 'All Time' },
];

const STATUS_TABS: { value: ExecStatusFilter; label: string; icon: string }[] = [
  { value: 'all',       label: 'All',       icon: 'ri-list-check' },
  { value: 'failed',    label: 'Failed',    icon: 'ri-close-circle-line' },
  { value: 'passed',    label: 'Passed',    icon: 'ri-checkbox-circle-line' },
  { value: 'blocked',   label: 'Blocked',   icon: 'ri-forbid-line' },
  { value: 'untested',  label: 'Untested',  icon: 'ri-question-line' },
];

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getHeaderConfig(status: ExecStatusFilter) {
  switch (status) {
    case 'failed':   return { title: 'Failed Test Cases',   icon: 'ri-close-circle-line',     iconColor: '#EF4444', badgeBg: '#FEF2F2', badgeColor: '#DC2626' };
    case 'passed':   return { title: 'Passed Test Cases',   icon: 'ri-checkbox-circle-line',  iconColor: '#10B981', badgeBg: '#F0FDF4', badgeColor: '#16A34A' };
    case 'blocked':  return { title: 'Blocked Test Cases',  icon: 'ri-forbid-line',            iconColor: '#F59E0B', badgeBg: '#FFFBEB', badgeColor: '#D97706' };
    case 'untested': return { title: 'Untested Test Cases', icon: 'ri-question-line',          iconColor: '#94A3B8', badgeBg: '#F1F5F9', badgeColor: '#64748B' };
    default:         return { title: 'All Test Cases',      icon: 'ri-list-check',             iconColor: '#6366F1', badgeBg: '#EEF2FF', badgeColor: '#4338CA' };
  }
}

function getSummaryDotColor(status: ExecStatusFilter): string {
  switch (status) {
    case 'failed':  return '#EF4444';
    case 'passed':  return '#10B981';
    case 'blocked': return '#F59E0B';
    default:        return '#6366F1';
  }
}

function getTabBadgeStyle(tabValue: ExecStatusFilter, isActive: boolean): React.CSSProperties {
  if (isActive) {
    return { background: '#EEF2FF', color: '#6366F1' };
  }
  switch (tabValue) {
    case 'failed':  return { background: '#FEF2F2', color: '#DC2626' };
    case 'passed':  return { background: '#F0FDF4', color: '#16A34A' };
    case 'blocked': return { background: '#FFFBEB', color: '#D97706' };
    default:        return { background: '#F1F5F9', color: '#64748B' };
  }
}

const PER_PAGE_OPTIONS = [20, 50, 100];

export default function TestCaseList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL param state
  const statusFilter = (searchParams.get('status') ?? 'all') as ExecStatusFilter;
  const periodFilter = (searchParams.get('period') ?? 'active_run') as PeriodFilter;
  const projectFilter = searchParams.get('project') ?? 'all';
  const priorityFilter = searchParams.get('priority') ?? 'all';

  // Local UI state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'tc_id' | 'title' | 'priority' | 'fail_count' | 'last_failed'>('fail_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fromReport = searchParams.has('status');

  const { allItems, statusCounts, projectNames, loading, error } = useFilteredTestCases(periodFilter);

  // Filter by execStatus
  const statusFiltered = useMemo(() => {
    if (statusFilter === 'all') return allItems;
    return allItems.filter(tc => tc.execStatus === statusFilter);
  }, [allItems, statusFilter]);

  // Filter by project, priority, search
  const filtered = useMemo(() => {
    return statusFiltered.filter(tc => {
      if (projectFilter !== 'all' && tc.projectName !== projectFilter) return false;
      if (priorityFilter !== 'all' && tc.priority !== priorityFilter) return false;
      if (search && !tc.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [statusFiltered, projectFilter, priorityFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'tc_id':    return multiplier * a.tcIdStr.localeCompare(b.tcIdStr);
        case 'title':    return multiplier * a.title.localeCompare(b.title);
        case 'priority': return multiplier * ((PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
        case 'fail_count': return multiplier * (a.failCount - b.failCount);
        case 'last_failed': {
          const at = a.lastFailedAt ? new Date(a.lastFailedAt).getTime() : 0;
          const bt = b.lastFailedAt ? new Date(b.lastFailedAt).getTime() : 0;
          return multiplier * (at - bt);
        }
        default: return 0;
      }
    });
  }, [filtered, sortBy, sortOrder]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * perPage, safePage * perPage);

  // Project count for summary bar
  const projectCount = useMemo(() => new Set(filtered.map(tc => tc.projectId)).size, [filtered]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
    setPage(1);
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  }

  function getSortIcon(col: typeof sortBy): string {
    if (sortBy !== col) return 'ri-arrow-up-down-line';
    return sortOrder === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  }

  const headerConfig = getHeaderConfig(statusFilter);
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label ?? 'Active Run';

  // Priority display
  function renderPriorityBadge(priority: string) {
    const styles: Record<string, React.CSSProperties> = {
      critical: { background: '#FEF2F2', color: '#991B1B' },
      high:     { background: '#FEF3C7', color: '#92400E' },
      medium:   { background: '#EEF2FF', color: '#4338CA' },
      low:      { background: '#F1F5F9', color: '#64748B' },
    };
    const s = styles[priority] ?? styles.medium;
    return (
      <span style={{ ...s, fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  }

  function getAssigneeColor(assignee: string): string {
    const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#3B82F6'];
    let hash = 0;
    for (let i = 0; i < assignee.length; i++) hash = (hash * 31 + assignee.charCodeAt(i)) & 0xffff;
    return colors[hash % colors.length];
  }

  const showExtendedCols = statusFilter === 'failed' || sortBy === 'fail_count' || sortBy === 'last_failed';

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
        <div style={{ textAlign: 'center', color: '#EF4444' }}>
          <i className="ri-error-warning-line" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }} />
          <p style={{ fontSize: '0.875rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F8FAFC' }}>

      {/* ── Dynamic Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.5rem 1.75rem 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className={headerConfig.icon} style={{ fontSize: '1.25rem', color: headerConfig.iconColor }} />
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0F172A' }}>{headerConfig.title}</h1>
            {statusFilter !== 'all' && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                padding: '0.125rem 0.5rem', borderRadius: '9999px',
                background: headerConfig.badgeBg, color: headerConfig.badgeColor,
              }}>
                {statusCounts[statusFilter]}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
            {statusFilter === 'all'
              ? 'All test cases across your projects'
              : `Test cases with ${statusFilter} results in the selected period`}
          </p>
        </div>
        {fromReport && (
          <Link
            to="/passrate-report"
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#6366F1', textDecoration: 'none', paddingTop: '0.5rem' }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: '1rem' }} />
            Back to Report
          </Link>
        )}
      </div>

      {/* ── Filter Area ── */}
      <div style={{ padding: '1.25rem 1.75rem 0' }}>
        {/* Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <i className="ri-search-line" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '1rem' }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search test cases…"
              style={{ width: '100%', fontSize: '0.8125rem', padding: '0.4375rem 0.875rem 0.4375rem 2.25rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', color: '#334155', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Project dropdown */}
          <select
            value={projectFilter}
            onChange={e => setParam('project', e.target.value)}
            style={{ fontSize: '0.8125rem', padding: '0.4375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', color: '#334155', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
          >
            <option value="all">All Projects</option>
            {projectNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Priority dropdown */}
          <select
            value={priorityFilter}
            onChange={e => setParam('priority', e.target.value)}
            style={{ fontSize: '0.8125rem', padding: '0.4375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', color: '#334155', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Period dropdown */}
          <select
            value={periodFilter}
            onChange={e => setParam('period', e.target.value)}
            style={{ fontSize: '0.8125rem', padding: '0.4375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', color: '#334155', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
          >
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ① Execution Status Tab Bar */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
          {STATUS_TABS.map(tab => {
            const isActive = statusFilter === tab.value;
            const count = statusCounts[tab.value];
            return (
              <button
                key={tab.value}
                onClick={() => setParam('status', tab.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.625rem 1rem',
                  fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#4F46E5' : '#64748B',
                  cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #6366F1' : '2px solid transparent',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  background: 'none', fontFamily: 'inherit',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                <i className={tab.icon} style={{ fontSize: '0.9375rem' }} />
                {tab.label}
                <span style={{
                  ...getTabBadgeStyle(tab.value, isActive),
                  fontSize: '0.625rem', fontWeight: 700,
                  padding: '0.0625rem 0.4375rem', borderRadius: '9999px',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div style={{ margin: '0 1.75rem 1.75rem', border: '1px solid #E2E8F0', borderRadius: '0.75rem', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, marginTop: '1rem', minHeight: 0 }}>

        {/* ⑤ Summary Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', padding: '0.625rem 1.25rem', borderBottom: '1px solid #E2E8F0', fontSize: '0.8125rem', color: '#64748B', fontWeight: 500, flexShrink: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: getSummaryDotColor(statusFilter), flexShrink: 0, display: 'inline-block' }} />
          Showing{' '}
          <strong style={{ color: '#0F172A', fontWeight: 700 }}>{filtered.length}</strong>
          {' '}{statusFilter === 'all' ? 'test cases' : `${statusFilter} test cases`}{' '}
          {projectCount > 0 && <>across <strong style={{ color: '#0F172A', fontWeight: 700 }}>{projectCount}</strong> {projectCount === 1 ? 'project' : 'projects'}</>}
          <span style={{ color: '#CBD5E1', margin: '0 0.25rem' }}>|</span>
          <span style={{ color: '#94A3B8' }}>{periodLabel}</span>
        </div>

        {/* Table or Empty State */}
        {filtered.length === 0 ? (
          /* ⑦ Empty State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.75rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <i className="ri-checkbox-circle-line" style={{ fontSize: '1.75rem', color: '#10B981' }} />
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
              {statusFilter === 'failed' ? 'No failures found' : 'No test cases found'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
              {statusFilter === 'failed'
                ? 'All test cases passed in this period'
                : 'Try adjusting your filters'}
            </div>
            {fromReport && (
              <button
                onClick={() => navigate('/passrate-report')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#6366F1', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
              >
                <i className="ri-arrow-left-line" /> Back to Report
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ④ Table */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: 36, background: '#F8FAFC', padding: '0.6875rem 1rem', borderBottom: '1px solid #E2E8F0' }}>
                      <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#6366F1', cursor: 'pointer' }} />
                    </th>
                    {/* TC-ID */}
                    <th
                      onClick={() => toggleSort('tc_id')}
                      style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: sortBy === 'tc_id' ? '#6366F1' : '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                    >
                      TC-ID <i className={getSortIcon('tc_id')} style={{ fontSize: '0.75rem', marginLeft: '0.25rem', verticalAlign: 'middle' }} />
                    </th>
                    {/* Title */}
                    <th
                      onClick={() => toggleSort('title')}
                      style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: sortBy === 'title' ? '#6366F1' : '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Title <i className={getSortIcon('title')} style={{ fontSize: '0.75rem', marginLeft: '0.25rem', verticalAlign: 'middle' }} />
                    </th>
                    {/* Project */}
                    <th style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Project
                    </th>
                    {/* Priority */}
                    <th
                      onClick={() => toggleSort('priority')}
                      style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: sortBy === 'priority' ? '#6366F1' : '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Priority <i className={getSortIcon('priority')} style={{ fontSize: '0.75rem', marginLeft: '0.25rem', verticalAlign: 'middle' }} />
                    </th>
                    {/* Extended columns — always shown but grayed out when not in failed context */}
                    <th
                      onClick={() => toggleSort('fail_count')}
                      style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: sortBy === 'fail_count' ? '#6366F1' : '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Fail Count <i className={getSortIcon('fail_count')} style={{ fontSize: '0.75rem', marginLeft: '0.25rem', verticalAlign: 'middle' }} />
                    </th>
                    <th
                      onClick={() => toggleSort('last_failed')}
                      style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: sortBy === 'last_failed' ? '#6366F1' : '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Last Failed <i className={getSortIcon('last_failed')} style={{ fontSize: '0.75rem', marginLeft: '0.25rem', verticalAlign: 'middle' }} />
                    </th>
                    <th style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Last Run
                    </th>
                    {/* Assignee */}
                    <th style={{ background: '#F8FAFC', padding: '0.6875rem 1rem', textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                      Assignee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(tc => (
                    <tr
                      key={tc.id}
                      style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#6366F1', cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 400 }}>
                          {tc.tcIdStr}
                        </span>
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9', maxWidth: 300 }}>
                        <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 280 }}>
                          {tc.title}
                        </span>
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.125rem 0.4375rem', borderRadius: '0.25rem', background: '#EEF2FF', color: '#4338CA', whiteSpace: 'nowrap' }}>
                          {tc.projectName}
                        </span>
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        {renderPriorityBadge(tc.priority)}
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        {tc.failCount > 0
                          ? <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#EF4444' }}>{tc.failCount}x</span>
                          : <span style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        {tc.lastFailedAt
                          ? <span style={{ fontSize: '0.75rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{timeAgo(tc.lastFailedAt)}</span>
                          : <span style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                        {tc.lastRunId && tc.lastRunName ? (
                          <Link
                            to={`/runs/${tc.lastRunId}`}
                            style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6366F1', textDecoration: 'none', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                          >
                            {tc.lastRunName}
                          </Link>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.6875rem 1rem', borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                        {tc.assignee ? (
                          <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: getAssigneeColor(tc.assignee), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: '#fff' }}
                            title={tc.assignee}>
                            {tc.assignee.substring(0, 2).toUpperCase()}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ⑥ Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0', background: '#fff', flexShrink: 0 }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 500 }}>
                Showing {sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, sorted.length)} of {sorted.length}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <button
                  disabled={safePage === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: safePage === 1 ? '#CBD5E1' : '#6366F1', cursor: safePage === 1 ? 'not-allowed' : 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}
                >
                  ← Previous
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (safePage <= 3) {
                    pageNum = i + 1;
                  } else if (safePage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = safePage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '0.375rem', border: 'none',
                        background: safePage === pageNum ? '#6366F1' : 'none',
                        color: safePage === pageNum ? '#fff' : '#334155',
                        cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'inherit', fontWeight: safePage === pageNum ? 600 : 500,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  disabled={safePage === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ fontSize: '0.8125rem', fontWeight: 600, color: safePage === totalPages ? '#CBD5E1' : '#6366F1', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}
                >
                  Next →
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Per page:</span>
                <select
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  style={{ fontSize: '0.8125rem', padding: '0.3125rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #E2E8F0', background: '#fff', color: '#334155', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                >
                  {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
