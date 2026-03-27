import { LogoMark } from '../../components/Logo';
import PageLoader from '../../components/PageLoader';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/feature/NotificationBell';
import { notifyProjectMembers } from '../../hooks/useNotifications';
import { triggerWebhook } from '../../hooks/useWebhooks';
import ProjectHeader from '../../components/ProjectHeader';

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
}

interface MilestoneWithProgress extends Milestone {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  actualProgress: number;
  subMilestones?: MilestoneWithProgress[];
}

const TIER_INFO = {
  1: { name: 'Free', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: 'ri-user-line' },
  2: { name: 'Starter', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise', color: 'bg-amber-50 text-amber-700 border-amber-300', icon: 'ri-vip-diamond-line' },
};

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', badgeCls: 'bg-[#F0FDF4] text-[#16A34A]', iconBg: '#F0FDF4', iconColor: '#16A34A', icon: 'ri-checkbox-circle-fill' };
    case 'past_due':
      return { label: 'Overdue', badgeCls: 'bg-[#FEF2F2] text-[#DC2626]', iconBg: '#FEF2F2', iconColor: '#EF4444', icon: 'ri-flag-fill' };
    case 'started':
      return { label: 'In Progress', badgeCls: 'bg-[#DBEAFE] text-[#2563EB]', iconBg: '#EEF2FF', iconColor: '#6366F1', icon: 'ri-flag-fill' };
    default:
      return { label: 'Upcoming', badgeCls: 'bg-[#DBEAFE] text-[#2563EB]', iconBg: '#EEF2FF', iconColor: '#6366F1', icon: 'ri-flag-fill' };
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
          if (endDate < today) {
            if (milestone.status !== 'past_due') {
              supabase.from('projects').select('name').eq('id', id!).maybeSingle().then(({ data: proj }) => {
                triggerWebhook(id!, 'milestone_past_due', {
                  project_id: id!,
                  project_name: proj?.name ?? '',
                  milestone_id: milestone.id,
                  milestone_name: milestone.name,
                  end_date: milestone.end_date,
                });
              });
            }
          }
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

      const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
      const organizedMilestones = parentMilestones.map(parent => ({
        ...parent,
        subMilestones: milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id)
      }));

      const initialExpanded = new Set<string>();
      organizedMilestones.forEach(milestone => {
        if (milestone.subMilestones && milestone.subMilestones.length > 0) initialExpanded.add(milestone.id);
      });
      setExpandedMilestones(initialExpanded);
      setMilestones(organizedMilestones);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (data: any) => {
    try {
      const { error } = await supabase.from('milestones').insert([{ project_id: id, status: 'upcoming', progress: 0, parent_milestone_id: parentMilestoneId, ...data }]);
      if (error) throw error;
      setShowCreateModal(false);
      setParentMilestoneId(null);
      fetchData();
    } catch (error) {
      console.error('마일스톤 생성 오류:', error);
      alert('마일스톤 생성에 실패했습니다.');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, data: any) => {
    try {
      const { error } = await supabase.from('milestones').update(data).eq('id', milestoneId);
      if (error) throw error;
      setEditingMilestone(null);
      fetchData();
    } catch (error) {
      console.error('마일스톤 수정 오류:', error);
      alert('마일스톤 수정에 실패했습니다.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('이 마일스톤을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('마일스톤 삭제 오류:', error);
      alert('마일스톤 삭제에 실패했습니다.');
    }
  };

  const handleStartMilestone = async (milestoneId: string) => {
    await handleUpdateMilestone(milestoneId, { status: 'started' });
    try {
      const milestone = milestones.find(m => m.id === milestoneId || m.subMilestones?.find((s: any) => s.id === milestoneId));
      const milestoneName = milestone?.id === milestoneId ? milestone?.name : milestone?.subMilestones?.find((s: any) => s.id === milestoneId)?.name || 'Milestone';
      const { data: projectData } = await supabase.from('projects').select('name').eq('id', id!).maybeSingle();
      triggerWebhook(id!, 'milestone_started', {
        project_id: id!,
        project_name: projectData?.name ?? '',
        milestone_id: milestoneId,
        milestone_name: milestoneName,
      });
    } catch (err) {
      console.warn('milestone_started webhook error:', err);
    }
  };

  const handleMarkAsComplete = async (milestoneId: string) => {
    await handleUpdateMilestone(milestoneId, { status: 'completed' });
    try {
      const milestone = milestones.find(m => m.id === milestoneId || m.subMilestones?.find((s: any) => s.id === milestoneId));
      const milestoneName = milestone?.id === milestoneId ? milestone?.name : milestone?.subMilestones?.find((s: any) => s.id === milestoneId)?.name || 'Milestone';
      const { data: { user } } = await supabase.auth.getUser();
      const { data: projectData } = await supabase.from('projects').select('name').eq('id', id!).maybeSingle();
      await notifyProjectMembers({ projectId: id!, excludeUserId: user?.id, type: 'milestone_completed', title: '마일스톤이 완료되었습니다', message: `"${milestoneName}" 마일스톤이 완료 처리되었습니다.`, link: `/projects/${id}/milestones` });
      triggerWebhook(id!, 'milestone_completed', {
        project_id: id!,
        project_name: projectData?.name ?? '',
        milestone_id: milestoneId,
        milestone_name: milestoneName,
      });
    } catch (err) {
      console.error('마일스톤 완료 알림 오류:', err);
    }
  };

  const toggleExpanded = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) newExpanded.delete(milestoneId);
    else newExpanded.add(milestoneId);
    setExpandedMilestones(newExpanded);
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
        <div className="absolute left-[-0.625rem] top-1/2 w-[0.625rem] h-[1.5px] bg-[#E2E8F0]" />
        <div className="bg-[#FAFAFF] border border-[#EEF2FF] rounded-md px-[0.8125rem] py-[0.6875rem] hover:border-[#C7D2FE] hover:bg-[#F5F3FF] transition-all cursor-pointer">
          {/* sub top row */}
          <div className="flex items-center gap-2 mb-[0.375rem]">
            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: info.iconBg }}>
              <i className={`${info.icon} text-[0.75rem]`} style={{ color: info.iconColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to={`/projects/${id}/milestones/${sub.id}`}
                onClick={e => e.stopPropagation()}
                className="block text-[0.8125rem] font-semibold text-[#0F172A] truncate hover:text-indigo-600 transition-colors"
              >
                {sub.name}
              </Link>
              <div className="text-[0.6875rem] text-[#94A3B8] mt-[0.0625rem] flex items-center gap-1">
                <i className="ri-calendar-line" style={{ fontSize: '0.5625rem', verticalAlign: '-1px' }} />
                {formatDateRange(sub.start_date, sub.end_date)}
              </div>
            </div>
            <span className={`text-[0.625rem] font-semibold px-[0.4375rem] py-[0.125rem] rounded-full flex-shrink-0 ${info.badgeCls}`}>
              {info.label}
            </span>
          </div>
          {/* sub progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[4.5px] bg-[#F1F5F9] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#10B981] transition-all" style={{ width: `${passedPct}%` }} />
              <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${failedPct}%` }} />
            </div>
            <div className="flex items-center gap-2 text-[0.6875rem] text-[#64748B] whitespace-nowrap flex-shrink-0">
              <span className="text-[#10B981] font-semibold">{sub.passedTests} passed</span>
              <span className="text-[#EF4444] font-semibold">{sub.failedTests} failed</span>
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
              ? 'border-[#E2E8F0] opacity-70 hover:opacity-85'
              : isExpanded
              ? 'border-[#C7D2FE] shadow-[0_1px_6px_rgba(99,102,241,0.1)]'
              : 'border-[#E2E8F0] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[#C7D2FE]'
          }`}
          onClick={() => hasSubMilestones && toggleExpanded(milestone.id)}
        >
          {/* Top row */}
          <div className="flex items-center gap-[0.625rem] mb-[0.5625rem]">
            {/* expand chevron */}
            {hasSubMilestones ? (
              <button
                onClick={e => { e.stopPropagation(); toggleExpanded(milestone.id); }}
                className={`w-[1.375rem] h-[1.375rem] rounded flex items-center justify-center flex-shrink-0 text-base transition-all hover:bg-[#F1F5F9] ${isExpanded ? 'text-[#6366F1] rotate-90' : 'text-[#94A3B8]'}`}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            ) : (
              <div className="w-[1.375rem] flex-shrink-0" />
            )}

            {/* icon */}
            <div className="w-9 h-9 rounded-[0.4375rem] flex items-center justify-center flex-shrink-0" style={{ background: info.iconBg }}>
              <i className={`${info.icon} text-[1.125rem]`} style={{ color: info.iconColor }} />
            </div>

            {/* name + date */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/projects/${id}/milestones/${milestone.id}`}
                onClick={e => e.stopPropagation()}
                className={`block text-[0.875rem] font-semibold truncate hover:text-indigo-600 transition-colors ${isDone ? 'text-[#64748B]' : 'text-[#0F172A]'}`}
              >
                {milestone.name}
              </Link>
              <div className="text-[0.75rem] text-[#94A3B8] mt-[0.0625rem] flex items-center gap-1">
                <i className="ri-calendar-line" style={{ fontSize: '0.625rem', verticalAlign: '-1px' }} />
                {formatDateRange(milestone.start_date, milestone.end_date)}
              </div>
            </div>

            {/* sub count */}
            {hasSubMilestones && (
              <span className="text-[0.6875rem] font-semibold text-[#6366F1] flex items-center gap-[0.1875rem] flex-shrink-0">
                <i className="ri-git-branch-line text-[0.8125rem]" />
                {milestone.subMilestones!.length} subs
              </span>
            )}

            {/* status badge */}
            <span className={`text-[0.6875rem] font-semibold px-2 py-[0.1875rem] rounded-full flex-shrink-0 ${info.badgeCls}`}>
              {info.label}
            </span>

            {/* action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => { setParentMilestoneId(milestone.id); setShowCreateModal(true); }}
                className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9] transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-git-branch-line text-[0.8125rem]" />+Sub
              </button>
              <button
                onClick={() => { setEditFormData({ name: milestone.name, start_date: milestone.start_date ? milestone.start_date.split('T')[0] : '', end_date: milestone.end_date ? milestone.end_date.split('T')[0] : '', status: milestone.status }); setEditingMilestone(milestone); }}
                className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9] transition-all whitespace-nowrap cursor-pointer"
              >
                <i className="ri-edit-line text-[0.8125rem]" />Edit
              </button>
              {milestone.status === 'upcoming' && (
                <button
                  onClick={() => handleStartMilestone(milestone.id)}
                  className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9] transition-all whitespace-nowrap cursor-pointer"
                >
                  Start
                </button>
              )}
              {(milestone.status === 'started' || milestone.status === 'past_due') && (
                <button
                  onClick={() => handleMarkAsComplete(milestone.id)}
                  className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-[#86EFAC] bg-white text-[#16A34A] hover:bg-[#F0FDF4] transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-check-line text-[0.8125rem]" />Complete
                </button>
              )}
              {isDone && (
                <Link
                  to={`/projects/${id}/milestones/${milestone.id}`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-[0.1875rem] text-[0.6875rem] font-medium px-[0.4375rem] py-1 rounded border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9] transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-eye-line text-[0.8125rem]" />View
                </Link>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-[0.4375rem]">
            <div className="h-[6px] bg-[#F1F5F9] rounded-full overflow-hidden flex mb-[0.3125rem]">
              <div className="h-full bg-[#10B981] transition-all" style={{ width: `${passedPct}%` }} />
              <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${failedPct}%` }} />
            </div>
            <div className="flex justify-between text-[0.75rem]">
              <span className="font-semibold text-[#0F172A]">{milestone.actualProgress}% complete</span>
              <span className="text-[#94A3B8]">{milestone.completedTests} / {milestone.totalTests} cases</span>
            </div>
          </div>

          {/* Bottom: counts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[0.75rem]">
              <span className="flex items-center gap-[0.1875rem]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#10B981] flex-shrink-0" />
                <span className="text-[#64748B]">{milestone.passedTests} passed</span>
              </span>
              <span className="flex items-center gap-[0.1875rem]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#EF4444] flex-shrink-0" />
                <span className="text-[#64748B]">{milestone.failedTests} failed</span>
              </span>
              <span className="flex items-center gap-[0.1875rem]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#94A3B8] flex-shrink-0" />
                <span className="text-[#64748B]">{remaining} remaining</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sub-milestones */}
        {hasSubMilestones && isExpanded && (
          <div className="mt-1.5 pl-[1.125rem] relative">
            {/* vertical connector line */}
            <div className="absolute left-2 top-0 bottom-3 w-[1.5px] bg-[#E2E8F0] rounded" />
            {milestone.subMilestones!.map(sub => renderSubMilestone(sub))}
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
        <div className="flex items-center border-b border-[#E2E8F0] bg-white flex-shrink-0 h-[2.625rem] px-5">
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
                  ? 'text-[#6366F1] border-[#6366F1]'
                  : 'text-[#64748B] border-transparent hover:text-[#1E293B]'
              }`}
            >
              <i className={`${tab.icon} text-[0.875rem]`} style={{ color: tab.iconColor }} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-[0.6875rem] font-semibold ${
                activeTab === tab.key ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F1F5F9] text-[#64748B]'
              }`}>{tab.count}</span>
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => { setParentMilestoneId(null); setShowCreateModal(true); }}
            className="flex items-center gap-1 px-[0.75rem] py-[0.3125rem] bg-[#6366F1] text-white rounded-[0.375rem] text-[0.75rem] font-semibold hover:bg-[#4F46E5] transition-colors cursor-pointer whitespace-nowrap shadow-[0_1px_3px_rgba(99,102,241,0.3)]"
          >
            <i className="ri-add-line text-sm" />
            New Milestone
          </button>
        </div>

        {/* Search + Filter + Sort toolbar */}
        <div className="flex items-center gap-2 px-6 py-[0.625rem] bg-white border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex-1 flex items-center gap-[0.375rem] bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-[0.625rem] py-[0.375rem] focus-within:border-[#C7D2FE] focus-within:bg-white transition-colors">
            <i className="ri-search-line text-[0.875rem] text-[#94A3B8] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search milestones..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-none bg-transparent outline-none text-[0.8125rem] text-[#1E293B] placeholder-[#94A3B8] flex-1 min-w-0 font-[inherit]"
            />
          </div>
          <button className="flex items-center gap-1 text-[0.75rem] font-medium px-[0.625rem] py-[0.375rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-filter-3-line text-[0.875rem] text-[#94A3B8]" />Filters
          </button>
          <button className="flex items-center gap-1 text-[0.75rem] font-medium px-[0.625rem] py-[0.375rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-sort-desc text-[0.875rem] text-[#94A3B8]" />Sort
          </button>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="p-5">
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-flag-line text-5xl text-[#CBD5E1] block mb-3"></i>
                <p className="text-[0.875rem] font-semibold text-[#64748B] mb-1">No {activeTab === 'all' ? '' : activeTab + ' '}milestones</p>
                <p className="text-[0.75rem] text-[#94A3B8]">
                  {searchQuery ? 'No milestones match your search' : 'Create your first milestone to get started'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[0.625rem]">
                {filteredMilestones.map(milestone => renderMilestone(milestone))}
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

      {editingMilestone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Milestone</h2>
            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleUpdateMilestone(editingMilestone.id, { name: formData.get('name'), start_date: formData.get('start_date'), end_date: formData.get('end_date'), status: formData.get('status') }); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" name="name" defaultValue={editFormData.name} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" defaultValue={editFormData.status} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm">
                    <option value="upcoming">Upcoming</option>
                    <option value="started">In Progress</option>
                    <option value="past_due">Past Due</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" name="start_date" defaultValue={editFormData.start_date} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" name="end_date" defaultValue={editFormData.end_date} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
