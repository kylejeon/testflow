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

interface AdminRecentUsersTableProps {
  users: UserRow[];
  loading?: boolean;
}

const TIER_BADGE: Record<number, { label: string; style: string }> = {
  1: { label: 'Free', style: 'bg-slate-100 text-slate-600' },
  2: { label: 'Starter', style: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'Pro', style: 'bg-teal-100 text-teal-700' },
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatActivity = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
};

export default function AdminRecentUsersTable({ users, loading = false }: AdminRecentUsersTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">최근 가입 사용자</h3>
          <p className="text-sm text-gray-500 mt-0.5">최근 50명의 신규 사용자</p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <i className="ri-user-line text-4xl block mb-2"></i>
          <p className="text-sm">사용자가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">사용자</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">플랜</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">최근 활동</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => {
                const tier = user.subscription_tier || 1;
                const badge = TIER_BADGE[tier] || TIER_BADGE[1];
                const initials = user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase();

                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.full_name || '(이름 없음)'}
                            {user.is_superadmin && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-xs rounded font-bold">ADMIN</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        {user.is_trial ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-600 border border-teal-200">
                            Trial
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge.style}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-gray-500">{formatActivity(user.updated_at)}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
