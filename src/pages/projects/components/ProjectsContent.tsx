import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { markOnboardingStep } from '../../../lib/onboardingMarker';
import { supabase, type Project } from '../../../lib/supabase';
import { ProjectsGridSkeleton } from '../../../components/Skeleton';
import { loadProjectDetailData } from '../../project-detail/queryFns';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import EmptyState from './EmptyState';
import SparseState from './SparseState';
import QuickCreateTCModal from './QuickCreateTCModal';
import TestRailImportModal from './TestRailImportModal';
import StatCards, { type StatCardsData } from './StatCards';
import { Avatar } from '../../../components/Avatar';
import { useTranslation } from 'react-i18next';
import { useSampleProject } from '../../../hooks/useSampleProject';
import { useToast } from '../../../components/Toast';
import UpgradeBanner from '../../../components/UpgradeBanner';
import { usePermission } from '../../../hooks/usePermission';

// ── Health score helpers ────────────────────────────────────────────────────
function getProjectHealth(passRate: number | null): { color: 'green' | 'yellow' | 'red' | 'gray'; label: string } {
  if (passRate === null || passRate === undefined) return { color: 'gray', label: '—' };
  if (passRate >= 80) return { color: 'green', label: `${passRate}%` };
  if (passRate >= 50) return { color: 'yellow', label: `${passRate}%` };
  return { color: 'red', label: `${passRate}%` };
}

const HEALTH_STYLES = {
  green:  { badge: 'bg-green-50 text-green-600',  dot: 'bg-green-500' },
  yellow: { badge: 'bg-amber-50 text-amber-600',  dot: 'bg-amber-500' },
  red:    { badge: 'bg-red-50 text-red-600',      dot: 'bg-red-500'   },
  gray:   { badge: 'bg-slate-100 text-slate-400', dot: 'bg-slate-400' },
};

// ── Time-ago helper ─────────────────────────────────────────────────────────
function timeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// ── ProjectsData type ───────────────────────────────────────────────────────
type ProjectsData = {
  projects: Project[];
  testCaseCounts: Record<string, number>;
  testRunCounts: Record<string, number>;
  activeRunCount: number;
  testCasesThisWeek: number;
  projectPassRates: Record<string, number | null>;
  passRateDelta: number | null;
  passRateDeltaLabel: string | null;
  projectMembers: Record<string, Array<{ initials: string; color: string; userId?: string; name?: string }>>;
  currentUserId: string | null;
  userProjectRoles: Record<string, string>;
};

