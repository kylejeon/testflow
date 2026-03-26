import { LogoMark } from '../../components/Logo';
import PageLoader from '../../components/PageLoader';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ProjectMembersPanel from './components/ProjectMembersPanel';
import InviteMemberModal from './components/InviteMemberModal';
import SEOHead from '../../components/SEOHead';
import NotificationBell from '../../components/feature/NotificationBell';
import ProjectHeader from '../../components/ProjectHeader';
import QuickCreateTCModal from './components/QuickCreateTCModal';
import ContinueRunPanel from './components/ContinueRunPanel';
import AIAssistModal from './components/AIAssistModal';

interface UserProfile {
  email: string;
  full_name: string;
  subscription_tier: number;
  avatar_emoji: string;
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [testRuns, setTestRuns] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [projectIntegrations, setProjectIntegrations] = useState<any[]>([]);
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const [testCaseCount, setTestCaseCount] = useState(0);
  const [showQuickCreateTC, setShowQuickCreateTC] = useState(false);
  const [showContinueRun, setShowContinueRun] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [projectPassRateData, setProjectPassRateData] = useState<{ total: number; passed: number } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Dashboard-specific keyboard shortcuts (N → New TC, R → Continue Run)
  useEffect(() => {
    const handleDashboardShortcuts = (e: KeyboardEvent) => {
      // Skip if modifier keys are held (except Shift)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Skip if focus is in an input / textarea / select / contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return;
      // Skip if any modal is open
      if (showQuickCreateTC || showContinueRun || showAIAssist) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowQuickCreateTC(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setShowContinueRun(true);
      }
    };
    window.addEventListener('keydown', handleDashboardShortcuts);
    return () => window.removeEventListener('keydown', handleDashboardShortcuts);
  }, [showQuickCreateTC, showContinueRun, showAIAssist]);

  const queryClient = useQueryClient();

