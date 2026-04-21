import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { LogoMark } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { useTranslation } from 'react-i18next';
import { FocusMode, type FocusTestCase, type TestStatus } from '../../components/FocusMode';
import { StatusBadge } from '../../components/StatusBadge';
import { DetailPanel } from '../../components/DetailPanel';
import { Avatar } from '../../components/Avatar';
import AIRunSummaryPanel, { type AISummaryResult } from './components/AIRunSummaryPanel';
import { type AnyStep, isSharedStepRef } from '../../types/shared-steps';
import { type FlatStep, type SharedStepCache, expandFlatSteps } from '../../lib/expandSharedSteps';
import { ExportModal, type ExportFormat } from '../../components/ExportModal';
import { formatShortDate, formatLongDateTime } from '../../lib/dateFormat';

interface TestCase {
  id: string;
  title: string;
  description?: string;
  folder?: string;
  priority: string;
  status: string;
  assignee?: string;
  is_automated: boolean;
  created_at: string;
  steps?: string;
  expected_result?: string;
  precondition?: string;
  tags?: string;
  attachments?: { name: string; url: string; size: number }[];
}

interface TestCaseWithRunStatus extends TestCase {
  runStatus: 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';
}

interface TestResult {
  id: string;
  status: 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';
  author: string;
  timestamp: Date;
  note: string;
  elapsed: string;
  attachments: string[];
  stepStatuses?: Record<number, string>;
  issues?: string[];
  github_issues?: { number: number; url: string; repo: string }[];
  run?: {
    id: string;
    name: string;
    milestone_id?: string | null;
    milestone?: {
      id: string;
      name: string;
    } | null;
  };
  is_automated?: boolean; // CI/CD 자동화 여부
}

interface ProjectMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface JiraSettings {
  domain: string;
  email: string;
  api_token: string;
  project_key: string;
  issue_type: string;
  auto_create_on_failure: string;
  auto_issue_summary_template?: string;
  auto_issue_description_template?: string;
}

interface GitHubSettings {
  token: string;
  owner: string;
  repo: string;
  default_labels: string[];
  auto_create_enabled: boolean;
  auto_assign_enabled: boolean;
  assignee_username?: string;
}

interface Folder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

const FOLDER_COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  indigo:  { bg: '#EEF2FF', fg: '#6366F1' },
  violet:  { bg: '#F5F3FF', fg: '#8B5CF6' },
  pink:    { bg: '#FDF2F8', fg: '#EC4899' },
  emerald: { bg: '#F0FDF4', fg: '#10B981' },
  amber:   { bg: '#FFFBEB', fg: '#F59E0B' },
  cyan:    { bg: '#ECFEFF', fg: '#06B6D4' },
  red:     { bg: '#FEF2F2', fg: '#EF4444' },
  teal:    { bg: '#F0FDFA', fg: '#14B8A6' },
  orange:  { bg: '#FFF7ED', fg: '#F97316' },
  blue:    { bg: '#EFF6FF', fg: '#3B82F6' },
};

const TIER_INFO = {
  1: { name: 'Free',         color: 'bg-gray-100 text-gray-700 border-gray-300',       icon: 'ri-user-line' },
  2: { name: 'Hobby',        color: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: 'ri-seedling-line' },
  3: { name: 'Starter',      color: 'bg-indigo-50 text-indigo-700 border-indigo-300',  icon: 'ri-vip-crown-line' },
  4: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300',  icon: 'ri-vip-diamond-line' },
  5: { name: 'Enterprise S', color: 'bg-amber-50 text-amber-700 border-amber-300',     icon: 'ri-vip-diamond-line' },
  6: { name: 'Enterprise M', color: 'bg-orange-50 text-orange-700 border-orange-300',  icon: 'ri-vip-diamond-line' },
  7: { name: 'Enterprise L', color: 'bg-rose-50 text-rose-700 border-rose-300',        icon: 'ri-vip-diamond-line' },
};

