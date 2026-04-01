import type { Milestone } from './supabase';

export interface RollupResult {
  totalTCs: number;
  completedTCs: number;
  passedTCs: number;
  failedTCs: number;
  blockedTCs: number;
  retestTCs: number;
  passRate: number;
  coverageRate: number;
  derivedStatus: Milestone['status'];
  derivedStartDate: string | null;
  derivedEndDate: string | null;
  dateWarnings: string[];
}

/**
 * Parent milestone의 roll-up 통계를 계산한다.
 *
 * @param parent - Parent milestone
 * @param subs - Sub milestones 배열
 * @param allRuns - 프로젝트의 모든 runs
 * @param resultsByRun - run_id → test_results[] 맵
 */
export function computeRollup(
  parent: Milestone,
  subs: Milestone[],
  allRuns: any[],
  resultsByRun: Map<string, any[]>
): RollupResult {
  // 1. 대상 milestone IDs (parent 직속 + 모든 sub)
  const targetIds = new Set([parent.id, ...subs.map(s => s.id)]);

  // 2. 대상 runs
  const targetRuns = allRuns.filter(r => targetIds.has(r.milestone_id));

  // 3. TC별 최신 상태 집계
  let total = 0, completed = 0, passed = 0, failed = 0, blocked = 0, retest = 0;

  targetRuns.forEach(run => {
    const results = resultsByRun.get(run.id) || [];
    const statusMap = new Map<string, string>();
    results.forEach((r: any) => {
      if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
    });

    const tcIds: string[] = run.test_case_ids || [];
    total += tcIds.length;

    tcIds.forEach(tcId => {
      const s = statusMap.get(tcId);
      if (s === 'passed')        { completed++; passed++; }
      else if (s === 'failed')   { completed++; failed++; }
      else if (s === 'blocked')  { completed++; blocked++; }
      else if (s === 'retest')   { completed++; retest++; }
    });
  });

  // 4. 비율 계산
  const passRate = completed > 0 ? Math.round((passed / completed) * 1000) / 10 : 0;
  const coverageRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  // 5. 상태 자동 결정
  const derivedStatus = deriveStatus(subs);

  // 6. 기간 자동 계산
  const { start_date, end_date } = deriveDates(subs);

  // 7. 기간 경고
  const dateWarnings = checkDateOverflow(parent, subs);

  return {
    totalTCs: total,
    completedTCs: completed,
    passedTCs: passed,
    failedTCs: failed,
    blockedTCs: blocked,
    retestTCs: retest,
    passRate,
    coverageRate,
    derivedStatus,
    derivedStartDate: start_date,
    derivedEndDate: end_date,
    dateWarnings,
  };
}

function deriveStatus(subs: Milestone[]): Milestone['status'] {
  if (subs.length === 0) return 'upcoming';
  const statuses = subs.map(s => s.status);
  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.some(s => s === 'past_due'))   return 'past_due';
  if (statuses.some(s => s === 'started'))    return 'started';
  return 'upcoming';
}

function deriveDates(subs: Milestone[]) {
  const starts = subs.map(s => s.start_date).filter(Boolean).map(d => new Date(d!).getTime());
  const ends = subs.map(s => s.end_date).filter(Boolean).map(d => new Date(d!).getTime());
  return {
    start_date: starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null,
    end_date: ends.length > 0 ? new Date(Math.max(...ends)).toISOString() : null,
  };
}

function checkDateOverflow(parent: Milestone, subs: Milestone[]): string[] {
  const warnings: string[] = [];
  if (!parent.start_date || !parent.end_date) return warnings;
  const pStart = new Date(parent.start_date).getTime();
  const pEnd = new Date(parent.end_date).getTime();
  subs.forEach(sub => {
    if (sub.start_date && new Date(sub.start_date).getTime() < pStart)
      warnings.push(`"${sub.name}" 시작일이 parent 범위 이전`);
    if (sub.end_date && new Date(sub.end_date).getTime() > pEnd)
      warnings.push(`"${sub.name}" 종료일이 parent 범위 이후`);
  });
  return warnings;
}
