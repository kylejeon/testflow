import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import RequirementModal from './components/RequirementModal';
import LinkTCModal from './components/LinkTCModal';
import JiraImportModal from './components/JiraImportModal';
import type { Requirement, RequirementCoverage } from '../../types/rtm';

// ── Style tokens ─────────────────────────────────────────────────────────────
const btnPrimary = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer border-0`;
const btnSecondary = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer`;
const fieldCls = `border border-slate-200 rounded-lg text-xs text-slate-700 px-2.5 py-1.5 bg-white focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-colors`;

// ── Tier constants ────────────────────────────────────────────────────────────
// tier 1 = Free, 2 = Starter, 3 = Professional, 4 = Enterprise
const REQ_LIMIT_STARTER = 50;

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    P1: 'bg-red-100 text-red-700',
    P2: 'bg-orange-100 text-orange-700',
    P3: 'bg-blue-100 text-blue-700',
    P4: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-semibold ${map[priority] || map.P3}`}>
      {priority}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-slate-100 text-slate-500',
    deprecated: 'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-semibold ${map[status] || ''}`}>
      {status}
    </span>
  );
}

function CoverageBar({ pct, totalTcs }: { pct: number; totalTcs: number }) {
  if (totalTcs === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-red-500 text-xs font-semibold">0%</span>
        <i className="ri-error-warning-line text-red-400 text-sm" title="No TCs linked" />
      </div>
    );
  }
  const color = pct === 100 ? '#10A37F' : pct >= 80 ? '#6366F1' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '9999px', transition: 'width 0.3s' }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-9 text-right">{pct}%</span>
    </div>
  );
}

function UpgradePrompt({ tier }: { tier: number }) {
  if (tier === 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <i className="ri-git-branch-line text-3xl text-indigo-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Requirements Traceability</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Link requirements to test cases and track coverage. Available on Starter and above.
          </p>
        </div>
        <Link
          to="/settings?tab=billing"
          className={btnPrimary}
        >
          <i className="ri-vip-crown-line" />
          Upgrade to Starter
        </Link>
      </div>
    );
  }
  return null;
}

