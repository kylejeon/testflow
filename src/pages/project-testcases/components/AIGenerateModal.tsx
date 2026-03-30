import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

interface SessionLog {
  type: string;
}

interface Session {
  id: string;
  name: string;
  mission: string;
  status: string;
  created_at: string;
  session_logs?: SessionLog[];
}

interface JiraIssue {
  key: string;
  summary: string;
  description?: string;
  priority?: string;
}

interface GeneratedCase {
  title: string;
  description: string;
  precondition: string;
  steps: string[];
  expected_result: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface AIGenerateModalProps {
  projectId: string;
  subscriptionTier: number;
  onSave: (cases: GeneratedCase[]) => Promise<void>;
  onClose: () => void;
}

// Plan info
const PLAN_INFO: Record<number, { name: string; monthlyLimit: number; sessionMode: boolean; jiraMode: boolean }> = {
  1: { name: 'Free', monthlyLimit: 5, sessionMode: false, jiraMode: false },
  2: { name: 'Starter', monthlyLimit: 30, sessionMode: false, jiraMode: true },
  3: { name: 'Professional', monthlyLimit: 150, sessionMode: true, jiraMode: true },
  4: { name: 'Enterprise', monthlyLimit: -1, sessionMode: true, jiraMode: true },
};

type Mode = 'text' | 'jira' | 'session';
type Step = 'mode' | 'input' | 'titles' | 'details' | 'saving';

function parseJiraKeys(input: string): string[] {
  return input
    .split(/[\s,\n]+/)
    .map(k => k.trim().toUpperCase())
    .filter(k => /^[A-Z]+-\d+$/.test(k));
}

function formatDuration(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

export default function AIGenerateModal({
  projectId,
  subscriptionTier,
  onSave,
  onClose,
}: AIGenerateModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('mode');
  const [mode, setMode] = useState<Mode>('text');

  // Text mode
  const [inputText, setInputText] = useState('');

  // Jira mode
  const [jiraIssueInput, setJiraIssueInput] = useState('');
  const [jiraFetchedIssues, setJiraFetchedIssues] = useState<JiraIssue[]>([]);
  const [jiraFetching, setJiraFetching] = useState(false);
  const [jiraFetchError, setJiraFetchError] = useState('');
  const [jiraConnected, setJiraConnected] = useState(false);
  const [jiraCheckDone, setJiraCheckDone] = useState(false);

  // Session mode
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<'all' | 'completed' | 'active'>('all');

  // Shared generation state
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());
  const [generatedCases, setGeneratedCases] = useState<GeneratedCase[]>([]);
  const [selectedCaseIndices, setSelectedCaseIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);

  const planInfo = PLAN_INFO[subscriptionTier] || PLAN_INFO[1];

  useEffect(() => {
    fetchMonthlyUsage();
    checkJiraConnection();
  }, []);

  useEffect(() => {
    if (mode === 'session') fetchSessions();
  }, [mode]);

  const fetchMonthlyUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('ai_generation_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('step', 1)
        .gte('created_at', startOfMonth.toISOString());
      setMonthlyUsage(count || 0);
    } catch {
      // silent
    } finally {
      setUsageLoaded(true);
    }
  };

