import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';

const labelCls = `block text-xs font-semibold text-slate-600 mb-1`;

interface GitHubPreviewIssue {
  external_id: string;
  title: string;
  category: string;
  external_status: string;
  is_new: boolean;
  external_url?: string;
}

interface Props {
  projectId: string;
  existingExternalIds: string[];
  onClose: () => void;
  onImported: (count: number) => void;
  tier: number;
}

const STATE_OPTIONS = ['open', 'closed', 'all'] as const;

export default function GitHubImportModal({ projectId, existingExternalIds, onClose, onImported, tier }: Props) {
  const [labelFilter, setLabelFilter] = useState('');
  const [stateFilter, setStateFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [previewIssues, setPreviewIssues] = useState<GitHubPreviewIssue[] | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('github_settings')
        .select('token, owner, repo')
        .eq('user_id', user.id)
        .maybeSingle();
      const connected = !!(data?.token && data?.owner && data?.repo);
      setGithubConnected(connected);
      if (connected) setRepoInfo({ owner: data!.owner, repo: data!.repo });
    })();
  }, []);

  const handleFetch = async () => {
    setFetching(true);
    setError(null);
    setPreviewIssues(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-github-issues', {
        body: {
          project_id: projectId,
          label_filter: labelFilter.trim() || undefined,
          state: stateFilter,
          max_results: 100,
          dry_run: true,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const issues: GitHubPreviewIssue[] = (data?.issues || []).map((i: any) => ({
        external_id: String(i.external_id),
        title: i.title,
        category: i.category || '',
        external_status: i.external_status || '',
        is_new: i.is_new,
        external_url: i.external_url,
      }));

      setPreviewIssues(issues);
      setSelectedIssueIds(new Set(issues.filter((i) => i.is_new).map((i) => i.external_id)));
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch GitHub issues.');
    } finally {
      setFetching(false);
    }
  };

  const handleImport = async () => {
    if (selectedIssueIds.size === 0) return;
    setImporting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-github-issues', {
        body: {
          project_id: projectId,
          label_filter: labelFilter.trim() || undefined,
          state: stateFilter,
          max_results: 100,
          dry_run: false,
          issue_numbers: [...selectedIssueIds].map(Number),
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      onImported(data?.imported || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to import requirements.');
      setImporting(false);
    }
  };

  const toggleIssue = (id: string) => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '42rem',
          maxHeight: '85vh',
          background: '#fff',
          borderRadius: '0.875rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <i className="ri-github-fill text-slate-800 text-sm" />
            </div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
              Import Requirements from GitHub
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Not connected */}
          {githubConnected === false && (
            <div className="flex flex-col items-center gap-3 py-12 px-8 text-center">
              <i className="ri-github-fill text-4xl text-slate-300" />
              <p className="text-sm text-slate-600">GitHub is not connected.</p>
              <p className="text-xs text-slate-400">Configure GitHub credentials in Settings to use this feature.</p>
              <Link to="/settings?tab=integrations" className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                <i className="ri-settings-3-line" />
                Go to Settings
              </Link>
            </div>
          )}

          {/* Config step */}
          {githubConnected === true && step === 'config' && (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {repoInfo && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 text-xs">
                  <i className="ri-github-fill" />
                  <span>Repository: <strong>{repoInfo.owner}/{repoInfo.repo}</strong></span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Label Filter</label>
                  <input
                    type="text"
                    value={labelFilter}
                    onChange={(e) => setLabelFilter(e.target.value)}
                    placeholder="e.g. bug, enhancement"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-indigo-300 text-xs"
                  />
                  <p className="text-[0.65rem] text-slate-400 mt-1">Leave blank to import all labels</p>
                </div>
                <div>
                  <label className={labelCls}>Issue State</label>
                  <div className="flex gap-2">
                    {STATE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStateFilter(s)}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          stateFilter === s
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                <i className="ri-information-line text-sm flex-shrink-0 mt-0.5" />
                <span>
                  GitHub Issues will be <strong>linked</strong> as requirements. Pull Requests are automatically excluded.
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                  <i className="ri-error-warning-line" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && previewIssues !== null && (
            <div>
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {previewIssues.length} issues found
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{selectedIssueIds.size} selected</span>
                    <button
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      onClick={() => setSelectedIssueIds(new Set(previewIssues.filter((i) => i.is_new).map((i) => i.external_id)))}
                    >
                      Select new only
                    </button>
                    <button
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      onClick={() => setSelectedIssueIds(new Set(previewIssues.map((i) => i.external_id)))}
                    >
                      Select all
                    </button>
                  </div>
                </div>
              </div>

              {previewIssues.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No issues found for the selected filters.</div>
              ) : (
                previewIssues.map((issue) => {
                  const isSelected = selectedIssueIds.has(issue.external_id);
                  const alreadyImported = existingExternalIds.includes(issue.external_id);
                  return (
                    <label
                      key={issue.external_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.625rem 1.25rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F8FAFC',
                        background: isSelected ? '#F5F3FF' : '#fff',
                        transition: 'background 0.1s',
                      }}
                      className="hover:bg-indigo-50"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIssue(issue.external_id)}
                        className="w-3.5 h-3.5 rounded accent-indigo-600 flex-shrink-0"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500 font-semibold flex-shrink-0">#{issue.external_id}</span>
                          <span className="text-sm text-slate-700 truncate">{issue.title}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {issue.external_status && (
                            <span className={`text-xs font-medium ${issue.external_status === 'open' ? 'text-green-600' : 'text-slate-400'}`}>
                              {issue.external_status}
                            </span>
                          )}
                          {issue.category && <span className="text-xs text-slate-400">{issue.category}</span>}
                        </div>
                      </div>
                      {alreadyImported && (
                        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium flex-shrink-0">
                          Already imported
                        </span>
                      )}
                      {issue.is_new && !alreadyImported && (
                        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-green-100 text-green-600 font-medium flex-shrink-0">
                          New
                        </span>
                      )}
                    </label>
                  );
                })
              )}

              {error && (
                <div className="mx-5 my-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                  <i className="ri-error-warning-line" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {githubConnected === true && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', flexShrink: 0 }}>
            <div>
              {step === 'preview' && (
                <button
                  onClick={() => { setStep('config'); setPreviewIssues(null); setError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <i className="ri-arrow-left-line" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                style={{ padding: '0.4375rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                className="hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              {step === 'config' ? (
                <button
                  onClick={handleFetch}
                  disabled={fetching}
                  style={{
                    padding: '0.4375rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#fff',
                    background: fetching ? '#A5B4FC' : '#6366F1',
                    border: 'none',
                    cursor: fetching ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  {fetching ? <><i className="ri-loader-4-line animate-spin" /> Fetching...</> : <><i className="ri-search-line" /> Fetch Issues</>}
                </button>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={importing || selectedIssueIds.size === 0}
                  style={{
                    padding: '0.4375rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#fff',
                    background: importing || selectedIssueIds.size === 0 ? '#A5B4FC' : '#6366F1',
                    border: 'none',
                    cursor: importing || selectedIssueIds.size === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}
                >
                  {importing ? (
                    <><i className="ri-loader-4-line animate-spin" /> Importing...</>
                  ) : (
                    <><i className="ri-download-line" /> Import {selectedIssueIds.size} Requirement{selectedIssueIds.size !== 1 ? 's' : ''}</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
