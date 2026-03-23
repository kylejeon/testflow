import { LogoMark } from '../../components/Logo';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ProjectMembersPanel from './components/ProjectMembersPanel';
import InviteMemberModal from './components/InviteMemberModal';
import SEOHead from '../../components/SEOHead';
import NotificationBell from '../../components/feature/NotificationBell';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [projectIntegrations, setProjectIntegrations] = useState<any[]>([]);
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchData();
      fetchIntegrationStatus();
    }
    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile({
          email: data.email || user.email || '',
          full_name: data.full_name || '',
          subscription_tier: data.subscription_tier || 1,
          avatar_emoji: data.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
    }
  };

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

      // ── PROJECT ──
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // ── MILESTONES ──
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('end_date', { ascending: true });

      if (milestonesError) throw milestonesError;

      // ── TEST RUNS & RESULTS ──
      const { data: allRunsData, error: allRunsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id);

      if (allRunsError) throw allRunsError;

      const { data: allTestResultsData, error: allTestResultsError } = await supabase
        .from('test_results')
        .select('run_id, test_case_id, status')
        .in('run_id', (allRunsData || []).map(r => r.id))
        .order('created_at', { ascending: false });

      if (allTestResultsError) throw allTestResultsError;

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

      // ── LATEST RUNS WITH PROGRESS ──
      const { data: runsData, error: runsError } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (runsError) throw runsError;

      const runsWithProgress = await Promise.all(
        (runsData || []).map(async (run) => {
          const { data: testResultsData } = await supabase
            .from('test_results')
            .select('test_case_id, status')
            .eq('run_id', run.id)
            .order('created_at', { ascending: false })
            .limit(50);

          const statusMap = new Map<string, string>();
          testResultsData?.forEach(r => {
            if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
          });

          let passed = 0, failed = 0, blocked = 0, retest = 0, untested = 0;
          run.test_case_ids.forEach((tcId: string) => {
            const s = statusMap.get(tcId) || 'untested';
            if (s === 'passed') passed++;
            else if (s === 'failed') failed++;
            else if (s === 'blocked') blocked++;
            else if (s === 'retest') retest++;
            else untested++;
          });

          const milestoneName = run.milestone_id ? milestoneMap.get(run.milestone_id) || null : null;

          return { ...run, passed, failed, blocked, retest, untested, milestoneName };
        })
      );
      setTestRuns(runsWithProgress);

      // ── SESSIONS & ACTIVITY ──
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (sessionsError) throw sessionsError;

      const sessionIds = (sessionsData || []).map(s => s.id);
      const { data: sessionLogsData, error: sessionLogsError } = await supabase
        .from('session_logs')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      if (sessionLogsError) throw sessionLogsError;

      const logsBySession = new Map<string, any[]>();
      (sessionLogsData || []).forEach(log => {
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

      // ── TIMELINE ACTIVITY ──
      const runResultSummary: Record<string, {
        passed: number; failed: number; blocked: number; retest: number; latestAt: string; runName: string;
      }> = {};

      const recentResultsPerRun = await Promise.all(
        (allRunsData || []).slice(0, 10).map(async (run) => {
          const { data } = await supabase
            .from('test_results')
            .select('status, created_at')
            .eq('run_id', run.id)
            .order('created_at', { ascending: false })
            .limit(50);
          return { run, results: data || [] };
        })
      );

      recentResultsPerRun.forEach(({ run, results }) => {
        if (!results.length) return;
        let passed = 0, failed = 0, blocked = 0, retest = 0;
        results.forEach(r => {
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

      const { data: allRunsTimeline } = await supabase
        .from('test_runs')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: allSessionsTimeline } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: allMilestonesTimeline } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      const activities = [
        // Milestones
        ...(allMilestonesTimeline || []).map((m: any) => ({
          type: 'milestone', action: 'created', name: m.name, created_at: m.created_at,
          meta: { status: m.status, start_date: m.start_date, end_date: m.end_date },
        })),
        ...(allMilestonesTimeline || [])
          .filter((m: any) => m.status === 'completed' && m.updated_at)
          .map((m: any) => ({
            type: 'milestone', action: 'completed', name: m.name, created_at: m.updated_at,
            meta: { status: m.status },
          })),
        // Runs
        ...(allRunsTimeline || []).map((r: any) => ({
          type: 'run', action: 'created', name: r.name, created_at: r.created_at,
          meta: { testCount: r.test_case_ids?.length || 0, status: r.status },
        })),
        ...(allRunsTimeline || [])
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
        <div className="flex h-screen bg-white">
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <Link to="/projects" className="flex items-center cursor-pointer">
                  <LogoMark />
                </Link>
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {userProfile?.avatar_emoji ? (
                    <span className="text-xl leading-none">{userProfile.avatar_emoji}</span>
                  ) : (
                    <span>{userProfile?.full_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">프로젝트를 불러오는 중...</p>
              </div>
            </main>
          </div>
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <SEOHead title="Project not found | Testably" description="The project you requested could not be found." noindex />
        <div className="flex h-screen bg-white">
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <Link to="/projects" className="flex items-center cursor-pointer">
                  <LogoMark />
                </Link>
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                  {userProfile?.avatar_emoji ? (
                    <span className="text-xl leading-none">{userProfile.avatar_emoji}</span>
                  ) : (
                    <span>{userProfile?.full_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              </div>
            </header>
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
      <SEOHead title={`${project.name} | Testably`} description={`View overview, milestones, test runs, and sessions for ${project.name}.`} noindex />
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Logo / Project Name */}
              <div className="flex items-center gap-4">
                <Link to="/projects" className="flex items-center cursor-pointer">
                  <LogoMark />
                </Link>

                <div className="w-px h-5 bg-gray-300" />

                <span className="text-sm text-gray-500">{project.name}</span>
              </div>

              {/* Right: Nav tabs + Profile */}
              <div className="flex items-center gap-4">
                <nav className="flex items-center gap-1">
                  <Link
                    to={`/projects/${id}`}
                    className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Overview
                  </Link>
                  <Link
                    to={`/projects/${id}/milestones`}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Milestones
                  </Link>
                  <Link
                    to={`/projects/${id}/documents`}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Documentation
                  </Link>
                  <Link
                    to={`/projects/${id}/testcases`}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Test Cases
                  </Link>
                  <Link
                    to={`/projects/${id}/runs`}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Runs &amp; Results
                  </Link>
                  <Link
                    to={`/projects/${id}/discovery-logs`}
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Discovery Logs
                  </Link>
                </nav>

                {/* Profile */}
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <div className="relative" ref={profileMenuRef}>
                    <div
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer overflow-hidden"
                    >
                      {userProfile?.avatar_emoji ? (
                        <span className="text-xl leading-none">{userProfile.avatar_emoji}</span>
                      ) : (
                        <span>{userProfile?.full_name?.charAt(0) || 'U'}</span>
                      )}
                    </div>

                    {showProfileMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
                        <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-500">{userProfile?.email}</p>
                            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded border ${tierInfo.color}`}>
                              <i className={`${tierInfo.icon} text-sm`}></i>
                              {tierInfo.name}
                            </div>
                          </div>
                          <Link
                            to="/settings"
                            onClick={() => setShowProfileMenu(false)}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                          >
                            <i className="ri-settings-3-line text-lg w-5 h-5 flex items-center justify-center"></i>
                            <span>Settings</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                          >
                            <i className="ri-logout-box-line text-lg"></i>
                            <span>Log out</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-gray-50/30">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Project Overview</h1>
              </div>

              <div className="grid grid-cols-3 gap-8">
                {/* Left side */}
                <div className="col-span-2 space-y-8">
                  {/* Milestones */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900">CURRENT MILESTONES</h2>
                      <Link to={`/projects/${id}/milestones`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap">
                        See all {activeMilestones.length} active milestones →
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {activeMilestones.slice(0, 5).map(m => renderMilestone(m))}
                    </div>
                  </div>

                  {/* Testing activity */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900">TESTING ACTIVITY</h2>
                    </div>

                    {/* Runs */}
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">RUNS (latest)</h3>
                      <div className="flex items-start gap-8">
                        {/* Active runs donut */}
                        <div className="flex-shrink-0">
                          <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#6366F1"
                                strokeWidth="16"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 56}`}
                                strokeDashoffset={`${2 * Math.PI * 56 * (1 - (testRuns.filter(r => r.status !== 'completed').length / Math.max(testRuns.length, 1)))}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-sm font-medium text-gray-500 uppercase">ACTIVE</div>
                              <div className="text-3xl font-bold text-gray-900">{testRuns.filter(r => r.status !== 'completed').length}</div>
                              <div className="text-sm text-gray-500">Runs</div>
                            </div>
                          </div>
                        </div>

                        {/* Run list */}
                        <div className="flex-1 space-y-3">
                          {testRuns.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No test runs yet</div>
                          ) : (
                            testRuns.map(run => {
                              const prog = calculateRunProgress(run);
                              const completion = 100 - prog.untested;
                              return (
                                <Link
                                  key={run.id}
                                  to={`/projects/${id}/runs/${run.id}`}
                                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-all cursor-pointer group"
                                >
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                    <i className="ri-play-circle-line text-lg text-gray-600"></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{run.name}</span>
                                      {run.milestoneName && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap flex-shrink-0">
                                          <i className="ri-flag-line text-xs"></i>{run.milestoneName}
                                        </span>
                                      )}
                                      {run.status === 'completed' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 whitespace-nowrap flex-shrink-0">
                                          <i className="ri-check-double-line text-xs"></i>Completed
                                        </span>
                                      ) : run.status === 'paused' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap flex-shrink-0">
                                          <i className="ri-pause-circle-line text-xs"></i>Paused
                                        </span>
                                      ) : run.status === 'in_progress' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap flex-shrink-0">
                                          <i className="ri-loader-line text-xs"></i>In Progress
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 whitespace-nowrap flex-shrink-0">
                                          <i className="ri-file-line text-xs"></i>New
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div className="h-full flex">
                                          {prog.passed > 0 && <div className="bg-green-500" style={{ width: `${prog.passed}%` }}></div>}
                                          {prog.failed > 0 && <div className="bg-red-500" style={{ width: `${prog.failed}%` }}></div>}
                                          {prog.blocked > 0 && <div className="bg-orange-500" style={{ width: `${prog.blocked}%` }}></div>}
                                          {prog.retest > 0 && <div className="bg-yellow-500" style={{ width: `${prog.retest}%` }}></div>}
                                        </div>
                                      </div>
                                      <span className="text-sm font-semibold text-gray-700 min-w-[45px] text-right">{completion}%</span>
                                    </div>
                                  </div>
                                  <i className="ri-arrow-right-s-line text-xl text-gray-400 group-hover:text-indigo-600 transition-colors"></i>
                                </Link>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Discovery Logs */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">DISCOVERY LOGS (active)</h3>
                      <div className="flex items-start gap-8">
                        {/* Active sessions donut */}
                        <div className="flex-shrink-0">
                          <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#6366F1"
                                strokeWidth="16"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 56}`}
                                strokeDashoffset={`${2 * Math.PI * 56 * (1 - (sessions.filter(s => s.status === 'active').length / Math.max(sessions.length, 1)))}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-sm font-medium text-gray-500 uppercase">ACTIVE</div>
                              <div className="text-3xl font-bold text-gray-900">{sessions.filter(s => s.status === 'active').length}</div>
                              <div className="text-sm text-gray-500">Logs</div>
                            </div>
                          </div>
                        </div>

                        {/* Session list */}
                        <div className="flex-1 space-y-3">
                          {sessions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No discovery logs yet</div>
                          ) : (
                            sessions.map(session => (
                              <Link
                                key={session.id}
                                to={`/projects/${id}/discovery-logs/${session.id}`}
                                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-all cursor-pointer group"
                              >
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                  <i className="ri-refresh-line text-lg text-gray-600"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{session.name}</div>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <i className={`${
                                        session.actualStatus === 'new' ? 'ri-file-line text-green-500' :
                                        session.actualStatus === 'in_progress' ? 'ri-loader-line text-blue-500' :
                                        session.actualStatus === 'paused' ? 'ri-pause-circle-line text-amber-500' :
                                        'ri-check-line text-purple-500'
                                      }`}></i>
                                      <span className="text-sm text-gray-700">
                                        {session.actualStatus === 'new' ? 'New' :
                                         session.actualStatus === 'in_progress' ? 'In progress' :
                                         session.actualStatus === 'paused' ? 'Paused' :
                                         'Completed'}
                                      </span>
                                    </div>
                                    <div className="flex gap-1">
                                      {session.activityData?.map((color: string, i: number) => (
                                        <div key={i} className="w-2 h-6 rounded-sm" style={{ backgroundColor: color }} title={`Activity ${i + 1}`}></div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <i className="ri-arrow-right-s-line text-xl text-gray-400 group-hover:text-indigo-600 transition-colors"></i>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="space-y-6">
                  {/* About */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">ABOUT</h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className={`${getProjectStatusDisplay(project.status).bgColor} rounded-lg flex items-center justify-center w-10 h-10`}>
                          <i className={`${getProjectStatusDisplay(project.status).icon} ${getProjectStatusDisplay(project.status).iconColor} text-lg`}></i>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{getProjectStatusDisplay(project.status).label}</div>
                          <div className="text-xs text-gray-500">Created {formatDate(project.created_at)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{project.description || 'Our main visual editing product used by customers to build great experiences.'}</p>
                    </div>
                  </div>

                  {/* Members */}
                  <ProjectMembersPanel
                    projectId={id!}
                    onInviteClick={() => setShowInviteModal(true)}
                    refreshTrigger={memberRefreshTrigger}
                  />

                  {/* Integrations */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900">INTEGRATIONS</h2>
                      <Link
                        to="/settings?tab=integrations"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap"
                      >
                        Manage →
                      </Link>
                    </div>
                    {projectIntegrations.length === 0 && !jiraConfigured ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">No integrations configured.</p>
                        <Link to="/settings?tab=integrations" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                          Set up in Settings →
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {jiraConfigured && (
                          <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <i className="ri-jira-line text-blue-600 text-base"></i>
                              <span className="text-sm font-medium text-gray-900">Jira</span>
                              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Connected</span>
                            </div>
                          </div>
                        )}
                        {projectIntegrations.map(integration => {
                          const isSlack = integration.type === 'slack';
                          return (
                            <div key={integration.id} className={`flex items-center justify-between py-2 px-3 ${isSlack ? 'bg-purple-50' : 'bg-blue-50'} rounded-lg`}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <i className={`${isSlack ? 'ri-slack-line text-purple-600' : 'ri-microsoft-line text-blue-600'} text-base flex-shrink-0`}></i>
                                <span className="text-sm font-medium text-gray-900 flex-shrink-0">{isSlack ? 'Slack' : 'Teams'}</span>
                                {integration.channel_name && (
                                  <span className="text-xs text-gray-500 truncate">#{integration.channel_name}</span>
                                )}
                                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${integration.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {integration.is_active ? 'Active' : 'Paused'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">TIMELINE</h2>
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="ri-time-line text-gray-400 text-xl"></i>
                        </div>
                        <p className="text-sm text-gray-500">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentActivity.reduce((acc: any[], event) => {
                          const time = getRelativeTime(event.created_at);
                          const last = acc[acc.length - 1];
                          if (!last || last.time !== time) acc.push({ time, events: [event] });
                          else last.events.push(event);
                          return acc;
                        }, []).map((group, gi) => (
                          <div key={gi} className="flex items-start gap-3">
                            <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                              {gi < recentActivity.length && <div className="w-px flex-1 bg-gray-200 min-h-[8px]"></div>}
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">{group.time}</div>
                              <div className="space-y-2">
                                {group.events.map((event: any, ei: number) => {
                                  const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
                                    'milestone-created': { icon: 'ri-flag-line', bg: 'bg-indigo-100', color: 'text-indigo-600' },
                                    'milestone-completed': { icon: 'ri-flag-fill', bg: 'bg-green-100', color: 'text-green-600' },
                                    'run-created': { icon: 'ri-play-circle-line', bg: 'bg-orange-100', color: 'text-orange-600' },
                                    'run-completed': { icon: 'ri-checkbox-circle-line', bg: 'bg-green-100', color: 'text-green-600' },
                                    'session-created': { icon: 'ri-refresh-line', bg: 'bg-amber-100', color: 'text-amber-600' },
                                    'session-completed': { icon: 'ri-check-double-line', bg: 'bg-green-100', color: 'text-green-600' },
                                    'test_activity-tested': { icon: 'ri-test-tube-line', bg: 'bg-indigo-50', color: 'text-indigo-600' },
                                  };
                                  const key = `${event.type}-${event.action}`;
                                  const info = iconMap[key] || { icon: 'ri-information-line', bg: 'bg-gray-100', color: 'text-gray-600' };
                                  const labelMap: Record<string, string> = {
                                    'milestone-created': 'Milestone created',
                                    'milestone-completed': 'Milestone completed',
                                    'run-created': 'Test run created',
                                    'run-completed': 'Test run completed',
                                    'session-created': 'Session created',
                                    'session-completed': 'Session completed',
                                    'test_activity-tested': 'Test results updated',
                                  };
                                  const label = labelMap[key] || 'Activity';

                                  return (
                                    <div key={ei} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                                      <div className={`w-7 h-7 ${info.bg} rounded-full flex items-center justify-center mt-0.5`}>
                                        <i className={`${info.icon} ${info.color} text-sm`}></i>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 leading-snug"><span className="font-medium text-gray-500 text-xs">{label}</span></p>
                                        <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{event.name}</p>
                                        {/* Meta */}
                                        {event.type === 'run' && event.action === 'created' && event.meta?.testCount > 0 && (
                                          <p className="text-xs text-gray-500 mt-0.5"><i className="ri-file-list-line mr-1"></i>{event.meta.testCount} test cases</p>
                                        )}
                                        {event.type === 'test_activity' && (
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {event.meta?.passed > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium"><i className="ri-check-line text-xs"></i>{event.meta.passed} passed</span>}
                                            {event.meta?.failed > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium"><i className="ri-close-line text-xs"></i>{event.meta.failed} failed</span>}
                                            {event.meta?.blocked > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium"><i className="ri-forbid-line text-xs"></i>{event.meta.blocked} blocked</span>}
                                            {event.meta?.retest > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium"><i className="ri-refresh-line text-xs"></i>{event.meta.retest} retest</span>}
                                          </div>
                                        )}
                                        {event.type === 'milestone' && event.action === 'created' && event.meta?.start_date && (
                                          <p className="text-xs text-gray-500 mt-0.5"><i className="ri-calendar-line mr-1"></i>{formatDate(event.meta.start_date)}{event.meta.end_date ? ` → ${formatDate(event.meta.end_date)}` : ''}</p>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                                        {new Date(event.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
    </>
  );
}
