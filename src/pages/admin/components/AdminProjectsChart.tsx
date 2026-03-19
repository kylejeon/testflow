import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyProjectData {
  month: string;
  new_projects: number;
}

interface AdminProjectsChartProps {
  data: MonthlyProjectData[];
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
        <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-gray-700">
          신규 프로젝트: <span className="font-bold text-gray-900">{payload[0].value}개</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminProjectsChart({ data, loading = false }: AdminProjectsChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">월별 프로젝트 생성</h3>
        <p className="text-sm text-gray-500 mt-0.5">최근 12개월 신규 프로젝트 수</p>
      </div>
      {loading ? (
        <div className="h-48 bg-gray-50 rounded-lg animate-pulse"></div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <i className="ri-folder-chart-line text-4xl block mb-2"></i>
            <p className="text-sm">데이터가 없습니다</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={formattedData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar
              dataKey="new_projects"
              fill="#5eead4"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
