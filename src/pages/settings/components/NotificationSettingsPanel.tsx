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
  color: string;
  bg: string;
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
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    items: [
      {
        key: 'invitation_sent',
        label: 'Invitation Received',
        desc: 'Get notified when you are invited to a project',
      },
      {
        key: 'member_joined',
        label: 'New Member Joined',
        desc: 'Get notified when a new member joins your project',
      },
    ],
  },
  {
    label: 'Test Runs',
    icon: 'ri-play-circle-line',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    items: [
      {
        key: 'run_created',
        label: 'New Run Created',
        desc: 'Get notified when a new test run is created in your project',
      },
      {
        key: 'run_completed',
        label: 'Run Completed',
        desc: 'Get notified when a test run is marked as completed',
      },
    ],
  },
  {
    label: 'Milestones',
    icon: 'ri-flag-line',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    items: [
      {
        key: 'milestone_started',
        label: 'Milestone Started',
        desc: 'Get notified when a milestone is set to in progress',
      },
      {
        key: 'milestone_completed',
        label: 'Milestone Completed',
        desc: 'Get notified when a milestone is marked as completed',
      },
      {
        key: 'milestone_past_due',
        label: 'Milestone Past Due',
        desc: 'Get notified when a milestone deadline has passed',
      },
    ],
  },
];

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${checked ? 'bg-indigo-500' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const handleToggle = (key: keyof NotificationPreferences, val: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleGroupToggle = (group: NotificationGroup, allOn: boolean) => {
    const updated = { ...prefs };
    group.items.forEach((item) => {
      updated[item.key] = !allOn;
    });
    setPrefs(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (hasRecord) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({ ...prefs, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...prefs });
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
    const all: NotificationPreferences = {
      invitation_sent: true,
      member_joined: true,
      run_created: true,
      run_completed: true,
      milestone_completed: true,
      milestone_past_due: true,
      milestone_started: true,
    };
    setPrefs(all);
    setSaved(false);
  };

  const handleDisableAll = () => {
    const none: NotificationPreferences = {
      invitation_sent: false,
      member_joined: false,
      run_created: false,
      run_completed: false,
      milestone_completed: false,
      milestone_past_due: false,
      milestone_started: false,
    };
    setPrefs(none);
    setSaved(false);
  };

  const allEnabled = Object.values(prefs).every(Boolean);
  const allDisabled = Object.values(prefs).every((v) => !v);
  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const totalCount = Object.values(prefs).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Notification Settings</h2>
          <p className="text-gray-500 text-sm">
            Choose which in-app notifications you want to receive.{' '}
            <span className="font-semibold text-indigo-600">{enabledCount}/{totalCount}</span> notifications enabled.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDisableAll}
            disabled={allDisabled}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Disable All
          </button>
          <button
            onClick={handleEnableAll}
            disabled={allEnabled}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enable All
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${(enabledCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Notification Groups */}
      <div className="space-y-6">
        {NOTIFICATION_GROUPS.map((group) => {
          const groupAllOn = group.items.every((item) => prefs[item.key]);
          const groupSomeOn = group.items.some((item) => prefs[item.key]);

          return (
            <div
              key={group.label}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50/60 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${group.bg} rounded-lg flex items-center justify-center`}>
                    <i className={`${group.icon} ${group.color} text-base`}></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{group.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {group.items.filter((item) => prefs[item.key]).length}/{group.items.length} enabled
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleGroupToggle(group, groupAllOn)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    groupAllOn
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : groupSomeOn
                      ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {groupAllOn ? 'Disable group' : 'Enable group'}
                </button>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-100">
                {group.items.map((item, idx) => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between px-5 py-4 transition-colors ${
                      prefs[item.key] ? 'bg-white' : 'bg-gray-50/40'
                    } ${idx === 0 ? '' : ''}`}
                  >
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${prefs[item.key] ? 'text-gray-900' : 'text-gray-400'}`}>
                          {item.label}
                        </p>
                        {prefs[item.key] && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full leading-none">
                            ON
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed ${prefs[item.key] ? 'text-gray-500' : 'text-gray-400'}`}>
                        {item.desc}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={prefs[item.key]}
                      onChange={(val) => handleToggle(item.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <i className="ri-information-line text-gray-400 text-lg flex-shrink-0 mt-0.5"></i>
        <div className="text-sm text-gray-500">
          <p className="font-medium text-gray-600 mb-1">About Notifications</p>
          <ul className="space-y-1 text-xs leading-relaxed">
            <li>• Notifications are delivered in real-time via the notification bell <i className="ri-notification-3-line"></i> in the app</li>
            <li>• Disabling a setting will stop new notifications from being created for that event</li>
            <li>• Existing notifications will not be affected</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <i className="ri-loader-4-line animate-spin"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="ri-save-line"></i>
              Save Settings
            </>
          )}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium animate-pulse">
            <i className="ri-checkbox-circle-fill text-base"></i>
            Saved successfully
          </div>
        )}
      </div>
    </div>
  );
}
