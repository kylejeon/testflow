import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

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
}

const TIER_INFO = {
  1: {
    name: 'Free',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: 'ri-user-line',
    monthlyPrice: 0,
    priceDesc: '무료',
    features: ['프로젝트 3개까지', '팀 멤버 5명까지', '기본 테스트 관리', 'Jira 연동', '커뮤니티 지원'],
  },
  2: {
    name: 'Starter',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    icon: 'ri-star-line',
    monthlyPrice: 9900,
    priceDesc: '/ 월',
    features: ['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira 연동', '기본 리포팅', '이메일 지원'],
  },
  3: {
    name: 'Professional',
    color: 'bg-teal-50 text-teal-700 border-teal-300',
    icon: 'ri-vip-crown-line',
    monthlyPrice: 24900,
    priceDesc: '/ 월',
    features: ['프로젝트 무제한', '팀 멤버 15명까지', 'Jira 연동', '고급 리포팅', '우선 지원'],
  },
  4: {
    name: 'Enterprise',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    icon: 'ri-vip-diamond-line',
    monthlyPrice: -1,
    priceDesc: '맞춤 견적',
    features: ['모든 Professional 기능', '무제한 프로젝트', '무제한 팀 멤버', '전용 지원 담당자', '커스텀 통합', 'SLA 보장'],
  },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'notifications'>('general');
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
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
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

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile({
          email: data.email || user.email || '',
          full_name: data.full_name || '',
          subscription_tier: data.subscription_tier || 1,
        });
      }
    } catch (error) {
      console.error('프로필 로딩 오류:', error);
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
      console.error('Jira 설정 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken) {
      setTestResult({ success: false, message: '모든 필수 항목을 입력해주세요.' });
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
        setTestResult({ success: true, message: 'Jira 연결에 성공했습니다!' });
      } else {
        setTestResult({ success: false, message: data.message || 'Jira 연결에 실패했습니다.' });
      }
    } catch (error: any) {
      console.error('Jira 연결 테스트 오류:', error);
      setTestResult({ success: false, message: error.message || 'Jira 연결 테스트 중 오류가 발생했습니다.' });
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

      alert('Jira 설정이 저장되었습니다.');
      setTestResult(null);
    } catch (error) {
      console.error('Jira 설정 저장 오류:', error);
      alert('Jira 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const currentTier = userProfile?.subscription_tier || 1;
  const tierInfo = TIER_INFO[currentTier as keyof typeof TIER_INFO] || TIER_INFO[1];
  const isProfessionalOrHigher = currentTier >= 3;

  const formatPrice = (monthlyPrice: number, isAnnual: boolean) => {
    if (monthlyPrice === 0) return '₩0';
    if (monthlyPrice === -1) return '문의';
    const price = isAnnual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
    return `₩${price.toLocaleString()}`;
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
                  {userProfile?.full_name?.charAt(0) || 'U'}
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
                  <div className="space-y-8">
                    {/* Subscription Tier Section */}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Plan</h2>
                      <p className="text-gray-600 mb-6">현재 구독 중인 요금제를 확인하세요</p>

                      {/* Current Plan Card */}
                      <div className={`p-6 rounded-xl border-2 ${tierInfo.color} mb-6`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              currentTier === 1 ? 'bg-gray-200' : currentTier === 2 ? 'bg-yellow-100' : currentTier === 3 ? 'bg-teal-100' : 'bg-amber-100'
                            }`}>
                              <i className={`${tierInfo.icon} text-2xl ${
                                currentTier === 1 ? 'text-gray-600' : currentTier === 2 ? 'text-yellow-600' : currentTier === 3 ? 'text-teal-600' : 'text-amber-600'
                              }`}></i>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">{tierInfo.name}</h3>
                              <p className="text-sm opacity-80">현재 요금제</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            currentTier === 1 ? 'bg-gray-200 text-gray-700' : currentTier === 2 ? 'bg-yellow-200 text-yellow-800' : currentTier === 3 ? 'bg-teal-200 text-teal-800' : 'bg-amber-200 text-amber-800'
                          }`}>
                            Active
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {tierInfo.features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <i className="ri-check-line"></i>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Billing Toggle */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">모든 요금제 비교</h3>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                          <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                              billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            월간 결제
                          </button>
                          <button
                            onClick={() => setBillingCycle('annual')}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                              billingCycle === 'annual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            연간 결제
                            <span className="px-1.5 py-0.5 bg-teal-500 text-white text-xs rounded-full">20% 할인</span>
                          </button>
                        </div>
                      </div>

                      {/* All Plans Comparison */}
                      <div className="grid grid-cols-4 gap-4">
                        {Object.entries(TIER_INFO).map(([tier, info]) => {
                          const tierNum = parseInt(tier);
                          const isCurrentTier = tierNum === currentTier;
                          const isAnnual = billingCycle === 'annual';
                          return (
                            <div
                              key={tier}
                              className={`p-5 rounded-xl border-2 transition-all ${
                                isCurrentTier
                                  ? info.color
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <i className={`${info.icon} text-xl ${
                                  tierNum === 1 ? 'text-gray-500' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-teal-500' : 'text-amber-500'
                                }`}></i>
                                <h4 className="font-bold text-gray-900">{info.name}</h4>
                                {isCurrentTier && (
                                  <span className="ml-auto px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full">
                                    현재
                                  </span>
                                )}
                              </div>

                              {/* Price */}
                              <div className="mb-4 pb-4 border-b border-gray-200/70">
                                <div className="flex items-end gap-1">
                                  <span className={`text-2xl font-bold ${
                                    tierNum === 1 ? 'text-gray-700' : tierNum === 2 ? 'text-yellow-700' : tierNum === 3 ? 'text-teal-700' : 'text-amber-700'
                                  }`}>
                                    {formatPrice(info.monthlyPrice, isAnnual)}
                                  </span>
                                  {info.monthlyPrice > 0 && (
                                    <span className="text-sm text-gray-500 mb-0.5">{info.priceDesc}</span>
                                  )}
                                  {info.monthlyPrice === 0 && (
                                    <span className="text-sm text-gray-500 mb-0.5">{info.priceDesc}</span>
                                  )}
                                  {info.monthlyPrice === -1 && (
                                    <span className="text-sm text-gray-500 mb-0.5">{info.priceDesc}</span>
                                  )}
                                </div>
                                {isAnnual && info.monthlyPrice > 0 && (
                                  <p className="text-xs text-teal-600 mt-1">
                                    <i className="ri-price-tag-3-line mr-1"></i>
                                    월 {formatPrice(info.monthlyPrice, false)} 대비 20% 절약
                                  </p>
                                )}
                              </div>

                              <ul className="space-y-2">
                                {info.features.map((feature, index) => (
                                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                    <i className={`ri-check-line mt-0.5 ${
                                      tierNum === 1 ? 'text-gray-400' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-teal-500' : 'text-amber-500'
                                    }`}></i>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                              {!isCurrentTier && tierNum > currentTier && (
                                <button className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all cursor-pointer whitespace-nowrap">
                                  업그레이드 문의
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Profile Section */}
                    <div className="pt-6 border-t border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Information</h2>
                      <p className="text-gray-600 mb-4">계정 정보를 확인하세요</p>
                      <div className="grid grid-cols-2 gap-4 max-w-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">이름</label>
                          <p className="text-gray-900 font-medium">{userProfile?.full_name || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">이메일</label>
                          <p className="text-gray-900 font-medium">{userProfile?.email || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'integrations' && (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-gray-900">Jira Integration</h2>
                        {!isProfessionalOrHigher && (
                          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded-full text-xs font-semibold flex items-center gap-1">
                            <i className="ri-vip-crown-line"></i>
                            Professional 이상 필요
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-6">Connect your Jira account to create issues directly from test results</p>

                      {!isProfessionalOrHigher && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <i className="ri-lock-line text-teal-600 text-xl"></i>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">Jira 통합은 Professional 이상 요금제에서 사용 가능합니다</h3>
                              <p className="text-sm text-gray-600 mb-3">
                                테스트 결과에서 바로 Jira 이슈를 생성하고, 자동으로 연동하여 팀 협업을 강화하세요.
                              </p>
                              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap">
                                <i className="ri-arrow-up-circle-line mr-2"></i>
                                업그레이드 문의
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {loading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                        </div>
                      ) : (
                        <div className={`space-y-6 ${!isProfessionalOrHigher ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                disabled={!isProfessionalOrHigher}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">예: your-domain.atlassian.net</p>
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                              disabled={!isProfessionalOrHigher}
                            />
                            <p className="text-xs text-gray-500 mt-1">Jira 계정 이메일 주소</p>
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
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                disabled={!isProfessionalOrHigher}
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiToken(!showApiToken)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                disabled={!isProfessionalOrHigher}
                              >
                                <i className={`${showApiToken ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`}></i>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              <a 
                                href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:underline"
                              >
                                여기에서 API 토큰 생성
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                              disabled={!isProfessionalOrHigher}
                            >
                              <option value="Bug">Bug</option>
                              <option value="Task">Task</option>
                              <option value="Story">Story</option>
                              <option value="Epic">Epic</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">새 이슈 생성 시 기본 이슈 타입</p>
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
                              disabled={testing || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken || !isProfessionalOrHigher}
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
                              disabled={saving || !jiraSettings.domain || !jiraSettings.email || !jiraSettings.apiToken || !isProfessionalOrHigher}
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
