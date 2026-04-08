import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/Toast';
import type { Requirement } from '../../../types/rtm';
import { ModalShell } from '../../../components/ModalShell';

const fieldCls = `w-full border border-slate-200 rounded-lg text-sm text-slate-700 px-3 py-2 bg-white focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-colors`;

function statusIcon(status: string | undefined) {
  if (status === 'passed') return <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"><i className="ri-check-line text-white text-[0.55rem]" /></span>;
  if (status === 'failed') return <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"><i className="ri-close-line text-white text-[0.55rem]" /></span>;
  if (status === 'blocked') return <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"><i className="ri-forbid-line text-white text-[0.55rem]" /></span>;
  return <span className="w-4 h-4 rounded-full border-2 border-slate-200 bg-white" />;
}

interface TC {
  id: string;
  custom_id: string;
  title: string;
  priority: string;
  folder: string | null;
  latest_status?: string;
}

interface Props {
  projectId: string;
  requirement: Requirement;
  onClose: () => void;
  onLinked: () => void;
}

export default function LinkTCModal({ projectId, requirement, onClose, onLinked }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());

  // Fetch all TCs for project
  const { data: allTCs = [], isLoading: loadingTCs } = useQuery({
    queryKey: ['tcList', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('id, custom_id, title, priority, folder')
        .eq('project_id', projectId)
        .order('custom_id', { ascending: true });
      if (error) throw error;
      return (data || []) as TC[];
    },
    staleTime: 60_000,
  });

  // Fetch existing links for this requirement
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['reqLinks', requirement.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirement_tc_links')
        .select('test_case_id')
        .eq('requirement_id', requirement.id);
      if (error) throw error;
      return (data || []).map((l) => l.test_case_id);
    },
    staleTime: 30_000,
  });

  // Init linkedIds from existing
  useEffect(() => {
    setLinkedIds(new Set(existingLinks));
  }, [existingLinks.join(',')]);

  // Latest result per TC
  const { data: resultMap = {} } = useQuery({
    queryKey: ['tcLatestResults', projectId],
    queryFn: async () => {
      const tcIds = allTCs.map((tc) => tc.id);
      if (tcIds.length === 0) return {};
      const { data } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at')
        .in('test_case_id', tcIds)
        .order('created_at', { ascending: false });
      const map: Record<string, string> = {};
      for (const r of data || []) {
        if (!map[r.test_case_id]) map[r.test_case_id] = r.status;
      }
      return map;
    },
    enabled: allTCs.length > 0,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!search) return allTCs;
    const q = search.toLowerCase();
    return allTCs.filter(
      (tc) => tc.title.toLowerCase().includes(q) || tc.custom_id.toLowerCase().includes(q)
    );
  }, [allTCs, search]);

  const toggle = (id: string) => {
    setLinkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const prevSet = new Set(existingLinks);
      const toAdd = [...linkedIds].filter((id) => !prevSet.has(id));
      const toRemove = [...prevSet].filter((id) => !linkedIds.has(id));

      if (toAdd.length > 0) {
        const { error } = await supabase.from('requirement_tc_links').insert(
          toAdd.map((tcId) => ({ requirement_id: requirement.id, test_case_id: tcId, linked_by: user.id }))
        );
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('requirement_tc_links')
          .delete()
          .eq('requirement_id', requirement.id)
          .in('test_case_id', toRemove);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['reqLinks', requirement.id] });
      onLinked();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to save links.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const linkedCount = linkedIds.size;
  const changed =
    linkedIds.size !== existingLinks.length ||
    [...linkedIds].some((id) => !existingLinks.includes(id));

  return (
    <ModalShell onClose={onClose}>
      <div
        style={{
          width: '100%',
          maxWidth: '40rem',
          maxHeight: '80vh',
          background: '#fff',
          borderRadius: '0.875rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
              Link Test Cases
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.125rem' }}>
              {requirement.custom_id}: {requirement.title}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={fieldCls}
              style={{ paddingLeft: '2.25rem' }}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{filtered.length} test cases</span>
            <span className="text-xs font-semibold text-indigo-600">{linkedCount} linked</span>
          </div>
        </div>

        {/* TC List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingTCs ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <i className="ri-loader-4-line animate-spin" /> Loading test cases...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No test cases found.</div>
          ) : (
            filtered.map((tc) => {
              const isLinked = linkedIds.has(tc.id);
              const latestStatus = resultMap[tc.id];
              return (
                <label
                  key={tc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 1.25rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F8FAFC',
                    background: isLinked ? '#F5F3FF' : '#fff',
                    transition: 'background 0.1s',
                  }}
                  className="hover:bg-indigo-50"
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={() => toggle(tc.id)}
                    className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {statusIcon(latestStatus)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="text-xs font-mono text-indigo-600 font-semibold flex-shrink-0">{tc.custom_id}</span>
                      <span className="text-sm text-slate-700 truncate">{tc.title}</span>
                    </div>
                    {tc.folder && (
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{tc.folder}</div>
                    )}
                  </div>
                  <span className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                    tc.priority === 'critical' ? 'bg-red-100 text-red-600' :
                    tc.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                    tc.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {tc.priority}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              onClick={() => setLinkedIds(new Set())}
            >
              Unlink all
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.4375rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer' }}
              className="hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !changed}
              style={{
                padding: '0.4375rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#fff',
                background: saving || !changed ? '#A5B4FC' : '#6366F1',
                border: 'none',
                cursor: saving || !changed ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              {saving && <i className="ri-loader-4-line animate-spin" />}
              Save ({linkedCount} linked)
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
