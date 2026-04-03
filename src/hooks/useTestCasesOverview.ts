import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PROJECT_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#3B82F6', '#EF4444', '#06B6D4'];

export interface TCOverviewProject {
  projectId: string;
  projectName: string;
  dot: string;
  count: number;
  deltaThisWeek: number;
  passRate: number | null;
}

export interface TCOverviewRecent {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  projectName: string;
  createdAt: string;
  tcIdLabel: string;
}

export interface TCOverviewData {
  totalCount: number;
  deltaThisWeek: number;
  byPriority: { critical: number; high: number; medium: number; low: number };
  byStatus: { active: number; draft: number; deprecated: number };
  projects: TCOverviewProject[];
  weeklyGrowth: { label: string; total: number }[];
  recent: TCOverviewRecent[];
}

export function useTestCasesOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState<TCOverviewData | null>(null);
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

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetches
      const [{ data: projectsData }, { data: allTCs }, { data: runStats }, { data: allTCsForSeq }] = await Promise.all([
        supabase.from('projects').select('id, name, prefix').in('id', projectIds),
        supabase.from('test_cases')
          .select('id, project_id, priority, status, title, created_at, custom_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false }),
        supabase.from('test_runs')
          .select('project_id, passed, failed, blocked, retest')
          .in('project_id', projectIds),
        supabase.from('test_cases')
          .select('id, project_id, custom_id')
          .in('project_id', projectIds)
          .order('created_at', { ascending: true }),
      ]);

      const tcs = allTCs ?? [];
      const projectNameMap: Record<string, string> = {};
      const projectPrefixMap: Record<string, string> = {};
      (projectsData ?? []).forEach(p => {
        projectNameMap[p.id] = p.name;
        if (p.prefix) projectPrefixMap[p.id] = p.prefix;
      });

      // Build TC-ID label map: custom_id > {prefix}-{seq}
      const tcIdLabelMap: Record<string, string> = {};
      const projectTcCounter: Record<string, number> = {};
      (allTCsForSeq ?? []).forEach(tc => {
        if (tc.custom_id) {
          tcIdLabelMap[tc.id] = tc.custom_id;
        } else {
          const prefix = projectPrefixMap[tc.project_id] || 'TC';
          projectTcCounter[prefix] = (projectTcCounter[prefix] || 0) + 1;
          tcIdLabelMap[tc.id] = `${prefix}-${projectTcCounter[prefix].toString().padStart(3, '0')}`;
        }
      });

      // Aggregates
      const totalCount = tcs.length;
      const deltaThisWeek = tcs.filter(tc => tc.created_at >= sevenDaysAgo).length;

      const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
      const byStatus = { active: 0, draft: 0, deprecated: 0 };
      const perProject: Record<string, { count: number; delta: number }> = {};

      tcs.forEach(tc => {
        if (tc.priority in byPriority) byPriority[tc.priority as keyof typeof byPriority]++;
        if (tc.status in byStatus) byStatus[tc.status as keyof typeof byStatus]++;
        if (!perProject[tc.project_id]) perProject[tc.project_id] = { count: 0, delta: 0 };
        perProject[tc.project_id].count++;
        if (tc.created_at >= sevenDaysAgo) perProject[tc.project_id].delta++;
      });

      // Pass rates from test_runs
      const passRateByProject: Record<string, number | null> = {};
      const runsByProject: Record<string, { passed: number; failed: number; blocked: number; retest: number }[]> = {};
      (runStats ?? []).forEach(r => {
        if (!runsByProject[r.project_id]) runsByProject[r.project_id] = [];
        runsByProject[r.project_id].push(r);
      });
      for (const [pid, runs] of Object.entries(runsByProject)) {
        const tested = runs.reduce((s, r) => s + (r.passed ?? 0) + (r.failed ?? 0) + (r.blocked ?? 0) + (r.retest ?? 0), 0);
        const passed = runs.reduce((s, r) => s + (r.passed ?? 0), 0);
        passRateByProject[pid] = tested > 0 ? Math.round((passed / tested) * 100) : null;
      }

      const projects: TCOverviewProject[] = Object.entries(perProject)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([pid, stats], i) => ({
          projectId: pid,
          projectName: projectNameMap[pid] ?? 'Unknown',
          dot: PROJECT_COLORS[i % PROJECT_COLORS.length],
          count: stats.count,
          deltaThisWeek: stats.delta,
          passRate: passRateByProject[pid] ?? null,
        }));

      // Weekly cumulative growth (last 10 weeks)
      const now = Date.now();
      const weeklyGrowth = Array.from({ length: 10 }, (_, i) => {
        const weekEnd = new Date(now - (9 - i) * 7 * 24 * 60 * 60 * 1000).toISOString();
        const total = tcs.filter(tc => tc.created_at <= weekEnd).length;
        return { label: `W${i + 1}`, total };
      });

      // Recent additions (top 8)
      const recent: TCOverviewRecent[] = tcs.slice(0, 8).map(tc => ({
        id: tc.id,
        title: tc.title,
        priority: (tc.priority as 'critical' | 'high' | 'medium' | 'low') ?? 'medium',
        projectName: projectNameMap[tc.project_id] ?? 'Unknown',
        createdAt: tc.created_at,
        tcIdLabel: tcIdLabelMap[tc.id] ?? tc.id.slice(0, 8),
      }));

      setData({ totalCount, deltaThisWeek, byPriority, byStatus, projects, weeklyGrowth, recent });
    } catch (e) {
      console.error('useTestCasesOverview:', e);
      setError('Failed to load test cases data');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error };
}

