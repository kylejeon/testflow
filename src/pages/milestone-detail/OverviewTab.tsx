import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import BurndownChart from './BurndownChart';
import KpiStrip from './KpiStrip';
import FailedBlockedCard from './FailedBlockedCard';
import VelocitySparkline from './VelocitySparkline';
import TopFailTagsCard from './TopFailTagsCard';
import RiskInsightContainer from './RiskInsightContainer';
import Activity24hFeed from './Activity24hFeed';
import ExecutionSections from './ExecutionSections';
import ContributorsCard from './ContributorsCard';
import type { MilestoneAiRiskCache } from './useMilestoneAiRisk';

interface TcStats {
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  total: number;
  passRate: number;
}

interface FailedBlockedTcItem {
  tcId: string;
  tcName: string;
  status: 'failed' | 'blocked';
  runName: string;
  author: string;
  createdAt: string;
}

interface ActivityLogLike {
  id: string;
  type: string;
  testCaseName: string;
  runName: string;
  timestamp: Date;
  author: string;
}

interface RunItem {
  id: string;
  name: string;
  status: string;
  test_plan_id?: string | null;
  passed_count?: number;
  failed_count?: number;
  blocked_count?: number;
  untested_count?: number;
  retest_count?: number;
}

interface SessionItem {
  id: string;
  name: string;
  status: string;
  actualStatus?: string;
  created_at: string;
}

