import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface FlakyTC {
  id: string;
  title: string;
  customId: string;
  flakyScore: number;
  recentStatuses: string[];
  folder: string;
  lastRun: string;
}

function calculateFlakyScore(statuses: string[]): number {
  if (statuses.length < 2) return 0;
  let transitions = 0;
  for (let i = 1; i < statuses.length; i++) {
    if (statuses[i] !== statuses[i - 1]) transitions++;
  }
  return Math.round((transitions / (statuses.length - 1)) * 100);
}

function SequenceDots({ statuses }: { statuses: string[] }) {
  const colorMap: Record<string, string> = {
    passed: 'bg-green-600',
    failed: 'border-[1.5px] border-red-600 bg-transparent',
    blocked: 'bg-amber-500',
    retest: 'bg-violet-500',
    untested: 'bg-gray-300',
  };
  return (
    <div className="flex items-center gap-[3px]">
      {statuses.slice(-10).map((s, i) => (
        <span key={i} className={`w-2 h-2 rounded-full flex-shrink-0 ${colorMap[s] ?? 'bg-gray-300'}`} />
      ))}
    </div>
  );
}

function FlakyScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-100 text-red-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700';
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  );
}

export default function FlakyDetector({ projectId, subscriptionTier }: { projectId: string; subscriptionTier: number }) {
  const [flaky, setFlaky] = useState<FlakyTC[]>([]);
  const [loading, setLoading] = useState(true);

  const limit = subscriptionTier >= 3 ? 20 : 5;

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function load() {
    setLoading(true);
    try {
      const { data: runs } = await supabase
        .from('test_runs').select('id').eq('project_id', projectId);

      if (!runs?.length) { setFlaky([]); setLoading(false); return; }

      const runIds = runs.map(r => r.id);

      // Fetch last 10 results per TC (ordered newest first)
      const { data: results } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at')
        .in('run_id', runIds)
        .neq('status', 'untested')
        .order('created_at', { ascending: false });

      if (!results?.length) { setFlaky([]); setLoading(false); return; }

      // Group by TC, keep last 10; track most recent run timestamp
      const byTC: Record<string, string[]> = {};
      const lastRunAt: Record<string, string> = {};
      results.forEach(r => {
        if (!byTC[r.test_case_id]) {
          byTC[r.test_case_id] = [];
          lastRunAt[r.test_case_id] = r.created_at; // results ordered desc, first = newest
        }
        if (byTC[r.test_case_id].length < 10) byTC[r.test_case_id].push(r.status);
      });

      // Filter: at least 3 results, score >= 40
      const candidates = Object.entries(byTC)
        .filter(([, statuses]) => statuses.length >= 3)
        .map(([tcId, statuses]) => {
          const reversed = [...statuses].reverse(); // oldest → newest (non-mutating)
          return { tcId, statuses: reversed, score: calculateFlakyScore(reversed) };
        })
        .filter(c => c.score >= 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (candidates.length === 0) { setFlaky([]); setLoading(false); return; }

      // Fetch TC metadata
      const tcIds = candidates.map(c => c.tcId);
      const { data: tcs } = await supabase
        .from('test_cases')
        .select('id, title, custom_id, folder')
        .in('id', tcIds);

      const tcMap = new Map((tcs ?? []).map(t => [t.id, t]));

      const flakyItems: FlakyTC[] = candidates.map(c => {
        const tc = tcMap.get(c.tcId);
        const lastRunIso = lastRunAt[c.tcId] ?? '';
        const lastRunLabel = lastRunIso
          ? new Date(lastRunIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—';
        return {
          id: c.tcId,
          title: tc?.title ?? 'Unknown TC',
          customId: tc?.custom_id ?? '',
          flakyScore: c.score,
          recentStatuses: c.statuses,
          folder: tc?.folder ?? '',
          lastRun: lastRunLabel,
        };
      });

      setFlaky(flakyItems);
    } catch (e) {
      console.error('FlakyDetector:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-bug-fill text-red-500" />
          Flaky TC Detection
          {!loading && flaky.length > 0 && (
            <span className="text-[11px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full ml-1">
              {flaky.length} Flaky
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {subscriptionTier < 3 && (
            <span className="text-[11px] text-gray-400">상위 {limit}개</span>
          )}
          <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Pro+</span>
        </div>
      </div>

      <div className="py-2">
        {loading ? (
          <div className="space-y-2 px-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : flaky.length === 0 ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <i className="ri-shield-check-line text-3xl text-emerald-400" />
            <p className="text-[13px] font-medium text-gray-700">Flaky TC 없음</p>
            <p className="text-[12px] text-gray-400">모든 TC가 안정적으로 실행되고 있습니다</p>
          </div>
        ) : (
          <>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-semibold text-gray-400 px-4 py-2">Test Case</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 py-2">Sequence (last 10)</th>
                  <th className="text-center text-[11px] font-semibold text-gray-400 py-2 pr-2">Score</th>
                  <th className="text-right text-[11px] font-semibold text-gray-400 py-2 pr-4">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {flaky.map(tc => (
                  <tr
                    key={tc.id}
                    className={`border-b border-gray-100 hover:bg-gray-50/70 transition-colors ${tc.flakyScore >= 50 ? 'border-l-2 border-l-red-500' : ''}`}
                  >
                    <td className="pl-3.5 py-2.5 pr-2">
                      <div className="font-medium text-gray-800 truncate max-w-[120px]">{tc.title}</div>
                      {tc.customId && (
                        <div className="text-[10px] font-mono text-gray-400">{tc.customId}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-2">
                      <SequenceDots statuses={tc.recentStatuses} />
                    </td>
                    <td className="py-2.5 pr-2 text-center">
                      <FlakyScoreBadge score={tc.flakyScore} />
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[11px] text-gray-400 whitespace-nowrap">{tc.lastRun}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Dot legend */}
            <div className="flex items-center gap-3 px-4 pt-2">
              {[
                { label: 'Passed', className: 'bg-green-600' },
                { label: 'Failed', className: 'border-[1.5px] border-red-600 bg-transparent' },
                { label: 'Blocked', className: 'bg-amber-500' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1 text-[11px] text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${l.className}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
