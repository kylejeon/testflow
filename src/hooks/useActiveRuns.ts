import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AVATAR_COLORS = ['#6366F1', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6', '#3B82F6', '#06B6D4', '#EF4444'];

export type RunStatus = 'new' | 'in_progress' | 'paused' | 'under_review';

export interface ActiveRunItem {
  id: string;
  name: string;
  status: RunStatus;
  projectName: string;
  tcCount: number;
  createdAt: string;
  executedAt: string | null;
  progressPct: number;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  assigneeName: string;
  assigneeInitials: string;
  assigneeColor: string;
  assigneeRole: string;
}

export interface ActiveRunsData {
  runs: ActiveRunItem[];
  totalTCInRuns: number;
  totalUntested: number;
  avgCompletion: number;
  projectCount: number;
}

const ACTIVE_STATUSES: RunStatus[] = ['new', 'in_progress', 'paused', 'under_review'];

export function useActiveRuns() {
  const navigate = useNavigate();
  const [data, setData] = useState<ActiveRunsData | null>(null);
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

      // Get user's project IDs
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.user.id);

      const projectIds = memberRows?.map(m => m.project_id) ?? [];
      if (projectIds.length === 0) { setData(empty()); return; }

      // Fetch active runs + project names in parallel
      const [{ data: runsData }, { data: projectsData }] = await Promise.all([
        supabase
          .from('test_runs')
          .select('id, project_id, name, status, progress, test_case_ids, assignees, assigned_to, created_at, executed_at')
          .in('project_id', projectIds)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name').in('id', projectIds),
      ]);

      const runs = runsData ?? [];
      const projectNameMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => { projectNameMap[p.id] = p.name; });

      // Fetch real test result counts (newest first so statusMap keeps latest per TC)
      const runIds = runs.map(r => r.id);
      const { data: resultsData } = runIds.length > 0
        ? await supabase
            .from('test_results')
            .select('run_id, test_case_id, status, author')
            .in('run_id', runIds)
            .order('created_at', { ascending: false })
        : { data: [] };

      // Group results by run_id, keeping latest status per test_case_id
      type ResultCounts = { passed: number; failed: number; blocked: number; retest: number; untested: number; firstAuthor: string | null };
      const countsByRun: Record<string, ResultCounts> = {};
      const seenTcByRun: Record<string, Set<string>> = {};
      (resultsData ?? []).forEach(r => {
        if (!countsByRun[r.run_id]) {
          countsByRun[r.run_id] = { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0, firstAuthor: null };
          seenTcByRun[r.run_id] = new Set();
        }
        if (!seenTcByRun[r.run_id].has(r.test_case_id)) {
          seenTcByRun[r.run_id].add(r.test_case_id);
          const s = r.status as keyof Omit<ResultCounts, 'firstAuthor'>;
          if (s in countsByRun[r.run_id]) countsByRun[r.run_id][s]++;
          if (!countsByRun[r.run_id].firstAuthor && r.author) countsByRun[r.run_id].firstAuthor = r.author;
        }
      });

      // Collect all unique assignee IDs (from assignees array + assigned_to field)
      const assigneeIds = [...new Set([
        ...runs.flatMap(r => (r.assignees as string[] | null) ?? []),
        ...runs.map(r => r.assigned_to as string | null).filter(Boolean) as string[],
      ].filter(id => id?.length > 0))];
      const profileMap: Record<string, { full_name: string | null; email: string }> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', assigneeIds);
        (profiles ?? []).forEach(p => { profileMap[p.id] = p; });
      }

      function getInitials(name: string): string {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      }

      const runItems: ActiveRunItem[] = runs.map((r, idx) => {
        const tcIds = (r.test_case_ids as string[] | null) ?? [];
        const counts = countsByRun[r.id];

        // Compute accurate counts from test_results; untested = TCs with no result
        const testedTcIds = seenTcByRun[r.id] ?? new Set<string>();
        const passed  = counts?.passed  ?? 0;
        const failed  = counts?.failed  ?? 0;
        const blocked = counts?.blocked ?? 0;
        const retest  = counts?.retest  ?? 0;
        const untested = tcIds.length > 0 ? tcIds.filter(id => !testedTcIds.has(id)).length : (counts?.untested ?? 0);
        const tcCount = tcIds.length || (passed + failed + blocked + retest + untested);
        const total = passed + failed + blocked + retest + untested;
        const progressPct = total > 0 ? Math.round(((passed + failed + blocked + retest) / total) * 100) : (r.progress ?? 0);

        // Resolve assignee: assignees[] → assigned_to → test result author → Unassigned
        const assigneeId = ((r.assignees as string[] | null) ?? [])[0] ?? (r.assigned_to as string | null) ?? null;
        const profile = assigneeId ? profileMap[assigneeId] : null;
        const displayName = profile?.full_name || profile?.email || (assigneeId && !assigneeId.includes('-') ? assigneeId : null) || counts?.firstAuthor || 'Unassigned';

        return {
          id: r.id,
          name: r.name,
          status: r.status as RunStatus,
          projectName: projectNameMap[r.project_id] ?? 'Unknown',
          tcCount,
          createdAt: r.created_at,
          executedAt: r.executed_at,
          progressPct,
          passed,
          failed,
          blocked,
          untested,
          assigneeName: displayName,
          assigneeInitials: getInitials(displayName),
          assigneeColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
          assigneeRole: '',
        };
      });

      const projectCount = new Set(runs.map(r => r.project_id)).size;
      const totalTCInRuns = runItems.reduce((s, r) => s + r.tcCount, 0);
      const totalUntested = runItems.reduce((s, r) => s + r.untested, 0);
      const avgCompletion = runItems.length > 0
        ? Math.round(runItems.reduce((s, r) => s + r.progressPct, 0) / runItems.length)
        : 0;

      setData({ runs: runItems, totalTCInRuns, totalUntested, avgCompletion, projectCount });
    } catch (e) {
      console.error('useActiveRuns:', e);
      setError('Failed to load active runs');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error };
}

function empty(): ActiveRunsData {
  return { runs: [], totalTCInRuns: 0, totalUntested: 0, avgCompletion: 0, projectCount: 0 };
}