interface SubMilestoneItem {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface OverviewTabProps {
  projectId: string;
  milestoneId: string;
  milestoneStart: string | null;
  milestoneEnd: string | null;
  tcStats: TcStats;
  failedBlockedTcs: FailedBlockedTcItem[];
  activityLogs: ActivityLogLike[];
  runs: RunItem[];
  sessions: SessionItem[];
  subMilestones: SubMilestoneItem[];
  subMilestoneProgress: Map<string, number>;
  contributorProfiles: Map<string, { name: string | null; url: string | null }>;
  aiRiskCache: MilestoneAiRiskCache | null;
  /** Parent runIds + sub milestones' runIds when rollup is active. Undefined = parent-only. */
  aggregatedRunIds?: string[];
  formatDateRange: (s: string | null, e: string | null) => string;
  getAuthorColor: (author: string) => string;
  getContributorInitials: (author: string) => string;
  onGoActivity: () => void;
  onGoIssues: () => void;
}

interface OverviewExtra {
  plans: any[];
  plansError: boolean;
  topFailTags: Array<{ name: string; count: number }>;
  totalFails: number;
  executedPerDay: Map<string, number>;
  velocity7d: number[];
}

/**
 * Single queryFn bundling additional Overview data (AC-C10: 1.5s init).
 *
 * When `aggregatedRunIds` is provided (rollup active), the test_results queries
 * use the aggregated set (parent + sub runs). Plans query stays milestone-scoped
 * (sub plans are out of scope per dev-spec §9).
 */
async function loadOverviewExtra(
  milestoneId: string,
  runIds: string[],
  aggregatedRunIds?: string[],
): Promise<OverviewExtra> {
  const queryRunIds = aggregatedRunIds && aggregatedRunIds.length > 0 ? aggregatedRunIds : runIds;
  const [plansRes, failedResultsRes, execResultsRes] = await Promise.allSettled([
    supabase.from('test_plans')
      .select('id, name, status, priority, target_date, owner_id, milestone_id')
      .eq('milestone_id', milestoneId)
      .order('created_at', { ascending: false }),
    queryRunIds.length > 0
      ? supabase.from('test_results').select('test_case_id, status').in('run_id', queryRunIds).eq('status', 'failed')
      : Promise.resolve({ data: [], error: null } as any),
    queryRunIds.length > 0
      ? supabase.from('test_results').select('status, created_at').in('run_id', queryRunIds).in('status', ['passed', 'failed', 'blocked', 'retest'])
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const plans = plansRes.status === 'fulfilled' ? (plansRes.value.data || []) : [];
  const plansError = plansRes.status === 'rejected';

  const failedResults = failedResultsRes.status === 'fulfilled' ? ((failedResultsRes.value as any).data || []) : [];
  const failedTcIds = Array.from(new Set(failedResults.map((r: any) => r.test_case_id).filter(Boolean)));

  let topFailTags: Array<{ name: string; count: number }> = [];
  if (failedTcIds.length > 0) {
    const { data: tcs } = await supabase
      .from('test_cases')
      .select('id, tags')
      .in('id', failedTcIds);
    const tagCount: Record<string, number> = {};
    (tcs || []).forEach((tc: any) => {
      const tags: string[] = typeof tc.tags === 'string'
        ? tc.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(tc.tags) ? tc.tags.filter(Boolean) : [];
      tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
    });
    topFailTags = Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  const totalFails = failedResults.length;

  const execResults = execResultsRes.status === 'fulfilled' ? ((execResultsRes.value as any).data || []) : [];
  const executedPerDay = new Map<string, number>();
  (execResults as Array<{ created_at: string }>).forEach(r => {
    const key = r.created_at.slice(0, 10);
    executedPerDay.set(key, (executedPerDay.get(key) || 0) + 1);
  });

  // Velocity last 7 days (Mon..Sun for visual simplicity, we just use last 7 days from today)
  const velocity7d: number[] = [];
  const todayKey = new Date(); todayKey.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayKey.getTime() - i * 86400000);
    velocity7d.push(executedPerDay.get(d.toISOString().slice(0, 10)) || 0);
  }

  return { plans, plansError, topFailTags, totalFails, executedPerDay, velocity7d };
}

export default function OverviewTab(props: OverviewTabProps) {
  const {
    projectId, milestoneId, milestoneStart, milestoneEnd, tcStats, failedBlockedTcs,
    activityLogs, runs, sessions, subMilestones, subMilestoneProgress, contributorProfiles,
    aiRiskCache, aggregatedRunIds,
    formatDateRange, getAuthorColor, getContributorInitials,
    onGoActivity, onGoIssues,
  } = props;

  const runIds = runs.map(r => r.id);
  const aggRunIdsKey = aggregatedRunIds ? [...aggregatedRunIds].sort().join(',') : '';

  const { data: extra, isLoading: extraLoading } = useQuery({
    queryKey: ['milestone-overview-extra', milestoneId, [...runIds].sort().join(','), aggRunIdsKey],
    queryFn: () => loadOverviewExtra(milestoneId, runIds, aggregatedRunIds),
    staleTime: 60_000,
  });

  const plans = extra?.plans || [];
  const plansError = extra?.plansError || false;
  const topFailTags = extra?.topFailTags || [];
  const totalFails = extra?.totalFails || 0;
  const executedPerDay = extra?.executedPerDay || new Map<string, number>();
  const velocity7d = extra?.velocity7d || [0, 0, 0, 0, 0, 0, 0];

  const planMap = new Map(plans.map((p: any) => [p.id, p]));

  const startDate = milestoneStart ? new Date(milestoneStart.split('T')[0]) : null;
  const endDate = milestoneEnd ? new Date(milestoneEnd.split('T')[0]) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const remaining = tcStats.untested;
  const executed = tcStats.total - remaining;
  const daysElapsed = startDate
    ? Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / 86400000))
    : 0;
  const daysLeft = endDate
    ? Math.ceil((endDate.getTime() - today.getTime()) / 86400000)
    : null;
  const velocityAvg = daysElapsed > 0 ? executed / daysElapsed : null;
  const projDays = velocityAvg != null && velocityAvg > 0 ? Math.ceil(remaining / velocityAvg) : null;
  const onTrack = projDays != null && daysLeft != null ? projDays <= daysLeft : true;

