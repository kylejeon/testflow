import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/Toast';
import { ModalShell } from '../../../components/ModalShell';
import PageLoader from '../../../components/PageLoader';

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
    iconColor: 'text-indigo-600',
    name: 'QA Testing Project',
    description: 'Standard QA testing project for web or mobile applications. Includes test case management, test runs, and milestone tracking.',
  },
  {
    id: 'api-testing',
    label: 'API Testing',
    icon: 'ri-code-s-slash-line',
    iconColor: 'text-blue-600',
    name: 'API Testing Project',
    description: 'API endpoint testing with request/response validation, edge cases, and integration test coverage.',
  },
  {
    id: 'sprint-qa',
    label: 'Sprint QA',
    icon: 'ri-flag-line',
    iconColor: 'text-violet-600',
    name: 'Sprint QA Project',
    description: 'Sprint-based QA with milestone-driven test execution. Ideal for agile teams running 2-week sprints.',
  },
  {
    id: 'mobile',
    label: 'Mobile Testing',
    icon: 'ri-smartphone-line',
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
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
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

      let profile = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

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

        await new Promise(resolve => setTimeout(resolve, 1000));

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

  const handleNameChange = (name: string) => {
    setFormData(prev => {
      const shouldAutoGenerate = !prev.prefix || prev.prefix === generatePrefix(prev.name);
      return {
        ...prev,
        name,
        prefix: shouldAutoGenerate ? generatePrefix(name) : prev.prefix,
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

  const generatePrefix = (projectName: string): string => {
    if (!projectName.trim()) return '';
    const letters = projectName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (letters.length === 0) {
      const cleaned = projectName.replace(/\s+/g, '').toUpperCase();
      return cleaned.slice(0, 3);
    }
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 48px)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {loading ? (
          <PageLoader />
        ) : !canCreate ? (
          <div className="p-5 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="ri-error-warning-line text-2xl text-amber-600"></i>
              </div>
              <h3 className="text-base font-bold text-amber-800 mb-1.5">Project Limit Reached</h3>
              <p className="text-sm text-amber-700 mb-3">
                Your {subscriptionTier === 1 ? 'Free' : subscriptionTier === 2 ? 'Starter' : 'Professional'} plan allows up to {maxProjects} projects.
                You currently have {currentProjectCount} projects.
              </p>
              <p className="text-xs text-amber-600 mb-4">Upgrade your plan to create more projects.</p>
              <div className="flex gap-2.5 justify-center">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all cursor-pointer"
                >
                  Close
                </button>
                <a
                  href="/settings"
                  className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <i className="ri-vip-crown-line"></i>
                  View Plans
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>

              {/* Template picker — chip row */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Start from a template <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => applyTemplate(tmpl.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                        selectedTemplate === tmpl.id
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
                      }`}
                    >
                      <i className={`${tmpl.icon} text-xs ${tmpl.iconColor}`}></i>
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan usage notice */}
              {(subscriptionTier === 1 || subscriptionTier === 2) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <i className="ri-information-line text-gray-400 text-sm"></i>
                  <span className="text-xs text-gray-500">
                    {subscriptionTier === 1 ? 'Free' : 'Starter'} plan: {currentProjectCount}/{maxProjects} projects used
                  </span>
                </div>
              )}

              {/* Project Name — full width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mobile App Testing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>

              {/* ID Prefix + Jira Key — 2-column */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    TC ID Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. TC, LOGIN"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Format: <span className="font-mono text-indigo-600">{formData.prefix || 'PREFIX'}-001</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jira Project Key
                  </label>
                  <input
                    type="text"
                    value={formData.jiraProjectKey}
                    onChange={(e) => setFormData({ ...formData, jiraProjectKey: e.target.value.toUpperCase() })}
                    placeholder="e.g. PROJ, SUI"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase"
                  />
                  <p className="mt-1 text-xs text-gray-400">Optional Jira link</p>
                </div>
              </div>

              {/* Description — full width, compact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter a brief description of this project"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tags <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {formData.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                          className="ml-0.5 text-indigo-400 hover:text-indigo-700 cursor-pointer leading-none"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault();
                      const tag = tagInput.trim();
                      if (!formData.tags.includes(tag)) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                      }
                      setTagInput('');
                    }
                  }}
                  placeholder="Type a tag and press Enter"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className={`text-sm font-medium ${formData.status === 'active' ? 'text-gray-700' : 'text-gray-400'}`}>
                    {formData.status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                  <p className="text-xs text-gray-400">Inactive projects are hidden from the main list</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: prev.status === 'active' ? 'archived' : 'active' }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                    formData.status === 'active' ? 'bg-indigo-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      formData.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0"
              style={{ boxShadow: '0 -1px 3px rgba(0,0,0,0.05)' }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all cursor-pointer"
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
