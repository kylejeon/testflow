import { LogoMark } from '../../components/Logo';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TestCaseList from './components/TestCaseList';
import AIGenerateModal from './components/AIGenerateModal';
import ProjectHeader from '../../components/ProjectHeader';

export default function ProjectTestCases() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | 'draft' | 'active' | 'deprecated'>('all');

  // Toast state
  const [lcToast, setLcToast] = useState<{ show: boolean; tcId: string; phase: 'draft' | 'active' }>({ show: false, tcId: '', phase: 'draft' });
  const lcToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string; subscription_tier: number; avatar_emoji: string } | null>(null);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 2:
        return { name: 'Starter', icon: 'ri-vip-crown-line', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' };
      case 3:
        return { name: 'Professional', icon: 'ri-vip-diamond-line', color: 'bg-violet-50 text-violet-700 border-violet-300' };
      case 4:
        return { name: 'Enterprise', icon: 'ri-vip-diamond-line', color: 'bg-amber-50 text-amber-700 border-amber-300' };
      default:
        return { name: 'Free', icon: 'ri-user-line', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const tierInfo = getTierInfo(userProfile?.subscription_tier || 1);

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

      // 프로젝트 prefix를 DB에서 직접 조회 (상태 의존 제거)
      const { data: projectData } = await supabase
        .from('projects')
        .select('prefix')
        .eq('id', id)
        .maybeSingle();

      const prefix = projectData?.prefix;

      // custom_id 자동 생성 (prefix가 있을 경우)
      let custom_id: string | undefined;
      if (prefix) {
        // 현재 프로젝트의 테스트 케이스 중 custom_id가 있는 것들의 최대 번호 조회
        const { data: existingCases } = await supabase
          .from('test_cases')
          .select('custom_id')
          .eq('project_id', id)
          .not('custom_id', 'is', null);

        let maxNum = 0;
        if (existingCases && existingCases.length > 0) {
          existingCases.forEach((tc: any) => {
            if (tc.custom_id) {
              const match = tc.custom_id.match(/-(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          });
        }
        custom_id = `${prefix}-${maxNum + 1}`;
      }

      const { data, error } = await supabase
        .from('test_cases')
        .insert([{ ...testCase, lifecycle_status: 'draft', project_id: id, created_by: user?.id, ...(custom_id ? { custom_id } : {}) }])
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

      // Show "created as Draft" toast
      if (lcToastTimerRef.current) clearTimeout(lcToastTimerRef.current);
      setLcToast({ show: true, tcId: data.id, phase: 'draft' });
      lcToastTimerRef.current = setTimeout(() => setLcToast(t => ({ ...t, show: false })), 5000);
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

      // 업데이트된 데이터를 creator 정보와 함께 다시 조회
      const { data: refreshedData, error: fetchError } = await supabase
        .from('test_cases')
        .select(`
          *,
          creator:profiles!test_cases_created_by_fkey(full_name, email)
        `)
        .eq('id', updatedTestCase.id)
        .single();

      if (fetchError) throw fetchError;

      // 상태 업데이트
      setTestCases(testCases.map(tc => tc.id === updatedTestCase.id ? refreshedData : tc));
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

  // 기존 케이스에 ID 일괄 부여
  const handleAssignMissingIds = async () => {
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('prefix')
        .eq('id', id)
        .maybeSingle();

      const prefix = projectData?.prefix;
      if (!prefix) {
        alert('프로젝트에 Prefix가 설정되어 있지 않습니다. 프로젝트 설정에서 Prefix를 먼저 설정해주세요.');
        return;
      }

      // custom_id가 없는 케이스들 조회 (생성일 오름차순)
      const { data: casesWithoutId } = await supabase
        .from('test_cases')
        .select('id, custom_id, created_at')
        .eq('project_id', id)
        .is('custom_id', null)
        .order('created_at', { ascending: true });

      if (!casesWithoutId || casesWithoutId.length === 0) {
        alert('모든 테스트 케이스에 이미 ID가 부여되어 있습니다.');
        return;
      }

      // 현재 최대 번호 조회
      const { data: existingCases } = await supabase
        .from('test_cases')
        .select('custom_id')
        .eq('project_id', id)
        .not('custom_id', 'is', null);

      let maxNum = 0;
      if (existingCases && existingCases.length > 0) {
        existingCases.forEach((tc: any) => {
          if (tc.custom_id) {
            const match = tc.custom_id.match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
      }

      // 순차적으로 ID 부여
      for (let i = 0; i < casesWithoutId.length; i++) {
        const newId = `${prefix}-${maxNum + i + 1}`;
        await supabase
          .from('test_cases')
          .update({ custom_id: newId })
          .eq('id', casesWithoutId[i].id);
      }

      await fetchData();
      alert(`${casesWithoutId.length}개의 테스트 케이스에 ID가 부여되었습니다.`);
    } catch (error) {
      console.error('ID 일괄 부여 오류:', error);
      alert('ID 부여에 실패했습니다.');
    }
  };

  // 전체 데이터 새로고침 함수 추가
  const handleRefreshData = async () => {
    await fetchData();
  };

  // AI 생성 케이스 일괄 저장
  const handleSaveAIGeneratedCases = async (cases: any[]) => {
    for (const tc of cases) {
      const stepsStr = Array.isArray(tc.steps) ? tc.steps.join('\n') : (tc.steps || '');
      await handleAddTestCase({
        title: tc.title,
        description: tc.description || '',
        precondition: tc.precondition || '',
        steps: stepsStr,
        expected_result: tc.expected_result || '',
        priority: tc.priority || 'medium',
        status: 'pending',
        is_automated: false,
        folder: '',
        assignee: '',
        tags: '',
      });
    }
    await fetchData();
  };

  const handleRestoreToBefore = async () => {
    // This function is no longer needed as restoration is handled in TestCaseList component
    // Keeping it here for backward compatibility but it won't be called
  };

  const handleMarkActive = async () => {
    const tcId = lcToast.tcId;
    if (!tcId) return;
    if (lcToastTimerRef.current) clearTimeout(lcToastTimerRef.current);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('test_cases').update({ lifecycle_status: 'active' }).eq('id', tcId);
    if (user) {
      await supabase.from('test_case_history').insert({
        test_case_id: tcId, user_id: user.id, action_type: 'status_changed',
        field_name: 'lifecycle_status', old_value: 'draft', new_value: 'active',
      });
    }
    setTestCases(prev => prev.map(tc => tc.id === tcId ? { ...tc, lifecycle_status: 'active' } : tc));
    setLcToast({ show: true, tcId, phase: 'active' });
    lcToastTimerRef.current = setTimeout(() => setLcToast(t => ({ ...t, show: false })), 3000);
  };

  const filteredTestCases = testCases.filter(testCase => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || testCase.priority === priorityFilter;
    const lc = testCase.lifecycle_status || 'active';
    let matchesLifecycle = true;
    if (lifecycleFilter === 'all') {
      matchesLifecycle = lc !== 'deprecated'; // All tab hides deprecated
    } else {
      matchesLifecycle = lc === lifecycleFilter;
    }
    return matchesSearch && matchesPriority && matchesLifecycle;
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectHeader projectId={id || ''} projectName="" />
          <main className="flex-1 overflow-y-auto bg-gray-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="p-[1.75rem]">
            <div className="flex items-center justify-between mb-[1.75rem]">
              <div>
                <h1 className="text-[1.375rem] font-bold text-gray-900">Test Cases</h1>
                <p className="text-[0.8125rem] text-gray-500 mt-1">
                  {project?.name} • {filteredTestCases.length} test cases
                </p>
              </div>
              <div className="flex items-center gap-2">
                {testCases.some(tc => !tc.custom_id) && project?.prefix && (
                  <button
                    onClick={handleAssignMissingIds}
                    className="px-[0.875rem] py-[0.4375rem] bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all font-semibold text-[0.8125rem] flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-price-tag-3-line"></i>
                    ID 없는 케이스에 ID 부여
                  </button>
                )}
                <button
                  onClick={() => setShowAIModal(true)}
                  className="px-[0.875rem] py-[0.4375rem] bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-lg hover:opacity-90 transition-opacity font-semibold text-[0.8125rem] flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-sparkling-2-fill"></i>
                  Generate with AI
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              {/* ── Lifecycle Filter Tabs ── */}
              {(() => {
                const counts = {
                  all: testCases.filter(tc => (tc.lifecycle_status || 'active') !== 'deprecated').length,
                  draft: testCases.filter(tc => (tc.lifecycle_status || 'active') === 'draft').length,
                  active: testCases.filter(tc => (tc.lifecycle_status || 'active') === 'active').length,
                  deprecated: testCases.filter(tc => (tc.lifecycle_status || 'active') === 'deprecated').length,
                };
                const tabs: { key: 'all' | 'draft' | 'active' | 'deprecated'; label: string; icon?: string; iconCls?: string }[] = [
                  { key: 'all', label: 'All' },
                  { key: 'draft', label: 'Draft', icon: 'ri-draft-line', iconCls: 'text-amber-500' },
                  { key: 'active', label: 'Active', icon: 'ri-checkbox-circle-line', iconCls: 'text-green-500' },
                  { key: 'deprecated', label: 'Deprecated', icon: 'ri-forbid-line', iconCls: 'text-slate-400' },
                ];
                return (
                  <div className="flex border-b border-gray-200">
                    {tabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setLifecycleFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                          lifecycleFilter === tab.key
                            ? 'text-indigo-700 border-indigo-600 font-semibold'
                            : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                      >
                        {tab.icon && <i className={`${tab.icon} ${lifecycleFilter === tab.key ? '' : tab.iconCls}`} />}
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          lifecycleFilter === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                        }`}>{counts[tab.key]}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              <div className="p-[1.3125rem] border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg w-5 h-5 flex items-center justify-center"></i>
                    <input
                      type="text"
                      placeholder="Search test cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-[0.4375rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[0.8125rem]"
                    />
                  </div>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-[0.875rem] py-[0.4375rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-[0.8125rem] cursor-pointer"
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
                onRefresh={handleRefreshData}
                projectId={id!}
                projectName={project?.name || ''}
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

      {showAIModal && (
        <AIGenerateModal
          projectId={id!}
          subscriptionTier={userProfile?.subscription_tier || 1}
          onSave={handleSaveAIGeneratedCases}
          onClose={() => setShowAIModal(false)}
        />
      )}

      {/* ── TC Creation Lifecycle Toast ── */}
      {lcToast.show && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] animate-fade-in">
          {lcToast.phase === 'draft' ? (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-800 text-white rounded-xl shadow-2xl text-sm font-medium">
              <i className="ri-check-line text-green-400 text-lg flex-shrink-0" />
              <span>Test case created as Draft.</span>
              <button
                onClick={handleMarkActive}
                className="text-indigo-400 font-semibold underline hover:text-indigo-300 ml-1 cursor-pointer"
              >
                Mark as Active
              </button>
              <button onClick={() => setLcToast(t => ({ ...t, show: false }))} className="ml-2 text-slate-400 hover:text-slate-300 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-green-800 text-white rounded-xl shadow-2xl text-sm font-medium">
              <i className="ri-checkbox-circle-line text-green-300 text-lg flex-shrink-0" />
              <span>Test case marked as Active.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