// ── Standalone data loader (no setState) ───────────────────────────────────
async function loadProjectsData(): Promise<ProjectsData> {
  const period = (localStorage.getItem('passrate_period') ?? 'active_run') as 'active_run' | '7d' | '30d' | 'all';

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('UNAUTHENTICATED');

  const user = session.user;
  const currentUserId = user.id;

  // Critical path: get project IDs
  const { data: memberData, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id);

  if (memberError) throw memberError;

  const projectIds = memberData?.map(m => m.project_id) || [];

  // Get roles
  const userProjectRoles: Record<string, string> = {};
  try {
    const { data: roleData } = await supabase
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', user.id);
    roleData?.forEach((m: { project_id: string; role: string }) => { userProjectRoles[m.project_id] = m.role; });
  } catch { /* role check failed */ }

  if (projectIds.length === 0) {
    return {
      projects: [], testCaseCounts: {}, testRunCounts: {}, activeRunCount: 0,
      testCasesThisWeek: 0, projectPassRates: {}, passRateDelta: null,
      passRateDeltaLabel: null, projectMembers: {}, currentUserId, userProjectRoles,
    };
  }

  const [
    { data: projectsData, error: projectsError },
    { data: testCasesData, error: testCasesError },
    { data: testRunsData, error: testRunsError },
  ] = await Promise.all([
    supabase.from('projects').select('*').in('id', projectIds).order('created_at', { ascending: false }),
    supabase.from('test_cases').select('project_id').in('project_id', projectIds),
    supabase.from('test_runs').select('project_id').in('project_id', projectIds),
  ]);

  if (projectsError) throw projectsError;

  const testCaseCounts: Record<string, number> = {};
  if (!testCasesError && testCasesData) {
    testCasesData.forEach(tc => { testCaseCounts[tc.project_id] = (testCaseCounts[tc.project_id] || 0) + 1; });
  }

  const testRunCounts: Record<string, number> = {};
  if (!testRunsError && testRunsData) {
    testRunsData.forEach(tr => { testRunCounts[tr.project_id] = (testRunCounts[tr.project_id] || 0) + 1; });
  }

  // Compute pass rates
  const now = new Date();
  const activeStatuses = ['new', 'in_progress', 'paused', 'under_review'];

  let runsQuery = supabase.from('test_runs').select('id, project_id').in('project_id', projectIds);
  if (period === 'active_run') {
    runsQuery = (runsQuery as any).in('status', activeStatuses);
  }
  const { data: allRunsForStats } = await runsQuery;

  let projectPassRates: Record<string, number | null> = {};
  let passRateDelta: number | null = null;
  let passRateDeltaLabel: string | null = null;

  if (allRunsForStats && allRunsForStats.length > 0) {
    const runIds = allRunsForStats.map((r: { id: string; project_id: string }) => r.id);
    const runProjectMap: Record<string, string> = {};
    allRunsForStats.forEach((r: { id: string; project_id: string }) => { runProjectMap[r.id] = r.project_id; });

    let startDate: string | null = null;
    let prevStartDate: string | null = null;
    let prevEndDate: string | null = null;
    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      prevEndDate = startDate;
    } else if (period === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      prevEndDate = startDate;
    }

    let resultsQuery = supabase
      .from('test_results')
      .select('run_id, test_case_id, status, created_at')
      .in('run_id', runIds)
      .order('created_at', { ascending: false });
    if (startDate) resultsQuery = (resultsQuery as any).gte('created_at', startDate);

    const { data: resultsData } = await resultsQuery;

    const computeRate = (rows: Array<{ run_id: string; test_case_id: string; status: string }>) => {
      const seen: Record<string, string> = {};
      rows.forEach(r => { const k = `${r.run_id}::${r.test_case_id}`; if (!(k in seen)) seen[k] = r.status; });
      let passed = 0, total = 0;
      Object.values(seen).forEach(s => { if (s !== 'untested') { total++; if (s === 'passed') passed++; } });
      return total > 0 ? (passed / total) * 100 : null;
    };

    if (resultsData) {
      const latestByKey: Record<string, string> = {};
      resultsData.forEach((r: { run_id: string; test_case_id: string; status: string }) => {
        const key = `${r.run_id}::${r.test_case_id}`;
        if (!(key in latestByKey)) latestByKey[key] = r.status;
      });

      const projectCounts: Record<string, { passed: number; total: number }> = {};
      Object.entries(latestByKey).forEach(([key, status]) => {
        const runId = key.split('::')[0];
        const pid = runProjectMap[runId];
        if (!pid) return;
        if (!projectCounts[pid]) projectCounts[pid] = { passed: 0, total: 0 };
        if (status !== 'untested') {
          projectCounts[pid].total++;
          if (status === 'passed') projectCounts[pid].passed++;
        }
      });
      for (const [pid, counts] of Object.entries(projectCounts)) {
        projectPassRates[pid] = counts.total > 0 ? Math.round((counts.passed / counts.total) * 100) : null;
      }

      if (prevStartDate && prevEndDate) {
        const allRunIdsForDelta = (
          await supabase.from('test_runs').select('id').in('project_id', projectIds)
        ).data?.map((r: { id: string }) => r.id) ?? [];

        if (allRunIdsForDelta.length > 0) {
          const { data: prevData } = await supabase
            .from('test_results')
            .select('run_id, test_case_id, status')
            .in('run_id', allRunIdsForDelta)
            .gte('created_at', prevStartDate)
            .lt('created_at', prevEndDate);

          const currentRate = computeRate(resultsData);
          const prevRate = computeRate(prevData ?? []);
          const delta = currentRate !== null && prevRate !== null
            ? parseFloat((currentRate - prevRate).toFixed(1))
            : null;
          passRateDelta = delta;
          passRateDeltaLabel = period === '7d' ? 'vs prev week' : 'vs prev 30d';
        }
      } else if (period === 'active_run') {
        passRateDelta = null;
        passRateDeltaLabel = 'vs prev run';
      }
    }
  }

  // Active runs count
  const { data: activeRunsData } = await supabase
    .from('test_runs')
    .select('id')
    .in('project_id', projectIds)
    .in('status', ['new', 'in_progress', 'paused', 'under_review']);
  const activeRunCount = activeRunsData?.length ?? 0;

  // Test cases created in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentTCData } = await supabase
    .from('test_cases')
    .select('id')
    .in('project_id', projectIds)
    .gte('created_at', sevenDaysAgo);
  const testCasesThisWeek = recentTCData?.length ?? 0;

  const { data: memberData2 } = await supabase
    .from('project_members')
    .select('project_id, user_id, profiles(full_name, email)')
    .in('project_id', projectIds);

  const projectMembers: Record<string, Array<{ initials: string; color: string; userId?: string; name?: string }>> = {};
  if (memberData2) {
    const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];
    memberData2.forEach((m) => {
      if (!projectMembers[m.project_id]) projectMembers[m.project_id] = [];
      const profile = (m as { project_id: string; user_id: string; profiles?: { full_name?: string; email?: string } | null }).profiles;
      const name = profile?.full_name || profile?.email || 'U';
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
      projectMembers[m.project_id].push({
        initials,
        color: COLORS[projectMembers[m.project_id].length % COLORS.length],
        userId: m.user_id,
        name: profile?.full_name || undefined,
      });
    });
  }

  return {
    projects: projectsData || [],
    testCaseCounts,
    testRunCounts,
    activeRunCount,
    testCasesThisWeek,
    projectPassRates,
    passRateDelta,
    passRateDeltaLabel,
    projectMembers,
    currentUserId,
    userProjectRoles,
  };
}

