import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface TeamMember {
  name: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
  passRate: number;
  avgResponse: string;
  avgResponseMs: number;
  dailyActivity: number[]; // last 7 days, index 0 = oldest
}

type PeriodFilter = '7d' | '14d' | '30d' | 'all';

function getPeriodMs(period: PeriodFilter): number {
  if (period === '7d') return 7 * 86400000;
  if (period === '14d') return 14 * 86400000;
  if (period === '30d') return 30 * 86400000;
  return 0;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

const RANK_COLORS = ['text-amber-500', 'text-gray-400', 'text-orange-400'];

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-[20px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[7px] rounded-sm flex-shrink-0"
          style={{
            height: `${Math.max((v / max) * 20, v > 0 ? 3 : 0)}px`,
            backgroundColor: v === 0 ? '#E2E8F0' : '#818CF8',
          }}
        />
      ))}
    </div>
  );
}

function AvgResponseColor(ms: number): string {
  const h = ms / 3600000;
  if (h < 1) return 'text-emerald-600';
  if (h < 2) return 'text-amber-500';
  return 'text-red-500';
}

export default function TeamPerformance({ projectId, period }: { projectId: string; period: PeriodFilter }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, period]);

  async function load() {
    setLoading(true);
    try {
      const ms = getPeriodMs(period);
      const fromDate = ms > 0
        ? new Date(Date.now() - ms).toISOString()
        : new Date(0).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

      const { data: runs } = await supabase
        .from('test_runs').select('id').eq('project_id', projectId);

      if (!runs?.length) { setMembers([]); setLoading(false); return; }

      const runIds = runs.map(r => r.id);
      let q = supabase
        .from('test_results')
        .select('author, status, created_at')
        .in('run_id', runIds);
      if (ms > 0) q = q.gte('created_at', fromDate);

      const { data: results } = await q;
      if (!results?.length) { setMembers([]); setLoading(false); return; }

      // Build 7-day date keys
      const dayKeys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        dayKeys.push(d.toISOString().slice(0, 10));
      }

      // Aggregate by author
      const byAuthor: Record<string, {
        passed: number; failed: number; blocked: number; total: number;
        daily: Record<string, number>; timestamps: number[];
      }> = {};

      results.forEach(r => {
        const name = r.author || 'No assigned member';
        if (!byAuthor[name]) byAuthor[name] = { passed: 0, failed: 0, blocked: 0, total: 0, daily: {}, timestamps: [] };
        if (r.status !== 'untested') {
          byAuthor[name].total++;
          byAuthor[name].timestamps.push(new Date(r.created_at).getTime());
          if (r.status === 'passed') byAuthor[name].passed++;
          else if (r.status === 'failed') byAuthor[name].failed++;
          else if (r.status === 'blocked') byAuthor[name].blocked++;

          const dayKey = r.created_at.slice(0, 10);
          if (new Date(r.created_at) >= sevenDaysAgo) {
            byAuthor[name].daily[dayKey] = (byAuthor[name].daily[dayKey] ?? 0) + 1;
          }
        }
      });

      const list: TeamMember[] = Object.entries(byAuthor)
        .filter(([, s]) => s.total > 0)
        .map(([name, s]) => {
          // Avg response = avg gap between consecutive executions
          let avgResponseMs = 0;
          let avgResponseLabel = '—';
          if (s.timestamps.length >= 2) {
            const sorted = s.timestamps.slice().sort((a, b) => a - b);
            let totalGap = 0;
            for (let i = 1; i < sorted.length; i++) totalGap += sorted[i] - sorted[i - 1];
            avgResponseMs = totalGap / (sorted.length - 1);
            const h = avgResponseMs / 3600000;
            avgResponseLabel = h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
          }
          return {
            name,
            passed: s.passed,
            failed: s.failed,
            blocked: s.blocked,
            total: s.total,
            passRate: Math.round((s.passed / s.total) * 100),
            avgResponse: avgResponseLabel,
            avgResponseMs,
            dailyActivity: dayKeys.map(k => s.daily[k] ?? 0),
          };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setMembers(list);
    } catch (e) {
      console.error('TeamPerformance:', e);
    } finally {
      setLoading(false);
    }
  }

  const maxTotal = Math.max(...members.map(m => m.total), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-team-fill text-violet-500" />
          Team Performance
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Pro+</span>
          <span className="text-[11px] text-gray-400">{period === 'all' ? 'All Time' : `Last ${period}`}</span>
        </div>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="space-y-2 px-4 py-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="h-[140px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <i className="ri-team-line text-3xl text-gray-300" />
            No test results in this period
          </div>
        ) : (
          <>
            {/* Leaderboard table */}
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 px-4 py-2 w-6">#</th>
                  <th className="text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2">Member</th>
                  <th className="text-center text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2">Executed</th>
                  <th className="text-center text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2">Found Failures</th>
                  <th className="text-center text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2">Avg Response</th>
                  <th className="text-center text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2 pr-4">7-Day Activity</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const rankColor = RANK_COLORS[i] ?? 'text-gray-400';
                  return (
                    <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className={`pl-4 py-2.5 font-bold text-[13px] ${rankColor}`}>{i + 1}</td>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColor}`}>
                            {getInitials(m.name)}
                          </span>
                          <span className="font-medium text-gray-800 truncate max-w-[90px]">{m.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-semibold text-gray-700">{m.total}</td>
                      <td className="py-2.5 text-center font-semibold text-red-500">{m.failed}</td>
                      <td className={`py-2.5 text-center font-semibold ${AvgResponseColor(m.avgResponseMs)}`}>{m.avgResponse}</td>
                      <td className="py-2.5 pr-4">
                        <div className="flex justify-center">
                          <Sparkline data={m.dailyActivity} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Stacked contribution bars */}
            <div className="px-4 pt-3 pb-2 space-y-2 border-t border-gray-100 mt-2">
              {members.slice(0, 6).map(m => {
                const barW = (m.total / maxTotal) * 100;
                const passW = m.total > 0 ? (m.passed / m.total) * 100 : 0;
                const failW = m.total > 0 ? (m.failed / m.total) * 100 : 0;
                const blockW = m.total > 0 ? (m.blocked / m.total) * 100 : 0;
                return (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="w-[72px] text-[11px] text-gray-600 font-medium text-right truncate flex-shrink-0">{m.name}</span>
                    <div className="flex-1 h-[16px] bg-gray-100 rounded-sm overflow-hidden">
                      <div className="h-full flex" style={{ width: `${barW}%` }}>
                        <div style={{ width: `${passW}%`, backgroundColor: '#16A34A' }} />
                        <div style={{ width: `${failW}%`, backgroundColor: '#DC2626' }} />
                        <div style={{ width: `${blockW}%`, backgroundColor: '#D97706' }} />
                      </div>
                    </div>
                    <span className="w-8 text-[11px] font-semibold text-gray-600 text-right flex-shrink-0">{m.total}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-1">
                {[
                  { color: '#16A34A', label: 'Passed' },
                  { color: '#DC2626', label: 'Failed' },
                  { color: '#D97706', label: 'Blocked' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
