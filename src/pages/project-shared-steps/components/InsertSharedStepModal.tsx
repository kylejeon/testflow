import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { SharedTestStep } from '../../../types/shared-steps';

interface Props {
  projectId: string;
  onInsert: (step: SharedTestStep) => void;
  onClose: () => void;
}

export default function InsertSharedStepModal({ projectId, onInsert, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sharedSteps = [], isLoading } = useQuery({
    queryKey: ['shared_steps', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_steps')
        .select('*')
        .eq('project_id', projectId)
        .order('custom_id', { ascending: true });
      if (error) throw error;
      return (data || []) as SharedTestStep[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const filtered = sharedSteps.filter(ss => {
    const q = search.toLowerCase();
    return (
      ss.name.toLowerCase().includes(q) ||
      ss.custom_id.toLowerCase().includes(q) ||
      (ss.category || '').toLowerCase().includes(q) ||
      (ss.tags || '').toLowerCase().includes(q)
    );
  });

  const selected = sharedSteps.find(s => s.id === selectedId) || null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 1099, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px',
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: '80vh',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 0.875rem', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="ri-links-line text-indigo-500 text-lg" />
              <h2 className="text-sm font-semibold text-slate-800">Insert Shared Step</h2>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-colors"
              placeholder="Search by name, ID, category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <i className="ri-loader-4-line animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <i className="ri-links-line text-3xl" />
              {search ? 'No shared steps match your search.' : 'No shared steps in this project yet.'}
            </div>
          ) : (
            <div className="p-2">
              {filtered.map(ss => {
                const isSelected = ss.id === selectedId;
                return (
                  <button
                    key={ss.id}
                    onClick={() => setSelectedId(isSelected ? null : ss.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 border transition-all ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[0.65rem] font-mono font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {ss.custom_id}
                        </span>
                        <span className="text-sm font-medium text-slate-800 truncate">{ss.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs text-slate-400">
                        <span>{ss.steps.length} step{ss.steps.length !== 1 ? 's' : ''}</span>
                        {ss.usage_count > 0 && (
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">×{ss.usage_count}</span>
                        )}
                      </div>
                    </div>
                    {(ss.category || ss.tags) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {ss.category && (
                          <span className="text-[0.65rem] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {ss.category}
                          </span>
                        )}
                        {ss.tags && ss.tags.split(',').slice(0, 3).map(t => (
                          <span key={t} className="text-[0.65rem] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {isSelected && ss.steps.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {ss.steps.slice(0, 4).map((step, i) => (
                          <div key={i} className="flex gap-2 text-xs text-slate-600">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[0.6rem] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="truncate">{step.step}</span>
                          </div>
                        ))}
                        {ss.steps.length > 4 && (
                          <p className="text-xs text-slate-400 pl-6">+{ss.steps.length - 4} more steps…</p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #F1F5F9', flexShrink: 0 }} className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onInsert(selected)}
            disabled={!selected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="ri-links-line" />
            Insert
          </button>
        </div>
      </div>
    </>
  );
}
