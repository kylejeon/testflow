import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { supabase } from '../../../lib/supabase';

interface QualityData {
  priorityCounts: { name: string; value: number; color: string }[];
  lifecycleCounts: { name: string; value: number; color: string }[];
  growthData: { date: string; total: number }[];
  automationRate: number;
  automatedCount: number;
  totalTCs: number;
  topFailedTCs: { title: string; customId: string; failCount: number }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#6366F1',
  low: '#94A3B8',
};

const LIFECYCLE_COLORS: Record<string, string> = {
  active: '#16A34A',
  draft: '#F59E0B',
  deprecated: '#9CA3AF',
};

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{payload[0].name}</p>
      <p>{payload[0].value} ({Math.round(payload[0].payload.percent * 100)}%)</p>
    </div>
  );
}

function LifecycleBars({ data, total }: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
}) {
  return (
    <div className="space-y-2.5">
      {data.map(lc => (
        <div key={lc.name}>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span className="capitalize">{lc.name}</span>
            <span className="font-semibold">{lc.value}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${total > 0 ? Math.max((lc.value / total) * 100, 2) : 0}%`,
                backgroundColor: LIFECYCLE_COLORS[lc.name.toLowerCase()] || lc.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AutomationGauge({ rate, automated, total }: {
  rate: number; automated: number; total: number;
}) {
  const clampedRate = Math.min(Math.max(rate, 0), 100);
  // Semi-circle: radius 40, half-circumference ≈ π * 40 ≈ 125.66
  const arcLength = 125.66;
  const filledLength = (clampedRate / 100) * arcLength;

  return (
    <div className="text-center">
      <div className="text-[11px] font-semibold text-gray-500 mb-2">AUTOMATED</div>
      <div className="relative w-[100px] h-[54px] mx-auto overflow-hidden">
        <svg viewBox="0 0 100 54" className="w-full h-full">
          {/* Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
          />
        </svg>
        <div className="absolute left-1/2 -translate-x-1/2 text-[18px] font-bold text-gray-900 leading-none" style={{ bottom: '2px' }}>
          {clampedRate.toFixed(0)}%
        </div>
      </div>
      <div className="text-[10px] text-gray-500 mt-4">
        {automated} / {total} TCs
      </div>
    </div>
  );
}

export default function TCQualityAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    setLoading(true);
    try {
      const { data: tcs } = await supabase
        .from('test_cases')
        .select('id, priority, lifecycle_status, is_automated, custom_id, title, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (!tcs?.length) { setData(null); setLoading(false); return; }

      // Priority counts
      const prioMap: Record<string, number> = {};
      tcs.forEach(tc => {
        const p = tc.priority || 'medium';
        prioMap[p] = (prioMap[p] || 0) + 1;
      });
      const priorityCounts = Object.entries(prioMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: PRIORITY_COLORS[name] || '#94A3B8',
      })).sort((a, b) => {
        const order = ['Critical', 'High', 'Medium', 'Low'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });

      // Lifecycle counts
      const lcMap: Record<string, number> = {};
      tcs.forEach(tc => {
        const lc = tc.lifecycle_status || 'active';
        lcMap[lc] = (lcMap[lc] || 0) + 1;
      });
      const lifecycleCounts = Object.entries(lcMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: LIFECYCLE_COLORS[name] || '#94A3B8',
      }));

      // Growth: weekly buckets (last 12 weeks)
      const now = new Date();
      const growthData: { date: string; total: number }[] = [];
      for (let w = 11; w >= 0; w--) {
        const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
        const weekEndISO = weekEnd.toISOString();
        const label = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const total = tcs.filter(tc => tc.created_at <= weekEndISO).length;
        growthData.push({ date: label, total });
      }

      // Automation
      const automated = tcs.filter(tc => tc.is_automated).length;
      const automationRate = Math.round((automated / tcs.length) * 100);

      // Top failed TCs (last 90 days)
      const tcIds = tcs.map(t => t.id);
      const { data: runs } = await supabase
        .from('test_runs').select('id').eq('project_id', projectId);
      const runIds = (runs ?? []).map(r => r.id);

      let topFailedTCs: { title: string; customId: string; failCount: number }[] = [];
      if (runIds.length > 0) {
        const { data: failedResults } = await supabase
          .from('test_results')
          .select('test_case_id')
          .in('run_id', runIds)
          .in('test_case_id', tcIds)
          .eq('status', 'failed')
          .gte('created_at', new Date(now.getTime() - 90 * 86400000).toISOString());

        const failCounts: Record<string, number> = {};
        (failedResults ?? []).forEach(r => {
          failCounts[r.test_case_id] = (failCounts[r.test_case_id] || 0) + 1;
        });

        const tcMap = new Map(tcs.map(t => [t.id, t]));
        topFailedTCs = Object.entries(failCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => ({
            title: tcMap.get(id)?.title ?? 'Unknown',
            customId: tcMap.get(id)?.custom_id ?? '',
            failCount: count,
          }));
      }

      setData({
        priorityCounts, lifecycleCounts, growthData,
        automationRate, automatedCount: automated,
        totalTCs: tcs.length, topFailedTCs,
      });
    } catch (e) {
      // intentional: silent — analytics widget; ErrorBoundary(section) handles render errors
      console.error('TCQualityAnalysis:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 text-[15px] font-semibold text-gray-900">
          <i className="ri-test-tube-fill text-emerald-500" />
          TC Quality & Growth
        </div>
        <div className="p-4 h-[300px] animate-pulse-bright rounded-lg m-4" />
      </div>
    );
  }

  if (!data) return null;

  const priorityPieData = data.priorityCounts;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-test-tube-fill text-emerald-500" />
          TC Quality & Growth
        </div>
        <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
          {data.totalTCs} Total
        </span>

      </div>

      <div className="px-5 py-4 space-y-4">
        {/* TC Growth chart */}
        <div>
          <div className="text-[12px] font-semibold text-gray-600 mb-2">TC Growth Trend (Last 12 Weeks)</div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={data.growthData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} width={24} />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
              <Area dataKey="total" stroke="#10B981" fill="#ECFDF5" fillOpacity={0.5} strokeWidth={2} name="Total TCs" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 3-col: Priority Donut | Lifecycle Bars | Automation Gauge */}
        <div className="grid grid-cols-3 gap-3">
          {/* Col 1: Priority Donut */}
          <div>
            <div className="text-[11px] font-semibold text-gray-500 mb-2 text-center tracking-wide">PRIORITY</div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative" style={{ width: 80, height: 80 }}>
                <ResponsiveContainer width={80} height={80}>
                  <PieChart>
                    <Pie data={priorityPieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} strokeWidth={0}>
                      {priorityPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[15px] font-bold text-gray-800">{data.totalTCs}</span>
                </div>
              </div>
              <div className="space-y-0.5 w-full">
                {priorityPieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-500 flex-1 truncate">{d.name}</span>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Col 2: Lifecycle Bars */}
          <div>
            <div className="text-[11px] font-semibold text-gray-500 mb-2 text-center tracking-wide">LIFECYCLE</div>
            <LifecycleBars data={data.lifecycleCounts} total={data.totalTCs} />
          </div>

          {/* Col 3: Automation Gauge */}
          <AutomationGauge
            rate={data.automationRate}
            automated={data.automatedCount}
            total={data.totalTCs}
          />
        </div>

        {/* Top failed TCs */}
        {data.topFailedTCs.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-[12px] font-semibold text-gray-600 mb-2">Top Failed TCs (Last 90 Days)</div>
            <div className="space-y-1.5">
              {data.topFailedTCs.map((tc, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="text-red-500 font-bold w-4">{i + 1}</span>
                  {tc.customId && <span className="text-gray-400 font-mono text-[11px]">{tc.customId}</span>}
                  <span className="flex-1 text-gray-700 truncate">{tc.title}</span>
                  <span className="text-red-600 font-semibold flex-shrink-0">{tc.failCount}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
