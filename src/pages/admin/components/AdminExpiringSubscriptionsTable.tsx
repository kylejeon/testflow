import { useMemo } from 'react';

interface ExpiringUser {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: number | null;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

interface AdminExpiringSubscriptionsTableProps {
  users: ExpiringUser[];
  loading: boolean;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Free', color: 'bg-gray-100 text-gray-600' },
  2: { label: 'Starter', color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  3: { label: 'Professional', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
};

function getDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function UrgencyBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
        Expired
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
        {days}d left
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
        {days}d left
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
      {days}d left
    </span>
  );
}

export default function AdminExpiringSubscriptionsTable({ users, loading }: AdminExpiringSubscriptionsTableProps) {
  const expiringUsers = useMemo(() => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return users
      .filter((u) => {
        const isTrial = u.is_trial;
        const tier = u.subscription_tier || 1;

        if (isTrial && u.trial_ends_at) {
          const end = new Date(u.trial_ends_at).getTime();
          return end - now <= thirtyDaysMs;
        }
        if (!isTrial && tier > 1 && u.subscription_ends_at) {
          const end = new Date(u.subscription_ends_at).getTime();
          return end - now <= thirtyDaysMs;
        }
        return false;
      })
      .map((u) => {
        const isTrial = u.is_trial;
        const endDate = isTrial ? u.trial_ends_at : u.subscription_ends_at;
        const daysLeft = getDaysLeft(endDate);
        return { ...u, endDate, daysLeft, isTrial };
      })
      .sort((a, b) => {
        const aD = a.daysLeft ?? 999;
        const bD = b.daysLeft ?? 999;
        return aD - bD;
      });
  }, [users]);

  const urgentCount = expiringUsers.filter((u) => (u.daysLeft ?? 999) <= 7).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <i className="ri-alarm-warning-line text-amber-600 text-xl"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Expiring Subscriptions</h3>
            <p className="text-xs text-gray-500">Users with trial or paid plans expiring within 30 days</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
              <i className="ri-error-warning-line"></i>
              {urgentCount} urgent
            </span>
          )}
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
            {loading ? '...' : `${expiringUsers.length} users`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      ) : expiringUsers.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
            <i className="ri-checkbox-circle-line text-green-500 text-3xl"></i>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">No subscriptions expiring soon</p>
            <p className="text-xs text-gray-400 mt-1">All active plans are valid for more than 30 days</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expiringUsers.map((user) => {
                const tier = user.subscription_tier || 1;
                const tierInfo = TIER_LABELS[tier] || TIER_LABELS[1];
                const isUrgent = (user.daysLeft ?? 999) <= 7;
                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50/60 transition-colors ${isUrgent ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          isUrgent ? 'bg-red-400' : 'bg-gradient-to-br from-amber-400 to-orange-500'
                        }`}>
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{user.full_name || '—'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.isTrial ? (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                          <i className="ri-time-line mr-1"></i>Trial
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                          <i className="ri-vip-crown-line mr-1"></i>Paid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tierInfo.color}`}>
                        {tierInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700 font-medium">
                        {user.endDate
                          ? new Date(user.endDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {user.daysLeft !== null && <UrgencyBadge days={user.daysLeft} />}
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
