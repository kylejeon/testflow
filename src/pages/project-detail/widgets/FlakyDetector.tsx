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

interface FlakyPattern {
  name: string;
  category: 'race_condition' | 'shared_state' | 'env_dependency' | 'data_dependency' | 'timing';
  testIds: string[];
  rootCause: string;
  fixSuggestion: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  race_condition: 'Race Condition',
  shared_state: 'Shared State',
  env_dependency: 'Env Dependency',
  data_dependency: 'Data Dependency',
  timing: 'Timing',
};

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  race_condition:   { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' },
  shared_state:     { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  env_dependency:   { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  data_dependency:  { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  timing:           { bg: '#F0FDF4', text: '#14532D', border: '#86EFAC' },
};

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

  // AI Deep Analysis state
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPatterns, setAiPatterns] = useState<FlakyPattern[]>([]);
  const [jiraCreating, setJiraCreating] = useState<string | null>(null); // patternName

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
          lastRunAt[r.test_case_id] = r.created_at;
        }
        if (byTC[r.test_case_id].length < 10) byTC[r.test_case_id].push(r.status);
      });

      // Filter: at least 3 results, score >= 40
      const candidates = Object.entries(byTC)
        .filter(([, statuses]) => statuses.length >= 3)
        .map(([tcId, statuses]) => {
          const reversed = [...statuses].reverse();
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

  async function runAIAnalysis() {
    setAiLoading(true);
    setAiError(null);
    setAiPatterns([]);
    try {
      const flakyTests = flaky.map(tc => ({
        test_case_id: tc.id,
        title: tc.title,
        folder_path: tc.folder,
        recent_statuses: tc.recentStatuses,
        flaky_score: tc.flakyScore,
      }));

      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('generate-testcases', {
        body: { action: 'analyze-flaky', project_id: projectId, flaky_tests: flakyTests },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (fnError) {
        const status = (fnError as any)?.context?.status;
        if (status === 403) setAiError('Professional plan required');
        else if (status === 429) setAiError('Monthly AI limit reached');
        else setAiError('Analysis failed. Please try again.');
        return;
      }

      if (!data?.success || !data?.result?.patterns) {
        setAiError('Analysis failed. Please try again.');
        return;
      }

      setAiPatterns(data.result.patterns);
    } catch {
      setAiError('Connection error. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  function handleAIAnalyzeClick() {
    if (!showDeepAnalysis) {
      setShowDeepAnalysis(true);
      if (aiPatterns.length === 0 && !aiLoading) {
        runAIAnalysis();
      }
    } else {
      setShowDeepAnalysis(false);
    }
  }

  // Build a title map for pattern cards
  const tcTitleMap = new Map(flaky.map(tc => [tc.id, { title: tc.title, customId: tc.customId }]));

  async function createJiraForPattern(pattern: FlakyPattern) {
    const { data: jiraSettings } = await supabase
      .from('jira_settings')
      .select('domain, email, api_token, project_key')
      .maybeSingle();

    if (!jiraSettings?.domain || !jiraSettings?.api_token) {
      alert('Jira not connected. Please configure Jira in Settings.');
      return;
    }

    setJiraCreating(pattern.name);
    try {
      const tcList = pattern.testIds.map(id => {
        const tc = tcTitleMap.get(id);
        return tc ? `${tc.customId || id}: ${tc.title}` : id;
      }).join('\n');

      const { error } = await supabase.functions.invoke('create-jira-issue', {
        body: {
          domain: jiraSettings.domain,
          email: jiraSettings.email,
          apiToken: jiraSettings.api_token,
          projectKey: jiraSettings.project_key,
          summary: `[Flaky] ${pattern.name}: ${pattern.testIds.length} test(s) affected`,
          description: `**Root Cause:** ${pattern.rootCause}\n\n**Fix Suggestion:** ${pattern.fixSuggestion}\n\n**Affected Tests:**\n${tcList}`,
          issueType: 'Bug',
          priority: 'High',
        },
      });

      if (error) throw error;
      alert(`Jira issue created for "${pattern.name}" pattern`);
    } catch {
      alert('Failed to create Jira issue. Please try again.');
    } finally {
      setJiraCreating(null);
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
          {!loading && flaky.length > 0 && subscriptionTier >= 3 && (
            <button
              onClick={handleAIAnalyzeClick}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer hover:opacity-90"
              style={{
                background: showDeepAnalysis ? '#EEF2FF' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                color: showDeepAnalysis ? '#6366F1' : '#fff',
                border: showDeepAnalysis ? '1px solid #C7D2FE' : 'none',
              }}
            >
              <i className="ri-sparkling-2-fill text-[12px]" />
              AI Analyze
              {showDeepAnalysis && <i className="ri-arrow-up-s-line text-[12px]" />}
            </button>
          )}
          {subscriptionTier < 3 && (
            <span className="text-[11px] text-gray-400">Top {limit}</span>
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
            <p className="text-[13px] font-medium text-gray-700">No Flaky TCs</p>
            <p className="text-[12px] text-gray-400">All TCs are running stably</p>
          </div>
        ) : (
          <>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 px-4 py-2 w-[80px]">ID</th>
                  <th className="text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2">Test Case</th>
                  <th className="text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2">Sequence (Last 10)</th>
                  <th className="text-center text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2 pr-2">Score</th>
                  <th className="text-right text-[11px] font-extrabold uppercase tracking-wider text-gray-600 py-2 pr-4">Last Run</th>
                </tr>
              </thead>
              <tbody>
                {flaky.map(tc => (
                  <tr
                    key={tc.id}
                    className={`border-b border-gray-100 hover:bg-gray-50/70 transition-colors ${tc.flakyScore >= 50 ? 'border-l-2 border-l-red-500' : ''}`}
                  >
                    <td className="pl-3.5 py-2.5 pr-2">
                      <span className="text-[11px] font-mono text-gray-500">{tc.customId || '—'}</span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="font-medium text-gray-800 truncate max-w-[120px]">{tc.title}</div>
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

            {/* AI Deep Analysis Panel */}
            {showDeepAnalysis && (
              <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 8 }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(139,92,246,0.05))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ri-sparkling-2-fill" style={{ color: '#6366F1', fontSize: 14 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>AI Deep Analysis</span>
                    </div>
                    {!aiLoading && aiPatterns.length > 0 && (
                      <button
                        onClick={runAIAnalysis}
                        style={{ fontSize: 11, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        <i className="ri-refresh-line" /> Re-analyze
                      </button>
                    )}
                  </div>

                  {/* Loading */}
                  {aiLoading && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'flakyAISpin 0.8s linear infinite', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>AI가 패턴을 분석 중…</p>
                      <style>{`@keyframes flakyAISpin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  )}

                  {/* Error */}
                  {!aiLoading && aiError && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 10 }}>⚠️ {aiError}</p>
                      <button
                        onClick={runAIAnalysis}
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#334155' }}
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Pattern Cards */}
                  {!aiLoading && aiPatterns.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aiPatterns.map((pattern, i) => {
                        const colors = CATEGORY_COLOR[pattern.category] ?? CATEGORY_COLOR['timing'];
                        return (
                          <div
                            key={i}
                            style={{
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 8,
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{pattern.name}</span>
                                  <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.7)', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '1px 6px', color: colors.text, fontWeight: 600 }}>
                                    {CATEGORY_LABEL[pattern.category] ?? pattern.category}
                                  </span>
                                  <span style={{ fontSize: 10, color: '#64748B' }}>{pattern.testIds.length} TC</span>
                                </div>
                                {/* Affected TCs */}
                                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                                  {pattern.testIds.map(id => {
                                    const tc = tcTitleMap.get(id);
                                    return (
                                      <span key={id} style={{ fontSize: 10, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 4, padding: '1px 5px', color: '#475569' }}>
                                        {tc?.customId || id.slice(0, 8)}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              <button
                                onClick={() => createJiraForPattern(pattern)}
                                disabled={jiraCreating === pattern.name}
                                style={{
                                  fontSize: 10, fontWeight: 600, color: '#0052CC',
                                  background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,82,204,0.2)',
                                  borderRadius: 6, padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                                  opacity: jiraCreating === pattern.name ? 0.5 : 1,
                                }}
                              >
                                {jiraCreating === pattern.name ? '…' : '+ Jira'}
                              </button>
                            </div>
                            <p style={{ fontSize: 11, color: '#475569', margin: '0 0 3px', lineHeight: 1.5 }}>
                              <strong>Root Cause:</strong> {pattern.rootCause}
                            </p>
                            <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                              <strong>Fix:</strong> {pattern.fixSuggestion}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
