import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, type Project } from '../../../lib/supabase';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function ProjectsContent() {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCaseCounts, setTestCaseCounts] = useState<Record<string, number>>({});
  const [testRunCounts, setTestRunCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch projects where user is a member
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
    } catch (error) {
      console.error('프로젝트 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (data: { name: string; description: string; status: string }) => {
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

  const handleUpdateProject = async (id: string, data: { name: string; description: string; status: string }) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: data.name,
          description: data.description,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setProjects(projects.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p));
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

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesStatus && matchesSearch;
  });

  const stats = [
    {
      label: '전체 프로젝트',
      value: projects.length.toString(),
      icon: 'ri-folder-line',
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      label: '활성 프로젝트',
      value: projects.filter(p => p.status === 'active').length.toString(),
      icon: 'ri-play-circle-line',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: '보관된 프로젝트',
      value: projects.filter(p => p.status === 'archived').length.toString(),
      icon: 'ri-archive-line',
      color: 'text-gray-600',
      bg: 'bg-gray-50',
    },
    {
      label: '이번 달 생성',
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
      'bg-teal-500',
      'bg-emerald-500',
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
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">프로젝트</h1>
              <p className="text-gray-600">테스트 프로젝트를 생성하고 관리하세요</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
              새 프로젝트
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
              <h2 className="text-xl font-bold text-gray-900">프로젝트 목록</h2>
              <div className="flex items-center gap-3">
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
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="all">모든 상태</option>
                  <option value="active">활성</option>
                  <option value="archived">보관됨</option>
                </select>
              </div>
            </div>
            
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="p-6">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-folder-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery || filterStatus !== 'all' ? '검색 결과가 없습니다' : '프로젝트가 없습니다'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || filterStatus !== 'all' ? '다른 검색어나 필터를 시도해보세요' : '첫 번째 테스트 프로젝트를 생성해보세요'}
                </p>
                {!searchQuery && filterStatus === 'all' && (
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-all font-semibold cursor-pointer whitespace-nowrap"
                  >
                    새 프로젝트 만들기
                  </button>
                )}
              </div>
            ) : (
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-6' : 'space-y-4'}>
                {filteredProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-teal-500 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <div className={`w-12 h-12 ${getProjectColor(index)} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                          {project.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1 hover:text-teal-600 transition-colors">{project.name}</h3>
                          <p className="text-sm text-gray-600 line-clamp-1">{project.description || '설명 없음'}</p>
                        </div>
                      </Link>
                      <div className="relative group">
                        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                          <i className="ri-more-2-fill text-xl"></i>
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => setEditingProject(project)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                            수정
                          </button>
                          <button
                            onClick={() => setDeletingProject(project)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                          >
                            <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">테스트 케이스</div>
                        <div className="text-lg font-bold text-gray-900">{testCaseCounts[project.id] || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">테스트 실행</div>
                        <div className="text-lg font-bold text-gray-900">{testRunCounts[project.id] || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">생성일</div>
                        <div className="text-sm font-semibold text-gray-700">
                          {new Date(project.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <i className={`${project.status === 'active' ? 'ri-checkbox-circle-fill' : 'ri-archive-line'} mr-1 w-3 h-3 flex items-center justify-center`}></i>
                        {project.status === 'active' ? '활성' : '보관됨'}
                      </span>
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        상세보기
                        <i className="ri-arrow-right-line w-4 h-4 flex items-center justify-center"></i>
                      </Link>
                    </div>
                  </div>
                ))}
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
