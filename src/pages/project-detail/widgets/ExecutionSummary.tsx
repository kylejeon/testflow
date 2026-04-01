import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

interface RunItem {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  total: number;
}

interface SummaryData {
  active: number;
  completed: number;
  paused: number;
  totalPassed: number;
  totalFailed: number;
  totalBlocked: number;
  totalUntested: number;
  runs: RunItem[];
  totalRuns: number;
}

function StatusDot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

function StackedBar({ passed, failed, blocked, untested }: { passed: number; failed: number; blocked: number; untested: number }) {
  const total = passed + failed + blocked + untested;
  if (total === 0) return <div className="h-2 bg-gray-100 rounded-full" />;
  return (
    <>
      <div className="h-2 rounded-full flex overflow-hidden">
        <div style={{ width: `${(passed / total) * 100}%` }} className="bg-green-600" />
        <div style={{ width: `${(failed / total) * 100}%` }} className="bg-red-600" />
        <div style={{ width: `${(blocked / total) * 100}%` }} className="bg-amber-500" />
        <div style={{ width: `${(untested / total) * 100}%` }} className="bg-gray-200" />
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-gray-500"><StatusDot color="#16A34A" /> Passed {passed}</span>
        <span className="flex items-center gap-1 text-[11px] text-gray-500"><StatusDot color="#DC2626" /> Failed {failed}</span>
        <span className="flex items-center gap-1 text-[11px] text-gray-500"><StatusDot color="#D97706" /> Blocked {blocked}</span>
        <span className="flex items-center gap-1 text-[11px] text-gray-500"><StatusDot color="#CBD5E1" /> Untested {untested}</span>
      </div>
    </>
  );
}

function MiniDonut({ passed, failed, blocked, untested }: {
  passed: number; failed: number; blocked: number; untested: number;
}) {
  const total = passed + failed + blocked + untested;
  if (total === 0) return <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />;
  const pPct = (passed / total) * 100;
  const fPct = (failed / total) * 100;
  const bPct = (blocked / total) * 100;
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: `conic-gradient(
          #16A34A 0% ${pPct}%,
          #DC2626 ${pPct}% ${pPct + fPct}%,
          #D97706 ${pPct + fPct}% ${pPct + fPct + bPct}%,
          #E2E8F0 ${pPct + fPct + bPct}% 100%
        )`,
      }}
    >
      <div className="w-[18px] h-[18px] rounded-full bg-white" />
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Not Started',
  in_progress: 'In Progress',
  paused: 'Paused',
  under_review: 'Under Review',
  completed: 'Completed',
};

export default function ExecutionSummary({ projectId }: { projectId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    setLoading(true);
    try {
      const { data: runs } = await supabase
        .from('test_runs')
        .select('id, name, status, test_case_ids')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!runs?.length) {
        setData({ active: 0, completed: 0, paused: 0, totalPassed: 0, totalFailed: 0, totalBlocked: 0, totalUntested: 0, runs: [], totalRuns: 0 });
        setLoading(false);
        return;
      }

      const runIds = runs.map(r => r.id);
      const { data: results } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status')
        .in('run_id', runIds)
        .order('created_at', { ascending: false });

      const byRun: Record<string, { passed: number; failed: number; blocked: number; seenTCs: Set<string> }> = {};
      (results ?? []).forEach(r => {
        if (!byRun[r.run_id]) byRun[r.run_id] = { passed: 0, failed: 0, blocked: 0, seenTCs: new Set() };
        if (byRun[r.run_id].seenTCs.has(r.test_case_id)) return;
        byRun[r.run_id].seenTCs.add(r.test_case_id);
        if (r.status === 'passed') byRun[r.run_id].passed++;
        else if (r.status === 'failed') byRun[r.run_id].failed++;
        else if (r.status === 'blocked') byRun[r.run_id].blocked++;
      });

      const runItems: RunItem[] = runs.map(r => {
        const counts = byRun[r.id];
        const tcIds = (r.test_case_ids as string[] | null) ?? [];
        const passed = counts?.passed ?? 0;
        const failed = counts?.failed ?? 0;
        const blocked = counts?.blocked ?? 0;
        const tested = counts?.seenTCs.size ?? 0;
        const total = tcIds.length || tested;
        const untested = Math.max(0, total - tested);
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          statusLabel: STATUS_LABEL[r.status] ?? r.status,
          passed, failed, blocked, untested, total,
        };
      });

      const activeStatuses = ['new', 'in_progress'];
      const pausedStatuses = ['paused', 'under_review'];

      setData({
        active: runs.filter(r => activeStatuses.includes(r.status)).length,
        completed: runs.filter(r => r.status === 'completed').length,
        paused: runs.filter(r => pausedStatuses.includes(r.status)).length,
        totalPassed: runItems.reduce((s, r) => s + r.passed, 0),
        totalFailed: runItems.reduce((s, r) => s + r.failed, 0),
        totalBlocked: runItems.reduce((s, r) => s + r.blocked, 0),
        totalUntested: runItems.reduce((s, r) => s + r.untested, 0),
        runs: runItems.slice(0, 5),
        totalRuns: runs.length,
      });
    } catch (e) {
      console.error('ExecutionSummary:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 text-[15px] font-semibold text-gray-900">
          <i className="ri-play-circle-line text-emerald-500" />
          Run Status
        </div>
        <div className="px-5 py-4 space-y-3 animate-pulse">
          <div className="h-10 bg-gray-50 rounded-lg" />
          <div className="h-4 bg-gray-50 rounded" />
          <div className="h-20 bg-gray-50 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-play-circle-line text-emerald-500" />
          Run Status
        </div>
        <span className="text-[11px] text-gray-400">{data.totalRuns} runs</span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4 flex-1">
        {/* Run counts */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Active',    value: data.active,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Completed', value: data.completed, color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
            { label: 'Paused',    value: data.paused,    color: 'text-amber-500',   bg: 'bg-amber-50'   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-2.5 text-center`}>
              <div className={`text-[16px] font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Overall stacked bar */}
        <StackedBar
          passed={data.totalPassed} failed={data.totalFailed}
          blocked={data.totalBlocked} untested={data.totalUntested}
        />

        {/* Run list with MiniDonut */}
        <div className="space-y-2 flex-1">
          {data.runs.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-4">No runs yet</div>
          ) : (
            data.runs.map(run => (
              <div key={run.id} className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-b-0">
                <MiniDonut
                  passed={run.passed}
                  failed={run.failed}
                  blocked={run.blocked}
                  untested={run.untested}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-gray-800 truncate">{run.name}</div>
                  <div className="text-[11px] text-gray-400">{run.statusLabel}</div>
                </div>
                <span className="text-[11px] text-gray-500 flex-shrink-0">
                  {run.passed + run.failed + run.blocked}/{run.total} TC
                </span>
              </div>
            ))
          )}
        </div>

        {/* View all link */}
        <Link
          to={`/projects/${projectId}/runs`}
          className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700 text-center block py-2"
        >
          View all runs →
        </Link>
      </div>
    </div>
  );
}
