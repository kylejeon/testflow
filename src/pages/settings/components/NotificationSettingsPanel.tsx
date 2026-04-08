import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

interface NotificationPreferences {
  invitation_sent: boolean;
  member_joined: boolean;
  run_created: boolean;
  run_completed: boolean;
  milestone_completed: boolean;
  milestone_past_due: boolean;
  milestone_started: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  invitation_sent: true,
  member_joined: true,
  run_created: true,
  run_completed: true,
  milestone_completed: true,
  milestone_past_due: true,
  milestone_started: true,
};

interface NotificationGroup {
  label: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  items: {
    key: keyof NotificationPreferences;
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
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
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
        setPrefs({
          invitation_sent: data.invitation_sent,
          member_joined: data.member_joined,
          run_created: data.run_created,
          run_completed: data.run_completed,
          milestone_completed: data.milestone_completed,
          milestone_past_due: data.milestone_past_due,
          milestone_started: data.milestone_started,
        });
      } else {
        setHasRecord(false);
        setPrefs(DEFAULT_PREFS);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const handleToggle = (key: keyof NotificationPreferences, val: boolean) => {
    setPrefs(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleGroupToggle = (group: NotificationGroup, allOn: boolean) => {
    const updated = { ...prefs };
    group.items.forEach(item => { updated[item.key] = !allOn; });
    setPrefs(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (hasRecord) {
        const { error } = await supabase.from('notification_preferences')
          .update({ ...prefs, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_preferences').insert({ user_id: user.id, ...prefs });
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
    setPrefs({ invitation_sent: true, member_joined: true, run_created: true, run_completed: true, milestone_completed: true, milestone_past_due: true, milestone_started: true });
    setSaved(false);
  };

  const handleDisableAll = () => {
    setPrefs({ invitation_sent: false, member_joined: false, run_created: false, run_completed: false, milestone_completed: false, milestone_past_due: false, milestone_started: false });
    setSaved(false);
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const totalCount = Object.values(prefs).length;
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
    <div className="bg-white border border-slate-200 rounded-[0.625rem] p-6 mb-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[0.9375rem] font-bold text-slate-900 mb-0.5 flex items-center gap-1.5">
            <i className="ri-notification-3-line text-indigo-500"></i>
            Notification Settings
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
          const groupAllOn = group.items.every(item => prefs[item.key]);

          return (
            <div key={group.label} className="border border-slate-200 rounded-[0.75rem] overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center justify-between px-5 py-[0.875rem] bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center flex-shrink-0" style={{ background: group.iconBg }}>
                    <i className={group.icon} style={{ color: group.iconColor, fontSize: '0.875rem' }}></i>
                  </div>
                  <div>
                    <div className="text-[0.8125rem] font-bold text-slate-900">{group.label}</div>
                    <div className="text-[0.6875rem] text-slate-400">
                      {group.items.filter(item => prefs[item.key]).length}/{group.items.length} enabled
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

              {/* Items */}
              {group.items.map((item, idx) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: idx < group.items.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[0.8125rem] font-medium text-slate-700">{item.label}</span>
                      {prefs[item.key] && (
                        <span className="px-1 py-0.5 bg-indigo-50 text-indigo-700 text-[0.5625rem] font-bold rounded-full leading-none">ON</span>
                      )}
                    </div>
                    <p className="text-[0.6875rem] text-slate-400">{item.desc}</p>
                  </div>
                  <ToggleSwitch checked={prefs[item.key]} onChange={(val) => handleToggle(item.key, val)} />
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
          <div className="text-[0.8125rem] font-semibold text-slate-600 mb-1">About Notifications</div>
          <div className="text-[0.75rem] text-slate-400 leading-relaxed">
            Notifications are delivered in real-time via the notification bell{' '}
            <i className="ri-notification-3-line"></i> in the app. Disabling a setting will stop new notifications from being created for that event. Existing notifications will not be affected.
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-4 mt-1 border-t border-slate-200">
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
