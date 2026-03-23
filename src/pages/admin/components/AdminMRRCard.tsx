import { useMemo } from 'react';

interface SubscriptionData {
  tier: number;
  tier_name: string;
  user_count: number;
}

interface AdminMRRCardProps {
  data: SubscriptionData[];
  loading?: boolean;
}

const TIER_PRICES: Record<number, number> = {
  1: 0,
  2: 20,
  3: 50,
};

const TIER_COLORS: Record<number, string> = {
  1: '#94a3b8',
  2: '#fbbf24',
  3: '#6366F1',
  4: '#f59e0b',
};

const TIER_BG: Record<number, string> = {
  1: 'bg-slate-100 text-slate-600 border-slate-200',
  2: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  3: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  4: 'bg-amber-50 text-amber-700 border-amber-200',
};

const TIER_ICON: Record<number, string> = {
  1: 'ri-user-line',
  2: 'ri-rocket-line',
  3: 'ri-award-line',
  4: 'ri-vip-crown-2-line',
};

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toLocaleString()}`;
}

export default function AdminMRRCard({ data, loading = false }: AdminMRRCardProps) {
  const allTiers = useMemo(() => {
    return [
      { tier: 1, tier_name: 'Free', user_count: 0 },
      { tier: 2, tier_name: 'Starter', user_count: 0 },
      { tier: 3, tier_name: 'Professional', user_count: 0 },
    ].map((t) => {
      const found = data.find((d) => d.tier === t.tier);
      const user_count = found ? found.user_count : 0;
      const price = TIER_PRICES[t.tier];
      const mrr = user_count * price;
      return { ...t, user_count, price, mrr };
    });
  }, [data]);

  const totalMRR = useMemo(
    () => allTiers.reduce((sum, t) => sum + t.mrr, 0),
    [allTiers]
  );

  const paidMRR = useMemo(
    () => allTiers.filter((t) => t.tier > 1).reduce((sum, t) => sum + t.mrr, 0),
    [allTiers]
  );

  const annualizedMRR = totalMRR * 12;

  const maxMrr = Math.max(...allTiers.map((t) => t.mrr), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">MRR 예상치</h3>
          <p className="text-sm text-gray-500 mt-0.5">구독 플랜 기준 월 반복 매출</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-full border border-indigo-100">
          <i className="ri-information-line text-indigo-500 text-xs"></i>
          <span className="text-xs font-semibold text-indigo-600">예상 추정치</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-gray-50 rounded-xl animate-pulse"></div>
          <div className="h-48 bg-gray-50 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Total MRR Banner */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-5 mb-5 relative overflow-hidden">
            <div className="absolute right-4 top-3 opacity-10">
              <i className="ri-line-chart-fill text-7xl text-white"></i>
            </div>
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Total MRR</p>
            <p className="text-4xl font-bold text-white tabular-nums">
              ${totalMRR.toLocaleString()}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-indigo-100">
                연간 예상 ARR: <span className="font-bold text-white">{formatCurrency(annualizedMRR)}</span>
              </p>
              {totalMRR > 0 && (
                <p className="text-sm text-indigo-100">
                  유료 기여: <span className="font-bold text-white">${paidMRR.toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>

          {/* Per-Tier Breakdown */}
          <div className="space-y-3">
            {allTiers.filter((t) => t.tier > 1).map((tier) => {
              const barWidth = maxMrr > 0 ? Math.max((tier.mrr / maxMrr) * 100, tier.mrr > 0 ? 8 : 0) : 0;
              return (
                <div key={tier.tier} className={`rounded-xl border p-4 ${TIER_BG[tier.tier]}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 flex items-center justify-center">
                        <i className={`${TIER_ICON[tier.tier]} text-lg`}></i>
                      </div>
                      <div>
                        <span className="text-sm font-bold">{tier.tier_name}</span>
                        <span className="text-xs ml-1.5 opacity-70">
                          ${tier.price}/월
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold">${tier.mrr.toLocaleString()}</p>
                      <p className="text-xs opacity-60">{tier.user_count}명 × ${tier.price}</p>
                    </div>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: TIER_COLORS[tier.tier],
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {/* Free tier info */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center text-slate-500">
                  <i className="ri-user-line text-lg"></i>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-600">Free</span>
                  <span className="text-xs ml-1.5 text-slate-400">$0/월</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-500">$0</p>
                <p className="text-xs text-slate-400">
                  {allTiers.find((t) => t.tier === 1)?.user_count ?? 0}명
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Note */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            * Starter $20 · Professional $50 기준 산출
          </p>
        </>
      )}
    </div>
  );
}
