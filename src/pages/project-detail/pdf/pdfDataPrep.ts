import {
  PdfData, DailyTrend, WeekComparison, RunResult, FolderCoverage,
  FailedTC, FlakyTC, CoverageGap, TeamMember, MilestoneCard,
  RiskHighlight, ReleaseReadiness, QualityGate,
} from './pdfTypes';
import { formatRelativeTime } from './pdfHelpers';

export async function preparePdfData(
  project: any,
  testCaseCount: number,
  milestones: any[],
  allRunsRaw: any[],
  rawTestResults: any[],
  supabase: any,
  projectPassRateData: any,
): Promise<PdfData> {
  // ── Fetch test cases ──
  const { data: testCasesRaw } = await supabase
    .from('test_cases')
    .select('id, title, priority, lifecycle_status, folder, is_automated, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });
  const testCases = testCasesRaw || [];
  const testCasesMap = new Map(testCases.map((tc: any) => [tc.id, tc]));

  // ── Attach latest test result status to each test case ──
  const latestByTC = new Map<string, string>();
  [...(rawTestResults || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach((r: any) => { if (!latestByTC.has(r.test_case_id)) latestByTC.set(r.test_case_id, r.status); });
  testCases.forEach((tc: any) => { tc.latestResult = latestByTC.get(tc.id) || 'untested'; });

  // ── Core status counts ──
  const statusCounts = getStatusDistribution(rawTestResults);
  const passRate = calculatePassRate(statusCounts);
  const executionComplete = calculateExecutionCompletion(rawTestResults, testCaseCount);

  // ── Priority distribution (from test_cases) ──
  const priorityCounts = {
    critical: testCases.filter((tc: any) => tc.priority === 'critical').length,
    high: testCases.filter((tc: any) => tc.priority === 'high').length,
    medium: testCases.filter((tc: any) => (tc.priority === 'medium' || !tc.priority)).length,
    low: testCases.filter((tc: any) => tc.priority === 'low').length,
  };

  // ── Automation rate ──
  const hasAutomationField = testCases.some((tc: any) => tc.is_automated !== undefined && tc.is_automated !== null);
  const automatedCount = testCases.filter((tc: any) => tc.is_automated === true).length;
  const automationRate = !hasAutomationField ? -1 : (testCaseCount > 0 ? (automatedCount / testCaseCount) * 100 : 0);

  // ── Run results (per-run aggregation, no cross-run double counting) ──
  const runResults: RunResult[] = allRunsRaw.map((run: any) => {
    const runResultsFiltered = rawTestResults.filter((r: any) => r.run_id === run.id);
    const stats = getStatusDistribution(runResultsFiltered);
    return {
      runId: run.id,
      runName: String(run.name || '-'),
      milestone: run.milestone?.name || 'Unassigned',
      status: run.status || 'active',
      passed: stats.passed,
      failed: stats.failed,
      blocked: stats.blocked,
      untested: stats.untested,
      passRate: calculatePassRate(stats),
      total: runResultsFiltered.length,
    };
  });

  // ── Avg run pass rate ──
  const runsWithResults = runResults.filter(r => r.total > 0);
  const avgRunPassRate = runsWithResults.length > 0
    ? runsWithResults.reduce((sum, r) => sum + r.passRate, 0) / runsWithResults.length : 0;

  // ── Open blockers ──
  const openBlockers = statusCounts.blocked;

  // ── Daily trends (30 days) ──
  const dailyTrends = prepareDailyTrends(rawTestResults, 30);

  // ── Week-over-week comparison ──
  const weekComparison = prepareWeekComparison(rawTestResults, testCases);

  // ── Folder coverage ──
  const folderCoverage = prepareFolderCoverage(testCases, rawTestResults, allRunsRaw);

  // ── Milestone cards ──
  const flatMilestones: any[] = [];
  milestones.forEach((m: any) => {
    flatMilestones.push(m);
    (m.subMilestones || []).forEach((s: any) => flatMilestones.push(s));
  });

  const milestoneCards: MilestoneCard[] = flatMilestones.map((m: any) => prepareMilestoneCard(m, allRunsRaw, rawTestResults));
  const activeMilestones = milestoneCards.filter(m => m.status !== 'Completed').length;
  const avgMilestoneProgress = milestoneCards.length > 0
    ? milestoneCards.reduce((sum, m) => sum + m.progress, 0) / milestoneCards.length : 100;

  // ── Critical bug resolution ──
  const criticalFailures = rawTestResults.filter((r: any) => {
    if (r.status !== 'failed') return false;
    const tc = testCasesMap.get(r.test_case_id);
    return tc?.priority === 'critical';
  });
  const critBugResolution = criticalFailures.length === 0 ? 100 : 0;

  // ── Coverage rate ──
  const coverageRate = executionComplete;

  // ── Release readiness ──
  const releaseReadiness = calculateReleaseScore(passRate, openBlockers, coverageRate, milestoneCards);
  const milestoneProgress = avgMilestoneProgress;

  // ── Quality gates ──
  const qualityGates: QualityGate[] = [
    {
      name: 'Pass Rate >= 90%',
      threshold: '90%',
      actual: `${passRate.toFixed(1)}%`,
      status: passRate >= 90 ? 'pass' : passRate >= 70 ? 'warn' : 'fail',
      verdict: passRate >= 90 ? 'PASS' : passRate >= 70 ? 'WARN' : 'FAIL',
    },
    {
      name: 'No Critical Failures',
      threshold: '0',
      actual: String(criticalFailures.length),
      status: criticalFailures.length === 0 ? 'pass' : 'fail',
      verdict: criticalFailures.length === 0 ? 'PASS' : 'FAIL',
    },
    {
      name: 'Coverage >= 80%',
      threshold: '80%',
      actual: `${coverageRate.toFixed(1)}%`,
      status: coverageRate >= 80 ? 'pass' : coverageRate >= 70 ? 'warn' : 'fail',
      verdict: coverageRate >= 80 ? 'PASS' : coverageRate >= 70 ? 'WARN' : 'FAIL',
    },
    {
      name: 'Blocked <= 5%',
      threshold: '5%',
      actual: `${((statusCounts.blocked / Math.max(rawTestResults.length, 1)) * 100).toFixed(1)}%`,
      status: (statusCounts.blocked / Math.max(rawTestResults.length, 1)) <= 0.05 ? 'pass'
        : (statusCounts.blocked / Math.max(rawTestResults.length, 1)) <= 0.10 ? 'warn' : 'fail',
      verdict: (statusCounts.blocked / Math.max(rawTestResults.length, 1)) <= 0.05 ? 'PASS'
        : (statusCounts.blocked / Math.max(rawTestResults.length, 1)) <= 0.10 ? 'WARN' : 'FAIL',
    },
  ];

  // ── Top failed TCs ──
  const failedTCs = prepareTopFailedTCs(rawTestResults, testCasesMap);

  // ── Flaky TCs ──
  const flakyTCs = prepareFlakyTCs(rawTestResults, testCasesMap);

  // ── Coverage gaps ──
  const coverageGaps: CoverageGap[] = folderCoverage
    .filter(f => f.untested > 0)
    .map(f => ({
      module: f.folder,
      untestedCount: f.untested,
      percentOfModule: f.totalTCs > 0 ? (f.untested / f.totalTCs) * 100 : 0,
      risk: (f.untested / Math.max(f.totalTCs, 1)) >= 0.5 ? 'high'
        : (f.untested / Math.max(f.totalTCs, 1)) >= 0.2 ? 'medium' : 'low',
    }))
    .sort((a, b) => b.untestedCount - a.untestedCount)
    .slice(0, 8);

  // ── Team members (from test_results author field, mapped via profiles) ──
  const { data: profilesRaw } = await supabase.from('profiles').select('id, full_name');
  const profileMap = new Map<string, string>((profilesRaw || []).map((p: any) => [p.id, p.full_name]));
  const teamMembers = prepareTeamMembers(rawTestResults, profileMap);

  // ── Risk highlights ──
  const risks = prepareRiskHighlights(criticalFailures, milestoneCards, coverageGaps, passRate, weekComparison);

  // ── Delta metrics (week over week) ──
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thisWeekResults = rawTestResults.filter((r: any) => new Date(r.created_at) >= oneWeekAgo);
  const lastWeekResults = rawTestResults.filter((r: any) => {
    const d = new Date(r.created_at);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });
  const thisWeekPassed = thisWeekResults.filter((r: any) => r.status === 'passed').length;
  const lastWeekPassed = lastWeekResults.filter((r: any) => r.status === 'passed').length;
  const thisWeekTotal = thisWeekResults.length;
  const lastWeekTotal = lastWeekResults.length;
  const thisWeekPassRate = thisWeekTotal > 0 ? (thisWeekPassed / thisWeekTotal) * 100 : 0;
  const lastWeekPassRate = lastWeekTotal > 0 ? (lastWeekPassed / lastWeekTotal) * 100 : 0;
  const passRateDelta = parseFloat((thisWeekPassRate - lastWeekPassRate).toFixed(1));

  const activeRuns = allRunsRaw.filter(r => ['active', 'in_progress', 'new'].includes(r.status)).length;

  const totalExecuted = statusCounts.passed + statusCounts.failed + statusCounts.blocked + statusCounts.retest;
  const lastWeekExecuted = lastWeekResults.length;
  const executedDelta = totalExecuted - lastWeekExecuted;

  const thisWeekFailed = thisWeekResults.filter((r: any) => r.status === 'failed').length;
  const lastWeekFailed = lastWeekResults.filter((r: any) => r.status === 'failed').length;
  const failedDelta = lastWeekFailed - thisWeekFailed;

  const thisWeekBlocked = thisWeekResults.filter((r: any) => r.status === 'blocked').length;
  const lastWeekBlocked = lastWeekResults.filter((r: any) => r.status === 'blocked').length;
  const blockedDelta = lastWeekBlocked - thisWeekBlocked;

  const dateStr = new Date().toISOString().split('T')[0];

  return {
    projectName: String(project?.name || 'Project'),
    dateStr,
    totalTCs: testCaseCount,
    totalRuns: allRunsRaw.length,
    activeMilestones,
    generatedAt: new Date(),
    totalPages: 8,

    passRate,
    passRateDelta,
    executionComplete,
    defectDiscoveryRate: totalExecuted > 0 ? (statusCounts.failed / totalExecuted) * 100 : 0,
    automationRate,
    avgRunPassRate,
    openBlockers,
    critBugResolution,
    coverageRate,
    milestoneProgress,
    releaseScore: releaseReadiness.score,
    releaseStatus: releaseReadiness.status,

    totalExecuted,
    executedDelta,
    activeRuns,
    failedCount: statusCounts.failed,
    failedDelta,
    blockedCount: statusCounts.blocked,
    blockedDelta,

    statusCounts,
    priorityCounts,

    dailyTrends,
    weekComparison,
    runResults,
    folderCoverage,
    failedTCs,
    flakyTCs,
    coverageGaps,
    teamMembers,
    milestoneCards,
    risks,
    releaseReadiness,
    qualityGates,
    burndownData: [],

    testCases,
  };
}

// ── Internal helpers ──

function getStatusDistribution(results: any[]) {
  const dist = { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0 };
  results.forEach((r: any) => {
    const status = (r.status || 'untested').toLowerCase();
    if (status === 'passed') dist.passed++;
    else if (status === 'failed') dist.failed++;
    else if (status === 'blocked') dist.blocked++;
    else if (status === 'retest') dist.retest++;
    else dist.untested++;
  });
  return dist;
}

function calculatePassRate(dist: ReturnType<typeof getStatusDistribution>): number {
  const tested = dist.passed + dist.failed + dist.blocked + dist.retest;
  return tested > 0 ? (dist.passed / tested) * 100 : 0;
}

function calculateExecutionCompletion(results: any[], totalTCs: number): number {
  const uniqueTestedTCs = new Set(
    results
      .filter((r: any) => r.status && r.status !== 'untested')
      .map((r: any) => r.test_case_id)
  ).size;
  return totalTCs > 0 ? Math.min((uniqueTestedTCs / totalTCs) * 100, 100) : 0;
}

function prepareDailyTrends(results: any[], days: number): DailyTrend[] {
  const now = new Date();
  const dayMap = new Map<string, { passed: number; failed: number; blocked: number; total: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { passed: 0, failed: 0, blocked: 0, total: 0 });
  }
  results.forEach((r: any) => {
    if (!r.created_at) return;
    const key = new Date(r.created_at).toISOString().split('T')[0];
    const day = dayMap.get(key);
    if (day) {
      day.total++;
      const s = (r.status || '').toLowerCase();
      if (s === 'passed') day.passed++;
      else if (s === 'failed') day.failed++;
      else if (s === 'blocked') day.blocked++;
    }
  });
  return Array.from(dayMap.entries()).map(([date, d]) => ({
    date,
    passRate: d.total > 0 ? (d.passed / d.total) * 100 : 0,
    executed: d.total,
    passed: d.passed,
    failed: d.failed,
    blocked: d.blocked,
    execCount: d.total,
  }));
}

function prepareWeekComparison(results: any[], testCases: any[]): WeekComparison[] {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = results.filter(r => new Date(r.created_at) >= oneWeekAgo);
  const lastWeek = results.filter(r => { const d = new Date(r.created_at); return d >= twoWeeksAgo && d < oneWeekAgo; });

  const twPassed = thisWeek.filter(r => r.status === 'passed').length;
  const lwPassed = lastWeek.filter(r => r.status === 'passed').length;
  const twTotal = thisWeek.length;
  const lwTotal = lastWeek.length;
  const twPassRate = twTotal > 0 ? (twPassed / twTotal) * 100 : 0;
  const lwPassRate = lwTotal > 0 ? (lwPassed / lwTotal) * 100 : 0;
  const twFailed = thisWeek.filter(r => r.status === 'failed').length;
  const lwFailed = lastWeek.filter(r => r.status === 'failed').length;
  const twBlocked = thisWeek.filter(r => r.status === 'blocked').length;
  const lwBlocked = lastWeek.filter(r => r.status === 'blocked').length;

  const oneWeekAgoForTC = oneWeekAgo;
  const twoWeeksAgoForTC = twoWeeksAgo;
  const twCreated = testCases.filter(tc => new Date(tc.created_at) >= oneWeekAgoForTC).length;
  const lwCreated = testCases.filter(tc => { const d = new Date(tc.created_at); return d >= twoWeeksAgoForTC && d < oneWeekAgoForTC; }).length;

  const metrics: WeekComparison[] = [
    { metric: 'Pass Rate (%)', thisWeek: parseFloat(twPassRate.toFixed(1)), lastWeek: parseFloat(lwPassRate.toFixed(1)), change: parseFloat((twPassRate - lwPassRate).toFixed(1)), changePercent: 0, bar: twPassRate },
    { metric: 'Executed', thisWeek: twTotal, lastWeek: lwTotal, change: twTotal - lwTotal, changePercent: 0, bar: twTotal },
    { metric: 'New Failures', thisWeek: twFailed, lastWeek: lwFailed, change: twFailed - lwFailed, changePercent: 0, bar: twFailed },
    { metric: 'Blocked', thisWeek: twBlocked, lastWeek: lwBlocked, change: twBlocked - lwBlocked, changePercent: 0, bar: twBlocked },
    { metric: 'TCs Created', thisWeek: twCreated, lastWeek: lwCreated, change: twCreated - lwCreated, changePercent: 0, bar: twCreated },
  ];
  return metrics;
}

function prepareFolderCoverage(testCases: any[], results: any[], allRunsRaw: any[]): FolderCoverage[] {
  const folderMap = new Map<string, { tcs: Set<string>; tested: Set<string>; passed: number; failed: number }>();

  testCases.forEach((tc: any) => {
    const folder = String(tc.folder || 'Uncategorized');
    if (!folderMap.has(folder)) folderMap.set(folder, { tcs: new Set(), tested: new Set(), passed: 0, failed: 0 });
    folderMap.get(folder)!.tcs.add(tc.id);
  });

  // Latest result per test case
  const latestByTC = new Map<string, string>();
  [...results].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach(r => { if (!latestByTC.has(r.test_case_id)) latestByTC.set(r.test_case_id, r.status); });

  testCases.forEach((tc: any) => {
    const folder = String(tc.folder || 'Uncategorized');
    const entry = folderMap.get(folder);
    if (!entry) return;
    const status = latestByTC.get(tc.id);
    if (status && status !== 'untested') {
      entry.tested.add(tc.id);
      if (status === 'passed') entry.passed++;
      else if (status === 'failed') entry.failed++;
    }
  });

  return Array.from(folderMap.entries())
    .map(([folder, data]) => ({
      folder,
      totalTCs: data.tcs.size,
      tested: data.tested.size,
      untested: data.tcs.size - data.tested.size,
      passRate: data.tested.size > 0 ? (data.passed / data.tested.size) * 100 : 0,
      passCount: data.passed,
      failCount: data.failed,
    }))
    .sort((a, b) => b.untested - a.untested);
}

function prepareMilestoneCard(m: any, allRunsRaw: any[], rawTestResults: any[]): MilestoneCard {
  const progress = m.progress ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = m.end_date ? new Date(m.end_date) : null;
  const daysRemaining = dueDate
    ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

  const mRuns = allRunsRaw.filter(r => r.milestone_id === m.id);
  const totalTCs = mRuns.reduce((sum: number, r: any) => sum + (r.test_case_ids?.length || 0), 0);
  const testedTCs = rawTestResults.filter(r => mRuns.some(run => run.id === r.run_id) && r.status !== 'untested').length;
  const remainingTCs = Math.max(totalTCs - testedTCs, 0);

  // Velocity: average TCs tested per day over last 7 days
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentResults = rawTestResults.filter(r =>
    mRuns.some(run => run.id === r.run_id) && new Date(r.created_at) >= sevenDaysAgo
  );
  const velocity = recentResults.length / 7;

  const estimatedDaysToComplete = velocity > 0 ? remainingTCs / velocity : 999;
  const estCompletionDate = new Date(today.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000);
  const estCompletion = estCompletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let status: MilestoneCard['status'];
  if (m.status === 'completed') status = 'Completed';
  else if (daysRemaining < 0) status = 'Overdue';
  else if (estimatedDaysToComplete > daysRemaining) status = 'At Risk';
  else status = 'On Track';

  const progressColor: [number, number, number] =
    status === 'Completed' ? [99, 102, 241]
    : status === 'Overdue' ? [239, 68, 68]
    : status === 'At Risk' ? [245, 158, 11]
    : [16, 163, 127];

  return {
    id: m.id,
    name: String(m.name || '-'),
    status,
    progress,
    progressColor,
    dueDate: dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
    daysRemaining,
    remainingTCs,
    velocity,
    estCompletion,
    estimatedDaysToComplete,
  };
}

function prepareTopFailedTCs(results: any[], testCasesMap: Map<string, any>): FailedTC[] {
  const failMap = new Map<string, { count: number; lastDate: Date }>();
  results.filter(r => r.status === 'failed').forEach(r => {
    const existing = failMap.get(r.test_case_id);
    const d = new Date(r.created_at);
    if (!existing || d > existing.lastDate) {
      failMap.set(r.test_case_id, { count: (existing?.count || 0) + 1, lastDate: d });
    } else {
      existing.count++;
    }
  });

  return Array.from(failMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([tcId, data]) => {
      const tc = testCasesMap.get(tcId);
      return {
        id: tc?.id || tcId,
        title: String(tc?.title || 'Unknown TC'),
        priority: tc?.priority || 'medium',
        failCount: data.count,
        lastFailed: data.lastDate,
        lastFailedRelative: formatRelativeTime(data.lastDate),
      };
    });
}

function prepareFlakyTCs(results: any[], testCasesMap: Map<string, any>): FlakyTC[] {
  const tcResultsMap = new Map<string, Array<'passed' | 'failed' | 'blocked'>>();
  [...results]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach(r => {
      if (!tcResultsMap.has(r.test_case_id)) tcResultsMap.set(r.test_case_id, []);
      const arr = tcResultsMap.get(r.test_case_id)!;
      if (arr.length < 10) {
        const s = r.status?.toLowerCase();
        if (s === 'passed' || s === 'failed' || s === 'blocked') arr.push(s);
      }
    });

  return Array.from(tcResultsMap.entries())
    .filter(([, arr]) => arr.length >= 4)
    .map(([tcId, arr]) => {
      let transitions = 0;
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] !== arr[i - 1]) transitions++;
      }
      const flakyScore = Math.round((transitions / Math.max(arr.length - 1, 1)) * 100);
      const frequency = flakyScore >= 70 ? 'High' : flakyScore >= 50 ? 'Medium' : 'Low';
      const tc = testCasesMap.get(tcId);
      return { id: tc?.id || tcId, title: String(tc?.title || 'Unknown TC'), lastTenResults: arr, flakyScore, frequency };
    })
    .filter(tc => tc.flakyScore >= 40)
    .sort((a, b) => b.flakyScore - a.flakyScore)
    .slice(0, 5);
}