  const checkJiraConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('jira_settings')
        .select('domain')
        .eq('user_id', user.id)
        .maybeSingle();
      setJiraConnected(!!data?.domain);
    } catch {
      setJiraConnected(false);
    } finally {
      setJiraCheckDone(true);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('id, name, mission, status, created_at, session_logs(type)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setSessions((data as Session[]) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  const callEdgeFunction = async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-testcases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 402 || data.type === 'invalid_request_error') {
        throw new Error('Insufficient AI credits. Please top up your Anthropic account balance.');
      }
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    return data;
  };

  // Fetch Jira issue preview
  const handleFetchJiraIssues = async () => {
    const keys = parseJiraKeys(jiraIssueInput);
    if (keys.length === 0) return;
    setJiraFetching(true);
    setJiraFetchError('');
    setJiraFetchedIssues([]);
    try {
      const data = await callEdgeFunction({
        project_id: projectId,
        mode: 'jira',
        action: 'preview',
        jira_issue_keys: keys,
      });
      setJiraFetchedIssues(data.issues || []);
    } catch (err: any) {
      setJiraFetchError(err.message || 'Failed to fetch Jira issues.');
    } finally {
      setJiraFetching(false);
    }
  };

  // Step 1: Generate titles
  const handleGenerateTitles = async () => {
    setError('');
    setLoading(true);
    try {
      const body: any = { project_id: projectId, mode, step: 1 };
      if (mode === 'text') body.input_text = inputText;
      else if (mode === 'jira') body.jira_issue_keys = parseJiraKeys(jiraIssueInput);
      else body.session_id = selectedSessionId;

      const data = await callEdgeFunction(body);
      setTitles(data.titles || []);
      setSelectedTitles(new Set(data.titles || []));
      setCurrentStep('titles');
      setMonthlyUsage(prev => prev + 1);
    } catch (err: any) {
      if (err.message?.includes('limit')) {
        setError(`You have reached the monthly AI generation limit (${planInfo.monthlyLimit}). Please upgrade your plan.`);
      } else {
        setError(err.message || 'An error occurred during generation.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate detailed cases
  const handleGenerateDetails = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await callEdgeFunction({
        project_id: projectId,
        mode,
        step: 2,
        selected_titles: Array.from(selectedTitles),
      });
      const cases: GeneratedCase[] = data.cases || [];
      setGeneratedCases(cases);
      setSelectedCaseIndices(new Set(cases.map((_, i) => i)));
      setCurrentStep('details');
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating detailed cases.');
    } finally {
      setLoading(false);
    }
  };

  // Save selected cases
  const handleSave = async () => {
    setCurrentStep('saving');
    const casesToSave = generatedCases.filter((_, i) => selectedCaseIndices.has(i));
    try {
      await onSave(casesToSave);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
      setCurrentStep('details');
    }
  };

  const toggleTitle = (title: string) => {
    setSelectedTitles(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  const toggleCase = (idx: number) => {
    setSelectedCaseIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const limitReached = planInfo.monthlyLimit !== -1 && usageLoaded && monthlyUsage >= planInfo.monthlyLimit;

  const jiraKeys = parseJiraKeys(jiraIssueInput);
  const canGenerateJira = jiraKeys.length > 0;

  // Filtered sessions
  const filteredSessions = sessions.filter(s => {
    if (sessionFilter === 'completed') return s.status === 'completed';
    if (sessionFilter === 'active') return s.status !== 'completed';
    return true;
  });

  // Selected session info
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const selectedSessionLogs = selectedSession?.session_logs || [];
  const logTypeCounts = selectedSessionLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <i className="ri-sparkling-2-fill text-white text-sm"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">AI Test Case Generation</h2>
              <p className="text-xs text-gray-500">
                {usageLoaded && (
                  planInfo.monthlyLimit === -1
                    ? `${planInfo.name} · Unlimited`
                    : `${planInfo.name} · This month: ${monthlyUsage} / ${planInfo.monthlyLimit}`
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
            <i className="ri-close-line text-gray-500 text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP: Select mode ── */}
          {currentStep === 'mode' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select how you want to generate test cases.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Text mode */}
                <button
                  onClick={() => { setMode('text'); setCurrentStep('input'); }}
                  disabled={limitReached}
                  className="flex flex-col items-start p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-200">
                    <i className="ri-text-snippet text-indigo-600 text-lg"></i>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Plain Text</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">Enter a feature description and AI will generate test cases.</p>
                  <span className="mt-2 text-xs text-indigo-600 font-medium">All plans</span>
                </button>

                {/* Jira Issue mode */}
                {(() => {
                  const planAllows = planInfo.jiraMode;
                  const connected = jiraConnected;
                  const locked = !planAllows;
                  const notConnected = planAllows && jiraCheckDone && !connected;

                  return (
                    <button
                      onClick={() => {
                        if (locked || limitReached) return;
                        setMode('jira');
                        setCurrentStep('input');
                      }}
                      disabled={locked || limitReached}
                      className={`flex flex-col items-start p-4 border-2 rounded-xl transition-all text-left group ${
                        locked
                          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${locked ? 'bg-gray-100' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
                        <i className={`ri-links-fill text-lg ${locked ? 'text-gray-400' : 'text-blue-600'}`}></i>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">Jira Issue</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Fetch Jira ticket details automatically and generate test cases.
                      </p>
                      {locked ? (
                        <span className="mt-2 text-xs text-gray-400 font-medium flex items-center gap-1">
                          <i className="ri-lock-line"></i> Requires Starter or above
                        </span>
                      ) : notConnected ? (
                        <span className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                          <i className="ri-error-warning-line"></i> Jira not connected
                        </span>
                      ) : (
                        <span className="mt-2 text-xs text-blue-600 font-medium">Starter+ · Jira required</span>
                      )}
                    </button>
                  );
                })()}

                {/* Discovery Log mode */}
                <button
                  onClick={() => {
                    if (!planInfo.sessionMode || limitReached) return;
                    setMode('session');
                    setCurrentStep('input');
                  }}
                  disabled={!planInfo.sessionMode || limitReached}
                  className={`flex flex-col items-start p-4 border-2 rounded-xl transition-all text-left group ${
                    planInfo.sessionMode
                      ? 'border-gray-200 hover:border-violet-400 hover:bg-violet-50 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${planInfo.sessionMode ? 'bg-violet-100 group-hover:bg-violet-200' : 'bg-gray-100'}`}>
                    <i className={`ri-search-eye-line text-lg ${planInfo.sessionMode ? 'text-violet-600' : 'text-gray-400'}`}></i>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Discovery Log</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Select a session — AI analyzes your observations and generates structured test cases.
                  </p>
                  {planInfo.sessionMode ? (
                    <span className="mt-2 text-xs text-violet-600 font-medium">Professional+</span>
                  ) : (
                    <span className="mt-2 text-xs text-gray-400 font-medium flex items-center gap-1">
                      <i className="ri-lock-line"></i> Requires Professional or above
                    </span>
                  )}
                </button>
              </div>

              {limitReached && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <i className="ri-error-warning-line"></i>
                  You have reached the monthly AI generation limit. Try again next month or upgrade your plan.
                </div>
              )}
            </div>
          )}

          {/* ── STEP: input ── */}
          {currentStep === 'input' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentStep('mode')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-arrow-left-line"></i> Back to mode selection
              </button>

              {/* TEXT mode */}
              {mode === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feature Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="e.g. Users can log in with email and password. Social login (Google) is also supported, along with a forgot password flow..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">The more detailed your description, the more accurate the generated test cases will be.</p>
                </div>
              )}

              {/* JIRA mode */}
              {mode === 'jira' && (
                <div className="space-y-4">
                  {/* Jira not connected warning */}
                  {jiraCheckDone && !jiraConnected && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <i className="ri-error-warning-line text-amber-500 text-lg mt-0.5 shrink-0"></i>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Jira not connected</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Connect your Jira account in{' '}
                          <Link to="/settings" className="underline font-medium" onClick={onClose}>
                            Settings &gt; Integrations
                          </Link>{' '}
                          to use this mode.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jira Issue Keys <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={jiraIssueInput}
                        onChange={e => { setJiraIssueInput(e.target.value); setJiraFetchedIssues([]); setJiraFetchError(''); }}
                        placeholder="e.g. PROJ-123, PROJ-124, QA-456"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!jiraConnected}
                      />
                      <button
                        onClick={handleFetchJiraIssues}
                        disabled={jiraKeys.length === 0 || jiraFetching || !jiraConnected}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap transition-colors"
                      >
                        {jiraFetching ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Fetching...
                          </>
                        ) : (
                          <>
                            <i className="ri-download-cloud-line"></i>
                            Fetch Issues
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Separate multiple issue keys with commas (e.g. <code className="bg-gray-100 px-1 rounded">PROJ-123, PROJ-124</code>).
                      {jiraKeys.length > 0 && <span className="text-blue-600 ml-1">{jiraKeys.length} valid key{jiraKeys.length > 1 ? 's' : ''} detected.</span>}
                    </p>
                  </div>

                  {/* Fetch error */}
                  {jiraFetchError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                      {jiraFetchError}
                    </div>
                  )}

                  {/* Fetched issue preview cards */}
                  {jiraFetchedIssues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {jiraFetchedIssues.length} issue{jiraFetchedIssues.length > 1 ? 's' : ''} fetched — review before generating
                      </p>
                      {jiraFetchedIssues.map(issue => (
                        <div key={issue.key} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                              {issue.key}
                            </span>
                            {issue.priority && (
                              <span className="text-xs text-gray-500">{issue.priority}</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">{issue.summary}</p>
                          {issue.description && (
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{issue.description}</p>
                          )}
                          {!issue.description && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <i className="ri-error-warning-line"></i>
                              No description. Test cases will be based on the title only.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hint when no fetch done yet */}
                  {jiraFetchedIssues.length === 0 && !jiraFetchError && jiraConnected && jiraKeys.length > 0 && (
                    <p className="text-xs text-gray-400">Click "Fetch Issues" to preview the Jira content before generating test cases.</p>
                  )}
                </div>
              )}

              {/* SESSION (Discovery Log) mode */}
              {mode === 'session' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Session <span className="text-red-500">*</span>
                    </label>
                    {/* Status filter */}
                    <div className="flex items-center gap-1">
                      {(['all', 'completed', 'active'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setSessionFilter(f)}
                          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                            sessionFilter === f
                              ? 'bg-violet-100 text-violet-700'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingSessions ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading sessions...
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400 border border-gray-200 rounded-lg">
                      {sessions.length === 0
                        ? 'No sessions found for this project.'
                        : 'No sessions match the current filter.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {filteredSessions.map(s => {
                        const logs = s.session_logs || [];
                        const logCount = logs.length;
                        const typeCounts = logs.reduce<Record<string, number>>((acc, l) => {
                          acc[l.type] = (acc[l.type] || 0) + 1;
                          return acc;
                        }, {});
                        const typeStr = Object.entries(typeCounts)
                          .map(([t, c]) => `${c} ${t}`)
                          .join(', ');

                        return (
                          <label
                            key={s.id}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedSessionId === s.id
                                ? 'bg-violet-50 border border-violet-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <input
                              type="radio"
                              name="session"
                              value={s.id}
                              checked={selectedSessionId === s.id}
                              onChange={() => setSelectedSessionId(s.id)}
                              className="mt-0.5 accent-violet-600"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                              {s.mission && <p className="text-xs text-gray-500 truncate">{s.mission}</p>}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {logCount > 0 && (
                                  <span className="text-xs text-gray-400">
                                    <i className="ri-file-list-3-line mr-0.5"></i>
                                    {logCount} {logCount === 1 ? 'entry' : 'entries'}
                                    {typeStr ? ` (${typeStr})` : ''}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  <i className="ri-time-line mr-0.5"></i>
                                  {formatDuration(s.created_at)}
                                </span>
                              </div>
                            </div>
                            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {s.status}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected session summary */}
                  {selectedSession && (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-violet-700 mb-1.5 flex items-center gap-1.5">
                        <i className="ri-check-circle-line"></i>
                        Selected session
                      </p>
                      <p className="text-sm font-medium text-gray-900">{selectedSession.name}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-500">
                          <strong>{selectedSessionLogs.length}</strong> log entries
                        </span>
                        {Object.entries(logTypeCounts).map(([type, count]) => (
                          <span key={type} className="text-xs text-gray-500">
                            {count} {type}
                          </span>
                        ))}
                        <span className="text-xs text-gray-400">
                          Estimated ~{Math.max(3, Math.floor(selectedSessionLogs.length * 0.7))}–{Math.max(5, selectedSessionLogs.length)} TCs
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Select titles ── */}
          {currentStep === 'titles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Select the AI-generated titles you want to expand into full test cases.
                </p>
                <button
                  onClick={() => {
                    if (selectedTitles.size === titles.length) {
                      setSelectedTitles(new Set());
                    } else {
                      setSelectedTitles(new Set(titles));
                    }
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                >
                  {selectedTitles.size === titles.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2">
                {titles.map((title, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTitles.has(title)
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTitles.has(title)}
                      onChange={() => toggleTitle(title)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-800">{title}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400">{selectedTitles.size} selected</p>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: details ── */}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Select the test cases you want to save.</p>
                <button
                  onClick={() => {
                    if (selectedCaseIndices.size === generatedCases.length) {
                      setSelectedCaseIndices(new Set());
                    } else {
                      setSelectedCaseIndices(new Set(generatedCases.map((_, i) => i)));
                    }
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer whitespace-nowrap"
                >
                  {selectedCaseIndices.size === generatedCases.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-3">
                {generatedCases.map((tc, i) => (
                  <div
                    key={i}
                    onClick={() => toggleCase(i)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCaseIndices.has(i)
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCaseIndices.has(i)}
                        onChange={() => toggleCase(i)}
                        onClick={e => e.stopPropagation()}
                        className="accent-indigo-600 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[tc.priority] || priorityColors.medium}`}>
                            {tc.priority}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 truncate">{tc.title}</p>
                        </div>
                        {tc.description && (
                          <p className="text-xs text-gray-500 mb-2">{tc.description}</p>
                        )}
                        {tc.steps?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600 mb-1">Steps ({tc.steps.length})</p>
                            <ol className="space-y-0.5">
                              {tc.steps.slice(0, 3).map((s, si) => (
                                <li key={si} className="text-xs text-gray-500 flex gap-1.5">
                                  <span className="shrink-0 font-medium text-gray-400">{si + 1}.</span>
                                  <span className="truncate">{s}</span>
                                </li>
                              ))}
                              {tc.steps.length > 3 && (
                                <li className="text-xs text-gray-400">+{tc.steps.length - 3} more...</li>
                              )}
                            </ol>
                          </div>
                        )}
                        {tc.expected_result && (
                          <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">
                            <span className="font-medium text-gray-600">Expected: </span>
                            {tc.expected_result}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">{selectedCaseIndices.size} selected · Will be added to your test cases on save.</p>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="ri-error-warning-line mt-0.5 shrink-0"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: saving ── */}
          {currentStep === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">Saving test cases...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Input step: Generate Titles */}
            {currentStep === 'input' && (
              <button
                onClick={handleGenerateTitles}
                disabled={
                  loading ||
                  (mode === 'text' ? !inputText.trim() : mode === 'jira' ? !canGenerateJira : !selectedSessionId)
                }
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="ri-sparkling-2-fill"></i>
                    Generate Titles
                  </>
                )}
              </button>
            )}

            {/* Titles step: Generate Details */}
            {currentStep === 'titles' && (
              <button
                onClick={handleGenerateDetails}
                disabled={loading || selectedTitles.size === 0}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="ri-sparkling-2-fill"></i>
                    Generate {selectedTitles.size} Cases
                  </>
                )}
              </button>
            )}

            {/* Details step: Save */}
            {currentStep === 'details' && (
              <button
                onClick={handleSave}
                disabled={selectedCaseIndices.size === 0}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="ri-save-line"></i>
                Save {selectedCaseIndices.size} Cases
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
