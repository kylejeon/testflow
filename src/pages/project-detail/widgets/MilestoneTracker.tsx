import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';

interface MilestoneTrackerProps {
  projectId: string;
  milestones: any[];
}

interface MilestoneWithRisk {
  id: string;
  name: string;
  progress: number;
  status: string;
  riskStatus: 'on_track' | 'at_risk' | 'overdue';
  daysRemaining: number;
  endDate: Date | null;
}

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

function differenceInDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function computeRisk(milestone: any): MilestoneWithRisk {
  const now = new Date();
  const endDate = milestone.end_date ? new Date(milestone.end_date) : null;
  const startDate = milestone.start_date ? new Date(milestone.start_date) : null;

  const daysRemaining = endDate ? differenceInDays(endDate, now) : 999;
  const progress = milestone.progress ?? 0;

  let riskStatus: 'on_track' | 'at_risk' | 'overdue';
  if (daysRemaining < 0 && progress < 100) {
    riskStatus = 'overdue';
  } else if (daysRemaining < 7 && progress < 70) {
    riskStatus = 'at_risk';
  } else if (startDate && endDate) {
    const totalDays = differenceInDays(endDate, startDate);
    const elapsedDays = differenceInDays(now, startDate);
    const expectedProgress = totalDays > 0 ? Math.min((elapsedDays / totalDays) * 100, 100) : 0;
    riskStatus = progress < expectedProgress * 0.7 ? 'at_risk' : 'on_track';
  } else {
    riskStatus = 'on_track';
  }

  return {
    id: milestone.id,
    name: milestone.name,
    progress,
    status: milestone.status,
    riskStatus,
    daysRemaining,
    endDate,
  };
}

function buildBurndown(totalTCs: number, startDate: Date, endDate: Date, dailyExecuted: Record<string, number>): BurndownPoint[] {
  const points: BurndownPoint[] = [];
  const totalDays = differenceInDays(endDate, startDate);
  if (totalDays <= 0) return points;

  const now = new Date();
  let remaining = totalTCs;

  for (let d = 0; d <= Math.min(totalDays, differenceInDays(now, startDate)); d++) {
    const day = new Date(startDate.getTime() + d * 86400000);
    const dayStr = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayKey = day.toISOString().slice(0, 10);
    const ideal = Math.round(totalTCs * (1 - d / totalDays));
    remaining -= (dailyExecuted[dayKey] ?? 0);
    points.push({ date: dayStr, ideal, actual: Math.max(0, remaining) });
  }
  return points;
}

