import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import { useTranslation } from 'react-i18next';
import { FocusMode, type FocusTestCase, type TestStatus } from '../../components/FocusMode';
import { StatusBadge } from '../../components/StatusBadge';
import { DetailPanel } from '../../components/DetailPanel';
import { Avatar } from '../../components/Avatar';
import AIRunSummaryPanel from './components/AIRunSummaryPanel';
import { type AnyStep, isSharedStepRef } from '../../types/shared-steps';
import { type FlatStep, type SharedStepCache, expandFlatSteps } from '../../lib/expandSharedSteps';

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
  const { t } = useTranslation(['common']);
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const [showAINewBadge] = useState(() => {
    const launchDate = new Date('2026-05-01');
    return new Date() < new Date(launchDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  });
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
    // If this run has a snapshot for this TC, no need to fetch live shared steps
    if (stepsSnapshot[selectedTestCase.id]) { setSharedStepsCache({}); return; }
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

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  const handleExportCSV = () => {
    setShowMoreMenu(false);
    const headers = ['TC ID', 'Title', 'Priority', 'Folder', 'Status', 'Author', 'Note', 'Elapsed', 'Date'];
    const rows = testCases.map(tc => {
      const result = testResults.find(r => r.run?.id === runId);
      const latestResult = [...(testResults || [])]
        .filter(r => (r as any).test_case_id === tc.id || r.run?.id === runId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      return [
        (tc as any).custom_id || tc.id,
        `"${(tc.title || '').replace(/"/g, '""')}"`,
        tc.priority || '',
        tc.folder || '',
        tc.runStatus || 'untested',
        latestResult?.author || '',
        `"${(latestResult?.note || '').replace(/"/g, '""')}"`,
        latestResult?.elapsed || '',
        latestResult?.timestamp ? latestResult.timestamp.toLocaleDateString() : '',
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

  const handleExportPDF = () => {
    setShowMoreMenu(false);

    const passedCount = testCases.filter(tc => tc.runStatus === 'passed').length;
    const failedCount = testCases.filter(tc => tc.runStatus === 'failed').length;
    const blockedCount = testCases.filter(tc => tc.runStatus === 'blocked').length;
    const retestCount = testCases.filter(tc => tc.runStatus === 'retest').length;
    const untestedCount = testCases.filter(tc => tc.runStatus === 'untested').length;
    const totalCount = testCases.length;
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

    const tcRows = testCases.map((tc, i) => {
      const status = tc.runStatus || 'untested';
      const color = statusColors[status] || '#64748B';
      const bg = statusBg[status] || '#F1F5F9';
      const assignee = runAssignees.get(tc.id) || (tc as any).assignee || '';
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
      setRun(runData);

      // Load steps snapshot captured at run creation time (if present)
      if (runData.steps_snapshot && typeof runData.steps_snapshot === 'object') {
        setStepsSnapshot(runData.steps_snapshot as Record<string, FlatStep[]>);
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

  const updateRunStatus = async (runId: string, stats: { untested: number }) => {
    try {
      let newStatus: 'new' | 'in_progress' | 'under_review' | 'completed';
      
      if (stats.untested === 0) {
        newStatus = 'completed';
      } else {
        newStatus = 'in_progress';
      }

      const { error } = await supabase
        .from('test_runs')
        .update({ status: newStatus })
        .eq('id', runId);

      if (error) throw error;

      // Update local state
      if (run) {
        setRun({ ...run, status: newStatus });
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
        throw new Error('사용자 정보를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      }
      if (!runId) {
        throw new Error('Run ID가 없습니다. URL을 확인해주세요.');
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

      // Calculate untested count
      const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;

      // Update run status based on untested count
      await updateRunStatus(runId!, {
        untested: untestedCount
      });

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
      
      // Calculate untested count
      const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
      
      // Update run status based on untested count
      await updateRunStatus(runId!, {
        untested: untestedCount
      });
      
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
      showToast('error', '먼저 Add Result로 테스트 결과를 기록한 후 이슈를 연결해주세요.');
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
        showToast('error', 'Run ID가 없습니다. 페이지를 새로고침해주세요.');
        return;
      }

      // 타이머 정지
      setIsTimerRunning(false);

      // 입력 중인 이슈가 있으면 자동으로 추가
      let finalIssuesList = [...resultFormData.issuesList];
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
      
      // Calculate untested count
      const untestedCount = updatedTestCases.filter(tc => tc.runStatus === 'untested').length;
      
      // Update run status based on untested count
      await updateRunStatus(runId!, {
        untested: untestedCount
      });
      
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
        },
      });

      if (error) throw error;

      if (data.success && data.issue && data.issue.key) {
        const newIssueKey = data.issue.key;

        if (testResults.length > 0) {
          // 최신 result에 이슈 추가
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
        } else {
          // result가 없는 경우: 이슈 키만 메모리에 임시 보관 (자동 failed result 생성 없음)
          // 사용자에게 결과 기록을 안내하고 모달을 닫음
          showToast('success', `Jira issue ${newIssueKey} created. Add Result로 테스트 결과를 기록하면 이슈가 자동으로 연결됩니다.`);
          setShowAddIssueModal(false);
          setIssueFormData({ summary: '', description: '', issueType: 'Bug', priority: 'Medium', labels: '', assignee: '', components: '' });
          return;
        }

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

      const { data, error } = await supabase.functions.invoke('create-github-issue', {
        body: {
          token: githubSettings.token,
          owner: githubSettings.owner,
          repo: githubSettings.repo,
          title: githubIssueFormData.title,
          body: githubIssueFormData.body || undefined,
          labels: labelsArray.length > 0 ? labelsArray : (githubSettings.default_labels.length > 0 ? githubSettings.default_labels : undefined),
          assignee: githubIssueFormData.assignee || undefined,
        },
      });

      if (error) throw error;
      if (data?.success && data?.issue?.number) {
        showToast('success', `GitHub issue #${data.issue.number} created`);
        setShowGithubIssueModal(false);
        setGithubIssueFormData({ title: '', body: '', labels: '', assignee: '' });
        setActiveTab('issues');
        await fetchTestResults();
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
          runName={run?.name || 'Test Run'}
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
              ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <i className={toast.type === 'success' ? 'ri-check-line text-[#10B981]' : 'ri-error-warning-line text-[#EF4444]'} />
          <span className="text-[0.8125rem] font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-current opacity-50 hover:opacity-100 cursor-pointer">
            <i className="ri-close-line" />
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={projectId || ''} projectName={project?.name || ''} />
        
        <main className="flex-1 overflow-hidden bg-gray-50/30 flex">
          {/* 폴더 사이드바 */}
          <div className={`flex-shrink-0 bg-white border-r border-[#E2E8F0] flex flex-col overflow-y-auto transition-all duration-200 ${isFolderSidebarOpen ? 'w-[200px]' : 'w-12'}`}>
            <div className={`px-[0.875rem] py-[0.75rem] border-b border-[#E2E8F0] flex items-center ${isFolderSidebarOpen ? 'justify-between' : 'justify-center'}`}>
              {isFolderSidebarOpen && (
                <span className="text-[0.6875rem] font-bold text-[#94A3B8] uppercase tracking-[0.04em]">Folders</span>
              )}
              <button
                onClick={() => setIsFolderSidebarOpen(!isFolderSidebarOpen)}
                className="w-5 h-5 flex items-center justify-center text-[#94A3B8] hover:text-[#475569] rounded transition-all cursor-pointer flex-shrink-0 border-0 bg-transparent"
                title={isFolderSidebarOpen ? '접기' : '펼치기'}
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
                    ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold'
                    : 'text-[#475569] hover:bg-[#F8FAFC]'
                }`}
                title={!isFolderSidebarOpen ? 'All Cases' : undefined}
              >
                <i className={`ri-folder-3-line text-[0.9375rem] flex-shrink-0 ${selectedFolder === null ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}></i>
                {isFolderSidebarOpen && (
                  <>
                    <span className="truncate">All Cases</span>
                    <span className={`ml-auto text-[0.75rem] flex-shrink-0 ${selectedFolder === null ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}>
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
                            ? 'bg-[#EEF2FF] text-[#4338CA] font-semibold'
                            : 'text-[#475569] hover:bg-[#F8FAFC]'
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
                            <span className={`ml-auto text-[0.75rem] flex-shrink-0 ${isSelected ? 'text-[#6366F1]' : 'text-[#94A3B8]'}`}>
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
                  <p className="text-[0.75rem] text-[#94A3B8]">폴더 없음</p>
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
                  Back to Runs
                </Link>

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h1 className="text-[1.375rem] font-bold text-[#0F172A]">{run?.name}</h1>
                      {(() => {
                        const statusLabel = run?.status === 'completed' ? 'Completed' :
                          run?.status === 'in_progress' ? 'In Progress' :
                          run?.status === 'under_review' ? 'Under Review' :
                          run?.status === 'paused' ? 'Paused' : 'New';
                        const isInProgress = run?.status === 'in_progress';
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-[#DBEAFE] text-[#1D4ED8]">
                            {isInProgress && <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />}
                            {statusLabel}
                          </span>
                        );
                      })()}
                      {run?.is_automated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-[#F0F9FF] text-[#0284C7]">
                          <i className="ri-robot-line" style={{ fontSize: '0.75rem' }}></i>
                          Automated
                        </span>
                      )}
                    </div>
                    <p className="text-[0.8125rem] text-[#94A3B8]">
                      {run?.created_at && `Started ${new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · `}
                      {testCases.length > 0 && `${Math.round((testCases.filter(tc => tc.runStatus !== 'untested').length / testCases.length) * 100)}% completed · `}
                      {testCases.length} test cases
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div ref={moreMenuRef} style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowMoreMenu(v => !v)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer border transition-colors"
                        style={{
                          background: showMoreMenu ? '#F1F5F9' : 'white',
                          borderColor: showMoreMenu ? '#CBD5E1' : '#E2E8F0',
                        }}
                        aria-haspopup="menu"
                        aria-expanded={showMoreMenu}
                      >
                        <i className="ri-more-2-fill text-lg" style={{ color: '#64748B' }} />
                      </button>
                      {showMoreMenu && (
                        <div
                          role="menu"
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            right: 0,
                            width: '224px',
                            background: 'white',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                            zIndex: 100,
                            padding: '4px 0',
                          }}
                        >
                          {[
                            { icon: 'ri-file-pdf-line', label: 'Export Run Report (PDF)', onClick: handleExportPDF },
                            { icon: 'ri-file-excel-2-line', label: 'Export Results (CSV)', onClick: handleExportCSV },
                          ].map(item => (
                            <button
                              key={item.label}
                              role="menuitem"
                              onClick={item.onClick}
                              className="group w-full flex items-center gap-2.5 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors cursor-pointer hover:bg-[#F8FAFC]"
                              style={{ color: '#334155', background: 'none', border: 'none', textAlign: 'left' }}
                            >
                              <i
                                className={`${item.icon} text-base flex-shrink-0 group-hover:text-[#6366F1] transition-colors`}
                                style={{ color: '#64748B' }}
                              />
                              {item.label}
                            </button>
                          ))}
                          {/* Divider */}
                          <div style={{ height: 1, background: '#E2E8F0', margin: '4px 0' }} />
                          {/* AI Summary Menu Item */}
                          {(userProfile?.subscription_tier ?? 1) >= 2 ? (
                            <button
                              role="menuitem"
                              onClick={() => { setShowMoreMenu(false); setShowAISummary(true); setShowUpgradeNudge(false); }}
                              className="group w-full flex items-center gap-2.5 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors cursor-pointer hover:bg-[#F5F3FF]"
                              style={{ color: '#4338CA', background: 'none', border: 'none', textAlign: 'left' }}
                            >
                              <i className="ri-sparkling-2-fill text-base flex-shrink-0" style={{ color: '#8B5CF6' }} />
                              AI Summary
                              {showAINewBadge && (
                                <span
                                  style={{
                                    marginLeft: 'auto',
                                    fontSize: '10px',
                                    background: '#EDE9FE',
                                    color: '#6D28D9',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                  }}
                                >
                                  NEW
                                </span>
                              )}
                            </button>
                          ) : (
                            <button
                              role="menuitem"
                              onClick={() => { setShowMoreMenu(false); setShowUpgradeNudge(true); setShowAISummary(false); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[0.8125rem] font-medium cursor-pointer"
                              style={{ color: '#94A3B8', background: 'none', border: 'none', textAlign: 'left', opacity: 0.6 }}
                            >
                              <i className="ri-lock-line text-base flex-shrink-0" style={{ color: '#94A3B8' }} />
                              AI Summary
                              <span
                                style={{
                                  marginLeft: 'auto',
                                  fontSize: '10px',
                                  background: '#F1F5F9',
                                  color: '#94A3B8',
                                  border: '1px solid #E2E8F0',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                }}
                              >
                                STARTER
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {testCases.length > 0 && (
                      <button
                        onClick={() => setFocusModeOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-[0.4375rem] bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[0.8125rem] font-semibold transition-colors cursor-pointer border border-indigo-500"
                        title="Cmd+Shift+F"
                      >
                        <i className="ri-focus-3-line text-base" />
                        Focus Mode
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-[0.875rem] mb-4">
                {[
                  { label: 'Total Tests', icon: 'ri-file-list-3-line', iconBg: '#DBEAFE', iconColor: '#2563EB', value: testCases.length, valueColor: undefined },
                  { label: 'Passed', icon: 'ri-checkbox-circle-fill', iconBg: '#D1FAE5', iconColor: '#16A34A', value: testCases.filter(tc => tc.runStatus === 'passed').length, valueColor: '#16A34A' },
                  { label: 'Failed', icon: 'ri-close-circle-fill', iconBg: '#FEE2E2', iconColor: '#DC2626', value: testCases.filter(tc => tc.runStatus === 'failed').length, valueColor: undefined },
                  { label: 'Blocked', icon: 'ri-forbid-fill', iconBg: '#F1F5F9', iconColor: '#64748B', value: testCases.filter(tc => tc.runStatus === 'blocked').length, valueColor: undefined },
                  { label: 'Untested', icon: 'ri-time-fill', iconBg: '#FEF3C7', iconColor: '#D97706', value: testCases.filter(tc => tc.runStatus === 'untested').length, valueColor: undefined },
                ].map(({ label, icon, iconBg, iconColor, value, valueColor }) => (
                  <div key={label} className="bg-white rounded-[0.625rem] border border-gray-200 py-4 px-[1.125rem] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                      <i className={`${icon} text-base`} style={{ color: iconColor }}></i>
                    </div>
                    <div>
                      <p className="text-[0.6875rem] text-[#94A3B8] font-medium">{label}</p>
                      <p className="text-[1.75rem] font-extrabold text-[#0F172A] leading-[1.2]" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
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
                      <span className="text-[0.8125rem] font-semibold text-[#0F172A]">Execution Progress</span>
                      <span className="text-[0.8125rem] font-bold text-[#0F172A]">
                        {total > 0 ? Math.round(((passed + failed + blocked + retest) / total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-[#F1F5F9] gap-px mb-2">
                      {passed > 0 && (
                        <div
                          className="bg-green-500 transition-all duration-500"
                          style={{ width: `${passedPct}%` }}
                          title={`Passed: ${passed}`}
                        />
                      )}
                      {failed > 0 && (
                        <div
                          className="bg-red-500 transition-all duration-500"
                          style={{ width: `${failedPct}%` }}
                          title={`Failed: ${failed}`}
                        />
                      )}
                      {blocked > 0 && (
                        <div
                          className="bg-gray-400 transition-all duration-500"
                          style={{ width: `${blockedPct}%` }}
                          title={`Blocked: ${blocked}`}
                        />
                      )}
                      {retest > 0 && (
                        <div
                          className="bg-yellow-400 transition-all duration-500"
                          style={{ width: `${retestPct}%` }}
                          title={`Retest: ${retest}`}
                        />
                      )}
                      {untested > 0 && (
                        <div
                          className="bg-gray-200 transition-all duration-500"
                          style={{ width: `${untestedPct}%` }}
                          title={`Untested: ${untested}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {[
                        { count: passed, color: '#22C55E', label: 'Passed' },
                        { count: failed, color: '#EF4444', label: 'Failed' },
                        { count: blocked, color: '#94A3B8', label: 'Blocked' },
                        { count: retest, color: '#FACC15', label: 'Retest' },
                        { count: untested, color: '#E2E8F0', label: 'Untested' },
                      ].map(({ count, color, label }) => (
                        <span key={label} className="inline-flex items-center gap-[0.3125rem] text-[0.6875rem] text-[#64748B]">
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
                    AI Run Summary
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
                    Get instant failure pattern analysis, Go/No-Go recommendations, and one-click Jira issue creation.
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
                    <i className="ri-vip-crown-fill" /> Upgrade to Starter — $49/mo
                  </button>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>
                    30 AI credits/month · All AI features
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[0.625rem] border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-[0.625rem] py-[0.875rem] px-[1.125rem] border-b border-gray-200">
                  <div className="flex-1 relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[0.9375rem]"></i>
                    <input
                      type="text"
                      placeholder="Search test cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-[0.8125rem] py-[0.4375rem] pl-[2.125rem] pr-[0.875rem] rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 bg-white text-[#334155]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-[0.8125rem] py-[0.4375rem] px-[0.625rem] rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-[#334155] bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="blocked">Blocked</option>
                    <option value="retest">Retest</option>
                    <option value="untested">Untested</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="text-[0.8125rem] py-[0.4375rem] px-[0.625rem] rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium text-[#334155] bg-white"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
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
                        {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
                      </span>
                      <div className="w-px h-4 bg-indigo-300 mx-1"></div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">Assign to:</span>
                      <select
                        value={bulkAssignee}
                        onChange={(e) => setBulkAssignee(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Unassigned</option>
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
                        Apply
                      </button>
                      <button
                        onClick={() => { setSelectedIds(new Set()); setBulkAssignee(''); }}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap ml-auto"
                      >
                        Clear selection
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
                          <span className="font-semibold">New version available for {uniqueSsIds.size} Shared Step{uniqueSsIds.size !== 1 ? 's' : ''}</span>
                          <span className="text-amber-600 ml-1">({outdatedTCs.length} TC affected{updatableTCs.length > 0 ? `, ${updatableTCs.length} untested can be updated` : ''})</span>
                        </div>
                        {updatableTCs.length > 0 && (
                          <button
                            onClick={handleUpdateAllSSVersions}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors duration-200 cursor-pointer flex-shrink-0"
                          >
                            Update all
                          </button>
                        )}
                        <button
                          onClick={() => setVersionBannerDismissed(true)}
                          className="text-amber-600 hover:text-amber-700 text-xs font-medium cursor-pointer flex-shrink-0"
                        >
                          Dismiss
                        </button>
                      </div>
                    );
                  })()}

                  {/* §11 Deprecated TC Info Banner */}
                  {testCases.some(tc => (tc as any).lifecycle_status === 'deprecated') && (
                    <div className="flex items-start gap-2.5 mx-4 my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                      <i className="ri-information-line text-blue-500 text-base mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Some TCs in this run have been deprecated.</strong>{' '}
                        {testCases.filter(tc => (tc as any).lifecycle_status === 'deprecated').length} test case(s) were deprecated after this run was created.
                        Existing results are preserved. These TCs won't appear in new runs.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[#F8FAFC] border-b border-gray-200">
                    <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-[15px] h-[15px] accent-indigo-600 cursor-pointer"
                        checked={filteredTestCases.length > 0 && selectedIds.size === filteredTestCases.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </div>
                    <div className="col-span-1">
                      <span className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em]">ID / Ver</span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em]">Test Case</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em]">Priority</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em]">Folder</span>
                    </div>
                    <div className="col-span-1 flex items-center">
                      <span className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em]">Assignee</span>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <span className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em]">Status</span>
                    </div>
                  </div>

                  {filteredTestCases.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-file-list-3-line text-3xl text-gray-400"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">테스트 케이스가 없습니다</h3>
                      <p className="text-gray-600">이 Run에 테스트 케이스가 포함되어 있지 않습니다.</p>
                    </div>
                  ) : (
                    filteredTestCases.map((testCase) => (
                      <div
                        key={testCase.id}
                        className={`grid grid-cols-12 gap-4 px-4 py-[0.625rem] border-b border-[#F1F5F9] hover:bg-[#FAFAFF] transition-colors cursor-pointer ${
                          selectedTestCase?.id === testCase.id ? 'bg-[#EEF2FF]' : ''
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
                          {(testCase as any).version_major !== undefined && (
                            <span className={`text-[0.5625rem] font-semibold ${
                              (testCase as any).version_status === 'draft'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}>
                              TC v{(testCase as any).version_major ?? 1}.{(testCase as any).version_minor ?? 0}
                              {(testCase as any).version_status === 'draft' && ' ⚠'}
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                          <span className="text-[0.8125rem] font-semibold text-[#0F172A] truncate hover:text-indigo-600 min-w-0">
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
                                title={canUp ? `Shared step update available (v${latestVer})` : 'Locked: test result recorded'}
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
                          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-[#475569]">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              testCase.priority === 'critical' ? 'bg-[#EF4444]' :
                              testCase.priority === 'high' ? 'bg-[#F59E0B]' :
                              testCase.priority === 'medium' ? 'bg-[#6366F1]' :
                              'bg-[#94A3B8]'
                            }`} />
                            {testCase.priority.charAt(0).toUpperCase() + testCase.priority.slice(1)}
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
                                <span className="text-[0.75rem] text-[#475569] truncate">{testCase.folder}</span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const assigneeName = runAssignees.get(testCase.id) || testCase.assignee || '';
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
                                  {assigneeName ? (
                                    <Avatar size="sm" name={assigneeName} title={assigneeName} />
                                  ) : (
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
                                        — Unassigned —
                                      </button>
                                      {projectMembers.map((member) => {
                                        const name = member.full_name || member.email;
                                        return (
                                          <button
                                            key={member.id}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                            onClick={(e) => { e.stopPropagation(); handleAssigneeChange(testCase.id, name); setOpenAssigneeDropdown(null); }}
                                          >
                                            <Avatar size="sm" name={name} />
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

                    {/* Upgrade Modal */}
          {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-vip-crown-line text-yellow-500 text-3xl"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Starter 플랜 이상 필요</h2>
                  <p className="text-gray-600 text-sm mb-6">
                    Jira 이슈 생성 기능은 <strong>Starter 플랜</strong> 이상에서 사용할 수 있습니다.<br />
                    업그레이드하면 테스트 결과에서 바로 Jira 이슈를 생성하고 관리할 수 있습니다.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">Starter 플랜 혜택</p>
                    <ul className="space-y-1.5">
                      {['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira Integration', '기본 리포팅', 'Testcase Export/Import'].map((f) => (
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
                      닫기
                    </button>
                    <button
                      onClick={() => {
                        setShowUpgradeModal(false);
                        navigate('/settings');
                      }}
                      className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                    >
                      플랜 업그레이드
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
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Jira 연동이 필요합니다</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Jira 이슈를 생성하려면 먼저 Settings에서 Jira 계정을 연결해 주세요.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowJiraSetupModal(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold cursor-pointer"
                    >
                      닫기
                    </button>
                    <button
                      onClick={() => {
                        setShowJiraSetupModal(false);
                        navigate('/settings?tab=integrations');
                      }}
                      className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold cursor-pointer"
                    >
                      Connect Jira
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
                  <h2 className="text-lg font-semibold text-gray-900">Add result</h2>
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
                        Status <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { value: 'passed', label: 'Passed', icon: 'ri-checkbox-circle-fill', color: 'bg-green-100 text-green-700 border-green-300', iconColor: 'text-green-600' },
                          { value: 'failed', label: 'Failed', icon: 'ri-close-circle-fill', color: 'bg-red-100 text-red-700 border-red-300', iconColor: 'text-red-600' },
                          { value: 'blocked', label: 'Blocked', icon: 'ri-forbid-fill', color: 'bg-gray-100 text-gray-700 border-gray-300', iconColor: 'text-gray-600' },
                          { value: 'retest', label: 'Retest', icon: 'ri-refresh-line', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', iconColor: 'text-yellow-600' },
                          { value: 'untested', label: 'Untested', icon: 'ri-question-fill', color: 'bg-gray-100 text-gray-500 border-gray-300', iconColor: 'text-gray-500' },
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Note</label>
                      <div className="border border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-paragraph text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-bold text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-italic text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-underline text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-strikethrough text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-code-line text-sm"></i>
                          </button>
                          <div className="w-px h-5 bg-gray-300"></div>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-link text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
                            <i className="ri-list-unordered text-sm"></i>
                          </button>
                          <button className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded cursor-pointer">
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
                    {(selectedTestCase.steps || stepsSnapshot[selectedTestCase.id]) && (() => {
                      // Prefer snapshot captured at run creation (immune to later edits)
                      const snapshotSteps = stepsSnapshot[selectedTestCase.id];
                      if (snapshotSteps) {
                        if (snapshotSteps.length === 0) return null;
                        // Build map: groupHeader → SharedStepRef (for version badge)
                        const ssRefByHeader: Record<string, any> = {};
                        try {
                          const p = JSON.parse(selectedTestCase.steps || '[]');
                          if (Array.isArray(p)) {
                            p.filter((s: any) => s.type === 'shared_step_ref').forEach((s: any) => {
                              ssRefByHeader[`${s.shared_step_custom_id}: ${s.shared_step_name}`] = s;
                            });
                          }
                        } catch {}
                        return (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Steps</label>
                            <div className="space-y-2">
                              {snapshotSteps.map((fs) => {
                                const ref = fs.groupHeader ? ssRefByHeader[fs.groupHeader] : null;
                                const latestInfo = ref ? ssLatestVersions[ref.shared_step_id] : null;
                                const hasNewVersion = ref && latestInfo && ref.shared_step_version != null && latestInfo.version > ref.shared_step_version;
                                const canUp = selectedTestCase && canUpdateTC(selectedTestCase);
                                const diffKey = ref ? `${selectedTestCase.id}:${ref.shared_step_id}` : null;
                                const isDiffOpen = diffKey && expandedDiffKey === diffKey;
                                const oldKey = ref ? `${ref.shared_step_id}:${ref.shared_step_version}` : null;
                                return (
                                <div key={fs.flatIndex}>
                                  {fs.groupHeader && (
                                    <>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg bg-violet-50 border border-violet-200 border-b-0">
                                      <i className="ri-links-line text-violet-500 text-xs" />
                                      <span className="text-xs font-semibold text-violet-700">{fs.groupHeader}</span>
                                      {hasNewVersion && (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isDiffOpen) {
                                              setExpandedDiffKey(null);
                                            } else {
                                              setExpandedDiffKey(diffKey!);
                                              if (ref) fetchOldVersionSteps(ref.shared_step_id, ref.shared_step_version);
                                            }
                                          }}
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold ml-1 cursor-pointer transition-all duration-200 ${
                                            canUp ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500'
                                          }`}
                                          title={canUp ? `New version available: v${latestInfo!.version}` : 'Locked: test result recorded'}
                                        >
                                          {canUp
                                            ? <><i className="ri-arrow-up-line text-[0.5rem]" /> v{latestInfo!.version}</>
                                            : <><i className="ri-lock-line text-[0.5rem]" /> v{latestInfo!.version}</>
                                          }
                                        </span>
                                      )}
                                    </div>
                                    {isDiffOpen && hasNewVersion && (
                                      <div className="border border-violet-200 border-t-0 rounded-b-lg overflow-hidden mb-1 transition-all duration-200">
                                        <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200">
                                          <span className="text-xs font-semibold text-amber-700">
                                            v{ref.shared_step_version} → v{latestInfo!.version} Changes
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {canUp && (
                                              <button
                                                onClick={() => handleUpdateSSVersion(selectedTestCase.id, ref.shared_step_id)}
                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.625rem] font-bold rounded cursor-pointer transition-colors duration-200"
                                              >
                                                Update
                                              </button>
                                            )}
                                            {!canUp && (
                                              <span className="flex items-center gap-1 text-[0.625rem] text-slate-500">
                                                <i className="ri-lock-line" /> Locked to preserve test results
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-gray-200">
                                          <div className="p-2">
                                            <div className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-wider mb-1.5">Current (v{ref.shared_step_version})</div>
                                            {oldKey && oldVersionStepsCache[oldKey] !== undefined ? (
                                              (oldVersionStepsCache[oldKey] as any[]).length > 0 ? (
                                                <div className="space-y-1">
                                                  {(oldVersionStepsCache[oldKey] as any[]).map((step: any, i: number) => (
                                                    <div key={i} className="text-[0.6875rem] text-red-700 bg-red-50 px-2 py-1 rounded leading-relaxed">
                                                      <span className="font-semibold text-red-400 mr-1">{i + 1}.</span>{step.step}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="text-[0.6875rem] text-gray-400 py-2 italic">Version history unavailable</div>
                                              )
                                            ) : (
                                              <div className="text-[0.6875rem] text-gray-400 py-2">Loading...</div>
                                            )}
                                          </div>
                                          <div className="p-2">
                                            <div className="text-[0.5625rem] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Latest (v{latestInfo!.version})</div>
                                            <div className="space-y-1">
                                              {latestInfo!.steps.map((step: any, i: number) => (
                                                <div key={i} className="text-[0.6875rem] text-emerald-700 bg-emerald-50 px-2 py-1 rounded leading-relaxed">
                                                  <span className="font-semibold text-emerald-400 mr-1">{i + 1}.</span>{step.step}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    </>
                                  )}
                                  <div className={`border p-3 ${fs.isSubStep ? 'border-violet-200 bg-violet-50/30 ml-3' + (fs.groupHeader ? ' rounded-b-lg rounded-tr-lg' : ' rounded-lg') : 'border-gray-200 rounded-lg'}`}>
                                    <div className="flex items-start gap-3 mb-2">
                                      <div className={`w-6 h-6 ${fs.isSubStep ? 'bg-violet-100' : 'bg-indigo-100'} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <span className={`${fs.isSubStep ? 'text-violet-700' : 'text-indigo-700'} text-xs font-bold`}>{fs.flatIndex + 1}</span>
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
                                      <option value="untested">Untested</option>
                                      <option value="passed">Passed</option>
                                      <option value="failed">Failed</option>
                                      <option value="blocked">Blocked</option>
                                    </select>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Try new JSON array format first
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
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Steps</label>
                            <div className="space-y-2">
                              {flatSteps.map((fs) => {
                                const ref2 = fs.groupHeader ? ssRefByHeader2[fs.groupHeader] : null;
                                const latestInfo2 = ref2 ? ssLatestVersions[ref2.shared_step_id] : null;
                                const hasNew2 = ref2 && latestInfo2 && ref2.shared_step_version != null && latestInfo2.version > ref2.shared_step_version;
                                const canUp2 = selectedTestCase && canUpdateTC(selectedTestCase);
                                const diffKey2 = ref2 ? `${selectedTestCase.id}:${ref2.shared_step_id}` : null;
                                const isDiff2 = diffKey2 && expandedDiffKey === diffKey2;
                                const oldKey2 = ref2 ? `${ref2.shared_step_id}:${ref2.shared_step_version}` : null;
                                return (
                                <div key={fs.flatIndex}>
                                  {fs.groupHeader && (
                                    <>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg bg-violet-50 border border-violet-200 border-b-0">
                                      <i className="ri-links-line text-violet-500 text-xs" />
                                      <span className="text-xs font-semibold text-violet-700">{fs.groupHeader}</span>
                                      {hasNew2 && (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isDiff2) { setExpandedDiffKey(null); }
                                            else { setExpandedDiffKey(diffKey2!); if (ref2) fetchOldVersionSteps(ref2.shared_step_id, ref2.shared_step_version); }
                                          }}
                                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.5625rem] font-bold ml-1 cursor-pointer transition-all duration-200 ${canUp2 ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500'}`}
                                          title={canUp2 ? `New version: v${latestInfo2!.version}` : 'Locked: test result recorded'}
                                        >
                                          {canUp2 ? <><i className="ri-arrow-up-line text-[0.5rem]" /> v{latestInfo2!.version}</> : <><i className="ri-lock-line text-[0.5rem]" /> v{latestInfo2!.version}</>}
                                        </span>
                                      )}
                                    </div>
                                    {isDiff2 && hasNew2 && (
                                      <div className="border border-violet-200 border-t-0 rounded-b-lg overflow-hidden mb-1 transition-all duration-200">
                                        <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-200">
                                          <span className="text-xs font-semibold text-amber-700">v{ref2.shared_step_version} → v{latestInfo2!.version} Changes</span>
                                          <div className="flex items-center gap-2">
                                            {canUp2 && <button onClick={() => handleUpdateSSVersion(selectedTestCase.id, ref2.shared_step_id)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.625rem] font-bold rounded cursor-pointer transition-colors duration-200">Update</button>}
                                            {!canUp2 && <span className="flex items-center gap-1 text-[0.625rem] text-slate-500"><i className="ri-lock-line" /> Locked to preserve test results</span>}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-gray-200">
                                          <div className="p-2">
                                            <div className="text-[0.5625rem] font-bold text-red-500 uppercase tracking-wider mb-1.5">Current (v{ref2.shared_step_version})</div>
                                            {oldKey2 && oldVersionStepsCache[oldKey2] !== undefined
                                              ? (oldVersionStepsCache[oldKey2] as any[]).length > 0
                                                ? (oldVersionStepsCache[oldKey2] as any[]).map((s: any, i: number) => <div key={i} className="text-[0.6875rem] text-red-700 bg-red-50 px-2 py-1 rounded leading-relaxed mb-1"><span className="font-semibold text-red-400 mr-1">{i+1}.</span>{s.step}</div>)
                                                : <div className="text-[0.6875rem] text-gray-400 py-2 italic">Version history unavailable</div>
                                              : <div className="text-[0.6875rem] text-gray-400 py-2">Loading...</div>
                                            }
                                          </div>
                                          <div className="p-2">
                                            <div className="text-[0.5625rem] font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Latest (v{latestInfo2!.version})</div>
                                            {latestInfo2!.steps.map((s: any, i: number) => <div key={i} className="text-[0.6875rem] text-emerald-700 bg-emerald-50 px-2 py-1 rounded leading-relaxed mb-1"><span className="font-semibold text-emerald-400 mr-1">{i+1}.</span>{s.step}</div>)}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    </>
                                  )}
                                  <div className={`border p-3 ${fs.isSubStep ? 'border-violet-200 bg-violet-50/30 ml-3' + (fs.groupHeader ? ' rounded-b-lg rounded-tr-lg' : ' rounded-lg') : 'border-gray-200 rounded-lg'}`}>
                                    <div className="flex items-start gap-3 mb-2">
                                      <div className={`w-6 h-6 ${fs.isSubStep ? 'bg-violet-100' : 'bg-indigo-100'} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <span className={`${fs.isSubStep ? 'text-violet-700' : 'text-indigo-700'} text-xs font-bold`}>{fs.flatIndex + 1}</span>
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
                                      <option value="untested">Untested</option>
                                      <option value="passed">Passed</option>
                                      <option value="failed">Failed</option>
                                      <option value="blocked">Blocked</option>
                                    </select>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Fallback: old newline-delimited string format
                      if (!selectedTestCase.expected_result) return null;
                      return (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Steps</label>
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
                                    <option value="untested">Untested</option>
                                    <option value="passed">Passed</option>
                                    <option value="failed">Failed</option>
                                    <option value="blocked">Blocked</option>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to</label>
                        <select
                          value={resultFormData.assignTo}
                          onChange={(e) => setResultFormData({ ...resultFormData, assignTo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">Select assignee</option>
                          {projectMembers.map((member) => (
                            <option key={member.id} value={member.user_id}>
                              {member.full_name || member.email}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Leave empty to keep current assignment.</p>
                      </div>

                      {/* Elapsed */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          Elapsed
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
                        <label className="block text-sm font-semibold text-gray-700">Linked Issues</label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isProfessionalOrHigher) {
                                setShowUpgradeModal(true);
                                return;
                              }
                              if (!jiraSettings || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.api_token) {
                                if (confirm('Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?')) {
                                  navigate('/settings');
                                }
                                return;
                              }
                              setShowAddIssueModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                          >
                            <i className="ri-add-line"></i>
                            Create Jira Issue
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
                                setGithubIssueFormData(prev => ({ ...prev, title: tcTitle }));
                                setShowGithubIssueModal(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                            >
                              <i className="ri-github-fill"></i>
                              Create GitHub Issue
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={resultFormData.issues}
                        onChange={(e) => setResultFormData({ ...resultFormData, issues: e.target.value })}
                        onKeyDown={handleIssueKeyDown}
                        placeholder="Enter issue key (e.g., PROJ-123)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Jira 이슈 키를 입력하고 Enter를 누르세요 (예: PROJ-123)</p>
                      
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
                    </div>

                    {/* Attachments */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
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
                            Choose files
                          </label>
                          <span>or</span>
                          <button
                            onClick={handleScreenshot}
                            disabled={uploadingFile}
                            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap ${
                              uploadingFile ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <i className="ri-screenshot-line"></i>
                            screenshot
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">or drag/paste here</p>
                      </div>
                      
                      {uploadingFile && (
                        <div className="mt-3 text-center">
                          <i className="ri-loader-4-line animate-spin text-indigo-500 text-xl"></i>
                          <p className="text-sm text-gray-600 mt-1">Uploading...</p>
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
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResult}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap"
                  >
                    Add result
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
                  <h2 className="text-lg font-semibold text-gray-900">Create Jira Issue</h2>
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
                        Summary <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={issueFormData.summary}
                        onChange={(e) => setIssueFormData({ ...issueFormData, summary: e.target.value })}
                        placeholder="Brief description of the issue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={issueFormData.description}
                        onChange={(e) => setIssueFormData({ ...issueFormData, description: e.target.value })}
                        placeholder="Detailed description of the issue"
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                      ></textarea>
                    </div>

                    {/* Issue Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Type</label>
                        <select
                          value={issueFormData.issueType}
                          onChange={(e) => setIssueFormData({ ...issueFormData, issueType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                        >
                          <option value="Bug">Bug</option>
                          <option value="Task">Task</option>
                          <option value="Story">Story</option>
                          <option value="Epic">Epic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                        <select
                          value={issueFormData.priority}
                          onChange={(e) => setIssueFormData({ ...issueFormData, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                        >
                          <option value="Highest">Highest</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="Lowest">Lowest</option>
                        </select>
                      </div>
                    </div>

                    {/* Labels */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Labels</label>
                      <input
                        type="text"
                        value={issueFormData.labels}
                        onChange={(e) => setIssueFormData({ ...issueFormData, labels: e.target.value })}
                        placeholder="Enter labels separated by commas (e.g., bug, ui, critical)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">쉼표로 구분하여 여러 라벨을 입력하세요</p>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Assignee</label>
                      <input
                        type="text"
                        value={issueFormData.assignee}
                        onChange={(e) => setIssueFormData({ ...issueFormData, assignee: e.target.value })}
                        placeholder="Jira 계정 ID 또는 이메일 (예: user@example.com)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">비워두면 자동 할당됩니다</p>
                    </div>

                    {/* Components */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Components</label>
                      <input
                        type="text"
                        value={issueFormData.components}
                        onChange={(e) => setIssueFormData({ ...issueFormData, components: e.target.value })}
                        placeholder="컴포넌트 이름을 쉼표로 구분 (예: Frontend, API, Database)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Jira 프로젝트에 등록된 컴포넌트 이름을 입력하세요</p>
                    </div>

                    {/* Test Case Info */}
                    {selectedTestCase && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Test Case</h4>
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
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateJiraIssue(activeTab === 'issues')}
                    disabled={creatingIssue || !issueFormData.summary.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingIssue ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-add-line"></i>
                        Create Issue
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
                    <i className="ri-github-fill"></i> Create GitHub Issue
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
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={githubIssueFormData.title}
                      onChange={(e) => setGithubIssueFormData({ ...githubIssueFormData, title: e.target.value })}
                      placeholder="Issue title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={githubIssueFormData.body}
                      onChange={(e) => setGithubIssueFormData({ ...githubIssueFormData, body: e.target.value })}
                      placeholder="Describe the issue (Markdown supported)"
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Labels</label>
                      <input
                        type="text"
                        value={githubIssueFormData.labels}
                        onChange={(e) => setGithubIssueFormData({ ...githubIssueFormData, labels: e.target.value })}
                        placeholder="bug, test-failure"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Assignee</label>
                      <input
                        type="text"
                        value={githubIssueFormData.assignee}
                        onChange={(e) => setGithubIssueFormData({ ...githubIssueFormData, assignee: e.target.value })}
                        placeholder="GitHub username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  {githubSettings && (
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                      <i className="ri-github-fill"></i>
                      Will be created in <strong>{githubSettings.owner}/{githubSettings.repo}</strong>
                    </div>
                  )}
                  {selectedTestCase && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Test Case</h4>
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
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGithubIssue}
                    disabled={creatingGithubIssue || !githubIssueFormData.title.trim()}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingGithubIssue ? (
                      <><i className="ri-loader-4-line animate-spin"></i>Creating...</>
                    ) : (
                      <><i className="ri-github-fill"></i>Create Issue</>
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
              return (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Step Results</label>
                  <div className="space-y-1.5">
                    {stepsSnapshot.map((fs) => {
                      const status = result.stepStatuses?.[fs.flatIndex] || 'untested';
                      const statusInfo = getStepStatusInfo(status);
                      return (
                        <div key={fs.flatIndex}>
                          {fs.groupHeader && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-violet-50 border border-violet-200 border-b-0 mt-2">
                              <i className="ri-links-line text-violet-500 text-xs" />
                              <span className="text-xs font-semibold text-violet-700">{fs.groupHeader}</span>
                            </div>
                          )}
                          <div className={`flex items-center gap-3 p-3 ${fs.isSubStep ? 'bg-violet-50/40 border border-violet-100 ml-3' + (fs.groupHeader ? ' rounded-b-lg rounded-tr-lg' : ' rounded-lg') : 'bg-gray-50 rounded-lg'}`}>
                            <div className={`w-6 h-6 ${fs.isSubStep ? 'bg-violet-100' : 'bg-indigo-100'} rounded-lg flex items-center justify-center ${fs.isSubStep ? 'text-violet-700' : 'text-indigo-700'} font-semibold text-xs flex-shrink-0`}>
                              {fs.flatIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{fs.step}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
              return (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Step Results</label>
                  <div className="space-y-1.5">
                    {flatSteps.map((fs) => {
                      const status = result.stepStatuses?.[fs.flatIndex] || 'untested';
                      const statusInfo = getStepStatusInfo(status);
                      return (
                        <div key={fs.flatIndex}>
                          {fs.groupHeader && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-violet-50 border border-violet-200 border-b-0 mt-2">
                              <i className="ri-links-line text-violet-500 text-xs" />
                              <span className="text-xs font-semibold text-violet-700">{fs.groupHeader}</span>
                            </div>
                          )}
                          <div className={`flex items-center gap-3 p-3 ${fs.isSubStep ? 'bg-violet-50/40 border border-violet-100 ml-3' + (fs.groupHeader ? ' rounded-b-lg rounded-tr-lg' : ' rounded-lg') : 'bg-gray-50 rounded-lg'}`}>
                            <div className={`w-6 h-6 ${fs.isSubStep ? 'bg-violet-100' : 'bg-indigo-100'} rounded-lg flex items-center justify-center ${fs.isSubStep ? 'text-violet-700' : 'text-indigo-700'} font-semibold text-xs flex-shrink-0`}>
                              {fs.flatIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{fs.step}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <i className={`${statusInfo.icon} ${statusInfo.color}`}></i>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.bgColor}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