function prepareTeamMembers(results: any[], profileMap: Map<string, string> = new Map()): TeamMember[] {
  const memberMap = new Map<string, { executed: number; passed: number; failed: number; blocked: number }>();
  results.forEach(r => {
    const rawAuthor = r.author;
    const author = (rawAuthor && profileMap.has(rawAuthor))
      ? profileMap.get(rawAuthor)!
      : (rawAuthor ? String(rawAuthor) : 'Unknown');
    if (!memberMap.has(author)) memberMap.set(author, { executed: 0, passed: 0, failed: 0, blocked: 0 });
    const m = memberMap.get(author)!;
    m.executed++;
    if (r.status === 'passed') m.passed++;
    else if (r.status === 'failed') m.failed++;
    else if (r.status === 'blocked') m.blocked++;
  });

  const totalExecuted = results.length;
  return Array.from(memberMap.entries())
    .map(([name, stats]) => ({
      name,
      ...stats,
      passRate: stats.executed > 0 ? (stats.passed / stats.executed) * 100 : 0,
      contribution: totalExecuted > 0 ? (stats.executed / totalExecuted) * 100 : 0,
      discoveryRate: stats.executed > 0 ? (stats.failed / stats.executed) * 100 : 0,
    }))
    .sort((a, b) => b.executed - a.executed)
    .slice(0, 12);
}

