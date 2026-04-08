/**
 * useProjectStats
 * 프로젝트별 핵심 지표를 단일 쿼리 묶음으로 집계합니다.
 * - Pass/Fail/Blocked/Untested 카운트 + 추이
 * - 테스트 케이스 커버리지 (실행된 케이스 / 전체)
 * - 마일스톤별 진행률
 * - 우선순위 분포
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type StatsPeriod = '7d' | '14d' | '30d' | 'all';

export interface DailyTrend {
  date: string;        // 'YYYY-MM-DD'
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;    // 0~100
}

export interface PriorityDist {
  priority: string;
  count: number;
  passRate: number;
}

export interface MilestoneStat {
  id: string;
  name: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  passRate: number;
}

export interface ProjectStats {
  // 전체 집계
  totalCases: number;
  totalExecuted: number;        // 실행된 케이스 수 (untested 제외)
  coverageRate: number;         // totalExecuted / totalCases * 100
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  passRate: number;             // passed / (passed+failed+blocked) * 100

  // 기간 내 Run 수
  activeRuns: number;
  completedRuns: number;

  // 이전 기간 대비 델타
  passRateDelta: number;        // 이전 기간 대비 passRate 변화 (pp)
  executedDelta: number;        // 이전 기간 대비 실행 수 변화

  // 시계열 추이
  dailyTrend: DailyTrend[];

  // 우선순위별 분포
  priorityDist: PriorityDist[];

  // 마일스톤별 현황
  milestoneStats: MilestoneStat[];
}

function getDateRange(period: StatsPeriod): { from: string | null; prevFrom: string | null } {
  if (period === 'all') return { from: null, prevFrom: null };
  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - days);
  return {
    from: from.toISOString(),
    prevFrom: prevFrom.toISOString(),
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function useProjectStats(projectId: string, period: StatsPeriod = '30d') {
  const [data, setData] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const { from, prevFrom } = getDateRange(period);

      // ── 1. 전체 테스트 케이스 수 ──────────────────────────
      const { count: totalCases } = await supabase
        .from('test_cases')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // ── 2. 현재 기간 test_results 집계 ───────────────────
      let resultsQuery = supabase
        .from('test_results')
        .select('status, created_at, test_cases!inner(project_id)')
        .eq('test_cases.project_id', projectId);
      if (from) resultsQuery = resultsQuery.gte('created_at', from);

      const { data: results } = await resultsQuery;

      // ── 3. 이전 기간 test_results (delta 계산용) ─────────
      let prevResults: { status: string }[] = [];
      if (prevFrom && from) {
        const { data: pr } = await supabase
          .from('test_results')
          .select('status, test_cases!inner(project_id)')
          .eq('test_cases.project_id', projectId)
          .gte('created_at', prevFrom)
          .lt('created_at', from);
        prevResults = pr || [];
      }

      // ── 4. Active / Completed runs ─────────────────────────
      let runsQuery = supabase
        .from('test_runs')
        .select('id, status')
        .eq('project_id', projectId);
      if (from) runsQuery = runsQuery.gte('created_at', from);
      const { data: runs } = await runsQuery;

      // ── 5. 마일스톤 목록 ───────────────────────────────────
      const { data: milestones } = await supabase
        .from('milestones')
        .select('id, name, status')
        .eq('project_id', projectId);

      // ── 6. 각 마일스톤의 test_results ─────────────────────
      let milestoneStats: MilestoneStat[] = [];
      if (milestones && milestones.length > 0) {
        // test_runs → milestones 연결
        const { data: msRuns } = await supabase
          .from('test_runs')
          .select('id, milestone_id, passed, failed, blocked, untested, test_case_ids')
          .eq('project_id', projectId)
          .not('milestone_id', 'is', null);

        const msMap: Record<string, { passed: number; failed: number; blocked: number; untested: number; total: number }> = {};
        (msRuns || []).forEach((r: any) => {
          if (!r.milestone_id) return;
          if (!msMap[r.milestone_id]) msMap[r.milestone_id] = { passed: 0, failed: 0, blocked: 0, untested: 0, total: 0 };
          msMap[r.milestone_id].passed += r.passed || 0;
          msMap[r.milestone_id].failed += r.failed || 0;
          msMap[r.milestone_id].blocked += r.blocked || 0;
          msMap[r.milestone_id].untested += r.untested || 0;
          msMap[r.milestone_id].total += (r.test_case_ids?.length || 0);
        });

        milestoneStats = milestones.map((m: any) => {
          const s = msMap[m.id] || { passed: 0, failed: 0, blocked: 0, untested: 0, total: 0 };
          const executed = s.passed + s.failed + s.blocked;
          const passRate = executed > 0 ? Math.round((s.passed / executed) * 100) : 0;
          return { id: m.id, name: m.name, status: m.status, ...s, passRate };
        });
      }

      // ── 7. 우선순위 분포 ───────────────────────────────────
      const { data: cases } = await supabase
        .from('test_cases')
        .select('id, priority')
        .eq('project_id', projectId);

      // 케이스별 최신 결과 조회
      const { data: latestResults } = await supabase
        .from('test_results')
        .select('test_case_id, status, created_at, test_cases!inner(project_id, priority)')
        .eq('test_cases.project_id', projectId)
        .order('created_at', { ascending: false });

      // 케이스당 최신 결과만 유지
      const latestByCase: Record<string, string> = {};
      (latestResults || []).forEach((r: any) => {
        if (!latestByCase[r.test_case_id]) latestByCase[r.test_case_id] = r.status;
      });

      const prioMap: Record<string, { count: number; passed: number; executed: number }> = {};
      (cases || []).forEach((tc: any) => {
        if (!prioMap[tc.priority]) prioMap[tc.priority] = { count: 0, passed: 0, executed: 0 };
        prioMap[tc.priority].count++;
        const s = latestByCase[tc.id];
        if (s && s !== 'untested') {
          prioMap[tc.priority].executed++;
          if (s === 'passed') prioMap[tc.priority].passed++;
        }
      });
      const priorityOrder = ['critical', 'high', 'medium', 'low'];
      const priorityDist: PriorityDist[] = priorityOrder
        .filter(p => prioMap[p])
        .map(p => ({
          priority: p,
          count: prioMap[p].count,
          passRate: prioMap[p].executed > 0
            ? Math.round((prioMap[p].passed / prioMap[p].executed) * 100)
            : 0,
        }));

      // ── 8. 집계 ───────────────────────────────────────────
      const r = results || [];
      const passed  = r.filter(x => x.status === 'passed').length;
      const failed  = r.filter(x => x.status === 'failed').length;
      const blocked = r.filter(x => x.status === 'blocked').length;
      const retest  = r.filter(x => x.status === 'retest').length;
      const executed = passed + failed + blocked + retest;
      const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

      // 커버리지: 케이스 중 최소 1번 이상 실행된 케이스 비율
      const executedCaseIds = new Set((results || []).map((x: any) => x.test_case_id).filter(Boolean));
      const coverageRate = (totalCases ?? 0) > 0
        ? Math.round((executedCaseIds.size / (totalCases ?? 1)) * 100)
        : 0;

      // 이전 기간 delta
      const prevPassed  = prevResults.filter(x => x.status === 'passed').length;
      const prevFailed  = prevResults.filter(x => x.status === 'failed').length;
      const prevBlocked = prevResults.filter(x => x.status === 'blocked').length;
      const prevRetest  = prevResults.filter(x => x.status === 'retest').length;
      const prevExecuted = prevPassed + prevFailed + prevBlocked + prevRetest;
      const prevPassRate = prevExecuted > 0 ? Math.round((prevPassed / prevExecuted) * 100) : 0;

      const passRateDelta = passRate - prevPassRate;
      const executedDelta = executed - prevExecuted;

      // Run 집계
      const activeRuns    = (runs || []).filter((rn: any) => ['new', 'in_progress', 'paused', 'under_review'].includes(rn.status)).length;
      const completedRuns = (runs || []).filter((rn: any) => rn.status === 'completed').length;

      // ── 9. 시계열 추이 ────────────────────────────────────
      const dailyTrend: DailyTrend[] = [];
      const days = period === '7d' ? 7 : period === '14d' ? 14 : period === '30d' ? 30 : 14;
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = isoDate(d);
        const dayResults = r.filter((x: any) => x.created_at?.slice(0, 10) === dateStr);
        const dp = dayResults.filter((x: any) => x.status === 'passed').length;
        const df = dayResults.filter((x: any) => x.status === 'failed').length;
        const db = dayResults.filter((x: any) => x.status === 'blocked').length;
        const de = dp + df + db;
        dailyTrend.push({
          date: dateStr,
          passed: dp,
          failed: df,
          blocked: db,
          passRate: de > 0 ? Math.round((dp / de) * 100) : 0,
        });
      }

      setData({
        totalCases: totalCases ?? 0,
        totalExecuted: executedCaseIds.size,
        coverageRate,
        passed,
        failed,
        blocked,
        untested: (totalCases ?? 0) - executedCaseIds.size,
        passRate,
        activeRuns,
        completedRuns,
        passRateDelta,
        executedDelta,
        dailyTrend,
        priorityDist,
        milestoneStats,
      });
    } catch (err: any) {
      setError(err.message || "Couldn't load stats. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId, period]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
