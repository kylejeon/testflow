import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import NotificationBell from '../../components/feature/NotificationBell';
import { WEBHOOK_EVENTS, WebhookEventType } from '../../hooks/useWebhooks';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Integration {
  id: string;
  project_id: string;
  type: 'slack' | 'teams';
  webhook_url: string;
  channel_name: string | null;
  events: WebhookEventType[];
  is_active: boolean;
  created_at: string;
}

interface IntegrationLog {
  id: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending';
  response_code: number | null;
  error_message: string | null;
  created_at: string;
}

const TIER_INFO = {
  1: { name: 'Free',         color: 'bg-gray-100 text-gray-700 border-gray-300',   icon: 'ri-user-line' },
  2: { name: 'Starter',      color: 'bg-teal-50 text-teal-700 border-teal-300',     icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise',   color: 'bg-amber-50 text-amber-700 border-amber-300',  icon: 'ri-vip-diamond-line' },
};

const TYPE_META = {
  slack: {
    label: 'Slack',
    icon: 'ri-slack-line',
    color: 'bg-purple-100 text-purple-700',
    placeholder: 'https://hooks.slack.com/services/...',
    hint: 'Create an Incoming Webhook in your Slack app settings and paste the URL here.',
  },
  teams: {
    label: 'Microsoft Teams',
    icon: 'ri-microsoft-line',
    color: 'bg-blue-100 text-blue-700',
    placeholder: 'https://prod-xx.westus.logic.azure.com/workflows/...',
    hint: 'Create a Workflow in Teams using the "Post to a channel when a webhook request is received" template.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_EVENTS: WebhookEventType[] = [
  'run_created',
  'run_completed',
  'milestone_started',
  'milestone_completed',
];

function emptyForm() {
  return {
    type: 'slack' as 'slack' | 'teams',
    webhook_url: '',
    channel_name: '',
    events: DEFAULT_EVENTS as WebhookEventType[],
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectIntegrationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject]             = useState<any>(null);
  const [integrations, setIntegrations]   = useState<Integration[]>([]);
  const [loading, setLoading]             = useState(true);
  const [userProfile, setUserProfile]     = useState<{ full_name: string; email: string; subscription_tier: number; avatar_emoji: string } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Modal state
  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [formData, setFormData]           = useState(emptyForm());
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState('');

  // Test webhook state
  const [testingId, setTestingId]         = useState<string | null>(null);
  const [testResult, setTestResult]       = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  // Logs panel
  const [logsIntegrationId, setLogsIntegrationId] = useState<string | null>(null);
  const [logs, setLogs]                   = useState<IntegrationLog[]>([]);
  const [logsLoading, setLogsLoading]     = useState(false);

  useEffect(() => {
    if (id) {
      fetchAll();
      fetchUserProfile();
    }
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [projectRes, intRes] = await Promise.all([
        supabase.from('projects').select('id, name').eq('id', id!).single(),
        supabase
          .from('integrations')
          .select('*')
          .eq('project_id', id!)
          .order('created_at', { ascending: false }),
      ]);
      if (projectRes.error) throw projectRes.error;
      setProject(projectRes.data);
      setIntegrations((intRes.data as Integration[]) ?? []);
    } catch (err) {
      console.error('Integrations fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, subscription_tier, avatar_emoji')
        .eq('id', user.id)
        .maybeSingle();
      setUserProfile({
        full_name: data?.full_name || user.email?.split('@')[0] || 'User',
        email: data?.email || user.email || '',
        subscription_tier: data?.subscription_tier || 1,
        avatar_emoji: data?.avatar_emoji || '',
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (integration: Integration) => {
    setEditingId(integration.id);
    setFormData({
      type: integration.type,
      webhook_url: integration.webhook_url,
      channel_name: integration.channel_name ?? '',
      events: integration.events,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!formData.webhook_url.trim()) { setFormError('Webhook URL is required.'); return; }
    if (!formData.webhook_url.startsWith('https://')) { setFormError('Webhook URL must start with https://.'); return; }
    if (formData.events.length === 0) { setFormError('Select at least one event.'); return; }

    setSaving(true);
    try {
      const payload = {
        project_id:   id,
        type:         formData.type,
        webhook_url:  formData.webhook_url.trim(),
        channel_name: formData.channel_name.trim() || null,
        events:       formData.events,
      };

      if (editingId) {
        const { error } = await supabase
          .from('integrations')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('integrations').insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save integration.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    const { error } = await supabase
      .from('integrations')
      .update({ is_active: !integration.is_active, updated_at: new Date().toISOString() })
      .eq('id', integration.id);
    if (!error) {
      setIntegrations(prev =>
        prev.map(i => i.id === integration.id ? { ...i, is_active: !i.is_active } : i),
      );
    }
  };

  const handleDelete = async (integrationId: string) => {
    if (!confirm('Delete this integration? Webhook delivery will stop immediately.')) return;
    const { error } = await supabase.from('integrations').delete().eq('id', integrationId);
    if (!error) setIntegrations(prev => prev.filter(i => i.id !== integrationId));
  };

  // ── Test webhook ──────────────────────────────────────────────────────────

  const handleTest = async (integration: Integration) => {
    setTestingId(integration.id);
    setTestResult(null);
    try {
      const projectLink = `https://www.testably.app/projects/${id}`;
      const testPayload = integration.type === 'slack'
        ? {
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: '🧪 Testably Test Message', emoji: true } },
              { type: 'section', text: { type: 'mrkdwn', text: `Webhook connection verified for *${project?.name ?? 'your project'}*.` } },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'View in Testably', emoji: true },
                    url: projectLink,
                    style: 'primary',
                  },
                ],
              },
              { type: 'divider' },
            ],
          }
        : {
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              contentUrl: null,
              content: {
                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                type: 'AdaptiveCard',
                version: '1.4',
                body: [
                  { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: '🧪 Testably Test Message' },
                  { type: 'TextBlock', text: `Webhook connection verified for ${project?.name ?? 'your project'}.`, wrap: true },
                ],
                actions: [
                  { type: 'Action.OpenUrl', title: 'View in Testably', url: projectLink },
                ],
              },
            }],
          };

      const res = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-webhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: integration.webhook_url, payload: testPayload }),
        },
      );
      const json = await res.json();
      const ok = res.ok && json.status >= 200 && json.status < 300;
      setTestResult({
        id: integration.id,
        ok,
        msg: ok
          ? 'Test message sent successfully!'
          : `Delivery failed (HTTP ${json.status ?? '?'}) — check your webhook URL.`,
      });
    } catch (err: any) {
      setTestResult({ id: integration.id, ok: false, msg: err.message ?? 'Network error' });
    } finally {
      setTestingId(null);
    }
  };

  // ── Logs ─────────────────────────────────────────────────────────────────

  const openLogs = async (integrationId: string) => {
    setLogsIntegrationId(integrationId);
    setLogsLoading(true);
    const { data } = await supabase
      .from('integration_logs')
      .select('id, event_type, status, response_code, error_message, created_at')
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data as IntegrationLog[]) ?? []);
    setLogsLoading(false);
  };

  const closeLogs = () => {
    setLogsIntegrationId(null);
    setLogs([]);
  };

  // ── Event toggle helper ───────────────────────────────────────────────────

  const toggleEvent = (eventType: WebhookEventType) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventType)
        ? prev.events.filter(e => e !== eventType)
        : [...prev.events, eventType],
    }));
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const currentTier      = userProfile?.subscription_tier ?? 1;
  const tierInfo         = TIER_INFO[currentTier as keyof typeof TIER_INFO];
  const isStarterOrHigher = currentTier >= 2;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: breadcrumb */}
            <div className="flex items-center gap-4">
              <Link to="/projects" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <i className="ri-test-tube-line text-xl text-white"></i>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>Testably</span>
              </Link>
              <span className="text-gray-300 text-xl">/</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <i className="ri-folder-line text-white text-sm"></i>
                </div>
                <span className="text-lg font-semibold text-gray-900">{project?.name}</span>
              </div>
            </div>

            {/* Right: nav + profile */}
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1">
                <Link to={`/projects/${id}`}             className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap">Overview</Link>
                <Link to={`/projects/${id}/milestones`}  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap">Milestones</Link>
                <Link to={`/projects/${id}/documents`}   className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap">Documentation</Link>
                <Link to={`/projects/${id}/testcases`}   className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap">Test Cases</Link>
                <Link to={`/projects/${id}/runs`}        className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap">Runs &amp; Results</Link>
                <Link to={`/projects/${id}/sessions`}    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg whitespace-nowrap">Sessions</Link>
                <Link to={`/projects/${id}/integrations`} className="px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg whitespace-nowrap">Integrations</Link>
              </nav>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <div className="relative">
                  <div
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer overflow-hidden"
                  >
                    {userProfile?.avatar_emoji ? (
                      <span className="text-xl leading-none">{userProfile.avatar_emoji}</span>
                    ) : (
                      <span>{userProfile?.full_name?.charAt(0) ?? 'U'}</span>
                    )}
                  </div>
                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
                      <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name}</p>
                          <p className="text-xs text-gray-500">{userProfile?.email}</p>
                          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded-full border ${tierInfo.color}`}>
                            <i className={`${tierInfo.icon} text-sm`}></i>
                            {tierInfo.name}
                          </div>
                        </div>
                        <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100">
                          <i className="ri-settings-3-line text-lg"></i> Settings
                        </Link>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer">
                          <i className="ri-logout-box-line text-lg"></i> Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
          <div className="max-w-4xl mx-auto">

            {/* Page title */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Send real-time notifications to Slack or Microsoft Teams when events occur in this project.
                </p>
              </div>
              {isStarterOrHigher ? (
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-sm cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line text-lg"></i>
                  Add Integration
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-300 rounded-full text-xs font-semibold">
                  <i className="ri-star-line"></i>
                  Requires Starter or above
                </span>
              )}
            </div>

            {/* Upgrade banner for Free tier */}
            {!isStarterOrHigher && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-lock-line text-yellow-600 text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Slack & Teams Integration is available on Starter and above</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Get real-time notifications in Slack or Microsoft Teams when test runs complete, milestones change, and more.
                    </p>
                    <a
                      href="/settings"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-arrow-up-circle-line"></i>
                      Contact Us to Upgrade
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Integration list */}
            {integrations.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-plug-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations yet</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  Connect Slack or Microsoft Teams to receive real-time alerts about test runs, milestones, and team activity.
                </p>
                {isStarterOrHigher ? (
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-sm cursor-pointer"
                  >
                    <i className="ri-add-line"></i>
                    Add your first integration
                  </button>
                ) : (
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold text-sm cursor-pointer"
                  >
                    <i className="ri-arrow-up-circle-line"></i>
                    Upgrade to Starter
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {integrations.map((integration) => {
                  const meta = TYPE_META[integration.type];
                  const isTestingThis = testingId === integration.id;
                  const thisTestResult = testResult?.id === integration.id ? testResult : null;

                  return (
                    <div key={integration.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                            <i className={`${meta.icon} text-xl`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{meta.label}</span>
                              {integration.channel_name && (
                                <span className="text-sm text-gray-500">#{integration.channel_name}</span>
                              )}
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${integration.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {integration.is_active ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-0.5 truncate">{integration.webhook_url}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {integration.events.map(ev => {
                                const evMeta = WEBHOOK_EVENTS.find(e => e.type === ev);
                                return (
                                  <span key={ev} className="px-2 py-0.5 text-xs bg-teal-50 text-teal-700 rounded-full border border-teal-100">
                                    {evMeta?.label ?? ev}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleTest(integration)}
                            disabled={isTestingThis}
                            title="Send a test message"
                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                          >
                            {isTestingThis ? (
                              <><i className="ri-loader-4-line animate-spin"></i> Sending…</>
                            ) : (
                              <><i className="ri-send-plane-line"></i> Test</>
                            )}
                          </button>
                          <button
                            onClick={() => logsIntegrationId === integration.id ? closeLogs() : openLogs(integration.id)}
                            title="View delivery logs"
                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          >
                            <i className="ri-history-line"></i> Logs
                          </button>
                          <button
                            onClick={() => handleToggleActive(integration)}
                            title={integration.is_active ? 'Pause' : 'Resume'}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          >
                            <i className={integration.is_active ? 'ri-pause-line' : 'ri-play-line'}></i>
                            {integration.is_active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => openEditModal(integration)}
                            title="Edit"
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(integration.id)}
                            title="Delete"
                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>

                      {/* Test result banner */}
                      {thisTestResult && (
                        <div className={`mt-3 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${thisTestResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <i className={thisTestResult.ok ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}></i>
                          {thisTestResult.msg}
                        </div>
                      )}

                      {/* Logs panel */}
                      {logsIntegrationId === integration.id && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Delivery Logs (last 50)</h4>
                          {logsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <i className="ri-loader-4-line animate-spin"></i> Loading…
                            </div>
                          ) : logs.length === 0 ? (
                            <p className="text-sm text-gray-400">No deliveries yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                                    <th className="text-left py-2 pr-4 font-semibold">Event</th>
                                    <th className="text-left py-2 pr-4 font-semibold">Status</th>
                                    <th className="text-left py-2 pr-4 font-semibold">Code</th>
                                    <th className="text-left py-2 pr-4 font-semibold">Error</th>
                                    <th className="text-left py-2 font-semibold">Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {logs.map(log => (
                                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-2 pr-4 font-mono text-xs text-gray-600">{log.event_type}</td>
                                      <td className="py-2 pr-4">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                          log.status === 'success' ? 'bg-green-100 text-green-700' :
                                          log.status === 'failed'  ? 'bg-red-100 text-red-700' :
                                          'bg-yellow-100 text-yellow-700'
                                        }`}>
                                          {log.status}
                                        </span>
                                      </td>
                                      <td className="py-2 pr-4 text-gray-500">{log.response_code ?? '—'}</td>
                                      <td className="py-2 pr-4 text-red-500 text-xs max-w-xs truncate">{log.error_message ?? '—'}</td>
                                      <td className="py-2 text-gray-400 whitespace-nowrap text-xs">
                                        {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </td>
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

            {/* Info box */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
              <i className="ri-information-line text-blue-500 text-lg flex-shrink-0 mt-0.5"></i>
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">How it works</p>
                <ul className="space-y-1 text-blue-600 list-disc list-inside">
                  <li>Messages are delivered via Incoming Webhooks (Slack) or Workflow Webhooks (Teams).</li>
                  <li>Failed deliveries are retried up to 3 times with exponential back-off.</li>
                  <li>Delivery history is stored in the Logs panel for the last 50 events per integration.</li>
                  <li>Use the <strong>Test</strong> button to verify your webhook URL before going live.</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Add / Edit modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-plug-line text-teal-600 text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Integration' : 'Add Integration'}</h2>
                  <p className="text-sm text-gray-500">Configure a Slack or Teams webhook</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <i className="ri-close-line text-xl text-gray-500"></i>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Platform</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['slack', 'teams'] as const).map(t => {
                    const m = TYPE_META[t];
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${formData.type === t ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={t}
                          checked={formData.type === t}
                          onChange={() => setFormData(prev => ({ ...prev, type: t }))}
                          className="w-4 h-4 text-teal-600"
                        />
                        <div className={`w-7 h-7 rounded flex items-center justify-center ${m.color}`}>
                          <i className={`${m.icon} text-base`}></i>
                        </div>
                        <span className="font-semibold text-sm text-gray-900">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Webhook URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={e => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder={TYPE_META[formData.type].placeholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  <i className="ri-information-line mr-1"></i>
                  {TYPE_META[formData.type].hint}
                </p>
              </div>

              {/* Channel name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Channel Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.channel_name}
                  onChange={e => setFormData(prev => ({ ...prev, channel_name: e.target.value }))}
                  placeholder={formData.type === 'slack' ? 'e.g. qa-alerts' : 'e.g. QA Notifications'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1.5">Display label only — does not affect delivery.</p>
              </div>

              {/* Event toggles */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notify on <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev.type} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.events.includes(ev.type)}
                        onChange={() => toggleEvent(ev.type)}
                        className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ev.label}</p>
                        <p className="text-xs text-gray-500">{ev.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <i className="ri-error-warning-line"></i>
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><i className="ri-loader-4-line animate-spin"></i> Saving…</>
                  ) : (
                    <><i className="ri-save-line"></i> {editingId ? 'Save Changes' : 'Add Integration'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
