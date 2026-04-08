import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface SubscriptionData {
  tier: number;
  tier_name: string;
  user_count: number;
}

interface AdminSubscriptionChartProps {
  data: SubscriptionData[];
  totalUsers: number;
  loading?: boolean;
}

const TIER_COLORS: Record<number, string> = {
  1: '#94a3b8',
  2: '#10b981',
  3: '#fbbf24',
  4: '#6366F1',
  5: '#f59e0b',
  6: '#f97316',
  7: '#f43f5e',
};

const TIER_BG: Record<number, string> = {
  1: 'bg-slate-100 text-slate-600',
  2: 'bg-emerald-100 text-emerald-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-indigo-100 text-indigo-700',
  5: 'bg-amber-100 text-amber-700',
  6: 'bg-orange-100 text-orange-700',
  7: 'bg-rose-100 text-rose-700',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-bold text-gray-900">{d.tier_name}</p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-900">{d.user_count.toLocaleString()}</span>명
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminSubscriptionChart({
  data,
  totalUsers,
  loading = false,
}: AdminSubscriptionChartProps) {
  const allTiers = [
    { tier: 1, tier_name: 'Free',         user_count: 0 },
    { tier: 2, tier_name: 'Hobby',        user_count: 0 },
    { tier: 3, tier_name: 'Starter',      user_count: 0 },
    { tier: 4, tier_name: 'Professional', user_count: 0 },
    { tier: 5, tier_name: 'Ent. S',       user_count: 0 },
    { tier: 6, tier_name: 'Ent. M',       user_count: 0 },
    { tier: 7, tier_name: 'Ent. L',       user_count: 0 },
  ].map((t) => {
    const found = data.find((d) => d.tier === t.tier);
    return found ? { ...t, user_count: found.user_count } : t;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">구독 플랜 분포</h3>
        <p className="text-sm text-gray-500 mt-0.5">플랜별 사용자 현황</p>
      </div>
      {loading ? (
        <div className="h-48 animate-pulse-bright rounded-lg mb-4"></div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={allTiers} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="tier_name"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="user_count" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {allTiers.map((entry) => (
                <Cell key={entry.tier} fill={TIER_COLORS[entry.tier]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="flex flex-col gap-1.5 mt-4">
        {allTiers.map((tier) => {
          const pct = totalUsers > 0 ? Math.round((tier.user_count / totalUsers) * 100) : 0;
          const barWidth = totalUsers > 0 ? Math.max((tier.user_count / totalUsers) * 100, tier.user_count > 0 ? 2 : 0) : 0;
          return (
            <div key={tier.tier} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TIER_COLORS[tier.tier] }}></div>
              <span className="text-xs font-semibold text-gray-600 w-24 flex-shrink-0">{tier.tier_name}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: TIER_COLORS[tier.tier] }}></div>
              </div>
              <span className="text-sm font-bold text-gray-900 w-6 text-right flex-shrink-0">{tier.user_count}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 w-10 text-center ${TIER_BG[tier.tier]}`}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