function empty(): TCOverviewData {
  return {
    totalCount: 0, deltaThisWeek: 0,
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    byStatus: { active: 0, draft: 0, deprecated: 0 },
    projects: [], weeklyGrowth: [], recent: [],
  };
}

export async function exportTestCasesCSV(projectIds: string[], projectNameMap: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();

  // Fetch user date/time format settings
  let dateFormat = 'YYYY-MM-DD';
  let timeFormat: '24h' | '12h' = '24h';
  let timezone = 'UTC';
  let autoDetectTz = true;
  if (session) {
    const { data: prefs } = await supabase
      .from('profiles')
      .select('timezone, date_format, time_format, auto_detect_tz')
      .eq('id', session.user.id)
      .maybeSingle();
    if (prefs) {
      if (prefs.date_format) dateFormat = prefs.date_format;
      if (prefs.time_format) timeFormat = prefs.time_format as '24h' | '12h';
      if (prefs.timezone) timezone = prefs.timezone;
      if (prefs.auto_detect_tz !== null && prefs.auto_detect_tz !== undefined) autoDetectTz = prefs.auto_detect_tz;
    }
  }

  const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    try {
      const tz = autoDetectTz ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;
      const date = new Date(isoString);
      const opts: Intl.DateTimeFormatOptions = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' };
      const parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(date);
      const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
      const year = get('year'), month = get('month'), day = get('day');
      const hour = get('hour'), minute = get('minute'), dayPeriod = get('dayPeriod');
      let datePart = '';
      if (dateFormat === 'MM/DD/YYYY') datePart = `${month}/${day}/${year}`;
      else if (dateFormat === 'DD/MM/YYYY') datePart = `${day}/${month}/${year}`;
      else datePart = `${year}-${month}-${day}`;
      const timePart = timeFormat === '12h' ? `${hour}:${minute} ${dayPeriod}` : `${hour}:${minute}`;
      return `${datePart} ${timePart}`;
    } catch {
      return isoString;
    }
  };

  // Fetch test cases with custom_id and projects with prefix for correct ID labeling
  const [{ data: tcs }, { data: projectsData }] = await Promise.all([
    supabase
      .from('test_cases')
      .select('id, project_id, title, priority, status, created_at, custom_id')
      .in('project_id', projectIds)
      .order('created_at', { ascending: true }),
    supabase.from('projects').select('id, prefix').in('id', projectIds),
  ]);

  const projectPrefixMap: Record<string, string> = {};
  (projectsData ?? []).forEach(p => { if (p.prefix) projectPrefixMap[p.id] = p.prefix; });

  // Build tcIdLabelMap using the same logic as the overview hook
  const tcIdLabelMap: Record<string, string> = {};
  const projectTcCounter: Record<string, number> = {};
  (tcs ?? []).forEach(tc => {
    if (tc.custom_id) {
      tcIdLabelMap[tc.id] = tc.custom_id;
    } else {
      const prefix = projectPrefixMap[tc.project_id] || 'TC';
      projectTcCounter[prefix] = (projectTcCounter[prefix] || 0) + 1;
      tcIdLabelMap[tc.id] = `${prefix}-${projectTcCounter[prefix].toString().padStart(3, '0')}`;
    }
  });

  // Sort descending for CSV output (most recent first)
  const sortedTcs = [...(tcs ?? [])].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  const LIFECYCLE_LABEL: Record<string, string> = { active: 'Active', draft: 'Draft', deprecated: 'Deprecated' };

  const rows = sortedTcs.map(tc => [
    tcIdLabelMap[tc.id] ?? tc.id.slice(0, 8),
    `"${(tc.title ?? '').replace(/"/g, '""')}"`,
    `"${(projectNameMap[tc.project_id] ?? 'Unknown').replace(/"/g, '""')}"`,
    tc.priority ?? '',
    LIFECYCLE_LABEL[(tc.status ?? '').toLowerCase()] ?? tc.status ?? '',
    formatDate(tc.created_at),
  ]);

  const header = ['ID', 'Title', 'Project', 'Priority', 'Lifecycle Status', 'Created At'];
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `testcases-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
