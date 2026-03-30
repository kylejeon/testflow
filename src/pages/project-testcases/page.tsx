import { LogoMark } from '../../components/Logo';
import PageLoader from '../../components/PageLoader';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TestCaseList from './components/TestCaseList';
import AIGenerateModal from './components/AIGenerateModal';
import { markOnboardingStep } from '../../lib/onboardingMarker';
import ProjectHeader from '../../components/ProjectHeader';

export default function ProjectTestCases() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, prefix, description, color, status')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const { data: testCases = [], isLoading: loading } = useQuery({
    queryKey: ['testCases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_cases')
        .select('*, creator:profiles!test_cases_created_by_fkey(full_name, email)')
        .eq('project_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
    staleTime: 60_000,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | 'draft' | 'active' | 'deprecated'>('all');

  // Toast state
  const [lcToast, setLcToast] = useState<{ show: boolean; tcId: string; phase: 'draft' | 'active' }>({ show: false, tcId: '', phase: 'draft' });
  const lcToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'ai-generate') {
      setShowAIModal(true);
      setSearchParams({}, { replace: true });
    }
    // 'create' for inline TC creation is handled by TestCaseList
  }, [searchParams]);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();
      return {
        full_name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: profile?.email || user.email || '',
        subscription_tier: profile?.subscription_tier || 1,
        avatar_emoji: profile?.avatar_emoji || '',
      };
    },
    staleTime: 10 * 60_000,
  });

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

      void markOnboardingStep('createTestcase');

      // 생성 히스토리 기록
      if (data && user) {
        await supabase.from('test_case_history').insert({
          test_case_id: data.id,
          user_id: user.id,
          action_type: 'created',
        });
      }

      queryClient.setQueryData(['testCases', id], (old: any[] = []) => [data, ...old]);

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
      queryClient.setQueryData(['testCases', id], (old: any[] = []) =>
        old.map(tc => tc.id === updatedTestCase.id ? refreshedData : tc)
      );
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
      queryClient.setQueryData(['testCases', id], (old: any[] = []) =>
        old.filter(tc => tc.id !== testCaseId)
      );
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

      await queryClient.invalidateQueries({ queryKey: ['testCases', id] });
      alert(`${casesWithoutId.length}개의 테스트 케이스에 ID가 부여되었습니다.`);
    } catch (error) {
      console.error('ID 일괄 부여 오류:', error);
      alert('Failed to assign ID.');
    }
  };

  // 전체 데이터 새로고침 함수 추가
  const handleRefreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['testCases', id] });
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
    await queryClient.invalidateQueries({ queryKey: ['testCases', id] });
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
    queryClient.setQueryData(['testCases', id], (prev: any[] = []) =>
      prev.map(tc => tc.id === tcId ? { ...tc, lifecycle_status: 'active' } : tc)
    );
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

  if (loading) return <PageLoader fullScreen />;

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader projectId={id || ''} projectName={project?.name || ''} />

        <main className="flex-1 overflow-hidden flex flex-col">
          {/* ── Subtab row: lifecycle tabs + action button ── */}
          {(() => {
            const counts = {
              all: testCases.filter(tc => (tc.lifecycle_status || 'active') !== 'deprecated').length,
              draft: testCases.filter(tc => (tc.lifecycle_status || 'active') === 'draft').length,
              active: testCases.filter(tc => (tc.lifecycle_status || 'active') === 'active').length,
              deprecated: testCases.filter(tc => (tc.lifecycle_status || 'active') === 'deprecated').length,
            };
            const tabs: { key: 'all' | 'draft' | 'active' | 'deprecated'; label: string; icon: string; iconColor: string }[] = [
              { key: 'all',        label: 'All',        icon: 'ri-list-check-3',          iconColor: '#6366F1' },
              { key: 'draft',      label: 'Draft',      icon: 'ri-draft-fill',            iconColor: '#94A3B8' },
              { key: 'active',     label: 'Active',     icon: 'ri-checkbox-circle-fill',  iconColor: '#22C55E' },
              { key: 'deprecated', label: 'Deprecated', icon: 'ri-forbid-line',           iconColor: '#94A3B8' },
            ];
            return (
              <div className="flex items-center border-b border-[#E2E8F0] bg-white flex-shrink-0 h-[2.625rem] px-5">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setLifecycleFilter(tab.key)}
                    className={`flex items-center gap-[0.3125rem] px-[0.875rem] h-full text-[0.8125rem] font-medium border-b-[2.5px] transition-colors cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 whitespace-nowrap ${
                      lifecycleFilter === tab.key
                        ? 'text-[#6366F1] border-[#6366F1] font-semibold'
                        : 'text-[#64748B] border-transparent hover:text-[#475569]'
                    }`}
                  >
                    <i className={`${tab.icon} text-[0.875rem]`} style={{ color: tab.iconColor }} />
                    {tab.label}
                    <span className={`text-[0.625rem] px-[0.375rem] py-[0.0625rem] rounded-full font-bold min-w-[1.25rem] text-center ${
                      lifecycleFilter === tab.key ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}>{counts[tab.key]}</span>
                  </button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  {testCases.some(tc => !tc.custom_id) && project?.prefix && (
                    <button
                      onClick={handleAssignMissingIds}
                      className="flex items-center gap-[0.3125rem] px-[0.875rem] py-[0.375rem] bg-amber-500 text-white rounded-[0.375rem] hover:bg-amber-600 transition-all font-semibold text-[0.8125rem] cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-price-tag-3-line text-sm" />
                      ID 없는 케이스에 ID 부여
                    </button>
                  )}
                  <button
                    onClick={() => setShowAIModal(true)}
                    className="flex items-center gap-[0.3125rem] px-[0.875rem] py-[0.375rem] bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-[0.375rem] hover:opacity-90 transition-opacity font-semibold text-[0.8125rem] cursor-pointer whitespace-nowrap"
                    style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                  >
                    <i className="ri-sparkling-2-fill text-sm" />
                    Generate with AI
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Search / filter toolbar ── */}
          <div className="flex items-center gap-3 px-5 py-[0.625rem] border-b border-[#E2E8F0] bg-white flex-shrink-0">
            <div className="flex-1 flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md px-[0.625rem] py-[0.3125rem]">
              <i className="ri-search-line text-[#94A3B8] text-sm flex-shrink-0"></i>
              <input
                type="text"
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[0.8125rem] text-[#1E293B] font-[inherit]"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-[0.75rem] px-[0.625rem] py-[0.3125rem] rounded-md border border-[#E2E8F0] bg-white text-[#475569] cursor-pointer font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* ── Content: TestCaseList (handles sidebar + list + detail panel) ── */}
          <div className="flex-1 min-h-0 overflow-hidden">
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
