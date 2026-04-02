/**
 * ProjectStatsPanel
 * 프로젝트 Overview 탭의 핵심 지표 요약 패널
 * useProjectStats 훅으로 데이터를 조회합니다.
 */
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useProjectStats, type StatsPeriod } from '../../../hooks/useProjectStats';
import { useState } from 'react';

interface ProjectStatsPanelProps {
  projectId: string;
}

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: '7d',  label: '7일' },
  { value: '14d', label: '14일' },
  { value: '30d', label: '30일' },
  { value: 'all', label: '전체' },
];

function DeltaBadge({ delta, unit = 'pp' }: { delta: number; unit?: string }) {
  if (delta === 0) return <span className="text-[11px] text-gray-400">변화 없음</span>;
  const positive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-[2px] text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
      positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
    }`}>
      <i className={`ri-arrow-${positive ? 'up' : 'down'}-s-line text-xs`}></i>
      {Math.abs(delta)}{unit}
    </span>
  );
}

function KPICard({
  label, value, sub, delta, icon, iconBg, iconColor,
}: {
  label: string; value: string; sub?: string;
  delta?: number; icon: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <i className={`${icon} text-base ${iconColor}`}></i>
        </div>
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

const PRIORITY_META: Record<string, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: '#EF4444', dot: 'bg-red-500' },
  high:     { label: 'High',     color: '#F97316', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: '#6366F1', dot: 'bg-indigo-500' },
  low:      { label: 'Low',      color: '#94A3B8', dot: 'bg-slate-400' },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  upcoming:   { label: '예정', color: '#94A3B8' },
  started:    { label: '진행 중', color: '#6366F1' },
  active:     { label: '활성', color: '#6366F1' },
  past_due:   { label: '지연', color: '#EF4444' },
  completed:  { label: '완료', color: '#22C55E' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function ProjectStatsPanel({ projectId }: ProjectStatsPanelProps) {
  const [period, setPeriod] = useState<StatsPeriod>('30d');
  const { data, loading } = useProjectStats(projectId, period);

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  const totalStack = data.passed + data.failed + data.blocked + (data.untested < 0 ? 0 : data.untested);

  return (
    <div className="space-y-4">
      {/* 기간 필터 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <i className="ri-bar-chart-2-line text-indigo-500"></i>
          핵심 지표
        </h3>
        <div className="flex items-center gap-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                period === opt.value
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard
          label="Pass Rate"
          value={`${data.passRate}%`}
          delta={period !== 'all' ? data.passRateDelta : undefined}
          icon="ri-checkbox-circle-line"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KPICard
          label="커버리지"
          value={`${data.coverageRate}%`}
          sub={`${data.totalExecuted}/${data.totalCases}개 실행됨`}
          icon="ri-shield-check-line"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <KPICard
          label="실패"
          value={String(data.failed)}
          sub={data.blocked > 0 ? `차단 ${data.blocked}개 포함` : undefined}
          delta={period !== 'all' ? -(data.failed - Math.max(0, data.failed - data.executedDelta)) : undefined}
          icon="ri-close-circle-line"
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <KPICard
          label="진행 중 런"
          value={String(data.activeRuns)}
          sub={`완료 ${data.completedRuns}개`}
          icon="ri-play-circle-line"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </div>

      {/* 상태 분포 막대 */}
      {totalStack > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">실행 결과 분포</p>
          <div className="h-3 rounded-full flex overflow-hidden mb-3">
            {data.passed  > 0 && <div style={{ width: `${(data.passed  / totalStack) * 100}%`, backgroundColor: '#22C55E' }} />}
            {data.failed  > 0 && <div style={{ width: `${(data.failed  / totalStack) * 100}%`, backgroundColor: '#EF4444' }} />}
            {data.blocked > 0 && <div style={{ width: `${(data.blocked / totalStack) * 100}%`, backgroundColor: '#F59E0B' }} />}
            {data.untested > 0 && <div style={{ width: `${(Math.max(0, data.untested) / totalStack) * 100}%`, backgroundColor: '#E2E8F0' }} />}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: 'Passed',   val: data.passed,   color: '#22C55E' },
              { label: 'Failed',   val: data.failed,   color: '#EF4444' },
              { label: 'Blocked',  val: data.blocked,  color: '#F59E0B' },
              { label: 'Untested', val: Math.max(0, data.untested), color: '#E2E8F0' },
            ].map(({ label, val, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                {label} <strong className="text-gray-700">{val}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pass Rate 추이 차트 */}
      {data.dailyTrend.length > 0 && data.dailyTrend.some(d => d.passed + d.failed + d.blocked > 0) && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Pass Rate 추이</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data.dailyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                formatter={(val: number) => [`${val}%`, 'Pass Rate']}
                labelFormatter={formatDate}
              />
              <Area type="monotone" dataKey="passRate" stroke="#22C55E" strokeWidth={2} fill="url(#passGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 우선순위별 커버리지 */}
      {data.priorityDist.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">우선순위별 Pass Rate</p>
          <div className="space-y-3">
            {data.priorityDist.map(pd => {
              const meta = PRIORITY_META[pd.priority] || { label: pd.priority, color: '#94A3B8', dot: 'bg-gray-400' };
              return (
                <div key={pd.priority}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                      {meta.label}
                      <span className="text-gray-400">({pd.count}개)</span>
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{pd.passRate}%</span>
                  </div>
                  <ProgressBar value={pd.passRate} color={meta.color} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 마일스톤 현황 */}
      {data.milestoneStats.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">마일스톤 현황</p>
          <div className="space-y-3">
            {data.milestoneStats.map(ms => {
              const statusMeta = STATUS_META[ms.status] || { label: ms.status, color: '#94A3B8' };
              const executed = ms.passed + ms.failed + ms.blocked;
              return (
                <div key={ms.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800 truncate mr-2">{ms.name}</span>
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${statusMeta.color}18`, color: statusMeta.color }}>
                      {statusMeta.label}
                    </span>
                  </div>
                  {ms.total > 0 ? (
                    <>
                      <div className="h-1.5 bg-gray-100 rounded-full flex overflow-hidden mb-2">
                        <div style={{ width: `${(ms.passed / ms.total) * 100}%`, backgroundColor: '#22C55E' }} />
                        <div style={{ width: `${(ms.failed / ms.total) * 100}%`, backgroundColor: '#EF4444' }} />
                        <div style={{ width: `${(ms.blocked / ms.total) * 100}%`, backgroundColor: '#F59E0B' }} />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span><strong className="text-emerald-600">{ms.passed}</strong> 통과</span>
                        <span><strong className="text-red-500">{ms.failed}</strong> 실패</span>
                        {ms.blocked > 0 && <span><strong className="text-amber-500">{ms.blocked}</strong> 차단</span>}
                        <span className="ml-auto font-semibold text-gray-700">{ms.passRate}%</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-400">실행 데이터 없음</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
