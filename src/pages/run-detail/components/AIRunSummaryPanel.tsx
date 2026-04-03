import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';


interface AISummaryCluster {
  name: string;
  count: number;
  rootCause: string;
  severity: 'critical' | 'major' | 'minor';
  testIds: string[];
}

interface AISummaryResult {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskReason: string;
  narrative: string;
  clusters: AISummaryCluster[];
  recommendations: string[];
  goNoGo: 'GO' | 'NO-GO' | 'CONDITIONAL';
  goNoGoCondition: string;
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
}: AIRunSummaryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AISummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [jiraPreviewCluster, setJiraPreviewCluster] = useState<AISummaryCluster | null>(null);
  const [jiraCreating, setJiraCreating] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Please log in again');
        return;
      }

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
          if (data?.error?.includes?.('Monthly') || data?.error?.includes?.('limit')) {
            errMsg = `Monthly AI limit reached (${data.usage ?? '?'}/${data.limit ?? '?'})`;
          } else {
            errMsg = 'Too many requests. Please wait a moment.';
          }
        } else if (res.status === 403) {
          errMsg = 'AI Summary requires Starter plan';
        } else if (res.status === 422) {
          errMsg = 'No test results to analyze';
        } else if (res.status === 401) {
          errMsg = 'Please log in again';
        } else if (data?.error) {
          errMsg = data.error;
        }
        setError(errMsg);
        return;
      }

      if (data?.cached) {
        setSummary(data.summary);
        return;
      }

      if (!data?.success || !data?.summary) {
        setError(data?.error || 'Analysis couldn\'t be completed');
        return;
      }

      setSummary(data.summary);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [runId]);

  const handleCopy = async () => {
    if (!summary) return;
    const clusterMd = summary.clusters
      .map(c => `- **${c.name}** (${c.count}건) — ${c.rootCause}`)
      .join('\n');
    const recMd = summary.recommendations
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n');
    const goNoGoIcon = summary.goNoGo === 'GO' ? '✅' : summary.goNoGo === 'NO-GO' ? '🚫' : '⚠️';
    const md = [
      '## AI Run Summary',
      '',
      `**Risk:** ${summary.riskLevel} — ${summary.riskReason}`,
      '',
      summary.narrative,
      '',
      '### Failure Clusters',
      clusterMd,
      '',
      '### Recommendations',
      recMd,
      '',
      `### Go/No-Go: ${goNoGoIcon} ${summary.goNoGo}`,
      summary.goNoGoCondition,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      onToast('Summary copied as Markdown', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCreateJira = async () => {
    if (!jiraPreviewCluster) return;
    setJiraCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onToast('Please log in again', 'error');
        return;
      }

      // Global Jira credentials (domain, email, api_token, issue_type)
      const { data: jiraCreds } = await supabase
        .from('jira_settings')
        .select('domain, email, api_token, issue_type')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!jiraCreds?.domain) { onToast('Jira not connected: domain missing. Set up in Settings > Integrations.', 'error'); return; }
      if (!jiraCreds?.email)  { onToast('Jira not connected: email missing. Set up in Settings > Integrations.', 'error'); return; }
      if (!jiraCreds?.api_token) { onToast('Jira not connected: API token missing. Set up in Settings > Integrations.', 'error'); return; }

      // Per-project Jira project key (same as FlakyDetector)
      const { data: projectData } = await supabase
        .from('projects')
        .select('jira_project_key')
        .eq('id', projectId)
        .maybeSingle();

      const projectKey = projectData?.jira_project_key;
      if (!projectKey) {
        onToast('Jira Project Key is not set for this project. Please edit the project and enter a Jira Project Key.', 'error');
        return;
      }

      const issueSummary = `[Bug] ${jiraPreviewCluster.name} Failures — ${jiraPreviewCluster.rootCause}`;
      const descriptionText = `AI-detected failure cluster from run "${runName}".\n\nRoot cause: ${jiraPreviewCluster.rootCause}\nAffected tests: ${jiraPreviewCluster.count}\n\nDetected by Testably AI Run Summary.`;
      const priorityMap: Record<string, string> = { critical: 'Critical', major: 'High', minor: 'Medium' };

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
          domain: jiraCreds.domain,
          email: jiraCreds.email,
          apiToken: jiraCreds.api_token,
          projectKey,
          summary: issueSummary,
          description: descriptionText,
          issueType: jiraCreds.issue_type || 'Bug',
          priority: priorityMap[jiraPreviewCluster.severity] ?? 'Medium',
          labels: ['ai-detected', 'regression'],
        }),
      });

      const respData = await resp.json();
      if (resp.ok) {
        const jiraKey = respData.issue?.key;
        onToast(`Jira issue${jiraKey ? ` ${jiraKey}` : ''} created`, 'success');
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

  const clusterDotColor = (severity: string) => {
    if (severity === 'critical') return '#DC2626';
    if (severity === 'major') return '#F59E0B';
    return '#64748B';
  };

  const riskStyle = (level: string): React.CSSProperties => {
    if (level === 'HIGH') return { background: '#7F1D1D', color: '#FCA5A5', border: '1px solid #991B1B' };
    if (level === 'MEDIUM') return { background: '#78350F', color: '#FDE68A', border: '1px solid #92400E' };
    return { background: '#14532D', color: '#86EFAC', border: '1px solid #166534' };
  };

  const goNoGoConfig = (verdict: string) => {
    if (verdict === 'GO') return { bg: '#14532D', border: '#166534', color: '#86EFAC', icon: '✅', label: 'GO' };
    if (verdict === 'NO-GO') return { bg: '#7F1D1D', border: '#991B1B', color: '#FCA5A5', icon: '🚫', label: 'NO-GO' };
    return { bg: '#78350F', border: '#92400E', color: '#FDE68A', icon: '⚠️', label: 'CONDITIONAL GO' };
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
          to { opacity: 1; transform: translateY(0); }
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

      {/* Header */}
      <div
        style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #312E81, #1E1B4B)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h4
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#C7D2FE',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
          }}
        >
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
          {!loading && summary && (
            <button
              onClick={handleCopy}
              style={{
                background: copied ? '#14532D' : '#312E81',
                color: copied ? '#86EFAC' : '#A5B4FC',
                border: `1px solid ${copied ? '#166534' : '#4338CA'}`,
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
            >
              <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <i className="ri-close-line" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px', background: '#0F172A' }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '28px 18px' }}>
            <div className="ai-spinner" style={{ width: 28, height: 28, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
              Analyzing {totalCount} results for patterns…
            </p>
            <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px', marginBottom: 0 }}>
              Usually takes 10-15 seconds
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '24px 18px' }}>
            <p style={{ fontSize: '13px', color: '#FCA5A5', marginBottom: '12px' }}>⚠️ {error}</p>
            <button
              onClick={fetchSummary}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#CBD5E1',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Summary */}
        {!loading && summary && (
          <>
            {/* Run stats header */}
            {(() => {
              const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
              const formattedDate = runDate
                ? new Date(runDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div
                  style={{
                    background: '#1E293B',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '6px 16px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    <i className="ri-calendar-line" style={{ marginRight: '4px', color: '#64748B' }} />
                    {formattedDate}
                  </span>
                  <span style={{ color: '#334155', fontSize: '12px' }}>·</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    <span style={{ fontWeight: 700, color: passRate >= 90 ? '#4ADE80' : passRate >= 70 ? '#FCD34D' : '#F87171' }}>
                      {passRate}%
                    </span>
                    {' '}pass rate
                  </span>
                  <span style={{ color: '#334155', fontSize: '12px' }}>·</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    <span style={{ fontWeight: 600, color: '#CBD5E1' }}>{totalCount}</span> total
                  </span>
                  <span style={{ color: '#334155', fontSize: '12px' }}>·</span>
                  <span style={{ fontSize: '12px', color: '#F87171' }}>
                    <span style={{ fontWeight: 600 }}>{failedCount}</span> failed
                  </span>
                  {blockedCount > 0 && (
                    <>
                      <span style={{ color: '#334155', fontSize: '12px' }}>·</span>
                      <span style={{ fontSize: '12px', color: '#FCD34D' }}>
                        <span style={{ fontWeight: 600 }}>{blockedCount}</span> blocked
                      </span>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Risk badge + credit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  ...riskStyle(summary.riskLevel),
                }}
              >
                <i className="ri-error-warning-fill" /> {summary.riskLevel}
              </span>
              <span style={{ fontSize: '11px', color: '#475569' }}>
                1 AI credit
              </span>
            </div>

            {/* Narrative */}
            <div
              style={{
                fontSize: '13px',
                color: '#CBD5E1',
                lineHeight: 1.7,
                marginBottom: '16px',
                padding: '12px 16px',
                background: '#1E293B',
                borderRadius: '8px',
                borderLeft: '3px solid #8B5CF6',
              }}
            >
              {summary.narrative}
            </div>

            {/* Failure Clusters */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748B',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Failure Clusters
            </div>
            {summary.clusters.map((cluster, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 14px',
                  background: '#1E293B',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 4,
                    background: clusterDotColor(cluster.severity),
                    display: 'inline-block',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>
                    {cluster.name}{' '}
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 400 }}>
                      — {cluster.count}건
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                    {cluster.rootCause}
                  </div>
                </div>
              </div>
            ))}

            {/* Recommendations */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748B',
                margin: '14px 0 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Recommendations
            </div>
            {summary.recommendations.slice(0, 3).map((rec, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px 0',
                  fontSize: '13px',
                  color: '#CBD5E1',
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#312E81',
                    color: '#A5B4FC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span>{rec}</span>
              </div>
            ))}

            {/* Go/No-Go */}
            {(() => {
              const cfg = goNoGoConfig(summary.goNoGo);
              return (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: '14px',
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>
                      {cfg.label}
                    </div>
                    {summary.goNoGoCondition && (
                      <div
                        style={{ fontSize: '12px', color: cfg.color, opacity: 0.85, marginTop: '2px' }}
                      >
                        {summary.goNoGoCondition}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: '1px solid #1E293B',
                flexWrap: 'wrap',
              }}
            >
              {summary.clusters.length > 0 && (
                <button
                  onClick={() =>
                    setJiraPreviewCluster(
                      jiraPreviewCluster?.name === summary.clusters[0].name ? null : summary.clusters[0]
                    )
                  }
                  style={{
                    background: '#312E81',
                    color: '#A5B4FC',
                    border: '1px solid #4338CA',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="ri-jira-line" /> Create Jira for {summary.clusters[0].name}
                </button>
              )}
              <button
                onClick={() => onToast('Re-run feature coming soon', 'success')}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#CBD5E1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="ri-refresh-line" /> Re-run Failed Only
              </button>
            </div>

            {/* Jira Inline Preview */}
            {jiraPreviewCluster && (
              <div
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '16px',
                  marginTop: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748B',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Creating Jira Issue
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: '#0F172A',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${clusterDotColor(jiraPreviewCluster.severity)}`,
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
                    [Bug] {jiraPreviewCluster.name} Failures — {jiraPreviewCluster.rootCause}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Priority:{' '}
                    {jiraPreviewCluster.severity === 'critical'
                      ? 'Critical'
                      : jiraPreviewCluster.severity === 'major'
                      ? 'High'
                      : 'Medium'}{' '}
                    · Labels: ai-detected, regression
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {jiraPreviewCluster.count} related TCs · Root cause from AI analysis included
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => setJiraPreviewCluster(null)}
                    style={{
                      background: '#1E293B',
                      border: '1px solid #334155',
                      color: '#CBD5E1',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateJira}
                    disabled={jiraCreating}
                    style={{
                      background: '#6366F1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: jiraCreating ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: jiraCreating ? 0.7 : 1,
                    }}
                  >
                    <i className="ri-jira-line" /> {jiraCreating ? 'Creating…' : 'Create Issue'}
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
