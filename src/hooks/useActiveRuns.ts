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
          .select('id, project_id, name, status, progress, passed, failed, blocked, retest, untested, test_case_ids, assignees, created_at, executed_at')
          .in('project_id', projectIds)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false }),
        supabase.from('projects').select('id, name').in('id', projectIds),
      ]);

      const runs = runsData ?? [];
      const projectNameMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => { projectNameMap[p.id] = p.name; });

      // Collect all unique assignee IDs
      const assigneeIds = [...new Set(runs.flatMap(r => (r.assignees as string[] | null) ?? []).filter(id => id?.length > 0))];
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
        const tcCount = tcIds.length || ((r.passed ?? 0) + (r.failed ?? 0) + (r.blocked ?? 0) + (r.retest ?? 0) + (r.untested ?? 0));
        const assigneeId = ((r.assignees as string[] | null) ?? [])[0] ?? null;
        const profile = assigneeId ? profileMap[assigneeId] : null;
        const displayName = profile?.full_name || profile?.email || (assigneeId ?? 'Unassigned');
        const total = (r.passed ?? 0) + (r.failed ?? 0) + (r.blocked ?? 0) + (r.retest ?? 0) + (r.untested ?? 0);
        const passed = r.passed ?? 0;
        const progressPct = total > 0 ? Math.round(((total - (r.untested ?? 0)) / total) * 100) : (r.progress ?? 0);

        return {
          id: r.id,
          name: r.name,
          status: r.status as RunStatus,
          projectName: projectNameMap[r.project_id] ?? 'Unknown',
          tcCount: tcCount || total,
          createdAt: r.created_at,
          executedAt: r.executed_at,
          progressPct,
          passed,
          failed: r.failed ?? 0,
          blocked: r.blocked ?? 0,
          untested: r.untested ?? 0,
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
