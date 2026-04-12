import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// ─── In-app notification preferences ──────────────────────────
interface InAppPreferences {
  invitation_sent: boolean;
  member_joined: boolean;
  run_created: boolean;
  run_completed: boolean;
  milestone_completed: boolean;
  milestone_past_due: boolean;
  milestone_started: boolean;
}

// ─── Email notification preferences ───────────────────────────
interface EmailPreferences {
  email_run_created: boolean;
  email_run_completed: boolean;
  email_test_failed: boolean;
  email_project_invited: boolean;
  email_tc_assigned: boolean;
  frequency: 'instant' | 'daily' | 'weekly' | 'off';
}

const DEFAULT_INAPP: InAppPreferences = {
  invitation_sent: true,
  member_joined: true,
  run_created: true,
  run_completed: true,
  milestone_completed: true,
  milestone_past_due: true,
  milestone_started: true,
};

const DEFAULT_EMAIL: EmailPreferences = {
  email_run_created: true,
  email_run_completed: true,
  email_test_failed: true,
  email_project_invited: true,
  email_tc_assigned: true,
  frequency: 'instant',
};

interface NotificationGroup {
  label: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  items: {
    key: keyof InAppPreferences;
    label: string;
    desc: string;
  }[];
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    label: 'Team Activity',
    icon: 'ri-team-line',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    items: [
      { key: 'invitation_sent', label: 'Invitation Received', desc: 'Get notified when you are invited to a project' },
      { key: 'member_joined', label: 'New Member Joined', desc: 'Get notified when a new member joins your project' },
    ],
  },
  {
    label: 'Test Runs',
    icon: 'ri-play-circle-line',
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
    items: [
      { key: 'run_created', label: 'New Run Created', desc: 'Get notified when a new test run is created in your project' },
      { key: 'run_completed', label: 'Run Completed', desc: 'Get notified when a test run is marked as completed' },
    ],
  },
  {
    label: 'Milestones',
    icon: 'ri-flag-line',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    items: [
      { key: 'milestone_started', label: 'Milestone Started', desc: 'Get notified when a milestone is set to in progress' },
      { key: 'milestone_completed', label: 'Milestone Completed', desc: 'Get notified when a milestone is marked as completed' },
      { key: 'milestone_past_due', label: 'Milestone Past Due', desc: 'Get notified when a milestone deadline has passed' },
    ],
  },
];

const EMAIL_ITEMS: { key: keyof Omit<EmailPreferences, 'frequency'>; label: string; desc: string }[] = [
  { key: 'email_run_created',     label: 'New Run Created',      desc: 'Email when a new test run is created in your project' },
  { key: 'email_run_completed',   label: 'Run Completed',        desc: 'Email with pass rate and failed count when a run finishes' },
  { key: 'email_test_failed',     label: 'Test Case Failed',     desc: 'Email when a test case you authored or are assigned to fails' },
  { key: 'email_project_invited', label: 'Project Invitation',   desc: 'Email when you are invited to a new project' },
  { key: 'email_tc_assigned',     label: 'Test Case Assigned',   desc: 'Email when a test case is assigned to you' },
];

