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
  total_passed?: number;
  total_failed?: number;
  total_untested?: number;
  pass_rate?: number;
  description?: string;
}
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/feature/NotificationBell';
import { notifyProjectMembers } from '../../hooks/useNotifications';
import { triggerWebhook } from '../../hooks/useWebhooks';
import ProjectHeader from '../../components/ProjectHeader';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { useToast } from '../../components/Toast';
import AIPlanAssistantModal from '../project-plans/AIPlanAssistantModal';

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
  const [planFormData, setPlanFormData] = useState({ name: '', priority: 'medium', start_date: '', end_date: '' });
  const { showToast } = useToast();
  const [showAIAssistModal, setShowAIAssistModal] = useState(false);
  const [aiAssistMilestoneId, setAiAssistMilestoneId] = useState<string | null>(null);

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

      // Keep existing expanded set, only add milestones newly eligible for expansion
      setExpandedMilestones(prev => {
        const next = new Set(prev);
        organizedMilestones.forEach(milestone => {
          const hasSubMilestones = (milestone.subMilestones?.length ?? 0) > 0;
          // Also count plans that belong to this milestone
          // (testPlans state may not be loaded yet on first render, so we check plans fetched above)
          if (hasSubMilestones) next.add(milestone.id);
        });
        return next;
      });
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
      // Load test plan stats via view (non-blocking, graceful fallback)
      supabase.from('vw_test_plan_stats')
        .select('plan_id, name, status, priority, milestone_id, target_date, tc_count, run_count, total_passed, total_failed, total_untested, pass_rate, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data: plansData, error: plansError }) => {
          if (plansData && !plansError) {
            setTestPlans(plansData.map((p: any) => ({ ...p, id: p.plan_id })));
          } else {
            supabase.from('test_plans').select('id, name, status, priority, milestone_id, target_date').eq('project_id', id)
              .order('created_at', { ascending: false }).limit(50)
              .then(({ data: fallbackData }) => { if (fallbackData) setTestPlans(fallbackData); })
              .catch(() => {});
          }
        })
        .catch(() => {
          supabase.from('test_plans').select('id, name, status, priority, milestone_id, target_date').eq('project_id', id)
            .order('created_at', { ascending: false }).limit(50)
            .then(({ data: fallbackData }) => { if (fallbackData) setTestPlans(fallbackData); })
            .catch(() => {});
        });

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
        start_date: planFormData.start_date || null,
        end_date: planFormData.end_date || null,
        status: 'planning',
        owner_id: user?.id || null,
      }]).select().single();
      if (error) throw error;
      const milestoneIdSnap = createPlanMilestoneId;
      const planIdSnap = data?.id;
      setShowCreatePlanModal(false);
      setCreatePlanMilestoneId(null);
      setPlanFormData({ name: '', priority: 'medium', start_date: '', end_date: '' });
      showToast('Test plan created.', 'success');
      fetchData();
      if (planIdSnap && milestoneIdSnap) {
        navigate(`/projects/${id}/milestones/${milestoneIdSnap}/plans/${planIdSnap}`);
      } else if (planIdSnap) {
        // standalone plan — navigate via direct plan route
        navigate(`/projects/${id}/plans/${planIdSnap}`);
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
    // Badge icon color based on status
    const iconStyle = plan.status === 'completed'
      ? { bg: '#F0FDF4', color: '#16A34A' }
      : plan.status === 'active'
      ? { bg: '#EEF2FF', color: '#6366F1' }
      : plan.status === 'cancelled'
      ? { bg: '#F8FAFC', color: '#94A3B8' }
      : { bg: '#F8FAFC', color: '#94A3B8' }; // planning → neutral

    // Status badge colors
    const statusStyle: Record<string, { bg: string; color: string }> = {
      planning:  { bg: '#F1F5F9', color: '#64748B' },
      active:    { bg: '#DBEAFE', color: '#1D4ED8' },
      completed: { bg: '#DCFCE7', color: '#15803D' },
      cancelled: { bg: '#FEE2E2', color: '#DC2626' },
    };
    const ss = statusStyle[plan.status] || statusStyle.planning;

    const totalTc = (plan.total_passed || 0) + (plan.total_failed || 0) + (plan.total_untested || 0);
    const passedPct = totalTc > 0 ? (plan.total_passed || 0) / totalTc * 100 : 0;
    const failedPct = totalTc > 0 ? (plan.total_failed || 0) / totalTc * 100 : 0;
    const passRate = Math.round(plan.pass_rate ?? 0);
    const isOverdue = plan.target_date && new Date(plan.target_date) < new Date() && plan.status !== 'completed';

    return (
      <div
        key={plan.id}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer' }}
        onClick={() => navigate(`/projects/${id}/milestones/${milestoneId}/plans/${plan.id}`)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
      >
        {/* Color-coded badge icon */}
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: iconStyle.bg, color: iconStyle.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ri-file-list-3-line" style={{ fontSize: '13px' }} />
        </div>

        {/* Name + sub-info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {plan.name}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
            {plan.tc_count !== undefined ? `${plan.tc_count} TCs` : '0 TCs'}
            {plan.priority !== 'medium' && ` · ${plan.priority} priority`}
            {plan.target_date && (
              <span style={{ color: isOverdue ? '#EF4444' : undefined }}>
                {` · ${isOverdue ? 'Overdue' : 'Due'} ${new Date(plan.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar — flex fills space between name and status badge */}
        <div style={{ flex: '0 0 200px', minWidth: '140px' }}>
          <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${passedPct}%`, background: '#22C55E', height: '100%' }} />
            <div style={{ width: `${failedPct}%`, background: '#EF4444', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '3px', fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
            {totalTc > 0 ? (
              <>
                <span>{plan.total_passed || 0} passed · {plan.total_failed || 0} failed</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: passRate >= 70 ? '#16A34A' : '#EF4444' }}>{passRate}%</span>
              </>
            ) : (
              <>
                <span>Not started</span>
                <span style={{ color: '#CBD5E1' }}>—</span>
              </>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: ss.bg, color: ss.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
        </span>

        {/* Chevron */}
        <i className="ri-arrow-right-s-line flex-shrink-0" style={{ fontSize: '16px', color: '#CBD5E1' }} />
      </div>
    );
  };

  const renderSubMilestone = (sub: MilestoneWithProgress) => {
    const info = getStatusInfo(sub.status);
    const remaining = sub.totalTests - sub.passedTests - sub.failedTests;
    const passedPct = sub.totalTests > 0 ? (sub.passedTests / sub.totalTests) * 100 : 0;
    const failedPct = sub.totalTests > 0 ? (sub.failedTests / sub.totalTests) * 100 : 0;
    const iconBg = sub.status === 'completed' ? '#F0FDF4' : '#EEF2FF';
    const iconColor = sub.status === 'completed' ? '#16A34A' : '#6366F1';

    return (
      <div
        key={sub.id}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '6px' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
      >
        {/* Icon */}
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`${sub.status === 'completed' ? 'ri-checkbox-circle-fill' : 'ri-flag-line'}`} style={{ fontSize: '13px' }} />
        </div>

        {/* Name + date + progress */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={`/projects/${id}/milestones/${sub.id}`}
            onClick={e => e.stopPropagation()}
            style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
            className="hover:text-indigo-600 transition-colors"
          >
            {sub.name}
          </Link>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
            <i className="ri-calendar-line" style={{ fontSize: '9px', verticalAlign: '-1px', marginRight: '2px' }} />
            {formatDateRange(sub.start_date, sub.end_date)}
          </div>
        </div>

        {/* Progress bar — flex-grow fills available space */}
        <div style={{ flex: '0 0 240px', minWidth: '160px' }}>
          <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${passedPct}%`, background: '#22C55E', height: '100%' }} />
            <div style={{ width: `${failedPct}%`, background: '#EF4444', height: '100%' }} />
          </div>
          {sub.totalTests > 0 ? (
            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', fontSize: '11px', color: '#94A3B8', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
              <span>{sub.passedTests} passed · {sub.failedTests} failed · {remaining} remaining</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#64748B' }}>{sub.actualProgress}%</span>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '3px' }}>No runs yet</div>
          )}
        </div>

        {/* Status badge */}
        <span className={`text-[11px] font-semibold px-2 py-[2px] rounded-full flex-shrink-0 ${info.badgeCls}`}>
          {info.label}
        </span>

        {/* Edit button */}
        <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => {
              setEditFormData({ name: sub.name, start_date: sub.start_date ? sub.start_date.split('T')[0] : '', end_date: sub.end_date ? sub.end_date.split('T')[0] : '', status: sub.status });
              setEditingMilestone(sub);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 500, padding: '3px 7px', borderRadius: '4px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}
            className="hover:bg-slate-100 transition-colors"
          >
            <i className="ri-edit-line" style={{ fontSize: '12px' }} />Edit
          </button>
        </div>
      </div>
    );
  };

  const renderMilestone = (milestone: MilestoneWithProgress) => {
    const info = getStatusInfo(milestone.status);
    const hasSubMilestones = milestone.subMilestones && milestone.subMilestones.length > 0;
    const milestonePlans = testPlans.filter(p => p.milestone_id === milestone.id);
    const isExpanded = expandedMilestones.has(milestone.id);
    const canExpand = hasSubMilestones || milestonePlans.length > 0;
    const remaining = milestone.totalTests - milestone.passedTests - milestone.failedTests;
    const passedPct = milestone.totalTests > 0 ? (milestone.passedTests / milestone.totalTests) * 100 : 0;
    const failedPct = milestone.totalTests > 0 ? (milestone.failedTests / milestone.totalTests) * 100 : 0;
    const isDone = milestone.status === 'completed';

    const endTs = milestone.end_date
      ? new Date(milestone.end_date.split('T')[0]).getTime()
      : null;
    const daysLeft = endTs !== null
      ? Math.ceil((endTs - new Date().setHours(0, 0, 0, 0)) / 86400000)
      : null;

    const COLORS = ['#6366F1','#F59E0B','#10B981','#EC4899','#3B82F6','#8B5CF6','#EF4444'];

    return (
      <div key={milestone.id} style={{ borderBottom: '1px solid #F1F5F9' }} className="last:border-b-0">
        <div style={{ background: isExpanded ? '#FAFAFA' : undefined }}>

          {/* ── Main row ── */}
          {/* BUG5 fix: entire row → navigate to milestone detail; only chevron → fold/unfold */}
          <div
            className="flex items-center gap-3 px-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
            style={{ minHeight: '60px', paddingTop: '10px', paddingBottom: '10px' }}
            onClick={() => navigate(`/projects/${id}/milestones/${milestone.id}`)}
          >
            {/* Chevron — stops propagation so the card doesn't navigate */}
            <button
              className="flex items-center justify-center flex-shrink-0 transition-transform text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
              style={{ width: '24px', height: '24px', transform: isExpanded ? 'rotate(90deg)' : undefined, visibility: canExpand ? 'visible' : 'hidden', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
              onClick={e => { e.stopPropagation(); if (canExpand) toggleExpanded(milestone.id); }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <i className="ri-arrow-right-s-line" style={{ fontSize: '18px' }} />
            </button>

            {/* Flag icon */}
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px', borderRadius: '8px', background: info.iconBg }}>
              <i className={`${info.icon}`} style={{ fontSize: '16px', color: info.iconColor }} />
            </div>

            {/* Name + date + compact progress (collapsed only) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold truncate ${isDone ? 'text-slate-400' : 'text-slate-900'}`}
                  style={{ fontSize: '15px' }}
                >
                  {milestone.name}
                </span>
                {milestone.isAggregated && (
                  <span style={{ fontSize: '10px', color: '#94A3B8', flexShrink: 0 }}>
                    {milestone.date_mode === 'manual' ? '✏️ manual' : '🔄 auto'}
                  </span>
                )}
                {(milestone.dateWarnings?.length ?? 0) > 0 && (
                  <span style={{ fontSize: '10px', color: '#F59E0B' }} title={milestone.dateWarnings!.join('\n')}>
                    ⚠️ {milestone.dateWarnings!.length}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="ri-calendar-line" style={{ fontSize: '9px', verticalAlign: '-1px' }} />
                {formatDateRange(milestone.start_date, milestone.end_date)}
                {isDone && <span style={{ marginLeft: '4px' }}>· shipped</span>}
              </div>
              {/* Compact inline progress bar — collapsed state only */}
              {!isExpanded && milestone.totalTests > 0 && (
                <div style={{ marginTop: '6px', height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${passedPct}%`, background: '#22C55E', height: '100%' }} />
                  <div style={{ width: `${failedPct}%`, background: '#EF4444', height: '100%' }} />
                </div>
              )}
            </div>

            {/* Plans badge (violet) */}
            {milestonePlans.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600, color: '#6D28D9', background: '#EDE9FE', border: '1px solid #DDD6FE', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                <i className="ri-file-list-3-line" style={{ fontSize: '10px' }} />
                {milestonePlans.length} plan{milestonePlans.length !== 1 ? 's' : ''}
              </span>
            )}

            {/* Subs badge */}
            {hasSubMilestones && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 500, color: '#64748B', background: '#fff', border: '1px solid #E2E8F0', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                <i className="ri-git-branch-line" style={{ fontSize: '10px' }} />
                {milestone.subMilestones!.length} subs
              </span>
            )}

            {/* Roll-up badge */}
            {milestone.isAggregated && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 500, color: '#6366F1', background: '#fff', border: '1px solid #C7D2FE', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                <i className="ri-loop-left-line" style={{ fontSize: '10px' }} />
                Roll-up
              </span>
            )}

            {/* Progress text (collapsed) */}
            {!isExpanded && milestone.totalTests > 0 && (
              <span style={{ fontSize: '11px', color: '#94A3B8', flexShrink: 0 }}>
                {milestone.actualProgress}% · {milestone.completedTests}/{milestone.totalTests}
              </span>
            )}

            {/* Days-left badge */}
            {daysLeft !== null && !isDone && daysLeft >= 0 && daysLeft <= 60 && (
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                ...(daysLeft <= 7
                  ? { background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }
                  : { background: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D' })
              }}>
                {daysLeft}d left
              </span>
            )}

            {/* Status badge */}
            <span className={`text-[11px] font-semibold px-2 py-[2px] rounded-full flex-shrink-0 ${info.badgeCls}`}>
              {info.label}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {!milestone.isAggregated && milestone.status === 'upcoming' && (
                <button onClick={() => handleStartMilestone(milestone.id)}
                  style={{ fontSize: '11px', fontWeight: 500, padding: '3px 7px', borderRadius: '4px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  className="hover:bg-slate-100 transition-colors">Start</button>
              )}
              {!milestone.isAggregated && (milestone.status === 'started' || milestone.status === 'past_due') && (
                <button onClick={() => handleMarkAsComplete(milestone.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 500, padding: '3px 7px', borderRadius: '4px', border: '1px solid #86EFAC', background: '#fff', color: '#16A34A', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  className="hover:bg-green-50 transition-colors">
                  <i className="ri-check-line" style={{ fontSize: '12px' }} />Complete
                </button>
              )}
              <button
                onClick={() => { setParentMilestoneId(milestone.id); setShowCreateModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 500, padding: '3px 7px', borderRadius: '4px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}
                className="hover:bg-slate-100 transition-colors">
                <i className="ri-git-branch-line" style={{ fontSize: '11px' }} />+Sub
              </button>
              <button
                onClick={() => { setEditFormData({ name: milestone.name, start_date: milestone.start_date ? milestone.start_date.split('T')[0] : '', end_date: milestone.end_date ? milestone.end_date.split('T')[0] : '', status: milestone.status }); setEditingMilestone(milestone); }}
                style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 500, padding: '3px 7px', borderRadius: '4px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}
                className="hover:bg-slate-100 transition-colors">
                <i className="ri-edit-line" style={{ fontSize: '11px' }} />Edit
              </button>
            </div>
          </div>

          {/* ── Expanded section ── */}
          {isExpanded && (
            <div style={{ borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>

              {/* Wide progress bar */}
              {milestone.totalTests > 0 && (
                <div style={{ padding: '12px 16px 12px 60px' }}>
                  <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${passedPct}%`, background: '#22C55E', height: '100%' }} />
                    <div style={{ width: `${failedPct}%`, background: '#EF4444', height: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '14px', marginTop: '8px', fontSize: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', marginRight: '4px', verticalAlign: '-1px' }} /><strong>{milestone.passedTests}</strong> <span style={{ color: '#94A3B8' }}>passed</span></span>
                    <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', marginRight: '4px', verticalAlign: '-1px' }} /><strong>{milestone.failedTests}</strong> <span style={{ color: '#94A3B8' }}>failed</span></span>
                    <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#CBD5E1', marginRight: '4px', verticalAlign: '-1px' }} /><strong>{remaining}</strong> <span style={{ color: '#94A3B8' }}>remaining</span></span>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <span><strong>{milestone.actualProgress}%</strong> <span style={{ color: '#94A3B8' }}>complete</span></span>
                    {milestone.isAggregated && (milestone.rollupPassRate ?? 0) > 0 && (
                      <><span style={{ color: '#CBD5E1' }}>|</span><span><strong>{milestone.rollupPassRate}%</strong> <span style={{ color: '#94A3B8' }}>pass rate</span></span></>
                    )}
                    <span style={{ marginLeft: 'auto', color: '#94A3B8' }}>{milestone.completedTests} / {milestone.totalTests} cases</span>
                  </div>
                  {/* Assignee stack */}
                  {(() => {
                    const uids = milestoneRunAssignees.get(milestone.id) || [];
                    if (uids.length === 0) return null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                        {uids.slice(0, 4).map((uid, idx) => {
                          const p = milestoneAssigneeProfiles.get(uid);
                          const initials = p?.name ? p.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : (p?.email?.slice(0, 2).toUpperCase() ?? '??');
                          return (
                            <div key={uid} title={p?.name || p?.email || uid}
                              style={{ background: COLORS[idx % COLORS.length], marginLeft: idx === 0 ? 0 : '-5px', width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff', flexShrink: 0, position: 'relative', zIndex: 4 - idx, overflow: 'hidden' }}>
                              {p?.url ? <img src={p.url} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                            </div>
                          );
                        })}
                        {uids.length > 4 && (
                          <div style={{ marginLeft: '-5px', width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #FAFAFA', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 700, color: '#64748B' }}>
                            +{uids.length - 4}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Sub-milestones section */}
              {hasSubMilestones && (
                <div style={{ padding: '0 16px 12px 60px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <i className="ri-git-branch-line" style={{ color: '#6366F1', fontSize: '12px' }} />
                    Sub Milestones
                    <span style={{ color: '#CBD5E1', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{milestone.subMilestones!.length}</span>
                  </div>
                  {milestone.subMilestones!.map(sub => renderSubMilestone(sub))}
                </div>
              )}

              {/* Test Plans section */}
              <div style={{ padding: '0 16px 14px 60px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0 8px', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <i className="ri-calendar-2-line" style={{ color: '#7C3AED', fontSize: '12px' }} />
                  Test Plans
                  <span style={{ color: '#CBD5E1', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{milestonePlans.length}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    {/* AI Assist */}
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', border: '1px solid #C7D2FE', background: 'linear-gradient(135deg, #EEF2FF, #EDE9FE)', color: '#6366F1', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={e => { e.stopPropagation(); setAiAssistMilestoneId(milestone.id); setShowAIAssistModal(true); }}
                    >
                      <i className="ri-sparkling-2-line" style={{ fontSize: '11px' }} />AI Assist
                    </button>
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, padding: '3px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      className="hover:bg-slate-50 transition-colors"
                      onClick={e => { e.stopPropagation(); setCreatePlanMilestoneId(milestone.id); setShowCreatePlanModal(true); }}
                    >
                      <i className="ri-add-line" style={{ fontSize: '12px' }} />New Plan
                    </button>
                  </div>
                </div>
                {milestonePlans.map(plan => renderPlanRow(plan, milestone.id))}
                {milestonePlans.length === 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); setCreatePlanMilestoneId(milestone.id); setShowCreatePlanModal(true); }}
                    style={{ width: '100%', textAlign: 'left', border: '1px dashed #E2E8F0', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: '#94A3B8', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    className="hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all"
                  >
                    <i className="ri-add-line" style={{ fontSize: '14px' }} />Create first Test Plan for this milestone
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
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
              placeholder="Search milestones &amp; plans…"
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

            {/* ── Milestones unified container ── */}
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-flag-line text-5xl text-slate-300 block mb-3"></i>
                <p className="text-[0.875rem] font-semibold text-slate-500 mb-1">No {activeTab === 'all' ? '' : activeTab + ' '}milestones</p>
                <p className="text-[0.75rem] text-slate-400">
                  {searchQuery ? 'No milestones match your search' : 'Create your first milestone to get started'}
                </p>
              </div>
            ) : (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff', overflow: 'hidden', marginBottom: '24px' }}>
                {filteredMilestones.map(milestone => renderMilestone(milestone))}
              </div>
            )}

            {/* ── Ad-hoc Runs section ── */}
            {activeTab === 'all' && adHocRuns.length > 0 && (
              <div>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <i className="ri-flashlight-line" style={{ color: '#F97316', fontSize: '14px' }} />
                  Ad-hoc Runs
                  <span style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{adHocRuns.length}</span>
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '11px', color: '#CBD5E1' }}>
                    Milestone / Plan 없이 생성된 일회성 실행
                  </span>
                  <Link
                    to={`/projects/${id}/runs`}
                    style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, padding: '3px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <i className="ri-add-line" style={{ fontSize: '12px' }} />New Run
                  </Link>
                </div>

                {/* Ad-hoc runs unified container */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                  {adHocRuns.slice(0, 8).map((run: any, runIdx: number) => {
                    const totalTcs = run.test_case_ids?.length || 0;
                    const passed = run.passed || 0;
                    const failed = run.failed || 0;
                    const untested = totalTcs - passed - failed;
                    const passedPct = totalTcs > 0 ? (passed / totalTcs) * 100 : 0;
                    const failedPct = totalTcs > 0 ? (failed / totalTcs) * 100 : 0;
                    const passRate = totalTcs > 0 ? Math.round(passed / totalTcs * 100) : 0;
                    const runStatus = run.status === 'completed' ? 'Completed' : run.status === 'in_progress' ? 'In Progress' : 'Not Started';
                    const runStatusStyle = run.status === 'completed'
                      ? { bg: '#DCFCE7', color: '#15803D' }
                      : run.status === 'in_progress'
                      ? { bg: '#FEF3C7', color: '#B45309' }
                      : { bg: '#F1F5F9', color: '#64748B' };
                    return (
                      <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: runIdx < Math.min(adHocRuns.length, 8) - 1 ? '1px solid #F1F5F9' : undefined }}>
                        {/* Orange lightning icon */}
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF7ED', color: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="ri-flashlight-line" style={{ fontSize: '15px' }} />
                        </div>

                        {/* Name + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <Link
                              to={`/projects/${id}/runs/${run.id}`}
                              style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                              className="hover:text-indigo-600 transition-colors"
                            >
                              {run.name}
                            </Link>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color: '#F97316', background: '#FFF7ED', border: '1px solid #FDBA74', padding: '1px 7px', borderRadius: '20px', flexShrink: 0 }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                              Ad-hoc
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            {totalTcs} TCs
                            {run.created_at && ` · ${new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </div>
                        </div>

                        {/* Progress bar — flex grows to fill available space */}
                        <div style={{ flex: '0 0 240px', minWidth: '160px' }}>
                          <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${passedPct}%`, background: '#22C55E', height: '100%' }} />
                            <div style={{ width: `${failedPct}%`, background: '#EF4444', height: '100%' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '3px', fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                            {totalTcs > 0 ? (
                              <>
                                <span>{passed} passed · {failed} failed · {untested} untested</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 600, color: passRate >= 70 ? '#16A34A' : '#EF4444' }}>{passRate}%</span>
                              </>
                            ) : (
                              <span>No test cases</span>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: runStatusStyle.bg, color: runStatusStyle.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                          {runStatus}
                        </span>

                        {/* Promote to Plan button */}
                        <button
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, padding: '3px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          className="hover:bg-slate-50 transition-colors"
                          onClick={() => { setCreatePlanMilestoneId(null); setShowCreatePlanModal(true); }}
                          title="Promote to a Test Plan"
                        >
                          <i className="ri-add-line" style={{ fontSize: '12px' }} />Promote to Plan
                        </button>
                      </div>
                    );
                  })}
                </div>

                {adHocRuns.length > 8 && (
                  <Link
                    to={`/projects/${id}/runs`}
                    className="block text-center py-2 text-[0.8125rem] text-indigo-500 hover:text-indigo-700 font-medium no-underline mt-2"
                  >
                    View all {adHocRuns.length} ad-hoc runs →
                  </Link>
                )}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={planFormData.start_date}
                      onChange={e => setPlanFormData(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.875rem]"
                    />
                  </div>
                  <div>
                    <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={planFormData.end_date}
                      onChange={e => setPlanFormData(f => ({ ...f, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[0.875rem]"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowCreatePlanModal(false); setCreatePlanMilestoneId(null); setPlanFormData({ name: '', priority: 'medium', start_date: '', end_date: '' }); }}
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

      {/* ── AI Plan Assistant Modal ── */}
      {showAIAssistModal && (
        <AIPlanAssistantModal
          projectId={id!}
          milestones={[
            ...milestones.map(m => ({ id: m.id, name: m.name, status: m.status, end_date: m.end_date })),
            ...milestones.flatMap(m => (m.subMilestones || []).map((s: any) => ({ id: s.id, name: s.name, status: s.status, end_date: s.end_date }))),
          ]}
          onClose={() => { setShowAIAssistModal(false); setAiAssistMilestoneId(null); }}
          onApply={async (tcIds, planName) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const { data: planData, error: planErr } = await supabase
                .from('test_plans')
                .insert([{ project_id: id, milestone_id: aiAssistMilestoneId || null, name: planName, priority: 'medium', status: 'planning', owner_id: user?.id || null }])
                .select().single();
              if (planErr) throw planErr;
              if (tcIds.length > 0) {
                await supabase.from('test_plan_test_cases').insert(
                  tcIds.map(tcId => ({ test_plan_id: planData.id, test_case_id: tcId }))
                );
              }
              const milestoneSnap = aiAssistMilestoneId;
              const planIdAi = planData.id;
              setShowAIAssistModal(false);
              setAiAssistMilestoneId(null);
              showToast(`Plan "${planName}" created with ${tcIds.length} TCs`, 'success');
              fetchData();
              if (milestoneSnap && planIdAi) {
                navigate(`/projects/${id}/milestones/${milestoneSnap}/plans/${planIdAi}`);
              } else if (planIdAi) {
                navigate(`/projects/${id}/plans/${planIdAi}`);
              }
            } catch (err: any) {
              showToast('Failed to create AI plan: ' + err.message, 'error');
            }
          }}
        />
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
