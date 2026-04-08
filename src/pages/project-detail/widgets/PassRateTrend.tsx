import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../../lib/supabase';

type PeriodFilter = '7d' | '14d' | '30d' | 'all';

interface DailyPoint {
  date: string;
  passRate: number;
  executionCount: number;
}

interface KPIData {
  passRate: number;
  passRateDelta: number;
  totalExecuted: number;
  executedDelta: number;
  failed: number;
  failedDelta: number;
  blocked: number;
  blockedDelta: number;
  dailyPoints: DailyPoint[];
}

function getPeriodDays(period: PeriodFilter): number {
  if (period === '7d') return 7;
  if (period === '14d') return 14;
  if (period === '30d') return 30;
  return 0; // all
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function KPICard({ label, value, delta, deltaPositive }: {
  label: string; value: string; delta: number; deltaPositive: boolean;
}) {
  const hasData = delta !== 0;
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3.5">
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-[.05em] mb-1.5">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {hasData ? (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-[3px] ${
          deltaPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
        }`}>
          {deltaPositive ? '▲' : '▼'} {Math.abs(delta)}{label.includes('Rate') ? '%' : ''}
        </span>
      ) : (
        <span className="text-[11px] text-gray-400">No comparison</span>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'passRate' ? `Pass Rate: ${p.value}%` : `Executions: ${p.value}`}
        </p>
      ))}
    </div>
  );
}

export default function PassRateTrend({ projectId, period }: { projectId: string; period: PeriodFilter }) {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, period]);

  async function load() {
    setLoading(true);
    try {
      const days = getPeriodDays(period);
      const now = new Date();
      const fromDate = days > 0
        ? new Date(now.getTime() - days * 86400000).toISOString()
        : new Date(0).toISOString();
      const prevFromDate = days > 0
        ? new Date(now.getTime() - days * 2 * 86400000).toISOString()
        : null;

      // Fetch all runs for this project
      const { data: runs } = await supabase
        .from('test_runs')
        .select('id')
        .eq('project_id', projectId);

      const runIds = (runs ?? []).map(r => r.id);
      if (runIds.length === 0) {
        setData(emptyData(days));
        setLoading(false);
        return;
      }

      // Current period results
      let q = supabase.from('test_results').select('status, created_at').in('run_id', runIds);
      if (days > 0) q = q.gte('created_at', fromDate);

      // Prev period results (for delta)
      let prevResults: any[] = [];
      if (prevFromDate && days > 0) {
        const { data: prev } = await supabase
          .from('test_results').select('status, created_at')
          .in('run_id', runIds)
          .gte('created_at', prevFromDate)
          .lt('created_at', fromDate);
        prevResults = prev ?? [];
      }

      const { data: results } = await q;
      const rows = results ?? [];

      // KPI stats
      const executed = rows.filter(r => r.status !== 'untested');
      const passed = executed.filter(r => r.status === 'passed').length;
      const failed = executed.filter(r => r.status === 'failed').length;
      const blocked = executed.filter(r => r.status === 'blocked').length;
      const totalExecuted = executed.length;
      const passRate = totalExecuted > 0 ? Math.round((passed / totalExecuted) * 100) : 0;

      // Prev KPI
      const prevExecuted = prevResults.filter(r => r.status !== 'untested');
      const prevPassed = prevExecuted.filter(r => r.status === 'passed').length;
      const prevFailed = prevExecuted.filter(r => r.status === 'failed').length;
      const prevBlocked = prevExecuted.filter(r => r.status === 'blocked').length;
      const prevTotal = prevExecuted.length;
      const prevRate = prevTotal > 0 ? Math.round((prevPassed / prevTotal) * 100) : 0;

      // Daily points
      const bucketCount = days > 0 ? days : 30;
      const dailyPoints: DailyPoint[] = [];

      if (days > 0) {
        for (let d = bucketCount - 1; d >= 0; d--) {
          const dayStart = new Date(now);
          dayStart.setDate(dayStart.getDate() - d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const startISO = dayStart.toISOString();
          const endISO = dayEnd.toISOString();

          const dayRows = rows.filter(r => r.created_at >= startISO && r.created_at <= endISO);
          const dayExec = dayRows.filter(r => r.status !== 'untested');
          const dayPassed = dayExec.filter(r => r.status === 'passed').length;
          dailyPoints.push({
            date: d === 0 ? 'Today' : formatShortDate(startISO),
            passRate: dayExec.length > 0 ? Math.round((dayPassed / dayExec.length) * 100) : 0,
            executionCount: dayExec.length,
          });
        }
      } else {
        // monthly buckets last 12 months
        for (let m = 11; m >= 0; m--) {
          const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
          const mEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999);
          const mRows = rows.filter(r => r.created_at >= mStart.toISOString() && r.created_at <= mEnd.toISOString());
          const mExec = mRows.filter(r => r.status !== 'untested');
          const mPassed = mExec.filter(r => r.status === 'passed').length;
          dailyPoints.push({
            date: mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            passRate: mExec.length > 0 ? Math.round((mPassed / mExec.length) * 100) : 0,
            executionCount: mExec.length,
          });
        }
      }

      setData({
        passRate,
        passRateDelta: prevTotal > 0 ? passRate - prevRate : 0,
        totalExecuted,
        executedDelta: totalExecuted - prevTotal,
        failed,
        failedDelta: failed - prevFailed,
        blocked,
        blockedDelta: blocked - prevBlocked,
        dailyPoints,
      });
    } catch (e) {
      console.error('PassRateTrend:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <i className="ri-line-chart-line text-indigo-500" />
            Pass Rate Trend
          </div>
        </div>
        <div className="p-5 h-[340px] animate-pulse-bright rounded-lg m-4" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-line-chart-line text-indigo-500" />
          Pass Rate Trend
        </div>
        <span className="text-[11px] text-gray-400">
          {period === 'all' ? 'All time' : `Last ${period}`}
        </span>
      </div>

      <div className="px-5 py-4">
        {/* KPI 4개 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <KPICard label="Overall Pass Rate" value={`${data.passRate}%`}
            delta={data.passRateDelta} deltaPositive={data.passRateDelta >= 0} />
          <KPICard label="Total Executed" value={data.totalExecuted.toLocaleString()}
            delta={data.executedDelta} deltaPositive={data.executedDelta >= 0} />
          <KPICard label="Failed" value={data.failed.toString()}
            delta={data.failedDelta} deltaPositive={data.failedDelta <= 0} />
          <KPICard label="Blocked" value={data.blocked.toString()}
            delta={data.blockedDelta} deltaPositive={data.blockedDelta <= 0} />
        </div>

        {/* Recharts ComposedChart */}
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data.dailyPoints} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <YAxis yAxisId="left" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickFormatter={v => `${v}%`} width={40} />
            <YAxis yAxisId="right" orientation="right"
              tick={{ fontSize: 11, fill: '#94A3B8' }} width={36} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="right" dataKey="executionCount" fill="#E2E8F0"
              opacity={0.5} radius={[2, 2, 0, 0]} />
            <Line yAxisId="left" dataKey="passRate" stroke="#6366F1"
              strokeWidth={2.5} dot={{ r: 3.5, fill: '#6366F1' }}
              activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function emptyData(days: number): KPIData {
  const points: DailyPoint[] = [];
  const count = days > 0 ? days : 12;
  for (let i = count - 1; i >= 0; i--) {
    points.push({ date: `Day ${i}`, passRate: 0, executionCount: 0 });
  }
  return {
    passRate: 0, passRateDelta: 0, totalExecuted: 0, executedDelta: 0,
    failed: 0, failedDelta: 0, blocked: 0, blockedDelta: 0, dailyPoints: points,
  };
}