function prepareRiskHighlights(
  criticalFailures: any[],
  milestoneCards: MilestoneCard[],
  coverageGaps: CoverageGap[],
  passRate: number,
  weekComparison: WeekComparison[],
): RiskHighlight[] {
  const risks: RiskHighlight[] = [];

  if (criticalFailures.length > 0) {
    risks.push({ severity: 'critical', message: `${criticalFailures.length} Critical TC failure(s) detected` });
  }

  milestoneCards.filter(m => m.status === 'At Risk' || m.status === 'Overdue').forEach(m => {
    risks.push({
      severity: m.status === 'Overdue' ? 'critical' : 'high',
      message: `'${m.name}' ${m.status.toLowerCase()} (${m.progress}%, D${m.daysRemaining >= 0 ? '-' : '+'}${Math.abs(m.daysRemaining)})`,
    });
  });

  const highCoverageGaps = coverageGaps.filter(g => g.untestedCount > 10);
  highCoverageGaps.slice(0, 2).forEach(g => {
    risks.push({ severity: 'medium', message: `'${g.module}' has ${g.untestedCount} untested TCs (coverage gap)` });
  });

  const passRateRow = weekComparison.find(w => w.metric === 'Pass Rate (%)');
  if (passRateRow && passRateRow.change < -5) {
    risks.push({ severity: 'high', message: `Pass Rate dropped ${Math.abs(passRateRow.change).toFixed(1)}% from last week` });
  }

  return risks.slice(0, 5);
}

function calculateReleaseScore(
  passRate: number,
  openBlockers: number,
  coverageRate: number,
  milestoneCards: MilestoneCard[],
): ReleaseReadiness {
  const passRateScore = passRate;
  const critBugResolution = openBlockers === 0 ? 100 : Math.max(0, 100 - openBlockers * 10);
  const coverageScore = coverageRate;
  const milestoneProgress = milestoneCards.length > 0
    ? milestoneCards.reduce((sum, m) => sum + m.progress, 0) / milestoneCards.length : 100;

  const weightedScore = passRateScore * 0.4 + critBugResolution * 0.25 + coverageScore * 0.2 + milestoneProgress * 0.15;

  let status: 'RELEASE_READY' | 'CONDITIONAL' | 'NOT_READY';
  if (weightedScore >= 80) status = 'RELEASE_READY';
  else if (weightedScore >= 60) status = 'CONDITIONAL';
  else status = 'NOT_READY';

  return {
    score: Math.round(weightedScore),
    status,
    scoreBreakdown: {
      passRate,
      passRateScore: (passRate / 100) * 40,
      critBugResolution,
      coverageRate,
      coverageScore: (coverageRate / 100) * 20,
      milestoneProgress,
    },
  };
}
