import { useState } from 'react';
import AdminEditUserModal from './AdminEditUserModal';

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: number | null;
  is_trial: boolean | null;
  is_superadmin: boolean | null;
  created_at: string;
  updated_at: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  last_sign_in_at: string | null;
}

interface AdminRecentUsersTableProps {
  users: UserRow[];
  loading?: boolean;
  onUserUpdated?: () => void;
}

const TIER_BADGE: Record<number, { label: string; style: string }> = {
  1: { label: 'Free',         style: 'bg-slate-100 text-slate-600' },
  2: { label: 'Hobby',        style: 'bg-emerald-100 text-emerald-700' },
  3: { label: 'Starter',      style: 'bg-yellow-100 text-yellow-700' },
  4: { label: 'Professional', style: 'bg-indigo-100 text-indigo-700' },
  5: { label: 'Enterprise S', style: 'bg-amber-100 text-amber-700' },
  6: { label: 'Enterprise M', style: 'bg-orange-100 text-orange-700' },
  7: { label: 'Enterprise L', style: 'bg-rose-100 text-rose-700' },
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatExpiryDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', year: '2-digit' });
  return { label, daysLeft: diff };
};

const formatActivity = (dateStr: string | null) => {
  if (!dateStr) return '없음';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
};

export default function AdminRecentUsersTable({
  users,
  loading = false,
  onUserUpdated,
}: AdminRecentUsersTableProps) {
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">최근 가입 사용자</h3>
            <p className="text-sm text-gray-500 mt-0.5">최근 50명의 신규 사용자 — 플랜 및 만료일 직접 변경 가능</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
            <i className="ri-edit-2-line text-indigo-600 text-sm"></i>
            <span className="text-xs font-semibold text-indigo-700">행 우측 편집 버튼으로 수정</span>
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse-bright rounded-lg"></div>
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
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">구독 만료일</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">최근 활동</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">가입일</th>
                  <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">편집</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const tier = user.subscription_tier || 1;
                  const badge = TIER_BADGE[tier] || TIER_BADGE[1];
                  const initials = user.full_name
                    ? user.full_name.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase();

                  const expiryInfo = user.subscription_ends_at
                    ? formatExpiryDate(user.subscription_ends_at)
                    : user.is_trial && user.trial_ends_at
                    ? formatExpiryDate(user.trial_ends_at)
                    : null;

                  const isExpiringSoon = expiryInfo && expiryInfo.daysLeft !== undefined && expiryInfo.daysLeft <= 7;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">
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
                        {expiryInfo ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium ${
                              isExpiringSoon ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {expiryInfo.label}
                            </span>
                            {isExpiringSoon && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">
                                {expiryInfo.daysLeft <= 0 ? '만료' : `D-${expiryInfo.daysLeft}`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-sm ${user.last_sign_in_at ? 'text-gray-500' : 'text-gray-300'}`}>
                          {formatActivity(user.last_sign_in_at)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-500">{formatDate(user.created_at)}</span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-edit-2-line text-xs"></i>
                          편집
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <AdminEditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            onUserUpdated?.();
          }}
        />
      )}
    </>
  );
}
