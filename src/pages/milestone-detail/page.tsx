import PageLoader from '../../components/PageLoader';
import { useToast } from '../../components/Toast';
import { StatusBadge, type TestStatus } from '../../components/StatusBadge';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import ProjectHeader from '../../components/ProjectHeader';
import OverviewTab from './OverviewTab';
import IssuesList from '../../components/issues/IssuesList';

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  parent_milestone_id: string | null;
  ai_risk_cache?: {
    generated_at: string;
    stale_after?: string;
    risk_level: 'on_track' | 'at_risk' | 'critical';
    confidence: number;
    summary: string;
    bullets: string[];
    recommendations: string[];
    meta?: any;
  } | null;
}

interface Run {
  id: string;
  name: string;
  status: string;
  milestone_id: string;
  test_case_ids: string[];
  assignees?: string[];
  created_at: string;
  passed_count?: number;
  failed_count?: number;
  blocked_count?: number;
  retest_count?: number;
  untested_count?: number;
  authors?: string[];
}

interface FailedBlockedTcItem {
  tcId: string;
  tcName: string;
  status: 'failed' | 'blocked';
  runName: string;
  author: string;
  createdAt: string;
}

interface Session {
  id: string;
  name: string;
  status: string;
  milestone_id: string;
  created_at: string;
  actualStatus?: string;
  activityData?: string[];
}

interface Issue {
  id: string;
  title: string;
  url: string;
  status?: string;
  runId: string;
  runName: string;
  testCaseId: string;
  testCaseName?: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  type: 'note' | 'passed' | 'failed' | 'retest' | 'blocked';
  testCaseName: string;
  runName: string;
  timestamp: Date;
  author: string;
}

interface TcStats {
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  untested: number;
  total: number;
  passRate: number;
}

// ── Standalone queryFn (outside component for stable reference) ──────────────

type RollupStats = {
  total: number;
  completed: number;
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;
  coverage: number;
};

type MilestoneDetailData = {
  project: any | null;
  milestone: Milestone | null;
  subMilestones: Milestone[];
  runs: Run[];
  sessions: Session[];
  issues: Issue[];
  activityLogs: ActivityLog[];
  activityStats: { notes: number; passed: number; failed: number; retest: number };
  contributorProfiles: Map<string, { name: string | null; url: string | null }>;
  assigneeProfiles: Map<string, { name: string | null; email: string; url: string | null }>;
  runAssigneeMap: Map<string, string[]>;
  tcStats: TcStats;
  failedBlockedTcs: FailedBlockedTcItem[];
  issuesCount: number;
  subMilestoneProgress: Map<string, number>;
  rollupStats: RollupStats | null;
  aggregatedRunIds: string[];
};

