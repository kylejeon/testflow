import { LogoMark } from '../../components/Logo';
import PageLoader from '../../components/PageLoader';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

interface TestPlanSummary {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  milestone_id: string | null;
  target_date: string | null;
  tc_count?: number;
  run_count?: number;
}
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/feature/NotificationBell';
import { notifyProjectMembers } from '../../hooks/useNotifications';
import { triggerWebhook } from '../../hooks/useWebhooks';
import ProjectHeader from '../../components/ProjectHeader';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { useToast } from '../../components/Toast';

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  parent_milestone_id: string | null;
  assigned_to?: string | null;
  date_mode?: 'auto' | 'manual';
}

interface MilestoneWithProgress extends Milestone {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  actualProgress: number;
  subMilestones?: MilestoneWithProgress[];
  isAggregated?: boolean;
  rollupTotal?: number;
  rollupCompleted?: number;
  rollupPassed?: number;
  rollupFailed?: number;
  rollupPassRate?: number;
  rollupCoverage?: number;
  derivedStatus?: Milestone['status'];
  derivedStartDate?: string | null;
  derivedEndDate?: string | null;
  dateWarnings?: string[];
}

const TIER_INFO = {
  1: { name: 'Free',         color: 'bg-gray-100 text-gray-700 border-gray-300',       icon: 'ri-user-line' },
  2: { name: 'Hobby',        color: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: 'ri-seedling-line' },
  3: { name: 'Starter',      color: 'bg-indigo-50 text-indigo-700 border-indigo-300',  icon: 'ri-vip-crown-line' },
  4: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300',  icon: 'ri-vip-diamond-line' },
  5: { name: 'Enterprise S', color: 'bg-amber-50 text-amber-700 border-amber-300',     icon: 'ri-vip-diamond-line' },
  6: { name: 'Enterprise M', color: 'bg-orange-50 text-orange-700 border-orange-300',  icon: 'ri-vip-diamond-line' },
  7: { name: 'Enterprise L', color: 'bg-rose-50 text-rose-700 border-rose-300',        icon: 'ri-vip-diamond-line' },
};

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', badgeCls: 'bg-green-50 text-green-600', iconBg: '#F0FDF4', iconColor: '#16A34A', icon: 'ri-checkbox-circle-fill' };
    case 'past_due':
      return { label: 'Overdue', badgeCls: 'bg-rose-50 text-rose-600', iconBg: '#FEF2F2', iconColor: '#EF4444', icon: 'ri-flag-fill' };
    case 'started':
      return { label: 'In Progress', badgeCls: 'bg-blue-100 text-blue-600', iconBg: '#EEF2FF', iconColor: '#6366F1', icon: 'ri-flag-fill' };
    default:
      return { label: 'Upcoming', badgeCls: 'bg-blue-100 text-blue-600', iconBg: '#EEF2FF', iconColor: '#6366F1', icon: 'ri-flag-fill' };
  }
};

