import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TestCaseList from './components/TestCaseList';

export default function ProjectTestCases() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

      const { data: testCasesData, error: testCasesError } = await supabase
        .from('test_cases')
        .select(`
          *,
          creator:profiles!test_cases_created_by_fkey(full_name, email)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (testCasesError) throw testCasesError;
      setTestCases(testCasesData || []);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestCase = async (testCase: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('test_cases')
        .insert([{ ...testCase, project_id: id, created_by: user?.id }])
        .select(`
          *,
          creator:profiles!test_cases_created_by_fkey(full_name, email)
        `)
        .single();

      if (error) throw error;

      // 생성 히스토리 기록
      if (data && user) {
        await supabase.from('test_case_history').insert({
          test_case_id: data.id,
          user_id: user.id,
          action_type: 'created',
        });
      }

      setTestCases([data, ...testCases]);
    } catch (error) {
      console.error('테스트 케이스 추가 오류:', error);
    }
  };

  const handleUpdateTestCase = async (updatedTestCase: any) => {
    try {
      const { creator, ...updateData } = updatedTestCase;
      
      const { error } = await supabase
        .from('test_cases')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', updatedTestCase.id);

      if (error) throw error;
      setTestCases(testCases.map(tc => tc.id === updatedTestCase.id ? updatedTestCase : tc));
    } catch (error) {
      console.error('테스트 케이스 수정 오류:', error);
    }
  };

  const handleDeleteTestCase = async (testCaseId: string) => {
    try {
      const { error } = await supabase
        .from('test_cases')
        .delete()
        .eq('id', testCaseId);

      if (error) throw error;
      setTestCases(testCases.filter(tc => tc.id !== testCaseId));
    } catch (error) {
      console.error('테스트 케이스 삭제 오류:', error);
    }
  };

  const handleRestoreToBefore = async () => {
    // This function is no longer needed as restoration is handled in TestCaseList component
    // Keeping it here for backward compatibility but it won't be called
  };

  const filteredTestCases = testCases.filter(testCase => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || testCase.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
                  <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                    <i className="ri-test-tube-line text-xl text-white"></i>
                  </div>
                  <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                    TestFlow
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative" ref={profileMenuRef}>
                  <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                  >
                    JK
                  </div>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <Link
                        to="/settings"
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg"></i>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          alert('로그아웃되었습니다.');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg"></i>
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">로딩 중...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <i className="ri-test-tube-line text-xl text-white"></i>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                  TestFlow
                </span>
              </Link>
              
              <div className="text-gray-300 text-xl mx-2">/</div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <i className="ri-folder-line text-white text-sm"></i>
                </div>
                <span className="text-lg font-semibold text-gray-900">{project?.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1">
                <Link 
                  to={`/projects/${id}`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Overview
                </Link>
                <Link 
                  to={`/projects/${id}/milestones`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Milestones
                </Link>
                <Link 
                  to={`/projects/${id}/documentation`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Documentation
                </Link>
                <Link 
                  to={`/projects/${id}/testcases`}
                  className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg cursor-pointer"
                >
                  Test Cases
                </Link>
                <Link 
                  to={`/projects/${id}/runs`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Runs & Results
                </Link>
                <Link 
                  to={`/projects/${id}/sessions`}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Sessions
                </Link>
              </nav>
              
              <div className="flex items-center gap-3">
                <div className="relative" ref={profileMenuRef}>
                  <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                  >
                    JK
                  </div>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <Link
                        to="/settings"
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg"></i>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          alert('로그아웃되었습니다.');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                      >
                        <i className="ri-logout-box-line text-lg"></i>
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test Cases</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {project?.name} • {filteredTestCases.length} test cases
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg w-5 h-5 flex items-center justify-center"></i>
                    <input
                      type="text"
                      placeholder="Search test cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm cursor-pointer"
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <TestCaseList
                testCases={filteredTestCases}
                onAdd={handleAddTestCase}
                onUpdate={handleUpdateTestCase}
                onDelete={handleDeleteTestCase}
                projectId={id!}
              />
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
