import { useState } from 'react';
import PassRateTrend from './widgets/PassRateTrend';
import MilestoneTracker from './widgets/MilestoneTracker';
import ExecutionSummary from './widgets/ExecutionSummary';
import TeamPerformance from './widgets/TeamPerformance';
import FlakyDetector from './widgets/FlakyDetector';
import CoverageHeatmap from './widgets/CoverageHeatmap';
import TCQualityAnalysis from './widgets/TCQualityAnalysis';
import AIInsightsPanel from './widgets/AIInsightsPanel';
import TierGate from './widgets/TierGate';

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

        {/* Row 3: Team Performance (full width, Pro+) */}
        <TierGate requiredTier={3} currentTier={subscriptionTier} featureName="팀원별 성과 분석">
          <TeamPerformance projectId={projectId} period={period} />
        </TierGate>

        {/* Row 4: Coverage Heatmap (50%) + TC Quality (50%) */}
        <div className="grid grid-cols-2 gap-5">
          <CoverageHeatmap projectId={projectId} />
          <TCQualityAnalysis projectId={projectId} />
        </div>

        {/* Row 5: Flaky TC Detector (50%) + AI Insights (50%), both Pro+ */}
        <div className="grid grid-cols-2 gap-5">
          <TierGate requiredTier={3} currentTier={subscriptionTier} featureName="Flaky TC 감지">
            <FlakyDetector projectId={projectId} subscriptionTier={subscriptionTier} />
          </TierGate>
          <TierGate requiredTier={3} currentTier={subscriptionTier} featureName="AI Insights">
            <AIInsightsPanel projectId={projectId} />
          </TierGate>
        </div>
      </div>
    </div>
  );
}
