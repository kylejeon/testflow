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
  active: '#10B981',
  draft: '#6366F1',
  deprecated: '#94A3B8',
};

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{payload[0].name}</p>
      <p>{payload[0].value}개 ({Math.round(payload[0].payload.percent * 100)}%)</p>
    </div>
  );
}

export default function TCQualityAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'priority' | 'lifecycle'>('priority');

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    setLoading(true);
    try {
      // All TCs for this project
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

      // Automation rate
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
        automationRate, totalTCs: tcs.length, topFailedTCs,
      });
    } catch (e) {
      console.error('TCQualityAnalysis:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 text-[15px] font-semibold text-gray-900">
          <i className="ri-file-chart-line text-indigo-500" />
          TC Quality Analysis
        </div>
        <div className="p-4 h-[300px] animate-pulse bg-gray-50 rounded-lg m-4" />
      </div>
    );
  }

  if (!data) return null;

  const pieData = activeView === 'priority' ? data.priorityCounts : data.lifecycleCounts;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-file-chart-line text-indigo-500" />
          TC Quality Analysis
        </div>
        <span className="text-[11px] text-gray-400">{data.totalTCs} TCs</span>
      </div>

      <div className="p-4 space-y-4">
        {/* TC Growth chart */}
        <div>
          <div className="text-[12px] font-semibold text-gray-600 mb-2">TC 성장 추이 (최근 12주)</div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={data.growthData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} width={24} />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
              <Area dataKey="total" stroke="#6366F1" fill="#EEF2FF" fillOpacity={0.5} strokeWidth={2} name="누적 TC" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Priority / Lifecycle donut */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[12px] font-semibold text-gray-600">분포</div>
              <div className="flex border border-gray-200 rounded-md overflow-hidden text-[11px]">
                {(['priority', 'lifecycle'] as const).map(v => (
                  <button key={v} onClick={() => setActiveView(v)}
                    className={`px-2 py-0.5 cursor-pointer transition-colors ${activeView === v ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {v === 'priority' ? '우선순위' : '상태'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={42} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-semibold text-gray-900 ml-auto pl-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Automation rate */}
          <div>
            <div className="text-[12px] font-semibold text-gray-600 mb-2">자동화율</div>
            <div className="flex flex-col items-center justify-center h-[90px]">
              <div className="text-3xl font-bold text-gray-900">{data.automationRate}%</div>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${data.automationRate}%` }} />
              </div>
              <div className="text-[11px] text-gray-400 mt-1">{Math.round(data.totalTCs * data.automationRate / 100)} / {data.totalTCs} 자동화됨</div>
            </div>
          </div>
        </div>

        {/* Top failed TCs */}
        {data.topFailedTCs.length > 0 && (
          <div>
            <div className="text-[12px] font-semibold text-gray-600 mb-2">Top 실패 TC (최근 90일)</div>
            <div className="space-y-1.5">
              {data.topFailedTCs.map((tc, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="text-red-500 font-bold w-4">{i + 1}</span>
                  {tc.customId && <span className="text-gray-400 font-mono text-[11px]">{tc.customId}</span>}
                  <span className="flex-1 text-gray-700 truncate">{tc.title}</span>
                  <span className="text-red-600 font-semibold flex-shrink-0">{tc.failCount}회</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
