import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { useToast } from '../../components/Toast';
import { usePermission } from '../../hooks/usePermission';
import PageLoader from '../../components/PageLoader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestPlan {
  id: string;
  project_id: string;
  milestone_id: string | null;
  name: string;
  description: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  target_date: string | null;
  entry_criteria: string[];
  exit_criteria: string[];
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanTestCase {
  test_plan_id: string;
  test_case_id: string;
  added_at: string;
  test_case: {
    id: string;
    title: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    lifecycle_status: string;
    folder: string | null;
    tags: string[] | null;
  };
}

interface PlanRun {
  id: string;
  name: string;
  status: string;
  milestone_id: string | null;
  test_plan_id: string | null;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  created_at: string;
}

interface ActivityLog {
  id: string;
  event_type: string;
  event_category: string;
  metadata: any;
  created_at: string;
  actor_id: string;
}

interface Milestone {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface TestCaseRow {
  id: string;
  title: string;
  priority: string;
  lifecycle_status: string;
  folder: string | null;
  tags: string[] | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  planning:  { label: 'Planning',   cls: 'bg-slate-100 text-slate-600' },
  active:    { label: 'Active',     cls: 'bg-blue-100 text-blue-600' },
  completed: { label: 'Completed',  cls: 'bg-green-100 text-green-600' },
  cancelled: { label: 'Cancelled',  cls: 'bg-rose-100 text-rose-600' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  high:     { label: 'High',     cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  medium:   { label: 'Medium',   cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:      { label: 'Low',      cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const RUN_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:          { label: 'Not Started', color: '#94A3B8' },
  in_progress:  { label: 'In Progress', color: '#3B82F6' },
  paused:       { label: 'Paused',      color: '#F59E0B' },
  under_review: { label: 'Under Review',color: '#8B5CF6' },
  completed:    { label: 'Completed',   color: '#10B981' },
};

// ─── Tab: Test Cases ──────────────────────────────────────────────────────────

function TestCasesTab({
  plan,
  planTcs,
  allTcs,
  onAddTc,
  onRemoveTc,
  onLock,
}: {
  plan: TestPlan;
  planTcs: PlanTestCase[];
  allTcs: TestCaseRow[];
  onAddTc: (tcId: string) => Promise<void>;
  onRemoveTc: (tcId: string) => Promise<void>;
  onLock: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const includedIds = new Set(planTcs.map(p => p.test_case_id));
  const filteredPlanTcs = planTcs.filter(p =>
    !search || p.test_case.title.toLowerCase().includes(search.toLowerCase())
  );
  const availableTcs = allTcs.filter(tc =>
    !includedIds.has(tc.id) &&
    (!pickerSearch || tc.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: '0 0 0.25rem' }}>
            Test Cases <span style={{ color: '#64748B', fontWeight: 400 }}>({planTcs.length})</span>
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
            {plan.is_locked ? 'Snapshot locked — no changes allowed.' : 'Add test cases to define the scope of this plan.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {!plan.is_locked && planTcs.length > 0 && (
            <button
              onClick={onLock}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', background: '#fff', fontSize: '0.8125rem', color: '#374151', cursor: 'pointer' }}
              className="hover:bg-slate-50"
            >
              <i className="ri-lock-2-line" style={{ color: '#6366F1' }} /> Lock Snapshot
            </button>
          )}
          {!plan.is_locked && (
            <button
              onClick={() => setShowPicker(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', border: 'none', borderRadius: '0.5rem', background: '#6366F1', color: '#fff', fontSize: '0.8125rem', cursor: 'pointer' }}
            >
              <i className="ri-add-line" /> Add Test Cases
            </button>
          )}
        </div>
      </div>

      {/* Lock status */}
      {plan.is_locked && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem', color: '#9A3412' }}>
          <i className="ri-lock-2-fill" />
          This plan's test case scope is locked as a snapshot. New test case versions won't affect this plan.
        </div>
      )}

      {/* Search */}
      {planTcs.length > 5 && (
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <i className="ri-search-line" style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.875rem' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search test cases..."
            style={{ paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.8125rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {/* TC list */}
      {filteredPlanTcs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed #E2E8F0', borderRadius: '0.75rem' }}>
          <i className="ri-test-tube-line" style={{ fontSize: '2rem', color: '#CBD5E1', display: 'block', marginBottom: '0.75rem' }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
            {search ? 'No test cases match your search.' : 'No test cases added yet. Click "Add Test Cases" to start.'}
          </p>
        </div>
      ) : (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {filteredPlanTcs
            .slice()
            .sort((a, b) => priorityOrder[a.test_case.priority] - priorityOrder[b.test_case.priority])
            .map((ptc, idx) => {
              const pc = PRIORITY_CONFIG[ptc.test_case.priority];
              return (
                <div key={ptc.test_case_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: idx < filteredPlanTcs.length - 1 ? '1px solid #F1F5F9' : 'none', background: '#fff' }}>
                  <i className="ri-test-tube-line" style={{ color: '#6366F1', flexShrink: 0, fontSize: '0.875rem' }} />
                  <span style={{ flex: 1, fontSize: '0.875rem', color: '#1E293B' }}>{ptc.test_case.title}</span>
                  {ptc.test_case.folder && (
                    <span style={{ fontSize: '0.6875rem', color: '#9CA3AF' }}>
                      <i className="ri-folder-line" style={{ marginRight: '0.2rem' }} />{ptc.test_case.folder}
                    </span>
                  )}
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.4rem', borderRadius: '0.25rem', border: '1px solid' }} className={pc.cls}>{pc.label}</span>
                  {!plan.is_locked && (
                    <button
                      onClick={() => onRemoveTc(ptc.test_case_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: '1rem', padding: '0 0.25rem' }}
                      className="hover:text-rose-500"
                    >
                      <i className="ri-close-line" />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* TC Picker Modal */}
      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', width: '100%', maxWidth: '30rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>Add Test Cases</h3>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <i className="ri-close-line" style={{ fontSize: '1.25rem' }} />
              </button>
            </div>
            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ position: 'relative' }}>
                <i className="ri-search-line" style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input type="text" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search test cases..." autoFocus
                  style={{ paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {availableTcs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.875rem' }}>
                  {pickerSearch ? 'No test cases match.' : 'All test cases are already added.'}
                </div>
              ) : (
                availableTcs.map(tc => {
                  const pc = PRIORITY_CONFIG[tc.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={tc.id}
                      onClick={() => { onAddTc(tc.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #F8FAFC' }}
                      className="hover:bg-indigo-50"
                    >
                      <i className="ri-add-circle-line" style={{ color: '#6366F1', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.875rem', color: '#1E293B' }}>{tc.title}</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.4rem', borderRadius: '0.25rem', border: '1px solid' }} className={pc.cls}>{pc.label}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPicker(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Runs ────────────────────────────────────────────────────────────────

function RunsTab({ runs, projectId, planId }: { runs: PlanRun[]; projectId: string; planId: string }) {
  const navigate = useNavigate();
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: '0 0 0.25rem' }}>
            Runs <span style={{ color: '#64748B', fontWeight: 400 }}>({runs.length})</span>
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>Test runs linked to this plan.</p>
        </div>
        <button
          onClick={() => navigate(`/projects/${projectId}/runs?action=create&plan_id=${planId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', border: 'none', borderRadius: '0.5rem', background: '#6366F1', color: '#fff', fontSize: '0.8125rem', cursor: 'pointer' }}
        >
          <i className="ri-add-line" /> New Run
        </button>
      </div>

      {runs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed #E2E8F0', borderRadius: '0.75rem' }}>
          <i className="ri-play-circle-line" style={{ fontSize: '2rem', color: '#CBD5E1', display: 'block', marginBottom: '0.75rem' }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>No runs linked to this plan yet.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {runs.map((run, idx) => {
            const total = run.passed + run.failed + run.blocked + run.retest + run.untested;
            const done = run.passed + run.failed + run.blocked + run.retest;
            const progress = total > 0 ? Math.round(done / total * 100) : 0;
            const passRate = done > 0 ? Math.round(run.passed / done * 100) : 0;
            const sc = RUN_STATUS_CONFIG[run.status] || { label: run.status, color: '#94A3B8' };
            return (
              <div key={run.id}
                onClick={() => navigate(`/projects/${projectId}/runs/${run.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', borderBottom: idx < runs.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', background: '#fff' }}
                className="hover:bg-slate-50"
              >
                <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: sc.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.125rem 0 0' }}>{sc.label}</p>
                </div>
                {/* Progress bar */}
                <div style={{ width: '6rem' }}>
                  <div style={{ height: '0.375rem', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#6366F1', borderRadius: '9999px', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94A3B8' }}>
                    <span>{progress}%</span>
                    {done > 0 && <span style={{ color: '#10B981' }}>{passRate}% pass</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', flexShrink: 0 }}>
                  {run.passed > 0 && <span style={{ color: '#10B981' }}><i className="ri-checkbox-circle-line" /> {run.passed}</span>}
                  {run.failed > 0 && <span style={{ color: '#EF4444' }}><i className="ri-close-circle-line" /> {run.failed}</span>}
                  {run.blocked > 0 && <span style={{ color: '#F59E0B' }}><i className="ri-forbid-2-line" /> {run.blocked}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab({ logs, profiles }: { logs: ActivityLog[]; profiles: Map<string, Profile> }) {
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const eventIcon: Record<string, string> = {
    plan_created:           'ri-file-add-line',
    plan_updated:           'ri-edit-line',
    plan_tc_added:          'ri-test-tube-line',
    plan_tc_removed:        'ri-delete-bin-line',
    plan_locked:            'ri-lock-2-line',
    plan_status_changed:    'ri-refresh-line',
    run_created:            'ri-play-circle-line',
    run_completed:          'ri-checkbox-circle-line',
  };

  return (
    <div>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem' }}>Activity</h3>
      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed #E2E8F0', borderRadius: '0.75rem' }}>
          <i className="ri-time-line" style={{ fontSize: '2rem', color: '#CBD5E1', display: 'block', marginBottom: '0.75rem' }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>No activity recorded yet.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
          <div style={{ position: 'absolute', left: '0.5rem', top: 0, bottom: 0, width: '1px', background: '#E2E8F0' }} />
          {logs.map(log => {
            const actor = profiles.get(log.actor_id);
            const icon = eventIcon[log.event_type] || 'ri-information-line';
            return (
              <div key={log.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', position: 'relative' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#EEF2FF', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'absolute', left: '-2.25rem', top: '0.125rem' }}>
                  <i className={icon} style={{ fontSize: '0.625rem', color: '#6366F1' }} />
                </div>
                <div style={{ flex: 1, background: '#F8FAFC', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                      {actor?.full_name || actor?.email || 'Someone'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{formatTime(log.created_at)}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: 0 }}>
                    {log.event_type.replace(/_/g, ' ')}
                    {log.metadata?.name && ` — "${log.metadata.name}"`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Issues ──────────────────────────────────────────────────────────────

function IssuesTab({ runs }: { runs: PlanRun[] }) {
  // Show issues linked to runs under this plan
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (runs.length === 0) { setLoading(false); return; }
      const runIds = runs.map(r => r.id);
      const { data } = await supabase
        .from('test_results')
        .select('jira_issue_key, jira_issue_url, github_issue_url, run_id, test_case_id')
        .in('run_id', runIds)
        .not('jira_issue_key', 'is', null)
        .limit(50);
      setIssues(data || []);
      setLoading(false);
    };
    load();
  }, [runs]);

  return (
    <div>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem' }}>Linked Issues</h3>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.875rem' }}>Loading...</div>
      ) : issues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '2px dashed #E2E8F0', borderRadius: '0.75rem' }}>
          <i className="ri-bug-line" style={{ fontSize: '2rem', color: '#CBD5E1', display: 'block', marginBottom: '0.75rem' }} />
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>No issues linked to runs in this plan yet.</p>
        </div>
      ) : (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {issues.map((issue, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: idx < issues.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <i className="ri-bug-line" style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: '#374151', flex: 1 }}>{issue.jira_issue_key}</span>
              {issue.jira_issue_url && (
                <a href={issue.jira_issue_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.75rem', color: '#6366F1', textDecoration: 'none' }}
                  className="hover:underline">
                  View <i className="ri-external-link-line" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({
  plan,
  profiles,
  milestones,
  onUpdate,
  onDelete,
}: {
  plan: TestPlan;
  profiles: Profile[];
  milestones: Milestone[];
  onUpdate: (data: Partial<TestPlan>) => Promise<void>;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? '',
    status: plan.status,
    priority: plan.priority,
    owner_id: plan.owner_id ?? '',
    milestone_id: plan.milestone_id ?? '',
    target_date: plan.target_date ?? '',
    entry_criteria: (plan.entry_criteria ?? []).join('\n'),
    exit_criteria: (plan.exit_criteria ?? []).join('\n'),
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        owner_id: form.owner_id || null,
        milestone_id: form.milestone_id || null,
        target_date: form.target_date || null,
        entry_criteria: form.entry_criteria.split('\n').map(s => s.trim()).filter(Boolean),
        exit_criteria: form.exit_criteria.split('\n').map(s => s.trim()).filter(Boolean),
      });
      showToast('Settings saved', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '36rem' }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1.25rem' }}>Plan Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Plan Name</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TestPlan['status'] }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TestPlan['priority'] }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Milestone</label>
            <select value={form.milestone_id} onChange={e => setForm(f => ({ ...f, milestone_id: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', background: '#fff', outline: 'none' }}>
              <option value="">— Ad-hoc —</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Target Date</label>
            <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Entry Criteria <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(one per line)</span></label>
          <textarea value={form.entry_criteria} onChange={e => setForm(f => ({ ...f, entry_criteria: e.target.value }))}
            rows={3} placeholder="e.g.&#10;All unit tests passing&#10;Feature branch merged to staging"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>Exit Criteria <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(one per line)</span></label>
          <textarea value={form.exit_criteria} onChange={e => setForm(f => ({ ...f, exit_criteria: e.target.value }))}
            rows={3} placeholder="e.g.&#10;Pass rate ≥ 95%&#10;No Critical/High open bugs"
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '0.5rem', background: '#6366F1', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Danger zone */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#EF4444', margin: '0 0 0.75rem' }}>Danger Zone</h4>
          <button onClick={onDelete}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: '1px solid #FECACA', borderRadius: '0.5rem', background: '#FEF2F2', color: '#EF4444', fontSize: '0.875rem', cursor: 'pointer' }}>
            <i className="ri-delete-bin-line" /> Delete this Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'testcases', label: 'Test Cases', icon: 'ri-test-tube-line' },
  { key: 'runs',      label: 'Runs',       icon: 'ri-play-circle-line' },
  { key: 'activity',  label: 'Activity',   icon: 'ri-time-line' },
  { key: 'issues',    label: 'Issues',     icon: 'ri-bug-line' },
  { key: 'settings',  label: 'Settings',   icon: 'ri-settings-3-line' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function PlanDetailPage() {
  const { id: projectId, milestoneId, planId } = useParams<{ id: string; milestoneId: string; planId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [plan, setPlan] = useState<TestPlan | null>(null);
  const [planTcs, setPlanTcs] = useState<PlanTestCase[]>([]);
  const [allTcs, setAllTcs] = useState<TestCaseRow[]>([]);
  const [runs, setRuns] = useState<PlanRun[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('testcases');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId || !planId) return;
    load();
  }, [projectId, planId]);

  const load = async () => {
    setLoading(true);
    try {
      const [projectRes, planRes, planTcsRes, allTcsRes, runsRes, milestonesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId!).single(),
        supabase.from('test_plans').select('*').eq('id', planId!).single(),
        supabase.from('test_plan_test_cases')
          .select('test_plan_id, test_case_id, added_at, test_case:test_cases(id, title, priority, lifecycle_status, folder, tags)')
          .eq('test_plan_id', planId!),
        supabase.from('test_cases')
          .select('id, title, priority, lifecycle_status, folder, tags')
          .eq('project_id', projectId!)
          .neq('lifecycle_status', 'deprecated')
          .order('title'),
        supabase.from('test_runs').select('*').eq('test_plan_id', planId!).order('created_at', { ascending: false }),
        supabase.from('milestones').select('id, name').eq('project_id', projectId!).order('end_date'),
      ]);

      if (planRes.error) throw planRes.error;
      setProject(projectRes.data);
      setPlan(planRes.data);
      setPlanTcs((planTcsRes.data as any) || []);
      setAllTcs(allTcsRes.data || []);
      setRuns(runsRes.data || []);
      setMilestones(milestonesRes.data || []);

      // Milestone info
      if (planRes.data?.milestone_id) {
        const ms = (milestonesRes.data || []).find((m: any) => m.id === planRes.data.milestone_id);
        if (ms) setMilestone(ms);
      }

      // Activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('target_id', planId!)
        .eq('target_type', 'test_plan')
        .order('created_at', { ascending: false })
        .limit(50);
      setActivityLogs(logs || []);

      // Profiles for actors
      const actorIds = [...new Set((logs || []).map((l: any) => l.actor_id).filter(Boolean))] as string[];
      if (actorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles').select('id, full_name, email, avatar_url').in('id', actorIds);
        const profileMap = new Map((profileData || []).map((p: any) => [p.id, p]));
        setProfiles(profileMap);
      }
    } catch (err: any) {
      showToast('Failed to load plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── TC handlers ────────────────────────────────────────────────────────────

  const handleAddTc = async (tcId: string) => {
    const { error } = await supabase.from('test_plan_test_cases').insert({ test_plan_id: planId, test_case_id: tcId });
    if (error) { showToast('Failed to add test case', 'error'); return; }
    const tc = allTcs.find(t => t.id === tcId);
    if (tc) {
      setPlanTcs(prev => [...prev, { test_plan_id: planId!, test_case_id: tcId, added_at: new Date().toISOString(), test_case: tc }]);
    }
    showToast('Test case added', 'success');
  };

  const handleRemoveTc = async (tcId: string) => {
    const { error } = await supabase.from('test_plan_test_cases')
      .delete().eq('test_plan_id', planId!).eq('test_case_id', tcId);
    if (error) { showToast('Failed to remove test case', 'error'); return; }
    setPlanTcs(prev => prev.filter(p => p.test_case_id !== tcId));
    showToast('Test case removed', 'success');
  };

  const handleLock = async () => {
    const { error } = await supabase.from('test_plans').update({ is_locked: true, snapshot_id: `snap_${Date.now()}` }).eq('id', planId!);
    if (error) { showToast('Failed to lock snapshot', 'error'); return; }
    setPlan(p => p ? { ...p, is_locked: true } : p);
    showToast('Snapshot locked', 'success');
  };

  const handleUpdate = async (data: Partial<TestPlan>) => {
    const { error } = await supabase.from('test_plans').update(data).eq('id', planId!);
    if (error) { showToast('Failed to update plan', 'error'); throw error; }
    setPlan(p => p ? { ...p, ...data } : p);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('test_plans').delete().eq('id', planId!);
    if (error) { showToast('Failed to delete plan', 'error'); return; }
    navigate(`/projects/${projectId}/milestones`);
    showToast('Plan deleted', 'success');
  };

  if (loading) return <PageLoader />;
  if (!plan) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name ?? ''} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        Plan not found.
      </div>
    </div>
  );

  const sc = STATUS_CONFIG[plan.status];
  const pc = PRIORITY_CONFIG[plan.priority];
  const tcCount = planTcs.length;
  const runCount = runs.length;
  const doneRuns = runs.filter(r => r.status === 'completed').length;
  const totalPassed = runs.reduce((a, r) => a + r.passed, 0);
  const totalDone = runs.reduce((a, r) => a + r.passed + r.failed + r.blocked + r.retest, 0);
  const overallPassRate = totalDone > 0 ? Math.round(totalPassed / totalDone * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name ?? ''} />

      {/* Plan detail info bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0.875rem 1.5rem 0', flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem', fontSize: '0.75rem' }}>
          <Link to={`/projects/${projectId}/milestones`} style={{ color: '#6366F1', fontWeight: 500, textDecoration: 'none' }} className="hover:underline">Milestones</Link>
          <i className="ri-arrow-right-s-line" style={{ color: '#CBD5E1', fontSize: '0.625rem' }} />
          {milestone && (
            <>
              <Link to={`/projects/${projectId}/milestones/${milestoneId}`} style={{ color: '#6366F1', fontWeight: 500, textDecoration: 'none' }} className="hover:underline">{milestone.name}</Link>
              <i className="ri-arrow-right-s-line" style={{ color: '#CBD5E1', fontSize: '0.625rem' }} />
            </>
          )}
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{plan.name}</span>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {plan.is_locked
              ? <i className="ri-lock-2-line" style={{ color: '#6366F1', fontSize: '1rem' }} />
              : <i className="ri-file-list-3-line" style={{ color: '#6366F1', fontSize: '1rem' }} />
            }
          </div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{plan.name}</h1>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} className={sc.cls}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', opacity: 0.6 }} />
            {sc.label}
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.1875rem 0.5rem', borderRadius: '0.25rem', border: '1px solid' }} className={pc.cls}>
            {pc.label}
          </span>
          {plan.is_locked && (
            <span style={{ fontSize: '0.6875rem', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', padding: '0.1875rem 0.4375rem', borderRadius: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <i className="ri-lock-2-line" style={{ fontSize: '0.625rem' }} /> Locked
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8125rem', color: '#64748B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
              <i className="ri-test-tube-line" style={{ color: '#6366F1', fontSize: '0.875rem' }} />
              <span><strong style={{ color: '#0F172A' }}>{tcCount}</strong> TCs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
              <i className="ri-play-circle-line" style={{ color: '#10B981', fontSize: '0.875rem' }} />
              <span><strong style={{ color: '#0F172A' }}>{doneRuns}/{runCount}</strong> runs</span>
            </div>
            {totalDone > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                <i className="ri-percent-line" style={{ color: overallPassRate >= 80 ? '#10B981' : '#F59E0B', fontSize: '0.875rem' }} />
                <strong style={{ color: overallPassRate >= 80 ? '#10B981' : '#F59E0B' }}>{overallPassRate}%</strong>
              </div>
            )}
            {plan.target_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                <i className="ri-calendar-event-line" style={{ fontSize: '0.875rem' }} />
                Due {new Date(plan.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {runCount > 0 && totalDone > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, height: '0.375rem', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${overallPassRate}%`, background: overallPassRate >= 80 ? '#22C55E' : '#F97316', borderRadius: '9999px', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{overallPassRate}% pass rate</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3125rem',
                padding: '0 0.875rem', height: '2.5rem',
                border: 'none',
                borderBottom: `2.5px solid ${activeTab === tab.key ? '#6366F1' : 'transparent'}`,
                background: 'none',
                fontSize: '0.8125rem',
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? '#6366F1' : '#64748B',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                position: 'relative',
              }}
            >
              <i className={tab.icon} style={{ fontSize: '0.9375rem' }} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          {activeTab === 'testcases' && (
            <TestCasesTab
              plan={plan}
              planTcs={planTcs}
              allTcs={allTcs}
              onAddTc={handleAddTc}
              onRemoveTc={handleRemoveTc}
              onLock={handleLock}
            />
          )}
          {activeTab === 'runs' && (
            <RunsTab runs={runs} projectId={projectId!} planId={planId!} />
          )}
          {activeTab === 'activity' && (
            <ActivityTab logs={activityLogs} profiles={profiles} />
          )}
          {activeTab === 'issues' && (
            <IssuesTab runs={runs} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              plan={plan}
              profiles={[...profiles.values()]}
              milestones={milestones}
              onUpdate={handleUpdate}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)' }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', maxWidth: '28rem', width: '100%', margin: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ri-delete-bin-line" style={{ color: '#EF4444', fontSize: '1.125rem' }} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>Delete Test Plan</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>"{plan.name}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete}
                style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', background: '#EF4444', color: '#fff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>Delete Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