export default function MilestoneTracker({ projectId, milestones }: MilestoneTrackerProps) {
  const [burndownData, setBurndownData] = useState<BurndownPoint[]>([]);
  const [primaryMilestone, setPrimaryMilestone] = useState<MilestoneWithRisk | null>(null);
  const [burndownLoading, setBurndownLoading] = useState(false);

  // Parent 마일스톤만 표시 (sub milestone 제외)
  const parentMilestones = milestones.filter(m => !m.parent_milestone_id);
  const activeMilestones = parentMilestones.filter(m =>
    ['started', 'in_progress', 'upcoming', 'active', 'open'].includes(m.status)
  );
  const milestoneList: MilestoneWithRisk[] = (activeMilestones.length > 0 ? activeMilestones : parentMilestones)
    .map(computeRisk);

  // Load burndown for most advanced active milestone
  useEffect(() => {
    const primary = milestoneList[0] ?? null;
    setPrimaryMilestone(primary);

    if (!primary || !primary.endDate) return;
    const ms = milestones.find(m => m.id === primary.id);

    const endDate = primary.endDate;
    const startDate = ms?.start_date
      ? new Date(ms.start_date)
      : ms?.due_date
        ? new Date(new Date(ms.due_date).getTime() - 30 * 86400000)
        : new Date(endDate.getTime() - 30 * 86400000);

    // Sub milestone IDs 수집 (roll-up을 위해 sub runs도 포함)
    const subIds = milestones.filter(m => m.parent_milestone_id === primary.id).map((m: any) => m.id);
    loadBurndown(primary.id, startDate, endDate, subIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, milestones.length]);

  async function loadBurndown(milestoneId: string, startDate: Date, endDate: Date, subMilestoneIds: string[] = []) {
    setBurndownLoading(true);
    try {
      // Get runs for this milestone + sub milestones (roll-up)
      const allMilestoneIds = [milestoneId, ...subMilestoneIds];
      const { data: runs } = await supabase
        .from('test_runs')
        .select('id, test_case_ids')
        .eq('project_id', projectId)
        .in('milestone_id', allMilestoneIds);

      if (!runs?.length) { setBurndownData([]); return; }

      const runIds = runs.map(r => r.id);
      const totalTCs = [...new Set(runs.flatMap(r => (r.test_case_ids as string[]) ?? []))].length;

      // Burndown counts only "passed" — remaining = TCs not yet passed
      // This aligns with milestone progress (which reflects pass completion, not just execution)
      const { data: results } = await supabase
        .from('test_results')
        .select('test_case_id, created_at')
        .in('run_id', runIds)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'passed')
        .order('created_at', { ascending: true });

      // Build daily passed map (first pass per TC only)
      const seenTC = new Set<string>();
      const dailyExecuted: Record<string, number> = {};
      (results ?? []).forEach(r => {
        if (!r.test_case_id || seenTC.has(r.test_case_id)) return;
        seenTC.add(r.test_case_id);
        const day = r.created_at.slice(0, 10);
        dailyExecuted[day] = (dailyExecuted[day] ?? 0) + 1;
      });

      setBurndownData(buildBurndown(totalTCs, startDate, endDate, dailyExecuted));
    } finally {
      setBurndownLoading(false);
    }
  }

  if (milestones.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <i className="ri-flag-2-fill text-amber-500" />
            Milestone Tracker
          </div>
        </div>
        <div className="p-8 text-center text-gray-400 text-sm">
          <i className="ri-flag-2-line text-3xl block mb-2 text-gray-300" />
          No milestones yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-flag-2-fill text-amber-500" />
          Milestone Tracker
        </div>
        <span className="text-[11px] text-gray-400">{activeMilestones.length} active milestone{activeMilestones.length !== 1 ? 's' : ''} · {milestones.filter((m: any) => !m.parent_milestone_id).length} total</span>
      </div>

      <div className="px-5 py-4">
        {/* Burndown chart for primary milestone — shown first per mockup */}
        {primaryMilestone && (
          <div className="mb-4">
            <div className="text-[12px] font-semibold text-gray-600 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <i className="ri-bar-chart-line text-gray-400" />
                Burndown — {primaryMilestone.name}
              </span>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 border-t border-dashed border-gray-400" />
                  Ideal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 border-t-2 border-indigo-500" />
                  Actual
                </span>
              </div>
            </div>
            {burndownLoading ? (
              <div className="h-[180px] bg-gray-50 rounded-lg animate-pulse" />
            ) : burndownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={burndownData} margin={{ top: 8, right: 12, bottom: 4, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  />
                  <Area dataKey="ideal" stroke="#94A3B8" strokeDasharray="6 3"
                    fill="none" strokeWidth={1.5} name="Ideal" />
                  <Area dataKey="actual" stroke="#6366F1" fill="#EEF2FF"
                    fillOpacity={0.4} strokeWidth={2.5} name="Remaining TCs"
                    dot={{ r: 3, fill: '#6366F1' }} name="Not Passed" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[80px] flex items-center justify-center text-sm text-gray-400">
                Not enough data for burndown chart
              </div>
            )}
          </div>
        )}

        {/* Milestone cards below the burndown */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {milestoneList.map(ms => (
            <div key={ms.id} className="min-w-[180px] border border-gray-200 rounded-lg px-3.5 py-3 flex-shrink-0">
              <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${
                ms.riskStatus === 'on_track' ? 'bg-emerald-50 text-emerald-600' :
                ms.riskStatus === 'at_risk' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  ms.riskStatus === 'on_track' ? 'bg-emerald-500' :
                  ms.riskStatus === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                {ms.riskStatus === 'on_track' ? 'On Track' : ms.riskStatus === 'at_risk' ? 'At Risk' : 'Overdue'}
              </div>
              <div className="text-[13px] font-semibold text-gray-900 mb-2 leading-tight line-clamp-2">
                {ms.name}
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full transition-all ${
                  ms.riskStatus === 'on_track' ? 'bg-emerald-500' :
                  ms.riskStatus === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                }`} style={{ width: `${ms.progress}%` }} />
              </div>
              <div className={`text-[11px] font-medium ${
                ms.riskStatus === 'overdue' ? 'text-red-500' : 'text-gray-500'
              }`}>
                {ms.progress}%
                {ms.endDate && (
                  <span>
                    {' · '}{ms.daysRemaining >= 0 ? `D-${ms.daysRemaining}` : `D+${Math.abs(ms.daysRemaining)}`}
                    {' '}({ms.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
