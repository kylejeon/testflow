import { useState } from 'react';
import PassRateTrend from './widgets/PassRateTrend';
import MilestoneTracker from './widgets/MilestoneTracker';
import ExecutionSummary from './widgets/ExecutionSummary';

type PeriodFilter = '7d' | '14d' | '30d' | 'all';

interface AnalyticsTabProps {
  projectId: string;
  milestones: any[];
  subscriptionTier: number;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7d': '7d', '14d': '14d', '30d': '30d', 'all': '전체',
};

export default function AnalyticsTab({ projectId, milestones, subscriptionTier }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');

  const filteredMilestones = selectedMilestoneId
    ? milestones.filter(m => m.id === selectedMilestoneId)
    : milestones;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* 필터 바 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {milestones.length > 0 && (
            <select
              value={selectedMilestoneId}
              onChange={e => setSelectedMilestoneId(e.target.value)}
              className="px-3 py-1.5 text-[0.8125rem] text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 cursor-pointer"
            >
              <option value="">All Milestones</option>
              {milestones.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Row 1: Pass Rate Trend (full width) */}
        <PassRateTrend projectId={projectId} period={period} />

        {/* Row 2: Milestone (55%) + Execution Summary (45%) */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-7">
            <MilestoneTracker projectId={projectId} milestones={filteredMilestones} />
          </div>
          <div className="col-span-5">
            <ExecutionSummary projectId={projectId} />
          </div>
        </div>

        {/* Phase 2 위젯 예고 */}
        <div className="grid grid-cols-2 gap-5">
          <ComingSoonWidget
            icon="ri-team-line"
            title="Team Performance"
            description="팀원별 실행 현황 및 버그 발견율"
            tier={3}
            currentTier={subscriptionTier}
          />
          <ComingSoonWidget
            icon="ri-bug-line"
            title="Flaky TC Detector"
            description="불안정한 테스트 케이스 자동 감지"
            tier={2}
            currentTier={subscriptionTier}
          />
        </div>
      </div>
    </div>
  );
}

function ComingSoonWidget({
  icon, title, description, tier, currentTier,
}: {
  icon: string; title: string; description: string; tier: number; currentTier: number;
}) {
  const tierLabel = tier >= 3 ? 'Professional' : 'Starter';
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden opacity-60">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className={`${icon} text-gray-400`} />
          {title}
        </div>
        <span className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
          Phase 2
        </span>
      </div>
      <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
        <i className="ri-lock-line text-2xl text-gray-300" />
        <p className="text-[13px] text-gray-500">{description}</p>
        {currentTier < tier && (
          <span className="text-[11px] text-gray-400">{tierLabel}+ 플랜에서 사용 가능</span>
        )}
      </div>
    </div>
  );
}