  // userProfile: 10분 캐시 (페이지 간 공유)
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();
      return {
        email: data?.email || user.email || '',
        full_name: data?.full_name || '',
        subscription_tier: data?.subscription_tier || 1,
        avatar_emoji: data?.avatar_emoji || '',
      };
    },
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (id) {
      fetchData();
      fetchIntegrationStatus();
    }
  }, [id]);


  const fetchIntegrationStatus = async () => {
    if (!id) return;
    const [intRes, jiraRes] = await Promise.all([
      supabase.from('integrations').select('id, type, channel_name, is_active').eq('project_id', id),
      supabase.from('jira_settings').select('id, domain').maybeSingle(),
    ]);
    setProjectIntegrations(intRes.data ?? []);
    setJiraConfigured(!!(jiraRes.data?.domain));
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // ── 독립 쿼리를 모두 병렬로 실행 ──
      const [
        { data: projectData, error: projectError },
        { count: tcCount },
        { data: milestonesData, error: milestonesError },
        { data: allRunsData, error: allRunsError },
        { data: sessionsRaw },
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('test_cases').select('id', { count: 'exact', head: true }).eq('project_id', id),
        supabase.from('milestones').select('*').eq('project_id', id).order('end_date', { ascending: true }),
        supabase.from('test_runs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
        supabase.from('sessions').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(20),
      ]);

      if (projectError) throw projectError;
      if (milestonesError) throw milestonesError;
      if (allRunsError) throw allRunsError;

      setProject(projectData);
      setTestCaseCount(tcCount || 0);

      // ── test_results를 모든 run에 대해 한 번에 fetch (N+1 제거) ──
      const runIds = (allRunsData || []).map(r => r.id);
      const sessionIds = (sessionsRaw || []).map((s: any) => s.id);

      const [
        { data: allTestResultsData, error: allTestResultsError },
        { data: sessionLogsData },
      ] = await Promise.all([
        runIds.length
          ? supabase.from('test_results').select('run_id, test_case_id, status, created_at').in('run_id', runIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        sessionIds.length
          ? supabase.from('session_logs').select('session_id, type, created_at').in('session_id', sessionIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (allTestResultsError) throw allTestResultsError;

      // ── test_results를 run_id별로 그룹화 (메모리에서 O(1) 조회) ──
      const allResultsByRun = new Map<string, any[]>();
      (allTestResultsData || []).forEach((r: any) => {
        if (!allResultsByRun.has(r.run_id)) allResultsByRun.set(r.run_id, []);
        allResultsByRun.get(r.run_id)!.push(r);
      });

      // Compute pass rate from actual test_results (stored run columns are unreliable)
      const _prTotal = (allTestResultsData || []).filter((r: any) => r.status !== 'untested').length;
      const _prPassed = (allTestResultsData || []).filter((r: any) => r.status === 'passed').length;
      setProjectPassRateData({ total: _prTotal, passed: _prPassed });

      // calculate milestone progress
      const milestonesWithProgress = (milestonesData || []).map((milestone) => {
        const milestoneRuns = allRunsData?.filter(run => run.milestone_id === milestone.id) || [];

        if (milestoneRuns.length === 0) {
          let status = milestone.status;
          if (status === 'upcoming' && milestone.start_date) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const start = new Date(milestone.start_date); start.setHours(0, 0, 0, 0);
            if (start <= today) status = 'started';
          }
          return { ...milestone, status, progress: 0 };
        }

        const runProgresses = milestoneRuns.map(run => {
          const runResults = allTestResultsData?.filter(r => r.run_id === run.id) || [];
          const statusMap = new Map<string, string>();
          runResults.forEach(r => {
            if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
          });

          const totalTests = run.test_case_ids.length;
          if (totalTests === 0) return 0;

          let completed = 0;
          run.test_case_ids.forEach((tcId: string) => {
            const s = statusMap.get(tcId);
            if (s === 'passed' || s === 'failed' || s === 'blocked' || s === 'retest') completed++;
          });

          return Math.round((completed / totalTests) * 100);
        });

        const avg = Math.round(runProgresses.reduce((a, b) => a + b, 0) / runProgresses.length);

        let status = milestone.status;
        if (status === 'upcoming' && milestone.start_date) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const start = new Date(milestone.start_date); start.setHours(0, 0, 0, 0);
          if (start <= today) status = 'started';
        }

        return { ...milestone, status, progress: avg };
      });

      // organize parent/child milestones
      const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
      const organizedMilestones = parentMilestones.map(parent => ({
        ...parent,
        subMilestones: milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id),
      }));

      const initialExpanded = new Set<string>();
      organizedMilestones.forEach(m => {
        if (m.subMilestones && m.subMilestones.length) initialExpanded.add(m.id);
      });
      setExpandedMilestones(initialExpanded);
      setMilestones(organizedMilestones);

      // milestone id → name 맵 생성
      const milestoneMap = new Map<string, string>();
      (milestonesData || []).forEach(m => milestoneMap.set(m.id, m.name));

      // ── LATEST RUNS WITH PROGRESS (캐싱된 allResultsByRun 사용, N+1 없음) ──
      const runsWithProgress = (allRunsData || []).slice(0, 5).map((run: any) => {
        const runResults = allResultsByRun.get(run.id) || [];
        const statusMap = new Map<string, string>();
        runResults.forEach((r: any) => {
          if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
        });

        let passed = 0, failed = 0, blocked = 0, retest = 0, untested = 0;
        (run.test_case_ids || []).forEach((tcId: string) => {
          const s = statusMap.get(tcId) || 'untested';
          if (s === 'passed') passed++;
          else if (s === 'failed') failed++;
          else if (s === 'blocked') blocked++;
          else if (s === 'retest') retest++;
          else untested++;
        });

        const milestoneName = run.milestone_id ? milestoneMap.get(run.milestone_id) || null : null;
        return { ...run, passed, failed, blocked, retest, untested, milestoneName };
      });
      setTestRuns(runsWithProgress);

      // ── SESSIONS & ACTIVITY (이미 병렬로 fetch한 sessionsRaw + sessionLogsData 재사용) ──
      const sessionsData = sessionsRaw;

      const logsBySession = new Map<string, any[]>();
      (sessionLogsData || []).forEach((log: any) => {
        if (!logsBySession.has(log.session_id)) logsBySession.set(log.session_id, []);
        logsBySession.get(log.session_id)!.push(log);
      });

      const generateActivityData = (logs: any[]) => {
        const blockCount = 24;
        const activity = new Array(blockCount).fill('#e5e7eb');
        if (!logs?.length) return activity;

        const recent = logs.slice(0, blockCount);
        recent.forEach((log, i) => {
          switch (log.type) {
            case 'note':
              activity[i] = '#3b82f6';
              break;
            case 'passed':
              activity[i] = '#10b981';
              break;
            case 'failed':
              activity[i] = '#ef4444';
              break;
            case 'blocked':
              activity[i] = '#f59e0b';
              break;
            default:
              activity[i] = '#6366F1';
          }
        });
        return activity;
      };

      const sessionsWithActivity = (sessionsData || []).map(session => {
        const logs = logsBySession.get(session.id) || [];
        const activityData = generateActivityData(logs);

        let actualStatus: string;
        if (session.ended_at || session.status === 'closed' || session.status === 'completed') {
          actualStatus = 'completed';
        } else if (session.status === 'paused' || session.paused_at) {
          actualStatus = 'paused';
        } else if (session.started_at) {
          actualStatus = 'in_progress';
        } else {
          actualStatus = 'new';
        }

        return { ...session, actualStatus, activityData };
      });

      setSessions(sessionsWithActivity);

      // ── TIMELINE ACTIVITY (allResultsByRun 재사용, N+1 없음) ──
      const runResultSummary: Record<string, {
        passed: number; failed: number; blocked: number; retest: number; latestAt: string; runName: string;
      }> = {};

      (allRunsData || []).slice(0, 10).forEach((run: any) => {
        const results = allResultsByRun.get(run.id) || [];
        if (!results.length) return;
        let passed = 0, failed = 0, blocked = 0, retest = 0;
        results.forEach((r: any) => {
          if (r.status === 'passed') passed++;
          else if (r.status === 'failed') failed++;
          else if (r.status === 'blocked') blocked++;
          else if (r.status === 'retest') retest++;
        });
        runResultSummary[run.id] = {
          passed, failed, blocked, retest,
          latestAt: results[0].created_at,
          runName: run.name,
        };
      });

      // 이미 fetch한 데이터 재사용 (중복 fetch 제거)
      const allRunsTimeline = (allRunsData || []).slice(0, 20);
      const allSessionsTimeline = (sessionsData || []).slice(0, 20);
      const allMilestonesTimeline = [...(milestonesData || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 20);

      const activities = [
        // Milestones
        ...allMilestonesTimeline.map((m: any) => ({
          type: 'milestone', action: 'created', name: m.name, created_at: m.created_at,
          meta: { status: m.status, start_date: m.start_date, end_date: m.end_date },
        })),
        ...allMilestonesTimeline
          .filter((m: any) => m.status === 'completed' && m.updated_at)
          .map((m: any) => ({
            type: 'milestone', action: 'completed', name: m.name, created_at: m.updated_at,
            meta: { status: m.status },
          })),
        // Runs
        ...allRunsTimeline.map((r: any) => ({
          type: 'run', action: 'created', name: r.name, created_at: r.created_at,
          meta: { testCount: r.test_case_ids?.length || 0, status: r.status },
        })),
        ...allRunsTimeline
          .filter((r: any) => r.status === 'completed' && r.executed_at)
          .map((r: any) => ({
            type: 'run', action: 'completed', name: r.name, created_at: r.executed_at,
            meta: { testCount: r.test_case_ids?.length || 0 },
          })),
        // Test result activity
        ...Object.entries(runResultSummary).map(([runId, summary]) => ({
          type: 'test_activity',
          action: 'tested',
          name: summary.runName,
          created_at: summary.latestAt,
          meta: {
            passed: summary.passed,
            failed: summary.failed,
            blocked: summary.blocked,
            retest: summary.retest,
          },
        })),
        // Sessions
        ...(allSessionsTimeline || []).map((s: any) => ({
          type: 'session',
          action: 'created',
          name: s.name,
          created_at: s.created_at,
          meta: { status: s.status },
        })),
        ...(allSessionsTimeline || [])
          .filter((s: any) => (s.status === 'completed' || s.status === 'closed') && s.ended_at)
          .map((s: any) => ({
            type: 'session',
            action: 'completed',
            name: s.name,
            created_at: s.ended_at,
            meta: {},
          })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      setRecentActivity(activities);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (milestoneId: string) => {
    const newSet = new Set(expandedMilestones);
    if (newSet.has(milestoneId)) newSet.delete(milestoneId);
    else newSet.add(milestoneId);
    setExpandedMilestones(newSet);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
      started: { label: 'Started', className: 'bg-green-100 text-green-700' },
      past_due: { label: 'Past due', className: 'bg-orange-100 text-orange-700' },
      completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  const getProjectStatusDisplay = (status: string) => {
    const map = {
      active: { label: 'Active', icon: 'ri-checkbox-circle-fill', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
      archived: { label: 'Archived', icon: 'ri-archive-line', bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
      completed: { label: 'Completed', icon: 'ri-check-double-line', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    };
    return map[status as keyof typeof map] || map.active;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'blocked': return 'bg-orange-500';
      case 'retest': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const calculateRunProgress = (run: any) => {
    const total = (run.passed || 0) + (run.failed || 0) + (run.blocked || 0) + (run.retest || 0) + (run.untested || 0);
    if (total === 0) return { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 100 };
    return {
      passed: Math.round(((run.passed || 0) / total) * 100),
      failed: Math.round(((run.failed || 0) / total) * 100),
      blocked: Math.round(((run.blocked || 0) / total) * 100),
      retest: Math.round(((run.retest || 0) / total) * 100),
      untested: Math.round(((run.untested || 0) / total) * 100),
    };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return 'Starts TBD';
    const s = formatDate(start);
    if (!end) return `Starts ${s}`;
    return `${s} - ${formatDate(end)}`;
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'week' : 'weeks'} ago`;
    if (days < 365) return `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'month' : 'months'} ago`;
    return formatDate(dateStr);
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

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO];

  // ── Loading / Not found states ──
  if (loading) {
    return (
      <>
        <SEOHead title="Loading project... | Testably" description="Loading your Testably project." noindex />
        <PageLoader fullScreen />
      </>
    );
  }

  if (!project) {
    return (
      <>
        <SEOHead title="Project not found | Testably" description="The project you requested could not be found." noindex />
        <div className="flex h-screen bg-white">
          <div className="flex-1 flex flex-col overflow-hidden">
            <ProjectHeader projectId={id || ''} projectName="" />
            <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-error-warning-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h3>
                <Link to="/projects" className="text-indigo-600 hover:text-indigo-700 font-medium">프로젝트 목록으로 돌아가기</Link>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  // ── Dashboard computed values ──
  const activeRunsCount = testRuns.filter(r => r.status !== 'completed').length;
  // Use all-runs aggregate for pass rate (falls back to recent 5 runs if not yet loaded)
  const prTotal = projectPassRateData?.total ?? testRuns.reduce((acc, r) => acc + (r.passed||0) + (r.failed||0) + (r.blocked||0) + (r.retest||0), 0);
  const prPassed = projectPassRateData?.passed ?? testRuns.reduce((acc, r) => acc + (r.passed||0), 0);
  const passRate = prTotal > 0 ? Math.round((prPassed / prTotal) * 100) : 0;
  const healthColor = passRate >= 80 ? '#16A34A' : passRate >= 50 ? '#D97706' : '#DC2626';
  const AI_LIMITS: Record<number, number> = { 1: 5, 2: 30, 3: 150, 4: -1, 5: -1, 6: -1 };
  const aiLimit = AI_LIMITS[currentTier] ?? 5;

  // ── Active milestones filter ──
  const activeMilestones = milestones.filter(m => {
    if (m.status === 'completed') return false;
    if (m.subMilestones && m.subMilestones.length) {
      m.subMilestones = m.subMilestones.filter((sub: any) => sub.status !== 'completed');
    }
    return true;
  });

  const renderMilestone = (milestone: any, isSub = false) => {
    const badge = getStatusBadge(milestone.status);
    const hasSubs = !!(milestone.subMilestones && milestone.subMilestones.length);
    const isExpanded = expandedMilestones.has(milestone.id);

    return (
      <div key={milestone.id}>
        <div className={`border border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-all ${isSub ? 'ml-8 bg-gray-50/50' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {hasSubs && !isSub && (
                <button
                  onClick={() => toggleExpanded(milestone.id)}
                  className="w-5 h-5 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded cursor-pointer flex-shrink-0"
                >
                  <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line`}></i>
                </button>
              )}
              <i className={`${isSub ? 'ri-run-line' : 'ri-flag-line'} text-gray-400 text-lg w-5 h-5 flex items-center justify-center flex-shrink-0`}></i>
              <h3 className="font-semibold text-gray-900 truncate">{milestone.name}</h3>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <span className="text-sm text-gray-500 whitespace-nowrap">{formatDateRange(milestone.start_date, milestone.end_date)}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className} whitespace-nowrap`}>{badge.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${milestone.status === 'past_due' ? 'bg-orange-500' : milestone.status === 'started' ? 'bg-green-500' : 'bg-gray-400'}`}
                style={{ width: `${milestone.progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-semibold text-gray-700 min-w-[40px] text-right">{milestone.progress}%</span>
          </div>
        </div>

        {hasSubs && isExpanded && (
          <div className="mt-3 space-y-3">
            {milestone.subMilestones.map((sub: any) => renderMilestone(sub, true))}
          </div>
        )}
      </div>
    );
  };

  // ── Main render ──
  return (
    <>
      <SEOHead title={`${project.name} — Dashboard | Testably`} description={`Project dashboard for ${project.name}.`} noindex />
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <ProjectHeader projectId={id || ''} projectName={project.name} />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50">

            {/* Quick Actions Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-sm font-bold text-gray-900">Dashboard</span>
                {testRuns.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: passRate >= 80 ? '#F0FDF4' : passRate >= 50 ? '#FFFBEB' : '#FEF2F2', color: healthColor }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: healthColor }} />
                    {passRate}%
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowQuickCreateTC(true)}
                className="flex items-center gap-1.5 px-3 py-[7px] text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <i className="ri-file-add-line"></i>
                <span>New Test Case</span>
                <kbd className="text-[9px] font-semibold px-1 py-0.5 rounded bg-black/5">N</kbd>
              </button>
              <button
                onClick={() => setShowContinueRun(true)}
                className="flex items-center gap-1.5 px-3 py-[7px] text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <i className="ri-play-circle-line"></i>
                <span>Continue Run</span>
                <kbd className="text-[9px] font-semibold px-1 py-0.5 rounded bg-black/5">R</kbd>
              </button>
              <button
                onClick={() => setShowAIAssist(true)}
                className="flex items-center gap-1.5 px-3 py-[7px] text-xs font-medium text-white bg-violet-500 border border-violet-500 rounded-full hover:bg-violet-600 transition-all"
              >
                <i className="ri-sparkling-line"></i>
                <span>AI Assist</span>
              </button>
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-5 gap-4 max-w-screen-xl mx-auto">

                {/* LEFT COLUMN — 60% */}
                <div className="col-span-3 flex flex-col gap-4">

                  {/* Widget 1: My Tasks */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeInUp 0.4s ease-out 0ms backwards' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <i className="ri-checkbox-circle-line text-lg text-indigo-500"></i>
                        My Tasks
                        {testRuns.reduce((a, r) => a + (r.untested||0) + (r.failed||0) + (r.retest||0), 0) > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold flex items-center justify-center">
                            {Math.min(testRuns.reduce((a, r) => a + (r.untested||0) + (r.failed||0) + (r.retest||0), 0), 99)}
                          </span>
                        )}
                      </div>
                      <Link to={`/projects/${id}/runs`} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                        View all runs <i className="ri-arrow-right-s-line"></i>
                      </Link>
                    </div>
                    {testRuns.filter(r => (r.untested||0) + (r.failed||0) + (r.retest||0) > 0).length === 0 ? (
                      <div className="text-center py-8">
                        <i className="ri-checkbox-circle-line text-4xl text-green-400 block mb-2"></i>
                        <p className="text-sm text-gray-500">All caught up! No pending tasks.</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {testRuns.filter(r => (r.untested||0) + (r.failed||0) + (r.retest||0) > 0).slice(0, 4).map(run => {
                          const needsAttention = (run.failed||0) + (run.retest||0);
                          const urgency = run.status === 'in_progress' ? 'today' : needsAttention > 0 ? 'overdue' : 'week';
                          return (
                            <Link
                              key={run.id}
                              to={`/projects/${id}/runs/${run.id}`}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                            >
                              <div className="w-[18px] h-[18px] border-2 border-gray-300 rounded group-hover:border-indigo-500 flex-shrink-0 mt-0.5 transition-colors" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{run.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {needsAttention > 0 && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                                      {needsAttention} failed/retest
                                    </span>
                                  )}
                                  {(run.untested||0) > 0 && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                      {run.untested} untested
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    urgency === 'overdue' ? 'bg-red-50 text-red-600' :
                                    urgency === 'today' ? 'bg-orange-50 text-orange-600' :
                                    'bg-indigo-50 text-indigo-600'
                                  }`}>
                                    {urgency === 'overdue' ? 'Needs attention' : urgency === 'today' ? 'In progress' : 'This week'}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Widget 2: Attention Needed */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeInUp 0.4s ease-out 50ms backwards' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <i className="ri-error-warning-line text-lg text-red-500"></i>
                        Attention Needed
                        {testRuns.filter(r => (r.failed||0) + (r.blocked||0) > 0).length > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-50 text-red-600 text-[11px] font-bold flex items-center justify-center">
                            {testRuns.filter(r => (r.failed||0) + (r.blocked||0) > 0).length}
                          </span>
                        )}
                      </div>
                      <Link to={`/projects/${id}/runs`} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                        View failures <i className="ri-arrow-right-s-line"></i>
                      </Link>
                    </div>
                    {testRuns.filter(r => (r.failed||0) + (r.blocked||0) > 0).length === 0 ? (
                      <div className="text-center py-8">
                        <i className="ri-shield-check-line text-4xl text-green-400 block mb-2"></i>
                        <p className="text-sm text-gray-500">No failures or blockers. Looking good!</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {testRuns.filter(r => (r.failed||0) + (r.blocked||0) > 0).slice(0, 4).map(run => (
                          <Link
                            key={run.id}
                            to={`/projects/${id}/runs/${run.id}`}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-red-50/50 transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${(run.failed||0) > 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                              <i className={`text-sm ${(run.failed||0) > 0 ? 'ri-close-line' : 'ri-forbid-line'}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{run.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {(run.failed||0) > 0 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wide">
                                    {run.failed} Failed
                                  </span>
                                )}
                                {(run.blocked||0) > 0 && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 uppercase tracking-wide">
                                    {run.blocked} Blocked
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Widget 5: Recent Activity */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeInUp 0.4s ease-out 100ms backwards' }}>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-900">
                      <i className="ri-time-line text-lg text-gray-500"></i>
                      Recent Activity
                    </div>
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-10">
                        <i className="ri-time-line text-4xl text-gray-300 block mb-2"></i>
                        <p className="text-sm text-gray-500">No activity yet</p>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded">
                        {recentActivity.slice(0, 10).map((event, idx) => {
                          const iconMap: Record<string, { icon: string; dot: string }> = {
                            'milestone-created': { icon: 'ri-flag-line', dot: '#6366F1' },
                            'milestone-completed': { icon: 'ri-flag-fill', dot: '#16A34A' },
                            'run-created': { icon: 'ri-play-circle-line', dot: '#6366F1' },
                            'run-completed': { icon: 'ri-checkbox-circle-line', dot: '#16A34A' },
                            'session-created': { icon: 'ri-search-eye-line', dot: '#8B5CF6' },
                            'session-completed': { icon: 'ri-check-double-line', dot: '#16A34A' },
                            'test_activity-tested': { icon: 'ri-test-tube-line', dot: '#6366F1' },
                          };
                          const key = `${event.type}-${event.action}`;
                          const info = iconMap[key] || { icon: 'ri-information-line', dot: '#94A3B8' };
                          return (
                            <div key={idx} className="flex items-start gap-2.5 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 px-2 rounded-lg transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: info.dot }} />
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-gray-500">
                                <i className={`${info.icon} text-xs`}></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 leading-snug truncate font-medium">{event.name}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{getRelativeTime(event.created_at)}</p>
                              </div>
                              {event.type === 'test_activity' && (
                                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                                  {(event.meta?.passed||0) > 0 && <span className="text-[10px] font-semibold text-green-600">{event.meta.passed}✓</span>}
                                  {(event.meta?.failed||0) > 0 && <span className="text-[10px] font-semibold text-red-600">{event.meta.failed}✗</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN — 40% */}
                <div className="col-span-2 flex flex-col gap-4">

                  {/* Widget 3: Summary Stats */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeInUp 0.4s ease-out 30ms backwards' }}>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-900">
                      <i className="ri-bar-chart-2-line text-lg text-indigo-500"></i>
                      Summary
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link to={`/projects/${id}/testcases`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-indigo-200 hover:scale-[1.02] hover:shadow-sm transition-all">
                        <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-file-text-line text-indigo-600"></i>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 leading-none">{testCaseCount}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Test Cases</p>
                        </div>
                      </Link>
                      <Link to={`/projects/${id}/runs`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-indigo-200 hover:scale-[1.02] hover:shadow-sm transition-all">
                        <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-checkbox-circle-line text-green-600"></i>
                        </div>
                        <div>
                          <p className="text-xl font-bold leading-none" style={{ color: prTotal > 0 ? healthColor : '#9CA3AF' }}>
                            {prTotal > 0 ? `${passRate}%` : '—'}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Pass Rate</p>
                        </div>
                      </Link>
                      <Link to={`/projects/${id}/runs`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-indigo-200 hover:scale-[1.02] hover:shadow-sm transition-all">
                        <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-play-circle-line text-indigo-600"></i>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 leading-none">{activeRunsCount}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Active Runs</p>
                        </div>
                      </Link>
                      <Link to={`/projects/${id}/discovery-logs`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-indigo-200 hover:scale-[1.02] hover:shadow-sm transition-all">
                        <div className="w-9 h-9 bg-violet-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <i className="ri-search-eye-line text-violet-600"></i>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900 leading-none">{sessions.length}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Discovery Logs</p>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Widget 4: Milestone Progress */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeInUp 0.4s ease-out 80ms backwards' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <i className="ri-flag-line text-lg text-amber-500"></i>
                        Milestones
                      </div>
                      <Link to={`/projects/${id}/milestones`} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
                        View all <i className="ri-arrow-right-s-line"></i>
                      </Link>
                    </div>
                    {activeMilestones.length === 0 ? (
                      <div className="text-center py-8">
                        <i className="ri-flag-line text-4xl text-gray-300 block mb-2"></i>
                        <p className="text-sm text-gray-500">No active milestones</p>
                        <Link to={`/projects/${id}/milestones`} className="text-xs text-indigo-600 font-medium mt-1 inline-block">Create one →</Link>
                      </div>
                    ) : (
                      <div>
                        {activeMilestones.slice(0, 3).map((m, idx) => {
                          const daysLeft = m.end_date ? Math.ceil((new Date(m.end_date).getTime() - Date.now()) / 86400000) : null;
                          const barColor = m.status === 'past_due' ? '#EF4444' : m.progress >= 80 ? '#16A34A' : '#6366F1';
                          return (
                            <div key={m.id} className={`py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold text-gray-900 truncate flex-1 mr-2">{m.name}</span>
                                {daysLeft !== null && (
                                  <span className={`text-[11px] font-semibold flex items-center gap-0.5 flex-shrink-0 ${daysLeft <= 3 ? 'text-red-600' : 'text-gray-400'}`}>
                                    <i className="ri-time-line text-xs"></i>
                                    {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${m.progress}%`, background: barColor }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[11px] text-gray-400">{formatDate(m.end_date) || 'No due date'}</span>
                                <span className="text-[11px] font-semibold" style={{ color: barColor }}>{m.progress}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Widget 7: AI Usage */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5" style={{ animation: 'fadeInUp 0.4s ease-out 130ms backwards' }}>
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-900">
                      <i className="ri-sparkling-line text-lg text-violet-500"></i>
                      AI Usage
                    </div>
                    {aiLimit < 0 ? (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-1">
                          <p className="text-xl font-bold text-gray-900 leading-none">Unlimited</p>
                          <p className="text-[11px] text-gray-400 mt-1">AI generations</p>
                        </div>
                        <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-1 rounded-full">Enterprise</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xl font-bold text-gray-900">—<span className="text-sm font-normal text-gray-400 ml-1">/ {aiLimit}</span></span>
                          <span className="text-[11px] text-gray-400">generations this month</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: '0%' }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">Plan: <strong className="text-gray-600">{tierInfo?.name || 'Free'}</strong></span>
                          <Link to="/settings?tab=billing" className="text-[11px] text-indigo-600 font-medium flex items-center gap-0.5 hover:text-indigo-700">
                            Upgrade <i className="ri-arrow-right-up-line text-xs"></i>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </main>

        </div>
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={id!}
        onInvited={() => setMemberRefreshTrigger(prev => prev + 1)}
      />

      <QuickCreateTCModal
        isOpen={showQuickCreateTC}
        onClose={() => setShowQuickCreateTC(false)}
        projectId={id!}
      />

      <ContinueRunPanel
        isOpen={showContinueRun}
        onClose={() => setShowContinueRun(false)}
        projectId={id!}
      />

      <AIAssistModal
        isOpen={showAIAssist}
        onClose={() => setShowAIAssist(false)}
        projectId={id!}
      />
    </>
  );
}
