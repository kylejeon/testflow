import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, type Project } from '../../../lib/supabase';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import EmptyState from './EmptyState';
import SparseState from './SparseState';
import StatCards, { type StatCardsData } from './StatCards';
import { Avatar } from '../../../components/Avatar';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCaseCounts, setTestCaseCounts] = useState<Record<string, number>>({});
  const [testRunCounts, setTestRunCounts] = useState<Record<string, number>>({});
  const [activeRunCount, setActiveRunCount] = useState(0);
  const [testCasesThisWeek, setTestCasesThisWeek] = useState(0);
  const [projectPassRates, setProjectPassRates] = useState<Record<string, number | null>>({});
  const [projectMembers, setProjectMembers] = useState<Record<string, Array<{ initials: string; color: string; userId?: string; name?: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
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

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError('세션을 확인할 수 없습니다.');
        navigate('/auth');
        return;
      }
      if (!session) {
        navigate('/auth');
        return;
      }

      const user = session.user;

      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

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

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      const { data: testCasesData, error: testCasesError } = await supabase
        .from('test_cases')
        .select('project_id')
        .in('project_id', projectIds);

      if (!testCasesError && testCasesData) {
        const counts: Record<string, number> = {};
        testCasesData.forEach(tc => { counts[tc.project_id] = (counts[tc.project_id] || 0) + 1; });
        setTestCaseCounts(counts);
      }

      const { data: testRunsData, error: testRunsError } = await supabase
        .from('test_runs')
        .select('project_id')
        .in('project_id', projectIds);

      if (!testRunsError && testRunsData) {
        const counts: Record<string, number> = {};
        testRunsData.forEach(tr => { counts[tr.project_id] = (counts[tr.project_id] || 0) + 1; });
        setTestRunCounts(counts);
      }

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

      // Active runs count
      const { data: activeRunsData } = await supabase
        .from('test_runs')
        .select('id')
        .in('project_id', projectIds)
        .eq('status', 'active');
      setActiveRunCount(activeRunsData?.length ?? 0);

      // Test cases created in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTCData } = await supabase
        .from('test_cases')
        .select('id')
        .in('project_id', projectIds)
        .gte('created_at', sevenDaysAgo);
      setTestCasesThisWeek(recentTCData?.length ?? 0);

      const { data: memberData2 } = await supabase
        .from('project_members')
        .select('project_id, user_id, profiles(full_name, email)')
        .in('project_id', projectIds);

      if (memberData2) {
        const membersByProject: Record<string, Array<{ initials: string; color: string; userId?: string; name?: string }>> = {};
        const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];
        memberData2.forEach((m) => {
          if (!membersByProject[m.project_id]) membersByProject[m.project_id] = [];
          const profile = (m as { project_id: string; user_id: string; profiles?: { full_name?: string; email?: string } | null }).profiles;
          const name = profile?.full_name || profile?.email || 'U';
          const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          membersByProject[m.project_id].push({
            initials,
            color: COLORS[membersByProject[m.project_id].length % COLORS.length],
            userId: m.user_id,
            name: profile?.full_name || undefined,
          });
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

      const { error: insertError } = await supabase
        .from('projects')
        .insert([{
          name: data.name,
          description: data.description,
          status: data.status,
          prefix: data.prefix,
          jira_project_key: data.jiraProjectKey || null,
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
      if (!newProjects || newProjects.length === 0) throw new Error('프로젝트 생성 후 조회 실패');

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
          .insert([{ project_id: projectId, user_id: user.id, role: 'admin', invited_by: user.id }]);
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
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      await fetchProjects();
      setDeletingProject(null);
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
    }
  };

  const isSearchActive = searchQuery !== '';

  const sortedFilteredProjects = [...projects]
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
    passRateDelta: avgPassRate !== null ? 2.1 : null,
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
          className="ri-search-line absolute top-1/2 -translate-y-1/2 text-[#94A3B8]"
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
      {/* New Project */}
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
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col">
        {SubHeader}
        <div className="flex items-center justify-center" style={{ padding: '4rem 2rem' }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common:loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col">
        {SubHeader}
        <div className="flex items-center justify-center" style={{ padding: '4rem 2rem' }}>
          <p className="text-red-500">{error}</p>
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
          />
        </div>
        {showCreateModal && (
          <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateProject} />
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
              />
            </div>
          </div>
        </div>
        {showCreateModal && (
          <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateProject} />
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
                        margin: '0.375rem 0 1rem 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {project.description || t('projects:noDescription')}
                    </p>

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
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateProject} />
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
