import { supabase } from '../../lib/supabase';

export type ProjectDetailData = {
  project: any | null;
  testCaseCount: number;
  milestones: any[];
  testRuns: any[];
  sessions: any[];
  recentActivity: any[];
  projectPassRateData: { total: number; passed: number } | null;
  rawTestResults: any[];
  allRunsRaw: any[];
};

export async function loadProjectDetailData(id: string): Promise<ProjectDetailData> {
  // ── 독립 쿼리를 모두 병렬로 실행 ──
  const [
    { data: projectData, error: projectError },
    { count: tcCount },
    { data: milestonesData, error: milestonesError },
    { data: allRunsData, error: allRunsError },
    { data: sessionsRaw },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('test_cases').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('milestones').select('*').eq('project_id', id).order('end_date', { ascending: true }),
    supabase.from('test_runs').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('sessions').select('*').eq('project_id', id).order('created_at', { ascending: false }).limit(20),
  ]);

  if (projectError) throw projectError;
  if (milestonesError) throw milestonesError;
  if (allRunsError) throw allRunsError;

  const testCaseCount = tcCount || 0;
  const allRunsRaw = allRunsData || [];

  // ── test_results를 모든 run에 대해 한 번에 fetch (N+1 제거) ──
  const runIds = (allRunsData || []).map((r: any) => r.id);
  const sessionIds = (sessionsRaw || []).map((s: any) => s.id);

  const [
    { data: allTestResultsData, error: allTestResultsError },
    { data: sessionLogsData },
  ] = await Promise.all([
    runIds.length
      ? supabase.from('test_results').select('run_id, test_case_id, status, created_at').in('run_id', runIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length
      ? supabase.from('session_logs').select('session_id, type, created_at').in('session_id', sessionIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (allTestResultsError) throw allTestResultsError;

  // ── test_results를 run_id별로 그룹화 (메모리에서 O(1) 조회) ──
  const allResultsByRun = new Map<string, any[]>();
  (allTestResultsData || []).forEach((r: any) => {
    if (!allResultsByRun.has(r.run_id)) allResultsByRun.set(r.run_id, []);
    allResultsByRun.get(r.run_id)!.push(r);
  });

  // Compute pass rate from actual test_results (stored run columns are unreliable)
  const _prTotal = (allTestResultsData || []).filter((r: any) => r.status !== 'untested').length;
  const _prPassed = (allTestResultsData || []).filter((r: any) => r.status === 'passed').length;
  const projectPassRateData = { total: _prTotal, passed: _prPassed };
  const rawTestResults = allTestResultsData || [];

  // calculate milestone progress
  const milestonesWithProgress = (milestonesData || []).map((milestone: any) => {
    const milestoneRuns = allRunsData?.filter((run: any) => run.milestone_id === milestone.id) || [];

    if (milestoneRuns.length === 0) {
      let status = milestone.status;
      if (status === 'upcoming' && milestone.start_date) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = new Date(milestone.start_date); start.setHours(0, 0, 0, 0);
        if (start <= today) status = 'started';
      }
      return { ...milestone, status, progress: 0 };
    }

    let totalTestsSum = 0;
    let completedTestsSum = 0;

    milestoneRuns.forEach((run: any) => {
      const runResults = allTestResultsData?.filter((r: any) => r.run_id === run.id) || [];
      const statusMap = new Map<string, string>();
      runResults.forEach((r: any) => {
        if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
      });

      const totalTests = (run.test_case_ids || []).length;
      totalTestsSum += totalTests;
      if (totalTests === 0) return;

      (run.test_case_ids || []).forEach((tcId: string) => {
        const s = statusMap.get(tcId);
        if (s === 'passed' || s === 'failed' || s === 'blocked' || s === 'retest') completedTestsSum++;
      });
    });

    const avg = totalTestsSum > 0 ? Math.round((completedTestsSum / totalTestsSum) * 100) : 0;

    let status = milestone.status;
    if (status === 'upcoming' && milestone.start_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = new Date(milestone.start_date); start.setHours(0, 0, 0, 0);
      if (start <= today) status = 'started';
    }

    return { ...milestone, status, progress: avg };
  });

  // organize parent/child milestones with roll-up aggregation
  const parentMilestones = milestonesWithProgress.filter((m: any) => !m.parent_milestone_id);
  const organizedMilestones = parentMilestones.map((parent: any) => {
    const subs = milestonesWithProgress.filter((m: any) => m.parent_milestone_id === parent.id);

    if (subs.length === 0) {
      return { ...parent, isAggregated: false, subMilestones: [] };
    }

    // Roll-up: sub + parent 직속 runs 합산
    const allSources = [parent, ...subs];
    let rollupTotal = 0;
    let rollupCompleted = 0;
    let rollupPassed = 0;
    let rollupFailed = 0;
    let rollupBlocked = 0;

    allSources.forEach((source: any) => {
      const sourceRuns = (allRunsData || []).filter((r: any) => r.milestone_id === source.id);
      sourceRuns.forEach((run: any) => {
        const runResults = allResultsByRun.get(run.id) || [];
        const statusMap = new Map<string, string>();
        runResults.forEach((r: any) => {
          if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
        });
        const tcIds: string[] = run.test_case_ids || [];
        rollupTotal += tcIds.length;
        tcIds.forEach(tcId => {
          const s = statusMap.get(tcId);
          if (s === 'passed')       { rollupCompleted++; rollupPassed++; }
          else if (s === 'failed')  { rollupCompleted++; rollupFailed++; }
          else if (s === 'blocked') { rollupCompleted++; rollupBlocked++; }
          else if (s === 'retest')  { rollupCompleted++; }
        });
      });
    });

    const rollupProgress = rollupTotal > 0
      ? Math.round((rollupCompleted / rollupTotal) * 100)
      : 0;
    const rollupPassRate = rollupCompleted > 0
      ? Math.round((rollupPassed / rollupCompleted) * 1000) / 10
      : 0;
    const rollupCoverage = rollupTotal > 0
      ? Math.round((rollupCompleted / rollupTotal) * 1000) / 10
      : 0;

    // Status 자동 결정
    const subStatuses = subs.map((s: any) => s.status);
    let derivedStatus: string;
    if (subStatuses.every((s: string) => s === 'completed')) derivedStatus = 'completed';
    else if (subStatuses.some((s: string) => s === 'past_due')) derivedStatus = 'past_due';
    else if (subStatuses.some((s: string) => s === 'started')) derivedStatus = 'started';
    else derivedStatus = 'upcoming';

    // 기간 자동 계산
    const subStarts = subs.map((s: any) => s.start_date).filter(Boolean).map((d: string) => new Date(d).getTime());
    const subEnds = subs.map((s: any) => s.end_date).filter(Boolean).map((d: string) => new Date(d).getTime());
    const derivedStartDate = subStarts.length > 0 ? new Date(Math.min(...subStarts)).toISOString() : parent.start_date;
    const derivedEndDate = subEnds.length > 0 ? new Date(Math.max(...subEnds)).toISOString() : parent.end_date;

    // 기간 벗어남 경고
    const dateWarnings: string[] = [];
    if (parent.date_mode !== 'auto' && parent.start_date && parent.end_date) {
      const pStart = new Date(parent.start_date).getTime();
      const pEnd = new Date(parent.end_date).getTime();
      subs.forEach((sub: any) => {
        if (sub.start_date && new Date(sub.start_date).getTime() < pStart)
          dateWarnings.push(`"${sub.name}" 시작일이 parent 범위 이전`);
        if (sub.end_date && new Date(sub.end_date).getTime() > pEnd)
          dateWarnings.push(`"${sub.name}" 종료일이 parent 범위 이후`);
      });
    }

    return {
      ...parent,
      progress: rollupProgress,
      status: derivedStatus,
      isAggregated: true,
      rollupTotal,
      rollupCompleted,
      rollupPassed,
      rollupFailed,
      rollupBlocked,
      rollupPassRate,
      rollupCoverage,
      derivedStatus,
      derivedStartDate,
      derivedEndDate,
      dateWarnings,
      subMilestones: subs,
    };
  });

  // milestone id → name 맵 생성
  const milestoneMap = new Map<string, string>();
  (milestonesData || []).forEach((m: any) => milestoneMap.set(m.id, m.name));

  // ── LATEST RUNS WITH PROGRESS (캐싱된 allResultsByRun 사용, N+1 없음) ──
  const runsWithProgress = (allRunsData || []).slice(0, 5).map((run: any) => {
    const runResults = allResultsByRun.get(run.id) || [];
    const statusMap = new Map<string, string>();
    runResults.forEach((r: any) => {
      if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
    });

    let passed = 0, failed = 0, blocked = 0, retest = 0, untested = 0;
    (run.test_case_ids || []).forEach((tcId: string) => {
      const s = statusMap.get(tcId) || 'untested';
      if (s === 'passed') passed++;
      else if (s === 'failed') failed++;
      else if (s === 'blocked') blocked++;
      else if (s === 'retest') retest++;
      else untested++;
    });

    const milestoneName = run.milestone_id ? milestoneMap.get(run.milestone_id) || null : null;
    return { ...run, passed, failed, blocked, retest, untested, milestoneName };
  });

  // ── SESSIONS & ACTIVITY (이미 병렬로 fetch한 sessionsRaw + sessionLogsData 재사용) ──
  const sessionsData = sessionsRaw;

  const logsBySession = new Map<string, any[]>();
  (sessionLogsData || []).forEach((log: any) => {
    if (!logsBySession.has(log.session_id)) logsBySession.set(log.session_id, []);
    logsBySession.get(log.session_id)!.push(log);
  });

  const generateActivityData = (logs: any[]) => {
    const blockCount = 24;
    const activity = new Array(blockCount).fill('#e5e7eb');
    if (!logs?.length) return activity;

    const recent = logs.slice(0, blockCount);
    recent.forEach((log: any, i: number) => {
      switch (log.type) {
        case 'note':
          activity[i] = '#3b82f6';
          break;
        case 'passed':
          activity[i] = '#10b981';
          break;
        case 'failed':
          activity[i] = '#ef4444';
          break;
        case 'blocked':
          activity[i] = '#f59e0b';
          break;
        default:
          activity[i] = '#6366F1';
      }
    });
    return activity;
  };

  const sessionsWithActivity = (sessionsData || []).map((session: any) => {
    const logs = logsBySession.get(session.id) || [];
    const activityData = generateActivityData(logs);

    let actualStatus: string;
    if (session.ended_at || session.status === 'closed' || session.status === 'completed') {
      actualStatus = 'completed';
    } else if (session.status === 'paused' || session.paused_at) {
      actualStatus = 'paused';
    } else if (session.started_at) {
      actualStatus = 'in_progress';
    } else {
      actualStatus = 'new';
    }

    return { ...session, actualStatus, activityData };
  });

  // ── TIMELINE ACTIVITY (allResultsByRun 재사용, N+1 없음) ──
  const runResultSummary: Record<string, {
    passed: number; failed: number; blocked: number; retest: number; latestAt: string; runName: string;
  }> = {};

  (allRunsData || []).slice(0, 10).forEach((run: any) => {
    const results = allResultsByRun.get(run.id) || [];
    if (!results.length) return;
    let passed = 0, failed = 0, blocked = 0, retest = 0;
    results.forEach((r: any) => {
      if (r.status === 'passed') passed++;
      else if (r.status === 'failed') failed++;
      else if (r.status === 'blocked') blocked++;
      else if (r.status === 'retest') retest++;
    });
    runResultSummary[run.id] = {
      passed, failed, blocked, retest,
      latestAt: results[0].created_at,
      runName: run.name,
    };
  });

  // 이미 fetch한 데이터 재사용 (중복 fetch 제거)
  const allRunsTimeline = (allRunsData || []).slice(0, 20);
  const allSessionsTimeline = (sessionsData || []).slice(0, 20);
  const allMilestonesTimeline = [...(milestonesData || [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 20);

  const activities = [
    // Milestones
    ...allMilestonesTimeline.map((m: any) => ({
      type: 'milestone', action: 'created', name: m.name, created_at: m.created_at,
      meta: { status: m.status, start_date: m.start_date, end_date: m.end_date },
    })),
    ...allMilestonesTimeline
      .filter((m: any) => m.status === 'completed' && m.updated_at)
      .map((m: any) => ({
        type: 'milestone', action: 'completed', name: m.name, created_at: m.updated_at,
        meta: { status: m.status },
      })),
    // Runs
    ...allRunsTimeline.map((r: any) => ({
      type: 'run', action: 'created', name: r.name, created_at: r.created_at,
      meta: { testCount: r.test_case_ids?.length || 0, status: r.status },
    })),
    ...allRunsTimeline
      .filter((r: any) => r.status === 'completed' && r.executed_at)
      .map((r: any) => ({
        type: 'run', action: 'completed', name: r.name, created_at: r.executed_at,
        meta: { testCount: r.test_case_ids?.length || 0 },
      })),
    // Test result activity
    ...Object.entries(runResultSummary).map(([_runId, summary]) => ({
      type: 'test_activity',
      action: 'tested',
      name: summary.runName,
      created_at: summary.latestAt,
      meta: {
        passed: summary.passed,
        failed: summary.failed,
        blocked: summary.blocked,
        retest: summary.retest,
      },
    })),
    // Sessions
    ...(allSessionsTimeline || []).map((s: any) => ({
      type: 'session',
      action: 'created',
      name: s.name,
      created_at: s.created_at,
      meta: { status: s.status },
    })),
    ...(allSessionsTimeline || [])
      .filter((s: any) => (s.status === 'completed' || s.status === 'closed') && s.ended_at)
      .map((s: any) => ({
        type: 'session',
        action: 'completed',
        name: s.name,
        created_at: s.ended_at,
        meta: {},
      })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return {
    project: projectData,
    testCaseCount,
    milestones: organizedMilestones,
    testRuns: runsWithProgress,
    sessions: sessionsWithActivity,
    recentActivity: activities,
    projectPassRateData,
    rawTestResults,
    allRunsRaw,
  };
}
