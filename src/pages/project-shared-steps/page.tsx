import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import SharedStepModal from './components/SharedStepModal';
import type { SharedTestStep, SharedStepUsage } from '../../types/shared-steps';

// ── Bulk-update dialog (standalone, opened from the library list) ─────────────
interface BulkUsageTC { test_case_id: string; custom_id: string; title: string; linked_version: number; }

function BulkUpdateDialog({ step, onClose, onDone }: { step: SharedTestStep; onClose: () => void; onDone: () => void }) {
  const [usageTCs, setUsageTCs] = useState<BulkUsageTC[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);

  // Fetch TCs referencing this shared step by scanning all TC steps client-side
  // (ilike does not work on JSONB columns; fetch by project and filter in JS)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('test_cases')
        .select('id, custom_id, title, steps')
        .eq('project_id', step.project_id);

      const list: BulkUsageTC[] = [];
      for (const tc of (data || [])) {
        try {
          const steps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []);
          const ref = Array.isArray(steps)
            ? steps.find((s: any) => s?.type === 'shared_step_ref' && s.shared_step_id === step.id)
            : null;
          if (ref) {
            list.push({
              test_case_id: tc.id,
              custom_id: tc.custom_id || '',
              title: tc.title || '',
              linked_version: ref.shared_step_version ?? 1,
            });
          }
        } catch {}
      }
      setUsageTCs(list);
      // Pre-select TCs with outdated versions
      setSelectedIds(new Set(list.filter(t => t.linked_version < step.version).map(t => t.test_case_id)));
      setLoading(false);
    })();
  }, [step.id, step.version, step.project_id]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const tcIds = [...selectedIds];
      const { data: tcs } = await supabase.from('test_cases').select('id, steps').in('id', tcIds);
      for (const tc of (tcs || [])) {
        try {
          const raw = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []);
          const updated = (Array.isArray(raw) ? raw : []).map((s: any) =>
            s?.type === 'shared_step_ref' && s.shared_step_id === step.id
              ? { ...s, shared_step_version: step.version }
              : s
          );
          await supabase.from('test_cases').update({ steps: JSON.stringify(updated) }).eq('id', tc.id);
        } catch {}
      }
    } finally {
      setUpdating(false);
      onDone();
    }
  };

  const outdatedCount = usageTCs.filter(t => t.linked_version < step.version).length;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1100 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '560px', maxWidth: 'calc(100vw - 2rem)', maxHeight: '80vh',
        background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        zIndex: 1101, display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-refresh-line text-amber-600 text-base" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Bulk Update — {step.custom_id}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {usageTCs.length} TC{usageTCs.length !== 1 ? 's' : ''} reference this · {outdatedCount} outdated (pinned to older version)
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        {/* TC list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
              <i className="ri-loader-4-line animate-spin" /> Loading…
            </div>
          ) : usageTCs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No test cases reference this shared step yet.</div>
          ) : (
            <>
              <label className="flex items-center gap-2 py-2 border-b border-slate-100 cursor-pointer mb-1">
                <input
                  type="checkbox"
                  checked={selectedIds.size === usageTCs.length && usageTCs.length > 0}
                  onChange={e => setSelectedIds(e.target.checked ? new Set(usageTCs.map(t => t.test_case_id)) : new Set())}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className="text-xs font-semibold text-slate-600">Select all</span>
              </label>
              <div className="space-y-1">
                {usageTCs.map(tc => {
                  const outdated = tc.linked_version < step.version;
                  return (
                    <label key={tc.test_case_id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tc.test_case_id)}
                        onChange={e => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(tc.test_case_id);
                          else next.delete(tc.test_case_id);
                          setSelectedIds(next);
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex-shrink-0">
                        {tc.custom_id}
                      </span>
                      <span className="text-xs text-slate-700 flex-1 truncate">{tc.title}</span>
                      {outdated ? (
                        <span className="text-[0.65rem] text-amber-600 font-semibold flex-shrink-0">
                          v{tc.linked_version} → v{step.version}
                        </span>
                      ) : (
                        <span className="text-[0.65rem] text-slate-400 flex-shrink-0">v{tc.linked_version} ✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F1F5F9' }} className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
            Close
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={updating || selectedIds.size === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {updating ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-refresh-line" />}
            {updating ? 'Updating…' : `Update ${selectedIds.size} TC${selectedIds.size !== 1 ? 's' : ''} to v${step.version}`}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const btnPrimary = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer border-0`;
const btnSecondary = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer`;
const fieldCls = `border border-slate-200 rounded-lg text-xs text-slate-700 px-2.5 py-1.5 bg-white focus:outline-none focus:border-indigo-400 transition-colors`;

// Tier: 1=Free, 2=Starter, 3=Professional, 4=Enterprise
const SHARED_STEPS_LIMIT_STARTER = 20;

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({
  step,
  usages,
  onConfirm,
  onConvertAndDelete,
  onClose,
  deleting,
}: {
  step: SharedTestStep;
  usages: SharedStepUsage[];
  onConfirm: () => void;
  onConvertAndDelete: () => void;
  onClose: () => void;
  deleting: boolean;
}) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999, backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '440px', maxWidth: 'calc(100vw - 2rem)',
        background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        zIndex: 1000, padding: '1.5rem',
      }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-delete-bin-line text-red-500 text-base" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Delete {step.custom_id}?</h3>
        </div>

        {usages.length > 0 ? (
          <>
            <p className="text-sm text-slate-600 mb-3">
              <strong>{step.custom_id}</strong> is used by <strong>{usages.length} test case{usages.length !== 1 ? 's' : ''}</strong>. Choose how to proceed:
            </p>
            <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
              {usages.map(u => (
                <div key={u.test_case_id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                  <span className="font-mono text-indigo-500 flex-shrink-0">{u.custom_id}</span>
                  <span className="truncate">{u.title}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end flex-wrap">
              <button onClick={onClose} className={btnSecondary}>Cancel</button>
              <button
                onClick={onConvertAndDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-arrow-go-back-line" />}
                Convert to Inline & Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-4">
              This shared step has no references. It will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className={btnSecondary}>Cancel</button>
              <button
                onClick={onConfirm}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-delete-bin-line" />}
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Used-by panel ─────────────────────────────────────────────────────────────
interface UsedByTC { id: string; custom_id: string; title: string; folder: string | null; }

function UsedByPanel({ step, projectId, onClose }: { step: SharedTestStep; projectId: string; onClose: () => void }) {
  const [usages, setUsages] = useState<UsedByTC[]>([]);
  const [loading, setLoading] = useState(true);

  // Client-side scan — same pattern as BulkUpdateDialog / liveUsageCounts
  // (ilike and .contains() are unreliable when steps is stored as TEXT)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('test_cases')
        .select('id, custom_id, title, folder, steps')
        .eq('project_id', projectId);
      if (cancelled) return;
      const found: UsedByTC[] = [];
      for (const tc of (data || [])) {
        try {
          const steps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []);
          if (Array.isArray(steps) && steps.some((s: any) => s?.type === 'shared_step_ref' && s.shared_step_id === step.id)) {
            found.push({ id: tc.id, custom_id: tc.custom_id || '', title: tc.title || '', folder: tc.folder || null });
          }
        } catch {}
      }
      setUsages(found);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [step.id, projectId]);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999, backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '520px', maxWidth: 'calc(100vw - 2rem)', maxHeight: '80vh',
        background: '#fff', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        zIndex: 1000, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{step.custom_id}: {step.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">v{step.version} · {step.steps.length} steps</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Step preview with expected results */}
          <div style={{ padding: '1rem 1.5rem 0' }}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Steps</p>
            <div className="space-y-2">
              {step.steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[0.6rem] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed">{s.step}</p>
                    {s.expectedResult && (
                      <div className="mt-0.5 flex items-start gap-1 pl-1 border-l-2 border-slate-200">
                        <p className="text-[0.7rem] text-slate-400 leading-relaxed">{s.expectedResult}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Used by TC list */}
          <div style={{ padding: '1rem 1.5rem 1.5rem' }}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Used by {loading ? '…' : `${usages.length} TC${usages.length !== 1 ? 's' : ''}`}
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <i className="ri-loader-4-line animate-spin" /> Loading…
              </div>
            ) : usages.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No test cases reference this shared step.</p>
            ) : (
              <div className="space-y-1">
                {usages.map(u => (
                  <Link
                    key={u.id}
                    to={`/projects/${projectId}/testcases?tc=${u.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <span className="text-[0.65rem] font-mono font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {u.custom_id}
                    </span>
                    <span className="text-xs text-slate-700 flex-1 truncate group-hover:text-indigo-600 transition-colors">{u.title}</span>
                    {u.folder && (
                      <span className="text-[0.65rem] text-slate-400 truncate max-w-[90px]">{u.folder}</span>
                    )}
                    <i className="ri-arrow-right-s-line text-slate-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectSharedSteps() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editStep, setEditStep] = useState<SharedTestStep | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharedTestStep | null>(null);
  const [deleteUsages, setDeleteUsages] = useState<SharedStepUsage[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usedByStep, setUsedByStep] = useState<SharedTestStep | null>(null);
  const [bulkUpdateTarget, setBulkUpdateTarget] = useState<SharedTestStep | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Project
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').eq('id', projectId!).single();
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
      const { data } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
      return { subscription_tier: data?.subscription_tier || 1 };
    },
    staleTime: 5 * 60_000,
  });

  const tier = userProfile?.subscription_tier || 1;

  // Shared steps list
  const { data: sharedSteps = [], isLoading } = useQuery({
    queryKey: ['shared_steps', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_steps')
        .select('*')
        .eq('project_id', projectId!)
        .order('custom_id', { ascending: true });
      if (error) throw error;
      return (data || []) as SharedTestStep[];
    },
    enabled: !!projectId && tier >= 2,
    staleTime: 30_000,
  });

  // Live usage counts by scanning test_cases.steps directly (not shared_step_usage)
  const { data: liveUsageCounts = {} } = useQuery({
    queryKey: ['tc_step_counts', projectId],
    queryFn: async () => {
      const { data: tcs } = await supabase
        .from('test_cases')
        .select('steps')
        .eq('project_id', projectId!);
      const counts: Record<string, number> = {};
      for (const tc of (tcs || [])) {
        try {
          const steps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []);
          const seen = new Set<string>();
          for (const s of (Array.isArray(steps) ? steps : [])) {
            if (s?.type === 'shared_step_ref' && s.shared_step_id && !seen.has(s.shared_step_id)) {
              counts[s.shared_step_id] = (counts[s.shared_step_id] || 0) + 1;
              seen.add(s.shared_step_id);
            }
          }
        } catch {}
      }
      return counts;
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  // Unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(sharedSteps.map(s => s.category).filter(Boolean) as string[])];
    return cats.sort();
  }, [sharedSteps]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = sharedSteps;
    if (categoryFilter !== 'all') list = list.filter(s => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.custom_id.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.tags || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [sharedSteps, categoryFilter, search]);

  const isStarterLimitReached = tier === 2 && sharedSteps.length >= SHARED_STEPS_LIMIT_STARTER;

  // Delete handler
  const handleDeleteClick = async (step: SharedTestStep) => {
    // Fetch usage count
    const { data: tcs } = await supabase
      .from('test_cases')
      .select('id, custom_id, title, folder')
      .eq('project_id', projectId!);

    const usages: SharedStepUsage[] = [];
    for (const tc of tcs || []) {
      let steps: any[] = [];
      try { steps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []); } catch {}
      const refs = steps.filter((s: any) => s.type === 'shared_step_ref' && s.shared_step_id === step.id);
      if (refs.length > 0) usages.push({ test_case_id: tc.id, custom_id: tc.custom_id, title: tc.title, folder_path: tc.folder });
    }

    setDeleteUsages(usages);
    setDeleteTarget(step);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const { error } = await supabase.from('shared_steps').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['shared_steps', projectId] });
      showToast('success', `${deleteTarget.custom_id} deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleConvertAndDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      // Convert all references to inline steps
      for (const usage of deleteUsages) {
        const { data: tcData } = await supabase
          .from('test_cases')
          .select('steps')
          .eq('id', usage.test_case_id)
          .single();
        if (!tcData) continue;

        let steps: any[] = [];
        try { steps = typeof tcData.steps === 'string' ? JSON.parse(tcData.steps) : (tcData.steps || []); } catch {}

        const newSteps: any[] = [];
        let counter = Date.now();
        for (const s of steps) {
          if (s.type === 'shared_step_ref' && s.shared_step_id === deleteTarget.id) {
            // Expand inline
            for (const innerStep of deleteTarget.steps) {
              newSteps.push({ id: String(++counter), step: innerStep.step, expectedResult: innerStep.expectedResult });
            }
          } else {
            newSteps.push(s);
          }
        }

        await supabase
          .from('test_cases')
          .update({ steps: JSON.stringify(newSteps) })
          .eq('id', usage.test_case_id);
      }

      // Now delete the shared step
      await supabase.from('shared_steps').delete().eq('id', deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['shared_steps', projectId] });
      queryClient.invalidateQueries({ queryKey: ['testCases', projectId] });
      showToast('success', `${deleteTarget.custom_id} converted to inline steps and deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to convert and delete.');
    } finally {
      setDeletingId(null);
    }
  };

  // CSV Export
  const handleExport = () => {
    const rows = [
      ['ID', 'Name', 'Description', 'Category', 'Tags', 'Steps Count', 'Version', 'Usage Count'],
      ...filtered.map(s => [
        s.custom_id,
        s.name,
        s.description || '',
        s.category || '',
        s.tags || '',
        String(s.steps.length),
        String(s.version),
        String(s.usage_count),
      ]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shared-steps-${project?.name || projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Free tier gate
  if (tier === 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>
        <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <i className="ri-links-line text-3xl text-indigo-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Shared/Reusable Test Steps</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Build a library of reusable step sequences and reference them across multiple test cases. Available on Starter and above.
            </p>
          </div>
          <Link to="/settings?tab=billing" className={btnPrimary}>
            <i className="ri-vip-crown-line" />
            Upgrade to Starter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC' }}>
      <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {/* Page header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <i className="ri-links-line text-indigo-500" />
              Steps Library
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Reusable step sequences referenced by multiple test cases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className={btnSecondary}>
              <i className="ri-download-line" />
              Export CSV
            </button>
            <button
              onClick={() => {
                if (isStarterLimitReached) return;
                setEditStep(null);
                setShowCreateModal(true);
              }}
              disabled={isStarterLimitReached}
              className={`${btnPrimary} ${isStarterLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isStarterLimitReached ? `Starter plan limit: ${SHARED_STEPS_LIMIT_STARTER} shared steps` : undefined}
            >
              <i className="ri-add-line" />
              New Shared Step
            </button>
          </div>
        </div>

        {/* Starter limit banner */}
        {tier === 2 && sharedSteps.length >= Math.floor(SHARED_STEPS_LIMIT_STARTER * 0.8) && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 text-sm ${
            isStarterLimitReached
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <i className={`ri-information-line text-lg flex-shrink-0 ${isStarterLimitReached ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              {isStarterLimitReached
                ? <><strong>Limit reached.</strong> Starter plan allows up to {SHARED_STEPS_LIMIT_STARTER} shared steps.</>
                : <><strong>{sharedSteps.length} / {SHARED_STEPS_LIMIT_STARTER}</strong> shared steps used on Starter plan.</>
              }
            </div>
            <Link to="/settings?tab=billing" className={`text-xs font-semibold underline ${isStarterLimitReached ? 'text-red-700' : 'text-amber-700'}`}>
              Upgrade
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              className={`${fieldCls} w-full pl-8`}
              placeholder="Search by name, ID, category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className={fieldCls}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || categoryFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter('all'); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="ri-close-circle-line mr-0.5" />Clear
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <i className="ri-loader-4-line animate-spin text-xl" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <i className="ri-links-line text-2xl text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {search || categoryFilter !== 'all' ? 'No shared steps match your filters.' : 'No shared steps yet.'}
              </p>
              {!search && categoryFilter === 'all' && !isStarterLimitReached && (
                <button onClick={() => setShowCreateModal(true)} className={btnPrimary}>
                  <i className="ri-add-line" /> Create your first shared step
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                  {['ID', 'Name', 'Steps', 'Used by', 'Category', 'Tags', 'Ver.', ''].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '0.625rem 1rem',
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
                {filtered.map((ss, idx) => (
                  <tr
                    key={ss.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    {/* ID */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span className="text-[0.65rem] font-mono font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                        {ss.custom_id}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <p className="text-sm font-medium text-slate-800">{ss.name}</p>
                      {ss.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[280px]">{ss.description}</p>
                      )}
                    </td>

                    {/* Steps */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {ss.steps.length}
                      </span>
                    </td>

                    {/* Used by */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const count = liveUsageCounts[ss.id] ?? ss.usage_count;
                        if (count > 0) {
                          return (
                            <button
                              onClick={() => setBulkUpdateTarget(ss)}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
                            >
                              {count} TC{count !== 1 ? 's' : ''}
                            </button>
                          );
                        }
                        return <span className="text-xs text-slate-400">—</span>;
                      })()}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {ss.category ? (
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{ss.category}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Tags */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {ss.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {ss.tags.split(',').slice(0, 3).map(t => (
                            <span key={t} className="text-[0.65rem] text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    {/* Version */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span className="text-xs text-slate-400">v{ss.version}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setUsedByStep(ss)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="View usage"
                        >
                          <i className="ri-eye-line text-sm" />
                        </button>
                        <button
                          onClick={() => { setEditStep(ss); setShowCreateModal(true); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <i className="ri-pencil-line text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ss)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {showCreateModal && (
        <SharedStepModal
          projectId={projectId!}
          sharedStep={editStep}
          onClose={() => { setShowCreateModal(false); setEditStep(null); }}
          onSaved={() => {
            setShowCreateModal(false);
            setEditStep(null);
            queryClient.invalidateQueries({ queryKey: ['shared_steps', projectId] });
            showToast('success', editStep ? 'Shared step updated.' : 'Shared step created.');
          }}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          step={deleteTarget}
          usages={deleteUsages}
          onConfirm={handleDeleteConfirm}
          onConvertAndDelete={handleConvertAndDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={!!deletingId}
        />
      )}

      {/* Used-by panel */}
      {usedByStep && (
        <UsedByPanel
          step={usedByStep}
          projectId={projectId!}
          onClose={() => setUsedByStep(null)}
        />
      )}

      {/* Bulk update dialog */}
      {bulkUpdateTarget && (
        <BulkUpdateDialog
          step={bulkUpdateTarget}
          onClose={() => setBulkUpdateTarget(null)}
          onDone={() => {
            setBulkUpdateTarget(null);
            queryClient.invalidateQueries({ queryKey: ['tc_step_counts', projectId] });
            showToast('success', 'Test cases updated to latest version.');
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '0.625rem 1rem',
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: '#fff', borderRadius: '0.625rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          fontSize: '0.8125rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <i className={toast.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