export default function ProjectMilestones() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<MilestoneWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in-progress' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithProgress | null>(null);
  const [parentMilestoneId, setParentMilestoneId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [editFormData, setEditFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: '' as Milestone['status']
  });
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; subscription_tier: number; avatar_emoji: string } | null>(null);
  const [milestoneRunAssignees, setMilestoneRunAssignees] = useState<Map<string, string[]>>(new Map());
  const [milestoneAssigneeProfiles, setMilestoneAssigneeProfiles] = useState<Map<string, { name: string | null; email: string; url: string | null }>>(new Map());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [testPlans, setTestPlans] = useState<TestPlanSummary[]>([]);
  const [adHocRuns, setAdHocRuns] = useState<any[]>([]);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [createPlanMilestoneId, setCreatePlanMilestoneId] = useState<string | null>(null);
  const [planFormData, setPlanFormData] = useState({ name: '', priority: 'medium', target_date: '' });
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      fetchData();
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();

        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: profile?.email || user.email || '',
          subscription_tier: profile?.subscription_tier || 1,
          avatar_emoji: profile?.avatar_emoji || '',
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('start_date', { ascending: true });

      if (milestonesError) throw milestonesError;

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

      const milestonesWithProgress = (milestonesData || []).map((milestone) => {
        let currentStatus = milestone.status;

        if (milestone.start_date && milestone.status === 'upcoming') {
          const [sy, sm, sd] = milestone.start_date.split('T')[0].split('-');
          const startDate = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (startDate <= today) {
            currentStatus = 'started';
            supabase.from('milestones').update({ status: 'started' }).eq('id', milestone.id);
          }
        }

        if (milestone.end_date && currentStatus !== 'completed') {
          const [year, month, day] = milestone.end_date.split('T')[0].split('-');
          const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (endDate < today) {
            currentStatus = 'past_due';
            supabase.from('milestones').update({ status: 'past_due' }).eq('id', milestone.id);
          } else if (currentStatus === 'past_due') {
            // end_date가 미래로 변경됐으면 past_due 해제 → started로 복구
            currentStatus = 'started';
            supabase.from('milestones').update({ status: 'started' }).eq('id', milestone.id);
          }
          // Webhook for milestone_past_due is now handled by the server-side scheduler
          // (check-milestone-past-due Edge Function) — no client-side webhook needed
        }

        const milestoneRuns = allRunsData?.filter(run => run.milestone_id === milestone.id) || [];

        if (milestoneRuns.length === 0) {
          return { ...milestone, status: currentStatus, totalTests: 0, completedTests: 0, passedTests: 0, failedTests: 0, actualProgress: 0 };
        }

        let totalTestsSum = 0;
        let completedTestsSum = 0;
        let passedTestsSum = 0;
        let failedTestsSum = 0;

        milestoneRuns.forEach(run => {
          const runResults = allTestResultsData?.filter(r => r.run_id === run.id) || [];
          const statusMap = new Map<string, string>();
          runResults.forEach(result => {
            if (!statusMap.has(result.test_case_id)) statusMap.set(result.test_case_id, result.status);
          });
          const totalTests = run.test_case_ids.length;
          totalTestsSum += totalTests;
          if (totalTests === 0) return;
          run.test_case_ids.forEach((tcId: string) => {
            const status = statusMap.get(tcId);
            if (status === 'passed') {
              passedTestsSum++;
              completedTestsSum++;
            } else if (status === 'failed' || status === 'blocked' || status === 'retest') {
              failedTestsSum++;
              completedTestsSum++;
            }
          });
        });

        const averageProgress = totalTestsSum > 0 ? Math.round((completedTestsSum / totalTestsSum) * 100) : 0;
        return { ...milestone, status: currentStatus, totalTests: totalTestsSum, completedTests: completedTestsSum, passedTests: passedTestsSum, failedTests: failedTestsSum, actualProgress: averageProgress };
      });

      const allResultsByRun = new Map<string, any[]>();
      (allTestResultsData || []).forEach((r: any) => {
        if (!allResultsByRun.has(r.run_id)) allResultsByRun.set(r.run_id, []);
        allResultsByRun.get(r.run_id)!.push(r);
      });

      const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
      const organizedMilestones = parentMilestones.map(parent => {
        const subs = milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id);

        if (subs.length === 0) {
          return { ...parent, isAggregated: false, subMilestones: [] };
        }

        // Roll-up: sub + parent 직속 runs 합산
        const allSources = [parent, ...subs];
        let rollupTotal = 0, rollupCompleted = 0, rollupPassed = 0, rollupFailed = 0, rollupBlocked = 0;

        allSources.forEach(source => {
          const sourceRuns = (allRunsData || []).filter(r => r.milestone_id === source.id);
          sourceRuns.forEach(run => {
            const results = allResultsByRun.get(run.id) || [];
            const statusMap = new Map<string, string>();
            results.forEach((r: any) => {
              if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
            });
            const tcIds: string[] = run.test_case_ids || [];
            rollupTotal += tcIds.length;
            tcIds.forEach(tcId => {
              const s = statusMap.get(tcId);
              if (s === 'passed')       { rollupCompleted++; rollupPassed++; }
              else if (s === 'failed')  { rollupCompleted++; rollupFailed++; }
              else if (s === 'blocked') { rollupCompleted++; rollupBlocked++; }
              else if (s === 'retest')  { rollupCompleted++; }
            });
          });
        });

        const rollupProgress = rollupTotal > 0 ? Math.round((rollupCompleted / rollupTotal) * 100) : 0;
        const rollupPassRate = rollupCompleted > 0 ? Math.round((rollupPassed / rollupCompleted) * 1000) / 10 : 0;
        const rollupCoverage = rollupTotal > 0 ? Math.round((rollupCompleted / rollupTotal) * 1000) / 10 : 0;

        // Status 자동 결정
        const subStatuses = subs.map(s => s.status);
        let derivedStatus: Milestone['status'];
        if (subStatuses.every(s => s === 'completed')) derivedStatus = 'completed';
        else if (subStatuses.some(s => s === 'past_due')) derivedStatus = 'past_due';
        else if (subStatuses.some(s => s === 'started')) derivedStatus = 'started';
        else derivedStatus = 'upcoming';

        // 기간 자동 계산
        const subStarts = subs.map(s => s.start_date).filter(Boolean).map(d => new Date(d!).getTime());
        const subEnds = subs.map(s => s.end_date).filter(Boolean).map(d => new Date(d!).getTime());
        const derivedStartDate = subStarts.length > 0 ? new Date(Math.min(...subStarts)).toISOString() : parent.start_date;
        const derivedEndDate = subEnds.length > 0 ? new Date(Math.max(...subEnds)).toISOString() : parent.end_date;

        // 기간 벗어남 경고 (manual 모드일 때만)
        const dateWarnings: string[] = [];
        if (parent.date_mode === 'manual' && parent.start_date && parent.end_date) {
          const pStart = new Date(parent.start_date).getTime();
          const pEnd = new Date(parent.end_date).getTime();
          subs.forEach(sub => {
            if (sub.start_date && new Date(sub.start_date).getTime() < pStart)
              dateWarnings.push(`"${sub.name}" 시작일이 parent 범위 이전`);
            if (sub.end_date && new Date(sub.end_date).getTime() > pEnd)
              dateWarnings.push(`"${sub.name}" 종료일이 parent 범위 이후`);
          });
        }

        const displayStart = parent.date_mode === 'manual' ? parent.start_date : derivedStartDate;
        const displayEnd = parent.date_mode === 'manual' ? parent.end_date : derivedEndDate;

        return {
          ...parent,
          status: derivedStatus,
          start_date: displayStart,
          end_date: displayEnd,
          actualProgress: rollupProgress,
          totalTests: rollupTotal,
          completedTests: rollupCompleted,
          passedTests: rollupPassed,
          failedTests: rollupFailed,
          isAggregated: true,
          rollupTotal,
          rollupCompleted,
          rollupPassed,
          rollupFailed,
          rollupBlocked,
          rollupPassRate,
          rollupCoverage,
          derivedStatus,
          derivedStartDate,
          derivedEndDate,
          dateWarnings,
          subMilestones: subs,
        };
      });

      const initialExpanded = new Set<string>();
      organizedMilestones.forEach(milestone => {
        if (milestone.subMilestones && milestone.subMilestones.length > 0) initialExpanded.add(milestone.id);
      });
      setExpandedMilestones(initialExpanded);
      setMilestones(organizedMilestones);
      setAdHocRuns((allRunsData || []).filter((r: any) => !r.milestone_id));

      // Build milestone_id → assignee UUIDs map from run data (no DB schema change needed)
      const milestoneAssigneeMap = new Map<string, Set<string>>();
      (allRunsData || []).forEach(run => {
        if (run.milestone_id && run.assignees?.length > 0) {
          if (!milestoneAssigneeMap.has(run.milestone_id)) milestoneAssigneeMap.set(run.milestone_id, new Set());
          run.assignees.forEach((uid: string) => milestoneAssigneeMap.get(run.milestone_id)!.add(uid));
        }
      });
      setMilestoneRunAssignees(new Map(Array.from(milestoneAssigneeMap.entries()).map(([k, v]) => [k, Array.from(v)])));

      // Fetch profiles for all unique run assignee UUIDs (same pattern as project-runs page)
      const allRunAssigneeIds = new Set<string>();
      milestoneAssigneeMap.forEach(uids => uids.forEach(uid => allRunAssigneeIds.add(uid)));
      if (allRunAssigneeIds.size > 0) {
        const { data: apData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', Array.from(allRunAssigneeIds));
        const apMap = new Map<string, { name: string | null; email: string; url: string | null }>();
        (apData || []).forEach((p: any) => apMap.set(p.id, { name: p.full_name || null, email: p.email || '', url: p.avatar_url || null }));
        setMilestoneAssigneeProfiles(apMap);
      }
      // Load test plans (non-blocking, graceful fallback if table not yet created)
      supabase.from('test_plans').select('id, name, status, priority, milestone_id, target_date').eq('project_id', id)
        .order('created_at', { ascending: false }).limit(20)
        .then(({ data: plansData }) => { if (plansData) setTestPlans(plansData); })
        .catch(() => {});

    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (data: any) => {
    try {
      // 3레벨 중첩 방지: 선택된 parent가 이미 sub인 경우 차단
      if (parentMilestoneId) {
        const selectedParent = milestones.find(m => m.id === parentMilestoneId) ||
          milestones.flatMap(m => m.subMilestones || []).find(m => m.id === parentMilestoneId);
        if (selectedParent && selectedParent.parent_milestone_id !== null) {
          showToast('Cannot create a sub milestone under another sub milestone (max 2 levels).', 'warning');
          return;
        }
      }
      const { error } = await supabase.from('milestones').insert([{ project_id: id, status: 'upcoming', progress: 0, parent_milestone_id: parentMilestoneId, ...data }]);
      if (error) throw error;
      setShowCreateModal(false);
      setParentMilestoneId(null);
      showToast('Milestone created successfully.', 'success');
      fetchData();
    } catch (error) {
      console.error('마일스톤 생성 오류:', error);
      showToast('Failed to create milestone. Please try again.', 'error');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, data: any) => {
    try {
      const { error } = await supabase.from('milestones').update(data).eq('id', milestoneId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('마일스톤 수정 오류:', error);
      showToast('Failed to update milestone. Please try again.', 'error');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    setConfirmDeleteId(milestoneId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const { error } = await supabase.from('milestones').delete().eq('id', confirmDeleteId);
      if (error) throw error;
      setConfirmDeleteId(null);
      setEditingMilestone(null);
      showToast('Milestone deleted.', 'success');
      fetchData();
    } catch (error) {
      console.error('마일스톤 삭제 오류:', error);
      setConfirmDeleteId(null);
      showToast('Failed to delete milestone. Please try again.', 'error');
    }
  };

  const handleStartMilestone = async (milestoneId: string) => {
    await handleUpdateMilestone(milestoneId, { status: 'started' });
    try {
      const milestone = milestones.find(m => m.id === milestoneId || m.subMilestones?.find((s: any) => s.id === milestoneId));
      const milestoneName = milestone?.id === milestoneId ? milestone?.name : milestone?.subMilestones?.find((s: any) => s.id === milestoneId)?.name || 'Milestone';
      const { data: { user } } = await supabase.auth.getUser();
      const { data: projectData } = await supabase.from('projects').select('name').eq('id', id!).maybeSingle();
      await notifyProjectMembers({
        projectId: id!,
        excludeUserId: user?.id,
        type: 'milestone_started',
        title: 'Milestone started',
        message: `"${milestoneName}" milestone has been started.`,
        link: `/projects/${id}/milestones`,
      });
      triggerWebhook(id!, 'milestone_started', {
        project_id: id!,
        project_name: projectData?.name ?? '',
        milestone_id: milestoneId,
        milestone_name: milestoneName,
      });
    } catch (err) {
      console.warn('milestone_started webhook/notification error:', err);
    }
  };

  const handleMarkAsComplete = async (milestoneId: string) => {
    await handleUpdateMilestone(milestoneId, { status: 'completed' });
    try {
      const milestone = milestones.find(m => m.id === milestoneId || m.subMilestones?.find((s: any) => s.id === milestoneId));
      const milestoneName = milestone?.id === milestoneId ? milestone?.name : milestone?.subMilestones?.find((s: any) => s.id === milestoneId)?.name || 'Milestone';
      const { data: { user } } = await supabase.auth.getUser();
      const { data: projectData } = await supabase.from('projects').select('name').eq('id', id!).maybeSingle();
      await notifyProjectMembers({ projectId: id!, excludeUserId: user?.id, type: 'milestone_completed', title: 'Milestone completed', message: `"${milestoneName}" milestone has been completed.`, link: `/projects/${id}/milestones` });
      triggerWebhook(id!, 'milestone_completed', {
        project_id: id!,
        project_name: projectData?.name ?? '',
        milestone_id: milestoneId,
        milestone_name: milestoneName,
      });
    } catch (err) {
      console.error('Milestone completion notification error:', err);
    }
  };

  const toggleExpanded = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) newExpanded.delete(milestoneId);
    else newExpanded.add(milestoneId);
    setExpandedMilestones(newExpanded);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('test_plans').insert([{
        project_id: id,
        milestone_id: createPlanMilestoneId || null,
        name: planFormData.name,
        priority: planFormData.priority,
        target_date: planFormData.target_date || null,
        status: 'planning',
        owner_id: user?.id || null,
      }]).select().single();
      if (error) throw error;
      const milestoneId = createPlanMilestoneId;
      setShowCreatePlanModal(false);
      setCreatePlanMilestoneId(null);
      setPlanFormData({ name: '', priority: 'medium', target_date: '' });
      showToast('Test plan created.', 'success');
      fetchData();
      if (data?.id && milestoneId) {
        navigate(`/projects/${id}/milestones/${milestoneId}/plans/${data.id}`);
      }
    } catch (err) {
      console.error('Create plan error:', err);
      showToast('Failed to create plan. Make sure the test_plans table exists.', 'error');
    }
  };

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    const fmt = (d: string | null) => {
      if (!d) return '';
      const [y, m, day] = d.split('T')[0].split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
    if (endDate) return `Due ${fmt(endDate)}`;
    return 'No date set';
  };

  const filteredMilestones = milestones
    .filter(m =>
      activeTab === 'all' ? true :
      activeTab === 'in-progress' ? (m.status !== 'completed' && m.status !== 'past_due') :
      activeTab === 'completed' ? m.status === 'completed' :
      activeTab === 'overdue' ? m.status === 'past_due' :
      true
    )
    .filter(m =>
      searchQuery.trim() === '' ? true :
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

  const ProfileAvatar = () => (
    <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
      {userProfile?.avatar_emoji ? (
        <span className="text-xl leading-none">{userProfile.avatar_emoji}</span>
      ) : (
        <span>{userProfile?.full_name?.charAt(0) || 'U'}</span>
      )}
    </div>
  );

  const ProfileMenu = () => (
    <>
      {showProfileMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
          <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500">{userProfile?.email}</p>
              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded border ${tierInfo.color}`}>
                <i className={`${tierInfo.icon} text-sm`}></i>{tierInfo.name}
              </div>
            </div>
            <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100">
              <i className="ri-settings-3-line text-lg w-5 h-5 flex items-center justify-center"></i><span>Settings</span>
            </Link>
            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer">
              <i className="ri-logout-box-line text-lg"></i><span>Log out</span>
            </button>
          </div>
        </>
      )}
    </>
  );

  /* ── Compact card renderers ── */
  const renderPlanRow = (plan: TestPlanSummary, milestoneId: string) => {
    const statusCls: Record<string, string> = {
      planning:  'bg-slate-100 text-slate-600',
      active:    'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-rose-100 text-rose-600',
    };
    const priorityIcon: Record<string, string> = {
      critical: 'text-rose-500',
      high:     'text-orange-500',
      medium:   'text-amber-500',
      low:      'text-slate-300',
    };
    const isOverdue = plan.target_date && new Date(plan.target_date) < new Date() && plan.status !== 'completed';

    return (
      <div key={plan.id} className="relative mb-1.5 last:mb-0">
        {/* horizontal branch */}
        <div className="absolute left-[-0.625rem] top-1/2 w-[0.625rem] h-[1.5px] bg-slate-200" />
        <div
          className="bg-indigo-50/60 border border-indigo-100 rounded-md px-[0.8125rem] py-[0.5625rem] hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer"
          onClick={() => navigate(`/projects/${id}/milestones/${milestoneId}/plans/${plan.id}`)}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
              <i className="ri-file-list-3-line text-[0.75rem] text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[0.8125rem] font-semibold text-slate-900 truncate">
                {plan.name}
              </span>
              {plan.target_date && (
                <div className={`text-[0.6875rem] mt-[0.0625rem] flex items-center gap-1 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                  <i className={`${isOverdue ? 'ri-calendar-close-line' : 'ri-calendar-event-line'}`} style={{ fontSize: '0.5625rem', verticalAlign: '-1px' }} />
                  {isOverdue ? 'Overdue' : 'Due'} {new Date(plan.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
            {plan.priority !== 'medium' && (
              <i className={`ri-flag-fill text-[0.75rem] flex-shrink-0 ${priorityIcon[plan.priority] || ''}`} title={plan.priority} />
            )}
            <span className={`text-[0.625rem] font-semibold px-[0.4375rem] py-[0.125rem] rounded-full flex-shrink-0 ${statusCls[plan.status] || statusCls.planning}`}>
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </span>
            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => navigate(`/projects/${id}/milestones/${milestoneId}/plans/${plan.id}`)}
                className="flex items-center gap-[0.1875rem] text-[0.625rem] font-medium px-[0.375rem] py-[0.1875rem] rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-eye-line text-[0.75rem]" />View
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubMilestone = (sub: MilestoneWithProgress) => {
    const info = getStatusInfo(sub.status);
    const remaining = sub.totalTests - sub.passedTests - sub.failedTests;
    const passedPct = sub.totalTests > 0 ? (sub.passedTests / sub.totalTests) * 100 : 0;
    const failedPct = sub.totalTests > 0 ? (sub.failedTests / sub.totalTests) * 100 : 0;

    return (
      <div
        key={sub.id}
        className="relative mb-1.5 last:mb-0"
      >
        {/* horizontal branch */}
        <div className="absolute left-[-0.625rem] top-1/2 w-[0.625rem] h-[1.5px] bg-slate-200" />
        <div className="bg-violet-50 border border-indigo-50 rounded-md px-[0.8125rem] py-[0.6875rem] hover:border-indigo-200 hover:bg-violet-50 transition-all cursor-pointer">
          {/* sub top row */}
          <div className="flex items-center gap-2 mb-[0.375rem]">
            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: info.iconBg }}>
              <i className={`${info.icon} text-[0.75rem]`} style={{ color: info.iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to={`/projects/${id}/milestones/${sub.id}`}
                onClick={e => e.stopPropagation()}
                className="block text-[0.8125rem] font-semibold text-slate-900 truncate hover:text-indigo-600 transition-colors"
              >
                {sub.name}
              </Link>
              <div className="text-[0.6875rem] text-slate-400 mt-[0.0625rem] flex items-center gap-1">
                <i className="ri-calendar-line" style={{ fontSize: '0.5625rem', verticalAlign: '-1px' }} />
                {formatDateRange(sub.start_date, sub.end_date)}
              </div>
            </div>
            <span className={`text-[0.625rem] font-semibold px-[0.4375rem] py-[0.125rem] rounded-full flex-shrink-0 ${info.badgeCls}`}>
              {info.label}
            </span>
            {/* Sub action button */}
            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => {
                  setEditFormData({ name: sub.name, start_date: sub.start_date ? sub.start_date.split('T')[0] : '', end_date: sub.end_date ? sub.end_date.split('T')[0] : '', status: sub.status });
                  setEditingMilestone(sub);
                }}
                className="flex items-center gap-[0.1875rem] text-[0.625rem] font-medium px-[0.375rem] py-[0.1875rem] rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-edit-line text-[0.75rem]" />Edit
              </button>
            </div>
          </div>
          {/* sub progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[4.5px] bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${passedPct}%` }} />
              <div className="h-full bg-rose-500 transition-all" style={{ width: `${failedPct}%` }} />
            </div>
            <div className="flex items-center gap-2 text-[0.6875rem] text-slate-500 whitespace-nowrap flex-shrink-0">
              <span className="font-semibold text-slate-600">{sub.actualProgress}%</span>
              <span className="text-emerald-500 font-semibold">{sub.passedTests} passed</span>
              <span className="text-rose-500 font-semibold">{sub.failedTests} failed</span>
              {sub.totalTests > 0 && <span>{remaining} remaining</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMilestone = (milestone: MilestoneWithProgress) => {
    const info = getStatusInfo(milestone.status);
    const hasSubMilestones = milestone.subMilestones && milestone.subMilestones.length > 0;
    const milestonePlans = testPlans.filter(p => p.milestone_id === milestone.id);
    const isExpanded = expandedMilestones.has(milestone.id);
    const remaining = milestone.totalTests - milestone.passedTests - milestone.failedTests;
    const passedPct = milestone.totalTests > 0 ? (milestone.passedTests / milestone.totalTests) * 100 : 0;
    const failedPct = milestone.totalTests > 0 ? (milestone.failedTests / milestone.totalTests) * 100 : 0;
    const isDone = milestone.status === 'completed';

    return (
      <div key={milestone.id} className="ms-wrapper">
        {/* Parent card */}
        <div
          className={`bg-white border rounded-lg px-[1.125rem] py-[0.9375rem] transition-all cursor-pointer ${
            isDone
              ? 'border-slate-200 opacity-70 hover:opacity-85'
              : isExpanded
              ? 'border-indigo-200 shadow-[0_1px_6px_rgba(99,102,241,0.1)]'
              : 'border-slate-200 hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-indigo-200'
          }`}
          onClick={() => {
            if (hasSubMilestones || milestonePlans.length > 0) toggleExpanded(milestone.id);
            else navigate(`/projects/${id}/milestones/${milestone.id}`);
          }}
        >
          {/* Top row */}
          <div className="flex items-center gap-[0.625rem] mb-[0.5625rem]">
            {/* expand chevron */}
            {(hasSubMilestones || milestonePlans.length > 0) ? (
              <button
                onClick={e => { e.stopPropagation(); toggleExpanded(milestone.id); }}
                className={`w-[1.75rem] h-[1.75rem] rounded flex items-center justify-center flex-shrink-0 text-lg transition-all hover:bg-slate-100 ${isExpanded ? 'text-indigo-500 rotate-90 bg-indigo-50' : 'text-slate-400'}`}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            ) : null}

            {/* icon */}
            <div className="w-9 h-9 rounded-[0.4375rem] flex items-center justify-center flex-shrink-0" style={{ background: info.iconBg }}>
              <i className={`${info.icon} text-[1.125rem]`} style={{ color: info.iconColor }} />
            </div>

            {/* name + date */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/projects/${id}/milestones/${milestone.id}`}
                onClick={e => e.stopPropagation()}
                className={`block text-[0.875rem] font-semibold truncate hover:text-indigo-600 transition-colors ${isDone ? 'text-slate-500' : 'text-slate-900'}`}
              >
                {milestone.name}
              </Link>
              <div className="text-[0.75rem] text-slate-400 mt-[0.0625rem] flex items-center gap-1">
                <i className="ri-calendar-line" style={{ fontSize: '0.625rem', verticalAlign: '-1px' }} />
                {formatDateRange(milestone.start_date, milestone.end_date)}
                {milestone.isAggregated && (
                  <span className="text-[0.5625rem] font-medium text-indigo-400 ml-1">
                    ({milestone.date_mode === 'manual' ? '✏️ manual' : '🔄 auto'})
                  </span>
                )}
                {(milestone.dateWarnings?.length ?? 0) > 0 && (
                  <span className="text-[0.5625rem] text-amber-500 ml-1" title={milestone.dateWarnings!.join('\n')}>
                    ⚠️ {milestone.dateWarnings!.length} warning{milestone.dateWarnings!.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* sub count */}
            {hasSubMilestones && (
              <span className="text-[0.6875rem] font-semibold text-indigo-500 flex items-center gap-[0.1875rem] flex-shrink-0">
                <i className="ri-git-branch-line text-[0.8125rem]" />
                {milestone.subMilestones!.length} subs
              </span>
            )}
            {/* plan count */}
            {milestonePlans.length > 0 && (
              <span className="text-[0.6875rem] font-semibold text-indigo-400 flex items-center gap-[0.1875rem] flex-shrink-0">
                <i className="ri-file-list-3-line text-[0.8125rem]" />
                {milestonePlans.length} plan{milestonePlans.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Roll-up badge */}
            {milestone.isAggregated && (
              <span
                className="inline-flex items-center gap-1 text-[0.625rem] font-semibold text-indigo-500 bg-indigo-50 px-[0.4375rem] py-[0.125rem] rounded-full flex-shrink-0"
                title="Sub milestone 데이터 자동 집계"
              >
                <i className="ri-loop-left-line text-[0.6875rem]" />
                Roll-up
              </span>
            )}

            {/* status badge */}
            <span className={`text-[0.6875rem] font-semibold px-2 py-[0.1875rem] rounded-full flex-shrink-0 ${info.badgeCls}`}>
              {info.label}
            </span>

            {/* action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { setCreatePlanMilestoneId(milestone.id); setShowCreatePlanModal(true); }}
                className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-file-list-3-line text-[0.8125rem]" />+Plan
              </button>
              <button
                onClick={() => { setParentMilestoneId(milestone.id); setShowCreateModal(true); }}
                className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-git-branch-line text-[0.8125rem]" />+Sub
              </button>
              <button
                onClick={() => { setEditFormData({ name: milestone.name, start_date: milestone.start_date ? milestone.start_date.split('T')[0] : '', end_date: milestone.end_date ? milestone.end_date.split('T')[0] : '', status: milestone.status }); setEditingMilestone(milestone); }}
                className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-edit-line text-[0.8125rem]" />Edit
              </button>
              {!milestone.isAggregated && milestone.status === 'upcoming' && (
                <button
                  onClick={() => handleStartMilestone(milestone.id)}
                  className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
                >
                  Start
                </button>
              )}
              {!milestone.isAggregated && (milestone.status === 'started' || milestone.status === 'past_due') && (
                <button
                  onClick={() => handleMarkAsComplete(milestone.id)}
                  className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-green-300 bg-white text-green-600 hover:bg-green-50 transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-check-line text-[0.8125rem]" />Complete
                </button>
              )}
              {isDone && (
                <Link
                  to={`/projects/${id}/milestones/${milestone.id}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-eye-line text-[0.8125rem]" />View
                </Link>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-[0.4375rem]">
            <div className="h-[6px] bg-slate-100 rounded-full overflow-hidden flex mb-[0.3125rem]">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${passedPct}%` }} />
              <div className="h-full bg-rose-500 transition-all" style={{ width: `${failedPct}%` }} />
            </div>
            <div className="flex justify-between text-[0.75rem]">
              <span className="font-semibold text-slate-900">{milestone.actualProgress}% complete</span>
              <span className="text-slate-400">{milestone.completedTests} / {milestone.totalTests} cases</span>
            </div>
          </div>

          {/* Bottom: counts */}
          <div className="flex items-center gap-3 text-[0.75rem]">
            <span className="flex items-center gap-[0.1875rem]">
              <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-slate-500">{milestone.passedTests} passed</span>
            </span>
            <span className="flex items-center gap-[0.1875rem]">
              <span className="w-[6px] h-[6px] rounded-full bg-rose-500 flex-shrink-0" />
              <span className="text-slate-500">{milestone.failedTests} failed</span>
            </span>
            <span className="flex items-center gap-[0.1875rem]">
              <span className="w-[6px] h-[6px] rounded-full bg-slate-400 flex-shrink-0" />
              <span className="text-slate-500">{remaining} remaining</span>
            </span>
            {milestone.isAggregated && milestone.rollupPassRate !== undefined && milestone.rollupPassRate > 0 && (
              <span className="flex items-center gap-[0.1875rem] ml-2 pl-2 border-l border-slate-200">
                <span className="text-indigo-500 font-semibold">{milestone.rollupPassRate}% pass rate</span>
              </span>
            )}
          </div>
        </div>

        {/* Sub-milestones and Plans */}
        {(hasSubMilestones || milestonePlans.length > 0) && isExpanded && (
          <div className="mt-1.5 pl-[1.125rem] relative">
            {/* vertical connector line */}
            <div className="absolute left-2 top-0 bottom-3 w-[1.5px] bg-slate-200 rounded" />
            {milestone.subMilestones?.map(sub => renderSubMilestone(sub))}
            {milestonePlans.map(plan => renderPlanRow(plan, milestone.id))}
            {/* + New Plan row */}
            <div className="relative mb-0">
              <div className="absolute left-[-0.625rem] top-1/2 w-[0.625rem] h-[1.5px] bg-slate-200" />
              <button
                onClick={e => { e.stopPropagation(); setCreatePlanMilestoneId(milestone.id); setShowCreatePlanModal(true); }}
                className="w-full text-left bg-white border border-dashed border-slate-200 rounded-md px-[0.8125rem] py-[0.4375rem] text-[0.75rem] text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <i className="ri-add-line text-sm" />New Plan
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <PageLoader fullScreen />;

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />

        {/* Edge-to-edge subtab row */}
        <div className="flex items-center border-b border-slate-200 bg-white flex-shrink-0 h-[2.625rem] px-5">
          {[
            { key: 'all',         label: 'All',         icon: 'ri-list-check-3',         iconColor: '#6366F1', count: milestones.length },
            { key: 'in-progress', label: 'In Progress', icon: 'ri-loader-4-fill',        iconColor: '#3B82F6', count: milestones.filter(m => m.status !== 'completed' && m.status !== 'past_due').length },
            { key: 'completed',   label: 'Completed',   icon: 'ri-checkbox-circle-fill', iconColor: '#22C55E', count: milestones.filter(m => m.status === 'completed').length },
            { key: 'overdue',     label: 'Overdue',     icon: 'ri-error-warning-fill',   iconColor: '#EF4444', count: milestones.filter(m => m.status === 'past_due').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-[0.3125rem] h-full px-[0.875rem] text-[0.8125rem] font-medium relative border-b-[2.5px] transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-indigo-500 border-indigo-500'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <i className={`${tab.icon} text-[0.875rem]`} style={{ color: tab.iconColor }} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold ${
                activeTab === tab.key ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-500'
              }`}>{tab.count}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => { setParentMilestoneId(null); setShowCreateModal(true); }}
            className="flex items-center gap-1 px-[0.75rem] py-[0.3125rem] bg-indigo-500 text-white rounded-[0.375rem] text-[0.75rem] font-semibold hover:bg-indigo-600 transition-colors cursor-pointer whitespace-nowrap shadow-[0_1px_3px_rgba(99,102,241,0.3)]"
          >
            <i className="ri-add-line text-sm" />
            New Milestone
          </button>
        </div>

        {/* Search + Filter + Sort toolbar */}
        <div className="flex items-center gap-2 px-6 py-[0.625rem] bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex-1 flex items-center gap-[0.375rem] bg-slate-50 border border-slate-200 rounded-md px-[0.625rem] py-[0.375rem] focus-within:border-indigo-200 focus-within:bg-white transition-colors">
            <i className="ri-search-line text-[0.875rem] text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search milestones..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-none bg-transparent outline-none text-[0.8125rem] text-slate-800 placeholder-slate-400 flex-1 min-w-0 font-[inherit]"
            />
          </div>
          <button className="flex items-center gap-1 text-[0.75rem] font-medium px-[0.625rem] py-[0.375rem] rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-filter-3-line text-[0.875rem] text-slate-400" />Filters
          </button>
          <button className="flex items-center gap-1 text-[0.75rem] font-medium px-[0.625rem] py-[0.375rem] rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-sort-desc text-[0.875rem] text-slate-400" />Sort
          </button>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-5">
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-flag-line text-5xl text-slate-300 block mb-3"></i>
                <p className="text-[0.875rem] font-semibold text-slate-500 mb-1">No {activeTab === 'all' ? '' : activeTab + ' '}milestones</p>
                <p className="text-[0.75rem] text-slate-400">
                  {searchQuery ? 'No milestones match your search' : 'Create your first milestone to get started'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[0.625rem]">
                {filteredMilestones.map(milestone => renderMilestone(milestone))}
              </div>
            )}

            {/* ── Ad-hoc Runs section ────────────────────────── */}
            {activeTab === 'all' && adHocRuns.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-play-circle-line text-slate-400 text-[0.9375rem]" />
                  <h2 className="text-[0.875rem] font-semibold text-slate-600">Ad-hoc Runs</h2>
                  <span className="text-[0.6875rem] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">{adHocRuns.length}</span>
                  <span className="text-[0.6875rem] text-slate-400">· Not linked to a milestone</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {adHocRuns.slice(0, 8).map((run: any) => {
                    const totalTcs = run.test_case_ids?.length || 0;
                    const passed = run.passed || 0;
                    const failed = run.failed || 0;
                    const passedPct = totalTcs > 0 ? (passed / totalTcs) * 100 : 0;
                    const failedPct = totalTcs > 0 ? (failed / totalTcs) * 100 : 0;
                    return (
                      <Link
                        key={run.id}
                        to={`/projects/${id}/runs/${run.id}`}
                        className="bg-white border border-slate-200 rounded-md px-[0.8125rem] py-[0.5625rem] hover:border-indigo-200 hover:shadow-sm transition-all flex items-center gap-3 no-underline"
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#F8FAFC' }}>
                          <i className="ri-play-circle-line text-[0.75rem] text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[0.8125rem] font-medium text-slate-800 truncate block">{run.name}</span>
                          <div className="flex items-center gap-2 mt-[0.1875rem]">
                            <div className="flex-1 h-[3px] bg-slate-100 rounded-full overflow-hidden flex" style={{ maxWidth: '6rem' }}>
                              <div className="h-full bg-emerald-500" style={{ width: `${passedPct}%` }} />
                              <div className="h-full bg-rose-500" style={{ width: `${failedPct}%` }} />
                            </div>
                            <span className="text-[0.6875rem] text-slate-400">{totalTcs} cases</span>
                          </div>
                        </div>
                        <span className="text-[0.6875rem] text-slate-400 flex-shrink-0">
                          {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </Link>
                    );
                  })}
                  {adHocRuns.length > 8 && (
                    <Link
                      to={`/projects/${id}/runs`}
                      className="text-center py-2 text-[0.8125rem] text-indigo-500 hover:text-indigo-700 font-medium no-underline"
                    >
                      View all {adHocRuns.length} ad-hoc runs →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{parentMilestoneId ? 'Create Sub Milestone' : 'Create New Milestone'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleCreateMilestone({ name: formData.get('name'), start_date: formData.get('start_date'), end_date: formData.get('end_date') }); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" name="start_date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" name="end_date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button type="button" onClick={() => { setShowCreateModal(false); setParentMilestoneId(null); }} className="flex-1 px-[0.875rem] py-[0.4375rem] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer whitespace-nowrap">Cancel</button>
                <button type="submit" className="flex-1 px-[0.875rem] py-[0.4375rem] text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-delete-bin-line text-red-600 text-lg" />
              </div>
              <div>
                <p className="text-[0.9375rem] font-semibold text-gray-900">Delete milestone?</p>
                <p className="text-[0.8125rem] text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 text-[0.8125rem] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-[0.8125rem] font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <i className="ri-file-list-3-line text-indigo-500 text-[1.0625rem]" />
              </div>
              <div>
                <h2 className="text-[1rem] font-bold text-gray-900">New Test Plan</h2>
                {createPlanMilestoneId && (
                  <p className="text-[0.75rem] text-slate-500 mt-0.5">
                    Under: <span className="font-medium text-slate-700">
                      {milestones.find(m => m.id === createPlanMilestoneId)?.name ||
                       milestones.flatMap(m => m.subMilestones || []).find(m => m.id === createPlanMilestoneId)?.name}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <form onSubmit={handleCreatePlan}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Plan Name <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={planFormData.name}
                    onChange={e => setPlanFormData(f => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.875rem]"
                    placeholder="e.g. Login Flow Regression"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={planFormData.priority}
                      onChange={e => setPlanFormData(f => ({ ...f, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-[0.875rem]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Target Date</label>
                    <input
                      type="date"
                      value={planFormData.target_date}
                      onChange={e => setPlanFormData(f => ({ ...f, target_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.875rem]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreatePlanModal(false); setCreatePlanMilestoneId(null); setPlanFormData({ name: '', priority: 'medium', target_date: '' }); }}
                  className="flex-1 px-[0.875rem] py-[0.4375rem] text-[0.875rem] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-[0.875rem] py-[0.4375rem] text-[0.875rem] text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer font-medium"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[55]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Milestone</h2>
            {editingMilestone.isAggregated && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 mb-4">
                <i className="ri-loop-left-line text-indigo-500 text-sm" />
                <span className="text-xs text-indigo-700 font-medium">Roll-up mode — status and progress are auto-aggregated</span>
              </div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updateData: any = {
                name: formData.get('name'),
              };
              if (!editingMilestone.isAggregated) {
                updateData.status = formData.get('status');
              }
              const dateMode = editingMilestone.date_mode || 'auto';
              if (!editingMilestone.isAggregated || dateMode === 'manual') {
                updateData.start_date = formData.get('start_date');
                updateData.end_date = formData.get('end_date');
              }
              handleUpdateMilestone(editingMilestone.id, updateData);
              setEditingMilestone(null);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" name="name" defaultValue={editFormData.name} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editFormData.status}
                    disabled={editingMilestone.isAggregated}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm ${editingMilestone.isAggregated ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="started">In Progress</option>
                    <option value="past_due">Overdue</option>
                    <option value="completed">Completed</option>
                  </select>
                  {editingMilestone.isAggregated && (
                    <p className="text-xs text-slate-400 mt-1">Status is automatically determined by sub milestones.</p>
                  )}
                </div>
                {editingMilestone.isAggregated && (
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Date Mode</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const newMode = editingMilestone.date_mode === 'manual' ? 'auto' : 'manual';
                          await handleUpdateMilestone(editingMilestone.id, { date_mode: newMode });
                          setEditingMilestone({ ...editingMilestone, date_mode: newMode });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode ? '🔄 Auto (derived from subs)' : '✏️ Manual (custom)'}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={editFormData.start_date}
                    required
                    disabled={editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={editFormData.end_date}
                    required
                    disabled={editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode)}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button type="button" onClick={() => handleDeleteMilestone(editingMilestone.id)} className="px-[0.875rem] py-[0.4375rem] text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer whitespace-nowrap">Delete</button>
                <div className="flex-1"></div>
                <button type="button" onClick={() => setEditingMilestone(null)} className="px-[0.875rem] py-[0.4375rem] text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer whitespace-nowrap">Cancel</button>
                <button type="submit" className="px-[0.875rem] py-[0.4375rem] text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all cursor-pointer whitespace-nowrap">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
