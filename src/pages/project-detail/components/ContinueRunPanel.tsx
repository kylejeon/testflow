import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Run {
  id: string;
  name: string;
  status: string;
  test_case_ids: string[];
  milestone_id: string | null;
  milestoneName: string | null;
  updated_at: string;
  created_at: string;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  total: number;
  lastActivity: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ContinueRunPanel({ isOpen, onClose, projectId }: Props) {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRuns();
      setSelectedRunId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const { data: runsData, error: runsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', projectId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (runsError) {
        console.error('[ContinueRunPanel] fetchRuns error:', runsError);
        setRuns([]);
        setLoading(false);
        return;
      }

      if (!runsData || runsData.length === 0) {
        setRuns([]);
        setLoading(false);
        return;
      }

      // Fetch milestones
      const milestoneIds = [...new Set(runsData.map(r => r.milestone_id).filter(Boolean))];
      let milestoneMap = new Map<string, string>();
      if (milestoneIds.length > 0) {
        const { data: milestones } = await supabase
          .from('milestones')
          .select('id, name')
          .in('id', milestoneIds);
        (milestones || []).forEach(m => milestoneMap.set(m.id, m.name));
      }

      // Fetch progress for each run
      const runsWithProgress = await Promise.all(
        runsData.map(async (run) => {
          const { data: results } = await supabase
            .from('test_results')
            .select('test_case_id, status, created_at')
            .eq('run_id', run.id)
            .order('created_at', { ascending: false });

          const statusMap = new Map<string, string>();
          let lastActivity = run.updated_at || run.created_at;
          (results || []).forEach(r => {
            if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
          });
          if (results && results.length > 0) lastActivity = results[0].created_at;

          let passed = 0, failed = 0, blocked = 0, retest = 0, untested = 0;
          const tcIds: string[] = run.test_case_ids || [];
          tcIds.forEach((tcId: string) => {
            const s = statusMap.get(tcId) || 'untested';
            if (s === 'passed') passed++;
            else if (s === 'failed') failed++;
            else if (s === 'blocked') blocked++;
            else if (s === 'retest') retest++;
            else untested++;
          });

          return {
            ...run,
            passed,
            failed,
            blocked,
            retest,
            untested,
            total: tcIds.length,
            lastActivity,
            milestoneName: run.milestone_id ? milestoneMap.get(run.milestone_id) || null : null,
          };
        })
      );

      // Sort: in_progress first, then by last activity
      const sorted = runsWithProgress.sort((a, b) => {
        const priority = (s: string) => s === 'in_progress' ? 0 : s === 'paused' ? 1 : s === 'under_review' ? 2 : 3;
        if (priority(a.status) !== priority(b.status)) return priority(a.status) - priority(b.status);
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      setRuns(sorted);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterFocusMode = () => {
    if (!selectedRunId) return;
    navigate(`/projects/${projectId}/runs/${selectedRunId}?focus=true`);
    onClose();
  };

  const statusLabel = (s: string) => {
    if (s === 'in_progress') return { label: 'In Progress', cls: 'bg-indigo-500/20 text-indigo-300' };
    if (s === 'paused') return { label: 'Paused', cls: 'bg-yellow-500/20 text-yellow-300' };
    if (s === 'under_review') return { label: 'Under Review', cls: 'bg-purple-500/20 text-purple-300' };
    return { label: 'New', cls: 'bg-slate-500/20 text-slate-400' };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 400,
          background: 'rgba(15,23,42,0.98)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          animation: 'slideInFromRight 0.25s ease-out',
          color: '#F1F5F9',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <i className="ri-play-circle-line text-indigo-400 text-sm"></i>
              </div>
              <h2 className="text-sm font-semibold text-white">Continue Run</h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          </div>
          <p className="text-xs text-slate-400">Select an in-progress run and resume testing in Focus Mode.</p>
        </div>

        {/* Run list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <i className="ri-loader-4-line animate-spin text-xl text-indigo-500" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
                <i className="ri-play-circle-line text-2xl text-slate-500"></i>
              </div>
              <p className="text-sm font-medium text-slate-300 mb-1">No runs in progress</p>
              <p className="text-xs text-slate-500 mb-4">Start a new run to begin testing.</p>
              <button
                onClick={() => { navigate(`/projects/${projectId}/runs`); onClose(); }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Start New Run
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map(run => {
                const completed = run.passed + run.failed + run.blocked + run.retest;
                const remaining = run.untested;
                const total = run.total;
                const pct = total > 0 ? {
                  passed: Math.round((run.passed / total) * 100),
                  failed: Math.round((run.failed / total) * 100),
                  blocked: Math.round((run.blocked / total) * 100),
                  retest: Math.round((run.retest / total) * 100),
                  untested: Math.round((run.untested / total) * 100),
                } : { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 100 };
                const badge = statusLabel(run.status);
                const isSelected = selectedRunId === run.id;

                return (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRunId(isSelected ? null : run.id)}
                    className="rounded-xl p-3.5 cursor-pointer transition-all"
                    style={{
                      background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{run.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {run.milestoneName && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                              {run.milestoneName}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                          <i className="ri-check-line text-white text-xs"></i>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="h-1.5 rounded-full overflow-hidden flex bg-white/[0.06] mb-2">
                        {pct.passed > 0 && <div className="h-full bg-green-500" style={{ width: `${pct.passed}%` }} />}
                        {pct.failed > 0 && <div className="h-full bg-red-500" style={{ width: `${pct.failed}%` }} />}
                        {pct.blocked > 0 && <div className="h-full bg-yellow-500" style={{ width: `${pct.blocked}%` }} />}
                        {pct.retest > 0 && <div className="h-full bg-orange-500" style={{ width: `${pct.retest}%` }} />}
                        {pct.untested > 0 && <div className="h-full bg-white/10" style={{ width: `${pct.untested}%` }} />}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {completed}/{total} completed
                        {remaining > 0 && (
                          <span className="text-indigo-400 ml-1">· {remaining} remaining</span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {getRelativeTime(run.lastActivity)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {runs.length >= 10 && (
                <button
                  onClick={() => { navigate(`/projects/${projectId}/runs`); onClose(); }}
                  className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-2 transition-colors"
                >
                  View all runs →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.06] flex-shrink-0 space-y-2">
          <button
            onClick={handleEnterFocusMode}
            disabled={!selectedRunId}
            className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <i className="ri-focus-3-line"></i>
            Enter Focus Mode
          </button>
          <div className="text-center">
            <button
              onClick={() => { navigate(`/projects/${projectId}/runs`); onClose(); }}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Or start a new run →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
