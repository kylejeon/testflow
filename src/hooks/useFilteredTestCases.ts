import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export type ExecStatusFilter = 'all' | 'failed' | 'passed' | 'blocked' | 'untested';
export type PeriodFilter = 'active_run' | '7d' | '30d' | 'all';

export interface FilteredTC {
  id: string;
  tcIdStr: string;       // TC-001 format (created_at ASC rank)
  title: string;
  projectId: string;
  projectName: string;
  priority: string;
  assignee: string | null;
  failCount: number;
  lastFailedAt: string | null;  // ISO string
  lastRunId: string | null;
  lastRunName: string | null;
  execStatus: 'failed' | 'passed' | 'blocked' | 'untested';
}

export interface StatusCounts {
  all: number;
  failed: number;
  passed: number;
  blocked: number;
  untested: number;
}

export interface FilteredTCResult {
  allItems: FilteredTC[];           // All TCs (unfiltered by execStatus)
  statusCounts: StatusCounts;
  projectNames: string[];           // For project dropdown
  loading: boolean;
  error: string | null;
}

export function useFilteredTestCases(period: PeriodFilter): FilteredTCResult {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<FilteredTC[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ all: 0, failed: 0, passed: 0, blocked: 0, untested: 0 });
  const [projectNames, setProjectNames] = useState<string[]>([]);
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

      // 1. Get user's projects
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.user.id);

      const projectIds = memberRows?.map(m => m.project_id) ?? [];
      if (projectIds.length === 0) {
        setAllItems([]);
        setStatusCounts({ all: 0, failed: 0, passed: 0, blocked: 0, untested: 0 });
        setProjectNames([]);
        setLoading(false);
        return;
      }

      // 2. Get all test_cases for those projects (sorted by created_at for TC-ID numbering)
      const { data: tcRows, error: tcErr } = await supabase
        .from('test_cases')
        .select('id, title, priority, assignee, project_id, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: true });

      if (tcErr) throw tcErr;
      const tcs = tcRows ?? [];

      // 3. Build TC-ID map (TC-001, TC-002, ...)
      const tcIdMap: Record<string, string> = {};
      tcs.forEach((tc, idx) => {
        tcIdMap[tc.id] = `TC-${String(idx + 1).padStart(3, '0')}`;
      });

      // 4. Get projects map
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      const projectNameMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => { projectNameMap[p.id] = p.name; });

      // 5. Get test_results based on period
      const { data: runsAll } = await supabase
        .from('test_runs')
        .select('id, status')
        .in('project_id', projectIds);

      const allRunIds = (runsAll ?? []).map(r => r.id);
      let runIds: string[] = allRunIds;

      if (period === 'active_run') {
        const activeIds = (runsAll ?? [])
          .filter(r => ['new', 'in_progress', 'paused', 'under_review'].includes(r.status))
          .map(r => r.id);
        runIds = activeIds.length > 0 ? activeIds : allRunIds; // fallback to all if no active runs
      }

      let resultsQuery = supabase
        .from('test_results')
        .select('test_case_id, run_id, status, created_at')
        .in('run_id', runIds.length > 0 ? runIds : ['__none__']);

      if (period === '7d') {
        resultsQuery = resultsQuery.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (period === '30d') {
        resultsQuery = resultsQuery.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      }

      const { data: resultsData } = await resultsQuery.order('created_at', { ascending: false });
      const results = resultsData ?? [];

      // 6. Get run names for "Last Run" column
      const usedRunIds = [...new Set(results.map(r => r.run_id))];
      const runNameMap: Record<string, string> = {};
      if (usedRunIds.length > 0) {
        const { data: runRows } = await supabase
          .from('test_runs')
          .select('id, name')
          .in('id', usedRunIds);
        (runRows ?? []).forEach(r => { runNameMap[r.id] = r.name; });
      }

      // 7. Aggregate results per TC
      type TCAgg = {
        failCount: number;
        lastFailedAt: string | null;
        lastRunId: string | null;
        statuses: Set<string>;
      };
      const agg: Record<string, TCAgg> = {};

      for (const r of results) {
        const tcId = r.test_case_id;
        if (!agg[tcId]) {
          agg[tcId] = { failCount: 0, lastFailedAt: null, lastRunId: null, statuses: new Set() };
        }
        agg[tcId].statuses.add(r.status);
        if (r.status === 'failed') {
          agg[tcId].failCount++;
          // results are ordered by created_at desc, so first encountered is most recent
          if (!agg[tcId].lastFailedAt) {
            agg[tcId].lastFailedAt = r.created_at;
            agg[tcId].lastRunId = r.run_id;
          }
        }
      }

      // 8. Compute execStatus for each TC
      function computeExecStatus(a: TCAgg | undefined): 'failed' | 'passed' | 'blocked' | 'untested' {
        if (!a || a.statuses.size === 0) return 'untested';
        if (a.statuses.has('failed')) return 'failed';
        if (a.statuses.has('blocked')) return 'blocked';
        if (a.statuses.has('passed')) return 'passed';
        return 'untested';
      }

      // 9. Build FilteredTC list
      const items: FilteredTC[] = tcs.map(tc => {
        const a = agg[tc.id];
        const execStatus = computeExecStatus(a);
        return {
          id: tc.id,
          tcIdStr: tcIdMap[tc.id],
          title: tc.title,
          projectId: tc.project_id,
          projectName: projectNameMap[tc.project_id] ?? 'Unknown',
          priority: tc.priority ?? 'medium',
          assignee: tc.assignee,
          failCount: a?.failCount ?? 0,
          lastFailedAt: a?.lastFailedAt ?? null,
          lastRunId: a?.lastRunId ?? null,
          lastRunName: a?.lastRunId ? (runNameMap[a.lastRunId] ?? null) : null,
          execStatus,
        };
      });

      // 10. Status counts
      const counts: StatusCounts = { all: items.length, failed: 0, passed: 0, blocked: 0, untested: 0 };
      for (const item of items) {
        counts[item.execStatus]++;
      }

      // 11. Project names list
      const pNames = [...new Set(items.map(i => i.projectName))].sort();

      setAllItems(items);
      setStatusCounts(counts);
      setProjectNames(pNames);
    } catch (e: unknown) {
      console.error('[useFilteredTestCases] error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load test cases');
    } finally {
      setLoading(false);
    }
  }

  return { allItems, statusCounts, projectNames, loading, error };
}
