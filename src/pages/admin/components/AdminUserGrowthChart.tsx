import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyUserData {
  month: string;
  new_users: number;
  paid_users: number;
}

interface AdminUserGrowthChartProps {
  data: MonthlyUserData[];
  loading?: boolean;
}

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('ko-KR', { month: 'short', year: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-600">{entry.name === 'new_users' ? '신규 가입' : '유료 전환'}:</span>
            <span className="font-bold text-gray-900">{entry.value.toLocaleString()}명</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminUserGrowthChart({ data, loading = false }: AdminUserGrowthChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">월별 사용자 증가 추이</h3>
          <p className="text-sm text-gray-500 mt-0.5">최근 12개월 신규 가입 및 유료 전환</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-xs text-gray-500">신규 가입</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
            <span className="text-xs text-gray-500">유료 전환</span>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="h-64 bg-gray-50 rounded-lg animate-pulse"></div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <i className="ri-bar-chart-line text-4xl block mb-2"></i>
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={formattedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPaidUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="new_users"
              stroke="#6366F1"
              strokeWidth={2.5}
              fill="url(#colorNewUsers)"
              dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="paid_users"
              stroke="#fbbf24"
              strokeWidth={2.5}
              fill="url(#colorPaidUsers)"
              dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
