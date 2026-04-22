import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { type AnyStep, isSharedStepRef } from '../types/shared-steps';
import { expandFlatSteps, type SharedStepCache } from '../lib/expandSharedSteps';
import { formatRelativeTime } from '../lib/formatRelativeTime';

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';

export interface FocusTestCase {
  id: string;
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  precondition?: string;
  runStatus?: TestStatus;
  // Tier 2 metadata bar fields
  customId?: string;
  folder?: string;
  priority?: string;
  tags?: string;
  assignee?: string;
  attachments?: { name: string; url: string; size: number }[];
}

interface FocusModeProps {
  tests: FocusTestCase[];
  runName: string;
  onStatusChange: (testId: string, status: TestStatus, note?: string) => Promise<void>;
  onExit: () => void;
  initialIndex?: number;
  ssLatestVersions?: Record<string, { version: number; custom_id: string; name: string; steps: { step: string; expectedResult: string }[] }>;
  runCompleted?: boolean;
  onUpdateSharedStep?: (tcId: string, ssId: string) => Promise<void>;
}

// ── Design tokens ──────────────────────────────────────────────────────────────

// STATUS_BUTTONS moved inside the component as `useMemo` (Phase 3 AC-10) so
// `label` can read `common.passed|failed|blocked|retest` + focusMode.skip.
// Keyboard `key` (P / F / B / R / S) remain English (AC-12).

// Status icon config for sidebar TC list (22px circles)
const STATUS_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  passed:   { icon: 'ri-check-line',      bg: '#DCFCE7', color: '#16A34A' },
  failed:   { icon: 'ri-close-line',      bg: '#FEE2E2', color: '#DC2626' },
  blocked:  { icon: 'ri-forbid-line',     bg: '#FEF3C7', color: '#D97706' },
  retest:   { icon: 'ri-refresh-line',    bg: '#EDE9FE', color: '#7C3AED' },
  untested: { icon: 'ri-subtract-line',   bg: '#F1F5F9', color: '#94A3B8' },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#94A3B8',
};
const PRIORITY_TEXT_COLOR: Record<string, string> = {
  critical: '#991B1B', high: '#92400E', medium: '#3730A3', low: '#64748B',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSteps(raw?: string, expectedResultRaw?: string): { step: string; expectedResult: string }[] {
  if (!raw) return [];
  const expectedArr = expectedResultRaw ? expectedResultRaw.split('\n').filter(Boolean) : [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s: any, i: number) => ({
        step: s.step || s.action || '',
        // Per-step expectedResult from JSON, with fallback to top-level expected_result line
        expectedResult:
          s.expectedResult || s.expected_result ||
          (expectedArr[i] || '').replace(/^\d+\.\s*/, ''),
      }));
    }
  } catch {}
  // Plain-text steps: zip with lines from top-level expected_result field
  const stepsArr = raw.split('\n').filter(Boolean);
  return stepsArr.map((s, i) => ({
    step: s.replace(/^\d+\.\s*/, ''),
    expectedResult: (expectedArr[i] || '').replace(/^\d+\.\s*/, ''),
  }));
}

