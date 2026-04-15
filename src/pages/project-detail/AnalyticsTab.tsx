import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PassRateTrend from './widgets/PassRateTrend';
import MilestoneTracker from './widgets/MilestoneTracker';
import ExecutionSummary from './widgets/ExecutionSummary';
import TeamPerformance from './widgets/TeamPerformance';
import FlakyDetector from './widgets/FlakyDetector';
import CoverageHeatmap from './widgets/CoverageHeatmap';
import TCQualityAnalysis from './widgets/TCQualityAnalysis';
import AIInsightsPanel from './widgets/AIInsightsPanel';
import TierGate from './widgets/TierGate';
import TagAnalytics from './widgets/TagAnalytics';
import CoverageGapModal from './components/CoverageGapModal';
import AIGenerateModal from '../project-testcases/components/AIGenerateModal';
import { supabase } from '@/lib/supabase';

type PeriodFilter = '7d' | '14d' | '30d' | 'all';

interface AnalyticsTabProps {
  projectId: string;
  milestones: any[];
  subscriptionTier: number;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7d': '7d', '14d': '14d', '30d': '30d', 'all': 'All',
};

export default function AnalyticsTab({ projectId, milestones, subscriptionTier }: AnalyticsTabProps) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [showCoverageGapModal, setShowCoverageGapModal] = useState(false);
  const [gapTitles, setGapTitles] = useState<string[]>([]);
  const [showAIGenFromGap, setShowAIGenFromGap] = useState(false);

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
        <TierGate requiredTier={3} currentTier={subscriptionTier} featureName="Team Performance Analysis">
          <TeamPerformance projectId={projectId} period={period} />
        </TierGate>

        {/* Row 4: Coverage Heatmap (50%) + TC Quality (50%) */}
        <div className="grid grid-cols-2 gap-5">
          <CoverageHeatmap
            projectId={projectId}
            subscriptionTier={subscriptionTier}
            onFindGaps={() => setShowCoverageGapModal(true)}
          />
          <TCQualityAnalysis projectId={projectId} />
        </div>

        {/* Row 5: Tag Analytics (full width) */}
        <TagAnalytics projectId={projectId} />

        {/* Row 6: Flaky TC Detector (50%, Starter+) + AI Insights (50%, Free+) */}
        <div className="grid grid-cols-2 gap-5">
          <TierGate requiredTier={3} currentTier={subscriptionTier} featureName="Flaky TC Detection">
            <FlakyDetector projectId={projectId} subscriptionTier={subscriptionTier} />
          </TierGate>
          <AIInsightsPanel projectId={projectId} milestones={milestones} />
        </div>
      </div>

      {showCoverageGapModal && (
        <CoverageGapModal
          projectId={projectId}
          onClose={() => setShowCoverageGapModal(false)}
          onGenerateTCs={(titles) => {
            setGapTitles(titles);
            setShowCoverageGapModal(false);
            setShowAIGenFromGap(true);
          }}
        />
      )}

      {showAIGenFromGap && (
        <AIGenerateModal
          projectId={projectId}
          subscriptionTier={subscriptionTier}
          initialTitles={gapTitles}
          onClose={() => { setShowAIGenFromGap(false); setGapTitles([]); }}
          onSave={async (cases: any[]) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();

              // Get project prefix for custom_id generation
              const { data: projectData } = await supabase
                .from('projects')
                .select('prefix')
                .eq('id', projectId)
                .maybeSingle();

              const prefix = projectData?.prefix;

              // Get max existing custom_id number for this project
              let maxNum = 0;
              if (prefix) {
                const { data: existingCases } = await supabase
                  .from('test_cases')
                  .select('custom_id')
                  .eq('project_id', projectId)
                  .not('custom_id', 'is', null);

                if (existingCases && existingCases.length > 0) {
                  existingCases.forEach((tc: any) => {
                    if (tc.custom_id) {
                      const match = tc.custom_id.match(/-(\d+)$/);
                      if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                      }
                    }
                  });
                }
              }

              // Insert each generated TC
              for (const tc of cases) {
                maxNum += 1;
                const custom_id = prefix ? `${prefix}-${maxNum}` : undefined;

                let stepsStr = '';
                let expectedResultStr = tc.expected_result || '';

                if (Array.isArray(tc.steps)) {
                  if (tc.steps.length > 0 && typeof tc.steps[0] === 'object' && tc.steps[0].action) {
                    stepsStr = tc.steps.map((s: any, i: number) => `${i + 1}. ${s.action}`).join('\n');
                    expectedResultStr = tc.steps.map((s: any, i: number) => `${i + 1}. ${s.expected || ''}`).join('\n');
                  } else {
                    stepsStr = tc.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
                  }
                } else {
                  stepsStr = tc.steps || '';
                }

                const { data, error } = await supabase
                  .from('test_cases')
                  .insert([{
                    project_id: projectId,
                    title: tc.title,
                    description: tc.description || '',
                    precondition: tc.precondition || '',
                    steps: stepsStr,
                    expected_result: expectedResultStr,
                    priority: tc.priority || 'medium',
                    status: 'pending',
                    lifecycle_status: 'draft',
                    is_automated: false,
                    created_by: user?.id,
                    ...(custom_id ? { custom_id } : {}),
                  }])
                  .select()
                  .single();

                if (error) throw error;

                // Record creation history
                if (data && user) {
                  await supabase.from('test_case_history').insert({
                    test_case_id: data.id,
                    user_id: user.id,
                    action_type: 'created',
                  });
                }
              }

              // Refresh test cases cache
              await queryClient.invalidateQueries({ queryKey: ['testCases', projectId] });

              setShowAIGenFromGap(false);
              setGapTitles([]);
            } catch (error) {
              console.error('Failed to save generated test cases:', error);
            }
          }}
        />
      )}
    </div>
  );
}
