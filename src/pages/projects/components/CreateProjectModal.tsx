import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; status: string; prefix: string }) => void;
}

const TIER_LIMITS = {
  1: { maxProjects: 3, maxMembers: 3 },
  2: { maxProjects: 10, maxMembers: 5 },
  3: { maxProjects: Infinity, maxMembers: 20 },
  4: { maxProjects: Infinity, maxMembers: Infinity },
};

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    prefix: '',
    jiraProjectKey: '',
  });
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [currentProjectCount, setCurrentProjectCount] = useState(0);
  const [maxProjects, setMaxProjects] = useState(3);
  const [subscriptionTier, setSubscriptionTier] = useState(1);

  useEffect(() => {
    checkProjectLimit();
  }, []);

  const checkProjectLimit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ensure profile exists (for OAuth users)
      let profile = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      // If profile doesn't exist, create it
      if (!profile.data) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null,
          role: 'member',
          subscription_tier: 1,
        });

        if (insertError && insertError.code !== '23505') {
          console.error('Failed to create profile:', insertError);
          throw new Error('프로필 생성에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        }

        // Wait for profile to be created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch the newly created profile
        profile = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile.data) {
          throw new Error('프로필을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        }
      }

      const tier = profile.data?.subscription_tier || 1;
      setSubscriptionTier(tier);
      const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
      setMaxProjects(limits.maxProjects);

      // Count projects where user is a member (includes owned projects)
      const { count: memberCount } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const projectCount = memberCount || 0;
      setCurrentProjectCount(projectCount);
      setCanCreate(projectCount < limits.maxProjects);
    } catch (error) {
      console.error('Error checking project limit:', error);
      alert(error instanceof Error ? error.message : '프로젝트 한도를 확인하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 이름이 변경될 때 prefix 자동 생성
  const handleNameChange = (name: string) => {
    setFormData(prev => {
      // prefix가 비어있거나 이전 자동생성값과 같을 때만 자동 생성
      const shouldAutoGenerate = !prev.prefix || prev.prefix === generatePrefix(prev.name);
      
      return {
        ...prev,
        name,
        prefix: shouldAutoGenerate ? generatePrefix(name) : prev.prefix
      };
    });
  };

  // prefix 자동 생성 함수
  const generatePrefix = (projectName: string): string => {
    if (!projectName.trim()) return '';
    
    // 영문자만 추출
    const letters = projectName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    
    if (letters.length === 0) {
      // 영문자가 없으면 숫자나 다른 문자 사용
      const cleaned = projectName.replace(/\s+/g, '').toUpperCase();
      return cleaned.slice(0, 3);
    }
    
    // 2~3글자 추출
    return letters.slice(0, Math.min(3, letters.length));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && canCreate) {
      const finalPrefix = formData.prefix.trim() || generatePrefix(formData.name);
      onCreate({ ...formData, prefix: finalPrefix });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">새 프로젝트 만들기</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          </div>
        ) : !canCreate ? (
          <div className="p-6">
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-amber-600"></i>
              </div>
              <h3 className="text-lg font-bold text-amber-800 mb-2">프로젝트 생성 한도 초과</h3>
              <p className="text-amber-700 mb-4">
                {subscriptionTier === 1 ? 'Free' : subscriptionTier === 2 ? 'Starter' : 'Professional'} 요금제에서는 최대 {maxProjects}개의 프로젝트만 생성할 수 있습니다.
                <br />
                현재 {currentProjectCount}개의 프로젝트를 보유하고 있습니다.
              </p>
              <p className="text-sm text-amber-600 mb-4">
                더 많은 프로젝트가 필요하시면 요금제를 업그레이드해 주세요.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
                >
                  닫기
                </button>
                <a
                  href="/settings"
                  className="px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                >
                  <i className="ri-vip-crown-line"></i>
                  요금제 확인
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5">
              {subscriptionTier === 1 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                  <i className="ri-information-line text-gray-500"></i>
                  <span className="text-sm text-gray-600">
                    Free 요금제: {currentProjectCount}/{maxProjects}개 프로젝트 사용 중
                  </span>
                </div>
              )}
              {subscriptionTier === 2 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                  <i className="ri-information-line text-gray-500"></i>
                  <span className="text-sm text-gray-600">
                    Starter 요금제: {currentProjectCount}/{maxProjects}개 프로젝트 사용 중
                  </span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  프로젝트 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="예: 모바일 앱 테스트"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  테스트 케이스 ID Prefix
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                  placeholder="예: TC, LOGIN (영문 대문자 권장, 최대 10자)"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
                />
                <p className="mt-2 text-xs text-gray-500">
                  테스트 케이스 ID 형식: <span className="font-mono font-semibold text-teal-600">{formData.prefix || 'PREFIX'}-001</span>
                  {!formData.prefix && formData.name && (
                    <span className="ml-2 text-gray-400">
                      (비워두면 "<span className="font-mono font-semibold">{generatePrefix(formData.name)}</span>" 사용)
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jira Project Key
                </label>
                <input
                  type="text"
                  value={formData.jiraProjectKey}
                  onChange={(e) => setFormData({ ...formData, jiraProjectKey: e.target.value.toUpperCase() })}
                  placeholder="예: PROJ, SUI (Jira 프로젝트 키)"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono uppercase"
                />
                <p className="mt-1 text-xs text-gray-500">이 프로젝트와 연결할 Jira 프로젝트 키를 입력하세요 (선택사항)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  상태
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                >
                  <option value="active">활성</option>
                  <option value="archived">보관됨</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-medium transition-all cursor-pointer whitespace-nowrap"
              >
                프로젝트 생성
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
