import { LogoMark } from '../../components/Logo';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'notifications' | 'cicd' | 'profile' | 'members'>('general');
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
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
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

  useEffect(() => {
    fetchUserProfile();
    fetchJiraSettings();
    fetchUserProjects();
    const tab = searchParams.get('tab');
    if (tab === 'integrations' || tab === 'cicd' || tab === 'notifications' || tab === 'general' || tab === 'profile' || tab === 'members') {
      setActiveTab(tab as typeof activeTab);
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
        if (projects.length > 0 && !selectedProjectId) setSelectedProjectId(projects[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch user projects:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'cicd') {
      fetchCITokens();
    }
    if (activeTab === 'integrations') {
      fetchWebhooks();
    }
  }, [activeTab]);

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
          full_name: data.full_name || '',
          subscription_tier: tier,
          trial_started_at: data.trial_started_at || null,
          trial_ends_at: data.trial_ends_at || null,
          is_trial: isTrial,
          subscription_ends_at: subscriptionEndsAt,
          avatar_emoji: data.avatar_emoji || '🐶',
        });
      }
    } catch (error) {
      console.error('Profile loading error:', error);
    }
  };

  const fetchJiraSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jira_settings')
        .select('*')
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
        });
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

      const { data, error } = await supabase.functions.invoke('test-jira-connection', {
        body: {
          domain: jiraSettings.domain,
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

  const handleSaveJiraSettings = async () => {
    try {
      setSaving(true);

      const { data: existingData } = await supabase
        .from('jira_settings')
        .select('id')
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('jira_settings')
          .update({
            domain: jiraSettings.domain,
            email: jiraSettings.email,
            api_token: jiraSettings.apiToken,
            issue_type: jiraSettings.issueType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jira_settings')
          .insert({
            domain: jiraSettings.domain,
            email: jiraSettings.email,
            api_token: jiraSettings.apiToken,
            issue_type: jiraSettings.issueType,
          });

        if (error) throw error;
      }

      alert('Jira settings saved successfully.');
      setTestResult(null);
    } catch (error) {
      console.error('Jira settings save error:', error);
      alert('Failed to save Jira settings.');
    } finally {
      setSaving(false);
    }
  };

  // ── Webhook helpers ───────────────────────────────────────────────────────

  const WEBHOOK_TYPE_META = {
    slack: { label: 'Slack', icon: 'ri-slack-line', color: 'bg-purple-100 text-purple-700', placeholder: 'https://hooks.slack.com/services/...' },
    teams: { label: 'Microsoft Teams', icon: 'ri-microsoft-line', color: 'bg-blue-100 text-blue-700', placeholder: 'https://prod-xx.westus.logic.azure.com/workflows/...' },
  };

  const fetchWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const { data: projects } = await supabase.from('projects').select('id, name').order('name');
      setWebhookProjects(projects ?? []);
      if (projects && projects.length > 0) {
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
      const projectLink = `https://www.testably.app/projects/${wh.project_id}`;
      const testPayload = wh.type === 'slack'
        ? { blocks: [{ type: 'header', text: { type: 'plain_text', text: '🧪 Testably Test Message', emoji: true } }, { type: 'section', text: { type: 'mrkdwn', text: `Webhook connection verified for *${project?.name ?? 'your project'}*.` } }] }
        : { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null, content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4', body: [{ type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: '🧪 Testably Test Message' }, { type: 'TextBlock', text: `Webhook connection verified for ${project?.name ?? 'your project'}.`, wrap: true }], actions: [{ type: 'Action.OpenUrl', title: 'View in Testably', url: projectLink }] } }] };
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: wh.webhook_url, payload: testPayload }) });
      const json = await res.json();
      const ok = res.ok && json.status >= 200 && json.status < 300;
      setWebhookTestResult({ id: wh.id, ok, msg: ok ? 'Test message sent successfully!' : `Delivery failed (HTTP ${json.status ?? '?'})` });
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

  // Header avatar: show emoji if set, otherwise initials
  const headerAvatar = userProfile?.avatar_emoji
    ? userProfile.avatar_emoji
    : null;
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
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Link to="/projects" className="flex items-center cursor-pointer">
                  <LogoMark />
                </Link>
                <div className="w-px h-5 bg-gray-300" />
                <span className="text-sm text-gray-500">Settings</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative" ref={profileMenuRef}>
                  <div 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer overflow-hidden"
                  >
                    {headerAvatar ? (
                      <span className="text-xl leading-none">{headerAvatar}</span>
                    ) : (
                      <span>{headerInitial}</span>
                    )}
                  </div>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'User'}</p>
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
          </header>
          
          <main className="flex-1 overflow-y-auto bg-gray-50/30">
            <div className="p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
                <p className="text-gray-600">Manage your application settings and integrations</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'profile'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="ri-user-settings-line mr-2"></i>
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'general'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="ri-settings-3-line mr-2"></i>
                    General
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'members'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="ri-team-line mr-2"></i>
                    Members
                  </button>
                  <button
                    onClick={() => setActiveTab('integrations')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'integrations'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="ri-plug-line mr-2"></i>
                    Integrations
                  </button>
                  <button
                    onClick={() => setActiveTab('cicd')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'cicd'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="ri-git-branch-line mr-2"></i>
                    CI/CD
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'notifications'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <i className="ri-notification-3-line mr-2"></i>
                    Notifications
                  </button>
                </div>

                <div className="p-8">
                  {activeTab === 'profile' && userProfile && (
                    <ProfileSettingsPanel
                      fullName={userProfile.full_name}
                      email={userProfile.email}
                      avatarEmoji={userProfile.avatar_emoji}
                      onProfileUpdated={(name, emoji) => {
                        setUserProfile((prev) => prev ? { ...prev, full_name: name, avatar_emoji: emoji } : prev);
                      }}
                    />
                  )}

                  {activeTab === 'members' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">Project Members</h2>
                          <p className="text-sm text-slate-500 mt-1">Manage team members and their roles for each project.</p>
                        </div>
                        <button
                          onClick={() => setShowMembersInviteModal(true)}
                          disabled={!selectedProjectId}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <i className="ri-user-add-line"></i>
                          Invite Member
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Project</label>
                        <select
                          value={selectedProjectId}
                          onChange={e => setSelectedProjectId(e.target.value)}
                          className="h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[240px]"
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
                        <div className="text-center py-16 text-sm text-gray-400">
                          <i className="ri-team-line text-4xl text-gray-200 block mb-3"></i>
                          Select a project to view and manage its members.
                        </div>
                      )}
                      <InviteMemberModal
                        isOpen={showMembersInviteModal}
                        onClose={() => setShowMembersInviteModal(false)}
                        projectId={selectedProjectId}
                        onInvited={() => setMemberRefreshTrigger(prev => prev + 1)}
                      />
                    </div>
                  )}

                  {activeTab === 'general' && (
                    <div className="space-y-8">
                      {/* Trial Banner */}
                      {userProfile?.is_trial && trialDaysLeft !== null && (
                        <div className={`mb-6 p-5 rounded-xl border-2 flex items-start gap-4 ${
                          trialDaysLeft <= 3
                            ? 'bg-red-50 border-red-200'
                            : trialDaysLeft <= 7
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-indigo-50 border-indigo-200'
                        }`}>
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          trialDaysLeft <= 3 ? 'bg-red-100' : trialDaysLeft <= 7 ? 'bg-amber-100' : 'bg-indigo-100'
                        }`}>
                            <i className={`ri-time-line text-xl ${
                          trialDaysLeft <= 3 ? 'text-red-600' : trialDaysLeft <= 7 ? 'text-amber-600' : 'text-indigo-600'
                        }`}></i>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold text-base ${
                          trialDaysLeft <= 3 ? 'text-red-800' : trialDaysLeft <= 7 ? 'text-amber-800' : 'text-indigo-800'
                        }`}>
                                14-Day Free Trial Active
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          trialDaysLeft <= 3
                            ? 'bg-red-200 text-red-800'
                            : trialDaysLeft <= 7
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-indigo-200 text-indigo-800'
                        }`}>
                                {trialDaysLeft} days left
                              </span>
                            </div>
                            <p className={`text-sm mb-3 ${
                          trialDaysLeft <= 3 ? 'text-red-700' : trialDaysLeft <= 7 ? 'text-amber-700' : 'text-indigo-700'
                        }`}>
                              {trialDaysLeft <= 3
                                ? `Your trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}. Upgrade now to keep your access.`
                                : `You are experiencing all Professional plan features for free. After the trial ends, you'll be automatically switched to the Free plan.`}
                            </p>
                            {userProfile.trial_ends_at && (
                              <p className={`text-xs ${
                          trialDaysLeft <= 3 ? 'text-red-500' : trialDaysLeft <= 7 ? 'text-amber-500' : 'text-indigo-500'
                        }`}>
                                <i className="ri-calendar-line mr-1"></i>
                                Trial ends: {new Date(userProfile.trial_ends_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <button className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap flex-shrink-0 transition-all ${
                          trialDaysLeft <= 3
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : trialDaysLeft <= 7
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}>
                            Upgrade Now
                          </button>
                        </div>
                      )}

                      {/* Subscription Tier Section */}
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Plan</h2>
                        <p className="text-gray-600 mb-6">View and manage your current subscription plan</p>

                        {/* Current Plan Card */}
                        <div className={`p-6 rounded-xl border-2 ${tierInfo.color} mb-6`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                currentTier === 1 ? 'bg-gray-200' : currentTier === 2 ? 'bg-yellow-100' : currentTier === 3 ? 'bg-indigo-100' : currentTier === 4 ? 'bg-amber-100' : currentTier === 5 ? 'bg-orange-100' : 'bg-rose-100'
                              }`}>
                                <i className={`${tierInfo.icon} text-2xl ${
                                  currentTier === 1 ? 'text-gray-600' : currentTier === 2 ? 'text-yellow-600' : currentTier === 3 ? 'text-indigo-600' : currentTier === 4 ? 'text-amber-600' : currentTier === 5 ? 'text-orange-600' : 'text-rose-600'
                                }`}></i>
                              </div>
                              <div>
                                <h3 className="text-lg font-bold">{tierInfo.name}</h3>
                                <p className="text-sm opacity-80">
                                  {userProfile?.is_trial ? 'Professional free trial active' : 'Current plan'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                currentTier === 1 ? 'bg-gray-200 text-gray-700' : currentTier === 2 ? 'bg-yellow-200 text-yellow-800' : currentTier === 3 ? 'bg-indigo-200 text-indigo-800' : currentTier === 4 ? 'bg-amber-200 text-amber-800' : currentTier === 5 ? 'bg-orange-200 text-orange-800' : 'bg-rose-200 text-rose-800'
                              }`}>
                                Active
                              </span>
                              {!userProfile?.is_trial && userProfile?.subscription_ends_at && currentTier > 1 && (
                                <span className={`text-xs font-semibold flex items-center gap-1 ${
                                  subscriptionDaysLeft !== null && subscriptionDaysLeft <= 7 ? 'text-red-500' : 'text-gray-500'
                                }`}>
                                  <i className="ri-calendar-line"></i>
                                  Expires: {new Date(userProfile.subscription_ends_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  {subscriptionDaysLeft !== null && subscriptionDaysLeft <= 30 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                      subscriptionDaysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {subscriptionDaysLeft}d left
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {tierInfo.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <i className="ri-check-line"></i>
                                {currentTier === 1 && feature === 'Jira Integration (Link)' ? (
                                  <span className="flex items-center gap-1">
                                    Jira Integration (Link)
                                    <div className="relative inline-flex items-center">
                                      <button
                                        onMouseEnter={() => setShowJiraTooltip(true)}
                                        onMouseLeave={() => setShowJiraTooltip(false)}
                                        className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                      >
                                        <i className="ri-information-line text-sm"></i>
                                      </button>
                                      {showJiraTooltip && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none">
                                          <p className="leading-relaxed">You can attach Jira issue links to test results. Automatic Jira issue creation is available on Starter and above.</p>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      )}
                                    </div>
                                  </span>
                                ) : (
                                  <span>{feature}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Compare All Plans</h3>
                          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                            <button
                              onClick={() => setBillingCycle('monthly')}
                              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                              }`}
                            >
                              Monthly
                            </button>
                            <button
                              onClick={() => setBillingCycle('annual')}
                              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                billingCycle === 'annual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                              }`}
                            >
                              Annual
                              <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full">15% off</span>
                            </button>
                          </div>
                        </div>

                        {/* All Plans Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(TIER_INFO).map(([tier, info]) => {
                            const tierNum = parseInt(tier);
                            const isCurrentTier = tierNum === currentTier;
                            const isAnnual = billingCycle === 'annual';
                            return (
                              <div
                                key={tier}
                                className={`p-5 rounded-xl border-2 transition-all flex flex-col ${
                                  isCurrentTier
                                    ? info.color
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
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
                                  {isCurrentTier && (
                                    <span className="ml-auto px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>

                                {/* Price */}
                                <div className="mb-4 pb-4 border-b border-gray-200/70">
                                  <div className="flex items-end gap-1">
                                    <span className={`text-2xl font-bold ${
                                      tierNum === 1 ? 'text-gray-700' : tierNum === 2 ? 'text-yellow-700' : tierNum === 3 ? 'text-indigo-700' : 'text-amber-700'
                                    }`}>
                                      {formatPrice(info.monthlyPrice, isAnnual)}
                                    </span>
                                    {info.monthlyPrice >= 0 && (
                                      <span className="text-sm text-gray-500 mb-0.5">{info.priceDesc}</span>
                                    )}
                                  </div>
                                  {isAnnual && info.monthlyPrice > 0 && info.monthlyPrice !== -1 && (
                                    <p className="text-xs text-indigo-600 mt-1">
                                      <i className="ri-price-tag-3-line mr-1"></i>
                                      Save 15% vs {formatPrice(info.monthlyPrice, false)}/mo
                                    </p>
                                  )}
                                </div>

                                <ul className="space-y-2 flex-1">
                                  {info.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                      <i className={`ri-check-line mt-0.5 ${
                                        tierNum === 1 ? 'text-gray-400' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-indigo-500' : tierNum === 4 ? 'text-amber-500' : tierNum === 5 ? 'text-orange-500' : 'text-rose-500'
                                      }`}></i>
                                      {tierNum === 1 && feature === 'Jira Integration (Link)' ? (
                                        <span className="flex items-center gap-1">
                                          Jira Integration (Link)
                                          <div className="relative inline-flex items-center">
                                            <button
                                              onMouseEnter={() => setShowJiraTooltip(true)}
                                              onMouseLeave={() => setShowJiraTooltip(false)}
                                              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                              <i className="ri-information-line text-sm"></i>
                                            </button>
                                            {showJiraTooltip && (
                                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none">
                                                <p className="leading-relaxed">You can attach Jira issue links to test results. Automatic Jira issue creation is available on Starter and above.</p>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                              </div>
                                            )}
                                          </div>
                                        </span>
                                      ) : (
                                        <span>{feature}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                {!isCurrentTier && tierNum > currentTier && (
                                  <a
                                    href={tierNum >= 6 ? 'mailto:hello@testably.app?subject=Enterprise%20Plan%20Inquiry' : 'mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry'}
                                    className={`w-full mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap block text-center ${
                                      tierNum >= 6
                                        ? 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                                        : 'bg-indigo-500 text-white hover:bg-indigo-600'
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
                  )}

                  {activeTab === 'integrations' && (
                    <div className="space-y-8">
                      {/* ── Jira Integration ── */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h2 className="text-xl font-bold text-gray-900">Jira Integration</h2>
                          {!isStarterOrHigher && (
                            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-300 rounded-full text-xs font-semibold flex items-center gap-1">
                              <i className="ri-star-line"></i>
                              Requires Starter or above
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-6">Connect your Jira account to create issues directly from test results</p>

                        {!isStarterOrHigher && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i className="ri-lock-line text-yellow-600 text-xl"></i>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">Jira Integration is available on Starter and above</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  Create Jira issues directly from test results and enhance team collaboration.
                                </p>
                                <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-all cursor-pointer whitespace-nowrap">
                                  <i className="ri-arrow-up-circle-line mr-2"></i>
                                  Contact Us to Upgrade
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {loading ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                          </div>
                        ) : (
                          <div className={`space-y-6 ${!isStarterOrHigher ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Jira Domain */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Jira Domain <span className="text-red-500">*</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">https://</span>
                                <input
                                  type="text"
                                  value={jiraSettings.domain}
                                  onChange={(e) => setJiraSettings({ ...jiraSettings, domain: e.target.value })}
                                  placeholder="your-domain.atlassian.net"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                  disabled={!isStarterOrHigher}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">e.g. your-domain.atlassian.net</p>
                            </div>

                            {/* Jira Email */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Jira Email <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={jiraSettings.email}
                                onChange={(e) => setJiraSettings({ ...jiraSettings, email: e.target.value })}
                                placeholder="your-email@example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                disabled={!isStarterOrHigher}
                              />
                              <p className="text-xs text-gray-500 mt-1">Your Jira account email address</p>
                            </div>

                            {/* Jira API Token */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Jira API Token <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type={showApiToken ? 'text' : 'password'}
                                  value={jiraSettings.apiToken}
                                  onChange={(e) => setJiraSettings({ ...jiraSettings, apiToken: e.target.value })}
                                  placeholder="Enter your Jira API token"
                                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                  disabled={!isStarterOrHigher}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowApiToken(!showApiToken)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                  disabled={!isStarterOrHigher}
                                >
                                  <i className={`${showApiToken ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`}></i>
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                <a 
                                  href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline"
                                >
                                  Generate API token here
                                </a>
                              </p>
                            </div>

                            {/* Default Issue Type */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Default Issue Type
                              </label>
                              <select
                                value={jiraSettings.issueType}
                                onChange={(e) => setJiraSettings({ ...jiraSettings, issueType: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                                disabled={!isStarterOrHigher}
                              >
                                <option value="Bug">Bug</option>
                                <option value="Task">Task</option>
                                <option value="Story">Story</option>
                                <option value="Epic">Epic</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Default issue type when creating new issues</p>
                            </div>

                            {/* Test Result Message */}
                            {testResult && (
                              <div className={`p-4 rounded-lg border ${
                                testResult.success 
                                  ? 'bg-green-50 border-green-200 text-green-800' 
                                  : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <i className={`${testResult.success ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} text-lg`}></i>
                                  <span className="text-sm font-medium">{testResult.message}</span>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-4">
                              <button
                                onClick={handleTestConnection}
                                disabled={testing || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken || !isStarterOrHigher}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {testing ? (
                                  <>
                                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-link mr-2"></i>
                                    Test Connection
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleSaveJiraSettings}
                                disabled={saving || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken || !isStarterOrHigher}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {saving ? (
                                  <>
                                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-save-line mr-2"></i>
                                    Save Settings
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Slack & Teams Webhooks ── */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h2 className="text-xl font-bold text-gray-900">Slack &amp; Teams Webhooks</h2>
                          {!isStarterOrHigher && (
                            <span className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-300 rounded-full text-xs font-semibold flex items-center gap-1">
                              <i className="ri-star-line"></i>
                              Requires Starter or above
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-6">Send real-time notifications to Slack or Microsoft Teams when events occur in your projects.</p>

                        {!isStarterOrHigher && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i className="ri-lock-line text-yellow-600 text-xl"></i>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">Slack &amp; Teams Integration is available on Starter and above</h3>
                                <p className="text-sm text-gray-600 mb-3">Get real-time notifications in Slack or Microsoft Teams when test runs complete, milestones change, and more.</p>
                                <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-all cursor-pointer whitespace-nowrap">
                                  <i className="ri-arrow-up-circle-line mr-2"></i>Contact Us to Upgrade
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {isStarterOrHigher && (
                          <div className={loadingWebhooks ? 'opacity-50 pointer-events-none' : ''}>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-sm text-gray-600">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured across all projects</span>
                              <button
                                onClick={openAddWebhookModal}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm cursor-pointer whitespace-nowrap"
                              >
                                <i className="ri-add-line"></i>Add Integration
                              </button>
                            </div>

                            {loadingWebhooks ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                              </div>
                            ) : webhooks.length === 0 ? (
                              <div className="bg-gray-50 rounded-xl border border-gray-200 p-10 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <i className="ri-plug-line text-2xl text-gray-400"></i>
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">No webhooks yet</h3>
                                <p className="text-sm text-gray-500 mb-4">Connect Slack or Microsoft Teams to receive real-time alerts about test runs and milestones.</p>
                                <button onClick={openAddWebhookModal} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm cursor-pointer">
                                  <i className="ri-add-line"></i>Add your first integration
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {webhooks.map(wh => {
                                  const meta = WEBHOOK_TYPE_META[wh.type as 'slack' | 'teams'];
                                  const project = webhookProjects.find(p => p.id === wh.project_id);
                                  const isTestingThis = testingWebhookId === wh.id;
                                  const thisTestResult = webhookTestResult?.id === wh.id ? webhookTestResult : null;
                                  const showingLogs = webhookLogsId === wh.id;
                                  return (
                                    <div key={wh.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                                            <i className={`${meta.icon} text-lg`}></i>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-semibold text-gray-900 text-sm">{meta.label}</span>
                                              {wh.channel_name && <span className="text-sm text-gray-500">#{wh.channel_name}</span>}
                                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${wh.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {wh.is_active ? 'Active' : 'Paused'}
                                              </span>
                                              {project && (
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 rounded-full border border-orange-100 truncate max-w-[160px]">
                                                  <i className="ri-folder-line mr-1"></i>{project.name}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{wh.webhook_url}</p>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                              {(wh.events as string[]).map((ev: string) => {
                                                const evMeta = WEBHOOK_EVENTS.find(e => e.type === ev);
                                                return (
                                                  <span key={ev} className="px-1.5 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                                    {evMeta?.label ?? ev}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <button onClick={() => handleTestWebhook(wh)} disabled={isTestingThis} className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap">
                                            {isTestingThis ? <><i className="ri-loader-4-line animate-spin"></i> Sending…</> : <><i className="ri-send-plane-line"></i> Test</>}
                                          </button>
                                          <button onClick={() => showingLogs ? setWebhookLogsId(null) : openWebhookLogs(wh.id)} className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap">
                                            <i className="ri-history-line"></i> Logs
                                          </button>
                                          <button onClick={() => handleToggleWebhookActive(wh)} className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap">
                                            <i className={wh.is_active ? 'ri-pause-line' : 'ri-play-line'}></i>
                                            {wh.is_active ? 'Pause' : 'Resume'}
                                          </button>
                                          <button onClick={() => openEditWebhookModal(wh)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-colors cursor-pointer">
                                            <i className="ri-edit-line text-sm"></i>
                                          </button>
                                          <button onClick={() => handleDeleteWebhook(wh.id)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                            <i className="ri-delete-bin-line text-sm"></i>
                                          </button>
                                        </div>
                                      </div>

                                      {thisTestResult && (
                                        <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${thisTestResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                          <i className={thisTestResult.ok ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}></i>
                                          {thisTestResult.msg}
                                        </div>
                                      )}

                                      {showingLogs && (
                                        <div className="mt-3 border-t border-gray-200 pt-3">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Logs (last 50)</h4>
                                          {webhookLogsLoading ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-500"><i className="ri-loader-4-line animate-spin"></i> Loading…</div>
                                          ) : webhookLogs.length === 0 ? (
                                            <p className="text-sm text-gray-400">No deliveries yet.</p>
                                          ) : (
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-sm">
                                                <thead>
                                                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                                                    <th className="text-left py-1.5 pr-4 font-semibold">Event</th>
                                                    <th className="text-left py-1.5 pr-4 font-semibold">Status</th>
                                                    <th className="text-left py-1.5 pr-4 font-semibold">Code</th>
                                                    <th className="text-left py-1.5 font-semibold">Time</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {webhookLogs.map(log => (
                                                    <tr key={log.id} className="border-b border-gray-50">
                                                      <td className="py-1.5 pr-4 font-mono text-xs text-gray-600">{log.event_type}</td>
                                                      <td className="py-1.5 pr-4">
                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-700' : log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                          {log.status}
                                                        </span>
                                                      </td>
                                                      <td className="py-1.5 pr-4 text-gray-500">{log.response_code ?? '—'}</td>
                                                      <td className="py-1.5 text-gray-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
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
                    </div>
                  )}

                  {activeTab === 'cicd' && (
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h2 className="text-xl font-bold text-gray-900">CI/CD Integration</h2>
                          {!isProfessionalOrHigher && (
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-full text-xs font-semibold flex items-center gap-1">
                              <i className="ri-vip-crown-line"></i>
                              Requires Professional or above
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-6">Automatically upload test results from GitHub Actions, GitLab CI, and other CI/CD pipelines</p>

                        {!isProfessionalOrHigher && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i className="ri-lock-line text-indigo-600 text-xl"></i>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">CI/CD Integration is available on Professional and above</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  Upload results directly from your automated test pipelines and enhance team collaboration.
                                </p>
                                <a href="mailto:hello@testably.app?subject=Plan%20Upgrade%20Inquiry" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap">
                                  <i className="ri-arrow-up-circle-line mr-2"></i>
                                  Contact Us to Upgrade
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className={`space-y-6 ${!isProfessionalOrHigher ? 'opacity-50 pointer-events-none' : ''}`}>
                          {/* API Tokens Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">API Tokens</h3>
                                <p className="text-sm text-gray-600">Manage API tokens for your CI/CD pipeline</p>
                              </div>
                              <button
                                onClick={() => setShowNewTokenModal(true)}
                                disabled={!isProfessionalOrHigher}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                              >
                                <i className="ri-add-line"></i>
                                New Token
                              </button>
                            </div>

                            {loadingTokens ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                              </div>
                            ) : ciTokens.length === 0 ? (
                              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <i className="ri-key-2-line text-3xl text-gray-400"></i>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tokens created yet</h3>
                                <p className="text-sm text-gray-600 mb-4">Create an API token to start integrating with your CI/CD pipeline</p>
                                <button
                                  onClick={() => setShowNewTokenModal(true)}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-add-line mr-2"></i>
                                  Create First Token
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {ciTokens.map((token) => (
                                  <div key={token.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                          <i className="ri-key-2-line text-indigo-600 text-lg"></i>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-gray-900">{token.name}</h4>
                                          <p className="text-xs text-gray-500">
                                            Created: {new Date(token.created_at).toLocaleDateString('en-US')}
                                            {token.last_used_at && ` • Last used: ${new Date(token.last_used_at).toLocaleDateString('en-US')}`}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteToken(token.id)}
                                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        <i className="ri-delete-bin-line mr-1"></i>
                                        Delete
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={token.token}
                                        readOnly
                                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-600"
                                      />
                                      <button
                                        onClick={() => handleCopyToken(token.token)}
                                        className="flex-shrink-0 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        {copiedToken === token.token ? (
                                          <i className="ri-check-line text-green-600"></i>
                                        ) : (
                                          <i className="ri-file-copy-line text-gray-600"></i>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Integration Guide */}
                          {ciTokens.length > 0 && (
                            <div className="pt-6 border-t border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Guide</h3>
                              
                              <div className="flex items-center gap-2 mb-4">
                                <button
                                  onClick={() => setSelectedPlatform('github')}
                                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                    selectedPlatform === 'github'
                                      ? 'bg-gray-900 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <i className="ri-github-fill mr-2"></i>
                                  GitHub Actions
                                </button>
                                <button
                                  onClick={() => setSelectedPlatform('gitlab')}
                                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                    selectedPlatform === 'gitlab'
                                      ? 'bg-orange-500 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <i className="ri-gitlab-fill mr-2"></i>
                                  GitLab CI
                                </button>
                                <button
                                  onClick={() => setSelectedPlatform('python')}
                                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                    selectedPlatform === 'python'
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <i className="ri-code-s-slash-line mr-2"></i>
                                  Python
                                </button>
                              </div>

                              {/* Environment Variables Guide */}
                              <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <i className="ri-settings-4-line text-indigo-600 text-lg"></i>
                                  <p className="text-sm font-bold text-indigo-800">
                                    Register the following values in your{' '}
                                    {selectedPlatform === 'github'
                                      ? 'GitHub Secrets'
                                      : selectedPlatform === 'gitlab'
                                      ? 'GitLab CI/CD Variables'
                                      : 'environment variables'}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-200 px-3 py-2">
                                    <span className="text-xs font-bold font-mono text-indigo-700 w-36 flex-shrink-0">TESTABLY_URL</span>
                                    <span className="text-xs text-gray-400 font-mono flex-1 truncate">
                                      {`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`}
                                    </span>
                                    <button
                                      onClick={() => handleCopyToken(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`)}
                                      className="flex-shrink-0 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      {copiedToken === `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results` ? (
                                        <><i className="ri-check-line mr-1"></i>Copied</>
                                      ) : (
                                        <><i className="ri-file-copy-line mr-1"></i>Copy</>
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-200 px-3 py-2">
                                    <span className="text-xs font-bold font-mono text-indigo-700 w-36 flex-shrink-0">TESTABLY_TOKEN</span>
                                    <span className="text-xs text-gray-400 font-mono flex-1 truncate">{ciTokens[0].token}</span>
                                    <button
                                      onClick={() => handleCopyToken(ciTokens[0].token)}
                                      className="flex-shrink-0 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      {copiedToken === ciTokens[0].token ? (
                                        <><i className="ri-check-line mr-1"></i>Copied</>
                                      ) : (
                                        <><i className="ri-file-copy-line mr-1"></i>Copy</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-indigo-700 mt-2">
                                  <i className="ri-information-line mr-1"></i>
                                  Registering both values as environment variables keeps them secure without modifying your code.
                                </p>
                              </div>

                              {/* Python Guide */}
                              {selectedPlatform === 'python' && (
                                <div className="space-y-6">
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                      <h4 className="font-bold text-gray-900">Function-based approach <span className="text-sm font-normal text-gray-500 ml-1">— suitable for simple scripts</span></h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 ml-8">
                                      Collect results using the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">report_result()</code> function and upload them all at once at the end.
                                    </p>
                                    <div className="bg-gray-900 rounded-lg p-4 relative">
                                      <button
                                        onClick={() => handleCopyToken(getPythonFunctionSnippet())}
                                        className="absolute top-4 right-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        {copiedToken === getPythonFunctionSnippet() ? (
                                          <><i className="ri-check-line mr-1"></i>Copied</>
                                        ) : (
                                          <><i className="ri-file-copy-line mr-1"></i>Copy</>
                                        )}
                                      </button>
                                      <pre className="text-sm text-gray-100 overflow-x-auto font-mono whitespace-pre">
                                        <code>{getPythonFunctionSnippet()}</code>
                                      </pre>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                      <h4 className="font-bold text-gray-900">conftest.py approach <span className="text-sm font-normal text-gray-500 ml-1">— suitable for pytest projects</span></h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 ml-8">
                                      Uses pytest hooks to automatically collect and upload results without modifying test code.
                                    </p>
                                    <div className="bg-gray-900 rounded-lg p-4 relative">
                                      <button
                                        onClick={() => handleCopyToken(getPythonConftestSnippet())}
                                        className="absolute top-4 right-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        {copiedToken === getPythonConftestSnippet() ? (
                                          <><i className="ri-check-line mr-1"></i>Copied</>
                                        ) : (
                                          <><i className="ri-file-copy-line mr-1"></i>Copy</>
                                        )}
                                      </button>
                                      <pre className="text-sm text-gray-100 overflow-x-auto font-mono whitespace-pre">
                                        <code>{getPythonConftestSnippet()}</code>
                                      </pre>
                                    </div>
                                  </div>

                                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                      <i className="ri-information-line text-gray-500 text-xl flex-shrink-0 mt-0.5"></i>
                                      <div className="text-sm text-gray-700">
                                        <p className="font-semibold mb-2">How to use:</p>
                                        <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                                          <li>Register your token in the <code className="bg-gray-200 px-1 rounded text-xs">TESTABLY_TOKEN</code> environment variable</li>
                                          <li><strong>Method 1</strong>: Pass the test case ID and result to <code className="bg-gray-200 px-1 rounded text-xs">report_result()</code></li>
                                          <li><strong>Method 2</strong>: Save <code className="bg-gray-200 px-1 rounded text-xs">conftest.py</code> to your project root and map function names to IDs in <code className="bg-gray-200 px-1 rounded text-xs">TEST_CASE_MAP</code></li>
                                          <li>Replace <code className="bg-gray-200 px-1 rounded text-xs">run_id</code> with the Run ID from Testably</li>
                                          <li>Status values: <code className="bg-gray-200 px-1 rounded text-xs">passed</code> / <code className="bg-gray-200 px-1 rounded text-xs">failed</code> / <code className="bg-gray-200 px-1 rounded text-xs">blocked</code> / <code className="bg-gray-200 px-1 rounded text-xs">retest</code></li>
                                        </ol>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* GitHub / GitLab YAML */}
                              {selectedPlatform !== 'python' && (
                                <>
                                  <div className="bg-gray-900 rounded-lg p-4 relative">
                                    <button
                                      onClick={() => handleCopyToken(getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token))}
                                      className="absolute top-4 right-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      {copiedToken === getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token) ? (
                                        <><i className="ri-check-line mr-1"></i>Copied</>
                                      ) : (
                                        <><i className="ri-file-copy-line mr-1"></i>Copy</>
                                      )}
                                    </button>
                                    <pre className="text-sm text-gray-100 overflow-x-auto font-mono">
                                      <code>{getYAMLSnippet(selectedPlatform as 'github' | 'gitlab', ciTokens[0].token)}</code>
                                    </pre>
                                  </div>

                                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                      <i className="ri-information-line text-gray-500 text-xl flex-shrink-0 mt-0.5"></i>
                                      <div className="text-sm text-gray-700">
                                        <p className="font-semibold mb-2">How to use:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-gray-600">
                                          <li>Register the environment variables above in {selectedPlatform === 'github' ? 'GitHub Secrets' : 'GitLab CI/CD Variables'}</li>
                                          <li>Copy the YAML code and add it to your CI/CD configuration file</li>
                                          <li>Set <code className="bg-gray-200 px-1 rounded text-xs">test_case_id</code> to your test case ID (e.g. SUI-1)</li>
                                          <li>Set status to passed/failed/blocked based on test outcome</li>
                                        </ol>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* API Token Scope Guide */}
                          <div className="pt-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-4">
                              <button
                                onClick={() => setSelectedPlatform('github')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                  selectedPlatform === 'github'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <i className="ri-github-fill mr-2"></i>
                                GitHub Actions
                              </button>
                              <button
                                onClick={() => setSelectedPlatform('gitlab')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                  selectedPlatform === 'gitlab'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <i className="ri-gitlab-fill mr-2"></i>
                                GitLab CI
                              </button>
                            </div>

                            <div className="p-5 bg-white border border-gray-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-lg">
                                  <i className="ri-shield-keyhole-line text-indigo-600 text-lg"></i>
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm">API Token Scope Configuration Guide</h4>
                              </div>

                              {selectedPlatform === 'github' ? (
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    When using a Personal Access Token (PAT) or Fine-grained Token in GitHub, only the following permissions are needed.
                                  </p>
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Minimum Required Scopes</p>
                                    <div className="space-y-2">
                                      {[
                                        { scope: 'repo', desc: 'Repository read access (required for private repos)', required: true },
                                        { scope: 'workflow', desc: 'GitHub Actions workflow execution permission', required: true },
                                        { scope: 'read:org', desc: 'Read organization info (for org repositories)', required: false },
                                      ].map((item) => (
                                        <div key={item.scope} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold font-mono whitespace-nowrap ${item.required ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {item.scope}
                                          </span>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700">{item.desc}</p>
                                            {!item.required && (
                                              <p className="text-xs text-gray-400 mt-0.5">Optional</p>
                                            )}
                                          </div>
                                          {item.required && (
                                            <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">Required</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                    <i className="ri-error-warning-line text-amber-500 flex-shrink-0 mt-0.5"></i>
                                    <p className="text-xs text-amber-800">
                                      <strong>Recommended:</strong> Using the automatically provided <code className="bg-amber-100 px-1 rounded">GITHUB_TOKEN</code> within GitHub Actions workflows is the safest approach — no separate PAT creation needed.
                                    </p>
                                  </div>
                                  <a
                                    href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                  >
                                    <i className="ri-external-link-line"></i>
                                    GitHub Token Official Documentation
                                  </a>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    When creating a Personal Access Token or Project Access Token in GitLab, select only the following scopes.
                                  </p>
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Minimum Required Scopes</p>
                                    <div className="space-y-2">
                                      {[
                                        { scope: 'api', desc: 'Full API access (pipeline triggers and result uploads)', required: true },
                                        { scope: 'read_repository', desc: 'Repository read access', required: true },
                                        { scope: 'write_repository', desc: 'Repository write access (required for committing results)', required: false },
                                      ].map((item) => (
                                        <div key={item.scope} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold font-mono whitespace-nowrap ${item.required ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {item.scope}
                                          </span>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700">{item.desc}</p>
                                            {!item.required && (
                                              <p className="text-xs text-gray-400 mt-0.5">Optional</p>
                                            )}
                                          </div>
                                          {item.required && (
                                            <span className="text-xs font-semibold text-orange-600 whitespace-nowrap">Required</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                    <i className="ri-error-warning-line text-amber-500 flex-shrink-0 mt-0.5"></i>
                                    <p className="text-xs text-amber-800">
                                      <strong>Recommended:</strong> Using the automatically provided <code className="bg-amber-100 px-1 rounded">CI_JOB_TOKEN</code> within GitLab CI pipelines is the safest approach — no separate token creation needed.
                                    </p>
                                  </div>
                                  <a
                                    href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                  >
                                    <i className="ri-external-link-line"></i>
                                    GitLab Token Official Documentation
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notifications' && (
                    <NotificationSettingsPanel />
                  )}
                </div>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Token Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g. GitHub Actions Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateToken}
                disabled={creatingToken || !newTokenName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project <span className="text-red-500">*</span></label>
                <select
                  value={webhookForm.project_id}
                  onChange={e => setWebhookForm(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                >
                  <option value="">Select a project...</option>
                  {webhookProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Platform</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Webhook URL <span className="text-red-500">*</span></label>
                <input type="url" value={webhookForm.webhook_url} onChange={e => setWebhookForm(prev => ({ ...prev, webhook_url: e.target.value }))} placeholder={WEBHOOK_TYPE_META[webhookForm.type].placeholder} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>

              {/* Channel name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Channel Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={webhookForm.channel_name} onChange={e => setWebhookForm(prev => ({ ...prev, channel_name: e.target.value }))} placeholder={webhookForm.type === 'slack' ? 'e.g. qa-alerts' : 'e.g. QA Notifications'} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                <p className="text-xs text-gray-500 mt-1">Display label only — does not affect delivery.</p>
              </div>

              {/* Events */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notify on <span className="text-red-500">*</span></label>
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
                <button onClick={() => setShowWebhookModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer">Cancel</button>
                <button onClick={handleSaveWebhook} disabled={savingWebhook} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingWebhook ? <><i className="ri-loader-4-line animate-spin"></i> Saving…</> : <><i className="ri-save-line"></i> {editingWebhookId ? 'Save Changes' : 'Add Integration'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
