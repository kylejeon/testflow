import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminMetricCard from './components/AdminMetricCard';
import AdminUserGrowthChart from './components/AdminUserGrowthChart';
import AdminSubscriptionChart from './components/AdminSubscriptionChart';
import AdminProjectsChart from './components/AdminProjectsChart';
import AdminRecentUsersTable from './components/AdminRecentUsersTable';

interface OverviewStats {
  total_users: number;
  new_users_this_month: number;
  paid_users: number;
  trial_users: number;
  total_projects: number;
  new_projects_this_month: number;
  total_test_runs: number;
  new_test_runs_this_month: number;
  active_users_30d: number;
}

interface MonthlyUserRow {
  month: string;
  new_users: number;
  paid_users: number;
}

interface MonthlyProjectRow {
  month: string;
  new_projects: number;
}

interface SubscriptionRow {
  tier: number;
  tier_name: string;
  user_count: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: number | null;
  is_trial: boolean | null;
  is_superadmin: boolean | null;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [monthlyUsers, setMonthlyUsers] = useState<MonthlyUserRow[]>([]);
  const [monthlyProjects, setMonthlyProjects] = useState<MonthlyProjectRow[]>([]);
  const [subscriptionDist, setSubscriptionDist] = useState<SubscriptionRow[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate('/auth'); return; }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_superadmin, full_name, email')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.is_superadmin) {
          navigate('/projects');
          return;
        }
        setCurrentUser({ email: profile.email || user.email || '', name: profile.full_name || '' });
      } catch {
        navigate('/projects');
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoadingStats(true);
      setLoadingCharts(true);

      const [
        { data: overviewData },
        { data: monthlyUserData },
        { data: monthlyProjectData },
        { data: subscriptionRaw },
        { data: usersData },
      ] = await Promise.all([
        supabase.rpc('admin_overview_stats'),
        supabase.rpc('admin_monthly_user_stats', { months_back: 12 }),
        supabase.rpc('admin_monthly_project_stats', { months_back: 12 }),
        supabase
          .from('profiles')
          .select('subscription_tier'),
        supabase
          .from('profiles')
          .select('id, email, full_name, subscription_tier, is_trial, is_superadmin, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (overviewData && overviewData.length > 0) {
        const raw = overviewData[0];
        setStats({
          total_users: Number(raw.total_users),
          new_users_this_month: Number(raw.new_users_this_month),
          paid_users: Number(raw.paid_users),
          trial_users: Number(raw.trial_users),
          total_projects: Number(raw.total_projects),
          new_projects_this_month: Number(raw.new_projects_this_month),
          total_test_runs: Number(raw.total_test_runs),
          new_test_runs_this_month: Number(raw.new_test_runs_this_month),
          active_users_30d: Number(raw.active_users_30d),
        });
      }
      setLoadingStats(false);

      setMonthlyUsers((monthlyUserData || []).map((r: any) => ({
        month: r.month,
        new_users: Number(r.new_users),
        paid_users: Number(r.paid_users),
      })));

      setMonthlyProjects((monthlyProjectData || []).map((r: any) => ({
        month: r.month,
        new_projects: Number(r.new_projects),
      })));

      // profiles 직접 집계로 구독 분포 계산
      const tierCountMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
      const tierNameMap: Record<number, string> = {
        1: 'Free',
        2: 'Starter',
        3: 'Professional',
        4: 'Enterprise',
      };
      (subscriptionRaw || []).forEach((row: any) => {
        const tier = Number(row.subscription_tier) || 1;
        if (tier >= 1 && tier <= 4) {
          tierCountMap[tier] = (tierCountMap[tier] || 0) + 1;
        }
      });
      const computedDist: SubscriptionRow[] = [1, 2, 3, 4].map((tier) => ({
        tier,
        tier_name: tierNameMap[tier],
        user_count: tierCountMap[tier],
      }));
      setSubscriptionDist(computedDist);

      setRecentUsers(usersData || []);
      setLoadingCharts(false);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Admin data fetch error:', err);
      setLoadingStats(false);
      setLoadingCharts(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecking && currentUser) {
      fetchAllData();
    }
  }, [authChecking, currentUser, fetchAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center animate-pulse">
            <i className="ri-shield-star-line text-xl text-white"></i>
          </div>
          <p className="text-sm text-gray-500">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  const conversionRate =
    stats && stats.total_users > 0
      ? ((stats.paid_users / stats.total_users) * 100).toFixed(1)
      : '0';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/projects" className="flex items-center gap-3 cursor-pointer">
              <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center">
                <i className="ri-test-tube-line text-lg text-white"></i>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: '"Pacifico", serif' }}>Testably</span>
            </Link>
            <span className="h-5 w-px bg-slate-700"></span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-shield-star-fill text-teal-400 text-lg"></i>
              </div>
              <span className="text-sm font-bold text-teal-400 tracking-wide">SUPER ADMIN</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <i className="ri-time-line text-sm"></i>
              <span className="text-xs">
                마지막 갱신: {lastRefreshed.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-300 transition-all cursor-pointer whitespace-nowrap border border-slate-700"
            >
              <i className={`ri-refresh-line text-sm ${refreshing ? 'animate-spin' : ''}`}></i>
              새로고침
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-white">{currentUser?.name || 'Admin'}</p>
                <p className="text-xs text-slate-400">{currentUser?.email}</p>
              </div>
            </div>
            <Link
              to="/projects"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-line text-sm"></i>
              앱으로
            </Link>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 max-w-[1440px] mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">비즈니스 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">
            Testably 전체 현황 모니터링 —&nbsp;
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6 xl:grid-cols-6">
          <AdminMetricCard
            title="전체 사용자"
            value={stats ? stats.total_users.toLocaleString() : '-'}
            subtitle="누적 가입자"
            icon="ri-group-line"
            color="teal"
            loading={loadingStats}
          />
          <AdminMetricCard
            title="이번 달 신규"
            value={stats ? stats.new_users_this_month.toLocaleString() : '-'}
            subtitle="이번 달 가입"
            icon="ri-user-add-line"
            color="emerald"
            loading={loadingStats}
          />
          <AdminMetricCard
            title="활성 사용자 (30d)"
            value={stats ? stats.active_users_30d.toLocaleString() : '-'}
            subtitle="최근 30일 기준"
            icon="ri-pulse-line"
            color="violet"
            loading={loadingStats}
          />
          <AdminMetricCard
            title="유료 구독자"
            value={stats ? stats.paid_users.toLocaleString() : '-'}
            subtitle={`전환율 ${conversionRate}%`}
            icon="ri-vip-crown-line"
            color="amber"
            loading={loadingStats}
          />
          <AdminMetricCard
            title="전체 프로젝트"
            value={stats ? stats.total_projects.toLocaleString() : '-'}
            subtitle={`이번 달 +${stats?.new_projects_this_month ?? '-'}개`}
            icon="ri-folder-line"
            color="slate"
            loading={loadingStats}
          />
          <AdminMetricCard
            title="테스트 런 (전체)"
            value={stats ? stats.total_test_runs.toLocaleString() : '-'}
            subtitle={`이번 달 +${stats?.new_test_runs_this_month ?? '-'}건`}
            icon="ri-play-circle-line"
            color="rose"
            loading={loadingStats}
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-vip-crown-2-line text-teal-600 text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold">무료 체험 중</p>
              <p className="text-xl font-bold text-gray-900">{loadingStats ? '-' : stats?.trial_users.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Trial 활성 사용자</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-exchange-dollar-line text-emerald-600 text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold">유료 전환율</p>
              <p className="text-xl font-bold text-gray-900">{loadingStats ? '-' : `${conversionRate}%`}</p>
              <p className="text-xs text-gray-400">전체 대비 유료</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-folder-add-line text-amber-600 text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold">이번 달 프로젝트</p>
              <p className="text-xl font-bold text-gray-900">{loadingStats ? '-' : stats?.new_projects_this_month.toLocaleString()}</p>
              <p className="text-xs text-gray-400">신규 생성</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-test-tube-line text-rose-500 text-xl"></i>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold">이번 달 테스트 런</p>
              <p className="text-xl font-bold text-gray-900">{loadingStats ? '-' : stats?.new_test_runs_this_month.toLocaleString()}</p>
              <p className="text-xs text-gray-400">신규 실행</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="mb-6">
          <AdminUserGrowthChart data={monthlyUsers} loading={loadingCharts} />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <AdminSubscriptionChart
            data={subscriptionDist}
            totalUsers={stats?.total_users || 0}
            loading={loadingCharts}
          />
          <AdminProjectsChart data={monthlyProjects} loading={loadingCharts} />
        </div>

        {/* Recent Users */}
        <AdminRecentUsersTable users={recentUsers} loading={loadingCharts} />

        <div className="mt-8 text-center text-xs text-gray-300">
          Testably SuperAdmin Dashboard — 이 페이지는 관리자만 접근 가능합니다
        </div>
      </main>
    </div>
  );
}
