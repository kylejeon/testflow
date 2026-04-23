/**
 * IssueCreateInlineModal — f002-a 인라인 이슈 생성 모달 (plan-detail 전용)
 *
 * - Jira / GitHub 탭 분기. 프로젝트의 user-level jira_settings / github_settings 를 조회.
 * - 둘 다 없으면 empty state + Settings 링크.
 * - Jira: create-jira-issue Edge Function 호출
 * - GitHub: create-github-issue Edge Function 호출
 *
 * Dev Spec: docs/specs/dev-spec-f001-f002-env-ai-insights.md §AC-H
 * Design Spec: docs/specs/design-spec-f001-f002-env-ai-insights.md §2-4
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ModalShell';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { invokeEdge } from '../lib/aiFetch';

interface IssueCreateInlineModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultTitle: string;
  defaultBody: string;
  envName?: string;
  tcTitle?: string;
}

interface JiraConn {
  domain: string;
  email: string;
  api_token: string;
  project_key: string | null;
  issue_type: string | null;
}
interface GithubConn {
  token: string;
  owner: string;
  repo: string;
  default_labels: string[] | null;
}

type Tab = 'jira' | 'github';

export default function IssueCreateInlineModal({
  open,
  onClose,
  projectId,
  defaultTitle,
  defaultBody,
  // envName / tcTitle: reserved for future analytics; currently unused in UI.
  envName: _envName,
  tcTitle: _tcTitle,
}: IssueCreateInlineModalProps) {
  void _envName;
  void _tcTitle;
  const { t } = useTranslation(['projects', 'common']);
  const { showToast } = useToast();

  const [loadingConn, setLoadingConn] = useState(true);
  const [jira, setJira] = useState<JiraConn | null>(null);
  const [github, setGithub] = useState<GithubConn | null>(null);
  const [tab, setTab] = useState<Tab>('jira');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [labels, setLabels] = useState<string[]>(['testably', 'env-coverage']);
  const [labelInput, setLabelInput] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [projectKey, setProjectKey] = useState<string>('');
  const [repo, setRepo] = useState<string>('');
  const [titleTouched, setTitleTouched] = useState(false);

  const initialised = useRef(false);

  // Sync default props into internal state when open changes
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setBody(defaultBody);
      setErrorMsg(null);
      setSubmitting(false);
      setTitleTouched(false);
      initialised.current = true;
    }
  }, [open, defaultTitle, defaultBody]);

  // Load Jira / GitHub settings
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoadingConn(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoadingConn(false);
          return;
        }
        const [jiraRes, ghRes] = await Promise.all([
          supabase.from('jira_settings')
            .select('domain, email, api_token, project_key, issue_type')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase.from('github_settings')
            .select('token, owner, repo, default_labels')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const j = jiraRes.data && jiraRes.data.domain ? jiraRes.data as JiraConn : null;
        const g = ghRes.data && ghRes.data.token ? ghRes.data as GithubConn : null;
        setJira(j);
        setGithub(g);

        // Tab default: Jira first if connected, else GitHub
        if (j) setTab('jira');
        else if (g) setTab('github');

        if (j?.project_key) setProjectKey(j.project_key);
        if (g?.repo) setRepo(g.repo);
        if (g?.default_labels && g.default_labels.length > 0) {
          // Merge default labels preserving existing ones
          const merged = [...new Set([...labels, ...g.default_labels])];
          setLabels(merged);
        }
      } catch (err) {
        console.error('[IssueCreateInlineModal] load conn failed:', err);
      } finally {
        if (!cancelled) setLoadingConn(false);
      }
    })();
    return () => { cancelled = true; };
    // labels is intentionally not in deps to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAddLabel = () => {
    const v = labelInput.trim().replace(/\s+/g, '-');
    if (!v) return;
    if (labels.includes(v)) {
      setLabelInput('');
      return;
    }
    setLabels([...labels, v]);
    setLabelInput('');
  };

  const handleRemoveLabel = (target: string) => {
    setLabels(labels.filter((l) => l !== target));
  };

  const handleLabelKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    } else if (e.key === 'Backspace' && labelInput === '' && labels.length > 0) {
      e.preventDefault();
      setLabels(labels.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    setTitleTouched(true);
    if (!title.trim()) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (tab === 'jira' && jira) {
        const { data, error } = await invokeEdge<{ success?: boolean; issue?: { key: string }; error?: string }>('create-jira-issue', {
          body: {
            domain: jira.domain,
            email: jira.email,
            apiToken: jira.api_token,
            projectKey: projectKey || jira.project_key || '',
            summary: title,
            description: body,
            issueType: jira.issue_type || 'Bug',
            priority,
            labels,
          },
        });
        if (error) throw error;
        if (!data?.success || !data?.issue?.key) {
          throw new Error(data?.error || 'Unknown error');
        }
        const issueUrl = `https://${jira.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/browse/${data.issue.key}`;
        showToast(t('projects:plan.env.ai.issueCreatedWithLink') + ' ' + issueUrl, 'success');
        onClose();
      } else if (tab === 'github' && github) {
        const repoName = repo || github.repo;
        const [repoOwner, repoShort] = repoName.includes('/')
          ? repoName.split('/')
          : [github.owner, repoName];
        const { data, error } = await invokeEdge<{ success?: boolean; issue?: { number: number; html_url: string }; error?: string }>('create-github-issue', {
          body: {
            token: github.token,
            owner: repoOwner,
            repo: repoShort,
            title,
            body,
            labels,
            project_id: projectId,
          },
        });
        if (error) throw error;
        if (!data?.success || !data?.issue?.number) {
          throw new Error(data?.error || 'Unknown error');
        }
        showToast(t('projects:plan.env.ai.issueCreatedWithLink') + ' ' + data.issue.html_url, 'success');
        onClose();
      } else {
        throw new Error('No integration connected');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      setErrorMsg(t('projects:plan.env.ai.issueCreateFailed', { detail: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const hasJira = !!jira;
  const hasGithub = !!github;
  const hasAny = hasJira || hasGithub;

  // Ensure tab is valid
  const effectiveTab: Tab = tab === 'jira' && !hasJira && hasGithub ? 'github'
    : tab === 'github' && !hasGithub && hasJira ? 'jira'
    : tab;

  return (
    <ModalShell onClose={onClose} panelClassName="w-full max-w-[520px] bg-white rounded-2xl shadow-[0_25px_60px_0_rgba(0,0,0,0.2)]">
      <div role="dialog" aria-modal="true" aria-labelledby="issue-modal-title">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="issue-modal-title" className="text-base font-semibold text-gray-900">
            {t('projects:plan.env.ai.issueModalTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
            aria-label={t('projects:plan.env.ai.issueModalCancel')}
          >
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {loadingConn ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {t('projects:plan.env.ai.issueModalLoading')}
            </div>
          ) : !hasAny ? (
            <div className="py-12 text-center">
              <i className="ri-links-line text-5xl text-gray-300" aria-hidden="true" />
              <div className="text-sm font-semibold text-gray-900 mt-4">
                {t('projects:plan.env.ai.issueModalNoIntegration')}
              </div>
              <div className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                {t('projects:plan.env.ai.issueModalNoIntegrationDetail')}
              </div>
              <Link
                to="/settings?tab=integrations"
                className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg"
                onClick={onClose}
              >
                <i className="ri-arrow-right-line" aria-hidden="true" />
                {t('projects:plan.env.ai.issueModalGoSettings')}
              </Link>
            </div>
          ) : (
            <>
              {/* Tabs */}
              {hasJira && hasGithub && (
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'jira'}
                    onClick={() => setTab('jira')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      effectiveTab === 'jira'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <i className="ri-stack-line" aria-hidden="true" style={{ color: effectiveTab === 'jira' ? '#0052CC' : '#9CA3AF' }} />
                    {t('projects:plan.env.ai.issueModalTabJira')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={effectiveTab === 'github'}
                    onClick={() => setTab('github')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      effectiveTab === 'github'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <i className="ri-github-fill" aria-hidden="true" style={{ color: effectiveTab === 'github' ? '#111827' : '#9CA3AF' }} />
                    {t('projects:plan.env.ai.issueModalTabGithub')}
                  </button>
                </div>
              )}

              {/* Jira project key / GitHub repo */}
              {effectiveTab === 'jira' && hasJira && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('projects:plan.env.ai.issueModalProjectKey')}
                  </label>
                  <input
                    type="text"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-colors disabled:opacity-50"
                    placeholder="TESTABLY"
                  />
                </div>
              )}
              {effectiveTab === 'github' && hasGithub && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('projects:plan.env.ai.issueModalRepo')}
                  </label>
                  <input
                    type="text"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-colors disabled:opacity-50"
                    placeholder="owner/repo"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('projects:plan.env.ai.issueModalTitleField')}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTitleTouched(true)}
                  disabled={submitting}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 transition-colors disabled:opacity-50 ${
                    titleTouched && !title.trim()
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-violet-500 focus:ring-violet-200'
                  }`}
                />
                {titleTouched && !title.trim() && (
                  <p className="text-xs text-red-500 mt-1">
                    {t('projects:plan.env.ai.issueModalTitleRequired')}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('projects:plan.env.ai.issueModalDescriptionField')}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={submitting}
                  rows={7}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-colors disabled:opacity-50 font-mono leading-relaxed resize-y min-h-[140px]"
                  style={{ fontSize: '12.5px' }}
                />
              </div>

              {/* Labels */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('projects:plan.env.ai.issueModalLabelsField')}
                </label>
                <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border border-gray-300 rounded-lg focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200 transition-colors">
                  {labels.map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200"
                    >
                      {l}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(l)}
                        className="hover:text-violet-900 cursor-pointer"
                        aria-label={`Remove ${l}`}
                      >
                        <i className="ri-close-line text-xs" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={handleLabelKey}
                    disabled={submitting}
                    className="flex-1 min-w-[100px] text-sm outline-none bg-transparent disabled:opacity-50"
                    placeholder={t('projects:plan.env.ai.issueModalLabelsPlaceholder')}
                  />
                </div>
              </div>

              {/* Priority — Jira only */}
              {effectiveTab === 'jira' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('projects:plan.env.ai.issueModalPriorityField')}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    disabled={submitting}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-colors disabled:opacity-50 bg-white"
                  >
                    <option value="High">{t('projects:plan.env.ai.issueModalPriorityHigh')}</option>
                    <option value="Medium">{t('projects:plan.env.ai.issueModalPriorityMedium')}</option>
                    <option value="Low">{t('projects:plan.env.ai.issueModalPriorityLow')}</option>
                  </select>
                </div>
              )}

              {/* Error banner */}
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  <i className="ri-alert-line mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1">{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {hasAny && !loadingConn && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('projects:plan.env.ai.issueModalCancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 rounded-lg shadow-[0_2px_8px_rgba(124,58,237,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-1.5" aria-hidden="true" />
                  {t('projects:plan.env.ai.issueModalCreating')}
                </>
              ) : (
                t('projects:plan.env.ai.issueModalCreate')
              )}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

