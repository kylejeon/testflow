import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface JiraSettings {
  domain: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'notifications'>('integrations');
  const [jiraSettings, setJiraSettings] = useState<JiraSettings>({
    domain: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJiraSettings();
  }, []);

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

  const fetchJiraSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jira_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setJiraSettings({
          domain: data.domain || '',
        });
      }
    } catch (error) {
      console.error('Jira 설정 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJiraSettings = async () => {
    try {
      setSaving(true);

      const { data: existingData } = await supabase
        .from('jira_settings')
        .select('id')
        .single();

      if (existingData) {
        const { error } = await supabase
          .from('jira_settings')
          .update({
            domain: jiraSettings.domain,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jira_settings')
          .insert({
            domain: jiraSettings.domain,
          });

        if (error) throw error;
      }

      alert('Jira 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Jira 설정 저장 오류:', error);
      alert('Jira 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <i className="ri-test-tube-line text-xl text-white"></i>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: '"Pacifico", serif' }}>
                  TestFlow
                </span>
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative" ref={profileMenuRef}>
                <div 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm cursor-pointer"
                >
                  JK
                </div>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
                  onClick={() => setActiveTab('general')}
                  className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'general'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className="ri-settings-3-line mr-2"></i>
                  General
                </button>
                <button
                  onClick={() => setActiveTab('integrations')}
                  className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'integrations'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className="ri-plug-line mr-2"></i>
                  Integrations
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'notifications'
                      ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <i className="ri-notification-3-line mr-2"></i>
                  Notifications
                </button>
              </div>

              <div className="p-8">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">General Settings</h2>
                      <p className="text-gray-600">Configure your general application preferences</p>
                    </div>
                  </div>
                )}

                {activeTab === 'integrations' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Jira Integration</h2>
                      <p className="text-gray-600 mb-6">Connect your Jira account to create issues directly from test results</p>

                      {loading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                        </div>
                      ) : (
                        <div className="space-y-6">
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">예: your-domain.atlassian.net</p>
                          </div>

                          <div className="flex items-center gap-3 pt-4">
                            <button
                              onClick={handleSaveJiraSettings}
                              disabled={saving || !jiraSettings.domain}
                              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold text-sm cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Settings</h2>
                      <p className="text-gray-600">Configure your notification preferences</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
