import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PROJECT_COLORS = ['#EC4899', '#6366F1', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444'];

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

export function usePassRateReport() {
  const navigate = useNavigate();
  const [data, setData] = useState<PassRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.user.id);

      const projectIds = memberRows?.map(m => m.project_id) ?? [];
      if (projectIds.length === 0) { setData(empty()); return; }

      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: projectsData }, { data: runsAll }] = await Promise.all([
        supabase.from('projects').select('id, name').in('id', projectIds),
        supabase.from('test_runs')
          .select('id, project_id, passed, failed, blocked, retest, untested, created_at')
          .in('project_id', projectIds),
      ]);

      const projectNameMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => { projectNameMap[p.id] = p.name; });

      const runIds = (runsAll ?? []).map(r => r.id);
      if (runIds.length === 0) { setData(empty()); return; }

      // 2 parallel fetches: last 7d results + prev 7d for delta
      const [{ data: results7d }, { data: resultsPrev7d }] = await Promise.all([
        supabase.from('test_results')
          .select('id, run_id, test_case_id, status, created_at')
          .in('run_id', runIds)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
        supabase.from('test_results')
          .select('id, run_id, test_case_id, status, created_at')
          .in('run_id', runIds)
          .gte('created_at', fourteenDaysAgo)
          .lt('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
      ]);

      // Deduplicate: latest status per (run_id, test_case_id)
      function dedup<T extends { run_id: string; test_case_id: string }>(rows: T[]): T[] {
        const seen = new Set<string>();
        return rows.filter(r => {
          const k = `${r.run_id}::${r.test_case_id}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }

      const r7 = dedup(results7d ?? []);
      const rPrev = dedup(resultsPrev7d ?? []);
      const has7d = r7.length > 0;

      // ── Summary stats ─────────────────────────────────────────────────────
      let totalExecuted: number;
      let passed7d: number;
      let failed7d: number;
      let blocked7d: number;
      let passRateDelta: number | null = null;

      totalExecuted = r7.filter(r => r.status !== 'untested').length;
      passed7d   = r7.filter(r => r.status === 'passed').length;
      failed7d   = r7.filter(r => r.status === 'failed').length;
      blocked7d  = r7.filter(r => r.status === 'blocked').length;

      if (has7d && rPrev.length > 0) {
        const prevTotal  = rPrev.filter(r => r.status !== 'untested').length;
        const prevPassed = rPrev.filter(r => r.status === 'passed').length;
        const prevRate = prevTotal  > 0 ? (prevPassed / prevTotal)  * 100 : null;
        const curRate  = totalExecuted > 0 ? (passed7d / totalExecuted) * 100 : null;
        if (prevRate !== null && curRate !== null) {
          passRateDelta = parseFloat((curRate - prevRate).toFixed(1));
        }
      }

      const overallPassRate = totalExecuted > 0
        ? parseFloat(((passed7d / totalExecuted) * 100).toFixed(1))
        : 0;

      // ── Daily trend (7d window) ───────────────────────────────────────────
      const dailyTrend: DayPoint[] = [];
      for (let d = 6; d >= 0; d--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const dayStartISO = dayStart.toISOString();
        const dayEndISO   = dayEnd.toISOString();
        const isToday = d === 0;

        const dayResults = r7.filter(r => r.created_at >= dayStartISO && r.created_at <= dayEndISO);
        const dayPassed  = dayResults.filter(r => r.status === 'passed').length;
        const dayFailed  = dayResults.filter(r => r.status === 'failed').length;
        const dayBlocked = dayResults.filter(r => r.status === 'blocked').length;

        const label = d === 0
          ? 'Today'
          : dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyTrend.push({ label, date: dayStartISO, passed: dayPassed, failed: dayFailed, blocked: dayBlocked, isToday });
      }

      // ── Pass Rate by Project — 7d primary, all-time fallback ─────────────
      const runProjectMap: Record<string, string> = {};
      (runsAll ?? []).forEach(r => { runProjectMap[r.id] = r.project_id; });

      const projStats: Record<string, { passed: number; executed: number }> = {};

      r7.forEach(r => {
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

      // ── Failed TC items — derived directly from results7d ─────────────────
      let failedItems: FailedTCItem[] = [];

      const failedResults = r7.filter(r => r.status === 'failed');
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
            // Show real title if found; otherwise fall back to short ID
            title: tcMap[id]?.title ?? `Test Case ${id.slice(0, 8)}`,
            projectName: tcMap[id] ? (projectNameMap[tcMap[id].projectId] ?? 'Unknown') : 'Unknown',
            priority: tcMap[id]?.priority ?? 'medium',
            failCount: failCounts[id]?.count ?? 1,
            lastFailedAt: timeAgo(failCounts[id]?.lastAt ?? new Date().toISOString()),
          }))
          .sort((a, b) => b.failCount - a.failCount);

      } else if (!has7d) {
        // No 7d results at all — fall back to TCs with status='failed'
        const { data: failedTCs } = await supabase
          .from('test_cases')
          .select('id, title, priority, project_id, updated_at')
          .in('project_id', projectIds)
          .eq('status', 'failed')
          .order('updated_at', { ascending: false })
          .limit(6);
        failedItems = (failedTCs ?? []).map(tc => ({
          tcId: tc.id,
          title: tc.title,
          projectName: projectNameMap[tc.project_id] ?? 'Unknown',
          priority: tc.priority,
          failCount: 1,
          lastFailedAt: timeAgo(tc.updated_at),
        }));
      }

      setData({
        overallPassRate, passRateDelta,
        totalExecuted, passed: passed7d, failed: failed7d, blocked: blocked7d,
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
    overallPassRate: 0, passRateDelta: null, totalExecuted: 0,
    passed: 0, failed: 0, blocked: 0, dailyTrend: [], byProject: [], failedItems: [],
  };
}
