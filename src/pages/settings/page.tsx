import { LogoMark } from '../../components/Logo';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { markOnboardingStep } from '../../lib/onboardingMarker';
import { supabase } from '../../lib/supabase';
import { WEBHOOK_EVENTS, WebhookEventType } from '../../hooks/useWebhooks';
import SEOHead from '../../components/SEOHead';
import NotificationSettingsPanel from './components/NotificationSettingsPanel';
import ProfileSettingsPanel from './components/ProfileSettingsPanel';
import ProjectMembersPanel from '../project-detail/components/ProjectMembersPanel';
import InviteMemberModal from '../project-detail/components/InviteMemberModal';

interface JiraSettings {
  domain: string;
  email: string;
  apiToken: string;
  issueType: string;
  projectKey: string;
  autoCreateOnFailure: string;
  fieldMappings: JiraFieldMapping[];
}

interface JiraFieldMapping {
  testably_field: string;
  jira_field_id: string;
  jira_field_name: string;
}

interface JiraField {
  id: string;
  name: string;
  required: boolean;
  type: string;
  custom: boolean;
}

interface UserProfile {
  email: string;
  full_name: string;
  subscription_tier: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  is_trial: boolean;
  subscription_ends_at: string | null;
  avatar_emoji: string;
  avatar_url?: string | null;
}

interface CIToken {
  id: string;
  token: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

const TIER_INFO = {
  1: {
    name: 'Free',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: 'ri-user-line',
    monthlyPrice: 0,
    priceDesc: 'Free',
    features: ['Up to 3 projects', 'Up to 3 team members', 'Basic test management', 'Jira Integration (Link)', '5 AI generations / month', 'Community support'],
  },
  2: {
    name: 'Starter',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    icon: 'ri-star-line',
    monthlyPrice: 49,
    priceDesc: '/ mo',
    features: ['Up to 10 projects', 'Up to 5 team members', 'Jira Integration', 'Slack & Teams Integration', '30 AI generations / month', 'Basic reporting', 'Testcase Export/Import', 'Export PDF Report'],
  },
  3: {
    name: 'Professional',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    icon: 'ri-vip-crown-line',
    monthlyPrice: 99,
    priceDesc: '/ mo',
    features: ['Unlimited projects', 'Up to 20 team members', 'Jira Integration', 'Slack & Teams Integration', '150 AI generations / month', 'Advanced reporting', 'Testcase Export/Import', 'Export PDF Report', 'CI/CD Integration', 'Priority support'],
  },
  4: {
    name: 'Enterprise S',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    icon: 'ri-building-2-line',
    monthlyPrice: 249,
    priceDesc: '/ mo',
    features: ['Unlimited projects', '21–50 team members', 'Jira Integration', 'Slack & Teams Integration', 'Unlimited AI generations', 'Advanced reporting', 'CI/CD Integration', 'Dedicated support', 'SLA guarantee'],
  },
  5: {
    name: 'Enterprise M',
    color: 'bg-orange-50 text-orange-700 border-orange-300',
    icon: 'ri-building-4-line',
    monthlyPrice: 499,
    priceDesc: '/ mo',
    features: ['Unlimited projects', '51–100 team members', 'Jira Integration', 'Slack & Teams Integration', 'Unlimited AI generations', 'Advanced reporting', 'CI/CD Integration', 'Dedicated support', 'SLA guarantee'],
  },
  6: {
    name: 'Enterprise L',
    color: 'bg-rose-50 text-rose-700 border-rose-300',
    icon: 'ri-government-line',
    monthlyPrice: -1,
    priceDesc: 'Contact Sales',
    features: ['Unlimited projects', '100+ team members', 'Jira Integration', 'Slack & Teams Integration', 'Unlimited AI generations', 'Advanced reporting', 'CI/CD Integration', 'Dedicated support', 'SLA guarantee', 'Custom contract & SLA'],
  },
};

// ── Standalone settings data loader (no setState) ─────────────────────────
async function loadSettingsData(): Promise<{
  userProfile: UserProfile | null;
  jiraSettings: JiraSettings;
  userProjects: Array<{ id: string; name: string }>;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      userProfile: null,
      jiraSettings: { domain: '', email: '', apiToken: '', issueType: 'Bug' },
      userProjects: [],
    };
  }

  const [profileResult, jiraResult, memberResult] = await Promise.all([
    supabase.from('profiles')
      .select('email, full_name, subscription_tier, trial_started_at, trial_ends_at, is_trial, subscription_ends_at, avatar_emoji')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('jira_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('project_members').select('project_id, projects!inner(id, name)').eq('user_id', user.id),
  ]);

  // Build userProfile
  let userProfile: UserProfile | null = null;
  if (profileResult.data) {
    const data = profileResult.data;
    let tier = data.subscription_tier || 1;
    let isTrial = data.is_trial || false;
    let subscriptionEndsAt = data.subscription_ends_at || null;
    const now = new Date();

    if (isTrial && data.trial_ends_at) {
      const trialEnd = new Date(data.trial_ends_at);
      if (now > trialEnd) {
        tier = 1; isTrial = false;
      } else {
        tier = 3;
      }
    }
    if (!isTrial && tier > 1 && subscriptionEndsAt) {
      const subEnd = new Date(subscriptionEndsAt);
      if (now > subEnd) {
        tier = 1; subscriptionEndsAt = null;
      }
    }

    userProfile = {
      email: data.email || user.email || '',
      full_name: data.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
      subscription_tier: tier,
      trial_started_at: data.trial_started_at || null,
      trial_ends_at: data.trial_ends_at || null,
      is_trial: isTrial,
      subscription_ends_at: subscriptionEndsAt,
      avatar_emoji: data.avatar_emoji || '🐶',
      avatar_url: null,
    };
  } else {
    userProfile = {
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      subscription_tier: 1,
      trial_started_at: null,
      trial_ends_at: null,
      is_trial: false,
      subscription_ends_at: null,
      avatar_emoji: '🐶',
      avatar_url: null,
    };
  }

  // Build jiraSettings
  const jiraData = jiraResult.data;
  const jiraSettings: JiraSettings = jiraData
    ? { domain: jiraData.domain || '', email: jiraData.email || '', apiToken: jiraData.api_token || '', issueType: jiraData.issue_type || 'Bug', projectKey: jiraData.project_key || '', autoCreateOnFailure: jiraData.auto_create_on_failure || 'disabled', fieldMappings: jiraData.field_mappings || [] }
    : { domain: '', email: '', apiToken: '', issueType: 'Bug', projectKey: '', autoCreateOnFailure: 'disabled', fieldMappings: [] };

  // Build userProjects
  const userProjects: Array<{ id: string; name: string }> = memberResult.data
    ? memberResult.data.map((row: any) => ({ id: row.projects.id, name: row.projects.name }))
    : [];

  return { userProfile, jiraSettings, userProjects };
}