async function loadMilestoneDetailData(projectId: string, milestoneId: string): Promise<MilestoneDetailData> {
  const { data: projectData, error: projectError } = await supabase
    .from('projects').select('*').eq('id', projectId).single();
  if (projectError) throw projectError;

  const { data: milestoneData, error: milestoneError } = await supabase
    .from('milestones').select('*').eq('id', milestoneId).single();
  if (milestoneError) throw milestoneError;

  // Auto-correct milestone status
  let correctedMilestone = { ...milestoneData };
  const today = new Date(); today.setHours(0, 0, 0, 0);

  if (correctedMilestone.start_date && correctedMilestone.status === 'upcoming') {
    const [sy, sm, sd] = correctedMilestone.start_date.split('T')[0].split('-');
    const startDate = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd));
    if (startDate <= today) {
      correctedMilestone.status = 'started';
      await supabase.from('milestones').update({ status: 'started' }).eq('id', milestoneId);
    }
  }
  if (correctedMilestone.end_date && correctedMilestone.status !== 'completed') {
    const [ey, em, ed] = correctedMilestone.end_date.split('T')[0].split('-');
    const endDate = new Date(parseInt(ey), parseInt(em) - 1, parseInt(ed));
    if (endDate < today) {
      correctedMilestone.status = 'past_due';
      await supabase.from('milestones').update({ status: 'past_due' }).eq('id', milestoneId);
    } else if (correctedMilestone.status === 'past_due') {
      correctedMilestone.status = 'started';
      await supabase.from('milestones').update({ status: 'started' }).eq('id', milestoneId);
    }
  }

  const { data: subMilestonesData } = await supabase
    .from('milestones').select('*').eq('parent_milestone_id', milestoneId).order('start_date', { ascending: true });
  const subMilestoneIds = (subMilestonesData || []).map((s: any) => s.id);

  const { data: runsData, error: runsError } = await supabase
    .from('test_runs').select('*').eq('milestone_id', milestoneId).order('created_at', { ascending: false });
  if (runsError) throw runsError;

  const allTestCaseIds = new Set<string>();
  (runsData || []).forEach(run => { run.test_case_ids.forEach((id: string) => allTestCaseIds.add(id)); });

  const testCaseNameMap = new Map<string, string>();
  if (allTestCaseIds.size > 0) {
    const { data: testCasesData } = await supabase
      .from('test_cases').select('id, title').in('id', Array.from(allTestCaseIds));
    (testCasesData || []).forEach(tc => { testCaseNameMap.set(tc.id, tc.title); });
  }

  const allIssues: Issue[] = [];
  const allActivityLogs: ActivityLog[] = [];
  let notesCount = 0, passedCount = 0, failedCount = 0, retestCount = 0;
  const allRawResults: Array<{ tcId: string; status: string; createdAt: string; runId: string; runName: string; author: string }> = [];

  const runsWithProgress = await Promise.all(
    (runsData || []).map(async (run) => {
      const { data: testResultsData } = await supabase
        .from('test_results')
        .select('test_case_id, status, issues, created_at, note, author')
        .eq('run_id', run.id)
        .order('created_at', { ascending: false });

      const statusMap = new Map<string, string>();
      const runAuthors = new Set<string>();

      testResultsData?.forEach(result => {
        allRawResults.push({ tcId: result.test_case_id, status: result.status, createdAt: result.created_at, runId: run.id, runName: run.name, author: result.author || '' });
        if (result.author && result.author.trim()) runAuthors.add(result.author);
        if (!statusMap.has(result.test_case_id)) statusMap.set(result.test_case_id, result.status);

        if (result.status && result.status !== 'untested') {
          allActivityLogs.push({
            id: `${run.id}-${result.test_case_id}-${result.created_at}-status`,
            type: result.status as ActivityLog['type'],
            testCaseName: testCaseNameMap.get(result.test_case_id) || 'Unknown Test Case',
            runName: run.name,
            timestamp: new Date(result.created_at),
            author: result.author || 'Unknown',
          });
        }

        const autoNotePatterns = ['Status changed to', 'Passed via', 'via Pass', 'via pass'];
        const isAutoNote = autoNotePatterns.some(pattern => result.note?.includes(pattern));
        if (result.note && result.note.trim() && !isAutoNote) {
          allActivityLogs.push({
            id: `${run.id}-${result.test_case_id}-${result.created_at}-note`,
            type: 'note',
            testCaseName: testCaseNameMap.get(result.test_case_id) || 'Unknown Test Case',
            runName: run.name,
            timestamp: new Date(result.created_at),
            author: result.author || 'Unknown',
          });
          notesCount++;
        }

        if (result.status === 'passed') passedCount++;
        if (result.status === 'failed') failedCount++;
        if (result.status === 'retest') retestCount++;
      });

      let passed_count = 0, failed_count = 0, blocked_count = 0, retest_count = 0, untested_count = 0;
      run.test_case_ids.forEach((tcId: string) => {
        const status = statusMap.get(tcId) || 'untested';
        switch (status) {
          case 'passed': passed_count++; break;
          case 'failed': failed_count++; break;
          case 'blocked': blocked_count++; break;
          case 'retest': retest_count++; break;
          default: untested_count++;
        }
      });

      return { ...run, passed_count, failed_count, blocked_count, retest_count, untested_count, authors: Array.from(runAuthors).slice(0, 4) };
    })
  );

  // Sub milestone progress
  let parentTotal = 0, parentTested = 0;
  runsWithProgress.forEach(run => {
    parentTotal += run.test_case_ids.length;
    parentTested += (run.passed_count || 0) + (run.failed_count || 0) + (run.blocked_count || 0) + (run.retest_count || 0);
  });
  const parentProgressPct = parentTotal > 0 ? Math.round((parentTested / parentTotal) * 100) : 0;

  const subMilestoneProgress = new Map<string, number>();
  let rollupStats: RollupStats | null = null;
  // Sub aggregates computed inside the block below and finalized after
  // parent-only counters are known.
  let subTotals: { total: number; completed: number; passed: number; failed: number; blocked: number } | null = null;

  let subRunIdsForAggregation: string[] = [];
  if (subMilestoneIds.length > 0) {
    const { data: subRunsData } = await supabase
      .from('test_runs').select('id, milestone_id, test_case_ids, name').in('milestone_id', subMilestoneIds);

    if (subRunsData && subRunsData.length > 0) {
      const subRunIds = subRunsData.map((r: any) => r.id);
      subRunIdsForAggregation = subRunIds;
      const { data: subResultsData } = await supabase
        .from('test_results').select('run_id, test_case_id, status, created_at, note, author').in('run_id', subRunIds).order('created_at', { ascending: false });

      // Fetch sub test case names for activity log display
      const subTcIds = new Set<string>();
      subRunsData.forEach((r: any) => (r.test_case_ids || []).forEach((id: string) => subTcIds.add(id)));
      if (subTcIds.size > 0) {
        const existingIds = new Set(testCaseNameMap.keys());
        const missingIds = Array.from(subTcIds).filter(id => !existingIds.has(id));
        if (missingIds.length > 0) {
          const { data: subTcData } = await supabase
            .from('test_cases').select('id, title').in('id', missingIds);
          (subTcData || []).forEach((tc: any) => testCaseNameMap.set(tc.id, tc.title));
        }
      }

      const subRunNameMap = new Map<string, string>();
      subRunsData.forEach((r: any) => subRunNameMap.set(r.id, r.name || ''));

      const runStatusMaps = new Map<string, Map<string, string>>();
      (subResultsData || []).forEach((r: any) => {
        if (!runStatusMaps.has(r.run_id)) runStatusMaps.set(r.run_id, new Map());
        const sm = runStatusMaps.get(r.run_id)!;
        if (!sm.has(r.test_case_id)) sm.set(r.test_case_id, r.status);

        // Merge into allRawResults / globalTcStatusMap / allActivityLogs (rollup 반영)
        const runName = subRunNameMap.get(r.run_id) || '';
        allRawResults.push({
          tcId: r.test_case_id,
          status: r.status,
          createdAt: r.created_at,
          runId: r.run_id,
          runName,
          author: r.author || '',
        });

        if (r.status && r.status !== 'untested') {
          allActivityLogs.push({
            id: `${r.run_id}-${r.test_case_id}-${r.created_at}-status`,
            type: r.status as ActivityLog['type'],
            testCaseName: testCaseNameMap.get(r.test_case_id) || 'Unknown Test Case',
            runName,
            timestamp: new Date(r.created_at),
            author: r.author || 'Unknown',
          });
        }

        const autoNotePatterns = ['Status changed to', 'Passed via', 'via Pass', 'via pass'];
        const isAutoNote = autoNotePatterns.some(pattern => r.note?.includes(pattern));
        if (r.note && r.note.trim() && !isAutoNote) {
          allActivityLogs.push({
            id: `${r.run_id}-${r.test_case_id}-${r.created_at}-note`,
            type: 'note',
            testCaseName: testCaseNameMap.get(r.test_case_id) || 'Unknown Test Case',
            runName,
            timestamp: new Date(r.created_at),
            author: r.author || 'Unknown',
          });
          notesCount++;
        }

        if (r.status === 'passed') passedCount++;
        if (r.status === 'failed') failedCount++;
        if (r.status === 'retest') retestCount++;
      });

      const subProgressAccum = new Map<string, { tested: number; total: number }>();
      let subTotal = 0, subCompleted = 0, subPassed = 0, subFailed = 0, subBlocked = 0;

      subRunsData.forEach((run: any) => {
        const statusMap = runStatusMaps.get(run.id) || new Map();
        const total = (run.test_case_ids || []).length;
        if (total === 0) return;
        let tested = 0;
        (run.test_case_ids || []).forEach((tcId: string) => {
          const s = statusMap.get(tcId);
          if (s && s !== 'untested') tested++;
          subTotal++;
          if (s === 'passed')       { subCompleted++; subPassed++; }
          else if (s === 'failed')  { subCompleted++; subFailed++; }
          else if (s === 'blocked') { subCompleted++; subBlocked++; }
          else if (s === 'retest')  { subCompleted++; }
        });
        const mid = run.milestone_id;
        const existing = subProgressAccum.get(mid) || { tested: 0, total: 0 };
        subProgressAccum.set(mid, { tested: existing.tested + tested, total: existing.total + total });
      });

      subProgressAccum.forEach((v, k) => {
        subMilestoneProgress.set(k, v.total > 0 ? Math.round((v.tested / v.total) * 100) : parentProgressPct);
      });

      // Store sub aggregates for final rollup computation below (after parent-only
      // counters are known).
      subTotals = {
        total: subTotal,
        completed: subCompleted,
        passed: subPassed,
        failed: subFailed,
        blocked: subBlocked,
      };
    }

    subMilestoneIds.forEach(id => {
      if (!subMilestoneProgress.has(id)) subMilestoneProgress.set(id, parentProgressPct);
    });
  }

  // Build globalTcStatusMap and parent-only aggregates AFTER sub merge so that
  // failedBlockedTcList reflects sub TCs as well (AC-13). Also compute
  // parent-only tcStats values which are used when NOT aggregated.
  const globalTcStatusMap = new Map<string, string>();
  [...allRawResults].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach(r => { globalTcStatusMap.set(r.tcId, r.status); });

  // parentOnly* series (for non-aggregated case AND for rollup parent portion)
  const parentOnlyTcStatusMap = new Map<string, string>();
  const parentRunIdSetForFinal = new Set(runsWithProgress.map(r => r.id));
  [...allRawResults]
    .filter(r => parentRunIdSetForFinal.has(r.runId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach(r => { parentOnlyTcStatusMap.set(r.tcId, r.status); });
  let aggPassed = 0, aggFailed = 0, aggBlocked = 0, aggRetest = 0;
  parentOnlyTcStatusMap.forEach(status => {
    if (status === 'passed') aggPassed++;
    else if (status === 'failed') aggFailed++;
    else if (status === 'blocked') aggBlocked++;
    else if (status === 'retest') aggRetest++;
  });
  const aggTotal = allTestCaseIds.size;
  const aggTested = aggPassed + aggFailed + aggBlocked + aggRetest;
  const aggUntested = aggTotal - Math.min(parentOnlyTcStatusMap.size, aggTotal);
  const aggPassRate = aggTested > 0 ? Math.round((aggPassed / aggTested) * 100) : 0;

  // Finalize rollupStats now that parent-only counters are computed.
  if (subTotals) {
    const rollupTotal = parentTotal + subTotals.total;
    const rollupCompleted = parentTested + subTotals.completed;
    const rollupPassed = aggPassed + subTotals.passed;
    const rollupFailed = aggFailed + subTotals.failed;
    const rollupBlocked = aggBlocked + subTotals.blocked;
    const rollupPassRate = rollupCompleted > 0 ? Math.round((rollupPassed / rollupCompleted) * 100) : 0;
    const rollupCoverage = rollupTotal > 0 ? Math.round((rollupCompleted / rollupTotal) * 100) : 0;
    rollupStats = {
      total: rollupTotal,
      completed: rollupCompleted,
      passed: rollupPassed,
      failed: rollupFailed,
      blocked: rollupBlocked,
      passRate: rollupPassRate,
      coverage: rollupCoverage,
    };
  }

  // tcStats — inject rollup values when isAggregated (dev-spec §6-1 option 가)
  const isAggregated = (subMilestonesData || []).length > 0 && rollupStats !== null;
  const finalTcStats: TcStats = isAggregated && rollupStats
    ? {
        passed: rollupStats.passed,
        failed: rollupStats.failed,
        blocked: rollupStats.blocked,
        retest: Math.max(0, rollupStats.completed - rollupStats.passed - rollupStats.failed - rollupStats.blocked),
        untested: Math.max(0, rollupStats.total - rollupStats.completed),
        total: rollupStats.total,
        passRate: rollupStats.passRate,
      }
    : {
        passed: aggPassed,
        failed: aggFailed,
        blocked: aggBlocked,
        retest: aggRetest,
        untested: Math.max(0, aggUntested),
        total: aggTotal,
        passRate: aggPassRate,
      };

  // Assignees
  const runIds = runsWithProgress.map(r => r.id);
  const newRunAssigneeMap = new Map<string, string[]>();
  const allAssigneeIds = new Set<string>();
  if (runIds.length > 0) {
    const { data: rtaData } = await supabase
      .from('run_testcase_assignees').select('run_id, assignee').in('run_id', runIds);
    (rtaData || []).forEach((row: any) => {
      if (!row.assignee) return;
      const existing = newRunAssigneeMap.get(row.run_id) || [];
      if (!existing.includes(row.assignee)) existing.push(row.assignee);
      newRunAssigneeMap.set(row.run_id, existing);
      allAssigneeIds.add(row.assignee);
    });
  }
  if (allTestCaseIds.size > 0) {
    const { data: tcAssigneeData } = await supabase
      .from('test_cases').select('id, assignee').in('id', Array.from(allTestCaseIds)).not('assignee', 'is', null);
    const tcAssigneeMap = new Map<string, string>();
    (tcAssigneeData || []).forEach((tc: any) => { if (tc.assignee) tcAssigneeMap.set(tc.id, tc.assignee); });
    runsWithProgress.forEach(r => {
      if (!newRunAssigneeMap.has(r.id)) {
        const assignees = new Set<string>();
        r.test_case_ids.forEach((tcId: string) => {
          const a = tcAssigneeMap.get(tcId);
          if (a) assignees.add(a);
        });
        if (assignees.size > 0) {
          newRunAssigneeMap.set(r.id, Array.from(assignees));
          assignees.forEach(id => allAssigneeIds.add(id));
        }
      }
    });
  }

  const assigneeProfilesMap = new Map<string, { name: string | null; email: string; url: string | null }>();
  if (allAssigneeIds.size > 0) {
    const assigneeNames = Array.from(allAssigneeIds);
    const { data: apData } = await supabase
      .from('profiles').select('id, full_name, email, avatar_url')
      .or(assigneeNames.map(n => `full_name.eq.${n},email.eq.${n}`).join(','));
    (apData || []).forEach((p: any) => {
      if (p.full_name) assigneeProfilesMap.set(p.full_name, { name: p.full_name, email: p.email || '', url: p.avatar_url || null });
      if (p.email) assigneeProfilesMap.set(p.email, { name: p.full_name, email: p.email || '', url: p.avatar_url || null });
    });
  }

  const failedBlockedTcList: FailedBlockedTcItem[] = [];
  globalTcStatusMap.forEach((status, tcId) => {
    if (status === 'failed' || status === 'blocked') {
      const latestResult = [...allRawResults]
        .filter(r => r.tcId === tcId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      failedBlockedTcList.push({
        tcId,
        tcName: testCaseNameMap.get(tcId) || tcId,
        status: status as 'failed' | 'blocked',
        runName: latestResult?.runName || '',
        author: latestResult?.author || '',
        createdAt: latestResult?.createdAt || '',
      });
    }
  });

  // Contributor profiles
  const allAuthorsSet = new Set([
    ...allActivityLogs.map(l => l.author),
    ...runsWithProgress.flatMap(r => r.authors || []),
  ]);
  const contributorProfiles = new Map<string, { name: string | null; url: string | null }>();
  const validAuthors = Array.from(allAuthorsSet).filter(a => a && a !== 'Unknown');
  if (validAuthors.length > 0) {
    const [byName, byEmail] = await Promise.all([
      supabase.from('profiles').select('full_name, email, avatar_url').in('full_name', validAuthors),
      supabase.from('profiles').select('full_name, email, avatar_url').in('email', validAuthors),
    ]);
    [...(byName.data || []), ...(byEmail.data || [])].forEach((p: any) => {
      const info = { name: p.full_name || null, url: p.avatar_url || null };
      if (p.full_name) contributorProfiles.set(p.full_name, info);
      if (p.email) contributorProfiles.set(p.email, info);
    });
  }

  // Sessions
  const { data: sessionsData } = await supabase
    .from('sessions').select('*').eq('milestone_id', milestoneId).order('created_at', { ascending: false });

  const sessionIds = (sessionsData || []).map((s: any) => s.id);
  const { data: sessionLogsData } = await supabase
    .from('session_logs').select('*').in('session_id', sessionIds).order('created_at', { ascending: false });

  const logsBySession = new Map<string, any[]>();
  (sessionLogsData || []).forEach((log: any) => {
    if (!logsBySession.has(log.session_id)) logsBySession.set(log.session_id, []);
    logsBySession.get(log.session_id)!.push(log);
  });

  const generateActivityData = (logs: any[]) => {
    if (!logs || logs.length === 0) return [{ color: '#E2E8F0', pct: 100 }];
    const counts: Record<string, number> = { note: 0, passed: 0, failed: 0, blocked: 0 };
    logs.forEach(log => { if (log.type in counts) counts[log.type]++; });
    const total = logs.length;
    const segments = [
      { color: '#6366F1', count: counts.note },
      { color: '#7C3AED', count: counts.passed },
      { color: '#EF4444', count: counts.failed },
      { color: '#F59E0B', count: counts.blocked },
    ].filter(s => s.count > 0);
    if (segments.length === 0) return [{ color: '#E2E8F0', pct: 100 }];
    const result = segments.map(s => ({ color: s.color, pct: Math.round((s.count / total) * 100) }));
    const sum = result.reduce((a, s) => a + s.pct, 0);
    if (sum < 100) result[result.length - 1].pct += 100 - sum;
    return result;
  };

  const sessionsWithActivity = (sessionsData || []).map((session: any) => {
    const sessionLogs = logsBySession.get(session.id) || [];
    let actualStatus = session.status;
    if (session.status === 'active') actualStatus = sessionLogs.length === 0 ? 'new' : 'in_progress';
    return { ...session, actualStatus, activityData: generateActivityData(sessionLogs) };
  });

  // Pre-load Issues count so the tab badge shows before user opens Issues tab
  let issuesCountPreload = 0;
  if (runIds.length > 0) {
    try {
      const { data: issueRows } = await supabase
        .from('test_results')
        .select('issues, github_issues')
        .in('run_id', runIds)
        .limit(200);
      for (const r of (issueRows || [])) {
        if (Array.isArray(r.issues)) issuesCountPreload += r.issues.filter(Boolean).length;
        if (Array.isArray(r.github_issues)) issuesCountPreload += r.github_issues.length;
      }
    } catch { /* ignore — badge falls back to live onCountChange */ }
  }

  const aggregatedRunIds = isAggregated
    ? [...runIds, ...subRunIdsForAggregation]
    : runIds;

  return {
    project: projectData,
    milestone: correctedMilestone,
    subMilestones: subMilestonesData || [],
    runs: runsWithProgress,
    sessions: sessionsWithActivity,
    issues: allIssues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    activityLogs: allActivityLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    activityStats: { notes: notesCount, passed: passedCount, failed: failedCount, retest: retestCount },
    contributorProfiles,
    assigneeProfiles: assigneeProfilesMap,
    runAssigneeMap: newRunAssigneeMap,
    tcStats: finalTcStats,
    failedBlockedTcs: failedBlockedTcList,
    subMilestoneProgress,
    rollupStats,
    aggregatedRunIds,
    issuesCount: issuesCountPreload,
  };
}

export default function MilestoneDetail() {
  const { projectId, milestoneId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // ── UI state (user-interactive) ─────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  type OverviewTabKey = 'overview' | 'activity' | 'issues';
  // Map legacy URL params (results/status/burndown) → overview, with replace:true (AC-C2)
  const legacyTabs = new Set(['results', 'status', 'burndown']);
  const activeTab: OverviewTabKey = (rawTab === 'activity' || rawTab === 'issues') ? rawTab : 'overview';

  useEffect(() => {
    if (rawTab && legacyTabs.has(rawTab)) {
      setSearchParams({ tab: 'overview' }, { replace: true });
    } else if (rawTab && rawTab !== 'overview' && rawTab !== 'activity' && rawTab !== 'issues') {
      // Unknown tab — redirect to overview
      setSearchParams({ tab: 'overview' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTab]);

  const setActiveTab = (tab: OverviewTabKey) => {
    setSearchParams({ tab });
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', start_date: '', end_date: '' });
  const [activityStatusFilter, setActivityStatusFilter] = useState<string>('all');
  const [activityPage, setActivityPage] = useState(1);
  const activityPerPage = 10;
  const [liveIssuesCount, setLiveIssuesCount] = useState<number | null>(null);

  // ── React Query ─────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['milestone-detail', milestoneId],
    queryFn: () => loadMilestoneDetailData(projectId!, milestoneId!),
    enabled: !!projectId && !!milestoneId,
    staleTime: 60_000,
  });

  const project = data?.project ?? null;
  const milestone = data?.milestone ?? null;
  const subMilestones = data?.subMilestones ?? [];
  const runs = data?.runs ?? [];
  const sessions = data?.sessions ?? [];
  const activityLogs = data?.activityLogs ?? [];
  const activityStats = data?.activityStats ?? { notes: 0, passed: 0, failed: 0, retest: 0 };
  const contributorProfiles = data?.contributorProfiles ?? new Map();
  const tcStats = data?.tcStats ?? { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0, total: 0, passRate: 0 };
  const failedBlockedTcs = data?.failedBlockedTcs ?? [];
  const issuesCount = liveIssuesCount ?? data?.issuesCount ?? null;
  const subMilestoneProgress = data?.subMilestoneProgress ?? new Map();
  const rollupStats = data?.rollupStats ?? null;
  const aggregatedRunIds = data?.aggregatedRunIds ?? [];
  const isAggregated = subMilestones.length > 0 && rollupStats !== null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return 'Starts TBD';
    const start = formatDate(startDate);
    if (!endDate) return `Starts ${start}`;
    return `${start} – ${formatDate(endDate)}`;
  };

  const calculateMilestoneProgress = () => {
    if (runs.length === 0) return 0;
    let totalTests = 0, completedTests = 0;
    runs.forEach(run => {
      totalTests += run.test_case_ids.length;
      completedTests += (run.passed_count || 0) + (run.failed_count || 0) + (run.blocked_count || 0) + (run.retest_count || 0);
    });
    return totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
  };

  const getDDayBadge = (endDate: string | null) => {
    if (!endDate) return { text: 'No deadline', bg: '#F1F5F9', color: '#64748B' };
    const [ey, em, ed] = endDate.split('T')[0].split('-').map(Number);
    const end = new Date(ey, em - 1, ed);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((end.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0)  return { text: `D+${Math.abs(diffDays)}`, bg: '#EF4444', color: '#fff' };
    if (diffDays === 0) return { text: 'D-Day', bg: '#FEE2E2', color: '#B91C1C' };
    if (diffDays <= 3) return { text: `D-${diffDays}`, bg: '#FEE2E2', color: '#B91C1C' };
    if (diffDays <= 7) return { text: `D-${diffDays}`, bg: '#FEF3C7', color: '#92400E' };
    if (diffDays <= 14) return { text: `D-${diffDays}`, bg: '#DBEAFE', color: '#1E40AF' };
    return { text: `D-${diffDays}`, bg: '#F1F5F9', color: '#475569' };
  };

  const getStatusBadgeStyle = (status: string) => {
    const map: Record<string, { bg: string; color: string; dot: string; label: string }> = {
      upcoming: { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6', label: 'Upcoming' },
      started:  { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6', label: 'In Progress' },
      past_due: { bg: '#F97316', color: '#fff',    dot: '#fff',    label: 'Overdue' },
      completed:{ bg: '#F1F5F9', color: '#475569', dot: '#94A3B8', label: 'Completed' },
    };
    return map[status] || map.upcoming;
  };

  const getRunStatusStyle = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      new:          { bg: '#F1F5F9', color: '#475569', label: 'New' },
      in_progress:  { bg: '#DBEAFE', color: '#1E40AF', label: 'In Progress' },
      paused:       { bg: '#FEF3C7', color: '#92400E', label: 'Paused' },
      under_review: { bg: '#EDE9FE', color: '#6D28D9', label: 'Under Review' },
      completed:    { bg: '#DCFCE7', color: '#166534', label: 'Completed' },
    };
    return map[status] || map.new;
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    try {
      const { error } = await supabase.from('milestones').update({
        name: editFormData.name,
        start_date: editFormData.start_date,
        end_date: editFormData.end_date,
      }).eq('id', milestone.id);
      if (error) throw error;
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['milestone-detail', milestoneId] });
    } catch (error) {
      console.error('마일스톤 수정 오류:', error);
      showToast('Failed to update milestone.', 'error');
    }
  };

  const handleComplete = async () => {
    if (!milestone || milestone.status === 'completed') return;
    try {
      await supabase.from('milestones').update({ status: 'completed' }).eq('id', milestone.id);
      queryClient.setQueryData(['milestone-detail', milestoneId], (old: MilestoneDetailData | undefined) => {
        if (!old?.milestone) return old;
        return { ...old, milestone: { ...old.milestone, status: 'completed' } };
      });
    } catch (e) {
      console.error('complete error:', e);
    }
  };

  const generateChartPoints = (logs: ActivityLog[], type: string) => {
    const days = 14;
    const dailyCounts: number[] = new Array(days).fill(0);
    const now = new Date(); now.setHours(23, 59, 59, 999);
    logs.forEach(log => {
      if (log.type === type) {
        const logDate = new Date(log.timestamp); logDate.setHours(0, 0, 0, 0);
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((todayStart.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff < days) dailyCounts[days - 1 - daysDiff]++;
      }
    });
    return dailyCounts;
  };

  const generateDateLabels = () => {
    const labels: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i -= 2) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }));
    }
    return labels;
  };

  const buildPolylinePoints = (dailyCounts: number[], maxCount: number) => {
    const days = 14;
    return dailyCounts.map((count, idx) => {
      const x = (idx / (days - 1)) * 100;
      const y = 100 - (maxCount > 0 ? (count / maxCount) * 100 : 0);
      return `${x},${y}`;
    }).join(' ');
  };

  const getContributorInitials = (author: string) => {
    if (!author || author === 'Unknown') return 'UN';
    const parts = author.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return author.substring(0, 2).toUpperCase();
  };

  const getAuthorColor = (author: string): string => {
    const colors = ['#6366F1', '#EC4899', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];
    let hash = 0;
    for (let i = 0; i < author.length; i++) hash = (hash * 31 + author.charCodeAt(i)) & 0xFFFF;
    return colors[hash % colors.length];
  };

  if (isLoading) return <PageLoader fullScreen />;

  if (!milestone) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.5rem' }}>마일스톤을 찾을 수 없습니다</div>
            <Link to={`/projects/${projectId}/milestones`} style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>마일스톤 목록으로 돌아가기</Link>
          </div>
        </div>
      </div>
    );
  }

  // When aggregated, progress reflects rollup coverage (AC-4). Otherwise parent-only.
  const progress = isAggregated && rollupStats ? rollupStats.coverage : calculateMilestoneProgress();
  const msBadge = getStatusBadgeStyle(milestone.status);
  const dday = getDDayBadge(milestone.end_date);
  const progressColor = milestone.status === 'past_due' ? '#F97316' : milestone.status === 'completed' ? '#94A3B8' : '#22C55E';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC', fontFamily: 'inherit', overflow: 'hidden' }}>

      {/* ── Row 1: ProjectHeader (Milestones active) ── */}
      <ProjectHeader projectId={projectId!} projectName={project?.name || ''} />

      {/* ── Row 2: Detail Info Bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '1rem 1.5rem 0.875rem', flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', marginBottom: '0.625rem' }}>
          <Link
            to={`/projects/${projectId}/milestones`}
            style={{ color: '#6366F1', fontWeight: 500, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Milestones
          </Link>
          <span style={{ color: '#CBD5E1', fontSize: '0.625rem' }}>›</span>
          <span style={{ color: '#94A3B8', fontWeight: 500 }}>{milestone.name}</span>
        </div>

        {/* Info Row 1: Icon + Name + Status + Date + D-day + Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <div style={{ width: '2rem', height: '2rem', background: '#F1F5F9', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ri-flag-line" style={{ fontSize: '1rem', color: '#6366F1' }} />
          </div>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>{milestone.name}</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '9999px', background: msBadge.bg, color: msBadge.color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: msBadge.dot }} />
            {msBadge.label}
          </span>
          {(milestone.start_date || milestone.end_date) && (
            <span style={{ fontSize: '0.8125rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <i className="ri-calendar-line" style={{ fontSize: '0.875rem' }} />
              {formatDateRange(milestone.start_date, milestone.end_date)}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', background: dday.bg, color: dday.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {dday.text}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => {
                setEditFormData({
                  name: milestone.name,
                  start_date: milestone.start_date ? milestone.start_date.split('T')[0] : '',
                  end_date: milestone.end_date ? milestone.end_date.split('T')[0] : '',
                });
                setShowEditModal(true);
              }}
              style={{ fontSize: '0.8125rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3125rem', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
            >
              <i className="ri-pencil-line" /> Edit
            </button>
            {milestone.status !== 'completed' && (
              <button
                onClick={handleComplete}
                style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '0.375rem', border: 'none', background: '#6366F1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3125rem', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#4F46E5'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#6366F1'}
              >
                <i className="ri-checkbox-circle-line" /> Complete
              </button>
            )}
          </div>
        </div>

        {/* Info Row 2: Progress bar */}
        <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ flex: 1, height: '0.5rem', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progressColor, borderRadius: '9999px', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{progress}%</span>
        </div>

        {/* Info Row 3: TC Summary */}
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          {[
            { dot: '#22C55E', label: 'Passed', value: tcStats.passed },
            { dot: '#EF4444', label: 'Failed', value: tcStats.failed },
            { dot: '#F59E0B', label: 'Blocked', value: tcStats.blocked },
            { dot: '#CBD5E1', label: 'Untested', value: tcStats.untested },
          ].map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#475569', marginLeft: i > 0 ? '0.75rem' : 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.dot, flexShrink: 0, display: 'inline-block' }} />
              {s.label} <span style={{ fontWeight: 600, color: '#0F172A' }}>{s.value}</span>
            </span>
          ))}
          <span style={{ width: 1, height: '1rem', background: '#E2E8F0', margin: '0 0.75rem', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ color: '#64748B' }}>Pass Rate</span>&nbsp;<span style={{ fontWeight: 700, color: '#0F172A' }}>{tcStats.passRate}%</span>
          <span style={{ width: 1, height: '1rem', background: '#E2E8F0', margin: '0 0.75rem', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ color: '#64748B' }}>Total TCs</span>&nbsp;<span style={{ fontWeight: 700, color: '#0F172A' }}>{tcStats.total}</span>
        </div>
      </div>

      {/* ── Row 3: Content Tab Row (42px) ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', background: '#fff', borderBottom: '1px solid #E2E8F0', height: '2.625rem', flexShrink: 0 }}>
        {([
          { key: 'overview', icon: 'ri-dashboard-line',      iconColor: '#6366F1', label: 'Overview', badge: null as number | null },
          { key: 'activity', icon: 'ri-history-fill',        iconColor: '#8B5CF6', label: 'Activity', badge: activityLogs.length > 0 ? activityLogs.length : null },
          { key: 'issues',   icon: 'ri-bug-fill',            iconColor: '#EF4444', label: 'Issues',   badge: issuesCount ?? null },
        ] as const).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3125rem',
                padding: '0 0.75rem', height: '100%',
                fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500,
                color: isActive ? '#6366F1' : '#64748B',
                border: 'none', borderBottom: isActive ? '2.5px solid #6366F1' : '2.5px solid transparent',
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.15s', position: 'relative', top: '1px',
                fontFamily: 'inherit',
              }}
            >
              <i className={tab.icon} style={{ fontSize: '0.875rem', color: tab.iconColor }} />
              {tab.label}
              {tab.badge !== null && (
                <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.0625rem 0.375rem', borderRadius: '9999px', background: isActive ? '#EEF2FF' : '#F1F5F9', color: isActive ? '#6366F1' : '#64748B', minWidth: '1.25rem', textAlign: 'center' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Scrollable Content Area ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC', padding: '1.25rem 1.5rem' }}>

        {/* ════ OVERVIEW TAB ════ */}
        {activeTab === 'overview' && (
          <OverviewTab
            projectId={projectId!}
            milestoneId={milestoneId!}
            milestoneStart={milestone.start_date}
            milestoneEnd={milestone.end_date}
            tcStats={tcStats}
            failedBlockedTcs={failedBlockedTcs}
            activityLogs={activityLogs}
            runs={runs}
            sessions={sessions}
            subMilestones={subMilestones}
            subMilestoneProgress={subMilestoneProgress}
            contributorProfiles={contributorProfiles}
            aiRiskCache={milestone.ai_risk_cache ?? null}
            aggregatedRunIds={isAggregated ? aggregatedRunIds : undefined}
            getSubBadge={getStatusBadgeStyle}
            getRunStatusStyle={getRunStatusStyle}
            formatDateRange={formatDateRange}
            getAuthorColor={getAuthorColor}
            getContributorInitials={getContributorInitials}
            onGoActivity={() => setActiveTab('activity')}
            onGoIssues={() => setActiveTab('issues')}
          />
        )}

        {/* ════ ACTIVITY TAB ════ */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* RUN ACTIVITY Chart */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.625rem', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>RUN ACTIVITY</span>
              </div>
              {(() => {
                const noteCounts = generateChartPoints(activityLogs, 'note');
                const passedCounts = generateChartPoints(activityLogs, 'passed');
                const failedCounts = generateChartPoints(activityLogs, 'failed');
                const retestCounts = generateChartPoints(activityLogs, 'retest');
                const allCounts = [...noteCounts, ...passedCounts, ...failedCounts, ...retestCounts];
                const maxCount = Math.max(...allCounts, 1);
                const yLabels = [maxCount, Math.round(maxCount / 2), 0];
                const hasNotes = noteCounts.some(c => c > 0);
                const hasPassed = passedCounts.some(c => c > 0);
                const hasFailed = failedCounts.some(c => c > 0);
                const hasRetest = retestCounts.some(c => c > 0);
                return (
                  <div className="flex gap-8">
                    <div className="flex-1">
                      <div className="h-48 relative">
                        <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-400">
                          {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                        </div>
                        <div className="ml-10 h-40 relative border-b border-l border-gray-200">
                          <div className="absolute inset-0">
                            <div className="absolute top-0 left-0 right-0 border-t border-gray-100"></div>
                            <div className="absolute top-1/2 left-0 right-0 border-t border-gray-100"></div>
                          </div>
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                            {hasNotes && <polyline fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" points={buildPolylinePoints(noteCounts, maxCount)} />}
                            {hasPassed && <polyline fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" points={buildPolylinePoints(passedCounts, maxCount)} />}
                            {hasFailed && <polyline fill="none" stroke="#ef4444" strokeWidth="2" vectorEffect="non-scaling-stroke" points={buildPolylinePoints(failedCounts, maxCount)} />}
                            {hasRetest && <polyline fill="none" stroke="#f97316" strokeWidth="2" vectorEffect="non-scaling-stroke" points={buildPolylinePoints(retestCounts, maxCount)} />}
                            {!hasNotes && !hasPassed && !hasFailed && !hasRetest && <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
                          </svg>
                        </div>
                        <div className="ml-10 flex justify-between text-xs text-gray-400 mt-2">
                          {generateDateLabels().map((label, idx) => <span key={idx}>{label}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="w-48 space-y-4">
                      <div>
                        <div className="text-lg font-bold text-gray-900">Last 14 days</div>
                        <div className="text-sm text-gray-500">{activityStats.notes + activityStats.passed + activityStats.failed + activityStats.retest} recent changes</div>
                      </div>
                      <div className="space-y-3">
                        {hasNotes && <div className="flex items-center gap-3"><div className="w-4 h-4 bg-blue-500 rounded-sm flex-shrink-0"></div><div><div className="text-sm font-semibold text-gray-900">Notes</div><div className="text-xs text-gray-500">{activityStats.notes} notes added</div></div></div>}
                        {hasPassed && <div className="flex items-center gap-3"><div className="w-4 h-4 bg-green-500 rounded-sm flex-shrink-0"></div><div><div className="text-sm font-semibold text-gray-900">Passed</div><div className="text-xs text-gray-500">{activityStats.passed} set to Passed</div></div></div>}
                        {hasFailed && <div className="flex items-center gap-3"><div className="w-4 h-4 bg-red-500 rounded-sm flex-shrink-0"></div><div><div className="text-sm font-semibold text-gray-900">Failed</div><div className="text-xs text-gray-500">{activityStats.failed} set to Failed</div></div></div>}
                        {hasRetest && <div className="flex items-center gap-3"><div className="w-4 h-4 bg-orange-500 rounded-sm flex-shrink-0"></div><div><div className="text-sm font-semibold text-gray-900">Retest</div><div className="text-xs text-gray-500">{activityStats.retest} set to Retest</div></div></div>}
                        {!hasNotes && !hasPassed && !hasFailed && !hasRetest && <div className="text-sm text-gray-400">No activity in last 14 days</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ACTIVITY List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIVITY</div>
                <div style={{ position: 'relative' }}>
                  <select
                    value={activityStatusFilter}
                    onChange={(e) => { setActivityStatusFilter(e.target.value); setActivityPage(1); }}
                    style={{ appearance: 'none', paddingLeft: '0.75rem', paddingRight: '2rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.875rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                  >
                    <option value="all">Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="retest">Retest</option>
                    <option value="blocked">Blocked</option>
                    <option value="note">Notes</option>
                  </select>
                  <i className="ri-arrow-down-s-line" style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="space-y-6">
                {(() => {
                  const filteredLogs = activityStatusFilter === 'all' ? activityLogs : activityLogs.filter(log => log.type === activityStatusFilter);
                  const totalPages = Math.ceil(filteredLogs.length / activityPerPage);
                  const startIdx = (activityPage - 1) * activityPerPage;
                  const paginatedLogs = filteredLogs.slice(startIdx, startIdx + activityPerPage);

                  const paginatedGrouped = paginatedLogs.reduce((acc, log) => {
                    const dateKey = log.timestamp.toDateString();
                    const today = new Date().toDateString();
                    const yesterday = new Date(Date.now() - 86400000).toDateString();
                    let displayDate = dateKey;
                    if (dateKey === today) displayDate = 'Today';
                    else if (dateKey === yesterday) displayDate = 'Yesterday';
                    else displayDate = log.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!acc[displayDate]) acc[displayDate] = [];
                    acc[displayDate].push(log);
                    return acc;
                  }, {} as Record<string, ActivityLog[]>);

                  if (filteredLogs.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <div style={{ width: '4rem', height: '4rem', background: '#F1F5F9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                          <i className="ri-history-line" style={{ fontSize: '1.875rem', color: '#94A3B8' }} />
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.5rem' }}>No activity yet</div>
                        <div style={{ color: '#64748B', fontSize: '0.875rem' }}>Activity will appear here when test results are recorded.</div>
                      </div>
                    );
                  }

                  return (
                    <>
                      {Object.entries(paginatedGrouped).map(([date, logs]) => (
                        <div key={date}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-gray-700">{date}</span>
                          </div>
                          <div className="ml-4 border-l-2 border-gray-200 pl-6 space-y-3">
                            {logs.map((log) => (
                              <div key={log.id} className="flex items-center gap-4 py-2">
                                {(['passed','failed','blocked','retest','untested'] as TestStatus[]).includes(log.type as TestStatus)
                                  ? <StatusBadge status={log.type as TestStatus} size="sm" />
                                  : <span className="px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap bg-blue-100 text-blue-700">Note</span>
                                }
                                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                  <i className="ri-file-text-line text-gray-500 text-sm"></i>
                                </div>
                                <span className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer truncate max-w-[300px]">{log.testCaseName}</span>
                                <span className="text-sm text-gray-500 ml-auto whitespace-nowrap">
                                  {log.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                                <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {log.author.substring(0, 2).toUpperCase()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                          <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i className="ri-arrow-left-s-line"></i>
                          </button>
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <span className="text-sm font-semibold text-indigo-700">{activityPage}/{totalPages}</span>
                          </div>
                          <button onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))} disabled={activityPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i className="ri-arrow-right-s-line"></i>
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ════ ISSUES TAB ════ */}
        {activeTab === 'issues' && (
          <IssuesList
            runIds={runs.map(r => r.id)}
            onCountChange={setLiveIssuesCount}
            allowRefresh={true}
          />
        )}

      </div>
      {/* ── /scrollable content ── */}

      {/* Edit Milestone Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '28rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem' }}>Edit Milestone</h2>
            <form onSubmit={handleUpdateMilestone}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'Name', key: 'name', type: 'text' },
                  { label: 'Start Date', key: 'start_date', type: 'date' },
                  { label: 'End Date', key: 'end_date', type: 'date' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>{field.label}</label>
                    <input
                      type={field.type}
                      value={editFormData[field.key as keyof typeof editFormData]}
                      onChange={(e) => setEditFormData({ ...editFormData, [field.key]: e.target.value })}
                      required={field.key === 'name'}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: '0.5rem', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569', background: '#F1F5F9', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#fff', background: '#6366F1', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
