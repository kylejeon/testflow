import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import { supabase } from '../../../lib/supabase';

interface TagPassRate {
  tag: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface TagTrend {
  runName: string;
  runIdx: number;
  [tag: string]: number | string;
}

const PRESET_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];

function getTagColor(tag: string, allTags: string[]): string {
  const idx = allTags.indexOf(tag);
  return PRESET_COLORS[idx % PRESET_COLORS.length];
}

interface Props {
  projectId: string;
}

export default function TagAnalytics({ projectId }: Props) {
  const [passRates, setPassRates] = useState<TagPassRate[]>([]);
  const [trendData, setTrendData] = useState<TagTrend[]>([]);
  const [trendTags, setTrendTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'passrate' | 'distribution' | 'trend'>('passrate');

  useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch test cases with tags
      const { data: testCases } = await supabase
        .from('test_cases')
        .select('id, tags')
        .eq('project_id', projectId)
        .not('tags', 'is', null);

      if (!testCases || testCases.length === 0) { setLoading(false); return; }

      // Build map: tcId → tags[]
      const tcTagMap = new Map<string, string[]>();
      testCases.forEach(tc => {
        if (tc.tags) {
          const tags = tc.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          if (tags.length) tcTagMap.set(tc.id, tags);
        }
      });

      // Fetch test runs (last 10 completed or all)
      const { data: runs } = await supabase
        .from('test_runs')
        .select('id, name, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!runs || runs.length === 0) { setLoading(false); return; }

      const runIds = runs.map(r => r.id);

      // Fetch test results
      const { data: results } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status')
        .in('run_id', runIds);

      if (!results) { setLoading(false); return; }

      // ── Aggregate pass rate per tag ──────────────────────────────────────
      // For each result, get TC's tags and bucket by status
      const tagStats = new Map<string, { total: number; passed: number; failed: number }>();

      // Use latest result per TC per run (deduplicate)
      const resultMap = new Map<string, string>(); // `${runId}_${tcId}` → status
      results.forEach(r => {
        const key = `${r.run_id}_${r.test_case_id}`;
        if (!resultMap.has(key)) resultMap.set(key, r.status);
      });

      resultMap.forEach((status, key) => {
        const [, tcId] = key.split('_');
        const tags = tcTagMap.get(tcId) || [];
        tags.forEach(tag => {
          const s = tagStats.get(tag) || { total: 0, passed: 0, failed: 0 };
          s.total++;
          if (status === 'passed') s.passed++;
          if (status === 'failed') s.failed++;
          tagStats.set(tag, s);
        });
      });

      const passRateData: TagPassRate[] = Array.from(tagStats.entries())
        .map(([tag, s]) => ({
          tag,
          total: s.total,
          passed: s.passed,
          failed: s.failed,
          passRate: s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 12);

      setPassRates(passRateData);

      // ── Trend: fail rate per tag over last 5 runs ────────────────────────
      const recentRuns = [...runs].reverse().slice(-5);
      const topTags = passRateData.slice(0, 5).map(d => d.tag);

      const trendPoints: TagTrend[] = recentRuns.map((run, idx) => {
        const point: TagTrend = { runName: run.name.slice(0, 20), runIdx: idx + 1 };
        topTags.forEach(tag => {
          // count failures for this tag in this run
          let total = 0; let failed = 0;
          resultMap.forEach((status, key) => {
            if (!key.startsWith(run.id)) return;
            const [, tcId] = key.split('_');
            const tags = tcTagMap.get(tcId) || [];
            if (tags.includes(tag)) {
              total++;
              if (status === 'failed') failed++;
            }
          });
          point[tag] = total > 0 ? Math.round((failed / total) * 100) : 0;
        });
        return point;
      });

      setTrendData(trendPoints);
      setTrendTags(topTags);
    } catch (err) {
      console.error('TagAnalytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const allTags = passRates.map(d => d.tag);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-xs">
        <p className="font-semibold text-gray-900 mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill || p.stroke }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-semibold text-gray-900">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="h-6 w-36 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (passRates.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <i className="ri-price-tag-3-line text-indigo-500 text-lg" />
          <h3 className="text-[0.9375rem] font-semibold text-gray-900">Tag Analytics</h3>
        </div>
        <div className="text-center py-8 text-sm text-gray-400">
          <i className="ri-bar-chart-box-line text-3xl block mb-2" />
          No tag data yet. Add tags to your test cases to see analytics.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className="ri-price-tag-3-line text-indigo-500 text-lg" />
          <h3 className="text-[0.9375rem] font-semibold text-gray-900">Tag Analytics</h3>
          <span className="text-xs text-gray-400">{passRates.length} tags</span>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {([
            { key: 'passrate' as const, label: 'Pass Rate' },
            { key: 'distribution' as const, label: 'Distribution' },
            { key: 'trend' as const, label: 'Fail Trend' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-2.5 py-1 text-[0.6875rem] font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pass Rate Chart */}
      {activeTab === 'passrate' && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={passRates} margin={{ top: 4, right: 8, left: -8, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="tag"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="passRate" radius={[4, 4, 0, 0]} name="Pass Rate">
              {passRates.map((entry, index) => (
                <Cell
                  key={entry.tag}
                  fill={entry.passRate >= 80 ? '#10b981' : entry.passRate >= 50 ? '#f59e0b' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Distribution Chart */}
      {activeTab === 'distribution' && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={passRates} margin={{ top: 4, right: 8, left: -8, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="tag"
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="passed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Passed" />
            <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} name="Failed" />
            <Bar dataKey="total" hide name="Total" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Fail Trend Chart */}
      {activeTab === 'trend' && trendData.length >= 2 && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="runName" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {trendTags.map((tag, i) => (
                <Line
                  key={tag}
                  type="monotone"
                  dataKey={tag}
                  stroke={PRESET_COLORS[i % PRESET_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={tag}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[0.6875rem] text-gray-400 text-center mt-1">Fail rate % over last {trendData.length} runs (top 5 tags)</p>
        </>
      )}
      {activeTab === 'trend' && trendData.length < 2 && (
        <div className="text-center py-10 text-sm text-gray-400">
          Need at least 2 runs to show trend.
        </div>
      )}
    </div>
  );
}
