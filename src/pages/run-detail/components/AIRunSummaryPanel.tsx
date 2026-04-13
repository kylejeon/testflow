import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';


export interface AISummaryCluster {
  name: string;
  count: number;
  rootCause: string;
  severity: 'critical' | 'major' | 'minor';
  testIds: string[];
}

export interface AISummaryResult {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskReason: string;
  narrative: string;
  clusters: AISummaryCluster[];
  recommendations: string[];
  goNoGo: 'GO' | 'NO-GO' | 'CONDITIONAL';
  goNoGoCondition: string;
}

interface JiraConfig {
  domain: string;
  email: string;
  api_token: string;
  issue_type?: string;
  jira_project_key?: string;
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  default_labels: string[];
}

interface AIRunSummaryPanelProps {
  runId: string;
  projectId: string;
  runName: string;
  totalCount: number;
  runDate?: string;
  passedCount?: number;
  failedCount?: number;
  blockedCount?: number;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
  /** Called once summary data is available (so parent can use it for PDF export) */
  onSummaryReady?: (summary: AISummaryResult) => void;
  /** Controlled "include in PDF" state from parent (when undefined, uses internal state) */
  includeInPdf?: boolean;
  onToggleIncludeInPdf?: (v: boolean) => void;
}

export default function AIRunSummaryPanel({
  runId,
  projectId,
  runName,
  totalCount,
  runDate,
  passedCount = 0,
  failedCount = 0,
  blockedCount = 0,
  onClose,
  onToast,
  onSummaryReady,
  includeInPdf: controlledIncludeInPdf,
  onToggleIncludeInPdf,
}: AIRunSummaryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AISummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [reRunning, setReRunning] = useState(false);

  // Integration settings
  const [jiraConfig, setJiraConfig] = useState<JiraConfig | null>(null);
  const [githubConfig, setGithubConfig] = useState<GitHubConfig | null>(null);

  // Jira inline form
  const [jiraPreviewCluster, setJiraPreviewCluster] = useState<AISummaryCluster | null>(null);
  const [jiraCreating, setJiraCreating] = useState(false);

  // GitHub inline form
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [githubTitle, setGithubTitle] = useState('');
  const [githubBody, setGithubBody] = useState('');
  const [githubCreating, setGithubCreating] = useState(false);

  // Export Actions Bar state
  // If parent passes controlled prop, use it; otherwise fall back to local state
  const [_localIncludeInPdf, _setLocalIncludeInPdf] = useState(false);
  const includedInPdf = controlledIncludeInPdf !== undefined ? controlledIncludeInPdf : _localIncludeInPdf;
  const setIncludedInPdf = (v: boolean) => {
    if (onToggleIncludeInPdf) onToggleIncludeInPdf(v);
    else _setLocalIncludeInPdf(v);
  };
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareMode, setShareMode] = useState<'slack' | 'email' | null>(null);
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [shareSlackInput, setShareSlackInput] = useState('');
  const [slackIntegrations, setSlackIntegrations] = useState<{ id: string; channel_name: string; webhook_url?: string }[]>([]);
  const [selectedSlackId, setSelectedSlackId] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const shareMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ── Fetch integration settings ───────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [jiraRes, githubRes, projectRes] = await Promise.all([
        supabase.from('jira_settings')
          .select('domain, email, api_token, issue_type')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('github_settings')
          .select('token, owner, repo, default_labels')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('projects')
          .select('jira_project_key')
          .eq('id', projectId)
          .maybeSingle(),
      ]);

      if (jiraRes.data?.domain && jiraRes.data?.email && jiraRes.data?.api_token) {
        setJiraConfig({ ...jiraRes.data, jira_project_key: projectRes.data?.jira_project_key });
      }
      if (githubRes.data?.token && githubRes.data?.owner && githubRes.data?.repo) {
        setGithubConfig({
          token: githubRes.data.token,
          owner: githubRes.data.owner,
          repo: githubRes.data.repo,
          default_labels: githubRes.data.default_labels || [],
        });
      }
    };
    loadSettings();
  }, [projectId]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: userErr } = await supabase.auth.getUser();
      if (userErr) { setError('Please log in again'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Please log in again'); return; }

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/generate-testcases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'summarize-run', run_id: runId }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errMsg = 'Analysis couldn\'t be completed';
        if (res.status === 429) {
          errMsg = data?.error?.includes?.('Monthly') || data?.error?.includes?.('limit')
            ? `Monthly AI limit reached (${data.usage ?? '?'}/${data.limit ?? '?'})`
            : 'Too many requests. Please wait a moment.';
        } else if (res.status === 403) { errMsg = 'AI Summary requires Starter plan';
        } else if (res.status === 422) { errMsg = 'No test results to analyze';
        } else if (res.status === 401) { console.error('[AIRunSummary] 401 Unauthorized:', data); errMsg = 'Please log in again';
        } else if (data?.error) { errMsg = data.error; }
        setError(errMsg);
        return;
      }

      if (data?.cached) { setSummary(data.summary); onSummaryReady?.(data.summary); return; }
      if (!data?.success || !data?.summary) { setError(data?.error || 'Analysis couldn\'t be completed'); return; }
      setSummary(data.summary);
      onSummaryReady?.(data.summary);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [runId]);

  // Load Slack integrations for Share
  useEffect(() => {
    if (shareMode !== 'slack') return;
    supabase
      .from('integrations')
      .select('id, channel_name, webhook_url')
      .eq('project_id', projectId)
      .eq('type', 'slack')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSlackIntegrations(data);
          setSelectedSlackId(data[0].id);
        }
      });
  }, [shareMode, projectId]);

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShareMenu]);

  // Pre-fill GitHub form when summary is ready
  useEffect(() => {
    if (!summary || !showGithubForm) return;
    const patternLines = summary.clusters
      .map((c, i) => `${i + 1}. **${c.name}** — ${c.count} failures\n   Root cause: ${c.rootCause}`)
      .join('\n');
    const recLines = summary.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n');
    setGithubTitle(`[AI Summary] ${runName}: ${failedCount} failure${failedCount !== 1 ? 's' : ''} detected`);
    setGithubBody(
      `## AI Run Summary — ${runName}\n\n**Risk Level:** ${summary.riskLevel}\n**Pass Rate:** ${passRate}%\n\n### Executive Summary\n${summary.narrative}\n\n### Failure Patterns\n${patternLines}\n\n### Recommendations\n${recLines}\n\n### Go/No-Go: ${summary.goNoGo}\n${summary.goNoGoCondition}\n\n---\n*Generated by Testably AI Run Summary*`
    );
  }, [showGithubForm, summary]);

  // ── Computed values ──────────────────────────────────────────────
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const skippedCount = Math.max(0, totalCount - passedCount - failedCount - blockedCount);

  // ── Markdown builder ─────────────────────────────────────────────
  const buildMarkdown = (): string => {
    if (!summary) return '';
    const metricRows = [
      `| Total | ${totalCount} |`,
      `| Passed | ${passedCount} |`,
      `| Failed | ${failedCount} |`,
      `| Blocked | ${blockedCount} |`,
      `| Skipped | ${skippedCount} |`,
      `| Pass Rate | ${passRate}% |`,
    ].join('\n');

    const patternLines = summary.clusters
      .map((c, i) => `${i + 1}. ${c.name} — ${c.count} failures (${Math.round((c.count / totalCount) * 100)}%)`)
      .join('\n');

    const recLines = summary.recommendations.slice(0, 3)
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n');

    const goNoGoIcon = summary.goNoGo === 'GO' ? '✅' : summary.goNoGo === 'NO-GO' ? '❌' : '⚠️';

    return [
      `## AI Run Summary — ${runName}`,
      `**Risk Level:** ${summary.riskLevel}`,
      `**Pass Rate:** ${passRate}%`,
      '',
      '### Executive Summary',
      summary.narrative,
      '',
      '### Key Metrics',
      '| Metric | Count |',
      '|--------|-------|',
      metricRows,
      '',
      '### Failure Patterns',
      patternLines,
      '',
      '### Recommendations',
      recLines,
      '',
      `### Go/No-Go: ${goNoGoIcon} ${summary.goNoGo}`,
      summary.goNoGoCondition,
    ].join('\n');
  };

  const handleCopyMarkdown = async () => {
    const md = buildMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      onToast('Summary copied to clipboard as Markdown', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCreateJira = async () => {
    if (!jiraPreviewCluster || !jiraConfig) return;
    if (!jiraConfig.jira_project_key) {
      onToast('Jira Project Key is not set for this project. Please edit the project settings.', 'error');
      return;
    }
    setJiraCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { onToast('Please log in again', 'error'); return; }

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

      const resp = await fetch(`${supabaseUrl}/functions/v1/create-jira-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          domain: jiraConfig.domain,
          email: jiraConfig.email,
          apiToken: jiraConfig.api_token,
          projectKey: jiraConfig.jira_project_key,
          summary: `[Bug] ${jiraPreviewCluster.name} Failures — ${jiraPreviewCluster.rootCause}`,
          description: `AI-detected failure cluster from run "${runName}".\n\nRoot cause: ${jiraPreviewCluster.rootCause}\nAffected tests: ${jiraPreviewCluster.count}\n\nDetected by Testably AI Run Summary.\n\n${buildMarkdown()}`,
          issueType: jiraConfig.issue_type || 'Bug',
          priority: { critical: 'Highest', major: 'High', minor: 'Medium' }[jiraPreviewCluster.severity] ?? 'Medium',
          labels: ['ai-detected', 'regression'],
        }),
      });

      const respData = await resp.json();
      if (resp.ok) {
        onToast(`Jira issue${respData.issue?.key ? ` ${respData.issue.key}` : ''} created`, 'success');
        setJiraPreviewCluster(null);
      } else {
        onToast(respData?.error || 'Failed to create Jira issue', 'error');
      }
    } catch {
      onToast('Failed to create Jira issue', 'error');
    } finally {
      setJiraCreating(false);
    }
  };

  const handleCreateGithubIssue = async () => {
    if (!githubConfig || !githubTitle.trim()) return;
    setGithubCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-github-issue', {
        body: {
          token: githubConfig.token,
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          title: githubTitle,
          body: githubBody || undefined,
          labels: githubConfig.default_labels.length > 0 ? githubConfig.default_labels : ['bug', 'ai-summary'],
        },
      });
      if (error) throw error;
      if (data?.success && data?.issue?.number) {
        onToast(`GitHub issue #${data.issue.number} created`, 'success');
        setShowGithubForm(false);
      } else {
        onToast(data?.error || 'Failed to create GitHub issue', 'error');
      }
    } catch {
      onToast('Failed to create GitHub issue', 'error');
    } finally {
      setGithubCreating(false);
    }
  };

  const handleShareSlack = async () => {
    const md = buildMarkdown();
    setShareSending(true);
    try {
      let webhookUrl = shareSlackInput.trim();
      if (!webhookUrl && selectedSlackId) {
        const found = slackIntegrations.find(s => s.id === selectedSlackId);
        webhookUrl = found?.webhook_url ?? '';
      }
      if (!webhookUrl) { onToast('Please enter a Slack webhook URL', 'error'); return; }
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: md }),
      });
      onToast('Summary shared to Slack', 'success');
      setShareMode(null);
    } catch {
      onToast('Failed to send to Slack', 'error');
    } finally {
      setShareSending(false);
    }
  };

  const handleShareEmail = async () => {
    if (!shareEmailInput.trim()) { onToast('Please enter an email address', 'error'); return; }
    setShareSending(true);
    try {
      await supabase.functions.invoke('send-loops-event', {
        body: {
          email: shareEmailInput.trim(),
          eventName: 'shareRunSummary',
          contactProperties: { run_name: runName, summary_markdown: buildMarkdown() },
        },
      });
      onToast(`Summary shared to ${shareEmailInput.trim()}`, 'success');
      setShareMode(null);
      setShareEmailInput('');
    } catch {
      onToast('Failed to send email', 'error');
    } finally {
      setShareSending(false);
    }
  };

  const handleReRunFailed = async () => {
    if (reRunning || failedCount === 0) return;
    setReRunning(true);
    try {
      const { data: failedResults, error: fetchErr } = await supabase
        .from('test_results')
        .select('test_case_id')
        .eq('run_id', runId)
        .eq('status', 'failed');

      if (fetchErr) throw fetchErr;

      const failedTcIds = [...new Set((failedResults || []).map((r: any) => r.test_case_id as string))];
      if (failedTcIds.length === 0) { onToast('No failed test cases found to re-run', 'error'); return; }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error: insertErr } = await supabase
        .from('test_runs')
        .insert([{
          project_id: projectId,
          name: `[Re-run] ${runName} — Failed only`,
          status: 'new',
          progress: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          retest: 0,
          untested: failedTcIds.length,
          test_case_ids: failedTcIds,
          tags: [],
          assignees: user?.id ? [user.id] : [],
          is_automated: false,
          executed_at: new Date().toISOString(),
        }])
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      onToast(`New run created with ${failedTcIds.length} failed test case${failedTcIds.length === 1 ? '' : 's'}`, 'success');
      onClose();
      navigate(`/projects/${projectId}/runs/${inserted.id}`);
    } catch (err: any) {
      onToast(err?.message || 'Failed to create re-run', 'error');
    } finally {
      setReRunning(false);
    }
  };

  // ── Style helpers ────────────────────────────────────────────────
  const riskStyle = (level: string): React.CSSProperties => {
    if (level === 'HIGH')   return { background: '#7F1D1D', color: '#FCA5A5', border: '1px solid #991B1B' };
    if (level === 'MEDIUM') return { background: '#78350F', color: '#FDE68A', border: '1px solid #92400E' };
    return { background: '#14532D', color: '#86EFAC', border: '1px solid #166534' };
  };

  const goNoGoConfig = (verdict: string) => {
    if (verdict === 'GO')    return { bg: '#14532D', border: '#166534', color: '#86EFAC', icon: '✅', label: 'GO' };
    if (verdict === 'NO-GO') return { bg: '#7F1D1D', border: '#991B1B', color: '#FCA5A5', icon: '❌', label: 'NO-GO' };
    return { bg: '#78350F', border: '#92400E', color: '#FDE68A', icon: '⚠️', label: 'CONDITIONAL GO' };
  };

  const clusterDotColor = (severity: string) => {
    if (severity === 'critical') return '#EF4444';
    if (severity === 'major')    return '#F97316';
    return '#EAB308';
  };

  const patternBarColor = (i: number) => {
    if (i === 0) return '#EF4444';
    if (i === 1) return '#F97316';
    if (i === 2) return '#EAB308';
    return '#64748B';
  };

  const actionBtn = (active = false): React.CSSProperties => ({
    background: active ? '#14532D' : '#1E293B',
    border: `1px solid ${active ? '#166534' : '#334155'}`,
    color: active ? '#86EFAC' : '#CBD5E1',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  const ghostBtn: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#64748B',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div
      style={{
        border: '1px solid #4338CA',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
        animation: 'aiPanelSlideDown 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes aiPanelSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiPanelSpin {
          to { transform: rotate(360deg); }
        }
        .ai-spinner {
          border: 2px solid #334155;
          border-top-color: #6366F1;
          border-radius: 50%;
          animation: aiPanelSpin 0.8s linear infinite;
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #312E81, #1E1B4B)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#C7D2FE', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <i className="ri-sparkling-2-fill" style={{ color: '#8B5CF6' }} />
          AI Run Summary
        </h4>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {loading && (
            <>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Analyzing…</span>
              <div className="ai-spinner" style={{ width: 14, height: 14 }} />
            </>
          )}
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px 8px', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            <i className="ri-close-line" />
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div style={{ padding: '18px', background: '#0F172A' }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '28px 18px' }}>
            <div className="ai-spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Analyzing {totalCount} results for patterns…</p>
            <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px', marginBottom: 0 }}>Usually takes 10-15 seconds</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '24px 18px' }}>
            <p style={{ fontSize: '13px', color: '#FCA5A5', marginBottom: '12px' }}>⚠️ {error}</p>
            <button
              onClick={fetchSummary}
              style={{ background: '#1E293B', border: '1px solid #334155', color: '#CBD5E1', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Summary content */}
        {!loading && summary && (
          <>
            {/* Risk badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                  ...riskStyle(summary.riskLevel),
                }}
              >
                <i className="ri-error-warning-fill" /> {summary.riskLevel} RISK
              </span>
              <span style={{ fontSize: '11px', color: '#475569' }}>1 AI credit used</span>
            </div>

            {/* ── 【수정 1】 Key Metrics — 3×2 card grid ─────────────── */}
            {(() => {
              const metrics = [
                { val: totalCount,     lbl: 'Total',     color: '#CBD5E1' },
                { val: passedCount,    lbl: 'Passed',    color: '#4ADE80' },
                { val: failedCount,    lbl: 'Failed',    color: '#F87171' },
                { val: blockedCount,   lbl: 'Blocked',   color: '#FBBF24' },
                { val: `${passRate}%`, lbl: 'Pass Rate', color: passRate >= 90 ? '#4ADE80' : passRate >= 70 ? '#FCD34D' : '#F87171' },
                { val: skippedCount,   lbl: 'Skipped',   color: '#94A3B8' },
              ];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                  {metrics.map((m) => (
                    <div
                      key={m.lbl}
                      style={{ background: '#1E293B', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
                    >
                      <span style={{ fontSize: '22px', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.val}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.lbl}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Executive Summary (narrative) */}
            <div
              style={{
                fontSize: '13px', color: '#CBD5E1', lineHeight: 1.7,
                marginBottom: '16px', padding: '12px 16px',
                background: '#1E293B', borderRadius: '8px',
                borderLeft: '3px solid #8B5CF6',
              }}
            >
              {summary.narrative}
            </div>

            {/* ── 【수정 2】 Failure Patterns — ranked bar chart ─────── */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Failure Patterns
            </div>
            {summary.clusters.length === 0 && (
              <div style={{ fontSize: '13px', color: '#475569', padding: '8px 0' }}>No failure patterns detected.</div>
            )}
            {(() => {
              const maxCount = Math.max(...summary.clusters.map(c => c.count), 1);
              return summary.clusters.map((cluster, i) => {
                const barPct = Math.round((cluster.count / maxCount) * 100);
                const totalPct = totalCount > 0 ? Math.round((cluster.count / totalCount) * 100) : 0;
                const barColor = patternBarColor(i);
                return (
                  <div key={i} style={{ background: '#1E293B', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                    <div style={{ height: 6, background: '#0F172A', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: barColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: barColor, marginRight: 6, verticalAlign: 'middle' }} />
                          {cluster.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: 3 }}>{cluster.rootCause}</div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: barColor }}>{cluster.count}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', marginLeft: 4 }}>({totalPct}%)</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Recommendations */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recommendations
            </div>
            {summary.recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
                <span
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#312E81', color: '#A5B4FC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span>{rec}</span>
              </div>
            ))}

            {/* ── 【수정 4】 Go/No-Go banner ────────────────────────── */}
            {(() => {
              const cfg = goNoGoConfig(summary.goNoGo);
              return (
                <div
                  style={{
                    padding: '14px 16px', borderRadius: '8px',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    marginTop: '14px', background: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}
                >
                  <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: cfg.color, letterSpacing: '0.02em' }}>{cfg.label}</div>
                    {summary.goNoGoCondition && (
                      <div style={{ fontSize: '12px', color: cfg.color, opacity: 0.85, marginTop: '4px', lineHeight: 1.6 }}>
                        {summary.goNoGoCondition}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── 【수정 3】 Consolidated Export Actions Bar ─────────── */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #1E293B',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {/* Copy as Markdown */}
              <button onClick={handleCopyMarkdown} style={actionBtn(copied)}>
                <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
                {copied ? 'Copied!' : 'Copy as Markdown'}
              </button>

              {/* Include in PDF Export */}
              <button
                onClick={() => {
                  setIncludedInPdf(prev => !prev);
                  onToast(includedInPdf ? 'Removed from PDF export' : 'AI summary will be included in PDF export', 'success');
                }}
                style={actionBtn(includedInPdf)}
              >
                <i className={includedInPdf ? 'ri-file-pdf-2-fill' : 'ri-file-pdf-2-line'} />
                {includedInPdf ? 'In PDF ✓' : 'Include in PDF'}
              </button>

              {/* Share… */}
              <div ref={shareMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowShareMenu(prev => !prev)} style={actionBtn(showShareMenu)}>
                  <i className="ri-share-line" />
                  Share…
                  <i className="ri-arrow-down-s-line" style={{ fontSize: '13px', marginLeft: '-2px' }} />
                </button>
                {showShareMenu && (
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                      background: '#1E293B', border: '1px solid #334155', borderRadius: '8px',
                      padding: '4px', zIndex: 20, minWidth: '160px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    {[
                      { key: 'slack', icon: 'ri-slack-line', label: 'Share via Slack' },
                      { key: 'email', icon: 'ri-mail-send-line', label: 'Share via Email' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setShareMode(opt.key as 'slack' | 'email'); setShowShareMenu(false); }}
                        style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'transparent', border: 'none', color: '#CBD5E1', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '6px', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0F172A')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <i className={opt.icon} style={{ fontSize: '14px', color: '#64748B' }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Jira Issue — conditional on jira config */}
              {jiraConfig && summary.clusters.length > 0 && (
                <button
                  onClick={() => setJiraPreviewCluster(
                    jiraPreviewCluster?.name === summary.clusters[0].name ? null : summary.clusters[0]
                  )}
                  style={actionBtn(!!jiraPreviewCluster)}
                >
                  <i className="ri-jira-line" />
                  Create Jira Issue
                </button>
              )}

              {/* Create GitHub Issue — conditional on github config */}
              {githubConfig && (
                <button
                  onClick={() => setShowGithubForm(prev => !prev)}
                  style={actionBtn(showGithubForm)}
                >
                  <i className="ri-github-fill" />
                  Create GitHub Issue
                </button>
              )}

              {/* Re-run Failed Only */}
              <button
                onClick={handleReRunFailed}
                disabled={reRunning || failedCount === 0}
                style={{
                  ...actionBtn(),
                  color: (reRunning || failedCount === 0) ? '#475569' : '#CBD5E1',
                  cursor: (reRunning || failedCount === 0) ? 'not-allowed' : 'pointer',
                  opacity: failedCount === 0 ? 0.4 : 1,
                }}
              >
                {reRunning ? (
                  <>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #475569', borderTopColor: '#94A3B8', display: 'inline-block', animation: 'aiPanelSpin 0.8s linear infinite' }} />
                    Creating…
                  </>
                ) : (
                  <><i className="ri-refresh-line" /> Re-run Failed ({failedCount})</>
                )}
              </button>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Re-generate (ghost, right-aligned) */}
              <button onClick={() => setShowRegenConfirm(true)} style={ghostBtn}>
                <i className="ri-sparkling-2-fill" style={{ color: '#8B5CF6' }} />
                Re-generate
              </button>
            </div>

            {/* ── Inline sub-panels ─────────────────────────────────── */}

            {/* Jira Inline Preview */}
            {jiraPreviewCluster && (
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="ri-jira-line" style={{ marginRight: 6 }} />Creating Jira Issue
                </div>
                <div
                  style={{
                    padding: '12px', background: '#0F172A', borderRadius: '8px',
                    borderLeft: `3px solid ${clusterDotColor(jiraPreviewCluster.severity)}`,
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
                    [Bug] {jiraPreviewCluster.name} Failures — {jiraPreviewCluster.rootCause}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Priority: {jiraPreviewCluster.severity === 'critical' ? 'Critical' : jiraPreviewCluster.severity === 'major' ? 'High' : 'Medium'}
                    {' '}· Labels: ai-detected, regression
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {jiraPreviewCluster.count} related TCs · AI run summary included in description
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setJiraPreviewCluster(null)} style={actionBtn()}>Cancel</button>
                  <button
                    onClick={handleCreateJira}
                    disabled={jiraCreating}
                    style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: jiraCreating ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: jiraCreating ? 0.7 : 1 }}
                  >
                    <i className="ri-jira-line" /> {jiraCreating ? 'Creating…' : 'Create Issue'}
                  </button>
                </div>
              </div>
            )}

            {/* GitHub Inline Form */}
            {showGithubForm && githubConfig && (
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="ri-github-fill" style={{ marginRight: 6 }} />Create GitHub Issue
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Title</label>
                  <input
                    type="text"
                    value={githubTitle}
                    onChange={e => setGithubTitle(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#CBD5E1', padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Body</label>
                  <textarea
                    value={githubBody}
                    onChange={e => setGithubBody(e.target.value)}
                    rows={6}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#CBD5E1', padding: '6px 10px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>
                  <i className="ri-github-fill" style={{ marginRight: 4 }} />
                  Will be created in <strong style={{ color: '#64748B' }}>{githubConfig.owner}/{githubConfig.repo}</strong>
                  {githubConfig.default_labels.length > 0 && (
                    <> · Labels: <strong style={{ color: '#64748B' }}>{githubConfig.default_labels.join(', ')}</strong></>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setShowGithubForm(false)} style={actionBtn()}>Cancel</button>
                  <button
                    onClick={handleCreateGithubIssue}
                    disabled={githubCreating || !githubTitle.trim()}
                    style={{ background: '#1F2937', color: '#F9FAFB', border: '1px solid #374151', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: (githubCreating || !githubTitle.trim()) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (githubCreating || !githubTitle.trim()) ? 0.6 : 1 }}
                  >
                    <i className="ri-github-fill" /> {githubCreating ? 'Creating…' : 'Create Issue'}
                  </button>
                </div>
              </div>
            )}

            {/* Share sub-panel */}
            {shareMode && (
              <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {shareMode === 'slack'
                    ? <><i className="ri-slack-line" style={{ marginRight: 6 }} />Share via Slack</>
                    : <><i className="ri-mail-send-line" style={{ marginRight: 6 }} />Share via Email</>}
                </div>
                {shareMode === 'slack' && (
                  slackIntegrations.length > 0 ? (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Select channel</label>
                      <select
                        value={selectedSlackId}
                        onChange={e => setSelectedSlackId(e.target.value)}
                        style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#CBD5E1', padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit' }}
                      >
                        {slackIntegrations.map(s => (
                          <option key={s.id} value={s.id}>{s.channel_name || 'Unnamed channel'}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Slack Webhook URL</label>
                      <input
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={shareSlackInput}
                        onChange={e => setShareSlackInput(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#CBD5E1', padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                      />
                      <p style={{ fontSize: '11px', color: '#475569', marginTop: 4, marginBottom: 0 }}>
                        No Slack integration found. Connect one in Settings &rsaquo; Integrations, or paste a webhook URL above.
                      </p>
                    </div>
                  )
                )}
                {shareMode === 'email' && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Recipient email</label>
                    <input
                      type="email"
                      placeholder="teammate@company.com"
                      value={shareEmailInput}
                      onChange={e => setShareEmailInput(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', color: '#CBD5E1', padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button onClick={() => setShareMode(null)} style={actionBtn()}>Cancel</button>
                  <button
                    onClick={shareMode === 'slack' ? handleShareSlack : handleShareEmail}
                    disabled={shareSending}
                    style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: shareSending ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: shareSending ? 0.7 : 1 }}
                  >
                    {shareSending ? (
                      <><span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'aiPanelSpin 0.8s linear infinite' }} />Sending…</>
                    ) : (
                      <><i className={shareMode === 'slack' ? 'ri-slack-line' : 'ri-send-plane-line'} />Send</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Re-generate confirmation */}
            {showRegenConfirm && (
              <div style={{ background: '#1E293B', border: '1px solid #4338CA', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>⚡</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#C7D2FE', marginBottom: 4 }}>Re-generate AI Summary?</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.6 }}>
                      This will use <strong style={{ color: '#A5B4FC' }}>1 additional AI credit</strong> from your monthly quota. The existing summary will be replaced.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setShowRegenConfirm(false)} style={actionBtn()}>Cancel</button>
                  <button
                    onClick={() => { setShowRegenConfirm(false); setSummary(null); fetchSummary(); }}
                    style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="ri-sparkling-2-fill" /> Yes, Re-generate
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