export default function ProjectRequirements() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'deprecated'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editReq, setEditReq] = useState<Requirement | null>(null);
  const [linkReq, setLinkReq] = useState<Requirement | null>(null);
  const [showJiraImport, setShowJiraImport] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Project info
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, prefix, jira_project_key')
        .eq('id', projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  // User tier
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();
      return { subscription_tier: data?.subscription_tier || 1 };
    },
    staleTime: 5 * 60_000,
  });

  const tier = userProfile?.subscription_tier || 1;

  // Requirements list
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          creator:profiles!requirements_created_by_fkey(full_name, email)
        `)
        .eq('project_id', projectId!)
        .order('custom_id', { ascending: true });
      if (error) throw error;
      return (data || []) as Requirement[];
    },
    enabled: !!projectId && tier >= 2,
    staleTime: 30_000,
  });

  // TC link counts + coverage (compute client-side from requirement_tc_links + test_results)
  const { data: coverageMap = {} } = useQuery({
    queryKey: ['requirementCoverage', projectId],
    queryFn: async () => {
      // Get all links for this project's requirements
      const { data: links, error } = await supabase
        .from('requirement_tc_links')
        .select('requirement_id, test_case_id')
        .in(
          'requirement_id',
          requirements.map((r) => r.id)
        );
      if (error) throw error;

      // Get latest result per TC (for linked TCs only)
      const tcIds = [...new Set((links || []).map((l) => l.test_case_id))];
      let resultMap: Record<string, string> = {};
      if (tcIds.length > 0) {
        const { data: results } = await supabase
          .from('test_results')
          .select('test_case_id, status, created_at')
          .in('test_case_id', tcIds)
          .order('created_at', { ascending: false });

        // Keep only latest result per TC
        for (const r of results || []) {
          if (!resultMap[r.test_case_id]) {
            resultMap[r.test_case_id] = r.status;
          }
        }
      }

      // Build coverage per requirement
      const map: Record<string, RequirementCoverage> = {};
      for (const req of requirements) {
        const reqLinks = (links || []).filter((l) => l.requirement_id === req.id);
        const total = reqLinks.length;
        let executed = 0, passed = 0, failed = 0, blocked = 0;
        for (const l of reqLinks) {
          const s = resultMap[l.test_case_id];
          if (s) executed++;
          if (s === 'passed') passed++;
          if (s === 'failed') failed++;
          if (s === 'blocked') blocked++;
        }
        const pct = total === 0 ? 0 : Math.round((executed / total) * 100);
        map[req.id] = { requirement_id: req.id, total_linked_tcs: total, executed_tcs: executed, passed_tcs: passed, failed_tcs: failed, blocked_tcs: blocked, coverage_pct: pct };
      }
      return map;
    },
    enabled: requirements.length > 0,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    return requirements.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.custom_id.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [requirements, statusFilter, priorityFilter, search]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (req: Requirement) => {
    if (!confirm(`Delete "${req.custom_id}: ${req.title}"? This will also remove all TC links.`)) return;
    const { error } = await supabase.from('requirements').delete().eq('id', req.id);
    if (error) {
      showToast('error', 'Failed to delete requirement.');
    } else {
      showToast('success', `${req.custom_id} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['requirements', projectId] });
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Title', 'Priority', 'Status', 'Category', 'Source', 'External ID', 'TCs', 'Coverage %'],
      ...filtered.map((r) => {
        const cov = coverageMap[r.id];
        return [
          r.custom_id,
          `"${r.title.replace(/"/g, '""')}"`,
          r.priority,
          r.status,
          r.category || '',
          r.source,
          r.external_id || '',
          String(cov?.total_linked_tcs || 0),
          String(cov?.coverage_pct || 0),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requirements-${project?.name || projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const starterAtLimit = tier === 2 && requirements.filter((r) => r.status !== 'deprecated').length >= REQ_LIMIT_STARTER;

  if (tier < 2) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
        <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />
        <UpgradePrompt tier={tier} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />

      <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Requirements</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} total
              {tier === 2 && ` · ${requirements.filter(r => r.status !== 'deprecated').length}/${REQ_LIMIT_STARTER} used`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className={btnSecondary} onClick={handleExportCSV} title="Export CSV">
              <i className="ri-download-line" />
              Export CSV
            </button>
            <button className={btnSecondary} onClick={() => setShowJiraImport(true)}>
              <i className="ri-jira-line" />
              Import from Jira
            </button>
            <button
              className={btnPrimary}
              onClick={() => setShowCreateModal(true)}
              disabled={starterAtLimit}
              title={starterAtLimit ? `Starter plan limit: ${REQ_LIMIT_STARTER} requirements` : undefined}
            >
              <i className="ri-add-line" />
              New Requirement
            </button>
          </div>
        </div>

        {/* Starter limit warning */}
        {starterAtLimit && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <i className="ri-error-warning-line text-sm" />
            <span>You've reached the Starter plan limit of {REQ_LIMIT_STARTER} requirements.</span>
            <Link to="/settings?tab=billing" className="font-semibold underline">Upgrade to Pro</Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative">
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
            <input
              type="text"
              placeholder="Search requirements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={fieldCls}
              style={{ paddingLeft: '2rem', width: '16rem' }}
            />
          </div>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={fieldCls}>
            <option value="all">All priorities</option>
            <option value="P1">P1 – Critical</option>
            <option value="P2">P2 – High</option>
            <option value="P3">P3 – Medium</option>
            <option value="P4">P4 – Low</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={fieldCls}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>
          {(search || priorityFilter !== 'all' || statusFilter !== 'all') && (
            <button
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              onClick={() => { setSearch(''); setPriorityFilter('all'); setStatusFilter('all'); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <i className="ri-loader-4-line animate-spin text-lg" />
              Loading requirements...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <i className="ri-git-branch-line text-4xl text-slate-300" />
              <p className="text-sm text-slate-500">
                {requirements.length === 0 ? 'No requirements yet. Create your first one!' : 'No requirements match the current filters.'}
              </p>
              {requirements.length === 0 && (
                <button className={btnPrimary} onClick={() => setShowCreateModal(true)}>
                  <i className="ri-add-line" />
                  New Requirement
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  {['ID', 'Title', 'Priority', 'Status', 'Source', 'TCs', 'Coverage', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.625rem 0.875rem',
                        textAlign: 'left',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#94A3B8',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req, idx) => {
                  const cov = coverageMap[req.id];
                  return (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                        background: '#fff',
                      }}
                      className="hover:bg-slate-50 group transition-colors"
                    >
                      <td style={{ padding: '0.75rem 0.875rem', whiteSpace: 'nowrap' }}>
                        <span className="text-xs font-mono font-semibold text-indigo-600">{req.custom_id}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.875rem', maxWidth: '20rem' }}>
                        <button
                          className="text-sm font-medium text-slate-800 text-left hover:text-indigo-600 transition-colors"
                          onClick={() => setEditReq(req)}
                        >
                          {req.title}
                        </button>
                        {req.category && (
                          <div className="text-xs text-slate-400 mt-0.5">{req.category}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.875rem' }}>{priorityBadge(req.priority)}</td>
                      <td style={{ padding: '0.75rem 0.875rem' }}>{statusBadge(req.status)}</td>
                      <td style={{ padding: '0.75rem 0.875rem' }}>
                        {req.source === 'jira' && req.external_id ? (
                          <a
                            href={req.external_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <i className="ri-links-line text-xs" />
                            {req.external_id}
                          </a>
                        ) : req.source === 'csv' ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1"><i className="ri-file-list-line" />CSV</span>
                        ) : (
                          <span className="text-xs text-slate-400">Manual</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.875rem' }}>
                        <button
                          className="text-xs text-slate-600 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1"
                          onClick={() => setLinkReq(req)}
                        >
                          <i className="ri-test-tube-line text-sm" />
                          {cov ? cov.total_linked_tcs : '—'}
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem 0.875rem', minWidth: '140px' }}>
                        <CoverageBar pct={cov?.coverage_pct || 0} totalTcs={cov?.total_linked_tcs || 0} />
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Link Test Cases"
                            onClick={() => setLinkReq(req)}
                          >
                            <i className="ri-link-m text-sm" />
                          </button>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit"
                            onClick={() => setEditReq(req)}
                          >
                            <i className="ri-edit-line text-sm" />
                          </button>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                            onClick={() => handleDelete(req)}
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-2 text-xs text-slate-400 text-right">
          Showing {filtered.length} of {requirements.length} requirements
        </div>
      </div>

      {/* Modals */}
      {(showCreateModal || editReq) && (
        <RequirementModal
          projectId={projectId!}
          requirement={editReq}
          onClose={() => { setShowCreateModal(false); setEditReq(null); }}
          onSaved={() => {
            setShowCreateModal(false);
            setEditReq(null);
            showToast('success', editReq ? 'Requirement updated.' : 'Requirement created.');
            queryClient.invalidateQueries({ queryKey: ['requirements', projectId] });
          }}
        />
      )}

      {linkReq && (
        <LinkTCModal
          projectId={projectId!}
          requirement={linkReq}
          onClose={() => setLinkReq(null)}
          onLinked={() => {
            queryClient.invalidateQueries({ queryKey: ['requirementCoverage', projectId] });
            showToast('success', 'Test cases updated.');
          }}
        />
      )}

      {showJiraImport && (
        <JiraImportModal
          projectId={projectId!}
          projectJiraKey={project?.jira_project_key || ''}
          existingExternalIds={requirements.filter((r) => r.source === 'jira').map((r) => r.external_id!).filter(Boolean)}
          onClose={() => setShowJiraImport(false)}
          onImported={(count) => {
            setShowJiraImport(false);
            showToast('success', `${count} requirement${count !== 1 ? 's' : ''} imported from Jira.`);
            queryClient.invalidateQueries({ queryKey: ['requirements', projectId] });
          }}
          tier={tier}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            background: toast.type === 'success' ? '#10A37F' : '#EF4444',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <i className={toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
