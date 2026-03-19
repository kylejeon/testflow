interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'teal' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
  badge?: string;
  badgeType?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

const colorMap = {
  teal: {
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    border: 'border-l-teal-500',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    border: 'border-l-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    border: 'border-l-amber-500',
  },
  rose: {
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    border: 'border-l-rose-500',
  },
  slate: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    border: 'border-l-slate-500',
  },
  violet: {
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    border: 'border-l-violet-500',
  },
};

export default function AdminMetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  badge,
  badgeType = 'neutral',
  loading = false,
}: AdminMetricCardProps) {
  const c = colorMap[color];

  const badgeStyle =
    badgeType === 'up'
      ? 'bg-emerald-50 text-emerald-700'
      : badgeType === 'down'
      ? 'bg-rose-50 text-rose-700'
      : 'bg-gray-100 text-gray-600';

  const badgeIcon =
    badgeType === 'up'
      ? 'ri-arrow-up-s-line'
      : badgeType === 'down'
      ? 'ri-arrow-down-s-line'
      : 'ri-subtract-line';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${c.border} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
          <i className={`${icon} text-xl ${c.iconColor}`}></i>
        </div>
        {badge && (
          <span className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
            <i className={`${badgeIcon} text-sm`}></i>
            {badge}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-24"></div>
          <div className="h-4 bg-gray-100 rounded animate-pulse w-32"></div>
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
          <p className="text-sm font-semibold text-gray-500 mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
