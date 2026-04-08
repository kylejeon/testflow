import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/Toast';
import { ModalShell } from '../../../components/ModalShell';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; status: string; prefix: string }) => void;
}

const TIER_LIMITS = {
  1: { maxProjects: 1,        maxMembers: 2        }, // Free
  2: { maxProjects: 3,        maxMembers: 5        }, // Hobby
  3: { maxProjects: 10,       maxMembers: 5        }, // Starter
  4: { maxProjects: Infinity, maxMembers: 20       }, // Professional
  5: { maxProjects: Infinity, maxMembers: Infinity }, // Enterprise
};

const TEMPLATES = [
  {
    id: 'qa-testing',
    label: 'QA Testing',
    icon: 'ri-test-tube-line',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    name: 'QA Testing Project',
    description: 'Standard QA testing project for web or mobile applications. Includes test case management, test runs, and milestone tracking.',
  },
  {
    id: 'api-testing',
    label: 'API Testing',
    icon: 'ri-code-s-slash-line',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    name: 'API Testing Project',
    description: 'API endpoint testing with request/response validation, edge cases, and integration test coverage.',
  },
  {
    id: 'sprint-qa',
    label: 'Sprint QA',
    icon: 'ri-flag-line',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    name: 'Sprint QA Project',
    description: 'Sprint-based QA with milestone-driven test execution. Ideal for agile teams running 2-week sprints.',
  },
  {
    id: 'mobile',
    label: 'Mobile Testing',
    icon: 'ri-smartphone-line',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    name: 'Mobile Testing Project',
    description: 'iOS and Android mobile app testing. Covers UI flows, gestures, push notifications, and device compatibility.',
  },
];

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const { showToast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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
          throw new Error('Failed to create profile. Please refresh the page and try again.');
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
      showToast(error instanceof Error ? error.message : "Couldn't check your project limit. Please try again.", 'error');
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

  const applyTemplate = (templateId: string) => {
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    setSelectedTemplate(templateId);
    setFormData(prev => ({
      ...prev,
      name: tmpl.name,
      description: tmpl.description,
      prefix: generatePrefix(tmpl.name),
    }));
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
    <ModalShell onClose={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: 'calc(100vh - 48px)' }}
      >
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : !canCreate ? (
          <div className="p-6 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-amber-600"></i>
              </div>
              <h3 className="text-lg font-bold text-amber-800 mb-2">Project Limit Reached</h3>
              <p className="text-amber-700 mb-4">
                Your {subscriptionTier === 1 ? 'Free' : subscriptionTier === 2 ? 'Starter' : 'Professional'} plan allows up to {maxProjects} projects.
                <br />
                You currently have {currentProjectCount} projects.
              </p>
              <p className="text-sm text-amber-600 mb-4">
                Upgrade your plan to create more projects.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
                >
                  Close
                </button>
                <a
                  href="/settings"
                  className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                >
                  <i className="ri-vip-crown-line"></i>
                  View Plans
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-5 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
              {/* Template picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start from a template <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => applyTemplate(tmpl.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        selectedTemplate === tmpl.id
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tmpl.iconBg}`}>
                        <i className={`${tmpl.icon} text-base ${tmpl.iconColor}`}></i>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {subscriptionTier === 1 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                  <i className="ri-information-line text-gray-500"></i>
                  <span className="text-sm text-gray-600">
                    Free plan: {currentProjectCount}/{maxProjects} projects used
                  </span>
                </div>
              )}
              {subscriptionTier === 2 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                  <i className="ri-information-line text-gray-500"></i>
                  <span className="text-sm text-gray-600">
                    Starter plan: {currentProjectCount}/{maxProjects} projects used
                  </span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mobile App Testing"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Case ID Prefix
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                  placeholder="e.g. TC, LOGIN (uppercase recommended, max 10 chars)"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Test case ID format: <span className="font-mono font-semibold text-indigo-600">{formData.prefix || 'PREFIX'}-001</span>
                  {!formData.prefix && formData.name && (
                    <span className="ml-2 text-gray-400">
                      (leave empty to use "<span className="font-mono font-semibold">{generatePrefix(formData.name)}</span>")
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter a brief description of this project"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
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
                  placeholder="e.g. PROJ, SUI (Jira project key)"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase"
                />
                <p className="mt-1 text-xs text-gray-500">Enter the Jira project key to link with this project (optional)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div
              className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0"
              style={{ boxShadow: '0 -1px 3px rgba(0,0,0,0.05)' }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium transition-all cursor-pointer whitespace-nowrap"
              >
                Create Project
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}