  // Risk level (rule-based)
  const isCritical = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && tcStats.passRate < 50;
  const isAtRisk = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && tcStats.passRate < 70;
  const riskLevel: 'on_track' | 'at_risk' | 'critical' = isCritical ? 'critical' : isAtRisk ? 'at_risk' : 'on_track';

  const riskBullets: React.ReactNode[] = [];
  if (riskLevel === 'on_track') {
    riskBullets.push(<>Progress is <b>on track</b>. Current velocity suggests completion before the deadline.</>);
  } else {
    riskBullets.push(<>You're <b>behind the ideal burndown</b>. Consider increasing run frequency or reducing scope.</>);
  }
  if (tcStats.failed > 0) {
    riskBullets.push(<><b>{tcStats.failed} failing TCs</b> are slowing the burn. Prioritise fixing critical failures first.</>);
  } else if (tcStats.total > 0) {
    riskBullets.push(<>No failing TCs right now — keep the momentum going!</>);
  }
  if (topFailTags.length > 0) {
    riskBullets.push(<>Top fail tag: <b>#{topFailTags[0].name}</b> ({topFailTags[0].count} fails). Investigate this area first.</>);
  }

  // Last 24h activity
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
  const activity24h = activityLogs.filter(l => l.timestamp.getTime() >= cutoff24h);

  // Contributors Top 5 (from activityLogs, matching old Status tab logic)
  const contributorMap = new Map<string, number>();
  activityLogs.forEach(log => {
    if (log.type !== 'note' && log.author && log.author !== 'Unknown') {
      contributorMap.set(log.author, (contributorMap.get(log.author) || 0) + 1);
    }
  });
  const contributors = Array.from(contributorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Hero Row (v3): Chart+KPI (1.7fr) + Risk Insight (1fr), stretch align ── */}
      <div className="mo-hero-row">
        <div className="mo-chart-stack">
          <BurndownChart
            startDate={startDate}
            endDate={endDate}
            totalTCs={tcStats.total}
            executedPerDay={executedPerDay}
          />
          <KpiStrip
            remaining={remaining}
            executed={executed}
            total={tcStats.total}
            velocityPerDay={velocityAvg}
            passed={tcStats.passed}
            passRate={tcStats.passRate}
            etaDaysLeft={daysLeft}
            etaProjDays={projDays}
            etaOnTrack={onTrack}
          />
        </div>
        <RiskInsightContainer
          projectId={projectId}
          milestoneId={milestoneId}
          riskLevel={riskLevel}
          bullets={riskBullets}
          aiCache={aiRiskCache}
          hasTcs={tcStats.total > 0}
        />
      </div>

      {/* ── Utility Row (v3.1): Intel Strip 4-col incl. Contributors (equal width+height) ── */}
      <div className="mo-intel-strip mo-intel-strip-4" style={{ marginBottom: 10 }}>
        <FailedBlockedCard
          tcs={failedBlockedTcs}
          totalCount={failedBlockedTcs.length}
          onViewAll={onGoIssues}
        />
        <VelocitySparkline weekCounts={velocity7d} />
        <TopFailTagsCard tags={topFailTags} totalFails={totalFails} />
        <ContributorsCard
          contributors={contributors}
          contributorProfiles={contributorProfiles}
          getAuthorColor={getAuthorColor}
          getContributorInitials={getContributorInitials}
        />
      </div>

      {/* ── 24h Activity inline strip ── */}
      <Activity24hFeed logs={activity24h} onViewAll={onGoActivity} variant="strip" />

      {/* ── Bottom Row (v3): Execution 풀폭 (Contributors 이동됨) ── */}
      <div className="mo-bottom-row">
        <ExecutionSections
          projectId={projectId}
          subMilestones={subMilestones}
          subMilestoneProgress={subMilestoneProgress}
          plans={plans}
          plansLoading={extraLoading}
          plansError={plansError}
          runs={runs}
          sessions={sessions}
          planMap={planMap}
          formatDateRange={formatDateRange}
        />
      </div>
    </div>
  );
}