const FREQUENCY_OPTIONS: { value: EmailPreferences['frequency']; label: string; desc: string }[] = [
  { value: 'instant', label: 'Instant',      desc: 'Send immediately' },
  { value: 'daily',   label: 'Daily digest', desc: 'Batch into one daily email' },
  { value: 'weekly',  label: 'Weekly digest', desc: 'Batch into one weekly email' },
  { value: 'off',     label: 'Off',          desc: 'No email notifications' },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 cursor-pointer"
      style={{ width: '2.5rem', height: '1.375rem', borderRadius: '9999px', background: checked ? '#6366F1' : '#E2E8F0', border: 'none', transition: 'background 0.2s' }}
    >
      <span
        style={{
          position: 'absolute', top: '2px', left: '2px',
          width: '1.125rem', height: '1.125rem', borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'transform 0.2s',
          transform: checked ? 'translateX(1.125rem)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export default function NotificationSettingsPanel() {
  const [inApp, setInApp] = useState<InAppPreferences>(DEFAULT_INAPP);
  const [email, setEmail] = useState<EmailPreferences>(DEFAULT_EMAIL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasRecord, setHasRecord] = useState(false);

  const fetchPrefs = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setHasRecord(true);
        setInApp({
          invitation_sent:     data.invitation_sent,
          member_joined:       data.member_joined,
          run_created:         data.run_created,
          run_completed:       data.run_completed,
          milestone_completed: data.milestone_completed,
          milestone_past_due:  data.milestone_past_due,
          milestone_started:   data.milestone_started,
        });
        setEmail({
          email_run_created:     data.email_run_created     ?? true,
          email_run_completed:   data.email_run_completed   ?? true,
          email_test_failed:     data.email_test_failed     ?? true,
          email_project_invited: data.email_project_invited ?? true,
          email_tc_assigned:     data.email_tc_assigned     ?? true,
          frequency:             data.frequency             ?? 'instant',
        });
      } else {
        setHasRecord(false);
        setInApp(DEFAULT_INAPP);
        setEmail(DEFAULT_EMAIL);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const handleInAppToggle = (key: keyof InAppPreferences, val: boolean) => {
    setInApp(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleGroupToggle = (group: NotificationGroup, allOn: boolean) => {
    const updated = { ...inApp };
    group.items.forEach(item => { updated[item.key] = !allOn; });
    setInApp(updated);
    setSaved(false);
  };

  const handleEmailToggle = (key: keyof Omit<EmailPreferences, 'frequency'>, val: boolean) => {
    setEmail(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleFrequency = (val: EmailPreferences['frequency']) => {
    setEmail(prev => ({ ...prev, frequency: val }));
    setSaved(false);
  };

  const allEmailEnabled = EMAIL_ITEMS.every(item => email[item.key]);
  const handleMasterEmailToggle = (val: boolean) => {
    setEmail(prev => ({
      ...prev,
      email_run_created:     val,
      email_run_completed:   val,
      email_test_failed:     val,
      email_project_invited: val,
      email_tc_assigned:     val,
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const payload = {
        ...inApp,
        ...email,
        updated_at: new Date().toISOString(),
      };
      if (hasRecord) {
        const { error } = await supabase.from('notification_preferences')
          .update(payload).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_preferences')
          .insert({ user_id: user.id, ...payload });
        if (error) throw error;
        setHasRecord(true);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableAll = () => {
    setInApp({ invitation_sent: true, member_joined: true, run_created: true, run_completed: true, milestone_completed: true, milestone_past_due: true, milestone_started: true });
    setSaved(false);
  };

  const handleDisableAll = () => {
    setInApp({ invitation_sent: false, member_joined: false, run_created: false, run_completed: false, milestone_completed: false, milestone_past_due: false, milestone_started: false });
    setSaved(false);
  };

  const enabledCount = Object.values(inApp).filter(Boolean).length;
  const totalCount = Object.values(inApp).length;
  const allEnabled = enabledCount === totalCount;
  const allDisabled = enabledCount === 0;

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-[0.625rem] p-6 flex justify-center items-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 mb-5">
      {/* ── In-app notifications ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[0.625rem] p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-[0.9375rem] font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
              <i className="ri-notification-3-line text-indigo-500"></i>
              In-App Notifications
            </h3>
            <p className="text-[0.8125rem] text-slate-500">
              Choose which in-app notifications you want to receive.{' '}
              <span className="font-semibold text-indigo-500">{enabledCount}/{totalCount}</span> notifications enabled.
            </p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={handleDisableAll}
              disabled={allDisabled}
              className="text-[0.6875rem] font-medium px-2.5 py-[0.3125rem] rounded-[0.375rem] border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Disable All
            </button>
            <button
              onClick={handleEnableAll}
              disabled={allEnabled}
              className="text-[0.6875rem] font-medium px-2.5 py-[0.3125rem] rounded-[0.375rem] bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Enable All
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-[0.375rem] bg-slate-100 rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(enabledCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Notification Groups */}
        <div className="flex flex-col gap-4">
          {NOTIFICATION_GROUPS.map((group) => {
            const groupAllOn = group.items.every(item => inApp[item.key]);
            return (
              <div key={group.label} className="border border-slate-200 rounded-[0.75rem] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-[0.875rem] bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center flex-shrink-0" style={{ background: group.iconBg }}>
                      <i className={group.icon} style={{ color: group.iconColor, fontSize: '0.875rem' }}></i>
                    </div>
                    <div>
                      <div className="text-[0.8125rem] font-bold text-slate-900">{group.label}</div>
                      <div className="text-[0.6875rem] text-slate-400">
                        {group.items.filter(item => inApp[item.key]).length}/{group.items.length} enabled
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGroupToggle(group, groupAllOn)}
                    className="text-[0.6875rem] font-medium px-2.5 py-[0.25rem] rounded-[0.375rem] border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {groupAllOn ? 'Disable group' : 'Enable group'}
                  </button>
                </div>
                {group.items.map((item, idx) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderBottom: idx < group.items.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[0.8125rem] font-medium text-slate-700">{item.label}</span>
                        {inApp[item.key] && (
                          <span className="px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[0.5625rem] font-bold rounded-full leading-none">ON</span>
                        )}
                      </div>
                      <p className="text-[0.6875rem] text-slate-400">{item.desc}</p>
                    </div>
                    <ToggleSwitch checked={inApp[item.key]} onChange={(val) => handleInAppToggle(item.key, val)} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-[0.75rem] mt-4">
          <i className="ri-information-line text-slate-400 text-lg flex-shrink-0 mt-0.5"></i>
          <div>
            <div className="text-[0.8125rem] font-semibold text-slate-600 mb-1">About In-App Notifications</div>
            <div className="text-[0.75rem] text-slate-400 leading-relaxed">
              Delivered in real-time via the notification bell{' '}
              <i className="ri-notification-3-line"></i> in the app. Disabling a setting stops new notifications for that event. Existing notifications are not affected.
            </div>
          </div>
        </div>
      </div>

      {/* ── Email notifications ───────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[0.625rem] p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[0.9375rem] font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
              <i className="ri-mail-line text-emerald-500"></i>
              Email Notifications
            </h3>
            <p className="text-[0.8125rem] text-slate-500">
              Control which events trigger an email. Emails are sent to your account address.
            </p>
          </div>
          {/* Master toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[0.75rem] font-medium text-slate-500">
              {allEmailEnabled ? 'All on' : 'Some off'}
            </span>
            <ToggleSwitch checked={allEmailEnabled} onChange={handleMasterEmailToggle} />
          </div>
        </div>

        {/* Email event toggles */}
        <div className="border border-slate-200 rounded-[0.75rem] overflow-hidden mb-4">
          {EMAIL_ITEMS.map((item, idx) => (
            <div
              key={item.key}
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: idx < EMAIL_ITEMS.length - 1 ? '1px solid #F1F5F9' : 'none' }}
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[0.8125rem] font-medium text-slate-700">{item.label}</span>
                  {email[item.key] && (
                    <span className="px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[0.5625rem] font-bold rounded-full leading-none">ON</span>
                  )}
                </div>
                <p className="text-[0.6875rem] text-slate-400">{item.desc}</p>
              </div>
              <ToggleSwitch
                checked={email[item.key]}
                onChange={(val) => handleEmailToggle(item.key as keyof Omit<EmailPreferences, 'frequency'>, val)}
              />
            </div>
          ))}
        </div>

        {/* Frequency selector */}
        <div className="border border-slate-200 rounded-[0.75rem] overflow-hidden">
          <div className="px-5 py-[0.875rem] bg-slate-50 border-b border-slate-200">
            <div className="text-[0.8125rem] font-bold text-slate-900">Delivery Frequency</div>
            <div className="text-[0.6875rem] text-slate-400">How often should email notifications be sent?</div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFrequency(opt.value)}
                className="flex flex-col items-start gap-0.5 p-3 rounded-[0.5rem] border text-left cursor-pointer transition-all"
                style={{
                  border: email.frequency === opt.value ? '1.5px solid #6366F1' : '1.5px solid #E2E8F0',
                  background: email.frequency === opt.value ? '#EEF2FF' : '#FFFFFF',
                }}
              >
                <span
                  className="text-[0.8125rem] font-semibold"
                  style={{ color: email.frequency === opt.value ? '#4338CA' : '#334155' }}
                >
                  {opt.label}
                </span>
                <span className="text-[0.6875rem] text-slate-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Unsubscribe hint */}
        <p className="text-[0.75rem] text-slate-400 mt-3 flex items-center gap-1">
          <i className="ri-links-line"></i>
          Each email includes an unsubscribe link that returns here.
        </p>
      </div>

      {/* ── Save button (shared) ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[0.625rem] px-6 py-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
        >
          {saving ? <><i className="ri-loader-4-line animate-spin"></i>Saving...</> : <><i className="ri-save-line"></i>Save Settings</>}
        </button>
        {saved && (
          <span className="text-[0.8125rem] text-indigo-500 font-medium flex items-center gap-1">
            <i className="ri-checkbox-circle-fill"></i> Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
