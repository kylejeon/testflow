import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface TeamMember {
  name: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
  passRate: number;
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

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-[18px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[6px] rounded-sm bg-indigo-400 flex-shrink-0"
          style={{ height: `${Math.max((v / max) * 18, v > 0 ? 3 : 0)}px`, opacity: v === 0 ? 0.2 : 1 }}
        />
      ))}
    </div>
  );
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

      // Build 7-day date keys (last 7 days)
      const dayKeys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        dayKeys.push(d.toISOString().slice(0, 10));
      }

      // Aggregate by author
      const byAuthor: Record<string, {
        passed: number; failed: number; blocked: number; total: number;
        daily: Record<string, number>;
      }> = {};

      results.forEach(r => {
        const name = r.author || 'No assigned member';
        if (!byAuthor[name]) byAuthor[name] = { passed: 0, failed: 0, blocked: 0, total: 0, daily: {} };
        if (r.status !== 'untested') {
          byAuthor[name].total++;
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
        .map(([name, s]) => ({
          name,
          passed: s.passed,
          failed: s.failed,
          blocked: s.blocked,
          total: s.total,
          passRate: Math.round((s.passed / s.total) * 100),
          dailyActivity: dayKeys.map(k => s.daily[k] ?? 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setMembers(list);
    } catch (e) {
      console.error('TeamPerformance:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-team-fill text-violet-500" />
          Team Performance
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Pro+</span>
          <span className="text-[11px] text-gray-400">{period === 'all' ? '전체' : `Last ${period}`}</span>
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
            선택한 기간에 테스트 결과가 없습니다
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-semibold text-gray-400 px-4 py-2 w-6">#</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 py-2">Member</th>
                <th className="text-center text-[11px] font-semibold text-gray-400 py-2">Exec</th>
                <th className="text-center text-[11px] font-semibold text-gray-400 py-2">Fails</th>
                <th className="text-center text-[11px] font-semibold text-gray-400 py-2">Pass%</th>
                <th className="text-center text-[11px] font-semibold text-gray-400 py-2 pr-4">7d Trend</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const passColor = m.passRate >= 80 ? 'text-emerald-600' : m.passRate >= 60 ? 'text-amber-600' : 'text-red-600';
                return (
                  <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="pl-4 py-2.5 text-gray-400 font-medium">{i + 1}</td>
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
                    <td className={`py-2.5 text-center font-bold ${passColor}`}>{m.passRate}%</td>
                    <td className="py-2.5 pr-4 flex justify-center items-center">
                      <Sparkline data={m.dailyActivity} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
