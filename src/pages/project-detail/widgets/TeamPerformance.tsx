import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '../../../lib/supabase';

interface TeamMember {
  name: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
  passRate: number;
  bugRate: number;
}

type PeriodFilter = '7d' | '14d' | '30d' | 'all';

function getPeriodMs(period: PeriodFilter): number {
  if (period === '7d') return 7 * 86400000;
  if (period === '14d') return 14 * 86400000;
  if (period === '30d') return 30 * 86400000;
  return 0;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as TeamMember;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-xl min-w-[160px]">
      <p className="font-semibold mb-2 text-sm">{label}</p>
      <p className="flex justify-between gap-4"><span className="text-green-400">Passed</span><span>{d?.passed}</span></p>
      <p className="flex justify-between gap-4"><span className="text-red-400">Failed</span><span>{d?.failed}</span></p>
      <p className="flex justify-between gap-4"><span className="text-amber-400">Blocked</span><span>{d?.blocked}</span></p>
      <p className="flex justify-between gap-4 border-t border-gray-700 pt-1.5 mt-1.5">
        <span className="text-gray-300">Pass Rate</span><span className="font-semibold">{d?.passRate}%</span>
      </p>
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

      // Aggregate by author
      const byAuthor: Record<string, { passed: number; failed: number; blocked: number; total: number }> = {};
      results.forEach(r => {
        const name = r.author || '알 수 없음';
        if (!byAuthor[name]) byAuthor[name] = { passed: 0, failed: 0, blocked: 0, total: 0 };
        if (r.status !== 'untested') {
          byAuthor[name].total++;
          if (r.status === 'passed') byAuthor[name].passed++;
          else if (r.status === 'failed') byAuthor[name].failed++;
          else if (r.status === 'blocked') byAuthor[name].blocked++;
        }
      });

      const list: TeamMember[] = Object.entries(byAuthor)
        .filter(([, s]) => s.total > 0)
        .map(([name, s]) => ({
          name: name.length > 14 ? name.slice(0, 14) + '…' : name,
          passed: s.passed,
          failed: s.failed,
          blocked: s.blocked,
          total: s.total,
          passRate: Math.round((s.passed / s.total) * 100),
          bugRate: Math.round((s.failed / s.total) * 100),
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
          <i className="ri-team-line text-indigo-500" />
          Team Performance
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Pro+</span>
          <span className="text-[11px] text-gray-400">{period === 'all' ? '전체' : `Last ${period}`}</span>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="h-[220px] bg-gray-50 rounded-lg animate-pulse" />
        ) : members.length === 0 ? (
          <div className="h-[140px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
            <i className="ri-team-line text-3xl text-gray-300" />
            선택한 기간에 테스트 결과가 없습니다
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(160, members.length * 36)}>
              <BarChart data={members} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: '#374151' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="passed" stackId="a" fill="#16A34A" name="Passed" />
                <Bar dataKey="failed" stackId="a" fill="#DC2626" name="Failed" />
                <Bar dataKey="blocked" stackId="a" fill="#D97706" name="Blocked" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
              {[
                { color: '#16A34A', label: 'Passed' },
                { color: '#DC2626', label: 'Failed' },
                { color: '#D97706', label: 'Blocked' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>

            {/* Top performers table */}
            <div className="mt-4 space-y-2">
              {members.slice(0, 5).map((m, i) => (
                <div key={m.name} className="flex items-center gap-3 text-[12px]">
                  <span className="text-gray-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 font-medium text-gray-800 truncate">{m.name}</span>
                  <span className="text-gray-500">{m.total}건</span>
                  <span className={`font-semibold w-10 text-right ${m.passRate >= 80 ? 'text-emerald-600' : m.passRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {m.passRate}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
