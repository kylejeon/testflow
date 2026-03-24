import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, type Project } from '../../../lib/supabase';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import EmptyState from './EmptyState';
import SparseState from './SparseState';
import { useTranslation } from 'react-i18next';
import { useSampleProject } from '../../../hooks/useSampleProject';

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

export default function ProjectsContent() {
  const { t } = useTranslation(['projects', 'common']);
  const navigate = useNavigate();
  const { createSampleProject } = useSampleProject();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCaseCounts, setTestCaseCounts] = useState<Record<string, number>>({});
  const [testRunCounts, setTestRunCounts] = useState<Record<string, number>>({});
  const [projectPassRates, setProjectPassRates] = useState<Record<string, number | null>>({});
  const [projectMembers, setProjectMembers] = useState<Record<string, Array<{ initials: string; color: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'name' | 'health' | 'created'>('activity');
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('세션 확인 오류:', sessionError);
        setError('세션을 확인할 수 없습니다.');
        navigate('/auth');
        return;
      }

      if (!session) {
        console.log('세션이 없습니다. 로그인 페이지로 이동합니다.');
        navigate('/auth');
        return;
      }

      const user = session.user;

      // Fetch projects where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('멤버 데이터 조회 오류:', memberError);
        throw memberError;
      }

      const projectIds = memberData?.map(m => m.project_id) || [];

      if (projectIds.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('프로젝트 데이터 조회 오류:', projectsError);
        throw projectsError;
      }

      setProjects(projectsData || []);

      // Fetch test case counts for each project
      const { data: testCasesData, error: testCasesError } = await supabase
        .from('test_cases')
        .select('project_id')
        .in('project_id', projectIds);

      if (!testCasesError && testCasesData) {
        const counts: Record<string, number> = {};
        testCasesData.forEach(tc => {
          counts[tc.project_id] = (counts[tc.project_id] || 0) + 1;
        });
        setTestCaseCounts(counts);
      }

      // Fetch test run counts for each project
      const { data: testRunsData, error: testRunsError } = await supabase
        .from('test_runs')
        .select('project_id')
        .in('project_id', projectIds);

      if (!testRunsError && testRunsData) {
        const counts: Record<string, number> = {};
        testRunsData.forEach(tr => {
          counts[tr.project_id] = (counts[tr.project_id] || 0) + 1;
        });
        setTestRunCounts(counts);
      }

      // Fetch test run pass rates per project
      const { data: testRunStatsData } = await supabase
        .from('test_runs')
        .select('project_id, passed, failed, blocked, retest')
        .in('project_id', projectIds);

      if (testRunStatsData) {
        const passRates: Record<string, number | null> = {};
        const grouped: Record<string, typeof testRunStatsData> = {};
        testRunStatsData.forEach(r => {
          if (!grouped[r.project_id]) grouped[r.project_id] = [];
          grouped[r.project_id].push(r);
        });
        for (const [pid, runs] of Object.entries(grouped)) {
          const totalTested = runs.reduce((acc, r) => acc + (r.passed || 0) + (r.failed || 0) + (r.blocked || 0) + (r.retest || 0), 0);
          const totalPassed = runs.reduce((acc, r) => acc + (r.passed || 0), 0);
          passRates[pid] = totalTested > 0 ? Math.round((totalPassed / totalTested) * 100) : null;
        }
        setProjectPassRates(passRates);
      }

      // Fetch member counts per project
      const { data: memberData2 } = await supabase
        .from('project_members')
        .select('project_id, user_id, profiles(full_name, email)')
        .in('project_id', projectIds);

      if (memberData2) {
        const membersByProject: Record<string, Array<{ initials: string; color: string }>> = {};
        const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];
        memberData2.forEach((m) => {
          if (!membersByProject[m.project_id]) membersByProject[m.project_id] = [];
          const profile = (m as { project_id: string; user_id: string; profiles?: { full_name?: string; email?: string } | null }).profiles;
          const name = profile?.full_name || profile?.email || 'U';
          const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          membersByProject[m.project_id].push({ initials, color: COLORS[membersByProject[m.project_id].length % COLORS.length] });
        });
        setProjectMembers(membersByProject);
      }
    } catch (error) {
      console.error('프로젝트 로딩 오류:', error);
      setError('프로젝트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrySample = async () => {
    if (sampleLoading) return;
    try {
      setSampleLoading(true);
      const projectId = await createSampleProject();
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Sample project creation failed:', err);
      alert('샘플 프로젝트 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSampleLoading(false);
    }
  };

  const handleCreateProject = async (data: { name: string; description: string; status: string; prefix: string; jiraProjectKey: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 프로젝트 생성 (SELECT 없이)
      const { error: insertError } = await supabase
        .from('projects')
        .insert([{
          name: data.name,
          description: data.description,
          status: data.status,
          prefix: data.prefix,
          jira_project_key: data.jiraProjectKey || null,
          owner_id: user.id
        }]);

      if (insertError) throw insertError;

      // 방금 생성한 프로젝트 ID 조회 (owner_id로 필터링)
      const { data: newProjects, error: selectError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .eq('name', data.name)
        .order('created_at', { ascending: false })
        .limit(1);

      if (selectError) throw selectError;
      if (!newProjects || newProjects.length === 0) throw new Error('프로젝트 생성 후 조회 실패');

      const projectId = newProjects[0].id;

      // 이미 멤버로 추가되어 있는지 확인
      const { data: existingMember } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      // 멤버로 추가되어 있지 않은 경우에만 추가
      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert([{
            project_id: projectId,
            user_id: user.id,
            role: 'admin',
            invited_by: user.id
          }]);

        if (memberError) throw memberError;
      }

      await fetchProjects();
      setShowCreateModal(false);
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      alert('프로젝트 생성에 실패했습니다.');
    }
  };

  const handleUpdateProject = async (id: string, data: { name: string; description: string; status: string; prefix: string; jiraProjectKey: string }) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description,
          status: data.status,
          prefix: data.prefix,
          jira_project_key: data.jiraProjectKey || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setProjects(projects.map(p => p.id === id ? { ...p, ...data, jira_project_key: data.jiraProjectKey || null, updated_at: new Date().toISOString() } : p));
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('프로젝트 수정에 실패했습니다.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProjects();
      setDeletingProject(null);
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
    }
  };

  // Sparse-state logic: based on total project count (not filtered),
  // so onboarding UI only appears when the user genuinely has 0–2 projects.
  const isSearchActive = searchQuery !== '' || filterStatus !== 'all';

  // ── Sorted + filtered project list ─────────────────────────────────────────
  const sortedFilteredProjects = [...projects]
    .filter(p => {
      if (filterStatus !== 'all') return p.status === filterStatus;
      return true;
    })
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

  const stats = [
    {
      label: t('projects:allProjects'),
      value: projects.length.toString(),
      icon: 'ri-folder-line',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: t('common:active'),
      value: projects.filter(p => p.status === 'active').length.toString(),
      icon: 'ri-play-circle-line',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: t('common:archived'),
      value: projects.filter(p => p.status === 'archived').length.toString(),
      icon: 'ri-archive-line',
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
    {
      label: t('projects:createdThisMonth'),
      value: projects.filter(p => {
        const projectDate = new Date(p.created_at);
        const now = new Date();
        return projectDate.getMonth() === now.getMonth() && projectDate.getFullYear() === now.getFullYear();
      }).length.toString(),
      icon: 'ri-calendar-line',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  const getProjectColor = (index: number) => {
    const colors = [
      'bg-indigo-500',
      'bg-violet-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-fuchsia-500',
      'bg-rose-500',
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // ── State 0: Empty (no projects, no active search) ────────────────────────
  if (!isSearchActive && projects.length === 0) {
    return (
      <>
        <EmptyState
          onCreateProject={() => setShowCreateModal(true)}
          onTrySample={handleTrySample}
          isSampleLoading={sampleLoading}
        />
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateProject}
          />
        )}
      </>
    );
  }

  // ── State 1–2: Sparse (1–2 total projects, no active search) ───────────────
  if (!isSearchActive && projects.length <= 2) {
    return (
      <>
        <div className="p-6">
          {/* Minimal header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('projects:title')}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{t('projects:subtitle')}</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-lg"></i>
              {t('projects:createProject')}
            </button>
          </div>

          <SparseState
            projects={projects}
            testCaseCounts={testCaseCounts}
            testRunCounts={testRunCounts}
            onCreateProject={() => setShowCreateModal(true)}
            onTrySample={handleTrySample}
            isSampleLoading={sampleLoading}
          />
        </div>

        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateProject}
          />
        )}
        {editingProject && (
          <EditProjectModal
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onUpdate={handleUpdateProject}
          />
        )}
        {deletingProject && (
          <DeleteConfirmModal
            project={deletingProject}
            onClose={() => setDeletingProject(null)}
            onDelete={handleDeleteProject}
          />
        )}
      </>
    );
  }

  // ── State 3+: Normal full layout ────────────────────────────────────────────
  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('projects:title')}</h1>
              <p className="text-gray-600">{t('projects:subtitle')}</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
              {t('projects:createProject')}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                    <i className={`${stat.icon} text-2xl ${stat.color}`}></i>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('projects:projectList')}</h2>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setView('grid')}
                    className={`px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <i className="ri-grid-line text-lg"></i>
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`px-3 py-2 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      view === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <i className="ri-list-check text-lg"></i>
                  </button>
                </div>
                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">{t('projects:allStatus')}</option>
                  <option value="active">{t('common:active')}</option>
                  <option value="archived">{t('common:archived')}</option>
                </select>
              </div>
            </div>

            {/* Search + Sort row */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400 w-48 text-gray-700"
                />
              </div>
              {/* Sort */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-indigo-400"
                >
                  <option value="activity">Last Activity</option>
                  <option value="name">Name A–Z</option>
                  <option value="health">Health</option>
                  <option value="created">Created Date</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {sortedFilteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-folder-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('projects:noSearchResults')}
                </h3>
                <p className="text-gray-600 mb-6">{t('projects:tryDifferentSearch')}</p>
              </div>
            ) : (
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-6' : 'space-y-4'}>
                {sortedFilteredProjects.map((project, index) => {
                  const passRate = projectPassRates[project.id] ?? null;
                  const health = getProjectHealth(passRate);
                  const healthStyles = HEALTH_STYLES[health.color];
                  const members = projectMembers[project.id] || [];

                  return (
                    <div
                      key={project.id}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-500 transition-all"
                    >
                      {/* Top row: icon + name + health badge + menu */}
                      <div className="flex items-start justify-between mb-4">
                        <Link
                          to={`/projects/${project.id}`}
                          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                        >
                          <div className={`w-12 h-12 ${getProjectColor(index)} rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                            {project.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <h3 className="text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors leading-tight">{project.name}</h3>
                              {/* Health badge */}
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${healthStyles.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${healthStyles.dot}`}></span>
                                {health.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{project.description || t('projects:noDescription')}</p>
                          </div>
                        </Link>
                        <div className="relative flex-shrink-0 ml-2" ref={openMenuId === project.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === project.id ? null : project.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                          >
                            <i className="ri-more-2-fill text-xl"></i>
                          </button>
                          {openMenuId === project.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingProject(project);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                              >
                                <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                                {t('common:edit')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeletingProject(project);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                              >
                                <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                                {t('common:delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{t('common:testCases')}</div>
                          <div className="text-lg font-bold text-gray-900">{testCaseCounts[project.id] || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{t('projects:testRuns')}</div>
                          <div className="text-lg font-bold text-gray-900">{testRunCounts[project.id] || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{t('common:createdAt')}</div>
                          <div className="text-sm font-semibold text-gray-700">
                            {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: status badge + active runs + member avatars + view link */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <i className={`${project.status === 'active' ? 'ri-checkbox-circle-fill' : 'ri-archive-line'} mr-1 w-3 h-3 flex items-center justify-center`}></i>
                            {project.status === 'active' ? t('common:active') : t('common:archived')}
                          </span>
                          {(testRunCounts[project.id] || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600">
                              <i className="ri-play-circle-line text-xs"></i>
                              {testRunCounts[project.id]} active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                          {/* Member avatars */}
                          {members.length > 0 && (
                            <div className="flex items-center">
                              {members.slice(0, 4).map((m, i) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white font-bold flex-shrink-0"
                                  style={{ background: m.color, fontSize: '0.4375rem', marginLeft: i > 0 ? '-0.3rem' : '0' }}
                                  title={m.initials}
                                >
                                  {m.initials}
                                </div>
                              ))}
                              {members.length > 4 && (
                                <span className="text-xs text-gray-400 ml-1">+{members.length - 4}</span>
                              )}
                            </div>
                          )}
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            {t('projects:viewDetails')}
                            <i className="ri-arrow-right-line w-4 h-4 flex items-center justify-center"></i>
                          </Link>
                        </div>
                      </div>

                      {/* Activity footer */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-2.5 border-t border-gray-100 mt-3">
                        <i className="ri-time-line text-sm"></i>
                        <span>Updated {timeAgo(project.updated_at || project.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={handleUpdateProject}
        />
      )}

      {deletingProject && (
        <DeleteConfirmModal
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
          onDelete={handleDeleteProject}
        />
      )}
    </>
  );
}