export default function RunDetail() {
  const { projectId, runId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation(['common', 'runs']);
  const [project, setProject] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [testCases, setTestCases] = useState<TestCaseWithRunStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseWithRunStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'results' | 'issues'>('comments');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showAddResultModal, setShowAddResultModal] = useState(false);
  const [resultFormData, setResultFormData] = useState({
    status: 'passed' as 'passed' | 'failed' | 'blocked' | 'retest' | 'untested',
    note: '',
    assignTo: '',
    elapsed: '00:00',
    issues: '',
    issuesList: [] as string[],
    attachments: [] as { name: string; url: string; size: number }[],
  });
  const [stepStatuses, setStepStatuses] = useState<Record<number, string>>({});
  const [sharedStepsCache, setSharedStepsCache] = useState<SharedStepCache>({});
  // stepsSnapshot: loaded from test_runs.steps_snapshot at run load time
  // keyed by tc_id → FlatStep[] (SharedStepRefs already expanded at run creation)
  const [stepsSnapshot, setStepsSnapshot] = useState<Record<string, FlatStep[]>>({});
  // tcVersionsSnapshot: TC version at run creation time, keyed by tc_id
  const [tcVersionsSnapshot, setTcVersionsSnapshot] = useState<Record<string, {
    major: number; minor: number; status: string;
    title?: string; description?: string; precondition?: string; expected_result?: string; tags?: string;
  }>>({});
  const [tcDiffModal, setTcDiffModal] = useState<{
    tcId: string; tcTitle: string;
    snapMajor: number; snapMinor: number;
    liveMajor: number; liveMinor: number;
    snapSteps: FlatStep[]; liveSteps: FlatStep[];
    snapTitle?: string; snapDescription?: string; snapPrecondition?: string; snapExpectedResult?: string; snapTags?: string;
    liveTitle?: string; liveDescription?: string; livePrecondition?: string; liveExpectedResult?: string; liveTags?: string;
    loading?: boolean;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [jiraDomain, setJiraDomain] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [userProfile, setUserProfile] = useState<{ email: string; full_name: string; subscription_tier: number; avatar_emoji: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [showJiraSetupModal, setShowJiraSetupModal] = useState(false);
  const [toast, setToast] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [jiraSettings, setJiraSettings] = useState<JiraSettings | null>(null);
  const [githubSettings, setGithubSettings] = useState<GitHubSettings | null>(null);
  const [showGithubIssueModal, setShowGithubIssueModal] = useState(false);
  const [githubIssueFormData, setGithubIssueFormData] = useState({
    title: '',
    body: '',
    labels: '',
    assignee: '',
  });
  const [creatingGithubIssue, setCreatingGithubIssue] = useState(false);
  const [pendingGithubIssues, setPendingGithubIssues] = useState<{ number: number; url: string; repo: string }[]>([]);
  const [pendingJiraIssues, setPendingJiraIssues] = useState<string[]>([]);
  const [githubLabelInput, setGithubLabelInput] = useState('');
  const [githubLabelComposing, setGithubLabelComposing] = useState(false);
  const [githubAssignees, setGithubAssignees] = useState<{ login: string; avatar_url: string }[]>([]);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [showAssigneeSuggest, setShowAssigneeSuggest] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    summary: '',
    description: '',
    issueType: 'Bug',
    priority: 'Medium',
    labels: '',
    assignee: '',
    components: '',
  });
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = All
  const [isFolderSidebarOpen, setIsFolderSidebarOpen] = useState(true);
  const [copiedRunId, setCopiedRunId] = useState(false);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [runAssignees, setRunAssignees] = useState<Map<string, string>>(new Map());
  const [openAssigneeDropdown, setOpenAssigneeDropdown] = useState<string | null>(null);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState<AISummaryResult | null>(null);
  const [includeAiInPdf, setIncludeAiInPdf] = useState(false);
  const [aiSummaryState, setAiSummaryState] = useState<'none' | 'fresh' | 'stale'>('none');
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [showAINewBadge] = useState(() => {
    const launchDate = new Date('2026-05-01');
    return new Date() < new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  });
  const assigneeSuggestRef = useRef<HTMLDivElement>(null);

  // ── Export modal state ───────────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingFile, setExportingFile] = useState(false);

  // ── Shared Step version tracking ─────────────────────────────────────────
  // Map: shared_step_id → { version, custom_id, name, steps (latest) }
  const [ssLatestVersions, setSsLatestVersions] = useState<Record<string, { version: number; custom_id: string; name: string; steps: { step: string; expectedResult: string }[] }>>({});
  const [versionBannerDismissed, setVersionBannerDismissed] = useState(false);
  // "tcId:ssId" → true  (expanded diff)
  const [expandedDiffKey, setExpandedDiffKey] = useState<string | null>(null);
  // "ssId:version" → steps (fetched on demand for diff display)
  const [oldVersionStepsCache, setOldVersionStepsCache] = useState<Record<string, { step: string; expectedResult: string }[]>>({});

  const selectTestCase = (tc: TestCaseWithRunStatus | null) => {
    setSelectedTestCase(tc);
    if (tc) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('tc', tc.id);
        return next;
      }, { replace: true });
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('tc');
        return next;
      }, { replace: true });
    }
  };

  useEffect(() => {
    if (projectId && runId) {
      fetchData();  // fetchData 안에서 currentUser도 함께 로드
      fetchJiraSettings();
      fetchGithubSettings();
      fetchProjectMembers();
    }
  }, [projectId, runId]);

  useEffect(() => {
    if (selectedTestCase) {
      fetchTestResults();
      fetchComments();
    }
  }, [selectedTestCase]);

  // Fetch shared step contents when selected TC has SharedStepRef entries
  // Skipped when steps_snapshot is available (snapshot already has expanded steps)
  useEffect(() => {
    if (!selectedTestCase?.id) { setSharedStepsCache({}); return; }
    if (!selectedTestCase.steps) { setSharedStepsCache({}); return; }
    let parsed: AnyStep[] | null = null;
    try {
      const p = JSON.parse(selectedTestCase.steps);
      if (Array.isArray(p)) parsed = p as AnyStep[];
    } catch {}
    if (!parsed) { setSharedStepsCache({}); return; }
    const refs = parsed.filter(isSharedStepRef);
    if (refs.length === 0) { setSharedStepsCache({}); return; }
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
      setSharedStepsCache(cache);
    })();
  }, [selectedTestCase?.id, stepsSnapshot]);

  useEffect(() => {
    if (!showAssigneeSuggest) return;
    const handler = (e: MouseEvent) => {
      if (assigneeSuggestRef.current && !assigneeSuggestRef.current.contains(e.target as Node)) {
        setShowAssigneeSuggest(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAssigneeSuggest]);

  const handleExportCSV = async (filteredCases?: TestCaseWithRunStatus[]) => {
    setShowMoreMenu(false);
    const casesToExport = filteredCases ?? testCases;

    // Fetch latest result per TC for this run
    const { data: resultsData } = await supabase
      .from('test_results')
      .select('test_case_id, status, author, elapsed, created_at, issues')
      .eq('run_id', runId)
      .order('created_at', { ascending: false });

    const latestResultMap = new Map<string, any>();
    (resultsData || []).forEach((r: any) => {
      if (!latestResultMap.has(r.test_case_id)) {
        latestResultMap.set(r.test_case_id, r);
      }
    });

    // Fetch comment counts per TC
    const tcIds = casesToExport.map(tc => tc.id);
    const { data: commentsData } = await supabase
      .from('test_case_comments')
      .select('test_case_id')
      .in('test_case_id', tcIds);

    const commentCountMap = new Map<string, number>();
    (commentsData || []).forEach((c: any) => {
      commentCountMap.set(c.test_case_id, (commentCountMap.get(c.test_case_id) || 0) + 1);
    });

    const headers = ['TC ID', 'Title', 'Priority', 'Status', 'Tester', 'Date', 'Duration', 'Tags', 'Steps Count', 'Comments Count', 'Issues'];
    const rows = casesToExport.map(tc => {
      const r = latestResultMap.get(tc.id);
      const stepsCount = tc.steps
        ? tc.steps.split('\n').filter((s: string) => s.trim()).length
        : 0;
      const issues = r?.issues && Array.isArray(r.issues) ? r.issues.join('; ') : '';
      return [
        `"${((tc as any).custom_id || tc.id).replace(/"/g, '""')}"`,
        `"${(tc.title || '').replace(/"/g, '""')}"`,
        tc.priority || '',
        tc.runStatus || 'untested',
        r?.author || '',
        r?.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        r?.elapsed || '',
        `"${(tc.tags || '').replace(/"/g, '""')}"`,
        stepsCount,
        commentCountMap.get(tc.id) || 0,
        `"${issues.replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run?.name || 'run'}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = (filteredCases?: TestCaseWithRunStatus[], summaryToInclude?: AISummaryResult | null) => {
    const casesToRender = [...(filteredCases ?? testCases)].sort((a, b) => {
      const aId = (a as any).custom_id || '';
      const bId = (b as any).custom_id || '';
      const aMatch = aId.match(/(\D+)(\d+)$/);
      const bMatch = bId.match(/(\D+)(\d+)$/);
      if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
        return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
      }
      return aId.localeCompare(bId);
    });

    const passedCount = casesToRender.filter(tc => tc.runStatus === 'passed').length;
    const failedCount = casesToRender.filter(tc => tc.runStatus === 'failed').length;
    const blockedCount = casesToRender.filter(tc => tc.runStatus === 'blocked').length;
    const retestCount = casesToRender.filter(tc => tc.runStatus === 'retest').length;
    const untestedCount = casesToRender.filter(tc => tc.runStatus === 'untested').length;
    const totalCount = casesToRender.length;
    const completedCount = totalCount - untestedCount;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const statusColors: Record<string, string> = {
      passed: '#16A34A',
      failed: '#DC2626',
      blocked: '#D97706',
      retest: '#7C3AED',
      untested: '#64748B',
    };
    const statusBg: Record<string, string> = {
      passed: '#DCFCE7',
      failed: '#FEE2E2',
      blocked: '#FEF3C7',
      retest: '#EDE9FE',
      untested: '#F1F5F9',
    };

    const tcRows = casesToRender.map((tc, i) => {
      const status = tc.runStatus || 'untested';
      const color = statusColors[status] || '#64748B';
      const bg = statusBg[status] || '#F1F5F9';
      const assignee = runAssignees.get(tc.id) || '';
      return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
          <td style="padding:7px 10px; font-size:11px; color:#64748B; font-family:monospace; white-space:nowrap;">${(tc as any).custom_id || ''}</td>
          <td style="padding:7px 10px; font-size:12px; color:#0F172A; max-width:280px;">${tc.title || ''}</td>
          <td style="padding:7px 10px; font-size:11px; color:#475569; text-align:center;">${tc.priority || ''}</td>
          <td style="padding:7px 10px; font-size:11px; color:#475569;">${tc.folder || ''}</td>
          <td style="padding:7px 10px; font-size:11px; color:#475569;">${assignee}</td>
          <td style="padding:7px 10px; text-align:center;">
            <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:600; color:${color}; background:${bg};">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </td>
        </tr>`;
    }).join('');

    const startDate = run?.created_at
      ? new Date(run.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build optional AI Summary section
    const aiSectionHtml = summaryToInclude ? (() => {
      const s = summaryToInclude;
      const pr = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
      const riskColors: Record<string, string> = { HIGH: '#DC2626', MEDIUM: '#D97706', LOW: '#16A34A' };
      const riskBg: Record<string, string>    = { HIGH: '#FEE2E2', MEDIUM: '#FEF3C7', LOW: '#DCFCE7' };
      const gngColors: Record<string, string> = { 'GO': '#166534', 'NO-GO': '#991B1B', 'CONDITIONAL': '#92400E' };
      const gngBg: Record<string, string>     = { 'GO': '#DCFCE7', 'NO-GO': '#FEE2E2', 'CONDITIONAL': '#FEF3C7' };
      const gngIcon: Record<string, string>   = { 'GO': '✅', 'NO-GO': '❌', 'CONDITIONAL': '⚠️' };
      const gngLabel: Record<string, string>  = { 'GO': 'GO', 'NO-GO': 'NO-GO', 'CONDITIONAL': 'CONDITIONAL GO' };

      const skipped = Math.max(0, totalCount - passedCount - failedCount - blockedCount);
      const metricRows = [
        { label: 'Total',     val: totalCount,    color: '#0F172A' },
        { label: 'Passed',    val: passedCount,   color: '#16A34A' },
        { label: 'Failed',    val: failedCount,   color: '#DC2626' },
        { label: 'Blocked',   val: blockedCount,  color: '#D97706' },
        { label: 'Skipped',   val: skipped,       color: '#64748B' },
        { label: 'Pass Rate', val: `${pr}%`,      color: pr >= 90 ? '#16A34A' : pr >= 70 ? '#CA8A04' : '#DC2626' },
      ].map(m => `<tr><td style="padding:4px 10px; font-size:11px; color:#475569; border-bottom:1px solid #F1F5F9;">${m.label}</td><td style="padding:4px 10px; font-size:12px; font-weight:700; color:${m.color}; border-bottom:1px solid #F1F5F9;">${m.val}</td></tr>`).join('');

      const maxCount = Math.max(...s.clusters.map(c => c.count), 1);
      const barColors = ['#DC2626', '#EA580C', '#CA8A04', '#64748B'];
      const clusterRows = s.clusters.map((c, i) => {
        const pct = Math.round((c.count / totalCount) * 100);
        const barW = Math.round((c.count / maxCount) * 100);
        const col = barColors[i] ?? '#64748B';
        return `
          <div style="margin-bottom:8px; padding:8px 10px; border:1px solid #E2E8F0; border-radius:6px; border-left:3px solid ${col};">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:12px; font-weight:600; color:#0F172A;">${c.name}</span>
              <span style="font-size:11px; font-weight:700; color:${col};">${c.count} (${pct}%)</span>
            </div>
            <div style="height:5px; background:#E2E8F0; border-radius:3px; margin-bottom:4px;">
              <div style="height:100%; width:${barW}%; background:${col}; border-radius:3px;"></div>
            </div>
            <div style="font-size:11px; color:#64748B;">${c.rootCause}</div>
          </div>`;
      }).join('');

      const recItems = s.recommendations.slice(0, 3)
        .map((r, i) => `<li style="font-size:12px; color:#334155; margin-bottom:4px; line-height:1.5;"><strong style="color:#4F46E5;">${i + 1}.</strong> ${r}</li>`)
        .join('');

      return `
      <div style="margin-bottom:20px; border:1px solid #C7D2FE; border-radius:8px; overflow:hidden; page-break-inside:avoid;">
        <!-- AI Section Header -->
        <div style="background:linear-gradient(135deg,#4338CA,#3730A3); padding:10px 14px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:14px; color:#A5B4FC;">✦</span>
          <span style="font-size:13px; font-weight:700; color:#E0E7FF;">AI Run Summary</span>
          <span style="margin-left:auto; padding:3px 10px; border-radius:9999px; font-size:10px; font-weight:700; background:${riskBg[s.riskLevel]}; color:${riskColors[s.riskLevel]};">${s.riskLevel} RISK</span>
        </div>
        <div style="padding:14px; background:white;">

          <!-- Go/No-Go Banner -->
          <div style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-radius:6px; margin-bottom:12px; background:${gngBg[s.goNoGo]}; border:1px solid ${gngColors[s.goNoGo]}40;">
            <span style="font-size:18px; line-height:1;">${gngIcon[s.goNoGo] ?? '—'}</span>
            <div>
              <div style="font-size:13px; font-weight:800; color:${gngColors[s.goNoGo]};">${gngLabel[s.goNoGo] ?? s.goNoGo}</div>
              ${s.goNoGoCondition ? `<div style="font-size:11px; color:${gngColors[s.goNoGo]}; opacity:0.85; margin-top:2px;">${s.goNoGoCondition}</div>` : ''}
            </div>
          </div>

          <!-- Executive Summary -->
          <div style="font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Executive Summary</div>
          <p style="font-size:12px; color:#334155; line-height:1.6; margin-bottom:12px; padding:8px 10px; background:#F8FAFC; border-radius:5px; border-left:3px solid #6366F1;">${s.narrative}</p>

          <!-- Key Metrics -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
            <div>
              <div style="font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Key Metrics</div>
              <table style="width:100%; border-collapse:collapse; border:1px solid #E2E8F0; border-radius:5px; overflow:hidden;">
                <thead><tr style="background:#F8FAFC;"><th style="padding:5px 10px; font-size:10px; font-weight:700; color:#64748B; text-align:left; border-bottom:1px solid #E2E8F0;">Metric</th><th style="padding:5px 10px; font-size:10px; font-weight:700; color:#64748B; text-align:right; border-bottom:1px solid #E2E8F0;">Value</th></tr></thead>
                <tbody>${metricRows}</tbody>
              </table>
            </div>
            <div>
              <div style="font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Recommendations</div>
              <ol style="margin:0; padding-left:0; list-style:none;">${recItems}</ol>
            </div>
          </div>

          <!-- Failure Patterns -->
          ${s.clusters.length > 0 ? `
          <div style="font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Failure Patterns</div>
          ${clusterRows}` : ''}

        </div>
      </div>`;
    })() : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${run?.name || 'Run Report'}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0F172A; background: white; }
    .header { border-bottom: 2px solid #6366F1; padding-bottom: 14px; margin-bottom: 18px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .run-name { font-size: 20px; font-weight: 700; color: #0F172A; }
    .project-name { font-size: 12px; color: #64748B; margin-top: 3px; }
    .export-date { font-size: 11px; color: #94A3B8; text-align: right; }
    .meta { display: flex; gap: 18px; margin-top: 10px; font-size: 12px; color: #475569; }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 18px; }
    .stat { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; text-align: center; }
    .stat-value { font-size: 22px; font-weight: 700; }
    .stat-label { font-size: 10px; color: #64748B; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .progress-bar { height: 8px; background: #E2E8F0; border-radius: 4px; margin-bottom: 18px; overflow: hidden; }
    .progress-fill { height: 100%; background: #6366F1; border-radius: 4px; width: ${progressPct}%; }
    .progress-label { font-size: 11px; color: #64748B; text-align: right; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #6366F1; }
    thead th { padding: 8px 10px; font-size: 10px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
    thead th:nth-child(3), thead th:nth-child(6) { text-align: center; }
    tbody tr { border-bottom: 1px solid #F1F5F9; }
    tbody tr:hover { background: #F0F9FF; }
    .footer { margin-top: 14px; font-size: 10px; color: #94A3B8; display: flex; justify-content: space-between; border-top: 1px solid #E2E8F0; padding-top: 8px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="run-name">${run?.name || 'Run Report'}</div>
        <div class="project-name">${project?.name || ''}</div>
      </div>
      <div class="export-date">Exported ${exportDate}<br>Started ${startDate}</div>
    </div>
  </div>

  <div class="summary">
    <div class="stat"><div class="stat-value" style="color:#0F172A;">${totalCount}</div><div class="stat-label">Total</div></div>
    <div class="stat"><div class="stat-value" style="color:#16A34A;">${passedCount}</div><div class="stat-label">Passed</div></div>
    <div class="stat"><div class="stat-value" style="color:#DC2626;">${failedCount}</div><div class="stat-label">Failed</div></div>
    <div class="stat"><div class="stat-value" style="color:#D97706;">${blockedCount}</div><div class="stat-label">Blocked</div></div>
    <div class="stat"><div class="stat-value" style="color:#7C3AED;">${retestCount}</div><div class="stat-label">Retest</div></div>
    <div class="stat"><div class="stat-value" style="color:#64748B;">${untestedCount}</div><div class="stat-label">Untested</div></div>
  </div>

  <div class="progress-bar"><div class="progress-fill"></div></div>
  <div class="progress-label">${progressPct}% completed (${completedCount} / ${totalCount})</div>
  <br>

  ${aiSectionHtml}

  <table>
    <thead>
      <tr>
        <th style="width:80px;">ID</th>
        <th>Test Case</th>
        <th style="width:72px;">Priority</th>
        <th style="width:110px;">Folder</th>
        <th style="width:100px;">Assignee</th>
        <th style="width:82px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tcRows}
    </tbody>
  </table>

  <div class="footer">
    <span>Testably — Run Report</span>
    <span>${run?.name || ''} · ${totalCount} test cases</span>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  };

  const handleExportXLSX = async (filteredCases?: TestCaseWithRunStatus[]) => {
    const casesToExport = filteredCases ?? testCases;

    const { data: resultsData } = await supabase
      .from('test_results')
      .select('test_case_id, status, author, elapsed, created_at, issues')
      .eq('run_id', runId)
      .order('created_at', { ascending: false });

    const latestResultMap = new Map<string, any>();
    (resultsData || []).forEach((r: any) => {
      if (!latestResultMap.has(r.test_case_id)) latestResultMap.set(r.test_case_id, r);
    });

    const tcIds = casesToExport.map(tc => tc.id);
    const { data: commentsData } = await supabase
      .from('test_case_comments')
      .select('test_case_id')
      .in('test_case_id', tcIds);
    const commentCountMap = new Map<string, number>();
    (commentsData || []).forEach((c: any) => {
      commentCountMap.set(c.test_case_id, (commentCountMap.get(c.test_case_id) || 0) + 1);
    });

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Run Results');

    const headers = ['TC ID', 'Title', 'Priority', 'Status', 'Tester', 'Date', 'Duration', 'Tags', 'Steps Count', 'Comments Count', 'Issues'];
    ws.columns = headers.map((h, i) => {
      const widths: Record<number, number> = { 0: 12, 1: 40, 2: 10, 3: 12, 4: 18, 5: 14, 6: 12, 7: 20, 8: 12, 9: 14, 10: 30 };
      return { header: h, key: String(i), width: widths[i] ?? 16 };
    });

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.commit();

    casesToExport.forEach(tc => {
      const r = latestResultMap.get(tc.id);
      const stepsCount = tc.steps ? tc.steps.split('\n').filter((s: string) => s.trim()).length : 0;
      const issues = r?.issues && Array.isArray(r.issues) ? r.issues.join(', ') : '';
      const row = ws.addRow([
        (tc as any).custom_id || tc.id,
        tc.title || '',
        tc.priority || '',
        tc.runStatus || 'untested',
        r?.author || '',
        r?.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        r?.elapsed || '',
        tc.tags || '',
        stepsCount,
        commentCountMap.get(tc.id) || 0,
        issues,
      ]);
      row.alignment = { wrapText: true, vertical: 'top' };
      row.commit();
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run?.name || 'run'}-results.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunExport = async (format: ExportFormat, statusFilter: Set<string>, tagFilter: Set<string>, includeAiSummary?: boolean) => {
    setExportingFile(true);
    try {
      let filtered = testCases.filter(tc => statusFilter.has(tc.runStatus || 'untested'));
      if (tagFilter.size > 0) {
        filtered = filtered.filter(tc => {
          const tcTags = (tc.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
          return tcTags.some((t: string) => tagFilter.has(t));
        });
      }
      if (format === 'pdf') handleExportPDF(filtered, includeAiSummary ? aiSummaryData : null);
      else if (format === 'csv') await handleExportCSV(filtered);
      else await handleExportXLSX(filtered);
      setShowExportModal(false);
    } finally {
      setExportingFile(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: user.id,
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || null,
        });

        setUserProfile({
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('현재 사용자 정보 로딩 오류:', error);
    }
  };

  const fetchComments = async () => {
    if (!selectedTestCase) return;
    
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('test_case_comments')
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('test_case_id', selectedTestCase.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = (data || []).map((item: any) => ({
        id: item.id,
        text: item.comment,
        author: item.profiles?.full_name || item.profiles?.email || 'Unknown',
        timestamp: new Date(item.created_at),
        user_id: item.user_id,
      }));

      setComments(formattedComments);
    } catch (error) {
      console.error('코멘트 로딩 오류:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchJiraSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('jira_settings')
        .select('domain, email, api_token, issue_type, project_key, auto_create_on_failure, auto_issue_summary_template, auto_issue_description_template')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Jira 설정 로딩 오류:', error);
        return;
      }

      if (data && data.domain) {
        setJiraDomain(data.domain);
        setJiraSettings(prev => ({
          domain: data.domain,
          email: data.email || '',
          api_token: data.api_token || '',
          project_key: data.project_key || prev?.project_key || '',
          issue_type: data.issue_type || 'Bug',
          auto_create_on_failure: data.auto_create_on_failure || 'disabled',
          auto_issue_summary_template: data.auto_issue_summary_template || undefined,
          auto_issue_description_template: data.auto_issue_description_template || undefined,
        }));
      }
    } catch (error) {
      console.error('Jira 설정 로딩 오류:', error);
    }
  };

  const fetchGithubSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('github_settings')
        .select('token, owner, repo, default_labels, auto_create_enabled, auto_assign_enabled, assignee_username')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') return;
      if (data?.token) {
        setGithubSettings({
          token: data.token,
          owner: data.owner || '',
          repo: data.repo || '',
          default_labels: data.default_labels || [],
          auto_create_enabled: data.auto_create_enabled || false,
          auto_assign_enabled: data.auto_assign_enabled || false,
          assignee_username: data.assignee_username || undefined,
        });
      }
    } catch (error) {
      console.error('GitHub 설정 로딩 오류:', error);
    }
  };

  const fetchProjectMembers = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const members: ProjectMember[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        email: item.profiles?.email || '',
        full_name: item.profiles?.full_name || null,
        role: item.role,
      }));

      setProjectMembers(members);
    } catch (error) {
      console.error('프로젝트 멤버 로딩 오류:', error);
    }
  };

  const fetchTestResults = async () => {
    if (!selectedTestCase || !runId) return;

    try {
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          id,
          test_case_id,
          run_id,
          status,
          author,
          note,
          elapsed,
          created_at,
          issues,
          github_issues,
          step_statuses,
          attachments,
          run:test_runs!test_results_run_id_fkey(
            id,
            name,
            milestone_id,
            milestone:milestones(
              id,
              name
            )
          )
        `)
        .eq('test_case_id', selectedTestCase.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const results: TestResult[] = (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        note: item.note || '',
        elapsed: item.elapsed || '',
        attachments: item.attachments || [],
        author: item.author || '',
        timestamp: new Date(item.created_at),
        stepStatuses: item.step_statuses,
        issues: item.issues || [],
        github_issues: item.github_issues || [],
        run: item.run ? {
          id: item.run.id,
          name: item.run.name,
          milestone_id: item.run.milestone_id,
          milestone: item.run.milestone,
        } : undefined,
      }));

      setTestResults(results);
    } catch (error) {
      console.error('결과 로딩 오류:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // ★ currentUser를 fetchData 내에서 동기적으로 로드 (race condition 방지)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentUser({
          id: user.id,
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || null,
        });
        setUserProfile({
          email: profile?.email || user.email || '',
          full_name: profile?.full_name || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      if (projectData?.jira_project_key) {
        setJiraSettings(prev => ({
          domain: prev?.domain || '',
          email: prev?.email || '',
          api_token: prev?.api_token || '',
          project_key: projectData.jira_project_key,
          issue_type: prev?.issue_type || 'Bug',
          auto_create_on_failure: prev?.auto_create_on_failure || 'disabled',
          auto_issue_summary_template: prev?.auto_issue_summary_template,
          auto_issue_description_template: prev?.auto_issue_description_template,
        }));
      }

      const { data: runData, error: runError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (runError) throw runError;

      // Auto-link Run to Plan if test_plan_id is missing
      if (!runData.test_plan_id && runData.project_id && Array.isArray(runData.test_case_ids) && runData.test_case_ids.length > 0) {
        try {
          const { data: plans } = await supabase
            .from('test_plans')
            .select('id')
            .eq('project_id', runData.project_id);

          const runTcSet = new Set(runData.test_case_ids as string[]);
          let bestMatch: { planId: string; score: number } | null = null;

          for (const plan of (plans || [])) {
            const { data: planTcRows } = await supabase
              .from('test_plan_test_cases')
              .select('test_case_id')
              .eq('test_plan_id', plan.id);
            const planTcIds = (planTcRows || []).map((r: any) => r.test_case_id);
            if (planTcIds.length === 0) continue;

            // Score: how many of the plan's TCs are in this run
            const matchCount = planTcIds.filter((id: string) => runTcSet.has(id)).length;
            const score = matchCount / planTcIds.length;

            // Must match at least 80% of plan's TCs
            if (score >= 0.8 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { planId: plan.id, score };
            }
          }

          if (bestMatch) {
            console.log(`[auto-link] Linking run ${runData.id} to plan ${bestMatch.planId} (score: ${bestMatch.score})`);
            const { error: linkErr } = await supabase.from('test_runs').update({ test_plan_id: bestMatch.planId }).eq('id', runData.id);
            if (linkErr) {
              console.error('[auto-link] Failed to update test_plan_id:', linkErr);
            } else {
              runData.test_plan_id = bestMatch.planId;
            }
          }
        } catch (e) {
          console.error('[auto-link] Error:', e);
        }
      }

      setRun(runData);

      // Determine AI summary state from stored snapshot vs current run aggregate counts
      // Also eagerly load aiSummaryData so ExportModal's "Include AI Summary" checkbox is available
      // without requiring the user to open the AI Summary panel first
      if (runData.ai_summary?.result) {
        setAiSummaryData(runData.ai_summary.result);
        const snap = runData.ai_summary.snapshot as { total: number; passed: number; failed: number; blocked: number } | undefined;
        const totalNow = (runData.test_case_ids as string[] | null)?.length ?? 0;
        const stale = !snap || snap.total !== totalNow || snap.passed !== (runData.passed ?? 0) || snap.failed !== (runData.failed ?? 0) || snap.blocked !== (runData.blocked ?? 0);
        setAiSummaryState(stale ? 'stale' : 'fresh');
      } else {
        setAiSummaryState('none');
      }

      // Load steps snapshot captured at run creation time (if present)
      if (runData.steps_snapshot && typeof runData.steps_snapshot === 'object') {
        setStepsSnapshot(runData.steps_snapshot as Record<string, FlatStep[]>);
      }
      // Load TC version snapshot (if present)
      if (runData.tc_versions_snapshot && typeof runData.tc_versions_snapshot === 'object') {
        setTcVersionsSnapshot(runData.tc_versions_snapshot as Record<string, { major: number; minor: number; status: string }>);
      }

      if (runData.test_case_ids && runData.test_case_ids.length > 0) {
        const { data: testCasesData, error: testCasesError } = await supabase
          .from('test_cases')
          .select('*')
          .in('id', runData.test_case_ids)
          .order('created_at', { ascending: false });

        if (testCasesError) throw testCasesError;

        const { data: testResultsData, error: testResultsError } = await supabase
          .from('test_results')
          .select('test_case_id, status, run_id')
          .eq('run_id', runId)
          .order('created_at', { ascending: false });

        if (testResultsError) throw testResultsError;

        const statusMap = new Map<string, string>();
        testResultsData?.forEach((result: any) => {
          if (!statusMap.has(result.test_case_id)) {
            statusMap.set(result.test_case_id, result.status);
          }
        });

        const testCasesWithStatus: TestCaseWithRunStatus[] = (testCasesData || []).map((tc: any) => ({
          ...tc,
          runStatus: statusMap.get(tc.id) || 'untested',
        }));

        setTestCases(testCasesWithStatus);

        // Run 상태 자동 업데이트: new 상태인데 이미 일부 결과가 있으면 in_progress로 변경
        const untestedCount = testCasesWithStatus.filter(tc => tc.runStatus === 'untested').length;
        const totalCount = testCasesWithStatus.length;
        const hasAnyResult = (testResultsData?.length || 0) > 0;

        if (runData.status === 'new' && (hasAnyResult || untestedCount < totalCount)) {
          const newStatus = untestedCount === 0 ? 'completed' : 'in_progress';
          await supabase
            .from('test_runs')
            .update({ status: newStatus })
            .eq('id', runId);
          // 로컬 상태는 setRun 이후에 반영되므로 runData를 직접 수정
          runData.status = newStatus;
        }

        // 이 Run에 포함된 테스트케이스의 folder 이름 목록 추출
        const folderNamesInRun = Array.from(
          new Set(
            (testCasesData || [])
              .map((tc: any) => tc.folder)
              .filter((f: any) => f && f.trim() !== '')
          )
        ) as string[];

        // folders 테이블에서 해당 프로젝트의 폴더 조회
        const { data: foldersData } = await supabase
          .from('folders')
          .select('*')
          .eq('project_id', projectId);

        // Run에 포함된 폴더 이름과 매칭되는 폴더만 필터링
        const matchedFolders: Folder[] = (foldersData || []).filter((f: any) =>
          folderNamesInRun.includes(f.name)
        );

        // folders 테이블에 없는 폴더 이름도 표시 (이름만 있는 경우)
        const matchedNames = matchedFolders.map((f) => f.name);
        const unmatchedFolders: Folder[] = folderNamesInRun
          .filter((name) => !matchedNames.includes(name))
          .map((name) => ({ id: name, name }));

        setFolders([...matchedFolders, ...unmatchedFolders]);

        // Run별 assignee 불러오기
        const { data: assigneesData } = await supabase
          .from('run_testcase_assignees')
          .select('test_case_id, assignee')
          .eq('run_id', runId);

        const assigneesMap = new Map<string, string>();
        (assigneesData || []).forEach((row: any) => {
          if (row.assignee) {
            assigneesMap.set(row.test_case_id, row.assignee);
          }
        });
        setRunAssignees(assigneesMap);

        // Fetch latest versions of all Shared Steps referenced in this run's TCs
        const allSSIds = new Set<string>();
        for (const tc of testCasesWithStatus) {
          if (!tc.steps) continue;
          try {
            const p = JSON.parse(tc.steps);
            if (Array.isArray(p)) {
              (p as any[]).forEach((s: any) => {
                if (s.type === 'shared_step_ref' && s.shared_step_id) {
                  allSSIds.add(s.shared_step_id);
                }
              });
            }
          } catch {}
        }
        if (allSSIds.size > 0) {
          const { data: ssData } = await supabase
            .from('shared_steps')
            .select('id, version, custom_id, name, steps')
            .in('id', [...allSSIds]);
          if (ssData) {
            const vmap: Record<string, { version: number; custom_id: string; name: string; steps: any[] }> = {};
            ssData.forEach((ss: any) => { vmap[ss.id] = { version: ss.version, custom_id: ss.custom_id, name: ss.name, steps: ss.steps || [] }; });
            setSsLatestVersions(vmap);
          }
        }

        // URL에서 이전 선택 TC 복원
        const tcIdFromUrl = searchParams.get('tc');
        if (tcIdFromUrl) {
          const restoredTc = testCasesWithStatus.find(tc => tc.id === tcIdFromUrl);
          if (restoredTc) {
            setSelectedTestCase(restoredTc);
          }
        }
      }
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedTestCase || !currentUser) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('test_case_comments')
        .insert({
          test_case_id: selectedTestCase.id,
          user_id: currentUser.id,
          comment: commentText.trim(),
        })
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      const newComment = {
        id: data.id,
        text: data.comment,
        author: data.profiles?.full_name || data.profiles?.email || 'Unknown',
        timestamp: new Date(data.created_at),
        user_id: data.user_id,
      };

      setComments([newComment, ...comments]);
      setCommentText('');
    } catch (error: any) {
      console.error('코멘트 저장 오류:', error);
      showToast('error', error?.message || 'Failed to save comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('test_case_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error: any) {
      console.error('코멘트 삭제 오류:', error);
      showToast('error', error?.message || 'Failed to delete comment.');
    }
  };

  const updateRunStatus = async (runId: string, updatedTCs: TestCaseWithRunStatus[]) => {
    try {
      // Calculate stats from the passed-in TC list (not stale state)
      const passed = updatedTCs.filter(tc => tc.runStatus === 'passed').length;
      const failed = updatedTCs.filter(tc => tc.runStatus === 'failed').length;
      const blocked = updatedTCs.filter(tc => tc.runStatus === 'blocked').length;
      const retest = updatedTCs.filter(tc => tc.runStatus === 'retest').length;
      const untested = updatedTCs.filter(tc => tc.runStatus === 'untested').length;

      let newStatus: 'new' | 'in_progress' | 'under_review' | 'completed';
      if (untested === 0) {
        newStatus = 'completed';
      } else {
        newStatus = 'in_progress';
      }

      const { error } = await supabase
        .from('test_runs')
        .update({ status: newStatus, passed, failed, blocked, retest, untested })
        .eq('id', runId);

      if (error) throw error;

      if (run) {
        setRun({ ...run, status: newStatus, passed, failed, blocked, retest, untested });

        // Auto-update Plan status — read test_plan_id from DB (not stale React state)
        const { data: freshRun } = await supabase
          .from('test_runs')
          .select('test_plan_id')
          .eq('id', runId)
          .single();
        const planId = freshRun?.test_plan_id;
        console.log(`[plan-status] runId=${runId}, test_plan_id=${planId}, newStatus=${newStatus}`);
        if (planId) {
          try {
            if (newStatus === 'in_progress') {
              const { error: planErr } = await supabase
                .from('test_plans')
                .update({ status: 'active' })
                .eq('id', planId)
                .in('status', ['planning']);
              if (planErr) console.error('[plan-status] Failed to set active:', planErr);
              else console.log(`[plan-status] Plan ${planId} → active`);
            } else if (newStatus === 'completed') {
              const { data: planRuns } = await supabase
                .from('test_runs')
                .select('id, status')
                .eq('test_plan_id', planId);
              const allCompleted = (planRuns || []).every((r: any) =>
                r.id === runId ? true : r.status === 'completed'
              );
              if (allCompleted) {
                await supabase
                  .from('test_plans')
                  .update({ status: 'completed' })
                  .eq('id', planId);
                console.log(`[plan-status] Plan ${planId} → completed`);
              }
            }
          } catch (e) {
            console.error('[plan-status] Error updating plan status:', e);
          }
        } else {
          console.warn('[plan-status] No test_plan_id on run — cannot update plan status');
        }
      }
    } catch (error) {
      console.error('Error updating run status:', error);
    }
  };

  const stripHtml = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const buildAutoJiraDescription = (tc: TestCase): string => {
    const steps = stripHtml(tc.steps || '') || 'No steps defined';
    const expectedResult = stripHtml(tc.expected_result || '') || 'Not specified';
    const precondition = tc.precondition ? stripHtml(tc.precondition) : '';
    return `*Auto-created by Testably*\n\n` +
      `Test Case: ${tc.title}\n` +
      `Run: ${run?.name || 'Unknown'}\n` +
      `Priority: ${tc.priority || 'Medium'}\n\n` +
      (precondition ? `--- Precondition ---\n${precondition}\n\n` : '') +
      `--- Steps ---\n${steps}\n\n` +
      `--- Expected Result ---\n${expectedResult}`;
  };

  const applyTemplate = (template: string, tc: TestCase): string => {
    return template
      .replace(/\{tc_id\}/g, (tc as any).custom_id || '')
      .replace(/\{tc_title\}/g, tc.title || '')
      .replace(/\{run_name\}/g, run?.name || 'Unknown')
      .replace(/\{priority\}/g, tc.priority || 'Medium')
      .replace(/\{steps\}/g, stripHtml(tc.steps || '') || 'No steps defined')
      .replace(/\{expected_result\}/g, stripHtml(tc.expected_result || '') || 'Not specified')
      .replace(/\{precondition\}/g, stripHtml(tc.precondition || '') || 'None');
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), type === 'success' ? 3000 : 5000);
  };

  const mapTestPriorityToJira = (priority?: string): string => {
    const map: Record<string, string> = { critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low' };
    return map[priority?.toLowerCase() || 'medium'] || 'Medium';
  };

  const handleStatusChange = async (testCaseId: string, newStatus: string) => {
    console.log('[handleStatusChange] currentUser:', currentUser?.email, 'testCaseId:', testCaseId);
    try {
      if (!currentUser) {
        throw new Error(t('runs:detail.fatalError.userMissing'));
      }
      if (!runId) {
        throw new Error(t('runs:detail.fatalError.runIdMissing'));
      }

      // Persist the status change as a test_result row so it survives page refresh
      // Use upsert to avoid 409 Conflict on unique constraint (run_id, test_case_id)
      const { data: newResultData, error: insertError } = await supabase
        .from('test_results')
        .upsert({
          test_case_id: testCaseId,
          run_id: runId,
          status: newStatus,
          author: currentUser.full_name || currentUser.email,
          note: '',
          elapsed: '00:00',
          attachments: [],
          step_statuses: {},
        }, { onConflict: 'run_id,test_case_id' })
        .select()
        .single();

      if (insertError) throw insertError;
      console.log('[handleStatusChange] ✅ INSERT 성공 | DB run_id:', newResultData.run_id, '| URL runId:', runId, '| match:', newResultData.run_id === runId);

      // Auto-create Jira issue on failure
      if (newStatus === 'failed' && jiraSettings?.auto_create_on_failure && jiraSettings.auto_create_on_failure !== 'disabled' && jiraSettings.project_key) {
        const tc = testCases.find(t => t.id === testCaseId);
        if (tc) {
          const existingIssues = newResultData?.issues || [];
          const shouldCreate =
            jiraSettings.auto_create_on_failure === 'all_failures' ||
            (jiraSettings.auto_create_on_failure === 'first_failure_only' && existingIssues.length === 0);

          if (shouldCreate) {
            try {
              const { data: jiraData } = await supabase.functions.invoke('create-jira-issue', {
                body: {
                  domain: jiraSettings.domain,
                  email: jiraSettings.email,
                  apiToken: jiraSettings.api_token,
                  projectKey: jiraSettings.project_key,
                  summary: jiraSettings.auto_issue_summary_template
                    ? applyTemplate(jiraSettings.auto_issue_summary_template, tc)
                    : `[Auto] Test Failed: ${(tc as any).custom_id ? `${(tc as any).custom_id} - ${tc.title}` : tc.title}`,
                  description: jiraSettings.auto_issue_description_template
                    ? applyTemplate(jiraSettings.auto_issue_description_template, tc)
                    : buildAutoJiraDescription(tc),
                  issueType: jiraSettings.issue_type || 'Bug',
                  priority: mapTestPriorityToJira(tc.priority),
                  test_result_id: newResultData?.id,
                  run_id: runId,
                  project_id: projectId,
                },
              });
              if (jiraData?.success && jiraData?.issue?.key && newResultData?.id) {
                await supabase.from('test_results')
                  .update({ issues: [...existingIssues, jiraData.issue.key] })
                  .eq('id', newResultData.id);
                showToast('success', `Jira issue ${jiraData.issue.key} created automatically`);
              }
            } catch (err) {
              console.warn('Auto Jira issue creation failed:', err);
              showToast('error', 'Failed to auto-create Jira issue');
            }
          }
        }
      }

      // Auto-create GitHub issue on failure
      if (newStatus === 'failed' && githubSettings?.auto_create_enabled && githubSettings.token && githubSettings.owner && githubSettings.repo) {
        const tc = testCases.find(t => t.id === testCaseId);
        if (tc) {
          try {
            const tcId = (tc as any).custom_id || tc.id;
            const { data: ghData } = await supabase.functions.invoke('create-github-issue', {
              body: {
                token: githubSettings.token,
                owner: githubSettings.owner,
                repo: githubSettings.repo,
                title: `[Auto] Test Failed: ${tcId} - ${tc.title}`,
                body: `**Auto-created by Testably**\n\nTest Case: ${tc.title}\nPriority: ${tc.priority}\n\n---\n${tc.description || ''}`,
                labels: githubSettings.default_labels.length > 0 ? githubSettings.default_labels : ['bug'],
                assignee: githubSettings.auto_assign_enabled && githubSettings.assignee_username ? githubSettings.assignee_username : undefined,
                test_result_id: newResultData?.id,
                run_id: runId,
                project_id: projectId,
              },
            });
            if (ghData?.success && ghData?.issue?.number) {
              showToast('success', `GitHub issue #${ghData.issue.number} created automatically`);
            }
          } catch (err) {
            console.warn('Auto GitHub issue creation failed:', err);
          }
        }
      }

      // Refresh results list if this is the currently selected test case
      if (selectedTestCase?.id === testCaseId && newResultData) {
        const newResult: TestResult = {
          id: newResultData.id,
          status: newResultData.status,
          note: newResultData.note,
          elapsed: newResultData.elapsed,
          attachments: newResultData.attachments || [],
          author: newResultData.author,
          timestamp: new Date(newResultData.created_at),
          stepStatuses: newResultData.step_statuses,
          issues: newResultData.issues || [],
        };
        setTestResults([newResult, ...testResults]);
      }

      // Update local state
      const updatedTestCases = testCases.map(tc =>
        tc.id === testCaseId ? { ...tc, runStatus: newStatus as any } : tc
      );
      setTestCases(updatedTestCases);

      if (selectedTestCase?.id === testCaseId) {
        setSelectedTestCase({ ...selectedTestCase, runStatus: newStatus as any });
      }

      // Update run stats (passed/failed/blocked/retest/untested) and status
      await updateRunStatus(runId!, updatedTestCases);

      // Switch to Results tab
      setActiveTab('results');
    } catch (error: any) {
      console.error('상태 업데이트 오류:', error);
      showToast('error', error?.message || 'Failed to update status.');
    }
  };

  const handlePreviousTestCase = () => {
    if (!selectedTestCase) return;
    const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id);
    if (currentIndex > 0) {
      selectTestCase(filteredTestCases[currentIndex - 1]);
    }
  };

  const handleNextTestCase = () => {
    if (!selectedTestCase) return;
    const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id);
    if (currentIndex < filteredTestCases.length - 1) {
      selectTestCase(filteredTestCases[currentIndex + 1]);
    }
  };

  const handlePassAndNext = async () => {
    if (!selectedTestCase || !currentUser) return;

    try {
      // Check previous result to set resolved_at if transitioning from failed/blocked
      const { data: prevResults } = await supabase
        .from('test_results')
        .select('status')
        .eq('test_case_id', selectedTestCase.id)
        .eq('run_id', runId)
        .order('created_at', { ascending: false })
        .limit(1);
      const prevStatus = prevResults?.[0]?.status;
      const resolvedAt = (prevStatus === 'failed' || prevStatus === 'blocked')
        ? new Date().toISOString() : undefined;

      // Create a test result
      const { data: resultData, error: resultError } = await supabase
        .from('test_results')
        .insert({
          test_case_id: selectedTestCase.id,
          run_id: runId,
          status: 'passed',
          author: currentUser.full_name || currentUser.email,
          note: '',
          elapsed: '00:00',
          attachments: [],
          step_statuses: {},
          ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
        })
        .select()
        .single();

      if (resultError) throw resultError;

      // Create new result object
      const newResult: TestResult = {
        id: resultData.id,
        status: resultData.status,
        note: resultData.note,
        elapsed: resultData.elapsed,
        attachments: resultData.attachments || [],
        author: resultData.author,
        timestamp: new Date(resultData.created_at),
        stepStatuses: resultData.step_statuses,
      };

      // Update local states
      const updatedTestCases = testCases.map(tc => 
        tc.id === selectedTestCase.id ? { ...tc, runStatus: 'passed' } : tc
      );
      setTestCases(updatedTestCases);
      
      setSelectedTestCase({ ...selectedTestCase, runStatus: 'passed' });
      setTestResults([newResult, ...testResults]);
      
      // Update run stats (passed/failed/blocked/retest/untested) and status
      await updateRunStatus(runId!, updatedTestCases);
      
      // Move to next test case after a short delay
      setTimeout(() => {
        const currentIndex = filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id);
        if (currentIndex < filteredTestCases.length - 1) {
          selectTestCase(filteredTestCases[currentIndex + 1]);
        }
      }, 500);
    } catch (error: any) {
      console.error('상태 업데이트 오류:', error);
      showToast('error', error?.message || 'Failed to update status.');
    }
  };

  const resetResultForm = useCallback(() => {
    setResultFormData({
      status: 'passed', note: '', assignTo: '', elapsed: '00:00',
      issues: '', issuesList: [], attachments: [],
    });
    setStepStatuses({});
    setIsTimerRunning(false);
    setTimerStartTime(null);
    setElapsedSeconds(0);
    setPendingGithubIssues([]);
    setPendingJiraIssues([]);
  }, []);

  const handleAddResult = () => {
    resetResultForm();
    setShowAddResultModal(true);
  };

  const handleLinkExistingIssue = async (issueKey: string) => {
    if (!selectedTestCase) return;
    const trimmedKey = issueKey.trim().toUpperCase();
    if (!trimmedKey) return;

    if (testResults.length > 0) {
      const latestResult = testResults[0];
      const updatedIssues = [...(latestResult.issues || []), trimmedKey];
      const { error } = await supabase
        .from('test_results')
        .update({ issues: updatedIssues })
        .eq('id', latestResult.id);
      if (error) throw error;
      setTestResults(testResults.map(r =>
        r.id === latestResult.id ? { ...r, issues: updatedIssues } : r
      ));
    } else {
      // No existing result — show guidance instead of creating a failed result
      showToast('error', 'Add a test result first, then link an issue.');
    }
  };

  const handleStepStatusChange = (stepIndex: number, status: string) => {
    setStepStatuses({
      ...stepStatuses,
      [stepIndex]: status,
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - timerStartTime) / 1000);
        setElapsedSeconds(elapsed);
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        setResultFormData(prev => ({ ...prev, elapsed: timeString }));
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timerStartTime]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // 타이머 정지
      setIsTimerRunning(false);
    } else {
      // 타이머 시작
      const now = Date.now();
      if (timerStartTime === null) {
        // 처음 시작
        setTimerStartTime(now);
        setElapsedSeconds(0);
      } else {
        // 재개 - 이전 경과 시간을 고려
        setTimerStartTime(now - (elapsedSeconds * 1000));
      }
      setIsTimerRunning(true);
    }
  };

  const handleIssueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME 조합 중(한글 입력 등)에는 무시
    if (e.nativeEvent.isComposing) return;

    if ((e.key === 'Enter' || e.key === ',') && resultFormData.issues.trim()) {
      e.preventDefault();
      const issueKey = resultFormData.issues.trim().replace(/,$/, '').toUpperCase();
      if (!issueKey) return;

      // Check if already exists
      if (resultFormData.issuesList.includes(issueKey)) {
        setResultFormData({ ...resultFormData, issues: '' });
        return;
      }

      setResultFormData({
        ...resultFormData,
        issues: '',
        issuesList: [...resultFormData.issuesList, issueKey],
      });
    }
  };

  const handleRemoveIssue = (issueKey: string) => {
    setResultFormData({
      ...resultFormData,
      issuesList: resultFormData.issuesList.filter(key => key !== issueKey),
    });
  };

  const handleSubmitResult = async () => {
    try {
      if (!selectedTestCase || !currentUser) return;
      if (!runId) {
        showToast('error', 'Run ID not found. Please refresh the page.');
        return;
      }

      // 타이머 정지
      setIsTimerRunning(false);

      // 입력 중인 이슈가 있으면 자동으로 추가 (pending Jira issues도 포함)
      let finalIssuesList = [...resultFormData.issuesList, ...pendingJiraIssues];
      if (resultFormData.issues.trim()) {
        const pendingIssue = resultFormData.issues.trim().toUpperCase();
        if (!finalIssuesList.includes(pendingIssue)) {
          finalIssuesList = [...finalIssuesList, pendingIssue];
        }
      }

      // Check previous result to set resolved_at if transitioning from failed/blocked
      let resolvedAt: string | undefined;
      if (resultFormData.status === 'passed' || resultFormData.status === 'retest') {
        const { data: prevResults } = await supabase
          .from('test_results')
          .select('status')
          .eq('test_case_id', selectedTestCase.id)
          .eq('run_id', runId)
          .order('created_at', { ascending: false })
          .limit(1);
        const prevStatus = prevResults?.[0]?.status;
        if (prevStatus === 'failed' || prevStatus === 'blocked') {
          resolvedAt = new Date().toISOString();
        }
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('test_results')
        .insert({
          test_case_id: selectedTestCase.id,
          run_id: runId,
          status: resultFormData.status,
          author: currentUser.full_name || currentUser.email,
          note: resultFormData.note,
          elapsed: resultFormData.elapsed,
          attachments: resultFormData.attachments.map(f => f.url),
          step_statuses: stepStatuses,
          issues: finalIssuesList,
          github_issues: pendingGithubIssues,
          ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create Jira issue on failure (from Add Result modal)
      if (resultFormData.status === 'failed' && jiraSettings?.auto_create_on_failure && jiraSettings.auto_create_on_failure !== 'disabled' && jiraSettings.project_key) {
        const tc = testCases.find(t => t.id === selectedTestCase.id);
        if (tc) {
          const existingIssues = data?.issues || [];
          const shouldCreate =
            jiraSettings.auto_create_on_failure === 'all_failures' ||
            (jiraSettings.auto_create_on_failure === 'first_failure_only' && existingIssues.length === 0);

          if (shouldCreate) {
            try {
              const { data: jiraData } = await supabase.functions.invoke('create-jira-issue', {
                body: {
                  domain: jiraSettings.domain,
                  email: jiraSettings.email,
                  apiToken: jiraSettings.api_token,
                  projectKey: jiraSettings.project_key,
                  summary: jiraSettings.auto_issue_summary_template
                    ? applyTemplate(jiraSettings.auto_issue_summary_template, tc)
                    : `[Auto] Test Failed: ${(tc as any).custom_id ? `${(tc as any).custom_id} - ${tc.title}` : tc.title}`,
                  description: jiraSettings.auto_issue_description_template
                    ? applyTemplate(jiraSettings.auto_issue_description_template, tc)
                    : buildAutoJiraDescription(tc),
                  issueType: jiraSettings.issue_type || 'Bug',
                  priority: mapTestPriorityToJira(tc.priority),
                  test_result_id: data?.id,
                  run_id: runId,
                  project_id: projectId,
                },
              });
              if (jiraData?.success && jiraData?.issue?.key && data?.id) {
                await supabase.from('test_results')
                  .update({ issues: [...existingIssues, jiraData.issue.key] })
                  .eq('id', data.id);
                showToast('success', `Jira issue ${jiraData.issue.key} created automatically`);
              }
            } catch (err) {
              console.warn('Auto Jira issue creation failed:', err);
              showToast('error', 'Failed to auto-create Jira issue');
            }
          }
        }
      }

      // Auto-create GitHub issue on failure (from Add Result modal)
      if (resultFormData.status === 'failed' && githubSettings?.auto_create_enabled && githubSettings.token && githubSettings.owner && githubSettings.repo) {
        const tc = testCases.find(t => t.id === selectedTestCase.id);
        if (tc) {
          try {
            const tcId = (tc as any).custom_id || tc.id;
            const { data: ghData } = await supabase.functions.invoke('create-github-issue', {
              body: {
                token: githubSettings.token,
                owner: githubSettings.owner,
                repo: githubSettings.repo,
                title: `[Auto] Test Failed: ${tcId} - ${tc.title}`,
                body: `**Auto-created by Testably**\n\nTest Case: ${tc.title}\nPriority: ${tc.priority}\n\n---\n${tc.description || ''}`,
                labels: githubSettings.default_labels.length > 0 ? githubSettings.default_labels : ['bug'],
                assignee: githubSettings.auto_assign_enabled && githubSettings.assignee_username ? githubSettings.assignee_username : undefined,
                test_result_id: data?.id,
                run_id: runId,
                project_id: projectId,
              },
            });
            if (ghData?.success && ghData?.issue?.number && data?.id) {
              const autoGhIssue = { number: ghData.issue.number, url: ghData.issue.html_url, repo: githubSettings.repo };
              const existingGhIssues = data?.github_issues || [];
              await supabase.from('test_results')
                .update({ github_issues: [...existingGhIssues, autoGhIssue] })
                .eq('id', data.id);
              showToast('success', `GitHub issue #${ghData.issue.number} created automatically`);
            }
          } catch (err) {
            console.warn('Auto GitHub issue creation failed:', err);
          }
        }
      }

      const newResult: TestResult = {
        id: data.id,
        status: data.status,
        note: data.note,
        elapsed: data.elapsed,
        attachments: data.attachments || [],
        author: data.author,
        timestamp: new Date(data.created_at),
        stepStatuses: data.step_statuses,
        issues: data.issues || [],
        github_issues: data.github_issues || [],
      };

      setTestResults([newResult, ...testResults]);
      
      // Update test case status in local state only (without creating another result)
      const updatedTestCases = testCases.map(tc => 
        tc.id === selectedTestCase.id ? { ...tc, runStatus: resultFormData.status as any } : tc
      );
      setTestCases(updatedTestCases);
      
      if (selectedTestCase?.id === selectedTestCase.id) {
        setSelectedTestCase({ ...selectedTestCase, runStatus: resultFormData.status as any });
      }
      
      // Email notification: test_failed → TC author + run assignee (fire-and-forget)
      if (resultFormData.status === 'failed') {
        void (async () => {
          try {
            const recipientMap = new Map<string, { user_id: string; email: string }>();

            // TC author (created_by is a UUID)
            const authorId = (selectedTestCase as any).created_by as string | undefined;
            if (authorId) {
              const authorMember = projectMembers.find((m) => m.user_id === authorId);
              if (authorMember?.email) {
                recipientMap.set(authorMember.email, { user_id: authorMember.user_id, email: authorMember.email });
              }
            }

            // Run assignee (stored as display name string)
            const assigneeName = runAssignees.get(selectedTestCase.id);
            if (assigneeName) {
              const assigneeMember = projectMembers.find(
                (m) => m.full_name === assigneeName || m.email === assigneeName,
              );
              if (assigneeMember?.email) {
                recipientMap.set(assigneeMember.email, { user_id: assigneeMember.user_id, email: assigneeMember.email });
              }
            }

            const recipients = Array.from(recipientMap.values());
            if (recipients.length > 0) {
              await supabase.functions.invoke('send-notification', {
                body: {
                  event_type: 'test_failed',
                  payload: {
                    project_name: project?.name ?? '',
                    run_name: run?.name ?? '',
                    test_case_name: selectedTestCase.title,
                    cta_url: `${window.location.origin}/projects/${projectId}/runs/${runId}`,
                  },
                  recipients,
                },
              });
            }
          } catch (err) {
            console.warn('test_failed email notification error:', err);
          }
        })();
      }

      // Update run stats (passed/failed/blocked/retest/untested) and status
      await updateRunStatus(runId!, updatedTestCases);

      // Email notification: run_completed when all TCs are done (fire-and-forget)
      const untestedRemaining = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
      if (untestedRemaining === 0) {
        void (async () => {
          try {
            const recipients = projectMembers
              .filter((m) => m.email)
              .map((m) => ({ user_id: m.user_id, email: m.email }));
            if (recipients.length > 0) {
              const passedCount = updatedTestCases.filter((tc) => tc.runStatus === 'passed').length;
              const failedCount = updatedTestCases.filter((tc) => tc.runStatus === 'failed').length;
              const total = updatedTestCases.length;
              await supabase.functions.invoke('send-notification', {
                body: {
                  event_type: 'run_completed',
                  payload: {
                    project_name: project?.name ?? '',
                    run_name: run?.name ?? '',
                    pass_rate: total > 0 ? Math.round((passedCount / total) * 100) : 0,
                    failed_count: failedCount,
                    cta_url: `${window.location.origin}/projects/${projectId}/runs/${runId}`,
                  },
                  recipients,
                },
              });
            }
          } catch (err) {
            console.warn('run_completed email notification error:', err);
          }
        })();
      }

      resetResultForm();
      setShowAddResultModal(false);

      // Switch to Results tab
      setActiveTab('results');
    } catch (error: any) {
      console.error('결과 저장 오류:', error);
      showToast('error', error?.message || 'Failed to save result.');
    }
  };

  // ── SS version helpers ────────────────────────────────────────────────────
  // Returns SharedStepRef entries in a TC that have a newer version available
  const getOutdatedRefs = (tc: TestCaseWithRunStatus) => {
    if (!tc.steps) return [] as { id: string; type: 'shared_step_ref'; shared_step_id: string; shared_step_custom_id: string; shared_step_name: string; shared_step_version: number }[];
    try {
      const p = JSON.parse(tc.steps);
      if (!Array.isArray(p)) return [];
      return (p as any[]).filter((s: any) => {
        if (s.type !== 'shared_step_ref') return false;
        const latest = ssLatestVersions[s.shared_step_id];
        return latest && s.shared_step_version != null && latest.version > s.shared_step_version;
      });
    } catch { return []; }
  };

  const canUpdateTC = (tc: TestCaseWithRunStatus) =>
    (tc.runStatus === 'untested' || tc.runStatus === 'retest') && run?.status !== 'completed';

  // Fetch old-version steps for diff display (lazy, cached)
  const fetchOldVersionSteps = async (ssId: string, version: number) => {
    const key = `${ssId}:${version}`;
    if (oldVersionStepsCache[key] !== undefined) return;
    const { data } = await supabase
      .from('shared_step_versions')
      .select('steps')
      .eq('shared_step_id', ssId)
      .eq('version', version)
      .maybeSingle();
    setOldVersionStepsCache(prev => ({ ...prev, [key]: data?.steps ?? [] }));
  };

  const handleUpdateSSVersion = async (tcId: string, ssId: string) => {
    const latest = ssLatestVersions[ssId];
    const tc = testCases.find(t => t.id === tcId);
    if (!latest || !tc || !tc.steps || !canUpdateTC(tc)) return;
    try {
      const parsed = JSON.parse(tc.steps) as any[];
      const updated = parsed.map((s: any) =>
        s.type === 'shared_step_ref' && s.shared_step_id === ssId
          ? { ...s, shared_step_version: latest.version }
          : s
      );
      await supabase.from('test_cases').update({ steps: JSON.stringify(updated) }).eq('id', tcId);
      // Update local TC state
      setTestCases(prev => prev.map(t => t.id === tcId ? { ...t, steps: JSON.stringify(updated) } : t));
      if (selectedTestCase?.id === tcId) {
        setSelectedTestCase(prev => prev ? { ...prev, steps: JSON.stringify(updated) } : prev);
      }
      // Re-expand and update snapshot
      const refIds = [...new Set(updated.filter((s: any) => s.type === 'shared_step_ref').map((s: any) => s.shared_step_id as string))];
      const { data: ssData } = await supabase.from('shared_steps').select('id, name, custom_id, steps').in('id', refIds);
      if (ssData) {
        const cache: SharedStepCache = {};
        ssData.forEach((ss: any) => { cache[ss.id] = { name: ss.name, custom_id: ss.custom_id, steps: ss.steps }; });
        const newFlat = expandFlatSteps(updated, cache);
        const newSnapshot = { ...stepsSnapshot, [tcId]: newFlat };
        setStepsSnapshot(newSnapshot);
        await supabase.from('test_runs').update({ steps_snapshot: newSnapshot }).eq('id', runId);
      }
      setExpandedDiffKey(null);
      showToast('success', `Shared Step '${latest.name}' updated to v${latest.version}`);
    } catch {
      showToast('error', 'Failed to update Shared Step version');
    }
  };

  const handleUpdateAllSSVersions = async () => {
    const updatable = testCases.filter(tc => canUpdateTC(tc) && getOutdatedRefs(tc).length > 0);
    for (const tc of updatable) {
      for (const ref of getOutdatedRefs(tc)) {
        await handleUpdateSSVersion(tc.id, ref.shared_step_id);
      }
    }
    setVersionBannerDismissed(true);
  };

  const handleUpdateTCVersion = async (tcId: string) => {
    if (!run?.id) return;
    const tc = testCases.find(t => t.id === tcId);
    if (!tc || !canUpdateTC(tc)) return;
    try {
      const newSnapshot = {
        ...tcVersionsSnapshot,
        [tcId]: {
          major: (tc as any).version_major ?? 1,
          minor: (tc as any).version_minor ?? 0,
          status: (tc as any).version_status ?? 'published',
        },
      };
      setTcVersionsSnapshot(newSnapshot);
      await supabase.from('test_runs').update({ tc_versions_snapshot: newSnapshot }).eq('id', run.id);
      showToast('success', `TC updated to v${(tc as any).version_major ?? 1}.${(tc as any).version_minor ?? 0}`);
    } catch {
      showToast('error', 'Failed to update TC version');
    }
  };

  // Helper: parse steps field — handles JSON array string, plain text, or already-parsed JSONB array
  const parseStepsField = (raw: unknown): AnyStep[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as AnyStep[];
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      } catch {}
      // Plain text format: each line is a step
      return raw.split('\n').filter(l => l.trim()).map((line, i) => ({
        id: String(i),
        step: line.trim(),
        expectedResult: '',
      }));
    }
    return [];
  };

  const openTCDiffModal = async (tc: TestCase) => {
    const snapVer = tcVersionsSnapshot[tc.id];
    if (!snapVer) return;
    const liveMajor = (tc as any).version_major ?? 1;
    const liveMinor = (tc as any).version_minor ?? 0;

    // Open modal immediately with snapshot metadata + loading state
    setTcDiffModal({
      tcId: tc.id,
      tcTitle: tc.title,
      snapMajor: snapVer.major,
      snapMinor: snapVer.minor,
      liveMajor,
      liveMinor,
      snapSteps: stepsSnapshot[tc.id] ?? [],
      liveSteps: [],
      snapTitle: snapVer.title,
      snapDescription: snapVer.description,
      snapPrecondition: snapVer.precondition,
      snapExpectedResult: snapVer.expected_result,
      snapTags: snapVer.tags,
      loading: true,
    });

    try {
      // Fetch live fields + steps_snapshot in parallel
      const [{ data: freshTC }, { data: freshRun }] = await Promise.all([
        supabase.from('test_cases').select('title, description, precondition, expected_result, tags, steps').eq('id', tc.id).single(),
        run?.id
          ? supabase.from('test_runs').select('steps_snapshot').eq('id', run.id).single()
          : Promise.resolve({ data: null }),
      ]);

      // Live steps
      const liveSteps = expandFlatSteps(parseStepsField(freshTC?.steps), sharedStepsCache);

      // Snapshot steps: prefer in-memory state, fall back to fresh DB fetch
      let snapSteps = stepsSnapshot[tc.id] ?? [];
      if (snapSteps.length === 0 && freshRun?.steps_snapshot) {
        const freshSnap = freshRun.steps_snapshot as Record<string, FlatStep[]>;
        snapSteps = freshSnap[tc.id] ?? [];
      }
      // If still empty and steps are plain text, show them
      if (snapSteps.length === 0 && snapVer.title === undefined) {
        // Older snapshot without field data — try tc state as baseline
        const baseParsed = parseStepsField((tc as any).steps);
        if (baseParsed.length > 0) snapSteps = expandFlatSteps(baseParsed, sharedStepsCache);
      }

      setTcDiffModal(prev => prev ? {
        ...prev,
        liveSteps,
        snapSteps,
        liveTitle: freshTC?.title ?? undefined,
        liveDescription: freshTC?.description ?? undefined,
        livePrecondition: freshTC?.precondition ?? undefined,
        liveExpectedResult: (freshTC as any)?.expected_result ?? undefined,
        liveTags: freshTC?.tags ?? undefined,
        loading: false,
      } : null);
    } catch {
      setTcDiffModal(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const filteredTestCases = testCases.filter(testCase => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || testCase.runStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || testCase.priority === priorityFilter;
    const matchesFolder = selectedFolder === null || testCase.folder === selectedFolder;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesFolder;
  }).sort((a, b) => {
    const aId = (a as any).custom_id || '';
    const bId = (b as any).custom_id || '';
    const aMatch = aId.match(/(\D+)(\d+)$/);
    const bMatch = bId.match(/(\D+)(\d+)$/);
    if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
      return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
    }
    return aId.localeCompare(bId);
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'blocked':
        return 'bg-gray-100 text-gray-700';
      case 'retest':
        return 'bg-yellow-100 text-yellow-700';
      case 'untested':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return 'ri-checkbox-circle-fill';
      case 'failed':
        return 'ri-close-circle-fill';
      case 'blocked':
        return 'ri-forbid-fill';
      case 'retest':
        return 'ri-refresh-line';
      case 'untested':
        return 'ri-question-fill';
      default:
        return 'ri-question-fill';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'blocked':
        return 'Blocked';
      case 'retest':
        return 'Retest';
      case 'untested':
        return 'Untested';
      default:
        return 'Untested';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingFile(true);
      const uploadedFiles: { name: string; url: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${projectId}/test-results/${fileName}`;

        const { data, error } = await supabase.storage
          .from('test-case-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('파일 업로드 오류:', error);
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('test-case-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
        });
      }

      setResultFormData({
        ...resultFormData,
        attachments: [...resultFormData.attachments, ...uploadedFiles],
      });
    } catch (error: any) {
      console.error('파일 업로드 오류:', error);
      showToast('error', `Failed to upload file: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    try {
      const fileToRemove = resultFormData.attachments[index];
      
      if (fileToRemove.url) {
        const urlParts = fileToRemove.url.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'test-case-attachments');
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/');
          
          const { error } = await supabase.storage
            .from('test-case-attachments')
            .remove([filePath]);
          
          if (error) {
            console.error('파일 삭제 오류:', error);
          }
        }
      }

      const newAttachments = [...resultFormData.attachments];
      newAttachments.splice(index, 1);
      setResultFormData({
        ...resultFormData,
        attachments: newAttachments,
      });
    } catch (error) {
      console.error('첨부파일 삭제 오류:', error);
    }
  };

  const handleScreenshot = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showToast('error', '이 브라우저는 스크린샷 기능을 지원하지 않습니다.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' as any }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `screenshot_${Date.now()}.png`;
        const filePath = `${projectId}/test-results/${fileName}`;

        setUploadingFile(true);
        try {
          const { data, error } = await supabase.storage
            .from('test-case-attachments')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('test-case-attachments')
            .getPublicUrl(filePath);

          setResultFormData({
            ...resultFormData,
            attachments: [...resultFormData.attachments, {
              name: fileName,
              url: urlData.publicUrl,
              size: blob.size,
            }],
          });
        } catch (error: any) {
          console.error('스크린샷 업로드 오류:', error);
          showToast('error', `Failed to upload screenshot: ${error.message || 'Unknown error'}`);
        } finally {
          setUploadingFile(false);
        }
      }, 'image/png');
    } catch (error: any) {
      console.error('스크린샷 캡처 오류:', error);
      showToast('error', error?.message || 'Failed to capture screenshot.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getJiraIssueUrl = (issueKey: string) => {
    if (!jiraDomain) return '#';
    return `https://${jiraDomain}/browse/${issueKey}`;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTestCases.map(tc => tc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleAddIssueClick = () => {
    const isProfessionalOrHigher = (userProfile?.subscription_tier || 1) >= 2;
    
    if (!isProfessionalOrHigher) {
      setShowUpgradeModal(true);
      return;
    }

    if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
      setShowJiraSetupModal(true);
      return;
    }

    setShowAddIssueModal(true);
  };

  const handleCreateJiraIssue = async (fromIssuesTab = false) => {
    if (!issueFormData.summary.trim()) {
      showToast('error', 'Summary는 필수 항목입니다.');
      return;
    }

    if (!jiraSettings || !selectedTestCase) {
      return;
    }

    try {
      setCreatingIssue(true);

      const labelsArray = issueFormData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

      const componentsArray = issueFormData.components
        .split(',')
        .map(c => c.trim())
        .filter(c => c);

      // Attach to latest existing test_result when Issues tab flow (not Add Result modal).
      // When Add Result modal is open, no result exists yet → server-side persist skipped
      // and the issue key goes to pendingJiraIssues so it joins the new result on save.
      const attachedResultId = !showAddResultModal && testResults.length > 0 ? testResults[0].id : undefined;

      const { data, error } = await supabase.functions.invoke('create-jira-issue', {
        body: {
          domain: jiraSettings.domain,
          email: jiraSettings.email,
          apiToken: jiraSettings.api_token,
          projectKey: jiraSettings.project_key,
          summary: issueFormData.summary,
          description: issueFormData.description,
          issueType: issueFormData.issueType,
          priority: issueFormData.priority,
          labels: labelsArray,
          assignee: issueFormData.assignee || undefined,
          components: componentsArray.length > 0 ? componentsArray : undefined,
          test_result_id: attachedResultId,
          run_id: runId,
          project_id: projectId,
        },
      });

      if (error) throw error;

      if (data.success && data.issue && data.issue.key) {
        const newIssueKey = data.issue.key;

        // Add Result 모달이 열려 있는 경우: pending 상태로 보관 (새 result에 포함)
        if (showAddResultModal) {
          setPendingJiraIssues(prev => [...prev, newIssueKey]);
          showToast('success', `Jira issue ${newIssueKey} created`);
          setShowAddIssueModal(false);
          setIssueFormData({ summary: '', description: '', issueType: 'Bug', priority: 'Medium', labels: '', assignee: '', components: '' });
        } else if (testResults.length > 0) {
          // Issues 탭에서 직접 생성: 최신 result에 이슈 추가
          const latestResult = testResults[0];
          const updatedIssues = [...(latestResult.issues || []), newIssueKey];

          const { error: updateError } = await supabase
            .from('test_results')
            .update({ issues: updatedIssues })
            .eq('id', latestResult.id);

          if (updateError) throw updateError;

          // Update local state
          setTestResults(testResults.map(r =>
            r.id === latestResult.id
              ? { ...r, issues: updatedIssues }
              : r
          ));

          showToast('success', `Jira issue ${newIssueKey} created`);
          setShowAddIssueModal(false);
          setIssueFormData({
            summary: '',
            description: '',
            issueType: 'Bug',
            priority: 'Medium',
            labels: '',
            assignee: '',
            components: '',
          });

          // Issues 탭으로 전환
          setActiveTab('issues');

          // 최신 결과 다시 로드
          await fetchTestResults();
        } else {
          // result가 없는 경우: 이슈 키만 메모리에 임시 보관 (자동 failed result 생성 없음)
          showToast('success', `Jira issue ${newIssueKey} created. Add Result로 테스트 결과를 기록하면 이슈가 자동으로 연결됩니다.`);
          setShowAddIssueModal(false);
          setIssueFormData({ summary: '', description: '', issueType: 'Bug', priority: 'Medium', labels: '', assignee: '', components: '' });
        }
      } else {
        throw new Error(data.error || data.message || 'Failed to create Jira issue.');
      }
    } catch (error: any) {
      console.error('Jira 이슈 생성 오류:', error);
      showToast('error', `Failed to create Jira issue: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleCreateGithubIssue = async () => {
    if (!githubIssueFormData.title.trim() || !githubSettings) return;
    setCreatingGithubIssue(true);
    try {
      const labelsArray = githubIssueFormData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

      // Attach to latest existing test_result when Issues tab flow (not Add Result modal).
      // When Add Result modal is open, no result exists yet → goes to pendingGithubIssues.
      const attachedResultId = !showAddResultModal && testResults.length > 0 ? testResults[0].id : undefined;

      const { data, error } = await supabase.functions.invoke('create-github-issue', {
        body: {
          token: githubSettings.token,
          owner: githubSettings.owner,
          repo: githubSettings.repo,
          title: githubIssueFormData.title,
          body: githubIssueFormData.body || undefined,
          labels: labelsArray.length > 0 ? labelsArray : (githubSettings.default_labels.length > 0 ? githubSettings.default_labels : undefined),
          assignee: githubIssueFormData.assignee || undefined,
          test_result_id: attachedResultId,
          run_id: runId,
          project_id: projectId,
        },
      });

      if (error) throw error;
      if (data?.success && data?.issue?.number) {
        const newIssue = { number: data.issue.number, url: data.issue.html_url, repo: githubSettings.repo };
        setPendingGithubIssues(prev => [...prev, newIssue]);
        setShowGithubIssueModal(false);
        setGithubIssueFormData({ title: '', body: '', labels: '', assignee: '' });
        setGithubLabelInput('');
        setAssigneeQuery('');
        setShowAssigneeSuggest(false);
        showToast('success', `GitHub issue #${data.issue.number} created`);
      } else {
        throw new Error(data?.error || 'Failed to create GitHub issue.');
      }
    } catch (error: any) {
      console.error('GitHub 이슈 생성 오류:', error);
      showToast('error', `Failed to create GitHub issue: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingGithubIssue(false);
    }
  };

  const fetchGithubAssignees = useCallback(async () => {
    if (!githubSettings?.token || !githubSettings?.owner || !githubSettings?.repo) return;
    try {
      const res = await fetch(
        `https://api.github.com/repos/${githubSettings.owner}/${githubSettings.repo}/assignees?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${githubSettings.token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );
      if (res.ok) setGithubAssignees(await res.json());
    } catch { /* ignore */ }
  }, [githubSettings]);

  const getGithubLabelsArray = () =>
    githubIssueFormData.labels ? githubIssueFormData.labels.split(',').map(t => t.trim()).filter(t => t) : [];

  const handleCopyRunId = () => {
    if (!runId) return;
    navigator.clipboard.writeText(runId).then(() => {
      setCopiedRunId(true);
      setTimeout(() => setCopiedRunId(false), 2000);
    });
  };

  const handleAssigneeChange = async (testCaseId: string, assigneeName: string) => {
    try {
      const { error } = await supabase
        .from('run_testcase_assignees')
        .upsert(
          {
            run_id: runId,
            test_case_id: testCaseId,
            assignee: assigneeName || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'run_id,test_case_id' }
        );

      if (error) throw error;

      const updatedMap = new Map(runAssignees);
      if (assigneeName) {
        updatedMap.set(testCaseId, assigneeName);
      } else {
        updatedMap.delete(testCaseId);
      }
      setRunAssignees(updatedMap);

      // Email notification: tc_assigned → the newly assigned member (fire-and-forget)
      if (assigneeName) {
        void (async () => {
          try {
            const tc = testCases.find((t) => t.id === testCaseId);
            const assigneeMember = projectMembers.find(
              (m) => m.full_name === assigneeName || m.email === assigneeName,
            );
            if (assigneeMember?.email && tc) {
              await supabase.functions.invoke('send-notification', {
                body: {
                  event_type: 'tc_assigned',
                  payload: {
                    project_name: project?.name ?? '',
                    run_name: run?.name ?? '',
                    test_case_name: tc.title,
                    user_name: assigneeMember.full_name || assigneeName,
                    cta_url: `${window.location.origin}/projects/${projectId}/runs/${runId}`,
                  },
                  recipients: [{ user_id: assigneeMember.user_id, email: assigneeMember.email }],
                },
              });
            }
          } catch (err) {
            console.warn('tc_assigned email notification error:', err);
          }
        })();
      }
    } catch (error) {
      console.error('Assignee 업데이트 오류:', error);
    }
  };

  const handleBulkAssigneeChange = async (assigneeName: string) => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const rows = ids.map((testCaseId) => ({
        run_id: runId,
        test_case_id: testCaseId,
        assignee: assigneeName || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('run_testcase_assignees')
        .upsert(rows, { onConflict: 'run_id,test_case_id' });

      if (error) throw error;

      const updatedMap = new Map(runAssignees);
      ids.forEach((id) => {
        if (assigneeName) {
          updatedMap.set(id, assigneeName);
        } else {
          updatedMap.delete(id);
        }
      });
      setRunAssignees(updatedMap);
      setSelectedIds(new Set());
      setBulkAssignee('');
    } catch (error) {
      console.error('Bulk assignee 업데이트 오류:', error);
    }
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];
  const isProfessionalOrHigher = currentTier >= 2;

  // Focus Mode handler
  const handleFocusStatusChange = useCallback(
    async (testId: string, status: TestStatus, note?: string) => {
      await handleStatusChange(testId, status);
      if (note?.trim()) {
        const { data: latest } = await supabase
          .from('test_results')
          .select('id')
          .eq('run_id', runId)
          .eq('test_case_id', testId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.id) {
          await supabase.from('test_results').update({ note: note.trim() }).eq('id', latest.id);
        }
      }
    },
    [handleStatusChange, runId]
  );

  // Auto-open Focus Mode when ?focus=true is in the URL (e.g. from Continue button)
  useEffect(() => {
    if (!loading && testCases.length > 0 && searchParams.get('focus') === 'true') {
      setFocusModeOpen(true);
    }
  }, [loading, testCases.length, searchParams]);

  const focusTests: FocusTestCase[] = testCases.map((tc) => ({
    id: tc.id,
    customId: (tc as any).custom_id,
    title: tc.title,
    description: tc.description,
    steps: tc.steps,
    expected_result: tc.expected_result,
    precondition: tc.precondition,
    folder: tc.folder,
    priority: tc.priority,
    tags: tc.tags,
    assignee: tc.assignee,
    runStatus: tc.runStatus,
    attachments: tc.attachments,
  }));

  return (
    <>
    {focusModeOpen && (() => {
      // Sort by customId ascending (e.g. TC-001, TC-002, ...) using numeric suffix
      const sortedFocusTests = [...focusTests].sort((a, b) => {
        const aId = a.customId || '';
        const bId = b.customId || '';
        const aMatch = aId.match(/^(\D+?)(\d+)$/);
        const bMatch = bId.match(/^(\D+?)(\d+)$/);
        if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
          return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
        }
        return aId.localeCompare(bId);
      });
      const firstUntestedIndex = sortedFocusTests.findIndex(tc => tc.runStatus === 'untested');
      return (
        <FocusMode
          tests={sortedFocusTests}
          runName={run?.name || t('runs:detail.page.runNameFallback')}
          onStatusChange={handleFocusStatusChange}
          onExit={() => setFocusModeOpen(false)}
          initialIndex={firstUntestedIndex >= 0 ? firstUntestedIndex : 0}
          ssLatestVersions={ssLatestVersions}
          runCompleted={run?.status === 'completed'}
          onUpdateSharedStep={(tcId, ssId) => handleUpdateSSVersion(tcId, ssId)}
        />
      );
    })()}
    <div className="flex h-screen bg-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <i className={toast.type === 'success' ? 'ri-check-line text-emerald-500' : 'ri-error-warning-line text-rose-500'} />
          <span className="text-[0.8125rem] font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-current opacity-50 hover:opacity-100 cursor-pointer">
            <i className="ri-close-line" />
          </button>
        </div>
      )}
      <ErrorBoundary section sectionName="Run Detail">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={projectId || ''} projectName={project?.name || ''} />

        <main className="flex-1 overflow-hidden bg-gray-50/30 flex">
          {/* 폴더 사이드바 */}
          <div className={`flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto transition-all duration-200 ${isFolderSidebarOpen ? 'w-[200px]' : 'w-12'}`}>
            <div className={`px-[0.875rem] py-[0.75rem] border-b border-slate-200 flex items-center ${isFolderSidebarOpen ? 'justify-between' : 'justify-center'}`}>
              {isFolderSidebarOpen && (
                <span className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-[0.04em]">{t('runs:detail.folderSidebar.title')}</span>
              )}
              <button
                onClick={() => setIsFolderSidebarOpen(!isFolderSidebarOpen)}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded transition-all cursor-pointer flex-shrink-0 border-0 bg-transparent"
                title={isFolderSidebarOpen ? t('runs:detail.folderSidebar.collapseTooltip') : t('runs:detail.folderSidebar.expandTooltip')}
              >
                <i className={`ri-${isFolderSidebarOpen ? 'arrow-left-s' : 'arrow-right-s'}-line text-base`}></i>
              </button>
            </div>
            <div className="flex-1 py-1">
              {/* All */}
              <button
                onClick={() => { setSelectedFolder(null); selectTestCase(null); }}
                className={`w-full flex items-center gap-2 py-[0.4375rem] text-[0.8125rem] font-medium transition-all cursor-pointer text-left ${isFolderSidebarOpen ? 'px-[0.875rem]' : 'px-0 justify-center'} ${
                  selectedFolder === null
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                title={!isFolderSidebarOpen ? t('runs:detail.folderSidebar.allCases') : undefined}
              >
                <i className={`ri-folder-3-line text-[0.9375rem] flex-shrink-0 ${selectedFolder === null ? 'text-indigo-500' : 'text-slate-400'}`}></i>
                {isFolderSidebarOpen && (
                  <>
                    <span className="truncate">{t('runs:detail.folderSidebar.allCases')}</span>
                    <span className={`ml-auto text-[0.75rem] flex-shrink-0 ${selectedFolder === null ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {testCases.length}
                    </span>
                  </>
                )}
              </button>

              {/* 폴더 목록 */}
              {folders.length > 0 && (
                <div className="">
                  {folders.map((folder) => {
                    const count = testCases.filter(tc => tc.folder === folder.name).length;
                    const isSelected = selectedFolder === folder.name;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => { setSelectedFolder(folder.name); selectTestCase(null); }}
                        className={`w-full flex items-center gap-2 py-[0.4375rem] text-[0.8125rem] font-medium transition-all cursor-pointer text-left ${isFolderSidebarOpen ? 'px-[0.875rem]' : 'px-0 justify-center'} ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        title={!isFolderSidebarOpen ? folder.name : undefined}
                      >
                        {(() => {
                          const fs = FOLDER_COLOR_MAP[folder.color || 'indigo'] || { bg: '#EEF2FF', fg: '#6366F1' };
                          return (
                            <span
                              className="flex-shrink-0 flex items-center justify-center"
                              style={{ width: 15, height: 15, flexShrink: 0 }}
                            >
                              <i className={`${folder.icon || 'ri-folder-line'} text-[0.9375rem]`} style={{ color: isSelected ? '#6366F1' : fs.fg }}></i>
                            </span>
                          );
                        })()}
                        {isFolderSidebarOpen && (
                          <>
                            <span className="truncate">{folder.name}</span>
                            <span className={`ml-auto text-[0.75rem] flex-shrink-0 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                              {count}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {folders.length === 0 && !loading && isFolderSidebarOpen && (
                <div className="px-[0.875rem] py-4 text-center">
                  <p className="text-[0.75rem] text-slate-400">{t('runs:detail.folderSidebar.empty')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-[1.75rem]">
              <div className="mb-5">
                <Link
                  to={`/projects/${projectId}/runs`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline mb-1 cursor-pointer"
                >
                  <i className="ri-arrow-left-line text-sm"></i>
                  {t('runs:detail.page.backToRuns')}
                </Link>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h1 className="text-[1.375rem] font-bold text-slate-900">{run?.name}</h1>
                      {(() => {
                        const statusKey =
                          run?.status === 'completed' ? 'completed' :
                          run?.status === 'in_progress' ? 'inProgress' :
                          run?.status === 'under_review' ? 'underReview' :
                          run?.status === 'paused' ? 'paused' : 'draft';
                        const isInProgress = run?.status === 'in_progress';
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-blue-100 text-blue-700">
                            {isInProgress && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                            {t(`runs:detail.runStatus.${statusKey}`)}
                          </span>
                        );
                      })()}
                      {run?.is_automated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-sky-50 text-sky-600">
                          <i className="ri-robot-line" style={{ fontSize: '0.75rem' }}></i>
                          {t('runs:detail.page.automatedBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-[0.8125rem] text-slate-400">
                      {run?.created_at && `${t('runs:detail.page.startedPrefix', { date: formatShortDate(run.created_at, i18n.language) })} · `}
                      {testCases.length > 0 && `${t('runs:detail.page.percentCompletedSuffix', { percent: Math.round((testCases.filter(tc => tc.runStatus !== 'untested').length / testCases.length) * 100) })} · `}
                      {t('runs:detail.page.testCasesCount', { count: testCases.length })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Export button */}
                    {testCases.length > 0 && (
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-[0.4375rem] rounded-lg text-[0.8125rem] font-medium transition-colors cursor-pointer border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        style={{ color: '#475569', background: 'white' }}
                        title={t('runs:detail.headerActions.exportTooltip')}
                      >
                        <i className="ri-download-2-line text-base" />
                        {t('runs:detail.headerActions.export')}
                      </button>
                    )}
                    {/* AI Summary standalone button */}
                    {(userProfile?.subscription_tier ?? 1) >= 2 ? (
                      <button
                        onClick={() => { setShowAISummary(true); setShowUpgradeNudge(false); }}
                        className="flex items-center gap-1.5 px-3.5 py-[0.4375rem] rounded-lg text-[0.8125rem] font-medium transition-colors cursor-pointer border border-violet-200 hover:border-violet-400 hover:bg-violet-50"
                        style={{ color: '#4338CA', background: 'white' }}
                      >
                        <i className="ri-sparkling-2-fill text-base" style={{ color: '#8B5CF6' }} />
                        {t('runs:detail.headerActions.aiSummary')}
                        {aiSummaryState === 'fresh' && (
                          <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>✓</span>
                        )}
                        {aiSummaryState === 'stale' && (
                          <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>⚠️</span>
                        )}
                        {aiSummaryState === 'none' && showAINewBadge && (
                          <span style={{ fontSize: '10px', background: '#EDE9FE', color: '#6D28D9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {t('runs:detail.headerActions.aiSummaryNewBadge')}
                          </span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowUpgradeNudge(true); setShowAISummary(false); }}
                        className="flex items-center gap-1.5 px-3.5 py-[0.4375rem] rounded-lg text-[0.8125rem] font-medium cursor-pointer border border-slate-200 opacity-60 hover:opacity-80 transition-opacity"
                        style={{ color: '#94A3B8', background: 'white' }}
                      >
                        <i className="ri-lock-line text-base" style={{ color: '#94A3B8' }} />
                        {t('runs:detail.headerActions.aiSummary')}
                        <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {t('runs:detail.headerActions.aiSummaryLockedBadge')}
                        </span>
                      </button>
                    )}
                    {testCases.length > 0 && (
                      <button
                        onClick={() => setFocusModeOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-[0.4375rem] bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[0.8125rem] font-semibold transition-colors cursor-pointer border border-indigo-500"
                        title={t('runs:detail.headerActions.focusModeTooltip')}
                      >
                        <i className="ri-focus-3-line text-base" />
                        {t('runs:detail.headerActions.focusMode')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-[0.875rem] mb-4">
                {[
                  { label: t('runs:detail.kpi.totalTests'), icon: 'ri-file-list-3-line', iconBg: '#DBEAFE', iconColor: '#2563EB', value: testCases.length, valueColor: undefined },
                  { label: t('common:passed'), icon: 'ri-checkbox-circle-fill', iconBg: '#D1FAE5', iconColor: '#16A34A', value: testCases.filter(tc => tc.runStatus === 'passed').length, valueColor: '#16A34A' },
                  { label: t('common:failed'), icon: 'ri-close-circle-fill', iconBg: '#FEE2E2', iconColor: '#DC2626', value: testCases.filter(tc => tc.runStatus === 'failed').length, valueColor: undefined },
                  { label: t('common:blocked'), icon: 'ri-forbid-fill', iconBg: '#F1F5F9', iconColor: '#64748B', value: testCases.filter(tc => tc.runStatus === 'blocked').length, valueColor: undefined },
                  { label: t('common:untested'), icon: 'ri-time-fill', iconBg: '#FEF3C7', iconColor: '#D97706', value: testCases.filter(tc => tc.runStatus === 'untested').length, valueColor: undefined },
                ].map(({ label, icon, iconBg, iconColor, value, valueColor }) => (
                  <div key={label} className="bg-white rounded-[0.625rem] border border-gray-200 py-4 px-[1.125rem] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                      <i className={`${icon} text-base`} style={{ color: iconColor }}></i>
                    </div>
                    <div>
                      <p className="text-[0.6875rem] text-slate-400 font-medium">{label}</p>
                      <p className="text-[1.75rem] font-extrabold text-slate-900 leading-[1.2]" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 진행률 바 */}
              {testCases.length > 0 && (() => {
                const total = testCases.length;
                const passed = testCases.filter(tc => tc.runStatus === 'passed').length;
                const failed = testCases.filter(tc => tc.runStatus === 'failed').length;
                const blocked = testCases.filter(tc => tc.runStatus === 'blocked').length;
                const retest = testCases.filter(tc => tc.runStatus === 'retest').length;
                const untested = testCases.filter(tc => tc.runStatus === 'untested').length;

                const passedPct = (passed / total) * 100;
                const failedPct = (failed / total) * 100;
                const blockedPct = (blocked / total) * 100;
                const retestPct = (retest / total) * 100;
                const untestedPct = (untested / total) * 100;

                return (
                  <div className="bg-white rounded-[0.625rem] border border-gray-200 py-4 px-[1.125rem] mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[0.8125rem] font-semibold text-slate-900">{t('runs:detail.progress.title')}</span>
                      <span className="text-[0.8125rem] font-bold text-slate-900">
                        {total > 0 ? Math.round(((passed + failed + blocked + retest) / total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 gap-px mb-2">
                      {passed > 0 && (
                        <div
                          className="bg-green-500 transition-all duration-500"
                          style={{ width: `${passedPct}%` }}
                          title={t('runs:detail.progress.tooltipCount', { label: t('common:passed'), count: passed })}
                        />
                      )}
                      {failed > 0 && (
                        <div
                          className="bg-red-500 transition-all duration-500"
                          style={{ width: `${failedPct}%` }}
                          title={t('runs:detail.progress.tooltipCount', { label: t('common:failed'), count: failed })}
                        />
                      )}
                      {blocked > 0 && (
                        <div
                          className="bg-gray-400 transition-all duration-500"
                          style={{ width: `${blockedPct}%` }}
                          title={t('runs:detail.progress.tooltipCount', { label: t('common:blocked'), count: blocked })}
                        />
                      )}
                      {retest > 0 && (
                        <div
                          className="bg-yellow-400 transition-all duration-500"
                          style={{ width: `${retestPct}%` }}
                          title={t('runs:detail.progress.tooltipCount', { label: t('common:retest'), count: retest })}
                        />
                      )}
                      {untested > 0 && (
                        <div
                          className="bg-gray-200 transition-all duration-500"
                          style={{ width: `${untestedPct}%` }}
                          title={t('runs:detail.progress.tooltipCount', { label: t('common:untested'), count: untested })}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {[
                        { count: passed, color: '#22C55E', label: t('common:passed') },
                        { count: failed, color: '#EF4444', label: t('common:failed') },
                        { count: blocked, color: '#94A3B8', label: t('common:blocked') },
                        { count: retest, color: '#FACC15', label: t('common:retest') },
                        { count: untested, color: '#E2E8F0', label: t('common:untested') },
                      ].map(({ count, color, label }) => (
                        <span key={label} className="inline-flex items-center gap-[0.3125rem] text-[0.6875rem] text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <strong>{count}</strong> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* AI Run Summary Panel */}
              {showAISummary && (() => {
                const _passed = testCases.filter(tc => tc.runStatus === 'passed').length;
                const _failed = testCases.filter(tc => tc.runStatus === 'failed').length;
                const _blocked = testCases.filter(tc => tc.runStatus === 'blocked').length;
                return (
                  <AIRunSummaryPanel
                    runId={runId!}
                    projectId={projectId!}
                    runName={run?.name || ''}
                    totalCount={testCases.length}
                    runDate={run?.created_at}
                    passedCount={_passed}
                    failedCount={_failed}
                    blockedCount={_blocked}
                    onClose={() => setShowAISummary(false)}
                    onToast={(msg, type) => showToast(type, msg)}
                    onSummaryReady={(s) => setAiSummaryData(s)}
                    includeInPdf={includeAiInPdf}
                    onToggleIncludeInPdf={setIncludeAiInPdf}
                    onSummaryStateChange={setAiSummaryState}
                  />
                );
              })()}

              {/* Upgrade Nudge Panel (Free tier) */}
              {showUpgradeNudge && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1E1B4B, #312E81)',
                    border: '1px solid #4338CA',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => setShowUpgradeNudge(false)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      fontSize: '16px',
                    }}
                  >
                    <i className="ri-close-line" />
                  </button>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>✨</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#C7D2FE', marginBottom: '6px' }}>
                    {t('runs:aiSummary.title')}
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#94A3B8',
                      marginBottom: '16px',
                      lineHeight: 1.5,
                      maxWidth: '360px',
                      margin: '0 auto 16px',
                    }}
                  >
                    {t('runs:detail.upgradeNudge.body')}
                  </p>
                  <button
                    onClick={() => navigate('/settings?tab=billing')}
                    style={{
                      background: '#6366F1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="ri-vip-crown-fill" /> {t('runs:detail.upgradeNudge.cta')}
                  </button>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>
                    {t('runs:detail.upgradeNudge.subtitle')}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[0.625rem] border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-[0.625rem] py-[0.875rem] px-[1.125rem] border-b border-gray-200">
                  <div className="flex-1 relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[0.9375rem]"></i>
                    <input
                      type="text"
                      placeholder={t('runs:detail.tcList.filter.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-[0.8125rem] py-[0.4375rem] pl-[2.125rem] pr-[0.875rem] rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white text-slate-700"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-[0.8125rem] py-[0.4375rem] px-[0.625rem] rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700 bg-white"
                  >
                    <option value="all">{t('runs:detail.tcList.filter.allStatus')}</option>
                    <option value="passed">{t('common:passed')}</option>
                    <option value="failed">{t('common:failed')}</option>
                    <option value="blocked">{t('common:blocked')}</option>
                    <option value="retest">{t('common:retest')}</option>
                    <option value="untested">{t('common:untested')}</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="text-[0.8125rem] py-[0.4375rem] px-[0.625rem] rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-slate-700 bg-white"
                  >
                    <option value="all">{t('runs:detail.tcList.filter.allPriority')}</option>
                    <option value="critical">{t('common:issues.priority.critical')}</option>
                    <option value="high">{t('common:high')}</option>
                    <option value="medium">{t('common:medium')}</option>
                    <option value="low">{t('common:low')}</option>
                  </select>
                </div>

                <div>
                  {/* Bulk Action Toolbar */}
                  {selectedIds.size > 0 && (
                    <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <i className="ri-checkbox-multiple-line text-indigo-600"></i>
                      </div>
                      <span className="text-sm font-semibold text-indigo-700">
                        {t('runs:detail.tcList.bulk.selected', { count: selectedIds.size })}
                      </span>
                      <div className="w-px h-4 bg-indigo-300 mx-1"></div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">{t('runs:detail.tcList.bulk.assignToLabel')}</span>
                      <select
                        value={bulkAssignee}
                        onChange={(e) => setBulkAssignee(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">{t('runs:detail.tcList.bulk.unassigned')}</option>
                        {projectMembers.map((member) => (
                          <option key={member.id} value={member.full_name || member.email}>
                            {member.full_name || member.email}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleBulkAssigneeChange(bulkAssignee)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap"
                      >
                        {t('runs:detail.tcList.bulk.apply')}
                      </button>
                      <button
                        onClick={() => { setSelectedIds(new Set()); setBulkAssignee(''); }}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap ml-auto"
                      >
                        {t('runs:detail.tcList.bulk.clearSelection')}
                      </button>
                    </div>
                  )}

                  {/* §SS Version Update Banner */}
                  {(() => {
                    const outdatedTCs = testCases.filter(tc => getOutdatedRefs(tc).length > 0);
                    const updatableTCs = outdatedTCs.filter(tc => canUpdateTC(tc));
                    if (outdatedTCs.length === 0 || versionBannerDismissed) return null;
                    const uniqueSsIds = new Set(outdatedTCs.flatMap(tc => getOutdatedRefs(tc).map((r: any) => r.shared_step_id)));
                    return (
                      <div className="flex items-center gap-3 mx-4 my-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg transition-all duration-200">
                        <i className="ri-refresh-line text-amber-500 text-base flex-shrink-0" />
                        <div className="flex-1 text-xs text-amber-800">
                          <span className="font-semibold">{t('runs:detail.ssBanner.headline', { count: uniqueSsIds.size })}</span>
                          <span className="text-amber-600 ml-1">
                            {'('}
                            {t('runs:detail.ssBanner.tcAffected', { count: outdatedTCs.length })}
                            {updatableTCs.length > 0 && t('runs:detail.ssBanner.untestedUpdatable', { count: updatableTCs.length })}
                            {')'}
                          </span>
                        </div>
                        {updatableTCs.length > 0 && (
                          <button
                            onClick={handleUpdateAllSSVersions}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors duration-200 cursor-pointer flex-shrink-0"
                          >
                            {t('runs:detail.ssBanner.updateAll')}
                          </button>
                        )}
                        <button
                          onClick={() => setVersionBannerDismissed(true)}
                          className="text-amber-600 hover:text-amber-700 text-xs font-medium cursor-pointer flex-shrink-0"
                        >
                          {t('runs:detail.ssBanner.dismiss')}
                        </button>
                      </div>
                    );
                  })()}

                  {/* §11 Deprecated TC Info Banner */}
                  {testCases.some(tc => (tc as any).lifecycle_status === 'deprecated') && (
                    <div className="flex items-start gap-2.5 mx-4 my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                      <i className="ri-information-line text-blue-500 text-base mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>{t('runs:detail.deprecatedBanner.title')}</strong>{' '}
                        {t('runs:detail.deprecatedBanner.countSentence', { count: testCases.filter(tc => (tc as any).lifecycle_status === 'deprecated').length })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border-b border-gray-200">
                    <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-[15px] h-[15px] accent-indigo-600 cursor-pointer"
                        checked={filteredTestCases.length > 0 && selectedIds.size === filteredTestCases.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </div>
                    <div className="col-span-1">
                      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.04em]">{t('runs:detail.tcList.header.idVer')}</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.04em]">{t('runs:detail.tcList.header.testCase')}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.04em]">{t('common:priority')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.04em]">{t('runs:detail.tcList.header.folder')}</span>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.04em]">{t('common:assignee')}</span>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-[0.04em]">{t('common:status')}</span>
                    </div>
                  </div>

                  {filteredTestCases.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-file-list-3-line text-3xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('runs:detail.tcList.empty.title')}</h3>
                      <p className="text-gray-600">{t('runs:detail.tcList.empty.hint')}</p>
                    </div>
                  ) : (
                    filteredTestCases.map((testCase) => (
                      <div
                        key={testCase.id}
                        className={`grid grid-cols-12 gap-4 px-4 py-[0.625rem] border-b border-slate-100 hover:bg-violet-50 transition-colors cursor-pointer ${
                          selectedTestCase?.id === testCase.id ? 'bg-indigo-50' : ''
                        }`}
                        style={(testCase as any).lifecycle_status === 'deprecated' ? { opacity: 0.6 } : undefined}
                        onClick={() => selectTestCase(testCase)}
                      >
                        <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-[15px] h-[15px] accent-indigo-600 cursor-pointer"
                            checked={selectedIds.has(testCase.id)}
                            onChange={(e) => handleSelectOne(testCase.id, e.target.checked)}
                          />
                        </div>
                        <div className="col-span-1 flex flex-col justify-center gap-0.5">
                          <span className="font-mono text-[0.8125rem] text-indigo-600 font-semibold whitespace-nowrap">
                            {(testCase as any).custom_id || '-'}
                          </span>
                          {(() => {
                            const snapVer = tcVersionsSnapshot[testCase.id];
                            const liveMajor = (testCase as any).version_major;
                            const liveMinor = (testCase as any).version_minor ?? 0;
                            const displayMajor = snapVer?.major ?? liveMajor;
                            const displayMinor = snapVer?.minor ?? liveMinor;
                            const displayStatus = snapVer?.status ?? (testCase as any).version_status ?? 'published';
                            if (displayMajor === undefined) return null;
                            const hasNewVer = snapVer && liveMajor !== undefined &&
                              (liveMajor > snapVer.major || (liveMajor === snapVer.major && liveMinor > snapVer.minor));
                            const canUp = hasNewVer && canUpdateTC(testCase);
                            return (
                              <>
                                <span className={`text-[0.5625rem] font-semibold ${displayStatus === 'draft' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  TC v{displayMajor}.{displayMinor}
                                  {displayStatus === 'draft' && ' ⚠'}
                                </span>
                                {hasNewVer && (
                                  <span
                                    onClick={canUp ? (e) => { e.stopPropagation(); openTCDiffModal(testCase); } : undefined}
                                    className={`self-start inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[0.5rem] leading-none font-bold transition-all duration-200 ${
                                      canUp ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer' : 'bg-slate-100 text-slate-500 cursor-default'
                                    }`}
                                    title={canUp ? t('runs:detail.tcList.versionBadge.tcUpdatedClickable', { major: liveMajor, minor: liveMinor }) : t('runs:detail.tcList.versionBadge.locked')}
                                  >
                                    {canUp
                                      ? <><i className="ri-arrow-up-line" />v{liveMajor}.{liveMinor}</>
                                      : <><i className="ri-lock-line" />v{liveMajor}.{liveMinor}</>
                                    }
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                          <span className="text-[0.8125rem] font-semibold text-slate-900 truncate hover:text-indigo-600 min-w-0">
                            {testCase.title}
                          </span>
                          {(() => {
                            const outdated = getOutdatedRefs(testCase);
                            if (outdated.length === 0) return null;
                            const canUp = canUpdateTC(testCase);
                            const latestVer = ssLatestVersions[outdated[0].shared_step_id]?.version;
                            return (
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold flex-shrink-0 transition-all duration-200 ${
                                  canUp
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                                    : 'bg-slate-100 text-slate-500 cursor-default'
                                }`}
                                title={canUp ? t('runs:detail.tcList.versionBadge.ssUpdateAvailable', { version: latestVer }) : t('runs:detail.tcList.versionBadge.locked')}
                              >
                                {canUp
                                  ? <><i className="ri-arrow-up-line text-[0.5rem]" />SS v{latestVer}</>
                                  : <><i className="ri-lock-line text-[0.5rem]" />SS v{latestVer}</>
                                }
                              </span>
                            );
                          })()}
                        </div>
                        <div className="col-span-1 flex items-center">
                          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-slate-600">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              testCase.priority === 'critical' ? 'bg-rose-500' :
                              testCase.priority === 'high' ? 'bg-amber-500' :
                              testCase.priority === 'medium' ? 'bg-indigo-500' :
                              'bg-slate-400'
                            }`} />
                            {(() => {
                              const p = testCase.priority?.toLowerCase();
                              if (p === 'critical') return t('common:issues.priority.critical');
                              if (p === 'high') return t('common:high');
                              if (p === 'medium') return t('common:medium');
                              if (p === 'low') return t('common:low');
                              return testCase.priority ? testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1) : '';
                            })()}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center">
                          {(() => {
                            const folder = folders.find(f => f.name === testCase.folder);
                            if (!testCase.folder) return <span className="text-sm text-gray-400">—</span>;
                            const fs = FOLDER_COLOR_MAP[folder?.color || 'indigo'] || { bg: '#EEF2FF', fg: '#6366F1' };
                            return (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, height: 18, borderRadius: 4, background: fs.bg }}>
                                  <i className={`${folder?.icon || 'ri-folder-line'} text-[0.6875rem]`} style={{ color: fs.fg }}></i>
                                </span>
                                <span className="text-[0.75rem] text-slate-600 truncate">{testCase.folder}</span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const assigneeName = runAssignees.get(testCase.id) || '';
                            const isOpen = openAssigneeDropdown === testCase.id;
                            return (
                              <div className="relative w-full">
                                <div
                                  className="flex items-center px-1 py-1 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenAssigneeDropdown(isOpen ? null : testCase.id);
                                  }}
                                >
                                  {assigneeName ? (() => {
                                    const member = projectMembers.find(m => m.full_name === assigneeName || m.email === assigneeName);
                                    return <Avatar size="sm" userId={member?.user_id} name={assigneeName} title={assigneeName} />;
                                  })() : (
                                    <span className="text-sm text-gray-400">—</span>
                                  )}
                                </div>
                                {isOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={(e) => { e.stopPropagation(); setOpenAssigneeDropdown(null); }}
                                    />
                                    <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg z-20 overflow-hidden py-1">
                                      <button
                                        className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handleAssigneeChange(testCase.id, ''); setOpenAssigneeDropdown(null); }}
                                      >
                                        {t('runs:detail.tcList.assigneeDropdown.unassigned')}
                                      </button>
                                      {projectMembers.map((member) => {
                                        const name = member.full_name || member.email;
                                        return (
                                          <button
                                            key={member.id}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                            onClick={(e) => { e.stopPropagation(); handleAssigneeChange(testCase.id, name); setOpenAssigneeDropdown(null); }}
                                          >
                                            <Avatar size="sm" userId={member.user_id} name={name} />
                                            <span className="truncate">{name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-span-3 flex items-center">
                          <StatusBadge status={testCase.runStatus as TestStatus} size="sm" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 우측 상세 패널 — Option A (DetailPanel) */}
          {selectedTestCase && (
            <DetailPanel
              context="run"
              testCase={{
                id: selectedTestCase.id,
                customId: (selectedTestCase as any).custom_id,
                title: selectedTestCase.title,
                description: selectedTestCase.description,
                folder: selectedTestCase.folder,
                priority: selectedTestCase.priority,
                tags: selectedTestCase.tags,
                assignee: selectedTestCase.assignee,
                createdAt: selectedTestCase.created_at,
                steps: selectedTestCase.steps,
                expected_result: selectedTestCase.expected_result,
                precondition: selectedTestCase.precondition,
                is_automated: selectedTestCase.is_automated,
                attachments: selectedTestCase.attachments,
              }}
              runStatus={selectedTestCase.runStatus}
              onClose={() => selectTestCase(null)}
              onStatusChange={(status) => handleStatusChange(selectedTestCase.id, status)}
              onPassAndNext={handlePassAndNext}
              onAddResult={handleAddResult}
              onPrev={handlePreviousTestCase}
              onNext={handleNextTestCase}
              canGoPrev={filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id) > 0}
              canGoNext={filteredTestCases.findIndex(tc => tc.id === selectedTestCase.id) < filteredTestCases.length - 1}
              comments={comments}
              commentText={commentText}
              loadingComments={loadingComments}
              onCommentChange={setCommentText}
              onCommentSubmit={handlePostComment}
              onCommentDelete={handleDeleteComment}
              currentUserId={currentUser?.id}
              testResults={testResults}
              onResultClick={setSelectedResult}
              jiraDomain={jiraDomain}
              isProfessionalOrHigher={isProfessionalOrHigher}
              onAddIssue={() => {
                if (!jiraSettings?.domain) {
                  setShowJiraSetupModal(true);
                  return;
                }
                setShowAddIssueModal(true);
              }}
              onLinkExistingIssue={handleLinkExistingIssue}
              projectMembers={projectMembers}
              assigneeName={runAssignees.get(selectedTestCase.id) || ''}
              onAssigneeChange={(name) => handleAssigneeChange(selectedTestCase.id, name)}
              onPreviewImage={(url, name) => setPreviewImage({ url, name })}
              folders={folders.map(f => ({ id: f.id, name: f.name, icon: f.icon || 'ri-folder-line', color: f.color || 'indigo' }))}
              ssLatestVersions={ssLatestVersions}
              runCompleted={run?.status === 'completed'}
              onUpdateSharedStep={(ssId) => handleUpdateSSVersion(selectedTestCase.id, ssId)}
            />
          )}

          {showExportModal && (
            <ExportModal
              runName={run?.name || t('runs:detail.page.runNameFallback')}
              totalCount={testCases.length}
              availableTags={Array.from(new Set(
                testCases.flatMap(tc => (tc.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean))
              ))}
              onExport={handleRunExport}
              onClose={() => setShowExportModal(false)}
              exporting={exportingFile}
              hasSummary={aiSummaryData !== null}
              defaultIncludeAiSummary={includeAiInPdf}
              getFilteredCount={(sf, tf) => {
                let filtered = testCases.filter(tc => sf.has(tc.runStatus || 'untested'));
                if (tf.size > 0) {
                  filtered = filtered.filter(tc => {
                    const tcTags = (tc.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                    return tcTags.some((t: string) => tf.has(t));
                  });
                }
                return filtered.length;
              }}
            />
          )}

          {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-vip-crown-line text-yellow-500 text-3xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{t('runs:detail.upgradeModal.title')}</h2>
                  <p className="text-gray-600 text-sm mb-6">
                    {t('runs:detail.upgradeModal.bodyLine1').split('<1>')[0]}
                    <strong>{t('runs:detail.upgradeModal.bodyLine1').match(/<1>(.*?)<\/1>/)?.[1] ?? ''}</strong>
                    {t('runs:detail.upgradeModal.bodyLine1').split('</1>')[1] ?? ''}
                    <br />
                    {t('runs:detail.upgradeModal.bodyLine2')}
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">{t('runs:detail.upgradeModal.benefitsTitle')}</p>
                    <ul className="space-y-1.5">
                      {[
                        t('runs:detail.upgradeModal.benefit.projects'),
                        t('runs:detail.upgradeModal.benefit.members'),
                        t('runs:detail.upgradeModal.benefit.jira'),
                        t('runs:detail.upgradeModal.benefit.reporting'),
                        t('runs:detail.upgradeModal.benefit.exportImport'),
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-yellow-700">
                          <i className="ri-check-line text-yellow-500"></i>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {t('common:close')}
                    </button>
                    <button
                      onClick={() => {
                        setShowUpgradeModal(false);
                        navigate('/settings');
                      }}
                      className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {t('runs:detail.upgradeModal.footer.upgrade')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Jira Setup Modal */}
          {showJiraSetupModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="p-6 text-center">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-links-line text-blue-500 text-2xl"></i>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{t('runs:detail.jiraSetup.title')}</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {t('runs:detail.jiraSetup.body')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowJiraSetupModal(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                    >
                      {t('common:close')}
                    </button>
                    <button
                      onClick={() => {
                        setShowJiraSetupModal(false);
                        navigate('/settings?tab=integrations');
                      }}
                      className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer"
                    >
                      {t('runs:detail.jiraSetup.footer.connect')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Result Modal */}
          {showAddResultModal && selectedTestCase && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{t('runs:detail.addResult.title')}</h2>
                  <button
                    onClick={() => { resetResultForm(); setShowAddResultModal(false); }}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                  <div className="space-y-6">
                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('runs:detail.addResult.status.label')} <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { value: 'passed', label: t('common:passed'), icon: 'ri-checkbox-circle-fill', color: 'bg-green-100 text-green-700 border-green-300', iconColor: 'text-green-600' },
                          { value: 'failed', label: t('common:failed'), icon: 'ri-close-circle-fill', color: 'bg-red-100 text-red-700 border-red-300', iconColor: 'text-red-600' },
                          { value: 'blocked', label: t('common:blocked'), icon: 'ri-forbid-fill', color: 'bg-gray-100 text-gray-700 border-gray-300', iconColor: 'text-gray-600' },
                          { value: 'retest', label: t('common:retest'), icon: 'ri-refresh-line', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', iconColor: 'text-yellow-600' },
                          { value: 'untested', label: t('common:untested'), icon: 'ri-question-fill', color: 'bg-gray-100 text-gray-500 border-gray-300', iconColor: 'text-gray-500' },
                        ].map((status) => (
                          <button
                            key={status.value}
                            type="button"
                            onClick={() => setResultFormData({ ...resultFormData, status: status.value as 'passed' | 'failed' | 'blocked' | 'retest' | 'untested' })}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              resultFormData.status === status.value
                                ? `${status.color} border-current`
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <i className={`${status.icon} text-2xl ${resultFormData.status === status.value ? status.iconColor : 'text-gray-400'}`}></i>
                            <span className="text-xs font-semibold">{status.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.addResult.note.label')}</label>
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.paragraph')}>
                            <i className="ri-paragraph text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.bold')}>
                            <i className="ri-bold text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.italic')}>
                            <i className="ri-italic text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.underline')}>
                            <i className="ri-underline text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.strikethrough')}>
                            <i className="ri-strikethrough text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.code')}>
                            <i className="ri-code-line text-sm"></i>
                          </button>
                          <div className="w-px h-5 bg-gray-300"></div>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.link')}>
                            <i className="ri-link text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.bulletList')}>
                            <i className="ri-list-unordered text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer" aria-label={t('runs:detail.addResult.note.toolbar.orderedList')}>
                            <i className="ri-list-ordered text-sm"></i>
                          </button>
                        </div>
                        <textarea
                          value={resultFormData.note}
                          onChange={(e) => setResultFormData({ ...resultFormData, note: e.target.value })}
                          placeholder=""
                          rows={4}
                          className="w-full px-3 py-2 focus:outline-none text-sm resize-none"
                        ></textarea>
                      </div>
                    </div>

                    {/* Steps */}
                    {selectedTestCase.steps && (() => {
                      // Always use live version-aware cache (pinned version content)
                      let parsed: AnyStep[] | null = null;
                      try {
                        const p = JSON.parse(selectedTestCase.steps!);
                        if (Array.isArray(p)) parsed = p as AnyStep[];
                      } catch {}

                      if (parsed) {
                        const flatSteps = expandFlatSteps(parsed, sharedStepsCache);
                        if (flatSteps.length === 0) return null;
                        const ssRefByHeader2: Record<string, any> = {};
                        parsed.filter((s): s is any => (s as any).type === 'shared_step_ref').forEach((s: any) => {
                          ssRefByHeader2[`${s.shared_step_custom_id}: ${s.shared_step_name}`] = s;
                        });
                        return (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">{t('runs:detail.addResult.steps.label')}</label>
                            <div className="space-y-2">
                              {(() => {
                                const execGroups: any[] = [];
                                let curExecGroup: any = null;
                                for (const fs of flatSteps) {
                                  if (fs.groupHeader) {
                                    if (curExecGroup) execGroups.push(curExecGroup);
                                    curExecGroup = { isShared: true, header: fs.groupHeader, ref: ssRefByHeader2[fs.groupHeader] ?? null, steps: [fs] };
                                  } else if (fs.isSubStep && curExecGroup) {
                                    curExecGroup.steps.push(fs);
                                  } else {
                                    if (curExecGroup) { execGroups.push(curExecGroup); curExecGroup = null; }
                                    execGroups.push({ isShared: false, steps: [fs] });
                                  }
                                }
                                if (curExecGroup) execGroups.push(curExecGroup);
                                return execGroups.map((group, gi) => {
                                  if (!group.isShared) {
                                    const fs = group.steps[0];
                                    return (
                                      <div key={fs.flatIndex} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-start gap-3 mb-2">
                                          <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-indigo-700 text-xs font-bold">{fs.flatIndex + 1}</span>
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.step}</p>
                                            {fs.expectedResult && (
                                              <div className="mt-1 flex items-start gap-1">
                                                <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                                <p className="text-sm text-green-600 leading-relaxed">{fs.expectedResult}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <select
                                          value={stepStatuses[fs.flatIndex] || 'untested'}
                                          onChange={(e) => handleStepStatusChange(fs.flatIndex, e.target.value)}
                                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                          <option value="untested">{t('common:untested')}</option>
                                          <option value="passed">{t('common:passed')}</option>
                                          <option value="failed">{t('common:failed')}</option>
                                          <option value="blocked">{t('common:blocked')}</option>
                                        </select>
                                      </div>
                                    );
                                  }
                                  const ref2 = group.ref;
                                  const latestInfo2 = ref2 ? ssLatestVersions[ref2.shared_step_id] : null;
                                  const hasNew2 = ref2 && latestInfo2 && ref2.shared_step_version != null && latestInfo2.version > ref2.shared_step_version;
                                  const canUp2 = selectedTestCase && canUpdateTC(selectedTestCase);
                                  const diffKey2 = ref2 ? `${selectedTestCase.id}:${ref2.shared_step_id}` : null;
                                  const isDiff2 = diffKey2 && expandedDiffKey === diffKey2;
                                  const oldKey2 = ref2 ? `${ref2.shared_step_id}:${ref2.shared_step_version}` : null;
                                  const [ssCustomId2, ...ssNameParts2] = group.header.split(': ');
                                  const ssName2 = ssNameParts2.join(': ');
                                  return (
                                    <div key={`ss-exec-${gi}`} className="border border-indigo-200 rounded-lg overflow-hidden">
                                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                                        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center">
                                          <i className="ri-links-line text-[0.55rem]" />
                                        </div>
                                        <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded">{ssCustomId2}</span>
                                        <span className="text-xs font-medium text-slate-700 truncate flex-1 min-w-0">{ssName2}</span>
                                        {ref2 && <span className="text-[0.65rem] text-indigo-400 flex-shrink-0">v{ref2.shared_step_version}</span>}
                                        {hasNew2 && (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isDiff2) { setExpandedDiffKey(null); }
                                              else { setExpandedDiffKey(diffKey2!); if (ref2) fetchOldVersionSteps(ref2.shared_step_id, ref2.shared_step_version); }
                                            }}
                                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold cursor-pointer transition-all duration-200 flex-shrink-0 ${canUp2 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500'}`}
                                            title={canUp2 ? t('runs:detail.addResult.steps.sharedUpdateBadgeTitle', { version: latestInfo2!.version }) : t('runs:detail.tcList.versionBadge.locked')}
                                          >
                                            {canUp2 ? <><i className="ri-arrow-up-line text-[0.5rem]" /> v{latestInfo2!.version}</> : <><i className="ri-lock-line text-[0.5rem]" /> v{latestInfo2!.version}</>}
                                          </span>
                                        )}
                                        <span className="text-[0.6rem] font-bold text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">{t('runs:detail.addResult.steps.sharedBadge')}</span>
                                      </div>
                                      {isDiff2 && hasNew2 && (
                                        <div className="border-b border-indigo-200 overflow-hidden">
                                          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200">
                                            <span className="text-xs font-semibold text-amber-700">{t('runs:detail.addResult.steps.diffBannerPrefix', { from: ref2.shared_step_version, to: latestInfo2!.version })}</span>
                                            <div className="flex items-center gap-2">
                                              {canUp2 && <button onClick={() => handleUpdateSSVersion(selectedTestCase.id, ref2.shared_step_id)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.625rem] font-bold rounded cursor-pointer transition-colors duration-200">{t('runs:detail.addResult.steps.updateButton')}</button>}
                                              {!canUp2 && <span className="flex items-center gap-1 text-[0.625rem] text-slate-500"><i className="ri-lock-line" /> {t('runs:detail.addResult.steps.lockedBanner')}</span>}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-2 divide-x divide-gray-200">
                                            <div className="p-2">
                                              <div className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-wider mb-1.5">{t('runs:detail.addResult.steps.diffCurrent', { version: ref2.shared_step_version })}</div>
                                              {oldKey2 && oldVersionStepsCache[oldKey2] !== undefined
                                                ? (oldVersionStepsCache[oldKey2] as any[]).length > 0
                                                  ? (oldVersionStepsCache[oldKey2] as any[]).map((s: any, i: number) => <div key={i} className="text-[0.6875rem] text-red-700 bg-red-50 px-2 py-1 rounded leading-relaxed mb-1"><span className="font-semibold text-red-400 mr-1">{i+1}.</span>{s.step}</div>)
                                                  : <div className="text-[0.6875rem] text-gray-400 py-2 italic">{t('runs:detail.addResult.steps.diffUnavailable')}</div>
                                                : <div className="text-[0.6875rem] text-gray-400 py-2">{t('runs:detail.addResult.steps.diffLoading')}</div>
                                              }
                                            </div>
                                            <div className="p-2">
                                              <div className="text-[0.5625rem] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">{t('runs:detail.addResult.steps.diffLatest', { version: latestInfo2!.version })}</div>
                                              {latestInfo2!.steps.map((s: any, i: number) => <div key={i} className="text-[0.6875rem] text-emerald-700 bg-emerald-50 px-2 py-1 rounded leading-relaxed mb-1"><span className="font-semibold text-emerald-400 mr-1">{i+1}.</span>{s.step}</div>)}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      <div className="divide-y divide-indigo-100 bg-white">
                                        {group.steps.map((fs: any) => (
                                          <div key={fs.flatIndex} className="p-3">
                                            <div className="flex items-start gap-3 mb-2">
                                              <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-indigo-700 text-xs font-bold">{fs.flatIndex + 1}</span>
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.step}</p>
                                                {fs.expectedResult && (
                                                  <div className="mt-1 flex items-start gap-1">
                                                    <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                                    <p className="text-sm text-green-600 leading-relaxed">{fs.expectedResult}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <select
                                              value={stepStatuses[fs.flatIndex] || 'untested'}
                                              onChange={(e) => handleStepStatusChange(fs.flatIndex, e.target.value)}
                                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                              <option value="untested">{t('common:untested')}</option>
                                              <option value="passed">{t('common:passed')}</option>
                                              <option value="failed">{t('common:failed')}</option>
                                              <option value="blocked">{t('common:blocked')}</option>
                                            </select>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        );
                      }

                      // Fallback: old newline-delimited string format
                      if (!selectedTestCase.expected_result) return null;
                      return (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">{t('runs:detail.addResult.steps.label')}</label>
                          <div className="space-y-3">
                            {selectedTestCase.steps!.split('\n').filter(s => s.trim()).map((step, index) => {
                              const expectedResults = selectedTestCase.expected_result?.split('\n').filter(s => s.trim()) || [];
                              const expectedResult = expectedResults[index] || '';
                              const stepContent = step.replace(/^\d+\.\s*/, '');
                              const isHtml = /<[^>]+>/.test(stepContent);
                              const expectedContent = expectedResult.replace(/^\d+\.\s*/, '');
                              const expectedIsHtml = /<[^>]+>/.test(expectedContent);
                              return (
                                <div key={index} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-start gap-3 mb-2">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <span className="text-indigo-700 text-xs font-bold">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                      {isHtml ? (
                                        <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: stepContent }} />
                                      ) : (
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{stepContent}</p>
                                      )}
                                      {expectedContent && (
                                        <div className="mt-1 flex items-start gap-1">
                                          <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                          <p className="text-sm text-green-600 leading-relaxed">
                                            {expectedIsHtml ? expectedContent.replace(/<[^>]*>/g, '').trim() : expectedContent}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <select
                                    value={stepStatuses[index] || 'untested'}
                                    onChange={(e) => handleStepStatusChange(index, e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    <option value="untested">{t('common:untested')}</option>
                                    <option value="passed">{t('common:passed')}</option>
                                    <option value="failed">{t('common:failed')}</option>
                                    <option value="blocked">{t('common:blocked')}</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Right Column Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Assign to */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.addResult.assignee.label')}</label>
                        <select
                          value={resultFormData.assignTo}
                          onChange={(e) => setResultFormData({ ...resultFormData, assignTo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">{t('runs:detail.addResult.assignee.placeholder')}</option>
                          {projectMembers.map((member) => (
                            <option key={member.id} value={member.user_id}>
                              {member.full_name || member.email}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">{t('runs:detail.addResult.assignee.hint')}</p>
                      </div>

                      {/* Elapsed */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          {t('runs:detail.addResult.elapsed.label')}
                          <i className="ri-information-line text-gray-400 text-sm"></i>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={resultFormData.elapsed}
                            onChange={(e) => setResultFormData({ ...resultFormData, elapsed: e.target.value })}
                            placeholder="00:00"
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            readOnly={isTimerRunning}
                          />
                          <button 
                            onClick={handleToggleTimer}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all cursor-pointer"
                          >
                            <i className={`ri-${isTimerRunning ? 'pause' : 'play'}-circle-line text-lg`}></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Issues */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">{t('runs:detail.addResult.issues.label')}</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isProfessionalOrHigher) {
                                setShowUpgradeModal(true);
                                return;
                              }
                              if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
                                if (confirm(t('runs:detail.addResult.issues.confirmJiraSetup'))) {
                                  navigate('/settings');
                                }
                                return;
                              }
                              setShowAddIssueModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                          >
                            <i className="ri-add-line"></i>
                            {t('runs:detail.addResult.issues.createJira')}
                          </button>
                          {githubSettings?.token && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isProfessionalOrHigher) {
                                  setShowUpgradeModal(true);
                                  return;
                                }
                                const tcTitle = selectedTestCase ? `[Test Failed] ${selectedTestCase.title}` : '';
                                setGithubIssueFormData(prev => ({ ...prev, title: tcTitle, labels: '', assignee: '' }));
                                setGithubLabelInput('');
                                setAssigneeQuery('');
                                setShowAssigneeSuggest(false);
                                setShowGithubIssueModal(true);
                                fetchGithubAssignees();
                              }}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                            >
                              <i className="ri-github-fill"></i>
                              {t('runs:detail.addResult.issues.createGithub')}
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={resultFormData.issues}
                        onChange={(e) => setResultFormData({ ...resultFormData, issues: e.target.value })}
                        onKeyDown={handleIssueKeyDown}
                        placeholder={t('runs:detail.addResult.issues.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('runs:detail.addResult.issues.hint')}</p>
                      
                      {resultFormData.issuesList.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {resultFormData.issuesList.map((issueKey) => (
                            <div
                              key={issueKey}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className="ri-link text-gray-400"></i>
                                <span className="text-sm text-gray-700 truncate">{issueKey}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveIssue(issueKey)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {pendingJiraIssues.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {pendingJiraIssues.map((issueKey) => (
                            <div key={issueKey} className="flex items-center justify-between p-2 bg-indigo-50 rounded-lg group border border-indigo-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className="ri-bug-line text-indigo-500 text-sm"></i>
                                <span className="text-sm text-indigo-700 font-medium truncate">{issueKey}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPendingJiraIssues(prev => prev.filter(k => k !== issueKey))}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {pendingGithubIssues.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {pendingGithubIssues.map((gi) => (
                            <div key={gi.url} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group border border-slate-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className="ri-github-fill text-slate-500 text-sm"></i>
                                <a href={gi.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-700 hover:underline truncate">
                                  {gi.repo}#{gi.number}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPendingGithubIssues(prev => prev.filter(x => x.url !== gi.url))}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.addResult.attachments.label')}</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            id="result-file-upload"
                            disabled={uploadingFile}
                          />
                          <label
                            htmlFor="result-file-upload"
                            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <i className="ri-file-line"></i>
                            {t('runs:detail.addResult.attachments.chooseFiles')}
                          </label>
                          <span>{t('runs:detail.addResult.attachments.or')}</span>
                          <button
                            onClick={handleScreenshot}
                            disabled={uploadingFile}
                            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <i className="ri-screenshot-line"></i>
                            {t('runs:detail.addResult.attachments.screenshot')}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('runs:detail.addResult.attachments.dropzoneHint')}</p>
                      </div>

                      {uploadingFile && (
                        <div className="mt-3 text-center">
                          <i className="ri-loader-4-line animate-spin text-indigo-500 text-xl"></i>
                          <p className="text-sm text-gray-600 mt-1">{t('runs:detail.addResult.attachments.uploading')}</p>
                        </div>
                      )}

                      {resultFormData.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {resultFormData.attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className="ri-file-line text-gray-400"></i>
                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(index)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => { resetResultForm(); setShowAddResultModal(false); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    onClick={handleSubmitResult}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    {t('runs:detail.addResult.footer.submit')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Issue Modal */}
          {showAddIssueModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{t('runs:detail.jiraIssue.title')}</h2>
                  <button
                    onClick={() => setShowAddIssueModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
                  <div className="space-y-6">
                    {/* Summary */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('runs:detail.jiraIssue.summary.label')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={issueFormData.summary}
                        onChange={(e) => setIssueFormData({ ...issueFormData, summary: e.target.value })}
                        placeholder={t('runs:detail.jiraIssue.summary.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('common:description')}</label>
                      <textarea
                        value={issueFormData.description}
                        onChange={(e) => setIssueFormData({ ...issueFormData, description: e.target.value })}
                        placeholder={t('runs:detail.jiraIssue.description.placeholder')}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                      ></textarea>
                    </div>

                    {/* Issue Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.jiraIssue.issueType.label')}</label>
                        <select
                          value={issueFormData.issueType}
                          onChange={(e) => setIssueFormData({ ...issueFormData, issueType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                        >
                          <option value="Bug">{t('runs:detail.jiraIssue.issueType.option.bug')}</option>
                          <option value="Task">{t('runs:detail.jiraIssue.issueType.option.task')}</option>
                          <option value="Story">{t('runs:detail.jiraIssue.issueType.option.story')}</option>
                          <option value="Epic">{t('runs:detail.jiraIssue.issueType.option.epic')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('common:priority')}</label>
                        <select
                          value={issueFormData.priority}
                          onChange={(e) => setIssueFormData({ ...issueFormData, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                        >
                          <option value="Highest">{t('runs:detail.jiraIssue.priority.option.highest')}</option>
                          <option value="High">{t('runs:detail.jiraIssue.priority.option.high')}</option>
                          <option value="Medium">{t('runs:detail.jiraIssue.priority.option.medium')}</option>
                          <option value="Low">{t('runs:detail.jiraIssue.priority.option.low')}</option>
                          <option value="Lowest">{t('runs:detail.jiraIssue.priority.option.lowest')}</option>
                        </select>
                      </div>
                    </div>

                    {/* Labels */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.jiraIssue.labels.label')}</label>
                      <input
                        type="text"
                        value={issueFormData.labels}
                        onChange={(e) => setIssueFormData({ ...issueFormData, labels: e.target.value })}
                        placeholder={t('runs:detail.jiraIssue.labels.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('runs:detail.jiraIssue.labels.hint')}</p>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('common:assignee')}</label>
                      <input
                        type="text"
                        value={issueFormData.assignee}
                        onChange={(e) => setIssueFormData({ ...issueFormData, assignee: e.target.value })}
                        placeholder={t('runs:detail.jiraIssue.assignee.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('runs:detail.jiraIssue.assignee.hint')}</p>
                    </div>

                    {/* Components */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.jiraIssue.components.label')}</label>
                      <input
                        type="text"
                        value={issueFormData.components}
                        onChange={(e) => setIssueFormData({ ...issueFormData, components: e.target.value })}
                        placeholder={t('runs:detail.jiraIssue.components.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('runs:detail.jiraIssue.components.hint')}</p>
                    </div>

                    {/* Test Case Info */}
                    {selectedTestCase && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.jiraIssue.relatedTc')}</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-900 font-normal">{selectedTestCase.title}</p>
                          {selectedTestCase.description && (
                            <p className="text-xs text-gray-600 mt-1">{selectedTestCase.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowAddIssueModal(false)}
                    disabled={creatingIssue}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    onClick={() => handleCreateJiraIssue(activeTab === 'issues')}
                    disabled={creatingIssue || !issueFormData.summary.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingIssue ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        {t('runs:detail.jiraIssue.footer.creating')}
                      </>
                    ) : (
                      <>
                        <i className="ri-add-line"></i>
                        {t('runs:detail.jiraIssue.footer.submit')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GitHub Issue Modal */}
          {showGithubIssueModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <i className="ri-github-fill"></i> {t('runs:detail.githubIssue.title')}
                  </h2>
                  <button
                    onClick={() => setShowGithubIssueModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('runs:detail.githubIssue.titleField.label')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={githubIssueFormData.title}
                      onChange={(e) => setGithubIssueFormData({ ...githubIssueFormData, title: e.target.value })}
                      placeholder={t('runs:detail.githubIssue.titleField.placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('common:description')}</label>
                    <textarea
                      value={githubIssueFormData.body}
                      onChange={(e) => setGithubIssueFormData({ ...githubIssueFormData, body: e.target.value })}
                      placeholder={t('runs:detail.githubIssue.body.placeholder')}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Labels — chip input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.githubIssue.labels.label')}</label>
                      {getGithubLabelsArray().length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {getGithubLabelsArray().map((label, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                              {label}
                              <button
                                type="button"
                                onClick={() => {
                                  const arr = getGithubLabelsArray().filter((_, j) => j !== i);
                                  setGithubIssueFormData(prev => ({ ...prev, labels: arr.join(', ') }));
                                }}
                                className="w-3.5 h-3.5 flex items-center justify-center text-indigo-500 hover:text-indigo-800 rounded-full transition-colors"
                              >
                                <i className="ri-close-line text-[10px]" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        value={githubLabelInput}
                        onChange={(e) => setGithubLabelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !githubLabelComposing) {
                            e.preventDefault();
                            const trimmed = githubLabelInput.trim();
                            if (trimmed) {
                              const current = getGithubLabelsArray();
                              if (!current.includes(trimmed)) {
                                setGithubIssueFormData(prev => ({ ...prev, labels: [...current, trimmed].join(', ') }));
                              }
                              setGithubLabelInput('');
                            }
                          }
                        }}
                        onCompositionStart={() => setGithubLabelComposing(true)}
                        onCompositionEnd={() => setGithubLabelComposing(false)}
                        placeholder={t('runs:detail.githubIssue.labels.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    {/* Assignee — autocomplete */}
                    <div className="relative" ref={assigneeSuggestRef}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{t('common:assignee')}</label>
                      <input
                        type="text"
                        value={assigneeQuery}
                        onChange={(e) => {
                          setAssigneeQuery(e.target.value);
                          setGithubIssueFormData(prev => ({ ...prev, assignee: e.target.value }));
                          setShowAssigneeSuggest(true);
                        }}
                        onFocus={() => setShowAssigneeSuggest(true)}
                        placeholder={t('runs:detail.githubIssue.assignee.placeholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      {showAssigneeSuggest && githubAssignees.filter(a => !assigneeQuery || a.login.toLowerCase().includes(assigneeQuery.toLowerCase())).length > 0 && (
                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {githubAssignees
                            .filter(a => !assigneeQuery || a.login.toLowerCase().includes(assigneeQuery.toLowerCase()))
                            .map(a => (
                              <li
                                key={a.login}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setAssigneeQuery(a.login);
                                  setGithubIssueFormData(prev => ({ ...prev, assignee: a.login }));
                                  setShowAssigneeSuggest(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                              >
                                <img src={a.avatar_url} className="w-5 h-5 rounded-full" alt="" />
                                {a.login}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  {githubSettings && (
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                      <i className="ri-github-fill"></i>
                      {t('runs:detail.githubIssue.willBeCreatedInPrefix')}<strong>{githubSettings.owner}/{githubSettings.repo}</strong>
                    </div>
                  )}
                  {selectedTestCase && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('runs:detail.jiraIssue.relatedTc')}</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900">{selectedTestCase.title}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowGithubIssueModal(false)}
                    disabled={creatingGithubIssue}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    onClick={handleCreateGithubIssue}
                    disabled={creatingGithubIssue || !githubIssueFormData.title.trim()}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingGithubIssue ? (
                      <><i className="ri-loader-4-line animate-spin"></i>{t('runs:detail.githubIssue.footer.creating')}</>
                    ) : (
                      <><i className="ri-github-fill"></i>{t('runs:detail.githubIssue.footer.submit')}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedResult && (
            <ResultDetailModal
              result={selectedResult}
              testCase={selectedTestCase}
              jiraDomain={jiraDomain}
              sharedStepsCache={sharedStepsCache}
              stepsSnapshot={selectedTestCase ? stepsSnapshot[selectedTestCase.id] : undefined}
              onClose={() => setSelectedResult(null)}
            />
          )}

          {/* TC Version Diff Modal */}
          {tcDiffModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[75vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{tcDiffModal.tcTitle}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('runs:detail.tcDiff.comparingPrefix')}<span className="font-semibold text-gray-700">v{tcDiffModal.snapMajor}.{tcDiffModal.snapMinor}</span>
                      {' → '}
                      <span className="font-semibold text-emerald-600">v{tcDiffModal.liveMajor}.{tcDiffModal.liveMinor}</span>
                    </p>
                  </div>
                  <button onClick={() => setTcDiffModal(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>

                {/* Diff body — row-aligned layout */}
                <div className="flex-1 overflow-y-auto">
                  {tcDiffModal.loading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-400 gap-2">
                      <i className="ri-loader-4-line animate-spin" /> {t('runs:detail.tcDiff.loading')}
                    </div>
                  ) : (<>
                    {/* Sticky column headers */}
                    <div className="sticky top-0 z-10 grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200">
                      <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t('runs:detail.tcDiff.columnHeader.current', { major: tcDiffModal.snapMajor, minor: tcDiffModal.snapMinor })}
                      </div>
                      <div className="bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                        {t('runs:detail.tcDiff.columnHeader.updated', { major: tcDiffModal.liveMajor, minor: tcDiffModal.liveMinor })}
                      </div>
                    </div>

                    {/* Metadata rows — each field aligned side by side */}
                    {([
                      { label: t('runs:detail.tcDiff.metadata.title'),        snap: tcDiffModal.snapTitle,       live: tcDiffModal.liveTitle },
                      { label: t('runs:detail.tcDiff.metadata.tags'),         snap: tcDiffModal.snapTags,        live: tcDiffModal.liveTags },
                      { label: t('runs:detail.tcDiff.metadata.precondition'), snap: tcDiffModal.snapPrecondition, live: tcDiffModal.livePrecondition },
                      { label: t('common:description'),  snap: tcDiffModal.snapDescription,  live: tcDiffModal.liveDescription },
                    ] as { label: string; snap?: string; live?: string }[]).map(({ label, snap, live }) => {
                      const changed = snap !== undefined && snap !== live;
                      return (
                        <div key={label} className={`grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-100 ${changed ? 'bg-amber-50/40' : ''}`}>
                          <div className="px-4 py-2 text-xs">
                            <span className="text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">{label}</span>
                            <span className={changed ? 'text-amber-700' : 'text-gray-600'}>{snap || <span className="text-gray-300 italic">—</span>}</span>
                          </div>
                          <div className="px-4 py-2 text-xs">
                            <span className="text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">{label}</span>
                            <span className={changed ? 'text-emerald-700 font-medium' : 'text-gray-600'}>{live || <span className="text-gray-300 italic">—</span>}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Steps separator */}
                    <div className="grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50">
                      <div className="px-4 py-1.5 text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wide">{t('runs:detail.tcDiff.steps.sectionTitle')}</div>
                      <div className="px-4 py-1.5 text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wide">{t('runs:detail.tcDiff.steps.sectionTitle')}</div>
                    </div>

                    {/* Step rows — each index aligned */}
                    {tcDiffModal.snapSteps.length === 0 && tcDiffModal.liveSteps.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-gray-400 text-center">{t('runs:detail.tcDiff.steps.noSteps')}</p>
                    ) : (
                      Array.from({ length: Math.max(tcDiffModal.snapSteps.length, tcDiffModal.liveSteps.length) }).map((_, i) => {
                        const sn = tcDiffModal.snapSteps[i];
                        const lv = tcDiffModal.liveSteps[i];
                        const stepChanged = !sn || !lv || sn.step !== lv.step || sn.expectedResult !== lv.expectedResult;
                        return (
                          <div key={i} className={`grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-100 ${stepChanged ? (!sn ? 'bg-green-50/40' : !lv ? 'bg-red-50/40' : 'bg-amber-50/40') : ''}`}>
                            {/* Old step */}
                            <div className="px-4 py-2.5 text-xs">
                              {sn ? (<>
                                {sn.groupHeader && <div className="text-[0.625rem] font-semibold text-indigo-500 mb-1">{sn.groupHeader}</div>}
                                <p className={`font-medium ${!lv ? 'text-red-600 line-through' : stepChanged ? 'text-amber-700' : 'text-gray-700'}`}>{sn.step}</p>
                                {sn.expectedResult && <p className={`mt-0.5 ${!lv ? 'text-red-400 line-through' : stepChanged ? 'text-amber-500' : 'text-gray-400'}`}>→ {sn.expectedResult}</p>}
                              </>) : <span className="text-gray-200">—</span>}
                            </div>
                            {/* New step */}
                            <div className="px-4 py-2.5 text-xs">
                              {lv ? (<>
                                {lv.groupHeader && <div className="text-[0.625rem] font-semibold text-indigo-500 mb-1">{lv.groupHeader}</div>}
                                <p className={`font-medium ${!sn ? 'text-green-700' : stepChanged ? 'text-amber-700' : 'text-gray-700'}`}>{lv.step}</p>
                                {lv.expectedResult && <p className={`mt-0.5 ${!sn ? 'text-green-500' : stepChanged ? 'text-amber-500' : 'text-gray-400'}`}>→ {lv.expectedResult}</p>}
                              </>) : <span className="text-gray-200">—</span>}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Expected Result separator */}
                    <div className="grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50 border-t border-t-gray-200">
                      <div className="px-4 py-1.5 text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wide">{t('runs:detail.tcDiff.expectedResult.sectionTitle')}</div>
                      <div className="px-4 py-1.5 text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wide">{t('runs:detail.tcDiff.expectedResult.sectionTitle')}</div>
                    </div>

                    {/* Expected Result content */}
                    {(() => {
                      const snap = tcDiffModal.snapExpectedResult;
                      const live = tcDiffModal.liveExpectedResult;
                      const changed = snap !== undefined && snap !== live;
                      const snapLines = snap ? snap.split(/\n/).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean) : [];
                      const liveLines = live ? live.split(/\n/).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean) : [];
                      const maxLines = Math.max(snapLines.length, liveLines.length, 1);
                      return Array.from({ length: maxLines }).map((_, i) => {
                        const sl = snapLines[i];
                        const ll = liveLines[i];
                        const lineChanged = sl !== ll;
                        return (
                          <div key={i} className={`grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-100 ${changed && lineChanged ? (!sl ? 'bg-green-50/40' : !ll ? 'bg-red-50/40' : 'bg-amber-50/40') : ''}`}>
                            <div className="px-4 py-2 text-xs flex items-start gap-1.5">
                              {sl ? (
                                <>
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[0.6rem] font-bold mt-0.5">{i + 1}</span>
                                  <span className={!ll ? 'text-red-600 line-through' : lineChanged ? 'text-amber-700' : 'text-gray-600'}>{sl}</span>
                                </>
                              ) : <span className="text-gray-200 italic">—</span>}
                            </div>
                            <div className="px-4 py-2 text-xs flex items-start gap-1.5">
                              {ll ? (
                                <>
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[0.6rem] font-bold mt-0.5">{i + 1}</span>
                                  <span className={!sl ? 'text-green-700 font-medium' : lineChanged ? 'text-emerald-700 font-medium' : 'text-gray-600'}>{ll}</span>
                                </>
                              ) : <span className="text-gray-200 italic">—</span>}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </>)}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => setTcDiffModal(null)}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    onClick={() => { handleUpdateTCVersion(tcDiffModal.tcId); setTcDiffModal(null); }}
                    className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="ri-arrow-up-line" />
                    {t('runs:detail.tcDiff.footer.updateTo', { major: tcDiffModal.liveMajor, minor: tcDiffModal.liveMinor })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview Modal */}
          {previewImage && (
            <div 
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setPreviewImage(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh] w-full">
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-lg transition-all cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="w-full h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-white text-center mt-4 text-sm">{previewImage.name}</p>
              </div>
            </div>
          )}
        </main>
      </div>
      </ErrorBoundary>
    </div>
    </>
  );
}

interface ResultDetailModalProps {
  result: TestResult;
  testCase: TestCase | null;
  jiraDomain: string;
  sharedStepsCache: SharedStepCache;
  stepsSnapshot?: FlatStep[];
  onClose: () => void;
}

function ResultDetailModal({ result, testCase, jiraDomain, sharedStepsCache, stepsSnapshot, onClose }: ResultDetailModalProps) {
  const getJiraIssueUrl = (issueKey: string) => {
    if (!jiraDomain) return '#';
    return `https://${jiraDomain}/browse/${issueKey}`;
  };

  // CI/CD 자동화 여부 판단
  const isAutomated = result.author && (
    result.author.includes('GitHub Actions') ||
    result.author.includes('GitLab CI') ||
    result.author.includes('Jenkins') ||
    result.author.includes('CI/CD') ||
    result.is_automated
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Test Result Details</h2>
            {isAutomated && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold border border-purple-200">
                <i className="ri-robot-line"></i>
                CI/CD
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            {isAutomated ? (
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <i className="ri-robot-line text-purple-600 text-xl"></i>
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {result.author ? result.author.substring(0, 2).toUpperCase() : 'NA'}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{result.author || 'Unknown'}</div>
              <div className="text-sm text-gray-500">
                {result.timestamp.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <StatusBadge status={result.status as TestStatus} />
          </div>

          {result.elapsed && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Elapsed Time</label>
              <div className="flex items-center gap-2 text-gray-900">
                <i className="ri-time-line text-lg"></i>
                <span>{result.elapsed}</span>
              </div>
            </div>
          )}

          {result.note && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {result.note}
              </div>
            </div>
          )}

          {result.stepStatuses && Object.keys(result.stepStatuses).length > 0 && (stepsSnapshot || testCase?.steps) && (() => {
            // Prefer snapshot captured at run creation
            if (stepsSnapshot && stepsSnapshot.length > 0) {
              const ssRefByHeaderSnap: Record<string, any> = {};
              if (testCase?.steps) {
                try {
                  const p = JSON.parse(testCase.steps);
                  if (Array.isArray(p)) (p as any[]).filter((s: any) => s.type === 'shared_step_ref').forEach((s: any) => {
                    ssRefByHeaderSnap[`${s.shared_step_custom_id}: ${s.shared_step_name}`] = s;
                  });
                } catch {}
              }
              return (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Step Results</label>
                  <div className="space-y-1.5">
                    {(() => {
                      const snapGroups: any[] = [];
                      let curSnapGroup: any = null;
                      for (const fs of stepsSnapshot) {
                        if (fs.groupHeader) {
                          if (curSnapGroup) snapGroups.push(curSnapGroup);
                          curSnapGroup = { isShared: true, header: fs.groupHeader, ref: ssRefByHeaderSnap[fs.groupHeader] ?? null, steps: [fs] };
                        } else if (fs.isSubStep && curSnapGroup) {
                          curSnapGroup.steps.push(fs);
                        } else {
                          if (curSnapGroup) { snapGroups.push(curSnapGroup); curSnapGroup = null; }
                          snapGroups.push({ isShared: false, steps: [fs] });
                        }
                      }
                      if (curSnapGroup) snapGroups.push(curSnapGroup);
                      return snapGroups.map((group, gi) => {
                        if (!group.isShared) {
                          const fs = group.steps[0];
                          const status = result.stepStatuses?.[fs.flatIndex] || 'untested';
                          const statusInfo = getStepStatusInfo(status);
                          return (
                            <div key={fs.flatIndex} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-indigo-700 text-xs font-bold">{fs.flatIndex + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.step}</p>
                                  {fs.expectedResult && (
                                    <div className="mt-1 flex items-start gap-1">
                                      <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                      <p className="text-sm text-green-600 leading-relaxed">{fs.expectedResult}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>{statusInfo.label}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        const [ssCustomIdR, ...ssNamePartsR] = group.header.split(': ');
                        const ssNameR = ssNamePartsR.join(': ');
                        return (
                          <div key={`ss-snap-${gi}`} className="border border-indigo-200 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center">
                                <i className="ri-links-line text-[0.55rem]" />
                              </div>
                              <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded">{ssCustomIdR}</span>
                              <span className="text-xs font-medium text-slate-700 truncate flex-1 min-w-0">{ssNameR}</span>
                              {group.ref?.shared_step_version != null && <span className="text-[0.65rem] text-indigo-400 flex-shrink-0">v{group.ref.shared_step_version}</span>}
                              <span className="text-[0.6rem] font-bold text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Shared</span>
                            </div>
                            <div className="divide-y divide-indigo-100 bg-white">
                              {group.steps.map((fs: any) => {
                                const status = result.stepStatuses?.[fs.flatIndex] || 'untested';
                                const statusInfo = getStepStatusInfo(status);
                                return (
                                  <div key={fs.flatIndex} className="p-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-indigo-700 text-xs font-bold">{fs.flatIndex + 1}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.step}</p>
                                        {fs.expectedResult && (
                                          <div className="mt-1 flex items-start gap-1">
                                            <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                            <p className="text-sm text-green-600 leading-relaxed">{fs.expectedResult}</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>{statusInfo.label}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            }

            // Try new JSON array format first
            let parsed: AnyStep[] | null = null;
            try {
              const p = JSON.parse(testCase!.steps!);
              if (Array.isArray(p)) parsed = p as AnyStep[];
            } catch {}

            if (parsed) {
              const flatSteps = expandFlatSteps(parsed, sharedStepsCache);
              const ssRefByHeaderP: Record<string, any> = {};
              (parsed as any[]).filter((s: any) => s.type === 'shared_step_ref').forEach((s: any) => {
                ssRefByHeaderP[`${s.shared_step_custom_id}: ${s.shared_step_name}`] = s;
              });
              return (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Step Results</label>
                  <div className="space-y-1.5">
                    {(() => {
                      const parsedGroups: any[] = [];
                      let curParsedGroup: any = null;
                      for (const fs of flatSteps) {
                        if (fs.groupHeader) {
                          if (curParsedGroup) parsedGroups.push(curParsedGroup);
                          curParsedGroup = { isShared: true, header: fs.groupHeader, ref: ssRefByHeaderP[fs.groupHeader] ?? null, steps: [fs] };
                        } else if (fs.isSubStep && curParsedGroup) {
                          curParsedGroup.steps.push(fs);
                        } else {
                          if (curParsedGroup) { parsedGroups.push(curParsedGroup); curParsedGroup = null; }
                          parsedGroups.push({ isShared: false, steps: [fs] });
                        }
                      }
                      if (curParsedGroup) parsedGroups.push(curParsedGroup);
                      return parsedGroups.map((group, gi) => {
                        if (!group.isShared) {
                          const fs = group.steps[0];
                          const status = result.stepStatuses?.[fs.flatIndex] || 'untested';
                          const statusInfo = getStepStatusInfo(status);
                          return (
                            <div key={fs.flatIndex} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-indigo-700 text-xs font-bold">{fs.flatIndex + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.step}</p>
                                  {fs.expectedResult && (
                                    <div className="mt-1 flex items-start gap-1">
                                      <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                      <p className="text-sm text-green-600 leading-relaxed">{fs.expectedResult}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>{statusInfo.label}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        const [ssCustomIdP, ...ssNamePartsP] = group.header.split(': ');
                        const ssNameP = ssNamePartsP.join(': ');
                        return (
                          <div key={`ss-parsed-${gi}`} className="border border-indigo-200 rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center">
                                <i className="ri-links-line text-[0.55rem]" />
                              </div>
                              <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded">{ssCustomIdP}</span>
                              <span className="text-xs font-medium text-slate-700 truncate flex-1 min-w-0">{ssNameP}</span>
                              {group.ref?.shared_step_version != null && <span className="text-[0.65rem] text-indigo-400 flex-shrink-0">v{group.ref.shared_step_version}</span>}
                              <span className="text-[0.6rem] font-bold text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Shared</span>
                            </div>
                            <div className="divide-y divide-indigo-100 bg-white">
                              {group.steps.map((fs: any) => {
                                const status = result.stepStatuses?.[fs.flatIndex] || 'untested';
                                const statusInfo = getStepStatusInfo(status);
                                return (
                                  <div key={fs.flatIndex} className="p-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-indigo-700 text-xs font-bold">{fs.flatIndex + 1}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.step}</p>
                                        {fs.expectedResult && (
                                          <div className="mt-1 flex items-start gap-1">
                                            <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-[0.05rem]" />
                                            <p className="text-sm text-green-600 leading-relaxed">{fs.expectedResult}</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>{statusInfo.label}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              );
            }

            // Fallback: old newline-delimited string format
            if (!testCase?.steps) return null;
            const stepsArray = testCase.steps.split('\n').filter((s: string) => s.trim());
            return (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Step Results</label>
                <div className="space-y-2">
                  {stepsArray.map((_step: string, index: number) => {
                    const status = result.stepStatuses?.[index] || 'untested';
                    const statusInfo = getStepStatusInfo(status);
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-semibold text-xs flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">Step {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {result.attachments.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attachments ({result.attachments.length})
              </label>
              <div className="grid grid-cols-3 gap-3">
                {result.attachments.map((attachment, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={attachment} 
                      alt={`Attachment ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.issues && result.issues.length > 0 && (
            <div className="px-6 pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Linked Issues</h4>
              <div className="flex flex-wrap gap-2">
                {result.issues.map((issueKey, idx) => (
                  <a
                    key={idx}
                    href={getJiraIssueUrl(issueKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all text-sm font-medium"
                  >
                    <i className="ri-link text-sm"></i>
                    {issueKey}
                    <i className="ri-external-link-line text-xs"></i>
                  </a>
                ))}
              </div>
            </div>
          )}

          {result.github_issues && result.github_issues.length > 0 && (
            <div className="px-6 pb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">GitHub Issues</h4>
              <div className="flex flex-wrap gap-2">
                {result.github_issues.map((gi, idx) => (
                  <a
                    key={idx}
                    href={gi.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all text-sm font-medium"
                  >
                    <i className="ri-github-fill text-sm"></i>
                    {gi.repo}#{gi.number}
                    <i className="ri-external-link-line text-xs"></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function getStepStatusInfo(status: string) {
  switch (status) {
    case 'passed':
      return {
        icon: 'ri-checkbox-circle-line',
        color: 'text-green-600',
        bgColor: 'bg-green-100 text-green-700',
        label: 'Passed'
      };
    case 'failed':
      return {
        icon: 'ri-close-circle-line',
        color: 'text-red-600',
        bgColor: 'bg-red-100 text-red-700',
        label: 'Failed'
      };
    case 'blocked':
      return {
        icon: 'ri-forbid-line',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100 text-gray-700',
        label: 'Blocked'
      };
    case 'untested':
      return {
        icon: 'ri-question-line',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 text-gray-500',
        label: 'Untested'
      };
    default:
      return {
        icon: 'ri-question-line',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 text-gray-500',
        label: 'Unknown'
      };
  }
}
