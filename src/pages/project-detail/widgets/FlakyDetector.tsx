import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const CACHE_KEY_PREFIX = 'flaky_ai_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

const PATTERN_BADGE_COLORS: { bg: string; text: string }[] = [
  { bg: '#7F1D1D', text: '#FCA5A5' },
  { bg: '#78350F', text: '#FDE68A' },
  { bg: '#1E3A5F', text: '#93C5FD' },
  { bg: '#3B0764', text: '#D8B4FE' },
  { bg: '#14532D', text: '#86EFAC' },
];

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

/* ── Toast Component ── */
function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-[13px] font-medium ${colors[type]}`}
      style={{ animation: 'toastSlideIn 0.3s ease-out' }}
    >
      {type === 'error' && <i className="ri-error-warning-fill" />}
      {type === 'success' && <i className="ri-check-line" />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 cursor-pointer">
        <i className="ri-close-line" />
      </button>
      <style>{`@keyframes toastSlideIn { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
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
  const [jiraCreating, setJiraCreating] = useState<string | null>(null);
  const [expandedJira, setExpandedJira] = useState<string | null>(null);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [editingPatterns, setEditingPatterns] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, { summary: string; priority: string; labels: string }>>({});

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Auto-scroll ref
  const aiSectionRef = useRef<HTMLDivElement>(null);

  const limit = subscriptionTier >= 3 ? 20 : 5;

  // Cache helpers
  const getCacheKey = useCallback(() => `${CACHE_KEY_PREFIX}${projectId}`, [projectId]);

  const readCache = useCallback((): FlakyPattern[] | null => {
    try {
      const raw = localStorage.getItem(getCacheKey());
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        localStorage.removeItem(getCacheKey());
        return null;
      }
      return cached.patterns;
    } catch {
      return null;
    }
  }, [getCacheKey]);

  const writeCache = useCallback((patterns: FlakyPattern[]) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({ patterns, timestamp: Date.now() }));
    } catch { /* ignore quota errors */ }
  }, [getCacheKey]);

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

      const { data: results } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at')
        .in('run_id', runIds)
        .neq('status', 'untested')
        .order('created_at', { ascending: false });

      if (!results?.length) { setFlaky([]); setLoading(false); return; }

      const byTC: Record<string, string[]> = {};
      const lastRunAt: Record<string, string> = {};
      results.forEach(r => {
        if (!byTC[r.test_case_id]) {
          byTC[r.test_case_id] = [];
          lastRunAt[r.test_case_id] = r.created_at;
        }
        if (byTC[r.test_case_id].length < 10) byTC[r.test_case_id].push(r.status);
      });

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

  async function runAIAnalysis(forceReanalyze = false) {
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
      if (!session?.access_token) {
        setAiError('Login required. Please sign in again.');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-testcases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: 'analyze-flaky', project_id: projectId, flaky_tests: flakyTests, force_reanalyze: forceReanalyze }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) setAiError('Professional plan required');
        else if (response.status === 429) {
          setAiError('Monthly AI limit reached');
          setToast({ message: 'Monthly AI generation limit reached. Please upgrade your plan or try again next month.', type: 'error' });
        } else setAiError('Analysis failed. Please try again.');
        return;
      }

      if (!data?.success || !data?.result?.patterns) {
        setAiError('Analysis failed. Please try again.');
        return;
      }

      setAiPatterns(data.result.patterns);
      setIsCachedResult(false);
      writeCache(data.result.patterns);
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
        // Check cache first
        const cached = readCache();
        if (cached && cached.length > 0) {
          setAiPatterns(cached);
          setIsCachedResult(true);
          // Auto-scroll after cached data renders
          setTimeout(() => {
            aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
        } else {
          runAIAnalysis().then(() => {
            setTimeout(() => {
              aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
          });
        }
      }
    } else {
      setShowDeepAnalysis(false);
    }
  }

  const tcTitleMap = new Map(flaky.map(tc => [tc.id, { title: tc.title, customId: tc.customId, score: tc.flakyScore }]));

  function getDefaultJiraValues(pattern: FlakyPattern) {
    const tcCustomIds = pattern.testIds
      .map(id => tcTitleMap.get(id)?.customId)
      .filter(Boolean) as string[];
    return {
      summary: `[Flaky] ${pattern.name}: ${pattern.testIds.length} test(s) affected`,
      priority: 'High',
      labels: ['flaky', 'ai-detected', pattern.category.replace('_', '-'), ...tcCustomIds].join(', '),
    };
  }

  function handleEditClick(pattern: FlakyPattern) {
    if (!editValues[pattern.name]) {
      setEditValues(prev => ({ ...prev, [pattern.name]: getDefaultJiraValues(pattern) }));
    }
    setEditingPatterns(prev => ({ ...prev, [pattern.name]: true }));
  }

  function handleEditDone(patternName: string) {
    setEditingPatterns(prev => ({ ...prev, [patternName]: false }));
  }

  async function createJiraForPattern(pattern: FlakyPattern) {
    // Fetch global Jira credentials from jira_settings
    const { data: jiraSettings } = await supabase
      .from('jira_settings')
      .select('domain, email, api_token')
      .maybeSingle();

    if (!jiraSettings?.domain) {
      setToast({ message: 'Jira not connected: domain is missing. Please configure Jira in Settings > Integrations.', type: 'error' });
      return;
    }
    if (!jiraSettings?.email) {
      setToast({ message: 'Jira not connected: email is missing. Please configure Jira in Settings > Integrations.', type: 'error' });
      return;
    }
    if (!jiraSettings?.api_token) {
      setToast({ message: 'Jira not connected: API token is missing. Please configure Jira in Settings > Integrations.', type: 'error' });
      return;
    }

    // Fetch per-project Jira project key from projects table
    const { data: projectData } = await supabase
      .from('projects')
      .select('jira_project_key')
      .eq('id', projectId)
      .maybeSingle();

    const projectKey = projectData?.jira_project_key;
    if (!projectKey) {
      setToast({ message: 'Jira Project Key is not set for this project. Please edit the project and enter a Jira Project Key.', type: 'error' });
      return;
    }

    setJiraCreating(pattern.name);
    try {
      const tcList = pattern.testIds.map(id => {
        const tc = tcTitleMap.get(id);
        return tc ? `${tc.customId || id}: ${tc.title}` : id;
      }).join('\n');

      const vals = editValues[pattern.name] ?? getDefaultJiraValues(pattern);
      const labels = vals.labels.split(',').map(l => l.trim()).filter(Boolean);

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/create-jira-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          domain: jiraSettings.domain,
          email: jiraSettings.email,
          apiToken: jiraSettings.api_token,
          projectKey,
          summary: vals.summary,
          description: `**Root Cause:** ${pattern.rootCause}\n\n**Fix Suggestion:** ${pattern.fixSuggestion}\n\n**Affected Tests:**\n${tcList}`,
          issueType: 'Bug',
          priority: vals.priority,
          labels,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData?.error || 'Failed to create Jira issue');

      setToast({ message: `Jira issue created for "${pattern.name}" pattern`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to create Jira issue. Please try again.', type: 'error' });
    } finally {
      setJiraCreating(null);
    }
  }

  async function createAllJiraIssues() {
    for (const pattern of aiPatterns) {
      await createJiraForPattern(pattern);
    }
  }

  const totalFlakyTCs = aiPatterns.reduce((sum, p) => sum + p.testIds.length, 0);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
            <i className="ri-shuffle-fill text-violet-500" />
            Flaky Test Detection
            {!loading && flaky.length > 0 && (
              <span className="text-[11px] font-bold text-amber-600 ml-1">
                {flaky.length} flaky
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && flaky.length > 0 && subscriptionTier >= 3 && (
              <button
                onClick={handleAIAnalyzeClick}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer hover:opacity-90"
                style={{
                  background: aiLoading ? '#4338CA' : showDeepAnalysis ? '#EEF2FF' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                  color: aiLoading ? '#C7D2FE' : showDeepAnalysis ? '#6366F1' : '#fff',
                  border: showDeepAnalysis && !aiLoading ? '1px solid #C7D2FE' : 'none',
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                }}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>
                    <span style={{ width: 12, height: 12, border: '1.5px solid #6366F1', borderTopColor: '#C7D2FE', borderRadius: '50%', animation: 'flakyBtnSpin 0.8s linear infinite', display: 'inline-block' }} />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <i className="ri-sparkling-2-fill text-[12px]" />
                    AI Analyze
                    {showDeepAnalysis && <i className="ri-arrow-up-s-line text-[12px]" />}
                  </>
                )}
              </button>
            )}
            {subscriptionTier < 3 && (
              <span className="text-[11px] text-gray-400">Top {limit}</span>
            )}
            <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">Pro+</span>
          </div>
        </div>
        <style>{`@keyframes flakyBtnSpin { to { transform: rotate(360deg); } }`}</style>

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

              {/* ── AI Deep Analysis Accordion ── */}
              {showDeepAnalysis && (
                <div ref={aiSectionRef} style={{ borderTop: '2px solid #6366F1', marginTop: 8, animation: 'flakySlideDown 0.3s ease-out' }}>
                  <style>{`@keyframes flakySlideDown { from { opacity:0; max-height:0; } to { opacity:1; max-height:2000px; } }`}</style>

                  {/* AI Section Header */}
                  <div style={{ padding: '10px 16px', background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ri-sparkling-2-fill" style={{ color: '#6366F1', fontSize: 14 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>AI Deep Analysis</span>
                      {!aiLoading && aiPatterns.length > 0 && (
                        <span style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>{aiPatterns.length} patterns found</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {!aiLoading && aiPatterns.length > 0 && (
                        <button
                          onClick={() => {
                            localStorage.removeItem(getCacheKey());
                            setIsCachedResult(false);
                            runAIAnalysis(true).then(() => {
                              setTimeout(() => {
                                aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                              }, 100);
                            });
                          }}
                          style={{ fontSize: 11, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          <i className="ri-refresh-line" /> Re-analyze
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeepAnalysis(false)}
                        style={{ fontSize: 14, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <i className="ri-arrow-up-s-line" />
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    {/* Loading */}
                    {aiLoading && (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'flakyAISpin 0.8s linear infinite', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Analyzing flaky patterns for {flaky.length} tests…</p>
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

                    {/* ── Pattern Cards ── */}
                    {!aiLoading && aiPatterns.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {aiPatterns.map((pattern, i) => {
                          const badge = PATTERN_BADGE_COLORS[i % PATTERN_BADGE_COLORS.length];
                          const letter = String.fromCharCode(65 + i); // A, B, C...
                          const isJiraExpanded = expandedJira === pattern.name;

                          return (
                            <div
                              key={i}
                              style={{
                                background: '#FAFBFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: 10,
                                padding: '14px 16px',
                              }}
                            >
                              {/* Pattern Header */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    width: 24, height: 24, borderRadius: 6,
                                    background: badge.bg, color: badge.text,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 800,
                                  }}>{letter}</span>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{pattern.name}</span>
                                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>— {pattern.testIds.length} TCs</span>
                                </div>
                              </div>

                              {/* Affected TC Tags */}
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                {pattern.testIds.map(id => {
                                  const tc = tcTitleMap.get(id);
                                  return (
                                    <span key={id} style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      padding: '3px 10px', background: '#F1F5F9', border: '1px solid #E2E8F0',
                                      borderRadius: 6, fontSize: 11, color: '#475569',
                                    }}>
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                                      {tc?.customId || id.slice(0, 8)} {tc?.title || ''}
                                      <span style={{ fontWeight: 700, color: '#D97706' }}>{tc?.score ?? ''}</span>
                                    </span>
                                  );
                                })}
                              </div>

                              {/* WHY FLAKY */}
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                  <i className="ri-search-eye-line" style={{ marginRight: 4 }} />Why Flaky
                                </div>
                                <div style={{
                                  padding: '8px 12px', background: '#FEF9F0', borderRadius: 6,
                                  borderLeft: '3px solid #EF4444', fontSize: 12, color: '#475569', lineHeight: 1.6,
                                }}>
                                  {pattern.rootCause}
                                </div>
                              </div>

                              {/* HOW TO FIX */}
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                  <i className="ri-tools-fill" style={{ marginRight: 4 }} />How to Fix
                                </div>
                                <div style={{
                                  padding: '8px 12px', background: '#F0FDF4', borderRadius: 6,
                                  borderLeft: '3px solid #10B981', fontSize: 12, color: '#475569', lineHeight: 1.6,
                                }}>
                                  {pattern.fixSuggestion}
                                </div>
                              </div>

                              {/* Jira Action */}
                              {!isJiraExpanded ? (
                                <button
                                  onClick={() => {
                                    setExpandedJira(pattern.name);
                                    if (!editValues[pattern.name]) {
                                      setEditValues(prev => ({ ...prev, [pattern.name]: getDefaultJiraValues(pattern) }));
                                    }
                                  }}
                                  style={{
                                    fontSize: 11, fontWeight: 600, color: '#6366F1',
                                    background: '#EEF2FF', border: '1px solid #C7D2FE',
                                    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                  }}
                                >
                                  <i className="ri-jira-line" /> Create Jira
                                </button>
                              ) : (() => {
                                const isEditing = editingPatterns[pattern.name] ?? false;
                                const vals = editValues[pattern.name] ?? getDefaultJiraValues(pattern);
                                return (
                                  <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', borderLeft: '3px solid #6366F1' }}>
                                    {isEditing ? (
                                      /* ── Edit Mode ── */
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div>
                                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Summary</div>
                                          <input
                                            value={vals.summary}
                                            onChange={e => setEditValues(prev => ({ ...prev, [pattern.name]: { ...prev[pattern.name], summary: e.target.value } }))}
                                            style={{ width: '100%', fontSize: 12, fontWeight: 600, color: '#0F172A', border: '1px solid #C7D2FE', borderRadius: 6, padding: '5px 8px', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                                          />
                                        </div>
                                        <div>
                                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Priority</div>
                                          <select
                                            value={vals.priority}
                                            onChange={e => setEditValues(prev => ({ ...prev, [pattern.name]: { ...prev[pattern.name], priority: e.target.value } }))}
                                            style={{ fontSize: 12, color: '#0F172A', border: '1px solid #C7D2FE', borderRadius: 6, padding: '5px 8px', background: '#fff', outline: 'none', cursor: 'pointer' }}
                                          >
                                            <option>Highest</option>
                                            <option>High</option>
                                            <option>Medium</option>
                                            <option>Low</option>
                                          </select>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Labels <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma-separated)</span></div>
                                          <input
                                            value={vals.labels}
                                            onChange={e => setEditValues(prev => ({ ...prev, [pattern.name]: { ...prev[pattern.name], labels: e.target.value } }))}
                                            style={{ width: '100%', fontSize: 12, color: '#475569', border: '1px solid #C7D2FE', borderRadius: 6, padding: '5px 8px', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                                          />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                                          <button
                                            onClick={() => handleEditDone(pattern.name)}
                                            style={{ fontSize: 11, fontWeight: 600, color: '#6366F1', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                                          >
                                            Done
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* ── Preview Mode ── */
                                      <>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                                          {vals.summary}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748B' }}>
                                          Priority: {vals.priority}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, wordBreak: 'break-word' }}>
                                          Labels: {vals.labels}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                                          <button
                                            onClick={() => { setExpandedJira(null); setEditingPatterns(prev => ({ ...prev, [pattern.name]: false })); }}
                                            style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleEditClick(pattern)}
                                            style={{ fontSize: 11, fontWeight: 600, color: '#6366F1', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                                          >
                                            <i className="ri-edit-line" /> Edit
                                          </button>
                                          <button
                                            onClick={() => { createJiraForPattern(pattern); setExpandedJira(null); setEditingPatterns(prev => ({ ...prev, [pattern.name]: false })); }}
                                            disabled={jiraCreating === pattern.name}
                                            style={{
                                              fontSize: 11, fontWeight: 600, color: '#fff',
                                              background: '#6366F1', border: 'none', borderRadius: 6,
                                              padding: '4px 12px', cursor: 'pointer',
                                              display: 'inline-flex', alignItems: 'center', gap: 4,
                                              opacity: jiraCreating === pattern.name ? 0.5 : 1,
                                            }}
                                          >
                                            <i className="ri-jira-line" /> Create
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}

                        {/* Bulk Action + Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="ri-sparkling-2-fill" style={{ color: '#8B5CF6', fontSize: 12 }} />
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>
                              {aiPatterns.length} patterns · {totalFlakyTCs} flaky TCs · 1 AI credit used · Analysis cached for 24h
                            </span>
                          </div>
                          <button
                            onClick={createAllJiraIssues}
                            disabled={jiraCreating !== null}
                            style={{
                              fontSize: 11, fontWeight: 600, color: '#475569',
                              background: '#F8FAFC', border: '1px solid #E2E8F0',
                              borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              opacity: jiraCreating !== null ? 0.5 : 1,
                            }}
                          >
                            <i className="ri-jira-line" /> Create All Issues ({aiPatterns.length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