export default function ProjectsContent() {
  const { t } = useTranslation(['projects', 'common']);
  const navigate = useNavigate();
  const { createSampleProject } = useSampleProject();
  const { can } = usePermission();
  const [sampleLoading, setSampleLoading] = useState(false);
  const [tipsSampleLoading, setTipsSampleLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickCreateTCModal, setShowQuickCreateTCModal] = useState(false);
  const [quickCreateProject, setQuickCreateProject] = useState<{ id: string; name: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'name' | 'health' | 'created'>('activity');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['projects'],
    queryFn: loadProjectsData,
  });

  // Tier limit state for upsell
  const [subscriptionTier, setSubscriptionTier] = useState<number>(1);
  const TIER_PROJECT_LIMITS: Record<number, number> = { 1: 1, 2: 3, 3: 10, 4: Infinity, 5: Infinity, 6: Infinity, 7: Infinity };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
      setSubscriptionTier(profile?.subscription_tier ?? 1);
    });
  }, []);

  // Destructure from query data
  const projects = data?.projects ?? [];
  const testCaseCounts = data?.testCaseCounts ?? {};
  const testRunCounts = data?.testRunCounts ?? {};
  const activeRunCount = data?.activeRunCount ?? 0;
  const testCasesThisWeek = data?.testCasesThisWeek ?? 0;
  const projectPassRates = data?.projectPassRates ?? {};
  const passRateDelta = data?.passRateDelta ?? null;
  const passRateDeltaLabel = data?.passRateDeltaLabel ?? null;
  const projectMembers = data?.projectMembers ?? {};
  const currentUserId = data?.currentUserId ?? null;
  const userProjectRoles = data?.userProjectRoles ?? {};

  const clearActionParam = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('action');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
      clearActionParam();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if ((queryError as Error)?.message === 'UNAUTHENTICATED') navigate('/auth');
  }, [queryError]);

  // Refetch on every mount so navigating back to Dashboard always shows fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }, []);

  /** Check if a sample project already exists for the current user */
  const findExistingSample = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('name', 'Sample E-commerce App')
      .eq('owner_id', user.id)
      .maybeSingle();
    return data?.id ?? null;
  };

  const handleTrySample = async () => {
    if (sampleLoading) return;
    try {
      setSampleLoading(true);
      const existing = await findExistingSample();
      if (existing) {
        navigate(`/projects/${existing}`);
        return;
      }
      const projectId = await createSampleProject();
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('Sample project creation failed:', err);
      showToast("Couldn't create sample project. Please try again.", 'error');
    } finally {
      setSampleLoading(false);
    }
  };

  /** TipsBanner "Create Test Case" — picks most recent project, or shows no-project state */
  const handleTipCreateTC = () => {
    if (projects.length === 0) {
      // Show modal in no-project state (amber warning + Create Project CTA)
      setQuickCreateProject(null);
      setShowQuickCreateTCModal(true);
      return;
    }
    // Sort by created_at descending, pick the most recent
    const sorted = [...projects].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const target = sorted[0];
    setQuickCreateProject({ id: target.id, name: target.name });
    setShowQuickCreateTCModal(true);
  };

  /** TipsBanner "Explore Sample" */
  const handleTipExploreSample = async () => {
    if (tipsSampleLoading) return;
    try {
      setTipsSampleLoading(true);
      const existing = await findExistingSample();
      if (existing) {
        showToast('Opening your sample project...', 'success');
        navigate(`/projects/${existing}`);
        return;
      }
      const projectId = await createSampleProject();
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast("Sample project created! Explore the pre-configured test cases, runs, and milestones.", 'success');
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('Sample project creation failed:', err);
      showToast("Couldn't create sample project. Please try again.", 'error');
    } finally {
      setTipsSampleLoading(false);
    }
  };

  const handleCreateProject = async (data: { name: string; description: string; status: string; prefix: string; tags?: string[]; jiraProjectKey: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: insertError } = await supabase
        .from('projects')
        .insert([{
          name: data.name,
          description: data.description,
          status: data.status,
          prefix: data.prefix,
          jira_project_key: data.jiraProjectKey || null,
          tags: data.tags ?? [],
          owner_id: user.id,
        }]);
      if (insertError) throw insertError;

      const { data: newProjects, error: selectError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .eq('name', data.name)
        .order('created_at', { ascending: false })
        .limit(1);
      if (selectError) throw selectError;
      if (!newProjects || newProjects.length === 0) throw new Error('Project created but could not be loaded');

      const projectId = newProjects[0].id;

      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert([{ project_id: projectId, user_id: user.id, role: 'owner', invited_by: user.id }]);
        if (memberError) throw memberError;
      }

      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreateModal(false);
      void markOnboardingStep('createProject');
    } catch (error: any) {
      console.error('프로젝트 생성 오류:', error);
      showToast("Couldn't create project. Please try again.", 'error');
    }
  };

  const handleUpdateProject = async (id: string, data: { name: string; description: string; status: string; prefix: string; tags?: string[]; jiraProjectKey: string }) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description,
          status: data.status,
          prefix: data.prefix,
          jira_project_key: data.jiraProjectKey || null,
          tags: data.tags ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
      showToast("Couldn't update project. Please try again.", 'error');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeletingProject(null);
    } catch (error: any) {
      console.error('프로젝트 삭제 오류:', error);
      showToast("Couldn't delete project. Please try again.", 'error');
    }
  };

  const isSearchActive = searchQuery !== '';

  const sortedFilteredProjects = [...projects]
    .filter(p => (p as any).status !== 'archived')
    .filter(p => {
      if (!searchQuery.trim()) return true;
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'health': {
          const rateA = projectPassRates[a.id] ?? -1;
          const rateB = projectPassRates[b.id] ?? -1;
          return rateB - rateA;
        }
        case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'activity':
        default: return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      }
    });

  // ── Permission helper ───────────────────────────────────────────────────────
  const canDeleteProject = (project: Project) => {
    const role = userProjectRoles[project.id];
    return role === 'admin' || role === 'owner' || (project as any).owner_id === currentUserId;
  };

  // ── Computed stat card data ─────────────────────────────────────────────────
  const totalTestCases = Object.values(testCaseCounts).reduce((a, b) => a + b, 0);

  const passRates = Object.values(projectPassRates).filter((r): r is number => r !== null);
  const avgPassRate = passRates.length > 0
    ? parseFloat((passRates.reduce((a, b) => a + b, 0) / passRates.length).toFixed(1))
    : null;

  // Synthetic 7-day sparkline based on avg pass rate
  const passRateSparkline = avgPassRate !== null
    ? Array.from({ length: 7 }, (_, i) => {
        const variation = Math.sin(i * 1.5) * 3 + Math.cos(i * 0.7) * 2;
        return Math.max(0, Math.min(100, avgPassRate + variation - 2 + (i / 6) * 4));
      })
    : [];

  // Deduped team members across all projects
  const seenUserIds = new Set<string>();
  const allTeamMembers: Array<{ userId?: string; name?: string; email?: string }> = [];
  Object.values(projectMembers).forEach(members => {
    members.forEach(m => {
      const key = m.userId || m.name || m.initials;
      if (key && !seenUserIds.has(key)) {
        seenUserIds.add(key);
        allTeamMembers.push({ userId: m.userId, name: m.name });
      }
    });
  });

  const statCardsData: StatCardsData = {
    totalTestCases,
    testCasesDeltaThisWeek: testCasesThisWeek,
    activeRuns: activeRunCount,
    untestedRemaining: Math.max(0, totalTestCases - activeRunCount * 10),
    passRate: avgPassRate,
    passRateDelta: avgPassRate !== null ? passRateDelta : null,
    deltaLabel: passRateDeltaLabel,
    passRateSparkline,
    teamMemberCount: allTeamMembers.length,
    teamMembers: allTeamMembers,
  };

  // ── Sub-header (always visible, sticky) ──────────────────────────────────
  const SubHeader = (
    <div
      className="bg-white flex items-center px-6 gap-3 flex-shrink-0 sticky top-0 z-10"
      style={{ borderBottom: '1px solid #E2E8F0', padding: '0.625rem 1.5rem' }}
    >
      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>
        {t('projects:title')}
      </span>
      <span className="flex-1" />
      {/* Search */}
      <div className="relative">
        <i
          className="ri-search-line absolute top-1/2 -translate-y-1/2 text-slate-400"
          style={{ left: '0.625rem', fontSize: '0.875rem' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          style={{
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem 0.375rem 2rem',
            borderRadius: '0.5rem',
            border: '1px solid #E2E8F0',
            background: '#fff',
            color: '#334155',
            outline: 'none',
            width: '200px',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#6366F1')}
          onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
        />
      </div>
      {/* Sort */}
      <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: '#64748B' }}>
        <span>Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #E2E8F0',
            background: '#fff',
            color: '#334155',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <option value="activity">Last Activity</option>
          <option value="name">Name A–Z</option>
          <option value="health">Health (worst first)</option>
          <option value="created">Created Date</option>
        </select>
      </div>
      {/* New Project — Admin+ only */}
      {can('create_project') && (
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            border: '1px solid #6366F1',
            background: '#6366F1',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#4F46E5')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#6366F1')}
        >
          <i className="ri-add-line" /> New Project
        </button>
      )}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {SubHeader}
        <ProjectsGridSkeleton count={6} />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (queryError && (queryError as Error)?.message !== 'UNAUTHENTICATED') {
    return (
      <div className="flex flex-col">
        {SubHeader}
        <div className="flex items-center justify-center" style={{ padding: '4rem 2rem' }}>
          <p className="text-red-500">Couldn't load projects. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // ── State 0: Empty (no projects, no active search) ────────────────────────
  if (!isSearchActive && projects.length === 0) {
    return (
      <>
        <div className="flex flex-col" style={{ background: '#F8FAFC' }}>
          {SubHeader}
          <EmptyState
            onCreateProject={() => setShowCreateModal(true)}
            onTrySample={handleTrySample}
            isSampleLoading={sampleLoading}
            onImport={() => setShowImportModal(true)}
          />
        </div>
        {showCreateModal && (
          <CreateProjectModal onClose={() => { setShowCreateModal(false); clearActionParam(); }} onCreate={handleCreateProject} />
        )}
        {showImportModal && (
          <TestRailImportModal
            onClose={() => { setShowImportModal(false); queryClient.invalidateQueries({ queryKey: ['projects'] }); }}
            onOpenCSV={() => { showToast('Select a project first to use CSV import', 'info'); }}
          />
        )}
      </>
    );
  }

  // ── State 1–2: Sparse ─────────────────────────────────────────────────────
  if (!isSearchActive && projects.length <= 2) {
    return (
      <>
        <div className="flex flex-col" style={{ background: '#F8FAFC', minHeight: '100%' }}>
          {SubHeader}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {/* Project limit upsell banner */}
              {(() => {
                const maxProjects = TIER_PROJECT_LIMITS[subscriptionTier] ?? 1;
                const atLimit = isFinite(maxProjects) && projects.length >= maxProjects;
                const nearLimit = isFinite(maxProjects) && !atLimit && projects.length >= maxProjects - 1 && maxProjects > 1;
                if (atLimit) {
                  return (
                    <UpgradeBanner
                      message={`You've used ${projects.length} of ${maxProjects} project${maxProjects !== 1 ? 's' : ''} on your current plan. Upgrade to create more.`}
                      inline
                      className="mb-4"
                    />
                  );
                }
                if (nearLimit) {
                  return (
                    <UpgradeBanner
                      message={`You're using ${projects.length} of ${maxProjects} projects. You can create 1 more on your current plan.`}
                      inline
                      className="mb-4"
                    />
                  );
                }
                return null;
              })()}

              {/* Stat cards — show as soon as there is 1+ project */}
              <StatCards data={statCardsData} />
              <SparseState
                projects={projects}
                testCaseCounts={testCaseCounts}
                testRunCounts={testRunCounts}
                projectPassRates={projectPassRates}
                projectMembers={projectMembers}
                onCreateProject={() => setShowCreateModal(true)}
                onTrySample={handleTrySample}
                isSampleLoading={sampleLoading}
                onEditProject={setEditingProject}
                onDeleteProject={(p) => canDeleteProject(p) ? setDeletingProject(p) : showToast('Only project owner can delete', 'warning')}
                canDeleteProjectIds={new Set(projects.filter(canDeleteProject).map(p => p.id))}
                onTipCreateTC={handleTipCreateTC}
                onTipExploreSample={handleTipExploreSample}
                isTipsSampleLoading={tipsSampleLoading}
                onImport={() => setShowImportModal(true)}
              />
            </div>
          </div>
        </div>
        {showCreateModal && (
          <CreateProjectModal onClose={() => { setShowCreateModal(false); clearActionParam(); }} onCreate={handleCreateProject} />
        )}
        {editingProject && (
          <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onUpdate={handleUpdateProject} />
        )}
        {deletingProject && (
          <DeleteConfirmModal project={deletingProject} onClose={() => setDeletingProject(null)} onDelete={handleDeleteProject} />
        )}
        {showQuickCreateTCModal && (
          <QuickCreateTCModal
            projectId={quickCreateProject?.id}
            projectName={quickCreateProject?.name}
            onClose={() => { setShowQuickCreateTCModal(false); setQuickCreateProject(null); }}
            onCreated={(projectId, title) => {
              setShowQuickCreateTCModal(false);
              setQuickCreateProject(null);
              showToast(`Test case "${title}" created successfully`, 'success');
              navigate(`/projects/${projectId}/testcases`);
            }}
            onCreateProject={() => {
              setShowQuickCreateTCModal(false);
              setQuickCreateProject(null);
              setShowCreateModal(true);
            }}
          />
        )}
        {showImportModal && (
          <TestRailImportModal
            onClose={() => { setShowImportModal(false); queryClient.invalidateQueries({ queryKey: ['projects'] }); }}
            onOpenCSV={() => { /* CSV import is project-specific; guide to a project first */ showToast('Select a project first to use CSV import', 'info'); }}
          />
        )}
      </>
    );
  }

  // ── State 3+: Normal full layout ──────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col" style={{ background: '#F8FAFC', minHeight: '100%' }}>
        {SubHeader}

        <div style={{ padding: '1.5rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* New stat cards */}
          <StatCards data={statCardsData} />

          {/* Project grid */}
          {sortedFilteredProjects.length === 0 ? (
            <div className="text-center bg-white rounded-xl" style={{ padding: '3rem 2rem', border: '1px solid #E2E8F0' }}>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto" style={{ marginBottom: '1rem' }}>
                <i className="ri-folder-line text-3xl text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900" style={{ marginBottom: '0.5rem' }}>
                {t('projects:noSearchResults')}
              </h3>
              <p className="text-gray-500 text-sm">{t('projects:tryDifferentSearch')}</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
                gap: '1rem',
              }}
            >
              {sortedFilteredProjects.map((project, index) => {
                const passRate = projectPassRates[project.id] ?? null;
                const health = getProjectHealth(passRate);
                const healthStyles = HEALTH_STYLES[health.color];
                const members = projectMembers[project.id] || [];
                const activeRuns = testRunCounts[project.id] || 0;

                return (
                  <div
                    key={project.id}
                    className="bg-white cursor-pointer"
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      transition: 'all 0.2s ease',
                      animation: `fadeInUp 0.4s ease-out ${index * 50}ms backwards`,
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = '#C7D2FE';
                      el.style.boxShadow = '0 4px 16px rgba(99,102,241,0.08)';
                      el.style.transform = 'translateY(-1px)';
                      queryClient.prefetchQuery({
                        queryKey: ['project-detail', project.id],
                        queryFn: () => loadProjectDetailData(project.id),
                        staleTime: 30_000,
                      });
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = '#E2E8F0';
                      el.style.boxShadow = '';
                      el.style.transform = '';
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between" style={{ marginBottom: '0.375rem' }}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: '#EEF2FF' }}
                        >
                          <i className="ri-folder-3-line" style={{ fontSize: '1rem', color: '#6366F1' }} />
                        </div>
                        <span
                          className="truncate"
                          style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}
                        >
                          {project.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${healthStyles.badge}`}
                          style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
                        >
                          <span className={`rounded-full ${healthStyles.dot}`} style={{ width: '6px', height: '6px', display: 'inline-block' }} />
                          {health.label}
                        </span>
                        {/* 3-dot menu */}
                        <div
                          className="relative"
                          ref={openMenuId === project.id ? menuRef : null}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === project.id ? null : project.id);
                            }}
                            className="flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            style={{ width: '1.75rem', height: '1.75rem' }}
                          >
                            <i className="ri-more-2-fill" style={{ fontSize: '1rem' }} />
                          </button>
                          {openMenuId === project.id && (
                            <div
                              className="absolute right-0 bg-white rounded-lg shadow-lg z-10"
                              style={{ top: 'calc(100% + 4px)', width: '11rem', border: '1px solid #E2E8F0' }}
                            >
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingProject(project);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                style={{ padding: '0.5rem 1rem' }}
                              >
                                <i className="ri-edit-line" />
                                {t('common:edit')}
                              </button>
                              {canDeleteProject(project) ? (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeletingProject(project);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                  style={{ padding: '0.5rem 1rem' }}
                                >
                                  <i className="ri-delete-bin-line" />
                                  {t('common:delete')}
                                </button>
                              ) : (
                                <div
                                  title="Only project owner can delete"
                                  className="w-full text-left text-sm text-gray-300 flex items-center gap-2"
                                  style={{ padding: '0.5rem 1rem', cursor: 'not-allowed' }}
                                >
                                  <i className="ri-delete-bin-line" />
                                  {t('common:delete')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p
                      className="line-clamp-2"
                      style={{
                        fontSize: '0.8125rem',
                        color: '#64748B',
                        margin: '0.375rem 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {project.description || t('projects:noDescription')}
                    </p>

                    {/* Tags */}
                    {(project as any).tags && (project as any).tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 mb-1">
                        {((project as any).tags as string[]).slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[0.625rem] font-medium"
                            style={{ lineHeight: 1.4 }}
                          >
                            <i className="ri-price-tag-3-line mr-0.5" style={{ fontSize: '0.5rem' }} />
                            {tag}
                          </span>
                        ))}
                        {(project as any).tags.length > 4 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded text-[0.625rem]">
                            +{(project as any).tags.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats row */}
                    <div
                      className="flex items-center"
                      style={{ gap: '1rem', marginBottom: '0.75rem' }}
                    >
                      <span
                        className="flex items-center gap-1"
                        style={{ fontSize: '0.75rem', color: '#64748B' }}
                      >
                        <i className="ri-play-circle-line" style={{ fontSize: '0.875rem' }} />
                        {activeRuns} active run{activeRuns !== 1 ? 's' : ''}
                      </span>
                      <span className="flex-1" />
                      {/* Member avatars */}
                      {members.length > 0 && (
                        <div className="flex items-center">
                          {members.slice(0, 4).map((m, i) => (
                            <Avatar
                              key={i}
                              userId={(m as typeof m & { userId?: string }).userId}
                              name={(m as typeof m & { name?: string }).name}
                              size="xs"
                              style={{
                                marginLeft: i === 0 ? 0 : '-0.3rem',
                                border: '2px solid #fff',
                              }}
                              title={m.initials}
                            />
                          ))}
                          {members.length > 4 && (
                            <span style={{ fontSize: '0.6875rem', color: '#94A3B8', marginLeft: '0.375rem' }}>
                              +{members.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Activity footer */}
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        fontSize: '0.75rem',
                        color: '#94A3B8',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <i className="ri-time-line" style={{ fontSize: '0.875rem' }} />
                      <span>Updated {timeAgo(project.updated_at || project.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>{/* /maxWidth */}
        </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal onClose={() => { setShowCreateModal(false); clearActionParam(); }} onCreate={handleCreateProject} />
      )}
      {editingProject && (
        <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} onUpdate={handleUpdateProject} />
      )}
      {deletingProject && (
        <DeleteConfirmModal project={deletingProject} onClose={() => setDeletingProject(null)} onDelete={handleDeleteProject} />
      )}
    </>
  );
}
