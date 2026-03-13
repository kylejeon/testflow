import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SEOHead from '../../components/SEOHead';

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
    priceDesc: '무료',
    features: ['프로젝트 3개까지', '팀 멤버 5명까지', '기본 테스트 관리', 'Jira Integration (Link)', '커뮤니티 지원'],
  },
  2: {
    name: 'Starter',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    icon: 'ri-star-line',
    monthlyPrice: 9900,
    priceDesc: '/ 월',
    features: ['프로젝트 10개까지', '팀 멤버 8명까지', 'Jira Integration', '기본 리포팅', 'Testcase Export/Import', 'Export PDF Report'],
  },
  3: {
    name: 'Professional',
    color: 'bg-teal-50 text-teal-700 border-teal-300',
    icon: 'ri-vip-crown-line',
    monthlyPrice: 24900,
    priceDesc: '/ 월',
    features: ['프로젝트 무제한', '팀 멤버 15명까지', 'Jira Integration', '고급 리포팅', 'Testcase Export/Import', 'Export PDF Report', 'CI/CD Integration', '우선 지원'],
  },
  4: {
    name: 'Enterprise',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    icon: 'ri-vip-diamond-line',
    monthlyPrice: -1,
    priceDesc: '맞춤 견적',
    features: ['모든 Professional 기능', '무제한 프로젝트', '무제한 팀 멤버', 'Jira Integration', 'Testcase Export/Import', 'Export PDF Report', '전용 지원 담당자', '커스텀 통합', 'SLA 보장'],
  },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'notifications' | 'cicd'>('general');
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

  useEffect(() => {
    fetchUserProfile();
    fetchJiraSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'cicd') {
      fetchCITokens();
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
        .select('email, full_name, subscription_tier, trial_started_at, trial_ends_at, is_trial')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // 체험 기간 만료 시 자동으로 Free 티어로 전환
        let tier = data.subscription_tier || 1;
        let isTrial = data.is_trial || false;

        if (isTrial && data.trial_ends_at) {
          const now = new Date();
          const trialEnd = new Date(data.trial_ends_at);
          if (now > trialEnd) {
            // 만료 → Free 티어로 전환
            await supabase
              .from('profiles')
              .update({ subscription_tier: 1, is_trial: false })
              .eq('id', user.id);
            tier = 1;
            isTrial = false;
          }
        }

        setUserProfile({
          email: data.email || user.email || '',
          full_name: data.full_name || '',
          subscription_tier: tier,
          trial_started_at: data.trial_started_at || null,
          trial_ends_at: data.trial_ends_at || null,
          is_trial: isTrial,
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
      alert('토큰 이름을 입력해주세요.');
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

      alert('API 토큰이 생성되었습니다. 토큰을 안전한 곳에 보관하세요.');
      setNewTokenName('');
      setShowNewTokenModal(false);
      fetchCITokens();
    } catch (error) {
      console.error('토큰 생성 오류:', error);
      alert('토큰 생성에 실패했습니다.');
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
    if (!confirm('이 토큰을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ci_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;

      alert('토큰이 삭제되었습니다.');
      fetchCITokens();
    } catch (error) {
      console.error('토큰 삭제 오류:', error);
      alert('토큰 삭제에 실패했습니다.');
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

# Testably API URL (고정값, 변경 불필요)
TESTABLY_URL = "${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results"

# 환경변수에서 토큰 읽기
TESTABLY_TOKEN = os.environ.get("TESTABLY_TOKEN")

# 결과를 담을 리스트
results = []

def report_result(test_case_id: str, status: str, note: str = "", elapsed: float = 0):
    """테스트 결과를 results 리스트에 추가합니다."""
    results.append({
        "test_case_id": test_case_id,
        "status": status,       # "passed" | "failed" | "blocked" | "retest"
        "note": note,           # 메모 (선택)
        "elapsed": elapsed,     # 소요 시간(초, 선택)
        "author": "pytest"
    })

# ── 테스트 함수 예시 ──────────────────────────────────────
def test_login():
    result = True  # 실제 테스트 로직으로 교체하세요
    status = "passed" if result else "failed"
    report_result("SUI-1", status, note="로그인 테스트 정상 완료")
    return result

def test_signup():
    result = True
    status = "passed" if result else "failed"
    report_result("SUI-2", status, note="회원가입 플로우 검증 완료")
    return result

# ── 결과 업로드 ───────────────────────────────────────────
if __name__ == "__main__":
    test_login()
    test_signup()

    response = requests.post(
        TESTABLY_URL,
        headers={"Authorization": f"Bearer {TESTABLY_TOKEN}"},
        json={
            "run_id": "YOUR_RUN_ID",   # Testably Run ID로 교체하세요
            "results": results
        }
    )
    print("응답 상태:", response.status_code)
    print("응답 내용:", response.text)`;
  };

  const getPythonConftestSnippet = () => {
    return `# conftest.py  ← 프로젝트 루트에 저장하세요
import pytest
import requests
import os
import time

# 환경변수에서 읽기
TESTABLY_URL = os.environ.get("TESTABLY_URL", "${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results")
TESTABLY_TOKEN = os.environ.get("TESTABLY_TOKEN")
RUN_ID = os.environ.get("TESTABLY_RUN_ID", "YOUR_RUN_ID")

# 테스트케이스 ID 매핑 (테스트 함수명 → Testably ID)
TEST_CASE_MAP = {
    "test_login":  "SUI-1",
    "test_signup": "SUI-2",
    # 필요한 만큼 추가하세요
}

_results = []
_timings: dict[str, float] = {}

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_call(item):
    """각 테스트 실행 시간을 측정합니다."""
    start = time.time()
    yield
    _timings[item.name] = round(time.time() - start, 2)

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """테스트 결과를 수집합니다."""
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        test_case_id = TEST_CASE_MAP.get(item.name)
        if not test_case_id:
            return  # 매핑되지 않은 테스트는 건너뜀

        if report.passed:
            status = "passed"
            note = "자동 테스트 통과"
        elif report.failed:
            status = "failed"
            note = str(report.longrepr)[:300] if report.longrepr else "테스트 실패"
        else:
            status = "blocked"
            note = "테스트 스킵/블록됨"

        _results.append({
            "test_case_id": test_case_id,
            "status": status,
            "note": note,
            "elapsed": _timings.get(item.name, 0),
            "author": "pytest"
        })

def pytest_sessionfinish(session, exitstatus):
    """모든 테스트 완료 후 Testably에 결과를 업로드합니다."""
    if not _results or not TESTABLY_TOKEN:
        return

    response = requests.post(
        TESTABLY_URL,
        headers={"Authorization": f"Bearer {TESTABLY_TOKEN}"},
        json={"run_id": RUN_ID, "results": _results}
    )
    print(f"\\n[Testably] 결과 업로드: {response.status_code} — {len(_results)}건")`;
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

  const formatPrice = (monthlyPrice: number, isAnnual: boolean) => {
    if (monthlyPrice === 0) return '₩0';
    if (monthlyPrice === -1) return '문의';
    const price = isAnnual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
    return `₩${price.toLocaleString()}`;
  };

  return (
    <>
      <SEOHead
        title="설정 | Testably"
        description="Testably 계정 설정 및 통합을 관리하세요. 구독 플랜, Jira 연동, 알림 설정을 구성할 수 있습니다."
        noindex={true}
      />
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
                    Testably
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
                    onClick={() => setActiveTab('cicd')}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'cicd'
                        ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
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
                      {/* Trial Banner */}
                      {userProfile?.is_trial && trialDaysLeft !== null && (
                        <div className={`mb-6 p-5 rounded-xl border-2 flex items-start gap-4 ${
                          trialDaysLeft <= 3
                            ? 'bg-red-50 border-red-200'
                            : trialDaysLeft <= 7
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-teal-50 border-teal-200'
                        }`}>
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          trialDaysLeft <= 3 ? 'bg-red-100' : trialDaysLeft <= 7 ? 'bg-amber-100' : 'bg-teal-100'
                        }`}>
                            <i className={`ri-time-line text-xl ${
                          trialDaysLeft <= 3 ? 'text-red-600' : trialDaysLeft <= 7 ? 'text-amber-600' : 'text-teal-600'
                        }`}></i>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-bold text-base ${
                          trialDaysLeft <= 3 ? 'text-red-800' : trialDaysLeft <= 7 ? 'text-amber-800' : 'text-teal-800'
                        }`}>
                                14일 무료 체험 진행 중
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          trialDaysLeft <= 3
                            ? 'bg-red-200 text-red-800'
                            : trialDaysLeft <= 7
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-teal-200 text-teal-800'
                        }`}>
                                {trialDaysLeft}일 남음
                              </span>
                            </div>
                            <p className={`text-sm mb-3 ${
                          trialDaysLeft <= 3 ? 'text-red-700' : trialDaysLeft <= 7 ? 'text-amber-700' : 'text-teal-700'
                        }`}>
                              {trialDaysLeft <= 3
                                ? `체험 기간이 ${trialDaysLeft}일 후 종료됩니다. 지금 업그레이드하여 서비스를 계속 이용하세요.`
                                : `Professional 플랜의 모든 기능을 무료로 체험하고 있습니다. 체험 종료 후 Free 플랜으로 자동 전환됩니다.`}
                            </p>
                            {userProfile.trial_ends_at && (
                              <p className={`text-xs ${
                          trialDaysLeft <= 3 ? 'text-red-500' : trialDaysLeft <= 7 ? 'text-amber-500' : 'text-teal-500'
                        }`}>
                                <i className="ri-calendar-line mr-1"></i>
                                체험 종료일: {new Date(userProfile.trial_ends_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <button className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap flex-shrink-0 transition-all ${
                          trialDaysLeft <= 3
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : trialDaysLeft <= 7
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}>
                            업그레이드 문의
                          </button>
                        </div>
                      )}

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
                                          <p className="leading-relaxed">테스트 결과에서 Jira 이슈 링크를 직접 첨부할 수 있습니다. Jira 이슈 자동 생성은 Starter 이상에서 지원됩니다.</p>
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
                                className={`p-5 rounded-xl border-2 transition-all flex flex-col ${
                                  isCurrentTier
                                    ? info.color
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    tierNum === 1 ? 'bg-gray-200' : tierNum === 2 ? 'bg-yellow-100' : tierNum === 3 ? 'bg-teal-100' : 'bg-amber-100'
                                  }`}>
                                    <i className={`${info.icon} text-xl ${
                                      tierNum === 1 ? 'text-gray-500' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-teal-500' : 'text-amber-500'
                                    }`}></i>
                                  </div>
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

                                <ul className="space-y-2 flex-1">
                                  {info.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                      <i className={`ri-check-line mt-0.5 ${
                                        tierNum === 1 ? 'text-gray-400' : tierNum === 2 ? 'text-yellow-500' : tierNum === 3 ? 'text-teal-500' : 'text-amber-500'
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
                                                <p className="leading-relaxed">테스트 결과에서 Jira 이슈 링크를 직접 첨부할 수 있습니다. Jira 이슈 자동 생성은 Starter 이상에서 지원됩니다.</p>
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
                                  <button className="w-full mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-semibold hover:bg-teal-600 transition-all cursor-pointer whitespace-nowrap">
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

                  {activeTab === 'cicd' && (
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h2 className="text-xl font-bold text-gray-900">CI/CD Integration</h2>
                          {!isProfessionalOrHigher && (
                            <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-300 rounded-full text-xs font-semibold flex items-center gap-1">
                              <i className="ri-vip-crown-line"></i>
                              Professional 이상 필요
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-6">GitHub Actions, GitLab CI 등 CI/CD 파이프라인에서 테스트 결과를 자동으로 업로드하세요</p>

                        {!isProfessionalOrHigher && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i className="ri-lock-line text-teal-600 text-xl"></i>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">CI/CD 통합은 Professional 이상 요금제에서 사용 가능합니다</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  자동화된 테스트 파이프라인에서 결과를 직접 업로드하고, 팀 협업을 강화하세요.
                                </p>
                                <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap">
                                  <i className="ri-arrow-up-circle-line mr-2"></i>
                                  업그레이드 문의
                                </button>
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
                                <p className="text-sm text-gray-600">CI/CD 파이프라인에서 사용할 API 토큰을 관리하세요</p>
                              </div>
                              <button
                                onClick={() => setShowNewTokenModal(true)}
                                disabled={!isProfessionalOrHigher}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
                              >
                                <i className="ri-add-line"></i>
                                새 토큰 생성
                              </button>
                            </div>

                            {loadingTokens ? (
                              <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                              </div>
                            ) : ciTokens.length === 0 ? (
                              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <i className="ri-key-2-line text-3xl text-gray-400"></i>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">생성된 토큰이 없습니다</h3>
                                <p className="text-sm text-gray-600 mb-4">CI/CD 통합을 시작하려면 API 토큰을 생성하세요</p>
                                <button
                                  onClick={() => setShowNewTokenModal(true)}
                                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-add-line mr-2"></i>
                                  첫 토큰 생성하기
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {ciTokens.map((token) => (
                                  <div key={token.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                          <i className="ri-key-2-line text-teal-600 text-lg"></i>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-gray-900">{token.name}</h4>
                                          <p className="text-xs text-gray-500">
                                            생성일: {new Date(token.created_at).toLocaleDateString('ko-KR')}
                                            {token.last_used_at && ` • 마지막 사용: ${new Date(token.last_used_at).toLocaleDateString('ko-KR')}`}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteToken(token.id)}
                                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        <i className="ri-delete-bin-line mr-1"></i>
                                        삭제
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
                                          <>
                                            <i className="ri-check-line text-green-600"></i>
                                          </>
                                        ) : (
                                          <>
                                            <i className="ri-file-copy-line text-gray-600"></i>
                                          </>
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
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">통합 가이드</h3>
                              
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
                                      ? 'bg-teal-600 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <i className="ri-code-s-slash-line mr-2"></i>
                                  Python
                                </button>
                              </div>

                              {/* 환경변수 설정 안내 */}
                              <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-3">
                                  <i className="ri-settings-4-line text-teal-600 text-lg"></i>
                                  <p className="text-sm font-bold text-teal-800">
                                    {selectedPlatform === 'github'
                                      ? 'GitHub Secrets'
                                      : selectedPlatform === 'gitlab'
                                      ? 'GitLab CI/CD Variables'
                                      : '환경변수'} 에 아래 값을 등록하세요
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-teal-200 px-3 py-2">
                                    <span className="text-xs font-bold font-mono text-teal-700 w-36 flex-shrink-0">TESTABLY_URL</span>
                                    <span className="text-xs text-gray-400 font-mono flex-1 truncate">
                                      {`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`}
                                    </span>
                                    <button
                                      onClick={() => handleCopyToken(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results`)}
                                      className="flex-shrink-0 px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      {copiedToken === `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/upload-ci-results` ? (
                                        <><i className="ri-check-line mr-1"></i>복사됨</>
                                      ) : (
                                        <><i className="ri-file-copy-line mr-1"></i>복사</>
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 bg-white rounded-lg border border-teal-200 px-3 py-2">
                                    <span className="text-xs font-bold font-mono text-teal-700 w-36 flex-shrink-0">TESTABLY_TOKEN</span>
                                    <span className="text-xs text-gray-400 font-mono flex-1 truncate">{ciTokens[0].token}</span>
                                    <button
                                      onClick={() => handleCopyToken(ciTokens[0].token)}
                                      className="flex-shrink-0 px-2 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                      {copiedToken === ciTokens[0].token ? (
                                        <><i className="ri-check-line mr-1"></i>복사됨</>
                                      ) : (
                                        <><i className="ri-file-copy-line mr-1"></i>복사</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-teal-700 mt-2">
                                  <i className="ri-information-line mr-1"></i>
                                  두 값 모두 환경변수로 등록하면 코드 수정 없이 안전하게 관리할 수 있습니다.
                                </p>
                              </div>

                              {/* Python 가이드 */}
                              {selectedPlatform === 'python' && (
                                <div className="space-y-6">
                                  {/* 방법 1: 함수 호출 방식 */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                      <h4 className="font-bold text-gray-900">함수 호출 방식 <span className="text-sm font-normal text-gray-500 ml-1">— 간단한 스크립트에 적합</span></h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 ml-8">
                                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">report_result()</code> 함수로 결과를 수집하고, 마지막에 한 번에 업로드합니다.
                                    </p>
                                    <div className="bg-gray-900 rounded-lg p-4 relative">
                                      <button
                                        onClick={() => handleCopyToken(getPythonFunctionSnippet())}
                                        className="absolute top-4 right-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        {copiedToken === getPythonFunctionSnippet() ? (
                                          <><i className="ri-check-line mr-1"></i>복사됨</>
                                        ) : (
                                          <><i className="ri-file-copy-line mr-1"></i>복사</>
                                        )}
                                      </button>
                                      <pre className="text-sm text-gray-100 overflow-x-auto font-mono whitespace-pre">
                                        <code>{getPythonFunctionSnippet()}</code>
                                      </pre>
                                    </div>
                                  </div>

                                  {/* 방법 2: conftest.py 방식 */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                      <h4 className="font-bold text-gray-900">conftest.py 방식 <span className="text-sm font-normal text-gray-500 ml-1">— pytest 프로젝트에 적합</span></h4>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 ml-8">
                                      pytest hook을 활용해 테스트 코드 수정 없이 자동으로 결과를 수집·업로드합니다.
                                    </p>
                                    <div className="bg-gray-900 rounded-lg p-4 relative">
                                      <button
                                        onClick={() => handleCopyToken(getPythonConftestSnippet())}
                                        className="absolute top-4 right-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap"
                                      >
                                        {copiedToken === getPythonConftestSnippet() ? (
                                          <><i className="ri-check-line mr-1"></i>복사됨</>
                                        ) : (
                                          <><i className="ri-file-copy-line mr-1"></i>복사</>
                                        )}
                                      </button>
                                      <pre className="text-sm text-gray-100 overflow-x-auto font-mono whitespace-pre">
                                        <code>{getPythonConftestSnippet()}</code>
                                      </pre>
                                    </div>
                                  </div>

                                  {/* 사용 방법 안내 */}
                                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                      <i className="ri-information-line text-gray-500 text-xl flex-shrink-0 mt-0.5"></i>
                                      <div className="text-sm text-gray-700">
                                        <p className="font-semibold mb-2">사용 방법:</p>
                                        <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
                                          <li><code className="bg-gray-200 px-1 rounded text-xs">TESTABLY_TOKEN</code> 환경변수에 위 토큰을 등록하세요</li>
                                          <li><strong>방법 1</strong>: <code className="bg-gray-200 px-1 rounded text-xs">report_result()</code>에 테스트케이스 ID와 결과를 전달하세요</li>
                                          <li><strong>방법 2</strong>: <code className="bg-gray-200 px-1 rounded text-xs">conftest.py</code>를 프로젝트 루트에 저장하고 <code className="bg-gray-200 px-1 rounded text-xs">TEST_CASE_MAP</code>에 함수명 → ID를 매핑하세요</li>
                                          <li><code className="bg-gray-200 px-1 rounded text-xs">run_id</code>는 Testably에서 생성한 Run의 ID로 교체하세요</li>
                                          <li>status 값: <code className="bg-gray-200 px-1 rounded text-xs">passed</code> / <code className="bg-gray-200 px-1 rounded text-xs">failed</code> / <code className="bg-gray-200 px-1 rounded text-xs">blocked</code> / <code className="bg-gray-200 px-1 rounded text-xs">retest</code></li>
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
                                        <><i className="ri-check-line mr-1"></i>복사됨</>
                                      ) : (
                                        <><i className="ri-file-copy-line mr-1"></i>복사</>
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
                                        <p className="font-semibold mb-2">사용 방법:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-gray-600">
                                          <li>위 환경변수 값을 {selectedPlatform === 'github' ? 'GitHub Secrets' : 'GitLab CI/CD Variables'}에 등록하세요</li>
                                          <li>YAML 코드를 복사하여 CI/CD 설정 파일에 추가하세요</li>
                                          <li><code className="bg-gray-200 px-1 rounded text-xs">test_case_id</code>에 테스트케이스 ID(예: SUI-1)를 입력하세요</li>
                                          <li>테스트 결과에 따라 status를 passed/failed/blocked로 설정하세요</li>
                                        </ol>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* API Token Scope Guide - 항상 표시 */}
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
                                <div className="w-8 h-8 flex items-center justify-center bg-teal-50 rounded-lg">
                                  <i className="ri-shield-keyhole-line text-teal-600 text-lg"></i>
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm">API Token Scope 설정 가이드</h4>
                              </div>

                              {selectedPlatform === 'github' ? (
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    GitHub에서 Personal Access Token(PAT) 또는 Fine-grained Token을 사용할 경우, 아래 권한만 부여하면 됩니다.
                                  </p>
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">필수 권한 (Minimum Required Scopes)</p>
                                    <div className="space-y-2">
                                      {[
                                        { scope: 'repo', desc: '저장소 읽기 권한 (private repo 사용 시 필요)', required: true },
                                        { scope: 'workflow', desc: 'GitHub Actions 워크플로우 실행 권한', required: true },
                                        { scope: 'read:org', desc: '조직 정보 읽기 (조직 저장소 사용 시)', required: false },
                                      ].map((item) => (
                                        <div key={item.scope} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold font-mono whitespace-nowrap ${item.required ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {item.scope}
                                          </span>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700">{item.desc}</p>
                                            {!item.required && (
                                              <p className="text-xs text-gray-400 mt-0.5">선택 사항</p>
                                            )}
                                          </div>
                                          {item.required && (
                                            <span className="text-xs font-semibold text-teal-600 whitespace-nowrap">필수</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                    <i className="ri-error-warning-line text-amber-500 flex-shrink-0 mt-0.5"></i>
                                    <p className="text-xs text-amber-800">
                                      <strong>권장:</strong> GitHub Actions 워크플로우 내에서는 자동으로 제공되는 <code className="bg-amber-100 px-1 rounded">GITHUB_TOKEN</code>을 사용하는 것이 가장 안전합니다. 별도 PAT 생성 없이 바로 사용 가능합니다.
                                    </p>
                                  </div>
                                  <a
                                    href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline"
                                  >
                                    <i className="ri-external-link-line"></i>
                                    GitHub Token 공식 문서 보기
                                  </a>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <p className="text-sm text-gray-600">
                                    GitLab에서 Personal Access Token 또는 Project Access Token을 생성할 때 아래 scope만 선택하면 됩니다.
                                  </p>
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">필수 권한 (Minimum Required Scopes)</p>
                                    <div className="space-y-2">
                                      {[
                                        { scope: 'api', desc: 'API 전체 접근 권한 (파이프라인 트리거 및 결과 업로드)', required: true },
                                        { scope: 'read_repository', desc: '저장소 읽기 권한', required: true },
                                        { scope: 'write_repository', desc: '저장소 쓰기 권한 (결과 커밋 시 필요)', required: false },
                                      ].map((item) => (
                                        <div key={item.scope} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold font-mono whitespace-nowrap ${item.required ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {item.scope}
                                          </span>
                                          <div className="flex-1">
                                            <p className="text-sm text-gray-700">{item.desc}</p>
                                            {!item.required && (
                                              <p className="text-xs text-gray-400 mt-0.5">선택 사항</p>
                                            )}
                                          </div>
                                          {item.required && (
                                            <span className="text-xs font-semibold text-orange-600 whitespace-nowrap">필수</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                    <i className="ri-error-warning-line text-amber-500 flex-shrink-0 mt-0.5"></i>
                                    <p className="text-xs text-amber-800">
                                      <strong>권장:</strong> GitLab CI 파이프라인 내에서는 자동으로 제공되는 <code className="bg-amber-100 px-1 rounded">CI_JOB_TOKEN</code>을 사용하는 것이 가장 안전합니다. 별도 토큰 생성 없이 바로 사용 가능합니다.
                                    </p>
                                  </div>
                                  <a
                                    href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline"
                                  >
                                    <i className="ri-external-link-line"></i>
                                    GitLab Token 공식 문서 보기
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

      {/* New Token Modal */}
      {showNewTokenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">새 API 토큰 생성</h3>
              <p className="text-sm text-gray-600 mt-1">CI/CD 파이프라인에서 사용할 토큰을 생성합니다</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                토큰 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="예: GitHub Actions Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                <i className="ri-information-line mr-1"></i>
                토큰은 생성 후 다시 확인할 수 없으니 안전한 곳에 보관하세요
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
                취소
              </button>
              <button
                onClick={handleCreateToken}
                disabled={creatingToken || !newTokenName.trim()}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingToken ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    생성 중...
                  </>
                ) : (
                  <>
                    <i className="ri-add-line mr-2"></i>
                    토큰 생성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