function isImageFile(name: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * FocusMode — Sidebar + 3-Tier fullscreen test execution.
 *
 * NEW: 280px collapsible sidebar (TC list, progress, filters, search)
 * Tier 1 (Main body):  Precondition → Attachments → Steps w/ P/F buttons → Note
 * Tier 2 (Meta bar):   TC-ID · Folder · Priority · Tags · Assignee (40px fixed bar)
 * Tier 3 (Collapsible): Comments (C key) + Execution History (H key)
 *
 * Keyboard: P/F/B/R/S = status, N = note, C = comments, H = history,
 *           J/K = next/prev, [ = sidebar, / = search, Esc = exit
 */
export function FocusMode({ tests, runName, onStatusChange, onExit, initialIndex = 0, ssLatestVersions = {}, runCompleted = false, onUpdateSharedStep }: FocusModeProps) {
  const { t } = useTranslation(['common', 'runs']);

  // Phase 3 AC-10: STATUS_BUTTONS with translated labels (common.* reused,
  // untested row uses focusMode.skip — carries 'Skip' copy, not 'Untested').
  const STATUS_BUTTONS = useMemo<{
    status: TestStatus;
    label: string;
    key: string;
    icon: string;
    bg: string;
    hoverBg: string;
  }[]>(() => [
    { status: 'passed',   label: t('common:passed'),                        key: 'P', icon: 'ri-check-line',         bg: '#22C55E', hoverBg: '#16A34A' },
    { status: 'failed',   label: t('common:failed'),                        key: 'F', icon: 'ri-close-line',          bg: '#EF4444', hoverBg: '#DC2626' },
    { status: 'blocked',  label: t('common:blocked'),                       key: 'B', icon: 'ri-forbid-line',         bg: '#F59E0B', hoverBg: '#D97706' },
    { status: 'retest',   label: t('common:retest'),                        key: 'R', icon: 'ri-refresh-line',        bg: '#8B5CF6', hoverBg: '#7C3AED' },
    { status: 'untested', label: t('runs:detail.focusMode.statusButton.skip'), key: 'S', icon: 'ri-skip-forward-line',   bg: '#94A3B8', hoverBg: '#64748B' },
  ], [t]);

  // Phase 3 AC-10: Keyboard hint groups — characters stay English (AC-12).
  const KBD_HINTS_PANEL = useMemo(() => [
    { key: 'C', label: t('runs:detail.focusMode.kbdHint.comments') },
    { key: 'H', label: t('runs:detail.focusMode.kbdHint.history') },
    { key: 'N', label: t('runs:detail.focusMode.kbdHint.note') },
  ], [t]);
  const KBD_HINTS_NAV = useMemo(() => [
    { key: '[', label: t('runs:detail.focusMode.kbdHint.sidebar') },
    { key: '/', label: t('common:search') },
  ], [t]);

  const [index, setIndex] = useState(initialIndex);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<TestStatus | null>(null);
  const [noteInputFocused, setNoteInputFocused] = useState(false);
  const [stepResults, setStepResults] = useState<Record<string, Record<number, 'passed' | 'failed'>>>({});
  const [openPanel, setOpenPanel] = useState<'none' | 'comments' | 'history'>('none');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [tcComments, setTcComments] = useState<Record<string, { id: string; text: string; author: string; timestamp: Date }[]>>({});
  const [tcHistory, setTcHistory] = useState<Record<string, { id: string; status: string; runName: string; author: string; timestamp: Date; note?: string }[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [focusToast, setFocusToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | TestStatus>('all');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sharedStepsCaches, setSharedStepsCaches] = useState<Record<string, SharedStepCache>>({});

  // ── SS version banner state ───────────────────────────────────────────────
  const [ssBannerDismissedForTc, setSsBannerDismissedForTc] = useState<Set<string>>(new Set());
  const [showSsDiff, setShowSsDiff] = useState(false);
  const [ssDiffData, setSsDiffData] = useState<{ ssId: string; customId: string; name: string; currentVersion: number; latestVersion: number; currentSteps: { step: string; expectedResult: string }[]; latestSteps: { step: string; expectedResult: string }[] } | null>(null);

  // GitHub / Jira integration state
  const [githubSettings, setGithubSettings] = useState<{ token: string; owner: string; repo: string; default_labels: string[]; auto_create_enabled: boolean; auto_assign_enabled: boolean; assignee_username?: string } | null>(null);
  const [jiraSettings, setJiraSettings] = useState<{ domain: string; email: string; api_token: string; project_key: string; issue_type: string; auto_create_on_failure: string } | null>(null);
  // Track created GitHub issues per TC: tcId → { number, html_url }
  const [createdGithubIssues, setCreatedGithubIssues] = useState<Record<string, { number: number; html_url: string }>>({});
  const [creatingGithubIssue, setCreatingGithubIssue] = useState(false);
  const [showGithubIssueModal, setShowGithubIssueModal] = useState(false);
  const [githubIssueTitle, setGithubIssueTitle] = useState('');

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fetchedCacheIds = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);
  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const tcRefs = useRef<(HTMLDivElement | null)[]>([]);

  const test = tests[index];
  const progress = (index / tests.length) * 100;

  // Parse steps — expand SharedStepRefs using cache, fall back to plain-text parse
  const steps = (() => {
    if (!test?.steps) return [] as { step: string; expectedResult: string }[];
    try {
      const p = JSON.parse(test.steps);
      if (Array.isArray(p)) return expandFlatSteps(p as AnyStep[], sharedStepsCaches[test.id] || {});
    } catch {}
    return parseSteps(test?.steps, test?.expected_result);
  })();
  const currentStepResults = stepResults[test?.id] || {};
  const passedStepCount = Object.values(currentStepResults).filter((v) => v === 'passed').length;

  // Image attachments only (for lightbox navigation)
  const imageAttachments = (test?.attachments || []).filter((f) => isImageFile(f.name));

  // Sidebar computed values
  const completedCount = tests.filter(tc => tc.runStatus && tc.runStatus !== 'untested').length;
  const filteredSidebarTests = tests.filter(tc => {
    const status = tc.runStatus || 'untested';
    if (sidebarFilter !== 'all' && status !== sidebarFilter) return false;
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      return tc.title.toLowerCase().includes(q) || (tc.customId || '').toLowerCase().includes(q);
    }
    return true;
  });

  const showFocusToast = useCallback((type: 'success' | 'error', message: string) => {
    setFocusToast({ type, message });
    setTimeout(() => setFocusToast(null), type === 'success' ? 3000 : 5000);
  }, []);

  // ── Load GitHub / Jira settings on mount ─────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [ghResult, jiraResult] = await Promise.all([
        supabase.from('github_settings')
          .select('token, owner, repo, default_labels, auto_create_enabled, auto_assign_enabled, assignee_username')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('jira_settings')
          .select('domain, email, api_token, project_key, issue_type, auto_create_on_failure')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (ghResult.data?.token) setGithubSettings({ ...ghResult.data, default_labels: ghResult.data.default_labels || [] });
      if (jiraResult.data?.domain) setJiraSettings(jiraResult.data);
    })();
  }, []);

  const createGithubIssue = useCallback(async (tc: FocusTestCase, titleOverride?: string) => {
    if (!githubSettings?.token) return;
    setCreatingGithubIssue(true);
    try {
      const title = titleOverride || `[Test Failed] ${tc.customId ? `${tc.customId} - ` : ''}${tc.title}`;
      const { data, error } = await supabase.functions.invoke('create-github-issue', {
        body: {
          token: githubSettings.token,
          owner: githubSettings.owner,
          repo: githubSettings.repo,
          title,
          body: `**Auto-created by Testably (Focus Mode)**\n\nTest Case: ${tc.title}\nPriority: ${tc.priority || 'N/A'}\n\n---\n${tc.description || ''}`,
          labels: githubSettings.default_labels.length > 0 ? githubSettings.default_labels : ['bug'],
          assignee: githubSettings.auto_assign_enabled && githubSettings.assignee_username ? githubSettings.assignee_username : undefined,
        },
      });
      if (error) throw error;
      if (data?.success && data?.issue?.number) {
        setCreatedGithubIssues(prev => ({ ...prev, [tc.id]: { number: data.issue.number, html_url: data.issue.html_url } }));
        showFocusToast('success', t('runs:toast.githubCreated', { number: data.issue.number }));
      } else {
        throw new Error(data?.error || t('runs:toast.githubCreateFailed', { reason: t('common:unknownError') }));
      }
    } catch (err: any) {
      showFocusToast('error', t('runs:toast.githubCreateFailed', { reason: err?.message || t('common:unknownError') }));
    } finally {
      setCreatingGithubIssue(false);
    }
  }, [githubSettings, showFocusToast, t]);

  // ── Shared step content fetcher ───────────────────────────────────────────
  useEffect(() => {
    if (!test?.id || !test?.steps) return;
    if (fetchedCacheIds.current.has(test.id)) return;
    let parsed: AnyStep[] | null = null;
    try {
      const p = JSON.parse(test.steps);
      if (Array.isArray(p)) parsed = p as AnyStep[];
    } catch {}
    if (!parsed) return;
    const refs = parsed.filter(isSharedStepRef);
    if (refs.length === 0) return;
    fetchedCacheIds.current.add(test.id);
    const ids = [...new Set(refs.map((r) => r.shared_step_id))];
    (async () => {
      const { data } = await supabase
        .from('shared_steps')
        .select('id, name, custom_id, steps, version')
        .in('id', ids);
      if (!data) return;
      const cache: SharedStepCache = {};
      data.forEach((ss: any) => {
        cache[ss.id] = { name: ss.name, custom_id: ss.custom_id, steps: ss.steps };
        cache[`${ss.id}:${ss.version}`] = { name: ss.name, custom_id: ss.custom_id, steps: ss.steps };
      });
      const outdatedRefs = refs.filter((r) => {
        const latest = data.find((ss: any) => ss.id === r.shared_step_id);
        return latest && r.shared_step_version < latest.version;
      });
      if (outdatedRefs.length > 0) {
        const results = await Promise.all(
          outdatedRefs.map((r) =>
            supabase.from('shared_step_versions').select('steps')
              .eq('shared_step_id', r.shared_step_id).eq('version', r.shared_step_version)
              .maybeSingle().then(({ data: hist }) => ({ ref: r, steps: hist?.steps ?? null }))
          )
        );
        results.forEach(({ ref, steps }) => {
          if (steps) {
            const latest = data.find((ss: any) => ss.id === ref.shared_step_id)!;
            cache[`${ref.shared_step_id}:${ref.shared_step_version}`] = { name: latest.name, custom_id: latest.custom_id, steps };
          }
        });
      }
      setSharedStepsCaches((prev) => ({ ...prev, [test.id]: cache }));
    })();
  }, [test?.id]);

  // ── Sidebar auto-scroll to active TC ─────────────────────────────────────
  useEffect(() => {
    tcRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    noteRef.current?.blur();
  }, [index]);

  // ── Navigation reset ──────────────────────────────────────────────────────
  const resetForNavigation = useCallback(() => {
    setOpenPanel('none');
    setNote('');
    setLightboxUrl(null);
    setShowSsDiff(false);
    setSsDiffData(null);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, []);

  // ── Supabase data fetchers ────────────────────────────────────────────────
  const fetchComments = useCallback(async (tcId: string) => {
    if (tcComments[tcId] !== undefined) return;
    setLoadingComments(true);
    try {
      const { data } = await supabase
        .from('test_case_comments')
        .select(`id, comment, created_at, user_id, profiles:user_id (email, full_name)`)
        .eq('test_case_id', tcId)
        .order('created_at', { ascending: false });
      setTcComments((prev) => ({
        ...prev,
        [tcId]: (data || []).map((item: any) => ({
          id: item.id,
          text: item.comment,
          author: item.profiles?.full_name || item.profiles?.email || 'Unknown',
          timestamp: new Date(item.created_at),
        })),
      }));
    } catch {
      setTcComments((prev) => ({ ...prev, [tcId]: [] }));
    } finally {
      setLoadingComments(false);
    }
  }, [tcComments]);

  const fetchHistory = useCallback(async (tcId: string) => {
    if (tcHistory[tcId] !== undefined) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('test_results')
        .select(`id, status, note, author, created_at, run:runs(id, name)`)
        .eq('test_case_id', tcId)
        .order('created_at', { ascending: false })
        .limit(10);
      setTcHistory((prev) => ({
        ...prev,
        [tcId]: (data || []).map((item: any) => ({
          id: item.id,
          status: item.status,
          runName: item.run?.name || t('common:detailPanel.results.unknownRun'),
          author: item.author || '',
          timestamp: new Date(item.created_at),
          note: item.note || '',
        })),
      }));
    } catch {
      setTcHistory((prev) => ({ ...prev, [tcId]: [] }));
    } finally {
      setLoadingHistory(false);
    }
  }, [tcHistory]);

  // Auto-load when panel opens
  useEffect(() => {
    if (!test?.id) return;
    if (openPanel === 'comments') fetchComments(test.id);
    if (openPanel === 'history') fetchHistory(test.id);
  }, [openPanel, test?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const markAndNext = useCallback(
    async (status: TestStatus) => {
      if (!test) return;
      // Skip: if TC already has a result, just move to next without overwriting
      if (status === 'untested' && test.runStatus && test.runStatus !== 'untested') {
        setPending(null);
        resetForNavigation();
        setTimeout(() => {
          setIndex((i) => Math.min(i + 1, tests.length - 1));
        }, 300);
        return;
      }
      setPending(status);
      try {
        await onStatusChange(test.id, status, note.trim() || undefined);
      } catch (err) {
        console.error('[FocusMode] Status change failed:', err);
        showFocusToast('error', err instanceof Error ? err.message : t('runs:detail.focusMode.toast.saveFailed'));
        setPending(null);
        return; // 실패 시 다음 TC로 이동하지 않음
      }

      // Auto-create GitHub issue on failure
      if (status === 'failed' && githubSettings?.auto_create_enabled && !createdGithubIssues[test.id]) {
        createGithubIssue(test);
      }

      setPending(null);
      resetForNavigation();
      setTimeout(() => {
        setIndex((i) => Math.min(i + 1, tests.length - 1));
      }, 300);
    },
    [test, note, onStatusChange, tests.length, resetForNavigation, showFocusToast, githubSettings, createdGithubIssues, createGithubIssue, t]
  );

  const goNext = useCallback(() => {
    resetForNavigation();
    setIndex((i) => Math.min(i + 1, tests.length - 1));
  }, [tests.length, resetForNavigation]);

  const goPrev = useCallback(() => {
    resetForNavigation();
    setIndex((i) => Math.max(i - 1, 0));
  }, [resetForNavigation]);

  const handleStepResult = (stepIndex: number, result: 'passed' | 'failed' | null) => {
    setStepResults((prev) => {
      const tc = { ...(prev[test.id] || {}) };
      if (result === null) delete tc[stepIndex];
      else tc[stepIndex] = result;
      return { ...prev, [test.id]: tc };
    });
  };

  // ── SS version helpers ────────────────────────────────────────────────────
  // Get outdated SharedStepRefs for the current test
  const getOutdatedRefsForCurrentTest = () => {
    if (!test?.steps) return [] as any[];
    try {
      const p = JSON.parse(test.steps);
      if (!Array.isArray(p)) return [];
      return p.filter((s: any) => {
        if (s.type !== 'shared_step_ref') return false;
        const latest = ssLatestVersions[s.shared_step_id];
        return latest && s.shared_step_version != null && latest.version > s.shared_step_version;
      });
    } catch { return []; }
  };

  const handleShowSsDiff = async (ref: any) => {
    const latest = ssLatestVersions[ref.shared_step_id];
    if (!latest) return;
    // Fetch old version steps
    const { data } = await supabase
      .from('shared_step_versions')
      .select('steps')
      .eq('shared_step_id', ref.shared_step_id)
      .eq('version', ref.shared_step_version)
      .maybeSingle();
    setSsDiffData({
      ssId: ref.shared_step_id,
      customId: ref.shared_step_custom_id,
      name: ref.shared_step_name,
      currentVersion: ref.shared_step_version,
      latestVersion: latest.version,
      currentSteps: data?.steps || [],
      latestSteps: latest.steps,
    });
    setShowSsDiff(true);
  };

  const handleUpdateInFocusMode = async (ref: any) => {
    if (!test || !onUpdateSharedStep) return;
    await onUpdateSharedStep(test.id, ref.shared_step_id);
    setSsBannerDismissedForTc(prev => new Set([...prev, test.id]));
    setShowSsDiff(false);
    setSsDiffData(null);
    // Refresh the shared steps cache for this TC
    fetchedCacheIds.current.delete(test.id);
  };

  const openLightbox = (url: string) => {
    const idx = imageAttachments.findIndex((f) => f.url === url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxUrl(url);
  };

  const lightboxPrev = () => {
    const newIdx = (lightboxIndex - 1 + imageAttachments.length) % imageAttachments.length;
    setLightboxIndex(newIdx);
    setLightboxUrl(imageAttachments[newIdx].url);
  };

  const lightboxNext = () => {
    const newIdx = (lightboxIndex + 1) % imageAttachments.length;
    setLightboxIndex(newIdx);
    setLightboxUrl(imageAttachments[newIdx].url);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxUrl) {
        if (e.key === 'Escape') { setLightboxUrl(null); return; }
        if (e.key === 'ArrowLeft') { lightboxPrev(); return; }
        if (e.key === 'ArrowRight') { lightboxNext(); return; }
        return;
      }

      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (pending) markAndNext(pending);
        }
        if (e.key === 'Escape') {
          // If search has text, clear it first; otherwise blur
          if (document.activeElement === sidebarSearchRef.current && sidebarSearch) {
            setSidebarSearch('');
          } else {
            (document.activeElement as HTMLElement).blur();
            setNoteInputFocused(false);
          }
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p': e.preventDefault(); markAndNext('passed'); break;
        case 'f':
          e.preventDefault();
          setPending('failed');
          setTimeout(() => noteRef.current?.focus(), 50);
          break;
        case 'b': e.preventDefault(); markAndNext('blocked'); break;
        case 'r': e.preventDefault(); markAndNext('retest'); break;
        case 's': e.preventDefault(); markAndNext('untested'); break;
        case 'n':
          e.preventDefault();
          noteRef.current?.focus();
          break;
        case 'c': e.preventDefault(); setOpenPanel((v) => v === 'comments' ? 'none' : 'comments'); break;
        case 'h': e.preventDefault(); setOpenPanel((v) => v === 'history' ? 'none' : 'history'); break;
        case '[':
          e.preventDefault();
          setSidebarOpen(v => !v);
          break;
        case '/':
          e.preventDefault();
          if (!sidebarOpen) setSidebarOpen(true);
          setTimeout(() => sidebarSearchRef.current?.focus(), 50);
          break;
        case 'j':
        case 'arrowright': e.preventDefault(); goNext(); break;
        case 'k':
        case 'arrowleft': e.preventDefault(); goPrev(); break;
        case 'escape':
          e.preventDefault();
          if (pending) {
            // 저장 후 종료 (confirm 대신 자동 저장 + 토스트)
            markAndNext(pending).then(() => onExit());
            break;
          }
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [noteInputFocused, markAndNext, goNext, goPrev, onExit, pending, lightboxUrl, lightboxIndex, sidebarOpen, sidebarSearch]);

  if (!test) return null;

  const tagList = test.tags ? test.tags.split(',').map((x) => x.trim()).filter(Boolean) : [];
  const priority = test.priority?.toLowerCase() || '';

  // ── Sidebar filter chip config (Phase 3 AC-10: labels reused from common.*).
  const FILTER_CHIPS: { key: string; label: string; dot: string | null }[] = [
    { key: 'all',      label: t('common:issues.all'), dot: null      },
    { key: 'passed',   label: t('common:passed'),     dot: '#22C55E' },
    { key: 'failed',   label: t('common:failed'),     dot: '#EF4444' },
    { key: 'blocked',  label: t('common:blocked'),    dot: '#F59E0B' },
    { key: 'retest',   label: t('common:retest'),     dot: '#8B5CF6' },
    { key: 'untested', label: t('common:untested'),   dot: '#94A3B8' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* FocusMode Toast */}
      {focusToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium"
          style={{
            background: focusToast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            borderColor: focusToast.type === 'success' ? '#BBF7D0' : '#FECACA',
            color: focusToast.type === 'success' ? '#15803D' : '#DC2626',
          }}
        >
          <i className={focusToast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} />
          {focusToast.message}
          <button onClick={() => setFocusToast(null)} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer">×</button>
        </div>
      )}

      {/* ① Progress bar — 4px, indigo fill */}
      <div className="h-1 bg-gray-100 shrink-0">
        <div
          className="h-full transition-all duration-500 bg-indigo-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ② Header — run name + counter + ALL kbd hints + Exit */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #E2E8F0', background: '#fff' }}
      >
        {/* Left: run name + counter */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{runName}</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#94A3B8' }}>
            {index + 1} / {tests.length}
          </span>
        </div>

        {/* Center: ALL keyboard hints */}
        <div className="hidden md:flex items-center" style={{ gap: '0.375rem', fontSize: '0.6875rem', color: '#94A3B8' }}>
          {STATUS_BUTTONS.map((s) => (
            <span key={s.status} className="flex items-center gap-0.5">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>{s.key}</kbd>
              <span className="text-slate-400 mr-1">{s.label}</span>
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 0.375rem', display: 'inline-block' }} />
          {KBD_HINTS_PANEL.map((h) => (
            <span key={h.key} className="flex items-center gap-0.5">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>{h.key}</kbd>
              <span className="text-slate-400 mr-1">{h.label}</span>
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 0.375rem', display: 'inline-block' }} />
          {KBD_HINTS_NAV.map((h) => (
            <span key={h.key} className="flex items-center gap-0.5">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>{h.key}</kbd>
              <span className="text-slate-400 mr-1">{h.label}</span>
            </span>
          ))}
        </div>

        {/* Right: Exit button */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff' }}
        >
          <i className="ri-close-line" /> {t('runs:detail.focusMode.header.exit')}
          <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace', marginLeft: '0.25rem' }}>Esc</kbd>
        </button>
      </div>

      {/* ③ TIER 2: Metadata Bar — 40px, #F8FAFC */}
      <div
        className="flex items-center shrink-0 overflow-x-auto"
        style={{ height: 40, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0 1.5rem', gap: '0.75rem' }}
      >
        {test.customId && (
          <>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: '#7C3AED', whiteSpace: 'nowrap' }}>{test.customId}</span>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>
          </>
        )}
        {test.folder && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B' }}>
              <i className="ri-folder-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />{test.folder}
            </span>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>
          </>
        )}
        {priority && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 600, color: PRIORITY_TEXT_COLOR[priority] || '#64748B' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_DOT[priority] || '#94A3B8', flexShrink: 0, display: 'inline-block' }} />
              {t(`common:issues.priority.${priority}` as const, { defaultValue: priority })}
            </span>
            {(tagList.length > 0 || test.assignee) && <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>}
          </>
        )}
        {tagList.length > 0 && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', color: '#64748B' }}>
              <i className="ri-price-tag-3-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
              <span className="flex gap-1">
                {tagList.map((tag) => (
                  <span key={tag} style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: '#EEF2FF', color: '#4338CA' }}>{tag}</span>
                ))}
              </span>
            </span>
            {test.assignee && <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>}
          </>
        )}
        {test.assignee && (
          <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B' }}>
            <span style={{ width: '1.375rem', height: '1.375rem', borderRadius: '50%', background: '#6366F1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4375rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {test.assignee.substring(0, 2).toUpperCase()}
            </span>
            {test.assignee}
          </span>
        )}
      </div>

      {/* ④ Focus layout: Sidebar + Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── SIDEBAR (280px collapsible) ── */}
        <div
          style={{
            width: sidebarOpen ? 280 : 0,
            minWidth: 0,
            background: '#FAFBFC',
            borderRight: sidebarOpen ? '1px solid #E2E8F0' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            position: 'relative',
          }}
        >
          {/* Sidebar inner — fixed 280px width so content doesn't reflow during animation */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', height: '100%', opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: sidebarOpen ? 'auto' : 'none' }}>

            {/* Progress */}
            <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8' }}>{t('runs:detail.focusMode.sidebar.progress')}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }} className="text-slate-400 font-medium">
                  {/*
                    Phase 3 AC-10 / design-spec §12-4 case 3: single-key
                    completed counter. `count` (completed) color-highlighted
                    via Trans component to preserve indigo emphasis across
                    EN ("5 / 20 completed") and KO ("20개 중 5개 완료").
                  */}
                  <Trans
                    i18nKey="detail.focusMode.sidebar.completed"
                    ns="runs"
                    values={{ count: completedCount, total: tests.length }}
                    components={{ hl: <span className="text-indigo-500 font-bold" /> }}
                  />
                </span>
              </div>
              {/* 5-color segment bar */}
              <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                {[
                  { status: 'passed',   color: '#22C55E' },
                  { status: 'failed',   color: '#EF4444' },
                  { status: 'blocked',  color: '#F59E0B' },
                  { status: 'retest',   color: '#8B5CF6' },
                  { status: 'untested', color: '#E2E8F0' },
                ].map(seg => {
                  const count = tests.filter(tc => (tc.runStatus || 'untested') === seg.status).length;
                  const pct = tests.length ? (count / tests.length) * 100 : 0;
                  return pct > 0 ? (
                    <div key={seg.status} style={{ width: `${pct}%`, background: seg.color, height: '100%', transition: 'width 0.4s ease', flexShrink: 0 }} />
                  ) : null;
                })}
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0, flexWrap: 'wrap' }}>
              {FILTER_CHIPS.map(chip => {
                const isActive = sidebarFilter === chip.key;
                const count = chip.key === 'all'
                  ? tests.length
                  : tests.filter(tc => (tc.runStatus || 'untested') === chip.key).length;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setSidebarFilter(chip.key as 'all' | TestStatus)}
                    style={{
                      fontSize: '0.625rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '9999px',
                      border: `1px solid ${isActive ? '#6366F1' : '#E2E8F0'}`,
                      background: isActive ? '#6366F1' : '#fff',
                      color: isActive ? '#fff' : '#64748B',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.dot && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.5)' : chip.dot, display: 'inline-block', flexShrink: 0 }} />
                    )}
                    {chip.label}
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, opacity: 0.8 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.375rem', padding: '0.3125rem 0.5rem' }}>
                <i className="ri-search-line" style={{ fontSize: '0.8125rem', color: '#94A3B8', flexShrink: 0 }} />
                <input
                  ref={sidebarSearchRef}
                  type="text"
                  placeholder={t('runs:detail.focusMode.sidebar.searchPlaceholder')}
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  onFocus={() => setNoteInputFocused(true)}
                  onBlur={() => setNoteInputFocused(false)}
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.75rem', color: '#1E293B', fontFamily: 'inherit', flex: 1, minWidth: 0 }}
                />
                <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', padding: '0 0.2rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.5rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', flexShrink: 0 }}>/</kbd>
              </div>
            </div>

            {/* TC list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
              {filteredSidebarTests.map((tc) => {
                const tcIndex = tests.indexOf(tc);
                const isActive = tcIndex === index;
                const status = tc.runStatus || 'untested';
                const icon = STATUS_ICON[status];
                return (
                  <div
                    key={tc.id}
                    ref={el => { tcRefs.current[tcIndex] = el; }}
                    onClick={() => { resetForNavigation(); setIndex(tcIndex); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                      padding: '0.5rem 0.75rem', margin: '0.0625rem 0.375rem',
                      borderRadius: '0.5rem', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? '#C7D2FE' : 'transparent'}`,
                      background: isActive ? '#EEF2FF' : 'transparent',
                      minHeight: 48, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* 22px status circle */}
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', flexShrink: 0, marginTop: '0.0625rem', background: icon.bg, color: icon.color }}>
                      <i className={icon.icon} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: isActive ? '#818CF8' : '#94A3B8', fontWeight: 500, lineHeight: 1.2 }}>
                        {tc.customId || `TC-${String(tcIndex + 1).padStart(3, '0')}`}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: isActive ? '#4338CA' : '#334155', fontWeight: isActive ? 600 : 400, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {tc.title}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredSidebarTests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.8125rem', color: '#94A3B8' }}>
                  {t('runs:detail.focusMode.sidebar.empty')}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar toggle handle (24×56px, right edge) */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              position: 'absolute', top: '50%', right: -12, transform: 'translateY(-50%)',
              width: 24, height: 56, borderRadius: '0 8px 8px 0',
              background: '#fff', border: '1px solid #E2E8F0', borderLeft: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10,
              boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
          >
            <i
              className="ri-arrow-left-s-line"
              style={{ fontSize: '0.875rem', color: '#94A3B8', transition: 'transform 0.25s', transform: sidebarOpen ? 'none' : 'rotate(180deg)' }}
            />
          </button>
        </div>

        {/* Collapsed-tab: appears when sidebar is closed, at left edge of body */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 56, borderRadius: '0 8px 8px 0',
              background: '#fff', border: '1px solid #E2E8F0', borderLeft: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 20,
              boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; (e.currentTarget as HTMLElement).style.width = '20px'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.width = '16px'; }}
            title={t('runs:detail.focusMode.sidebar.openTooltip', { shortcut: '[' })}
          >
            <i className="ri-arrow-right-s-line text-sm text-indigo-500" />
          </button>
        )}

        {/* ── Body + Footer (flex column, fills remaining space) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* TIER 1: Main scrollable body — padding: 2rem 3rem, max-width 720px */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ padding: '2rem 3rem' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

              {/* Previously-status badge */}
              {test.runStatus && test.runStatus !== 'untested' && (
                <div
                  className="inline-flex items-center gap-1.5 mb-3"
                  style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    padding: '0.25rem 0.625rem', borderRadius: '9999px',
                    ...(test.runStatus === 'passed'
                      ? { background: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534' }
                      : test.runStatus === 'failed'
                      ? { background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
                      : { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }),
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: test.runStatus === 'passed' ? '#22C55E' : test.runStatus === 'failed' ? '#EF4444' : '#F59E0B', flexShrink: 0, display: 'inline-block' }} />
                  {t('runs:detail.focusMode.body.previously', { status: t(`common:${test.runStatus}` as const) })}
                </div>
              )}

              {/* SS Version Banner */}
              {(() => {
                const outdatedRefs = getOutdatedRefsForCurrentTest();
                if (outdatedRefs.length === 0) return null;
                if (ssBannerDismissedForTc.has(test.id)) return null;
                const ref = outdatedRefs[0];
                const latest = ssLatestVersions[ref.shared_step_id];
                if (!latest) return null;
                const canUp = !runCompleted && (test.runStatus === 'untested' || test.runStatus === 'retest');
                return (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 transition-all duration-200">
                    <div className="flex items-start gap-2.5">
                      <i className="ri-refresh-line text-amber-500 text-base flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400E' }}>
                          {t('runs:detail.focusMode.ssBanner.newVersionPrefix', { customId: ref.shared_step_custom_id, name: ref.shared_step_name, version: latest.version })}
                        </div>
                        {!canUp && (
                          <div className="flex items-center gap-1 mt-1" style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            <i className="ri-lock-line text-slate-400" />
                            {t('runs:detail.addResult.steps.lockedBanner')}
                          </div>
                        )}
                        {showSsDiff && ssDiffData && ssDiffData.ssId === ref.shared_step_id && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-amber-200">
                            <div className="grid grid-cols-2 divide-x divide-amber-200">
                              <div className="p-2.5 bg-red-50">
                                <div className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-wider mb-1.5">{t('runs:detail.addResult.steps.diffCurrent', { version: ssDiffData.currentVersion })}</div>
                                {ssDiffData.currentSteps.length > 0
                                  ? ssDiffData.currentSteps.map((s, i) => (
                                    <div key={i} className="text-[0.6875rem] text-red-700 mb-1 leading-relaxed">
                                      <span className="font-semibold text-red-400 mr-1">{i+1}.</span>{s.step}
                                    </div>
                                  ))
                                  : <div className="text-[0.6875rem] text-red-400">{t('runs:detail.focusMode.ssBanner.noHistory')}</div>
                                }
                              </div>
                              <div className="p-2.5 bg-emerald-50">
                                <div className="text-[0.5625rem] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">{t('runs:detail.addResult.steps.diffLatest', { version: ssDiffData.latestVersion })}</div>
                                {ssDiffData.latestSteps.map((s, i) => (
                                  <div key={i} className="text-[0.6875rem] text-emerald-700 mb-1 leading-relaxed">
                                    <span className="font-semibold text-emerald-400 mr-1">{i+1}.</span>{s.step}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        <button
                          onClick={() => {
                            if (showSsDiff && ssDiffData?.ssId === ref.shared_step_id) {
                              setShowSsDiff(false); setSsDiffData(null);
                            } else {
                              handleShowSsDiff(ref);
                            }
                          }}
                          style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                        >
                          {showSsDiff && ssDiffData?.ssId === ref.shared_step_id ? t('runs:detail.focusMode.ssBanner.hideChanges') : t('runs:detail.focusMode.ssBanner.viewChanges')}
                        </button>
                        {canUp && (
                          <button
                            onClick={() => handleUpdateInFocusMode(ref)}
                            style={{
                              fontSize: '0.75rem', fontWeight: 600, color: '#fff',
                              background: '#6366F1', padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                              border: 'none', cursor: 'pointer',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4F46E5'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6366F1'; }}
                          >
                            {t('runs:detail.addResult.steps.updateButton')}
                          </button>
                        )}
                        <button
                          onClick={() => setSsBannerDismissedForTc(prev => new Set([...prev, test.id]))}
                          style={{ fontSize: '0.75rem', color: '#B45309', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                        >
                          {t('runs:detail.ssBanner.dismiss')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TC Title + Description */}
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                {test.title}
              </h1>
              {test.description && (
                <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {test.description}
                </p>
              )}

              {/* Precondition */}
              {test.precondition && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
                  <div className="flex items-center gap-1.5" style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    <i className="ri-alert-line" style={{ fontSize: '0.875rem' }} />
                    {t('runs:detail.focusMode.body.precondition')}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#92400E', lineHeight: 1.6 }}>{test.precondition}</p>
                </div>
              )}

              {/* Attachments */}
              {test.attachments && test.attachments.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div className="flex items-center gap-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    <i className="ri-attachment-2" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
                    {t('runs:detail.focusMode.body.attachmentsHeader', { count: test.attachments.length })}
                  </div>
                  <div className="flex flex-wrap" style={{ gap: '0.625rem' }}>
                    {test.attachments.map((file, i) => {
                      const isImg = isImageFile(file.name);
                      return isImg ? (
                        <button
                          key={i}
                          onClick={() => openLightbox(file.url)}
                          className="flex-shrink-0 overflow-hidden transition-all"
                          style={{ width: 120, height: 80, borderRadius: '0.5rem', border: '1px solid #E2E8F0', cursor: 'zoom-in', background: '#F1F5F9', padding: 0 }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = '#A5B4FC';
                            (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                          }}
                        >
                          <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ) : (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 flex flex-col justify-center transition-all"
                          style={{ height: 80, minWidth: 140, borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#F8FAFC', padding: '0.625rem 0.75rem', textDecoration: 'none' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#A5B4FC'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
                        >
                          <div className="flex items-center gap-1" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                            <i className="ri-file-text-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
                            <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.125rem' }}>{formatFileSize(file.size)}</div>
                          <div className="flex items-center gap-0.5" style={{ fontSize: '0.6875rem', color: '#6366F1', fontWeight: 600, marginTop: '0.25rem' }}>
                            <i className="ri-download-2-line" style={{ fontSize: '0.75rem' }} />
                            {t('common:download')}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Test Steps with step-level Pass/Fail (4-state) */}
              {steps.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('runs:detail.focusMode.body.testStepsHeader')}
                    </span>
                    {passedStepCount > 0 && (
                      <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                        {t('runs:detail.focusMode.body.passedSuffix', { count: passedStepCount, total: steps.length })}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(() => {
                      const focusGroups: any[] = [];
                      let curFocusGroup: any = null;
                      for (let i = 0; i < steps.length; i++) {
                        const s = steps[i] as any;
                        if (s.groupHeader) {
                          if (curFocusGroup) focusGroups.push(curFocusGroup);
                          curFocusGroup = { isShared: true, header: s.groupHeader, steps: [{ s, i }] };
                        } else if (s.isSubStep && curFocusGroup) {
                          curFocusGroup.steps.push({ s, i });
                        } else {
                          if (curFocusGroup) { focusGroups.push(curFocusGroup); curFocusGroup = null; }
                          focusGroups.push({ isShared: false, s, i });
                        }
                      }
                      if (curFocusGroup) focusGroups.push(curFocusGroup);

                      const renderStepRow = (s: any, i: number, opts?: { borderTop?: string; borderRadius?: string; borderBottom?: string }) => {
                        const result = currentStepResults[i];
                        const isPassed = result === 'passed';
                        const isFailed = result === 'failed';
                        const isHtml = /<[^>]+>/.test(s.step);
                        return (
                          <div key={i} style={{
                            display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem',
                            background: isPassed ? '#F0FDF4' : isFailed ? '#FEF2F2' : '#fff',
                            borderTop: opts?.borderTop ?? 'none',
                            borderRadius: opts?.borderRadius ?? '0',
                            borderBottom: opts?.borderBottom ?? 'none',
                          }}>
                            <div style={{
                              width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
                              background: isPassed ? '#22C55E' : isFailed ? '#EF4444' : '#EEF2FF',
                              color: isPassed || isFailed ? '#fff' : '#6366F1',
                            }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {isHtml ? (
                                <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }} className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s.step }} />
                              ) : (
                                <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>{s.step}</p>
                              )}
                              {s.expectedResult && (
                                <div className="flex items-start gap-1" style={{ marginTop: '0.375rem' }}>
                                  <i className="ri-checkbox-circle-line flex-shrink-0" style={{ fontSize: '0.875rem', color: '#22C55E', marginTop: '0.125rem' }} />
                                  <p style={{ fontSize: '0.875rem', color: '#16A34A', lineHeight: 1.6 }}>{s.expectedResult.replace(/<[^>]*>/g, '').trim()}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0" style={{ marginTop: '0.125rem' }}>
                              <button
                                onClick={() => handleStepResult(i, isPassed ? null : 'passed')}
                                title={t('runs:detail.focusMode.body.stepPassTitle')}
                                className="flex items-center justify-center cursor-pointer transition-all"
                                style={{
                                  width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                                  border: isPassed ? '1px solid #22C55E' : '1px solid #E2E8F0',
                                  background: isPassed ? '#22C55E' : '#fff',
                                  color: isPassed ? '#fff' : '#94A3B8', fontSize: '0.75rem',
                                }}
                                onMouseEnter={(e) => { if (!isPassed) { (e.currentTarget as HTMLElement).style.background = '#F0FDF4'; (e.currentTarget as HTMLElement).style.color = '#16A34A'; (e.currentTarget as HTMLElement).style.borderColor = '#86EFAC'; } }}
                                onMouseLeave={(e) => { if (!isPassed) { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; } }}
                              ><i className="ri-check-line" /></button>
                              <button
                                onClick={() => handleStepResult(i, isFailed ? null : 'failed')}
                                title={t('runs:detail.focusMode.body.stepFailTitle')}
                                className="flex items-center justify-center cursor-pointer transition-all"
                                style={{
                                  width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                                  border: isFailed ? '1px solid #EF4444' : '1px solid #E2E8F0',
                                  background: isFailed ? '#EF4444' : '#fff',
                                  color: isFailed ? '#fff' : '#94A3B8', fontSize: '0.75rem',
                                }}
                                onMouseEnter={(e) => { if (!isFailed) { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#DC2626'; (e.currentTarget as HTMLElement).style.borderColor = '#FCA5A5'; } }}
                                onMouseLeave={(e) => { if (!isFailed) { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#94A3B8'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; } }}
                              ><i className="ri-close-line" /></button>
                            </div>
                          </div>
                        );
                      };

                      return focusGroups.map((group, gi) => {
                        if (!group.isShared) {
                          return renderStepRow(group.s, group.i, { borderTop: '1px solid #E2E8F0', borderRadius: '0.5rem' });
                        }
                        const [ssCustomId, ...ssNameParts] = group.header.split(': ');
                        const ssName = ssNameParts.join(': ');
                        return (
                          <div key={`ss-focus-${gi}`} style={{ border: '1px solid #C7D2FE', borderRadius: '0.5rem', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#EEF2FF', borderBottom: '1px solid #C7D2FE' }}>
                              <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: '#C7D2FE', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="ri-links-line" style={{ fontSize: '0.5rem' }} />
                              </div>
                              <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: '#4F46E5', background: '#E0E7FF', border: '1px solid #C7D2FE', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>{ssCustomId}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{ssName}</span>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#6366F1', background: '#E0E7FF', border: '1px solid #C7D2FE', padding: '0.125rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{t('runs:detail.addResult.steps.sharedBadge')}</span>
                            </div>
                            {group.steps.map(({ s, i }: { s: any; i: number }, si: number) =>
                              renderStepRow(s, i, { borderTop: si > 0 ? '1px solid #E0E7FF' : 'none' })
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* TIER 3: Comments panel (collapsible, C key) */}
              {(() => {
                const comments = tcComments[test.id] || [];
                const commentCount = tcComments[test.id]?.length ?? 0;
                const isOpen = openPanel === 'comments';
                return (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => setOpenPanel((v) => v === 'comments' ? 'none' : 'comments')}
                      className="w-full flex items-center justify-between cursor-pointer transition-all"
                      style={{ padding: '0.625rem 1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: isOpen ? '0.5rem 0.5rem 0 0' : '0.5rem', textAlign: 'left' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    >
                      <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                        <i className="ri-chat-3-line" style={{ fontSize: '1rem', color: '#94A3B8' }} />
                        {t('runs:detail.focusMode.comments.header')}
                        {tcComments[test.id] !== undefined && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '0.0625rem 0.375rem', borderRadius: '9999px' }}>{commentCount}</span>
                        )}
                        <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', marginLeft: '0.25rem' }}>C</kbd>
                      </div>
                      <i className="ri-arrow-right-s-line" style={{ fontSize: '1rem', color: '#94A3B8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </button>
                    {isOpen && (
                      <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                        {loadingComments ? (
                          <div className="flex items-center justify-center gap-2" style={{ padding: '0.5rem 0', fontSize: '0.8125rem', color: '#94A3B8' }}>
                            <i className="ri-loader-4-line animate-spin" />{t('common:loading')}
                          </div>
                        ) : comments.length === 0 ? (
                          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem 0' }}>{t('runs:detail.focusMode.comments.empty')}</p>
                        ) : (
                          comments.map((c) => {
                            const initials = c.author.substring(0, 2).toUpperCase();
                            // Phase 3 AC-14 연장: inline relTime 계산 제거 후
                            // formatRelativeTime (Phase 1 헬퍼) 재사용.
                            const relTime = formatRelativeTime(c.timestamp.toISOString(), t);
                            return (
                              <div key={c.id} style={{ background: '#F8FAFC', borderRadius: '0.375rem', padding: '0.625rem 0.75rem', marginBottom: '0.5rem' }}>
                                <div className="flex items-center gap-1.5" style={{ marginBottom: '0.25rem' }}>
                                  <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4375rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4338CA' }}>{c.author}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>· {relTime}</span>
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>{c.text}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TIER 3: Execution History panel (collapsible, H key) */}
              {(() => {
                const history = tcHistory[test.id] || [];
                const historyCount = tcHistory[test.id]?.length ?? 0;
                const isOpen = openPanel === 'history';
                const statusStyle = (s: string): React.CSSProperties => {
                  if (s === 'passed')  return { background: '#F0FDF4', color: '#166534' };
                  if (s === 'failed')  return { background: '#FEF2F2', color: '#991B1B' };
                  if (s === 'blocked') return { background: '#FFFBEB', color: '#92400E' };
                  if (s === 'retest')  return { background: '#F5F3FF', color: '#5B21B6' };
                  return { background: '#F8FAFC', color: '#64748B' };
                };
                const statusDot = (s: string) => ({ passed: '#22C55E', failed: '#EF4444', blocked: '#F59E0B', retest: '#8B5CF6' }[s] || '#94A3B8');
                return (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => setOpenPanel((v) => v === 'history' ? 'none' : 'history')}
                      className="w-full flex items-center justify-between cursor-pointer transition-all"
                      style={{ padding: '0.625rem 1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: isOpen ? '0.5rem 0.5rem 0 0' : '0.5rem', textAlign: 'left' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    >
                      <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                        <i className="ri-history-line" style={{ fontSize: '1rem', color: '#94A3B8' }} />
                        {t('runs:detail.focusMode.history.header')}
                        {tcHistory[test.id] !== undefined && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '0.0625rem 0.375rem', borderRadius: '9999px' }}>{historyCount}</span>
                        )}
                        <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', marginLeft: '0.25rem' }}>H</kbd>
                      </div>
                      <i className="ri-arrow-right-s-line" style={{ fontSize: '1rem', color: '#94A3B8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </button>
                    {isOpen && (
                      <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                        {loadingHistory ? (
                          <div className="flex items-center justify-center gap-2" style={{ padding: '0.5rem 0', fontSize: '0.8125rem', color: '#94A3B8' }}>
                            <i className="ri-loader-4-line animate-spin" />{t('common:loading')}
                          </div>
                        ) : history.length === 0 ? (
                          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem 0' }}>{t('runs:detail.focusMode.history.empty')}</p>
                        ) : (
                          history.map((h) => {
                            // Phase 3 AC-14 연장: formatRelativeTime 재사용.
                            const relTime = formatRelativeTime(h.timestamp.toISOString(), t);
                            return (
                              <div key={h.id} className="flex items-start gap-2.5" style={{ padding: '0.5rem 0', borderBottom: '1px solid #F1F5F9' }}>
                                <div className="inline-flex items-center gap-1 whitespace-nowrap" style={{ ...statusStyle(h.status), fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', flexShrink: 0 }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusDot(h.status), display: 'inline-block' }} />
                                  {t(`common:${h.status}` as const, { defaultValue: h.status })}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>{h.runName}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{relTime}{h.author ? ` · by ${h.author}` : ''}</div>
                                  {h.note && <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', marginTop: '0.125rem', paddingLeft: '0.25rem' }}>"{h.note}"</div>}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Note input */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.375rem' }}>
                  {t('runs:detail.addResult.note.label')} <span style={{ fontWeight: 400, color: '#94A3B8' }}>{t('runs:detail.focusMode.note.optionalSuffix')}</span>
                </div>
                <textarea
                  ref={noteRef}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onFocus={() => setNoteInputFocused(true)}
                  onBlur={() => setNoteInputFocused(false)}
                  placeholder={t('runs:detail.focusMode.note.placeholder')}
                  style={{
                    width: '100%', minHeight: '5rem', padding: '0.75rem 1rem',
                    border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                    fontSize: '0.875rem', fontFamily: 'inherit', color: '#334155',
                    resize: 'vertical', outline: 'none', lineHeight: 1.6,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = '#6366F1';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                  }}
                  onBlurCapture={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem', textAlign: 'right' }}>
                  {t('runs:detail.focusMode.note.saveHint')}
                </div>
              </div>

              {/* GitHub / Jira Issue creation — shown when TC is failed */}
              {test?.runStatus === 'failed' && (githubSettings?.token || jiraSettings?.domain) && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.125rem' }}>
                    {t('runs:detail.addResult.issues.label')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {/* GitHub issue badge or create button */}
                    {githubSettings?.token && (
                      createdGithubIssues[test.id] ? (
                        <a
                          href={createdGithubIssues[test.id].html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0',
                            textDecoration: 'none',
                          }}
                        >
                          <i className="ri-github-fill" style={{ fontSize: '0.875rem' }} />
                          #{createdGithubIssues[test.id].number}
                          <i className="ri-external-link-line" style={{ fontSize: '0.7rem', opacity: 0.6 }} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={creatingGithubIssue}
                          onClick={() => {
                            const defaultTitle = `[Test Failed] ${test.customId ? `${test.customId} - ` : ''}${test.title}`;
                            setGithubIssueTitle(defaultTitle);
                            setShowGithubIssueModal(true);
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: creatingGithubIssue ? '#F1F5F9' : '#fff',
                            color: '#374151', border: '1px solid #E2E8F0',
                            cursor: creatingGithubIssue ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {creatingGithubIssue
                            ? <><i className="ri-loader-4-line animate-spin" /> {t('runs:detail.githubIssue.footer.creating')}</>
                            : <><i className="ri-github-fill" /> {t('runs:detail.addResult.issues.createGithub')}</>
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* GitHub Issue Quick-Create Modal */}
          {showGithubIssueModal && test && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}
              onClick={() => setShowGithubIssueModal(false)}
            >
              <div
                style={{ background: '#fff', borderRadius: '0.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: '28rem', padding: '1.5rem' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-github-fill" /> {t('runs:detail.githubIssue.title')}
                  </h3>
                  <button onClick={() => setShowGithubIssueModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1.25rem' }}>
                    <i className="ri-close-line" />
                  </button>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>{t('runs:detail.githubIssue.titleField.label')}</label>
                  <input
                    type="text"
                    value={githubIssueTitle}
                    onChange={(e) => setGithubIssueTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    autoFocus
                  />
                </div>
                {githubSettings && (
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <i className="ri-github-fill" />
                    {t('runs:detail.githubIssue.willBeCreatedInPrefix')}<strong>{githubSettings.owner}/{githubSettings.repo}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    onClick={() => setShowGithubIssueModal(false)}
                    style={{ padding: '0.4375rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer' }}
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    disabled={creatingGithubIssue || !githubIssueTitle.trim()}
                    onClick={async () => {
                      setShowGithubIssueModal(false);
                      await createGithubIssue(test, githubIssueTitle);
                    }}
                    style={{
                      padding: '0.4375rem 1rem', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600,
                      color: '#fff', background: creatingGithubIssue ? '#94A3B8' : '#1e293b', border: 'none',
                      cursor: creatingGithubIssue ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}
                  >
                    <i className="ri-github-fill" /> {t('runs:detail.githubIssue.footer.submit')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ⑤ Footer — Status Buttons + Nav */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#fff', gap: '0.5rem' }}
          >
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex items-center gap-1 cursor-pointer transition-all"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', opacity: index === 0 ? 0.4 : 1 }}
            >
              <i className="ri-arrow-left-s-line" style={{ fontSize: '1rem' }} />{t('runs:detail.focusMode.footer.previous')}
            </button>

            <div className="flex items-center" style={{ gap: '0.375rem', margin: '0 0.75rem' }}>
              {STATUS_BUTTONS.map((s) => (
                <button
                  key={s.status}
                  onClick={() => {
                    if (s.status === 'failed') {
                      setPending('failed');
                      setTimeout(() => noteRef.current?.focus(), 50);
                    } else {
                      markAndNext(s.status);
                    }
                  }}
                  className="flex items-center gap-1.5 cursor-pointer transition-all border-0"
                  style={{
                    padding: '0.5rem 1.125rem', borderRadius: '0.5rem',
                    fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                    background: s.bg,
                    outline: pending === s.status ? `2px solid ${s.bg}` : 'none',
                    outlineOffset: 2,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = s.hoverBg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = s.bg; }}
                >
                  <i className={s.icon} />
                  {s.label}
                  <span style={{ fontSize: '0.6875rem', opacity: 0.7, padding: '0.0625rem 0.25rem', background: 'rgba(255,255,255,0.2)', borderRadius: '0.25rem' }}>{s.key}</span>
                </button>
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={index === tests.length - 1}
              className="flex items-center gap-1 cursor-pointer transition-all"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', opacity: index === tests.length - 1 ? 0.4 : 1 }}
            >
              {t('runs:detail.focusMode.footer.next')}<i className="ri-arrow-right-s-line" style={{ fontSize: '1rem' }} />
            </button>
          </div>

          {index === tests.length - 1 && (
            <p className="text-center pb-2" style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '-0.5rem' }}>
              {t('runs:detail.focusMode.footer.lastTestHint')}
            </p>
          )}

        </div>{/* end body+footer column */}
      </div>{/* end focus layout */}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 60, background: 'rgba(0,0,0,0.85)', cursor: 'pointer' }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute flex items-center justify-center cursor-pointer"
            style={{ top: '1rem', right: '1rem', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <i className="ri-close-line" />
          </button>
          {imageAttachments.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </>
          )}
          <img
            src={lightboxUrl}
            alt={t('runs:detail.focusMode.lightbox.alt')}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '0.5rem', cursor: 'default' }}
          />
        </div>
      )}
    </div>
  );
}
