import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PROJECT_COLORS = ['#EC4899', '#6366F1', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444'];

export type PeriodFilter = 'active_run' | '7d' | '30d' | 'all';

export interface PassRateProject {
  dot: string;
  projectName: string;
  passRate: number;
  rateColor: string;
  executed: number;
}

export interface FailedTCItem {
  tcId: string;
  title: string;
  projectName: string;
  priority: string;
  failCount: number;
  lastFailedAt: string;
}

export interface DayPoint {
  label: string;
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  isToday: boolean;
}

export interface PassRateData {
  overallPassRate: number;
  passRateDelta: number | null;
  deltaLabel: string | null;       // "vs last week" | "vs prev 30d" | "vs prev run" | null
  totalExecuted: number;
  passed: number;
  failed: number;
  blocked: number;
  dailyTrend: DayPoint[];
  byProject: PassRateProject[];
  failedItems: FailedTCItem[];
}

function rateColor(r: number): string {
  return r >= 90 ? '#16A34A' : r >= 80 ? '#F59E0B' : '#EF4444';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dedup<T extends { run_id: string; test_case_id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(r => {
    const k = r.test_case_id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function usePassRateReport(period: PeriodFilter) {
  const navigate = useNavigate();
  const [data, setData] = useState<PassRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.user.id);

      const projectIds = memberRows?.map(m => m.project_id) ?? [];
      if (projectIds.length === 0) { setData(empty()); return; }

      const now = new Date();

      const [{ data: projectsData }, { data: runsAll }] = await Promise.all([
        supabase.from('projects').select('id, name').in('id', projectIds),
        supabase.from('test_runs')
          .select('id, project_id, status, executed_at, created_at')
          .in('project_id', projectIds),
      ]);

      const projectNameMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => { projectNameMap[p.id] = p.name; });

      const allRunIds = (runsAll ?? []).map(r => r.id);
      if (allRunIds.length === 0) { setData(empty()); return; }

      const runProjectMap: Record<string, string> = {};
      (runsAll ?? []).forEach(r => { runProjectMap[r.id] = r.project_id; });

      // ── Fetch results and delta based on period ───────────────────────────
      let primaryResults: { run_id: string; test_case_id: string; status: string; created_at: string }[] = [];
      let deltaResults: typeof primaryResults = [];
      let deltaLabel: string | null = null;

      if (period === 'active_run') {
        const activeRuns = (runsAll ?? []).filter(r =>
          ['new', 'in_progress', 'paused', 'under_review'].includes(r.status)
        );
        const activeRunIds = activeRuns.map(r => r.id);

        if (activeRunIds.length === 0) {
          // No active runs → fallback: show all-time data across all runs
          console.log('[PassRate] No active runs, falling back to all-time data. allRunIds:', allRunIds.length);
          const { data: res } = await supabase
            .from('test_results')
            .select('id, run_id, test_case_id, status, created_at')
            .in('run_id', allRunIds)
            .order('created_at', { ascending: false });
          primaryResults = res ?? [];
          console.log('[PassRate] Fallback results:', primaryResults.length);
          deltaLabel = null;
        } else {
          const { data: res } = await supabase
            .from('test_results')
            .select('id, run_id, test_case_id, status, created_at')
            .in('run_id', activeRunIds)
            .order('created_at', { ascending: false });
          primaryResults = res ?? [];
          console.log('[PassRate] Active run results:', primaryResults.length);

          // Delta: most recent completed run(s)
          const completedRuns = (runsAll ?? [])
            .filter(r => r.status === 'completed')
            .sort((a, b) => new Date(b.executed_at ?? b.created_at).getTime() - new Date(a.executed_at ?? a.created_at).getTime())
            .slice(0, activeRunIds.length || 1);

          if (completedRuns.length > 0) {
            const prevRunIds = completedRuns.map(r => r.id);
            const { data: prevRes } = await supabase
              .from('test_results')
              .select('id, run_id, test_case_id, status, created_at')
              .in('run_id', prevRunIds)
              .order('created_at', { ascending: false });
            deltaResults = prevRes ?? [];
            deltaLabel = 'vs prev run';
          }
        }

      } else if (period === '7d') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const [{ data: r7 }, { data: rPrev }] = await Promise.all([
          supabase.from('test_results')
            .select('id, run_id, test_case_id, status, created_at')
            .in('run_id', allRunIds).gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false }),
          supabase.from('test_results')
            .select('id, run_id, test_case_id, status, created_at')
            .in('run_id', allRunIds)
            .gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false }),
        ]);
        primaryResults = r7 ?? [];
        deltaResults = rPrev ?? [];
        deltaLabel = 'vs last week';

      } else if (period === '30d') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const [{ data: r30 }, { data: rPrev }] = await Promise.all([
          supabase.from('test_results')
            .select('id, run_id, test_case_id, status, created_at')
            .in('run_id', allRunIds).gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: false }),
          supabase.from('test_results')
            .select('id, run_id, test_case_id, status, created_at')
            .in('run_id', allRunIds)
            .gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: false }),
        ]);
        primaryResults = r30 ?? [];
        deltaResults = rPrev ?? [];
        deltaLabel = 'vs prev 30d';

      } else {
        // 'all'
        const { data: res } = await supabase
          .from('test_results')
          .select('id, run_id, test_case_id, status, created_at')
          .in('run_id', allRunIds)
          .order('created_at', { ascending: false });
        primaryResults = res ?? [];
        deltaLabel = null; // no delta for all-time
      }

      const rPrimary = primaryResults;
      const rDelta = deltaResults;

      // ── Summary stats ──────────────────────────────────────────────────────
      console.log('[PassRate] rPrimary count:', rPrimary.length, 'period:', period);
      const totalExecuted = rPrimary.filter(r => r.status !== 'untested').length;
      const passed = rPrimary.filter(r => r.status === 'passed').length;
      const failed = rPrimary.filter(r => r.status === 'failed').length;
      const blocked = rPrimary.filter(r => r.status === 'blocked').length;
      const overallPassRate = totalExecuted > 0
        ? parseFloat(((passed / totalExecuted) * 100).toFixed(1)) : 0;

      let passRateDelta: number | null = null;
      if (deltaLabel && rDelta.length > 0) {
        const prevTotal = rDelta.filter(r => r.status !== 'untested').length;
        const prevPassed = rDelta.filter(r => r.status === 'passed').length;
        const prevRate = prevTotal > 0 ? (prevPassed / prevTotal) * 100 : null;
        const curRate = totalExecuted > 0 ? (passed / totalExecuted) * 100 : null;
        if (prevRate !== null && curRate !== null) {
          passRateDelta = parseFloat((curRate - prevRate).toFixed(1));
        }
      }

      // ── Daily trend ────────────────────────────────────────────────────────
      const dailyTrend: DayPoint[] = [];

      if (period === 'active_run' || period === '7d' || period === '30d') {
        const days = period === '30d' ? 30 : 7;
        for (let d = days - 1; d >= 0; d--) {
          const dayStart = new Date(now);
          dayStart.setDate(dayStart.getDate() - d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);
          const dayStartISO = dayStart.toISOString();
          const dayEndISO = dayEnd.toISOString();
          const isToday = d === 0;
          const dayResults = primaryResults.filter(r => r.created_at >= dayStartISO && r.created_at <= dayEndISO);
          const label = d === 0
            ? 'Today'
            : dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dailyTrend.push({
            label, date: dayStartISO,
            passed: dayResults.filter(r => r.status === 'passed').length,
            failed: dayResults.filter(r => r.status === 'failed').length,
            blocked: dayResults.filter(r => r.status === 'blocked').length,
            isToday,
          });
        }
      } else {
        // 'all' — monthly buckets, up to 12 months
        for (let m = 11; m >= 0; m--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999);
          const mStartISO = monthStart.toISOString();
          const mEndISO = monthEnd.toISOString();
          const isToday = m === 0;
          const monthResults = primaryResults.filter(r => r.created_at >= mStartISO && r.created_at <= mEndISO);
          const label = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          dailyTrend.push({
            label, date: mStartISO,
            passed: monthResults.filter(r => r.status === 'passed').length,
            failed: monthResults.filter(r => r.status === 'failed').length,
            blocked: monthResults.filter(r => r.status === 'blocked').length,
            isToday,
          });
        }
      }

      // ── Pass Rate by Project ───────────────────────────────────────────────
      const projStats: Record<string, { passed: number; executed: number }> = {};
      rPrimary.forEach(r => {
        const pid = runProjectMap[r.run_id];
        if (!pid) return;
        if (!projStats[pid]) projStats[pid] = { passed: 0, executed: 0 };
        if (r.status !== 'untested') {
          projStats[pid].executed++;
          if (r.status === 'passed') projStats[pid].passed++;
        }
      });

      const byProject: PassRateProject[] = Object.entries(projStats)
        .map(([pid, s], i) => {
          const rate = s.executed > 0 ? parseFloat(((s.passed / s.executed) * 100).toFixed(1)) : 0;
          return {
            dot: PROJECT_COLORS[i % PROJECT_COLORS.length],
            projectName: projectNameMap[pid] ?? 'Unknown',
            passRate: rate,
            rateColor: rateColor(rate),
            executed: s.executed,
          };
        })
        .filter(p => p.executed > 0)
        .sort((a, b) => b.passRate - a.passRate);

      // ── Failed TC items ────────────────────────────────────────────────────
      let failedItems: FailedTCItem[] = [];
      const failedResults = rPrimary.filter(r => r.status === 'failed');
      const tcIds = [...new Set(
        failedResults.map(r => r.test_case_id).filter((id): id is string => !!id)
      )].slice(0, 10);

      if (tcIds.length > 0) {
        const { data: tcData } = await supabase
          .from('test_cases')
          .select('id, title, priority, project_id')
          .in('id', tcIds);

        const tcMap: Record<string, { title: string; priority: string; projectId: string }> = {};
        (tcData ?? []).forEach(tc => {
          tcMap[tc.id] = { title: tc.title, priority: tc.priority, projectId: tc.project_id };
        });

        const failCounts: Record<string, { count: number; lastAt: string }> = {};
        failedResults.forEach(r => {
          if (!r.test_case_id) return;
          if (!failCounts[r.test_case_id]) failCounts[r.test_case_id] = { count: 0, lastAt: r.created_at };
          failCounts[r.test_case_id].count++;
          if (r.created_at > failCounts[r.test_case_id].lastAt) {
            failCounts[r.test_case_id].lastAt = r.created_at;
          }
        });

        failedItems = tcIds
          .map(id => ({
            tcId: id,
            title: tcMap[id]?.title ?? `Test Case ${id.slice(0, 8)}`,
            projectName: tcMap[id] ? (projectNameMap[tcMap[id].projectId] ?? 'Unknown') : 'Unknown',
            priority: tcMap[id]?.priority ?? 'medium',
            failCount: failCounts[id]?.count ?? 1,
            lastFailedAt: timeAgo(failCounts[id]?.lastAt ?? new Date().toISOString()),
          }))
          .sort((a, b) => b.failCount - a.failCount);
      }

      setData({
        overallPassRate, passRateDelta, deltaLabel,
        totalExecuted, passed, failed, blocked,
        dailyTrend, byProject, failedItems,
      });
    } catch (e) {
      console.error('usePassRateReport:', e);
      setError('Failed to load pass rate data');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error };
}

function empty(): PassRateData {
  return {
    overallPassRate: 0, passRateDelta: null, deltaLabel: null,
    totalExecuted: 0, passed: 0, failed: 0, blocked: 0,
    dailyTrend: [], byProject: [], failedItems: [],
  };
}