function DangerZoneSection({ email }: { email: string }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (confirmText !== email) return;
    try {
      setDeleting(true);
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (e) {
      console.error('Account deletion error:', e);
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-[0.625rem] p-6 mb-5">
        <h3 className="text-[0.9375rem] font-bold text-[#DC2626] mb-1 flex items-center gap-2">
          <i className="ri-error-warning-fill"></i>
          Danger Zone
        </h3>
        <p className="text-[0.8125rem] text-[#991B1B] mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button
          onClick={() => setShowConfirmModal(true)}
          className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors cursor-pointer"
        >
          <i className="ri-delete-bin-line"></i>
          Delete Account
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-[0.75rem] p-6 w-[420px] shadow-xl">
            <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">Delete Account</h3>
            <p className="text-[0.8125rem] text-[#64748B] mb-4">
              This action cannot be undone. Type your email <span className="font-mono font-semibold text-[#DC2626]">{email}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md text-[0.8125rem] mb-4 focus:outline-none focus:border-[#EF4444] bg-[#F8FAFC]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowConfirmModal(false); setConfirmText(''); }}
                className="px-4 py-[0.4375rem] rounded-md text-[0.8125rem] font-semibold text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== email || deleting}
                className="inline-flex items-center gap-[0.3125rem] px-4 py-[0.4375rem] rounded-md text-[0.8125rem] font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? <><i className="ri-loader-4-line animate-spin"></i>Deleting...</> : <><i className="ri-delete-bin-line"></i>Delete Account</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'preferences' | 'members' | 'integrations' | 'api' | 'notifications'>('profile');
  const [userProjects, setUserProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showMembersInviteModal, setShowMembersInviteModal] = useState(false);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [jiraSettings, setJiraSettings] = useState<JiraSettings>({
    domain: '',
    email: '',
    apiToken: '',
    issueType: 'Bug',
    projectKey: '',
    autoCreateOnFailure: 'disabled',
    fieldMappings: [],
  });
  const [jiraSavedDomain, setJiraSavedDomain] = useState('');
  const [availableJiraFields, setAvailableJiraFields] = useState<JiraField[]>([]);
  const [fetchingFields, setFetchingFields] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [jiraSaveResult, setJiraSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);
  const [showJiraTooltip, setShowJiraTooltip] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [ciTokens, setCiTokens] = useState<CIToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'github' | 'gitlab' | 'python'>('github');
  const [scopeGuideTab, setScopeGuideTab] = useState<'github' | 'gitlab'>('github');
  const [ciTokensFetched, setCiTokensFetched] = useState(false);
  const [webhooksFetched, setWebhooksFetched] = useState(false);

  // Preferences state
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [language, setLanguage] = useState<'en'>('en');
  const [timezone, setTimezone] = useState('UTC');
  const [autoDetectTz, setAutoDetectTz] = useState(true);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>('24h');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [showAllPlansModal, setShowAllPlansModal] = useState(false);

  // Slack / Teams webhook management
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookProjects, setWebhookProjects] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState({ project_id: '', type: 'slack' as 'slack' | 'teams', webhook_url: '', channel_name: '', events: ['run_created', 'run_completed', 'milestone_started', 'milestone_completed'] as WebhookEventType[] });
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookFormError, setWebhookFormError] = useState('');
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [webhookLogsId, setWebhookLogsId] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [webhookLogsLoading, setWebhookLogsLoading] = useState(false);

  const [searchParams] = useSearchParams();

  // React Query for initial settings load
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: loadSettingsData,
    staleTime: 5 * 60_000,
  });

  // Sync query data to local form state on first load
  useEffect(() => {
    if (settingsData && !settingsInitialized) {
      setSettingsInitialized(true);
      if (settingsData.userProfile) setUserProfile(settingsData.userProfile);
      setJiraSettings(settingsData.jiraSettings);
      if (settingsData.jiraSettings.domain) setJiraSavedDomain(settingsData.jiraSettings.domain);
      setUserProjects(settingsData.userProjects);
      setLoading(false);
      if (!selectedProjectId && settingsData.userProjects.length > 0) {
        const paramProjectId = searchParams.get('projectId');
        const initial = paramProjectId && settingsData.userProjects.find(p => p.id === paramProjectId) ? paramProjectId : settingsData.userProjects[0]?.id;
        if (initial) setSelectedProjectId(initial);
      }
    }
  }, [settingsData, settingsInitialized]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const VALID_TABS = ['profile', 'billing', 'preferences', 'members', 'integrations', 'api', 'notifications'];
    const TAB_ALIAS: Record<string, typeof activeTab> = { general: 'billing', cicd: 'api' };
    const resolved = (TAB_ALIAS[tab ?? ''] ?? tab) as typeof activeTab;
    if (resolved && VALID_TABS.includes(resolved)) setActiveTab(resolved);
    if (tab === 'members' && searchParams.get('action') === 'invite') {
      setShowMembersInviteModal(true);
    }
  }, []);

  const fetchUserProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('project_members')
        .select('project_id, projects!inner(id, name)')
        .eq('user_id', user.id);
      if (data) {
        const projects = data.map((row: any) => ({ id: row.projects.id, name: row.projects.name }));
        setUserProjects(projects);
        // Prefer projectId from URL param, then fall back to first project
        const paramProjectId = searchParams.get('projectId');
        const initial = paramProjectId && projects.find(p => p.id === paramProjectId) ? paramProjectId : projects[0]?.id;
        if (initial && !selectedProjectId) setSelectedProjectId(initial);
      }
    } catch (e) {
      console.error('Failed to fetch user projects:', e);
    }
  };

  useEffect(() => {
    if ((activeTab === 'api' || activeTab === 'integrations') && !ciTokensFetched) {
      fetchCITokens();
      setCiTokensFetched(true);
    }
    if (activeTab === 'integrations' && !webhooksFetched) {
      fetchWebhooks();
      setWebhooksFetched(true);
    }
  }, [activeTab, ciTokensFetched, webhooksFetched]);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      queryClient.clear();
      setShowProfileMenu(false);
      navigate('/auth');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // avatar_url 컬럼은 환경에 따라 없을 수 있으므로 메인 쿼리에서 제외
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier, trial_started_at, trial_ends_at, is_trial, subscription_ends_at, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        let tier = data.subscription_tier || 1;
        let isTrial = data.is_trial || false;
        let subscriptionEndsAt = data.subscription_ends_at || null;
        const now = new Date();

        // ── 1. 무료 체험 만료 → Free 전환 ──────────────────
        if (isTrial && data.trial_ends_at) {
          const trialEnd = new Date(data.trial_ends_at);
          if (now > trialEnd) {
            await supabase
              .from('profiles')
              .update({ subscription_tier: 1, is_trial: false })
              .eq('id', user.id);
            tier = 1;
            isTrial = false;
          } else {
            // 체험 중이면 반드시 Professional(3) 티어
            if (tier !== 3) {
              await supabase
                .from('profiles')
                .update({ subscription_tier: 3 })
                .eq('id', user.id);
            }
            tier = 3;
          }
        }

        // ── 2. 유료 구독 만료 → Free 전환 ──────────────────
        if (!isTrial && tier > 1 && subscriptionEndsAt) {
          const subEnd = new Date(subscriptionEndsAt);
          if (now > subEnd) {
            await supabase
              .from('profiles')
              .update({ subscription_tier: 1, subscription_ends_at: null })
              .eq('id', user.id);
            tier = 1;
            subscriptionEndsAt = null;
          }
        }

        setUserProfile({
          email: data.email || user.email || '',
          full_name: data.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
          subscription_tier: tier,
          trial_started_at: data.trial_started_at || null,
          trial_ends_at: data.trial_ends_at || null,
          is_trial: isTrial,
          subscription_ends_at: subscriptionEndsAt,
          avatar_emoji: data.avatar_emoji || '🐶',
          avatar_url: null,
        });

        // avatar_url은 별도 비중요 쿼리로 처리 (컬럼 없어도 메인 프로필에 영향 없음)
        supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
          .then(({ data: av }) => {
            if (av?.avatar_url) setUserProfile(prev => prev ? { ...prev, avatar_url: av.avatar_url } : prev);
          })
          .catch(() => {/* avatar_url 컬럼 없는 환경 — 무시 */});

        // Load checklist dismissed state
        supabase.from('user_onboarding')
          .select('checklist_dismissed')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: ob }) => {
            if (ob) setChecklistDismissed(Boolean(ob.checklist_dismissed));
          })
          .catch(() => {});

        // Preferences 컬럼 로드 (migration으로 추가된 컬럼 — 없는 환경 대비 별도 쿼리)
        supabase.from('profiles')
          .select('timezone, date_format, time_format, default_project_id, language, auto_detect_tz')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: prefs }) => {
            if (!prefs) return;
            if (prefs.auto_detect_tz !== null && prefs.auto_detect_tz !== undefined) {
              setAutoDetectTz(prefs.auto_detect_tz);
            }
            if (prefs.timezone) {
              setTimezone(prefs.timezone);
            }
            if (prefs.date_format) setDateFormat(prefs.date_format);
            if (prefs.time_format) setTimeFormat(prefs.time_format as '24h' | '12h');
            if (prefs.default_project_id) setDefaultProjectId(prefs.default_project_id);
            if (prefs.language) setLanguage(prefs.language as 'en');
          })
          .catch(() => {/* preferences 컬럼 없는 환경 — 무시 */});
      } else {
        // profiles 행이 없는 경우 — auth 사용자 데이터로 기본 프로필 생성
        const authName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const authEmail = user.email || '';
        setUserProfile({
          email: authEmail,
          full_name: authName,
          subscription_tier: 1,
          trial_started_at: null,
          trial_ends_at: null,
          is_trial: false,
          subscription_ends_at: null,
          avatar_emoji: '🐶',
          avatar_url: null,
        });
        // profiles 행 생성 (이후 로드 시 정상 동작하도록)
        await supabase.from('profiles').upsert({
          id: user.id,
          email: authEmail,
          full_name: authName,
          subscription_tier: 1,
          avatar_emoji: '🐶',
        }, { onConflict: 'id' });
      }
    } catch (error) {
      console.error('Profile loading error:', error);
    }
  };

  const fetchJiraSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('jira_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setJiraSettings({
          domain: data.domain || '',
          email: data.email || '',
          apiToken: data.api_token || '',
          issueType: data.issue_type || 'Bug',
          projectKey: data.project_key || '',
          autoCreateOnFailure: data.auto_create_on_failure || 'disabled',
          fieldMappings: data.field_mappings || [],
        });
        if (data.domain) setJiraSavedDomain(data.domain);
      }
    } catch (error) {
      console.error('Jira settings load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken) {
      setTestResult({ success: false, message: 'Please fill in all required fields.' });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const cleanDomain = jiraSettings.domain
        .replace(/^https?:?\/?\/?\/?/i, '')
        .replace(/\/+$/, '')
        .trim();
      const { data, error } = await supabase.functions.invoke('test-jira-connection', {
        body: {
          domain: cleanDomain,
          email: jiraSettings.email,
          apiToken: jiraSettings.apiToken,
        },
      });

      if (error) throw error;

      if (data.success) {
        setTestResult({ success: true, message: 'Jira connection successful!' });
      } else {
        setTestResult({ success: false, message: data.message || 'Jira connection failed.' });
      }
    } catch (error: any) {
      console.error('Jira connection test error:', error);
      setTestResult({ success: false, message: error.message || 'An error occurred while testing the Jira connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchJiraFields = async () => {
    try {
      setFetchingFields(true);
      const { data, error } = await supabase.functions.invoke('fetch-jira-fields', {
        body: {
          domain: jiraSettings.domain,
          email: jiraSettings.email,
          apiToken: jiraSettings.apiToken,
          projectKey: jiraSettings.domain, // will be overridden by project-level key
        },
      });
      if (error) throw error;
      if (data?.fields) {
        setAvailableJiraFields(data.fields);
      }
    } catch (err) {
      console.error('Failed to fetch Jira fields:', err);
    } finally {
      setFetchingFields(false);
    }
  };

  const addFieldMapping = () => {
    setJiraSettings({
      ...jiraSettings,
      fieldMappings: [...jiraSettings.fieldMappings, { testably_field: 'tc_tags', jira_field_id: '', jira_field_name: '' }],
    });
  };

  const removeFieldMapping = (idx: number) => {
    setJiraSettings({
      ...jiraSettings,
      fieldMappings: jiraSettings.fieldMappings.filter((_, i) => i !== idx),
    });
  };

  const updateFieldMapping = (idx: number, field: Partial<JiraFieldMapping>) => {
    const updated = [...jiraSettings.fieldMappings];
    updated[idx] = { ...updated[idx], ...field };
    setJiraSettings({ ...jiraSettings, fieldMappings: updated });
  };

  const handleSaveJiraSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cleanDomain = jiraSettings.domain
        .replace(/^https?:?\/?\/?\/?/i, '')
        .replace(/\/+$/, '')
        .trim();

      const { data: existingData } = await supabase
        .from('jira_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('jira_settings')
          .update({
            domain: cleanDomain,
            email: jiraSettings.email,
            api_token: jiraSettings.apiToken,
            issue_type: jiraSettings.issueType,
            project_key: jiraSettings.projectKey || '',
            auto_create_on_failure: jiraSettings.autoCreateOnFailure,
            field_mappings: jiraSettings.fieldMappings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jira_settings')
          .insert({
            user_id: user.id,
            domain: cleanDomain,
            email: jiraSettings.email,
            api_token: jiraSettings.apiToken,
            issue_type: jiraSettings.issueType,
            project_key: jiraSettings.projectKey || '',
            auto_create_on_failure: jiraSettings.autoCreateOnFailure,
            field_mappings: jiraSettings.fieldMappings,
          });

        if (error) throw error;
      }

      setJiraSettings(prev => ({ ...prev, domain: cleanDomain }));
      setJiraSavedDomain(cleanDomain);
      setJiraSaveResult({ success: true, message: 'Jira settings saved successfully!' });
      void markOnboardingStep('connectJira');
      setTimeout(() => setJiraSaveResult(null), 4000);
      setTestResult(null);
    } catch (error) {
      console.error('Jira settings save error:', error);
      setJiraSaveResult({ success: false, message: 'Failed to save Jira settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // ── Webhook helpers ───────────────────────────────────────────────────────

  const WEBHOOK_TYPE_META = {
    slack: { label: 'Slack', icon: 'ri-slack-line', iconBg: '#F3E8FF', iconColor: '#7C3AED', placeholder: 'https://hooks.slack.com/services/...' },
    teams: { label: 'Microsoft Teams', icon: 'ri-microsoft-line', iconBg: '#DBEAFE', iconColor: '#1D4ED8', placeholder: 'https://prod-xx.westus.logic.azure.com/workflows/...' },
  };

  const fetchWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id, projects!inner(id, name)')
        .eq('user_id', user.id);
      const projects = (memberRows ?? []).map((r: any) => ({ id: r.projects.id, name: r.projects.name }));
      setWebhookProjects(projects);
      if (projects.length > 0) {
        const { data: integrations } = await supabase
          .from('integrations')
          .select('*')
          .in('project_id', projects.map(p => p.id))
          .order('created_at', { ascending: false });
        setWebhooks(integrations ?? []);
      } else {
        setWebhooks([]);
      }
    } catch (err) {
      console.error('Webhook fetch error:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const openAddWebhookModal = () => {
    setEditingWebhookId(null);
    setWebhookForm({ project_id: webhookProjects[0]?.id ?? '', type: 'slack', webhook_url: '', channel_name: '', events: ['run_created', 'run_completed', 'milestone_started', 'milestone_completed'] });
    setWebhookFormError('');
    setShowWebhookModal(true);
  };

  const openEditWebhookModal = (wh: any) => {
    setEditingWebhookId(wh.id);
    setWebhookForm({ project_id: wh.project_id, type: wh.type, webhook_url: wh.webhook_url, channel_name: wh.channel_name ?? '', events: wh.events });
    setWebhookFormError('');
    setShowWebhookModal(true);
  };

  const handleSaveWebhook = async () => {
    setWebhookFormError('');
    if (!webhookForm.project_id) { setWebhookFormError('Please select a project.'); return; }
    if (!webhookForm.webhook_url.trim()) { setWebhookFormError('Webhook URL is required.'); return; }
    if (!webhookForm.webhook_url.startsWith('https://')) { setWebhookFormError('Webhook URL must start with https://.'); return; }
    if (webhookForm.events.length === 0) { setWebhookFormError('Select at least one event.'); return; }

    setSavingWebhook(true);
    try {
      const payload = { project_id: webhookForm.project_id, type: webhookForm.type, webhook_url: webhookForm.webhook_url.trim(), channel_name: webhookForm.channel_name.trim() || null, events: webhookForm.events };
      if (editingWebhookId) {
        const { error } = await supabase.from('integrations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingWebhookId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('integrations').insert(payload);
        if (error) throw error;
      }
      setShowWebhookModal(false);
      fetchWebhooks();
    } catch (err: any) {
      setWebhookFormError(err.message || 'Failed to save integration.');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleToggleWebhookActive = async (wh: any) => {
    const { error } = await supabase.from('integrations').update({ is_active: !wh.is_active, updated_at: new Date().toISOString() }).eq('id', wh.id);
    if (!error) setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, is_active: !w.is_active } : w));
  };

  const handleDeleteWebhook = async (whId: string) => {
    if (!confirm('Delete this integration? Webhook delivery will stop immediately.')) return;
    const { error } = await supabase.from('integrations').delete().eq('id', whId);
    if (!error) setWebhooks(prev => prev.filter(w => w.id !== whId));
  };

  const handleTestWebhook = async (wh: any) => {
    setTestingWebhookId(wh.id);
    setWebhookTestResult(null);
    try {
      const project = webhookProjects.find(p => p.id === wh.project_id);
      const projectName = project?.name ?? 'your project';
      const projectLink = `https://www.testably.app/projects/${wh.project_id}`;
      // Slack Incoming Webhooks accept simple {"text": "..."} — use that to maximise compatibility
      const testPayload = wh.type === 'slack'
        ? { text: `🧪 *Testably Test Message*\nWebhook connection verified for *${projectName}*. <${projectLink}|View in Testably>` }
        : { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4', body: [{ type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: '🧪 Testably Test Message' }, { type: 'TextBlock', text: `Webhook connection verified for ${projectName}.`, wrap: true }], actions: [{ type: 'Action.OpenUrl', title: 'View in Testably', url: projectLink }] } }] };
      const edgeFnUrl = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-webhook`;
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: wh.webhook_url, payload: testPayload }),
      });
      const json = await res.json().catch(() => ({}));
      const httpStatus = typeof json.status === 'number' ? json.status : (res.ok ? 200 : 500);
      const ok = res.ok && httpStatus >= 200 && httpStatus < 300;
      setWebhookTestResult({ id: wh.id, ok, msg: ok ? 'Test message sent successfully!' : `Delivery failed (HTTP ${httpStatus})` });
    } catch (err: any) {
      setWebhookTestResult({ id: wh.id, ok: false, msg: err.message ?? 'Network error' });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const openWebhookLogs = async (whId: string) => {
    setWebhookLogsId(whId);
    setWebhookLogsLoading(true);
    const { data } = await supabase.from('integration_logs').select('id, event_type, status, response_code, error_message, created_at').eq('integration_id', whId).order('created_at', { ascending: false }).limit(50);
    setWebhookLogs(data ?? []);
    setWebhookLogsLoading(false);
  };

  const toggleWebhookEvent = (eventType: WebhookEventType) => {
    setWebhookForm(prev => ({ ...prev, events: prev.events.includes(eventType) ? prev.events.filter(e => e !== eventType) : [...prev.events, eventType] }));
  };

  // ── CI/CD helpers ─────────────────────────────────────────────────────────

  const fetchCITokens = async () => {
    try {
      setLoadingTokens(true);
      const { data, error } = await supabase
        .from('ci_tokens')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCiTokens(data || []);
    } catch (error) {
      console.error('CI 토큰 로딩 오류:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      alert('Please enter a token name.');
      return;
    }

    try {
      setCreatingToken(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const token = `testably_${crypto.randomUUID().replace(/-/g, '')}`;

      const { error } = await supabase
        .from('ci_tokens')
        .insert({
          user_id: user.id,
          token,
          name: newTokenName.trim(),
        });

      if (error) throw error;

      alert('API token created. Please store it in a safe place.');
      setNewTokenName('');
      setShowNewTokenModal(false);
      fetchCITokens();
    } catch (error) {
      console.error('Token creation error:', error);
      alert('Failed to create token.');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleCopyToken = (token: string) => {
    const doCopy = () => {
      if (navigator.clipboard && document.hasFocus()) {
        navigator.clipboard.writeText(token).then(() => {
          setCopiedToken(token);
          setTimeout(() => setCopiedToken(null), 2000);
        }).catch(() => {
          fallbackCopy(token);
        });
      } else {
        fallbackCopy(token);
      }
    };

    const fallbackCopy = (text: string) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedToken(text);
        setTimeout(() => setCopiedToken(null), 2000);
      } catch (err) {
        console.error('복사 실패:', err);
      } finally {
        document.body.removeChild(textarea);
      }
    };

    doCopy();
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ci_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;

      alert('Token deleted successfully.');
      fetchCITokens();
    } catch (error) {
      console.error('Token deletion error:', error);
      alert('Failed to delete token.');
    }
  };

  const getYAMLSnippet = (platform: 'github' | 'gitlab', token: string) => {
    const supabaseUrl = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`;
    if (platform === 'github') {
      return `name: Upload Test Results to Testably

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Tests
        run: |
          # Your test commands here
          npm test
      
      - name: Upload Results to Testably
        if: always()
        env:
          TESTABLY_URL: \${{ secrets.TESTABLY_URL }}
          TESTABLY_TOKEN: \${{ secrets.TESTABLY_TOKEN }}
        run: |
          curl -X POST "\$TESTABLY_URL" \\
            -H "Authorization: Bearer \$TESTABLY_TOKEN" \\
            -H "Content-Type: application/json" \\
            -d '{
              "run_id": "YOUR_RUN_ID",
              "results": [
                {
                  "test_case_id": "SUI-1",
                  "status": "passed",
                  "note": "Test passed successfully",
                  "elapsed": 1.5,
                  "author": "GitHub Actions"
                }
              ]
            }'`;
    } else {
      return `stages:
  - test
  - upload

variables:
  TESTABLY_URL: \$TESTABLY_URL
  TESTABLY_TOKEN: \$TESTABLY_TOKEN

test:
  stage: test
  script:
    - npm test
  artifacts:
    reports:
      junit: test-results.xml

upload_results:
  stage: upload
  script:
    - |
      curl -X POST "\$TESTABLY_URL" \\
        -H "Authorization: Bearer \$TESTABLY_TOKEN" \\
        -H "Content-Type: application/json" \\
        -d '{
          "run_id": "'$CI_PIPELINE_ID'",
          "results": [
            {
              "test_case_id": "SUI-1",
              "status": "passed",
              "note": "Test passed successfully",
              "elapsed": 1.5,
              "author": "GitLab CI"
            }
          ]
        }'
  when: always`;
    }
  };

  const getPythonFunctionSnippet = () => {
    return `import requests
import os

# Testably API URL (fixed, no changes needed)
TESTABLY_URL = "${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results"

# Read token from environment variable
TESTABLY_TOKEN = os.environ.get("TESTABLY_TOKEN")

# List to hold results
results = []

def report_result(test_case_id: str, status: str, note: str = "", elapsed: float = 0):
    """Add a test result to the results list."""
    results.append({
        "test_case_id": test_case_id,
        "status": status,       # "passed" | "failed" | "blocked" | "retest"
        "note": note,           # Optional note
        "elapsed": elapsed,     # Elapsed time in seconds (optional)
        "author": "pytest"
    })

# ── Example test functions ────────────────────────────────
def test_login():
    result = True  # Replace with actual test logic
    status = "passed" if result else "failed"
    report_result("SUI-1", status, note="Login test passed")
    return result

def test_signup():
    result = True
    status = "passed" if result else "failed"
    report_result("SUI-2", status, note="Signup flow verified")
    return result

# ── Upload results ─────────────────────────────────────────
if __name__ == "__main__":
    test_login()
    test_signup()

    response = requests.post(
        TESTABLY_URL,
        headers={"Authorization": f"Bearer {TESTABLY_TOKEN}"},
        json={
            "run_id": "YOUR_RUN_ID",   # Replace with your Testably Run ID
            "results": results
        }
    )
    print("Status:", response.status_code)
    print("Response:", response.text)`;
  };

  const getPythonConftestSnippet = () => {
    return `# conftest.py  ← Save this in your project root
import pytest
import requests
import os
import time

# Read from environment variables
TESTABLY_URL = os.environ.get("TESTABLY_URL", "${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results")
TESTABLY_TOKEN = os.environ.get("TESTABLY_TOKEN")
RUN_ID = os.environ.get("TESTABLY_RUN_ID", "YOUR_RUN_ID")

# Test case ID mapping (test function name → Testably ID)
TEST_CASE_MAP = {
    "test_login":  "SUI-1",
    "test_signup": "SUI-2",
    # Add more mappings as needed
}

_results = []
_timings: dict[str, float] = {}

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_call(item):
    """Measure execution time for each test."""
    start = time.time()
    yield
    _timings[item.name] = round(time.time() - start, 2)

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Collect test results."""
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        test_case_id = TEST_CASE_MAP.get(item.name)
        if not test_case_id:
            return  # Skip unmapped tests

        if report.passed:
            status = "passed"
            note = "Automated test passed"
        elif report.failed:
            status = "failed"
            note = str(report.longrepr)[:300] if report.longrepr else "Test failed"
        else:
            status = "blocked"
            note = "Test skipped/blocked"

        _results.append({
            "test_case_id": test_case_id,
            "status": status,
            "note": note,
            "elapsed": _timings.get(item.name, 0),
            "author": "pytest"
        })

def pytest_sessionfinish(session, exitstatus):
    """Upload results to Testably after all tests complete."""
    if not _results or not TESTABLY_TOKEN:
        return

    response = requests.post(
        TESTABLY_URL,
        headers={"Authorization": f"Bearer {TESTABLY_TOKEN}"},
        json={"run_id": RUN_ID, "results": _results}
    )
    print(f"\\n[Testably] Uploaded: {response.status_code} — {len(_results)} results")`;
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      setPrefsError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const payload = {
        id: user.id,
        email: user.email,
        timezone: autoDetectTz ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone,
        date_format: dateFormat,
        time_format: timeFormat,
        default_project_id: defaultProjectId || null,
        language,
        auto_detect_tz: autoDetectTz,
      };
      const { error } = await supabase.from('profiles').upsert(
        payload as Record<string, unknown>,
        { onConflict: 'id' }
      );
      if (error) throw error;
      setPreferencesSaved(true);
      setTimeout(() => setPreferencesSaved(false), 3000);
    } catch (e) {
      console.error('Preferences save error:', e);
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
      setPrefsError(msg);
    } finally {
      setSavingPreferences(false);
    }
  };

  const formatExportDate = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    try {
      const tz = autoDetectTz ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
      const date = new Date(isoString);
      const opts: Intl.DateTimeFormatOptions = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' };
      const parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(date);
      const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
      const year = get('year'), month = get('month'), day = get('day');
      const hour = get('hour'), minute = get('minute'), dayPeriod = get('dayPeriod');
      let datePart = '';
      if (dateFormat === 'MM/DD/YYYY') datePart = `${month}/${day}/${year}`;
      else if (dateFormat === 'DD/MM/YYYY') datePart = `${day}/${month}/${year}`;
      else datePart = `${year}-${month}-${day}`;
      const timePart = timeFormat === '12h' ? `${hour}:${minute} ${dayPeriod}` : `${hour}:${minute}`;
      return `${datePart} ${timePart}`;
    } catch {
      return isoString;
    }
  };

  const buildExportHelpers = async (projectIds: string[]) => {
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, prefix')
      .in('id', projectIds);
    const projectNameMap: Record<string, string> = {};
    const projectPrefixMap: Record<string, string> = {};
    (projectsData ?? []).forEach((p: any) => {
      projectNameMap[p.id] = p.name;
      projectPrefixMap[p.id] = p.prefix || 'TC';
    });

    const { data: allTcs } = await supabase
      .from('test_cases')
      .select('id, custom_id, project_id')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true });
    const tcIdLabelMap: Record<string, string> = {};
    const projectTcCounter: Record<string, number> = {};
    (allTcs ?? []).forEach((tc: any) => {
      if (tc.custom_id) {
        tcIdLabelMap[tc.id] = tc.custom_id;
      } else {
        const prefix = projectPrefixMap[tc.project_id] || 'TC';
        projectTcCounter[prefix] = (projectTcCounter[prefix] || 0) + 1;
        tcIdLabelMap[tc.id] = `${prefix}-${projectTcCounter[prefix].toString().padStart(3, '0')}`;
      }
    });

    return { projectNameMap, tcIdLabelMap };
  };

  const handleExportJSON = async () => {
    try {
      if (!userProjects.length) { alert('No projects found to export.'); return; }
      const projectIds = userProjects.map(p => p.id);
      const [{ projectNameMap, tcIdLabelMap }, tcRes, runRes] = await Promise.all([
        buildExportHelpers(projectIds),
        supabase.from('test_cases').select('*').in('project_id', projectIds).order('created_at', { ascending: true }),
        supabase.from('runs').select('*').in('project_id', projectIds),
      ]);
      const testCases = (tcRes.data || []).map((tc: any) => ({
        ...tc,
        tc_id: tcIdLabelMap[tc.id] ?? tc.id,
        project_name: projectNameMap[tc.project_id] ?? tc.project_id,
        created_at: formatExportDate(tc.created_at),
        updated_at: formatExportDate(tc.updated_at),
      }));
      const exportData = {
        exported_at: formatExportDate(new Date().toISOString()),
        user: { email: userProfile?.email, name: userProfile?.full_name },
        projects: userProjects,
        test_cases: testCases,
        runs: runRes.data || [],
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testably-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('JSON export error:', e);
      alert('Export failed. Please try again.');
    }
  };

  const handleExportCSV = async () => {
    try {
      if (!userProjects.length) { alert('No projects found to export.'); return; }
      const projectIds = userProjects.map(p => p.id);
      const [{ projectNameMap, tcIdLabelMap }, tcResult] = await Promise.all([
        buildExportHelpers(projectIds),
        supabase.from('test_cases').select('id, title, status, priority, project_id, created_at, updated_at').in('project_id', projectIds).order('created_at', { ascending: true }),
      ]);
      if (tcResult.error) throw tcResult.error;
      if (!tcResult.data || tcResult.data.length === 0) { alert('No test cases found to export.'); return; }
      const headers = ['TC ID', 'Title', 'Status', 'Priority', 'Project Name', 'Created At', 'Updated At'];
      const rows = tcResult.data.map((tc: any) =>
        [
          tcIdLabelMap[tc.id] ?? tc.id,
          tc.title,
          tc.status,
          tc.priority,
          projectNameMap[tc.project_id] ?? tc.project_id,
          formatExportDate(tc.created_at),
          formatExportDate(tc.updated_at),
        ].map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      );
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testably-testcases-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export error:', e);
      alert('Export failed. Please try again.');
    }
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO] || TIER_INFO[1];
  const isProfessionalOrHigher = currentTier >= 3;
  const isStarterOrHigher = currentTier >= 2;

  // 무료 체험 남은 일수 계산
  const trialDaysLeft = (() => {
    if (!userProfile?.is_trial || !userProfile?.trial_ends_at) return null;
    const now = new Date();
    const end = new Date(userProfile.trial_ends_at);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  // 유료 구독 만료까지 남은 일수
  const subscriptionDaysLeft = (() => {
    if (!userProfile?.subscription_ends_at || userProfile.is_trial) return null;
    const now = new Date();
    const end = new Date(userProfile.subscription_ends_at);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  const formatPrice = (monthlyPrice: number, isAnnual: boolean) => {
    if (monthlyPrice === 0) return '$0';
    if (monthlyPrice < 0) return 'Custom';
    const price = isAnnual ? (monthlyPrice * 0.85).toFixed(0) : monthlyPrice;
    return `$${Number(price).toLocaleString()}`;
  };

  const headerInitial = userProfile?.full_name?.charAt(0) || 'U';

  return (
    <>
      <SEOHead
        title="Settings | Testably"
        description="Manage your Testably account settings and integrations. Configure subscription plans, Jira integration, and notification preferences."
        noindex={true}
      />
      <div className="flex h-screen bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── 2-Row Unified Header ── */}
          <header className="bg-white border-b border-[#E2E8F0] flex-shrink-0">
            {/* Row 1: top bar */}
            <div className="flex items-center justify-between px-6" style={{ height: '3.25rem' }}>
              <div className="flex items-center gap-2">
                <Link to="/projects" className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                  <LogoMark />
                </Link>
                <span className="text-[#CBD5E1] text-sm">/</span>
                <span className="text-[0.875rem] font-semibold text-[#0F172A]">Settings</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative" ref={profileMenuRef}>
                  <div
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer overflow-hidden"
                  >
                    {userProfile?.avatar_url ? (
                      <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{headerInitial}</span>
                    )}
                  </div>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || userProfile?.email || 'User'}</p>
                        <p className="text-xs text-gray-500">{userProfile?.email}</p>
                        <div className="mt-2">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${tierInfo.color}`}>
                            {tierInfo.name}
                          </span>
                        </div>
                      </div>
                      <Link
                        to="/settings"
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100"
                      >
                        <i className="ri-settings-3-line text-lg"></i>
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
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

            {/* Row 2: Settings Tab Nav */}
            <div className="flex items-center gap-0 border-t border-[#E2E8F0] overflow-x-auto" style={{ height: '2.625rem' }}>
              {([
                { key: 'profile',       label: 'Profile',       icon: 'ri-user-settings-fill',  iconColor: '#8B5CF6' },
                { key: 'billing',       label: 'Billing',       icon: 'ri-bank-card-fill',       iconColor: '#6366F1' },
                { key: 'preferences',   label: 'Preferences',   icon: 'ri-equalizer-fill',       iconColor: '#3B82F6' },
                { key: 'members',       label: 'Members',       icon: 'ri-team-fill',            iconColor: '#22C55E' },
                { key: 'integrations',  label: 'Integrations',  icon: 'ri-plug-fill',            iconColor: '#F59E0B' },
                { key: 'api',           label: 'API & Tokens',  icon: 'ri-key-2-fill',           iconColor: '#EC4899' },
                { key: 'notifications', label: 'Notifications', icon: 'ri-notification-3-fill',  iconColor: '#EF4444' },
              ] as { key: 'profile' | 'billing' | 'preferences' | 'members' | 'integrations' | 'api' | 'notifications'; label: string; icon: string; iconColor: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-[5px] px-3 h-full text-[0.8125rem] whitespace-nowrap cursor-pointer transition-colors flex-shrink-0 border-b-2"
                  style={{
                    color: activeTab === tab.key ? '#6366F1' : '#64748B',
                    borderColor: activeTab === tab.key ? '#6366F1' : 'transparent',
                    fontWeight: activeTab === tab.key ? 600 : 500,
                  }}
                >
                  <i className={tab.icon} style={{ color: tab.iconColor, fontSize: '0.875rem' }}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto" style={{ background: '#F8FAFC' }}>
            <div className="max-w-[800px] mx-auto px-8 pt-6 pb-12">
                <div>
                  {activeTab === 'profile' && userProfile && (
                    <>
                      <ProfileSettingsPanel
                        fullName={userProfile.full_name}
                        email={userProfile.email}
                        avatarEmoji={userProfile.avatar_emoji}
                        onProfileUpdated={(name, emoji) => {
                          setUserProfile((prev) => prev ? { ...prev, full_name: name, avatar_emoji: emoji } : prev);
                        }}
                      />
                      {/* ── Data Export ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6 mb-5">
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5 flex items-center gap-2">
                          <i className="ri-download-2-line text-[#3B82F6]"></i>
                          Data Export
                        </h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-4">Download all your data including test cases, runs, and results. Available in JSON or CSV format.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleExportJSON}
                            className="inline-flex items-center gap-1.5 px-4 py-[0.4375rem] rounded-[0.375rem] border border-[#E2E8F0] bg-white text-[0.8125rem] font-medium text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors cursor-pointer"
                          >
                            <i className="ri-file-code-line"></i> Export as JSON
                          </button>
                          <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-4 py-[0.4375rem] rounded-[0.375rem] border border-[#E2E8F0] bg-white text-[0.8125rem] font-medium text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors cursor-pointer"
                          >
                            <i className="ri-file-excel-2-line"></i> Export as CSV
                          </button>
                        </div>
                      </div>
                      <DangerZoneSection email={userProfile.email} />
                    </>
                  )}

                  {activeTab === 'members' && (
                    <div>
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div>
                            <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Project Members</h3>
                            <p className="text-[0.8125rem] text-[#64748B]">Manage team members and their roles for each project.</p>
                          </div>
                          <button
                            onClick={() => setShowMembersInviteModal(true)}
                            disabled={!selectedProjectId}
                            className="flex items-center gap-1.5 px-4 py-[0.4375rem] bg-[#6366F1] text-white text-[0.8125rem] font-semibold rounded-lg hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0 ml-4"
                          >
                            <i className="ri-user-add-line"></i>
                            Invite Member
                          </button>
                        </div>
                        <div className="mb-5">
                          <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="h-9 px-3 border border-[#E2E8F0] rounded-[0.375rem] text-[0.8125rem] bg-white focus:outline-none focus:border-[#6366F1] max-w-xs w-full cursor-pointer"
                          >
                            <option value="">Select a project...</option>
                            {userProjects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        {selectedProjectId ? (
                          <ProjectMembersPanel
                            projectId={selectedProjectId}
                            onInviteClick={() => setShowMembersInviteModal(true)}
                            refreshTrigger={memberRefreshTrigger}
                          />
                        ) : (
                          <div className="text-center py-12 text-[0.8125rem] text-[#94A3B8]">
                            <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="ri-team-line text-2xl text-[#94A3B8]"></i>
                            </div>
                            <div className="text-[0.9375rem] font-semibold text-[#0F172A] mb-1">Select a project</div>
                            <div>Select a project to view and manage its members.</div>
                          </div>
                        )}
                      </div>
                      <InviteMemberModal
                        isOpen={showMembersInviteModal}
                        onClose={() => setShowMembersInviteModal(false)}
                        projectId={selectedProjectId}
                        onInvited={() => setMemberRefreshTrigger(prev => prev + 1)}
                      />
                    </div>
                  )}

                  {activeTab === 'billing' && (
                    <div className="space-y-5">
                      {/* ── Current Plan ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">Current Plan</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-5">View and manage your subscription.</p>

                        {/* Plan card */}
                        <div className="flex items-center gap-4 px-5 py-4 border-2 border-[#C7D2FE] rounded-[0.625rem] bg-[#EEF2FF] mb-4">
                          <div
                            className="w-11 h-11 rounded-[0.625rem] flex items-center justify-center flex-shrink-0 text-xl"
                            style={{ background: '#EEF2FF', color: '#6366F1' }}
                          >
                            <i className={tierInfo.icon}></i>
                          </div>
                          <div className="flex-1">
                            <div className="text-base font-bold text-[#0F172A]">{tierInfo.name}</div>
                            <div className="text-[0.8125rem] text-[#64748B]">
                              {tierInfo.monthlyPrice > 0
                                ? `$${tierInfo.monthlyPrice} / month`
                                : tierInfo.monthlyPrice === 0
                                ? 'Free'
                                : 'Custom pricing'}
                              {userProfile?.subscription_ends_at && currentTier > 1 && (
                                <> · Renews {new Date(userProfile.subscription_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                              )}
                              {userProfile?.is_trial && trialDaysLeft !== null && (
                                <> · Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</>
                              )}
                            </div>
                          </div>
                          <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-[#6366F1] text-white flex-shrink-0">
                            Current Plan
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry"
                            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-[0.375rem] bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer"
                            style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                          >
                            <i className="ri-arrow-up-circle-line text-sm"></i>
                            Upgrade
                          </a>
                          <button
                            onClick={() => setShowAllPlansModal(true)}
                            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium px-[0.875rem] py-[0.4375rem] rounded-[0.375rem] border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-colors cursor-pointer"
                          >
                            View All Plans
                          </button>
                        </div>
                      </div>

                      {/* ── Invoice History ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">Invoice History</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-5">View and download your past invoices.</p>

                        {currentTier <= 1 && !userProfile?.is_trial ? (
                          <div className="text-center py-10 text-[0.8125rem] text-[#94A3B8]">
                            <i className="ri-file-list-3-line text-3xl block mb-2 text-[#CBD5E1]"></i>
                            No invoices yet. Upgrade to a paid plan to see your billing history.
                          </div>
                        ) : (
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                {['Date', 'Description', 'Amount', 'Status', ''].map((h, i) => (
                                  <th
                                    key={i}
                                    className="bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-[#94A3B8] px-3 py-[0.625rem] text-left border-b border-[#E2E8F0]"
                                    style={i === 4 ? { textAlign: 'right' } : {}}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { date: 'Mar 15, 2026', desc: `${tierInfo.name} — Monthly`, amount: `$${tierInfo.monthlyPrice}.00` },
                                { date: 'Feb 15, 2026', desc: `${tierInfo.name} — Monthly`, amount: `$${tierInfo.monthlyPrice}.00` },
                                { date: 'Jan 15, 2026', desc: `${tierInfo.name} — Monthly`, amount: `$${tierInfo.monthlyPrice}.00` },
                              ].map((row, idx) => (
                                <tr key={idx} className="hover:bg-[#FAFAFF] transition-colors">
                                  <td className="px-3 py-[0.625rem] text-[0.75rem] text-[#94A3B8] border-b border-[#F1F5F9]">{row.date}</td>
                                  <td className="px-3 py-[0.625rem] text-[0.8125rem] text-[#334155] border-b border-[#F1F5F9]">{row.desc}</td>
                                  <td className="px-3 py-[0.625rem] text-[0.8125rem] font-semibold text-[#334155] border-b border-[#F1F5F9]">{row.amount}</td>
                                  <td className="px-3 py-[0.625rem] border-b border-[#F1F5F9]">
                                    <span className="text-[0.625rem] font-bold px-[0.4375rem] py-0.5 rounded-full bg-[#DCFCE7] text-[#166534]">Paid</span>
                                  </td>
                                  <td className="px-3 py-[0.625rem] text-right border-b border-[#F1F5F9]">
                                    <button
                                      title="Download PDF"
                                      onClick={() => alert('Invoice PDF export is coming soon. Contact hello@testably.app for manual invoice requests.')}
                                      className="w-7 h-7 rounded flex items-center justify-center border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors cursor-pointer text-sm"
                                    >
                                      <i className="ri-download-2-line"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}


                  {activeTab === 'integrations' && (
                    <div className="space-y-5">

                      {/* ════════ Jira Integration ════════ */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] flex items-center gap-1.5">
                            <i className="ri-links-fill text-[#1E40AF]"></i> Jira Integration
                          </h3>
                          {!isStarterOrHigher && (
                            <span className="px-2.5 py-0.5 bg-[#FEF9C3] text-[#854D0E] border border-[#FDE68A] rounded-full text-[0.625rem] font-semibold flex items-center gap-1">
                              <i className="ri-star-line"></i> Requires Starter or above
                            </span>
                          )}
                        </div>
                        <p className="text-[0.8125rem] text-[#64748B] mb-5">Connect your Jira account to create issues directly from test results.</p>

                        {!isStarterOrHigher && (
                          <div className="mb-4 p-4 border border-[#FDE68A] rounded-[0.75rem] flex items-start gap-3" style={{ background: 'linear-gradient(to right,#FEF9C3,#FEF3C7)' }}>
                            <div className="w-10 h-10 bg-[#FEF08A] rounded-[0.5rem] flex items-center justify-center flex-shrink-0">
                              <i className="ri-lock-line text-[#CA8A04]" style={{ fontSize: '1.25rem' }}></i>
                            </div>
                            <div className="flex-1">
                              <div className="text-[0.8125rem] font-semibold text-[#0F172A] mb-1">Jira Integration is available on Starter and above</div>
                              <div className="text-[0.75rem] text-[#64748B] mb-2.5">Create Jira issues directly from test results and enhance team collaboration.</div>
                              <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold px-3.5 py-[0.375rem] rounded-[0.375rem] text-white cursor-pointer" style={{ background: '#CA8A04' }}>
                                <i className="ri-arrow-up-circle-line"></i> Contact Us to Upgrade
                              </a>
                            </div>
                          </div>
                        )}

                        {loading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366F1]"></div>
                          </div>
                        ) : (
                          <div className={`${!isStarterOrHigher ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Connected status card */}
                            {jiraSavedDomain && (
                              <div className="flex items-center gap-3 p-3 mb-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[0.625rem]">
                                <div className="w-9 h-9 bg-[#DBEAFE] rounded-[0.5rem] flex items-center justify-center flex-shrink-0">
                                  <i className="ri-links-fill text-[#1E40AF]" style={{ fontSize: '1.125rem' }}></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[0.8125rem] font-semibold text-[#0F172A] truncate">{jiraSavedDomain}</div>
                                  <div className="text-[0.6875rem] text-[#64748B]">Issue type: {jiraSettings.issueType} · Linked issue creation enabled</div>
                                </div>
                                <span className="px-2.5 py-0.5 bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] rounded-full text-[0.625rem] font-semibold flex items-center gap-1 flex-shrink-0">
                                  <i className="ri-checkbox-circle-fill"></i> Connected
                                </span>
                              </div>
                            )}

                            {/* Jira Domain */}
                            <div className="mb-4">
                              <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">
                                Jira Domain <span className="text-[#EF4444]">*</span>
                              </label>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[0.8125rem] text-[#94A3B8]">https://</span>
                                <input
                                  type="text"
                                  value={jiraSettings.domain}
                                  onChange={(e) => {
                                    const cleaned = e.target.value.replace(/^https?:?\/?\/?\/?/i, '');
                                    setJiraSettings({ ...jiraSettings, domain: cleaned });
                                  }}
                                  placeholder="your-domain.atlassian.net"
                                  className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem]"
                                  disabled={!isStarterOrHigher}
                                />
                              </div>
                              <p className="text-[0.6875rem] text-[#94A3B8] mt-1">e.g. your-domain.atlassian.net</p>
                            </div>

                            {/* Jira Email + API Token (2-col) */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">
                                  Jira Email <span className="text-[#EF4444]">*</span>
                                </label>
                                <input
                                  type="email"
                                  value={jiraSettings.email}
                                  onChange={(e) => setJiraSettings({ ...jiraSettings, email: e.target.value })}
                                  placeholder="your-email@example.com"
                                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem]"
                                  disabled={!isStarterOrHigher}
                                />
                                <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Your Jira account email address</p>
                              </div>
                              <div>
                                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">
                                  Jira API Token <span className="text-[#EF4444]">*</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type={showApiToken ? 'text' : 'password'}
                                    value={jiraSettings.apiToken}
                                    onChange={(e) => setJiraSettings({ ...jiraSettings, apiToken: e.target.value })}
                                    placeholder="Enter your Jira API token"
                                    className="w-full px-3 py-2 pr-9 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem]"
                                    disabled={!isStarterOrHigher}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowApiToken(!showApiToken)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer"
                                    disabled={!isStarterOrHigher}
                                  >
                                    <i className={`${showApiToken ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`}></i>
                                  </button>
                                </div>
                                <a
                                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[0.6875rem] text-[#6366F1] hover:underline mt-1 inline-block"
                                >
                                  Generate API token here ↗
                                </a>
                              </div>
                            </div>

                            {/* Default Issue Type + buttons (same row) */}
                            <div className="mb-3">
                              <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">
                                Default Issue Type
                              </label>
                              <div className="flex items-center gap-2">
                                <select
                                  value={jiraSettings.issueType}
                                  onChange={(e) => setJiraSettings({ ...jiraSettings, issueType: e.target.value })}
                                  className="w-[200px] px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem] cursor-pointer"
                                  disabled={!isStarterOrHigher}
                                >
                                  <option value="Bug">Bug</option>
                                  <option value="Task">Task</option>
                                  <option value="Story">Story</option>
                                  <option value="Epic">Epic</option>
                                </select>
                                <button
                                  onClick={handleTestConnection}
                                  disabled={testing || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken || !isStarterOrHigher}
                                  className="inline-flex items-center gap-[0.3125rem] px-4 py-[0.4375rem] border border-[#E2E8F0] bg-white text-[#475569] rounded-md hover:bg-[#F8FAFC] transition-colors text-[0.8125rem] font-medium cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {testing ? <><i className="ri-loader-4-line animate-spin"></i>Testing...</> : <><i className="ri-link"></i>Test Connection</>}
                                </button>
                                <button
                                  onClick={handleSaveJiraSettings}
                                  disabled={saving || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken || !isStarterOrHigher}
                                  className="inline-flex items-center gap-[0.3125rem] px-4 py-[0.4375rem] bg-[#6366F1] text-white rounded-md hover:bg-[#4F46E5] transition-colors text-[0.8125rem] font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                                >
                                  {saving ? <><i className="ri-loader-4-line animate-spin"></i>Saving...</> : <><i className="ri-save-line"></i>Save Settings</>}
                                </button>
                              </div>
                              <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Default issue type when creating new issues</p>
                            </div>

                            {/* Auto-create Issue on Failure */}
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">Auto-create Jira Issue</h4>
                              <p className="text-xs text-gray-500 mb-3">Automatically create a Jira issue when a test case is marked as Failed.</p>
                              <select
                                value={jiraSettings.autoCreateOnFailure}
                                onChange={(e) => setJiraSettings({ ...jiraSettings, autoCreateOnFailure: e.target.value })}
                                disabled={!isStarterOrHigher}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="disabled">Disabled (manual only)</option>
                                <option value="all_failures">Create for all failures</option>
                                <option value="first_failure_only">Create for first failure only</option>
                              </select>
                            </div>

                            {/* Field Mapping */}
                            {jiraSavedDomain && (
                              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-900">Field Mapping</h4>
                                  <button
                                    onClick={handleFetchJiraFields}
                                    disabled={fetchingFields || !jiraSettings.apiToken || !isStarterOrHigher}
                                    className="text-xs font-medium px-3 py-1.5 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {fetchingFields ? <><i className="ri-loader-4-line animate-spin mr-1" />Fetching...</> : <><i className="ri-refresh-line mr-1" />Fetch Jira Fields</>}
                                  </button>
                                </div>

                                <table className="w-full text-xs mb-3">
                                  <thead>
                                    <tr className="text-gray-500 border-b">
                                      <th className="text-left py-1.5">Testably Field</th>
                                      <th className="text-left py-1.5 px-2">→</th>
                                      <th className="text-left py-1.5">Jira Field</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr><td className="py-1">Test Case Title</td><td className="px-2">→</td><td className="text-gray-400">summary (auto)</td></tr>
                                    <tr><td className="py-1">Description + Steps</td><td className="px-2">→</td><td className="text-gray-400">description (auto)</td></tr>
                                    <tr><td className="py-1">Priority</td><td className="px-2">→</td><td className="text-gray-400">priority (auto)</td></tr>
                                  </tbody>
                                </table>

                                {jiraSettings.fieldMappings.map((mapping, idx) => (
                                  <div key={idx} className="flex items-center gap-2 mb-2">
                                    <select
                                      className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white"
                                      value={mapping.testably_field}
                                      onChange={(e) => updateFieldMapping(idx, { testably_field: e.target.value })}
                                    >
                                      <option value="tc_tags">Tags</option>
                                      <option value="tc_precondition">Precondition</option>
                                      <option value="milestone_name">Milestone Name</option>
                                      <option value="run_name">Run Name</option>
                                      <option value="custom_text">Custom Text</option>
                                    </select>
                                    <span className="text-gray-400 text-xs">→</span>
                                    <select
                                      className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white"
                                      value={mapping.jira_field_id}
                                      onChange={(e) => {
                                        const f = availableJiraFields.find(f => f.id === e.target.value);
                                        updateFieldMapping(idx, { jira_field_id: e.target.value, jira_field_name: f?.name || '' });
                                      }}
                                    >
                                      <option value="">Select Jira field...</option>
                                      {availableJiraFields.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}{f.custom ? ' (custom)' : ''}</option>
                                      ))}
                                    </select>
                                    <button onClick={() => removeFieldMapping(idx)} className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0">
                                      <i className="ri-delete-bin-line" />
                                    </button>
                                  </div>
                                ))}
                                <button onClick={addFieldMapping} disabled={!isStarterOrHigher} className="text-xs text-indigo-600 font-medium mt-1 cursor-pointer disabled:opacity-50">
                                  + Add Custom Field Mapping
                                </button>
                              </div>
                            )}

                            {/* Test Result Message */}
                            {testResult && (
                              <div className={`px-3 py-2.5 rounded-[0.5rem] border flex items-center gap-1.5 text-[0.8125rem] mt-2 ${
                                testResult.success
                                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                              }`}>
                                <i className={testResult.success ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}></i>
                                {testResult.message}
                              </div>
                            )}
                            {/* Save Result Message */}
                            {jiraSaveResult && (
                              <div className={`px-3 py-2.5 rounded-[0.5rem] border flex items-center gap-1.5 text-[0.8125rem] mt-2 ${
                                jiraSaveResult.success
                                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                              }`}>
                                <i className={jiraSaveResult.success ? 'ri-checkbox-circle-fill' : 'ri-error-warning-line'}></i>
                                {jiraSaveResult.message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Slack & Teams Webhooks ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] flex items-center gap-1.5">
                            <i className="ri-webhook-fill text-[#F59E0B]"></i> Slack &amp; Teams Webhooks
                          </h3>
                          {!isStarterOrHigher && (
                            <span className="px-2.5 py-0.5 bg-[#FEF9C3] text-[#854D0E] border border-[#FDE68A] rounded-full text-[0.625rem] font-semibold flex items-center gap-1">
                              <i className="ri-star-line"></i> Requires Starter or above
                            </span>
                          )}
                        </div>
                        <p className="text-[0.8125rem] text-[#64748B] mb-5">Send real-time notifications to Slack or Microsoft Teams when events occur in your projects.</p>

                        {!isStarterOrHigher && (
                          <div className="mb-4 p-4 border border-[#FDE68A] rounded-[0.75rem] flex items-start gap-3" style={{ background: 'linear-gradient(to right,#FEF9C3,#FEF3C7)' }}>
                            <div className="w-10 h-10 bg-[#FEF08A] rounded-[0.5rem] flex items-center justify-center flex-shrink-0">
                              <i className="ri-lock-line text-[#CA8A04]" style={{ fontSize: '1.25rem' }}></i>
                            </div>
                            <div className="flex-1">
                              <div className="text-[0.8125rem] font-semibold text-[#0F172A] mb-1">Slack &amp; Teams Integration is available on Starter and above</div>
                              <div className="text-[0.75rem] text-[#64748B] mb-2.5">Get real-time notifications in Slack or Microsoft Teams when test runs complete, milestones change, and more.</div>
                              <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold px-3.5 py-[0.375rem] rounded-[0.375rem] text-white cursor-pointer" style={{ background: '#CA8A04' }}>
                                <i className="ri-arrow-up-circle-line"></i> Contact Us to Upgrade
                              </a>
                            </div>
                          </div>
                        )}

                        {isStarterOrHigher && (
                          <div className={loadingWebhooks ? 'opacity-50 pointer-events-none' : ''}>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[0.8125rem] text-[#64748B]">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured across all projects</span>
                              <button
                                onClick={openAddWebhookModal}
                                className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer"
                                style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                              >
                                <i className="ri-add-line"></i>Add Integration
                              </button>
                            </div>

                            {loadingWebhooks ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#6366F1]"></div>
                              </div>
                            ) : webhooks.length === 0 ? (
                              <div className="bg-[#F8FAFC] rounded-[0.75rem] border border-dashed border-[#E2E8F0] p-10 text-center">
                                <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-3">
                                  <i className="ri-plug-line text-[#94A3B8]" style={{ fontSize: '1.5rem' }}></i>
                                </div>
                                <div className="text-[0.9375rem] font-semibold text-[#0F172A] mb-1">No webhooks yet</div>
                                <p className="text-[0.8125rem] text-[#64748B] mb-4">Connect Slack or Microsoft Teams to receive real-time alerts about test runs and milestones.</p>
                                <button onClick={openAddWebhookModal} className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer">
                                  <i className="ri-add-line"></i>Add your first integration
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {webhooks.map(wh => {
                                  const meta = WEBHOOK_TYPE_META[wh.type as 'slack' | 'teams'];
                                  const project = webhookProjects.find(p => p.id === wh.project_id);
                                  const isTestingThis = testingWebhookId === wh.id;
                                  const thisTestResult = webhookTestResult?.id === wh.id ? webhookTestResult : null;
                                  const showingLogs = webhookLogsId === wh.id;
                                  return (
                                    <div key={wh.id} className="bg-[#F8FAFC] rounded-[0.75rem] border border-[#E2E8F0] p-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                          <div className="w-9 h-9 rounded-[0.5rem] flex items-center justify-center flex-shrink-0" style={{ background: meta.iconBg, color: meta.iconColor }}>
                                            <i className={meta.icon} style={{ fontSize: '1.125rem' }}></i>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{meta.label}</span>
                                              {wh.channel_name && <span className="text-[0.8125rem] text-[#64748B]">#{wh.channel_name}</span>}
                                              <span className={`px-1.5 py-0.5 text-[0.625rem] font-semibold rounded-full ${wh.is_active ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                                                {wh.is_active ? 'Active' : 'Paused'}
                                              </span>
                                              {project && (
                                                <span className="px-1.5 py-0.5 text-[0.625rem] font-semibold bg-[#FFF7ED] text-[#C2410C] rounded-full border border-[#FFEDD5] truncate max-w-[160px]">
                                                  <i className="ri-folder-line mr-0.5"></i>{project.name}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[0.6875rem] text-[#94A3B8] mt-0.5 truncate">{wh.webhook_url}</p>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                              {(wh.events as string[]).map((ev: string) => {
                                                const evMeta = WEBHOOK_EVENTS.find(e => e.type === ev);
                                                return (
                                                  <span key={ev} className="px-1.5 py-0.5 text-[0.625rem] bg-[#EEF2FF] text-[#4338CA] rounded-full border border-[#C7D2FE]">
                                                    {evMeta?.label ?? ev}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          <button onClick={() => handleTestWebhook(wh)} disabled={isTestingThis} title="Test" className="w-7 h-7 flex items-center justify-center text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-[0.375rem] transition-colors cursor-pointer disabled:opacity-50">
                                            {isTestingThis ? <i className="ri-loader-4-line animate-spin" style={{ fontSize: '0.875rem' }}></i> : <i className="ri-send-plane-line" style={{ fontSize: '0.875rem' }}></i>}
                                          </button>
                                          <button onClick={() => showingLogs ? setWebhookLogsId(null) : openWebhookLogs(wh.id)} title="Logs" className="w-7 h-7 flex items-center justify-center text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-[0.375rem] transition-colors cursor-pointer">
                                            <i className="ri-history-line" style={{ fontSize: '0.875rem' }}></i>
                                          </button>
                                          <button onClick={() => handleToggleWebhookActive(wh)} title={wh.is_active ? 'Pause' : 'Resume'} className="w-7 h-7 flex items-center justify-center text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-[0.375rem] transition-colors cursor-pointer">
                                            <i className={wh.is_active ? 'ri-pause-line' : 'ri-play-line'} style={{ fontSize: '0.875rem' }}></i>
                                          </button>
                                          <button onClick={() => openEditWebhookModal(wh)} title="Edit" className="w-7 h-7 flex items-center justify-center text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-[0.375rem] transition-colors cursor-pointer">
                                            <i className="ri-edit-line" style={{ fontSize: '0.875rem' }}></i>
                                          </button>
                                          <button onClick={() => handleDeleteWebhook(wh.id)} title="Delete" className="w-7 h-7 flex items-center justify-center text-[#DC2626] bg-white border border-[#E2E8F0] hover:bg-[#FEF2F2] rounded-[0.375rem] transition-colors cursor-pointer">
                                            <i className="ri-delete-bin-line" style={{ fontSize: '0.875rem' }}></i>
                                          </button>
                                        </div>
                                      </div>

                                      {thisTestResult && (
                                        <div className={`mt-3 px-3 py-2 rounded-[0.5rem] text-[0.8125rem] flex items-center gap-2 ${thisTestResult.ok ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]' : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'}`}>
                                          <i className={thisTestResult.ok ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}></i>
                                          {thisTestResult.msg}
                                        </div>
                                      )}

                                      {showingLogs && (
                                        <div className="mt-3 border-t border-[#E2E8F0] pt-3">
                                          <div className="text-[0.8125rem] font-semibold text-[#334155] mb-2">Delivery Logs (last 50)</div>
                                          {webhookLogsLoading ? (
                                            <div className="flex items-center gap-2 text-[0.8125rem] text-[#64748B]"><i className="ri-loader-4-line animate-spin"></i> Loading…</div>
                                          ) : webhookLogs.length === 0 ? (
                                            <p className="text-[0.8125rem] text-[#94A3B8]">No deliveries yet.</p>
                                          ) : (
                                            <div className="overflow-x-auto">
                                              <table className="w-full">
                                                <thead>
                                                  <tr className="text-[0.6875rem] text-[#94A3B8] border-b border-[#F1F5F9]">
                                                    <th className="text-left py-1.5 pr-4 font-semibold">Event</th>
                                                    <th className="text-left py-1.5 pr-4 font-semibold">Status</th>
                                                    <th className="text-left py-1.5 pr-4 font-semibold">Code</th>
                                                    <th className="text-left py-1.5 font-semibold">Time</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {webhookLogs.map(log => (
                                                    <tr key={log.id} className="border-b border-[#F8FAFC]">
                                                      <td className="py-1.5 pr-4 font-mono text-[0.6875rem] text-[#64748B]">{log.event_type}</td>
                                                      <td className="py-1.5 pr-4">
                                                        <span className={`px-1.5 py-0.5 text-[0.625rem] font-semibold rounded-full ${log.status === 'success' ? 'bg-[#DCFCE7] text-[#166534]' : log.status === 'failed' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                                                          {log.status}
                                                        </span>
                                                      </td>
                                                      <td className="py-1.5 pr-4 text-[0.6875rem] text-[#94A3B8]">{log.response_code ?? '—'}</td>
                                                      <td className="py-1.5 text-[0.6875rem] text-[#94A3B8] whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── CI/CD Integration ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] flex items-center gap-1.5">
                            <i className="ri-git-branch-fill text-[#22C55E]"></i> CI/CD Pipelines
                          </h3>
                          {!isProfessionalOrHigher && (
                            <span className="px-2.5 py-0.5 bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] rounded-full text-[0.625rem] font-semibold flex items-center gap-1">
                              <i className="ri-vip-crown-line"></i> Requires Professional or above
                            </span>
                          )}
                        </div>
                        <p className="text-[0.8125rem] text-[#64748B] mb-5">Connect your CI/CD pipeline to automatically report test results.</p>

                        {!isProfessionalOrHigher && (
                          <div className="mb-4 p-4 border border-[#C7D2FE] rounded-[0.75rem] flex items-start gap-3" style={{ background: 'linear-gradient(to right,#EEF2FF,#F5F3FF)' }}>
                            <div className="w-10 h-10 bg-[#C7D2FE] rounded-[0.5rem] flex items-center justify-center flex-shrink-0">
                              <i className="ri-lock-line text-[#4F46E5]" style={{ fontSize: '1.25rem' }}></i>
                            </div>
                            <div className="flex-1">
                              <div className="text-[0.8125rem] font-semibold text-[#0F172A] mb-1">CI/CD Integration is available on Professional and above</div>
                              <div className="text-[0.75rem] text-[#64748B] mb-2.5">Upload results directly from your automated test pipelines.</div>
                              <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold px-3.5 py-[0.375rem] rounded-[0.375rem] text-white cursor-pointer" style={{ background: '#6366F1' }}>
                                <i className="ri-arrow-up-circle-line"></i> Contact Us to Upgrade
                              </a>
                            </div>
                          </div>
                        )}

                        <div className={`space-y-6 ${!isProfessionalOrHigher ? 'opacity-50 pointer-events-none' : ''}`}>
                          {ciTokens.length === 0 ? (
                            <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-[0.75rem] flex items-start gap-3">
                              <i className="ri-information-line text-[#D97706] text-lg flex-shrink-0 mt-0.5"></i>
                              <div>
                                <p className="text-[0.8125rem] font-semibold text-[#92400E] mb-1">Create an API token first</p>
                                <p className="text-[0.8125rem] text-[#A16207]">
                                  Go to the{' '}
                                  <button onClick={() => setActiveTab('api')} className="font-semibold underline cursor-pointer">API &amp; Tokens</button>
                                  {' '}tab to create a token before setting up CI/CD integration.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5 mb-4">
                                {(['github', 'gitlab', 'python'] as const).map(p => (
                                  <button
                                    key={p}
                                    onClick={() => setSelectedPlatform(p)}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-[0.4375rem] rounded-[0.375rem] text-[0.75rem] font-medium border transition-all cursor-pointer ${selectedPlatform === p ? 'bg-[#6366F1] text-white border-[#6366F1]' : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:bg-[#E2E8F0]'}`}
                                  >
                                    <i className={p === 'github' ? 'ri-github-fill' : p === 'gitlab' ? 'ri-gitlab-fill' : 'ri-code-s-slash-line'}></i>
                                    {p === 'github' ? 'GitHub Actions' : p === 'gitlab' ? 'GitLab CI' : 'Python'}
                                  </button>
                                ))}
                              </div>

                              <div className="mb-4 p-4 bg-[#EEF2FF] border border-[#C7D2FE] rounded-[0.75rem]">
                                <div className="flex items-center gap-1.5 mb-3">
                                  <i className="ri-settings-4-line text-[#4F46E5]"></i>
                                  <span className="text-[0.8125rem] font-bold text-[#3730A3]">
                                    Register in your{' '}
                                    {selectedPlatform === 'github' ? 'GitHub Secrets' : selectedPlatform === 'gitlab' ? 'GitLab CI/CD Variables' : 'environment variables'}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 bg-white border border-[#C7D2FE] rounded-[0.375rem] px-3 py-2">
                                    <span className="text-[0.6875rem] font-bold font-mono text-[#4338CA] w-32 flex-shrink-0">TESTABLY_URL</span>
                                    <span className="text-[0.6875rem] text-[#94A3B8] font-mono flex-1 truncate">{`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`}</span>
                                    <button onClick={() => handleCopyToken(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`)} title="Copy" className="w-6 h-6 flex items-center justify-center bg-[#EEF2FF] hover:bg-[#C7D2FE] text-[#4338CA] rounded flex-shrink-0 transition-colors cursor-pointer">
                                      {copiedToken === `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results` ? <i className="ri-check-line" style={{ fontSize: '0.75rem' }}></i> : <i className="ri-file-copy-line" style={{ fontSize: '0.75rem' }}></i>}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white border border-[#C7D2FE] rounded-[0.375rem] px-3 py-2">
                                    <span className="text-[0.6875rem] font-bold font-mono text-[#4338CA] w-32 flex-shrink-0">TESTABLY_TOKEN</span>
                                    <span className="text-[0.6875rem] text-[#94A3B8] font-mono flex-1 truncate">{ciTokens[0].token}</span>
                                    <button onClick={() => handleCopyToken(ciTokens[0].token)} title="Copy" className="w-6 h-6 flex items-center justify-center bg-[#EEF2FF] hover:bg-[#C7D2FE] text-[#4338CA] rounded flex-shrink-0 transition-colors cursor-pointer">
                                      {copiedToken === ciTokens[0].token ? <i className="ri-check-line" style={{ fontSize: '0.75rem' }}></i> : <i className="ri-file-copy-line" style={{ fontSize: '0.75rem' }}></i>}
                                    </button>
                                  </div>
                                </div>
                                <div className="text-[0.6875rem] text-[#4338CA] mt-2 flex items-center gap-1">
                                  <i className="ri-information-line"></i> Registering both values as environment variables keeps them secure without modifying your code.
                                </div>
                              </div>

                              {selectedPlatform === 'python' ? (
                                <div className="space-y-4 mt-3">
                                  {/* Method 1: Function-based */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-5 h-5 bg-[#6366F1] text-white rounded-full flex items-center justify-center flex-shrink-0" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>1</span>
                                      <div className="text-[0.8125rem] font-bold text-[#0F172A]">Function-based approach <span className="font-normal text-[#94A3B8]">— suitable for simple scripts</span></div>
                                    </div>
                                    <div className="text-[0.75rem] text-[#64748B] mb-2 ml-7">Collect results using the <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">report_result()</code> function and upload them all at once at the end.</div>
                                    <div className="relative">
                                      <button
                                        onClick={() => handleCopyToken(getPythonFunctionSnippet())}
                                        className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-[0.3125rem] rounded-[0.375rem] text-[0.6875rem] cursor-pointer transition-all z-10"
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: copiedToken === getPythonFunctionSnippet() ? '#86EFAC' : '#94A3B8' }}
                                      >
                                        <i className={copiedToken === getPythonFunctionSnippet() ? 'ri-check-line' : 'ri-file-copy-line'}></i>
                                        {copiedToken === getPythonFunctionSnippet() ? 'Copied' : 'Copy'}
                                      </button>
                                      <pre className="overflow-x-auto font-mono whitespace-pre p-4 rounded-[0.5rem]" style={{ background: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', lineHeight: '1.6' }}><code>{getPythonFunctionSnippet()}</code></pre>
                                    </div>
                                  </div>

                                  {/* Method 2: conftest.py */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="w-5 h-5 bg-[#6366F1] text-white rounded-full flex items-center justify-center flex-shrink-0" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>2</span>
                                      <div className="text-[0.8125rem] font-bold text-[#0F172A]">conftest.py approach <span className="font-normal text-[#94A3B8]">— suitable for pytest projects</span></div>
                                    </div>
                                    <div className="text-[0.75rem] text-[#64748B] mb-2 ml-7">Uses pytest hooks to automatically collect and upload results without modifying test code.</div>
                                    <div className="relative">
                                      <button
                                        onClick={() => handleCopyToken(getPythonConftestSnippet())}
                                        className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-[0.3125rem] rounded-[0.375rem] text-[0.6875rem] cursor-pointer transition-all z-10"
                                        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: copiedToken === getPythonConftestSnippet() ? '#86EFAC' : '#94A3B8' }}
                                      >
                                        <i className={copiedToken === getPythonConftestSnippet() ? 'ri-check-line' : 'ri-file-copy-line'}></i>
                                        {copiedToken === getPythonConftestSnippet() ? 'Copied' : 'Copy'}
                                      </button>
                                      <pre className="overflow-x-auto font-mono whitespace-pre p-4 rounded-[0.5rem]" style={{ background: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', lineHeight: '1.6' }}><code>{getPythonConftestSnippet()}</code></pre>
                                    </div>
                                  </div>

                                  {/* How to use */}
                                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[0.5rem]">
                                    <div className="flex items-start gap-2">
                                      <i className="ri-information-line text-[#64748B] flex-shrink-0 mt-0.5"></i>
                                      <div className="text-[0.75rem] text-[#475569]">
                                        <div className="font-semibold mb-1.5">How to use:</div>
                                        <div className="text-[#64748B] leading-relaxed">
                                          1. Register your token in the <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">TESTABLY_TOKEN</code> environment variable<br />
                                          2. <b>Method 1</b>: Pass the test case ID and result to <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">report_result()</code><br />
                                          3. <b>Method 2</b>: Save <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">conftest.py</code> to your project root and map function names to IDs<br />
                                          4. Replace <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">run_id</code> with the Run ID from Testably<br />
                                          5. Status values: <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">passed</code> / <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">failed</code> / <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">blocked</code> / <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">retest</code>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative mt-3">
                                  <button
                                    onClick={() => handleCopyToken(getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token))}
                                    className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-[0.3125rem] rounded-[0.375rem] text-[0.6875rem] cursor-pointer transition-all z-10"
                                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: copiedToken === getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token) ? '#86EFAC' : '#94A3B8' }}
                                  >
                                    <i className={copiedToken === getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token) ? 'ri-check-line' : 'ri-file-copy-line'}></i>
                                    {copiedToken === getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token) ? 'Copied' : 'Copy'}
                                  </button>
                                  <pre className="overflow-x-auto font-mono p-4 rounded-[0.5rem]" style={{ background: '#1E293B', color: '#E2E8F0', fontSize: '0.75rem', lineHeight: '1.6' }}><code>{getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token)}</code></pre>
                                  <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[0.5rem]">
                                    <div className="flex items-start gap-2">
                                      <i className="ri-information-line text-[#64748B] flex-shrink-0 mt-0.5"></i>
                                      <div className="text-[0.75rem] text-[#475569]">
                                        <div className="font-semibold mb-1.5">How to use:</div>
                                        <div className="text-[#64748B] leading-relaxed">
                                          1. Register the environment variables in {selectedPlatform === 'github' ? 'GitHub Secrets' : 'GitLab CI/CD Variables'}<br />
                                          2. Copy the YAML code and add to your {selectedPlatform === 'github' ? '.github/workflows/*.yml' : '.gitlab-ci.yml'}<br />
                                          3. Set <code className="bg-[#F1F5F9] px-1 rounded text-[0.6875rem]">test_case_id</code> to your test case ID (e.g. SUI-1)<br />
                                          4. Set status to passed/failed/blocked based on test outcome
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'api' && (
                    <div className="space-y-5">
                      {/* Tier gate banner */}
                      {!isProfessionalOrHigher && (
                        <div className="p-4 bg-gradient-to-r from-[#EEF2FF] to-[#F5F3FF] border border-[#C7D2FE] rounded-[0.75rem] flex items-start gap-3">
                          <div className="w-10 h-10 bg-[#C7D2FE] rounded-[0.5rem] flex items-center justify-center flex-shrink-0">
                            <i className="ri-lock-line text-[#4F46E5] text-xl"></i>
                          </div>
                          <div className="flex-1">
                            <div className="text-[0.8125rem] font-semibold text-[#0F172A] mb-0.5">CI/CD Integration is available on Professional and above</div>
                            <div className="text-[0.75rem] text-[#64748B] mb-3">Upload results directly from your automated test pipelines and enhance team collaboration.</div>
                            <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-flex items-center gap-[0.3125rem] text-[0.75rem] font-semibold px-3 py-[0.375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors">
                              <i className="ri-arrow-up-circle-line"></i> Contact Us to Upgrade
                            </a>
                          </div>
                        </div>
                      )}
                      {/* API Tokens card */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6 mb-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">API Tokens</h3>
                              <p className="text-[0.8125rem] text-[#64748B]">Manage API tokens for your CI/CD pipeline.</p>
                            </div>
                            <button
                              onClick={() => setShowNewTokenModal(true)}
                              disabled={!isProfessionalOrHigher}
                              className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                            >
                              <i className="ri-add-line"></i> New Token
                            </button>
                          </div>

                          <div className={!isProfessionalOrHigher ? 'opacity-50 pointer-events-none' : ''}>
                            {loadingTokens ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#6366F1]"></div>
                              </div>
                            ) : ciTokens.length === 0 ? (
                              <div className="text-center py-12 bg-[#F8FAFC] rounded-[0.75rem] border-2 border-dashed border-[#E2E8F0]">
                                <div className="w-16 h-16 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
                                  <i className="ri-key-2-line text-[#94A3B8]" style={{ fontSize: '1.75rem' }}></i>
                                </div>
                                <div className="text-[1rem] font-semibold text-[#0F172A] mb-1">No tokens created yet</div>
                                <p className="text-[0.8125rem] text-[#64748B] mb-4">Create an API token to start integrating with your CI/CD pipeline</p>
                                <button
                                  onClick={() => setShowNewTokenModal(true)}
                                  className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer"
                                >
                                  <i className="ri-add-line"></i> Create First Token
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {ciTokens.map((token) => (
                                  <div key={token.id} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[0.5rem]">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#EEF2FF] rounded-[0.5rem] flex items-center justify-center flex-shrink-0">
                                          <i className="ri-key-2-line text-[#4F46E5]" style={{ fontSize: '1.125rem' }}></i>
                                        </div>
                                        <div>
                                          <div className="text-[0.8125rem] font-semibold text-[#0F172A]">{token.name}</div>
                                          <div className="text-[0.6875rem] text-[#94A3B8]">
                                            Created: {new Date(token.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {token.last_used_at ? ` · Last used: ${new Date(token.last_used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ' · Never used'}
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteToken(token.id)}
                                        className="px-2.5 py-[0.25rem] text-[#DC2626] bg-transparent hover:bg-[#FEF2F2] rounded-[0.375rem] text-[0.8125rem] font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                                      >
                                        <i className="ri-delete-bin-line"></i> Delete
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={token.token}
                                        readOnly
                                        className="flex-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-[0.375rem] text-[0.75rem] font-mono text-[#475569]"
                                      />
                                      <button
                                        onClick={() => handleCopyToken(token.token)}
                                        title="Copy"
                                        className="w-7 h-7 rounded-[0.25rem] border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] cursor-pointer flex items-center justify-center flex-shrink-0 transition-colors"
                                      >
                                        {copiedToken === token.token ? (
                                          <i className="ri-check-line text-[#6366F1]" style={{ fontSize: '0.875rem' }}></i>
                                        ) : (
                                          <i className="ri-file-copy-line" style={{ fontSize: '0.875rem' }}></i>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                      </div>

                      {/* ── API Token Scope Configuration Guide ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5 flex items-center gap-2">
                          <i className="ri-shield-keyhole-line text-[#6366F1]"></i>
                          API Token Scope Configuration Guide
                        </h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-4">
                          {scopeGuideTab === 'github'
                            ? 'When using a Personal Access Token (PAT) or Fine-grained Token in GitHub, only the following permissions are needed.'
                            : 'When using a Personal Access Token (PAT) in GitLab, only the following scopes are needed.'}
                        </p>
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => setScopeGuideTab('github')}
                            className={`inline-flex items-center gap-1.5 px-3 py-[0.3125rem] rounded-[0.375rem] text-[0.75rem] font-semibold cursor-pointer ${scopeGuideTab === 'github' ? 'bg-[#0F172A] text-white border border-[#0F172A]' : 'border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}
                          >
                            <i className="ri-github-fill"></i> GitHub
                          </button>
                          <button
                            onClick={() => setScopeGuideTab('gitlab')}
                            className={`inline-flex items-center gap-1.5 px-3 py-[0.3125rem] rounded-[0.375rem] text-[0.75rem] font-semibold cursor-pointer ${scopeGuideTab === 'gitlab' ? 'bg-[#FC6D26] text-white border border-[#FC6D26]' : 'border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}
                          >
                            <i className="ri-gitlab-fill"></i> GitLab
                          </button>
                        </div>
                        <div className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-[0.04em] mb-2">Minimum Required Scopes</div>
                        <div className="flex flex-col gap-2 mb-4">
                          {(scopeGuideTab === 'github'
                            ? [
                                { scope: 'repo', desc: 'Repository read access (required for private repos)', badge: 'Required' },
                                { scope: 'workflow', desc: 'GitHub Actions workflow execution permission', badge: 'Required' },
                                { scope: 'read:org', desc: 'Read organization info (for org repositories)', badge: '' },
                              ]
                            : [
                                { scope: 'api', desc: 'Full API access — read/write projects, issues, and CI/CD', badge: 'Required' },
                                { scope: 'read_api', desc: 'Read-only API access (minimum for result uploads)', badge: 'Minimum' },
                                { scope: 'read_repository', desc: 'Repository read access (for private repos)', badge: '' },
                              ]
                          ).map(item => (
                            <div key={item.scope} className="flex items-start gap-3 px-3 py-2.5 bg-[#F8FAFC] rounded-[0.5rem]">
                              <span className={`px-2 py-0.5 text-[0.6875rem] font-bold font-mono rounded whitespace-nowrap ${scopeGuideTab === 'github' ? 'bg-[#EEF2FF] text-[#4338CA]' : 'bg-[#FFF7ED] text-[#C2410C]'}`}>{item.scope}</span>
                              <div className="flex-1 text-[0.8125rem] text-[#334155]">{item.desc}</div>
                              {item.badge && <span className={`text-[0.6875rem] font-semibold whitespace-nowrap ${scopeGuideTab === 'github' ? 'text-[#4F46E5]' : 'text-[#EA580C]'}`}>{item.badge}</span>}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-[0.5rem] mb-3">
                          <i className="ri-error-warning-line text-[#F59E0B] flex-shrink-0 mt-0.5"></i>
                          <div className="text-[0.6875rem] text-[#92400E]">
                            {scopeGuideTab === 'github'
                              ? <><strong>Recommended:</strong> Using the automatically provided <code className="bg-[#FEF3C7] px-1 rounded text-[0.6875rem]">GITHUB_TOKEN</code> within GitHub Actions workflows is the safest approach — no separate PAT creation needed.</>
                              : <><strong>Recommended:</strong> Using the automatically provided <code className="bg-[#FEF3C7] px-1 rounded text-[0.6875rem]">CI_JOB_TOKEN</code> within GitLab CI/CD pipelines is the safest approach — no separate PAT creation needed.</>
                            }
                          </div>
                        </div>
                        <a
                          href={scopeGuideTab === 'github'
                            ? 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens'
                            : 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[0.6875rem] text-[#6366F1] hover:underline"
                        >
                          <i className="ri-external-link-line"></i> {scopeGuideTab === 'github' ? 'GitHub Token Official Documentation' : 'GitLab Personal Access Tokens Documentation'}
                        </a>
                      </div>

                      {/* ── API Documentation ── */}
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">API Documentation</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-3">Explore the full REST API reference for building custom integrations.</p>
                        <a
                          href="/docs/api"
                          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[#6366F1] hover:underline"
                        >
                          <i className="ri-book-open-line"></i> View full API reference →
                        </a>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <div>
                      <NotificationSettingsPanel />
                      {/* ── Coming Soon: Email Notifications ── */}
                      <div className="relative mt-5">
                        <div className="absolute top-3 right-3 px-2.5 py-0.5 bg-[#F59E0B] text-white text-[0.625rem] font-bold rounded-full z-10">COMING SOON</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6 opacity-60">
                          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5 flex items-center gap-2">
                            <i className="ri-mail-line text-[#6366F1]"></i> Email Notifications
                          </h3>
                          <p className="text-[0.8125rem] text-[#64748B]">Email notification delivery — planned for a future release.</p>
                        </div>
                      </div>
                      {/* ── Coming Soon: Desktop Push Notifications ── */}
                      <div className="relative mt-5">
                        <div className="absolute top-3 right-3 px-2.5 py-0.5 bg-[#F59E0B] text-white text-[0.625rem] font-bold rounded-full z-10">COMING SOON</div>
                        <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6 opacity-60">
                          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5 flex items-center gap-2">
                            <i className="ri-computer-line text-[#F59E0B]"></i> Desktop Push Notifications
                          </h3>
                          <p className="text-[0.8125rem] text-[#64748B]">Browser push notifications for critical events — planned for a future release.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'preferences' && (
                    <div>
                      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6">

                        {/* Language */}
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Language</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-3">Choose your preferred language for the Testably interface.</p>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as 'en')}
                          className="w-full max-w-xs px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.8125rem] bg-white focus:outline-none focus:border-[#C7D2FE] cursor-pointer"
                        >
                          <option value="en">English</option>
                        </select>

                        <div className="border-t border-[#E2E8F0] my-6"></div>

                        {/* Timezone */}
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Timezone</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-3">Set your timezone for accurate timestamps in activity logs and reports.</p>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id="autoDetectTz"
                            checked={autoDetectTz}
                            onChange={(e) => setAutoDetectTz(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                          />
                          <label htmlFor="autoDetectTz" className="text-[0.8125rem] text-[#64748B] cursor-pointer select-none">
                            Use browser timezone <span className="text-[#94A3B8]">({Intl.DateTimeFormat().resolvedOptions().timeZone} detected)</span>
                          </label>
                        </div>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          disabled={autoDetectTz}
                          className="w-full max-w-xs px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.8125rem] bg-white focus:outline-none focus:border-[#C7D2FE] cursor-pointer disabled:opacity-50 disabled:cursor-default"
                        >
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="America/New_York">Eastern Time (UTC-5/4)</option>
                          <option value="America/Los_Angeles">Pacific Time (UTC-8/7)</option>
                          <option value="Europe/London">London (UTC+0/1)</option>
                          <option value="Europe/Berlin">Berlin (UTC+1/2)</option>
                          <option value="Asia/Seoul">Asia/Seoul (UTC+9)</option>
                          <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                          <option value="Asia/Shanghai">Shanghai (UTC+8)</option>
                          <option value="Australia/Sydney">Sydney (UTC+10/11)</option>
                        </select>

                        <div className="border-t border-[#E2E8F0] my-6"></div>

                        {/* Date & Time Format */}
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Date &amp; Time Format</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-3">Choose how dates and times are displayed throughout the app.</p>
                        <div className="grid grid-cols-2 gap-4 max-w-sm mb-3">
                          <div>
                            <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Date Format</label>
                            <select
                              value={dateFormat}
                              onChange={(e) => setDateFormat(e.target.value)}
                              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.8125rem] bg-white focus:outline-none focus:border-[#C7D2FE] cursor-pointer"
                            >
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Time Format</label>
                            <select
                              value={timeFormat}
                              onChange={(e) => setTimeFormat(e.target.value as '24h' | '12h')}
                              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.8125rem] bg-white focus:outline-none focus:border-[#C7D2FE] cursor-pointer"
                            >
                              <option value="24h">24-hour</option>
                              <option value="12h">12-hour (AM/PM)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-[0.8125rem] bg-[#EEF2FF] text-[#6366F1] max-w-xs">
                          <i className="ri-eye-line"></i>
                          <span>Preview: {new Date().toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')} {timeFormat === '24h' ? new Date().toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: true })}</span>
                        </div>

                        <div className="border-t border-[#E2E8F0] my-6"></div>

                        {/* Get Started Checklist */}
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Get Started Checklist</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-3">Show the onboarding checklist widget in the bottom-right corner.</p>
                        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                          <button
                            role="switch"
                            aria-checked={!checklistDismissed}
                            onClick={async () => {
                              const next = !checklistDismissed;
                              setChecklistDismissed(next);
                              try {
                                const { data: { user: u } } = await supabase.auth.getUser();
                                if (!u) return;
                                await supabase
                                  .from('user_onboarding')
                                  .upsert(
                                    { user_id: u.id, checklist_dismissed: next, welcome_completed: true },
                                    { onConflict: 'user_id' },
                                  );
                              } catch { /* silent */ }
                            }}
                            className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none ${!checklistDismissed ? 'bg-[#6366F1]' : 'bg-[#CBD5E1]'}`}
                          >
                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${!checklistDismissed ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                          <span className="text-[0.8125rem] text-[#334155]">
                            {checklistDismissed ? 'Hidden' : 'Visible'}
                          </span>
                        </label>

                        <div className="border-t border-[#E2E8F0] my-6"></div>

                        {/* Default Project */}
                        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Default Project</h3>
                        <p className="text-[0.8125rem] text-[#64748B] mb-3">Open this project automatically when you log in.</p>
                        <select
                          value={defaultProjectId}
                          onChange={(e) => setDefaultProjectId(e.target.value)}
                          className="w-full max-w-xs px-3 py-2 border border-[#E2E8F0] rounded-lg text-[0.8125rem] bg-white focus:outline-none focus:border-[#C7D2FE] cursor-pointer"
                        >
                          <option value="">None (show project list)</option>
                          {userProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>

                        <div className="flex justify-end mt-6">
                          <button
                            onClick={handleSavePreferences}
                            disabled={savingPreferences}
                            className="px-5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg text-[0.8125rem] font-semibold cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {savingPreferences
                              ? <><i className="ri-loader-4-line animate-spin"></i>Saving...</>
                              : <><i className="ri-save-line"></i>Save Preferences</>
                            }
                          </button>
                        </div>
                        {preferencesSaved && (
                          <div className="flex justify-end mt-2">
                            <span className="text-[0.8125rem] text-[#6366F1] font-medium flex items-center gap-1">
                              <i className="ri-checkbox-circle-fill"></i>
                              Saved successfully
                            </span>
                          </div>
                        )}
                        {prefsError && (
                          <div className="mt-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2">
                            <i className="ri-error-warning-line text-[#EF4444] mt-0.5" style={{ fontSize: '0.9rem' }}></i>
                            <div>
                              <p className="text-[0.8125rem] font-semibold text-[#EF4444]">Save failed</p>
                              <p className="text-[0.75rem] text-[#B91C1C] mt-0.5 font-mono break-all">{prefsError}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </main>
        </div>
      </div>

      {/* New Token Modal */}
      {showNewTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Create New API Token</h3>
              <p className="text-sm text-gray-600 mt-1">Generate a token for your CI/CD pipeline</p>
            </div>
            <div className="p-6">
              <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">
                Token Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g. GitHub Actions Token"
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem]"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                <i className="ri-information-line mr-1"></i>
                Store this token in a safe place — it cannot be viewed again after creation
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewTokenModal(false);
                  setNewTokenName('');
                }}
                className="px-4 py-[0.4375rem] text-[#475569] border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-md text-[0.8125rem] font-medium transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateToken}
                disabled={creatingToken || !newTokenName.trim()}
                className="px-4 py-[0.4375rem] bg-[#6366F1] text-white rounded-md text-[0.8125rem] font-semibold hover:bg-[#4F46E5] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingToken ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="ri-add-line mr-2"></i>
                    Create Token
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Webhook Add/Edit Modal ── */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="ri-plug-line text-indigo-600 text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editingWebhookId ? 'Edit Integration' : 'Add Integration'}</h2>
                  <p className="text-sm text-gray-500">Configure a Slack or Teams webhook</p>
                </div>
              </div>
              <button onClick={() => setShowWebhookModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Project selector */}
              <div>
                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Project <span className="text-red-500">*</span></label>
                <select
                  value={webhookForm.project_id}
                  onChange={e => setWebhookForm(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem] cursor-pointer"
                >
                  <option value="">Select a project...</option>
                  {webhookProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Platform</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['slack', 'teams'] as const).map(t => {
                    const m = WEBHOOK_TYPE_META[t];
                    return (
                      <label key={t} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${webhookForm.type === t ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="wh-type" value={t} checked={webhookForm.type === t} onChange={() => setWebhookForm(prev => ({ ...prev, type: t }))} className="w-4 h-4 text-indigo-600" />
                        <div className={`w-7 h-7 rounded flex items-center justify-center ${m.color}`}><i className={`${m.icon} text-base`}></i></div>
                        <span className="font-semibold text-sm text-gray-900">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Webhook URL <span className="text-red-500">*</span></label>
                <input type="url" value={webhookForm.webhook_url} onChange={e => setWebhookForm(prev => ({ ...prev, webhook_url: e.target.value }))} placeholder={WEBHOOK_TYPE_META[webhookForm.type].placeholder} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem]" />
              </div>

              {/* Channel name */}
              <div>
                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Channel Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={webhookForm.channel_name} onChange={e => setWebhookForm(prev => ({ ...prev, channel_name: e.target.value }))} placeholder={webhookForm.type === 'slack' ? 'e.g. qa-alerts' : 'e.g. QA Notifications'} className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem]" />
                <p className="text-xs text-gray-500 mt-1">Display label only — does not affect delivery.</p>
              </div>

              {/* Events */}
              <div>
                <label className="block text-[0.8125rem] font-semibold text-[#334155] mb-1.5">Notify on <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.type} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={webhookForm.events.includes(ev.type)} onChange={() => toggleWebhookEvent(ev.type)} className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ev.label}</p>
                        <p className="text-xs text-gray-500">{ev.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {webhookFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <i className="ri-error-warning-line"></i>{webhookFormError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowWebhookModal(false)} className="flex-1 py-2.5 bg-white border border-[#E2E8F0] text-[#475569] rounded-md hover:bg-[#F8FAFC] transition-all font-medium text-[0.8125rem] cursor-pointer">Cancel</button>
                <button onClick={handleSaveWebhook} disabled={savingWebhook} className="flex-1 py-2.5 bg-[#6366F1] text-white rounded-md hover:bg-[#4F46E5] transition-all font-semibold text-[0.8125rem] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingWebhook ? <><i className="ri-loader-4-line animate-spin"></i> Saving…</> : <><i className="ri-save-line"></i> {editingWebhookId ? 'Save Changes' : 'Add Integration'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── All Plans Modal ── */}
      {showAllPlansModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAllPlansModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Compare All Plans</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose the plan that fits your team size and needs.</p>
              </div>
              <button onClick={() => setShowAllPlansModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(TIER_INFO).map(([tier, info]) => {
                  const tierNum = parseInt(tier);
                  const isCurrentTier = tierNum === currentTier;
                  return (
                    <div
                      key={tier}
                      className={`p-5 rounded-xl border-2 flex flex-col transition-all ${isCurrentTier ? info.color : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          tierNum === 1 ? 'bg-gray-200' : tierNum === 2 ? 'bg-yellow-100' : tierNum === 3 ? 'bg-indigo-100' : tierNum === 4 ? 'bg-amber-100' : tierNum === 5 ? 'bg-orange-100' : 'bg-rose-100'
                        }`}>
                          <i className={`${info.icon} text-xl ${
                            tierNum === 1 ? 'text-gray-500' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-indigo-500' : tierNum === 4 ? 'text-amber-500' : tierNum === 5 ? 'text-orange-500' : 'text-rose-500'
                          }`}></i>
                        </div>
                        <h4 className="font-bold text-gray-900">{info.name}</h4>
                        {isCurrentTier && <span className="ml-auto px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">Current</span>}
                      </div>
                      <div className="mb-4 pb-4 border-b border-gray-200/70">
                        <span className={`text-2xl font-bold ${tierNum === 1 ? 'text-gray-700' : tierNum === 2 ? 'text-yellow-700' : tierNum === 3 ? 'text-indigo-700' : 'text-amber-700'}`}>
                          {info.monthlyPrice === 0 ? '$0' : info.monthlyPrice < 0 ? 'Custom' : `$${info.monthlyPrice}`}
                        </span>
                        {info.monthlyPrice >= 0 && <span className="text-sm text-gray-500 ml-1">{info.priceDesc}</span>}
                      </div>
                      <ul className="space-y-1.5 flex-1 mb-4">
                        {info.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <i className={`ri-check-line mt-0.5 ${
                              tierNum === 1 ? 'text-gray-400' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-indigo-500' : tierNum === 4 ? 'text-amber-500' : tierNum === 5 ? 'text-orange-500' : 'text-rose-500'
                            }`}></i>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {!isCurrentTier && tierNum > currentTier && (
                        <a
                          href={tierNum >= 6 ? 'mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry' : 'mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry'}
                          className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer block text-center ${
                            tierNum >= 6 ? 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                          }`}
                        >
                          {tierNum >= 6 ? 'Contact Sales' : 'Contact Us to Upgrade'}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
