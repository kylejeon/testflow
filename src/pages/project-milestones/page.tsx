import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PageLoader from '../../components/PageLoader';
import ProjectHeader from '../../components/ProjectHeader';
import { useToast } from '../../components/Toast';
import { notifyProjectMembers } from '../../hooks/useNotifications';
import { triggerWebhook } from '../../hooks/useWebhooks';
import AIPlanAssistantModal from '../project-plans/AIPlanAssistantModal';

import MilestoneSidebar from './MilestoneSidebar';
import { MilestoneCardData } from './MilestoneCard';
import { AdhocRun } from './AdhocRunCard';
import MilestonePlanList, { TestPlanRow, DirectRun } from './MilestonePlanList';
import AdhocPanel from './AdhocPanel';
import NewMilestoneModal from './NewMilestoneModal';
import NewPlanModal from './NewPlanModal';
import PromoteToPlansModal from './PromoteToPlansModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MilestoneRaw {
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
  assigned_to?: string | null;
  date_mode?: 'auto' | 'manual';
}

interface MilestoneWithStats extends MilestoneRaw {
  passedTests: number;
  failedTests: number;
  totalTests: number;
  subMilestones?: MilestoneWithStats[];
  isAggregated?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeMilestoneStats(
  milestone: MilestoneRaw,
  allRuns: any[],
  allResults: any[],
): { passedTests: number; failedTests: number; totalTests: number } {
  const milestoneRuns = allRuns.filter(r => r.milestone_id === milestone.id);
  let passed = 0, failed = 0, total = 0;

  milestoneRuns.forEach(run => {
    const runResults = allResults.filter(r => r.run_id === run.id);
    const statusMap = new Map<string, string>();
    runResults.forEach((r: any) => {
      if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
    });
    const tcIds: string[] = run.test_case_ids || [];
    total += tcIds.length;
    tcIds.forEach(tcId => {
      const s = statusMap.get(tcId);
      if (s === 'passed') passed++;
      else if (s === 'failed' || s === 'blocked' || s === 'retest') failed++;
    });
  });

  return { passedTests: passed, failedTests: failed, totalTests: total };
}

function computeRollupStats(
  parent: MilestoneRaw,
  subs: MilestoneRaw[],
  allRuns: any[],
  allResults: any[],
): { passedTests: number; failedTests: number; totalTests: number } {
  const sources = [parent, ...subs];
  let passed = 0, failed = 0, total = 0;

  sources.forEach(source => {
    const s = computeMilestoneStats(source, allRuns, allResults);
    passed += s.passedTests;
    failed += s.failedTests;
    total += s.totalTests;
  });

  return { passedTests: passed, failedTests: failed, totalTests: total };
}

function deriveStatus(subs: MilestoneRaw[]): MilestoneRaw['status'] {
  if (subs.length === 0) return 'upcoming';
  const statuses = subs.map(s => s.status);
  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.some(s => s === 'past_due')) return 'past_due';
  if (statuses.some(s => s === 'started')) return 'started';
  return 'upcoming';
}

function autoUpdateStatus(ms: MilestoneRaw): MilestoneRaw['status'] {
  let status = ms.status;
  if (ms.start_date && status === 'upcoming') {
    const [y, m, d] = ms.start_date.split('T')[0].split('-');
    const startDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (startDate <= today) status = 'started';
  }
  if (ms.end_date && status !== 'completed') {
    const [y, m, d] = ms.end_date.split('T')[0].split('-');
    const endDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (endDate < today) status = 'past_due';
  }
  return status;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectMilestones() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  // URL state
  const selectedId = searchParams.get('selected');

  // Data state
  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<MilestoneWithStats[]>([]);
  const [allPlans, setAllPlans] = useState<TestPlanRow[]>([]);
  const [adhocRuns, setAdhocRuns] = useState<AdhocRun[]>([]);
  const [allDirectRuns, setAllDirectRuns] = useState<DirectRun[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal state
  const [showNewMilestoneModal, setShowNewMilestoneModal] = useState(false);
  const [newMilestoneParentId, setNewMilestoneParentId] = useState<string | null>(null);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlanMilestoneId, setNewPlanMilestoneId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithStats | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', start_date: '', end_date: '', status: '' as MilestoneRaw['status'] });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMilestoneId, setAiMilestoneId] = useState<string | null>(null);
  const [promoteRunId, setPromoteRunId] = useState<string | null>(null);

  // ── Data Fetching ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      const [projectRes, milestonesRes, runsRes, resultsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('milestones').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
        supabase.from('test_runs').select('*').eq('project_id', projectId),
        supabase.from('test_results').select('run_id, test_case_id, status').order('created_at', { ascending: false }),
      ]);

      if (projectRes.data) setProject(projectRes.data);

      const rawMilestones: MilestoneRaw[] = milestonesRes.data || [];
      const allRuns: any[] = runsRes.data || [];
      const allResults: any[] = resultsRes.data || [];

      // Filter results to only this project's runs
      const runIds = new Set(allRuns.map(r => r.id));
      const projectResults = allResults.filter(r => runIds.has(r.run_id));

      // Auto-update statuses (fire-and-forget)
      rawMilestones.forEach(ms => {
        const newStatus = autoUpdateStatus(ms);
        if (newStatus !== ms.status) {
          supabase.from('milestones').update({ status: newStatus }).eq('id', ms.id).then(() => {});
          ms.status = newStatus;
        }
      });

      // Compute individual stats
      const withStats = rawMilestones.map(ms => ({
        ...ms,
        ...computeMilestoneStats(ms, allRuns, projectResults),
      }));

      // Organize into parent → sub tree
      const parents = withStats.filter(m => !m.parent_milestone_id);
      const organized = parents.map(parent => {
        const subs = withStats.filter(m => m.parent_milestone_id === parent.id);
        if (subs.length === 0) {
          return { ...parent, subMilestones: [], isAggregated: false };
        }
        const rollupStats = computeRollupStats(parent, subs, allRuns, projectResults);
        const derivedStatus = deriveStatus(subs);
        const subStarts = subs.map(s => s.start_date).filter(Boolean).map(d => new Date(d!).getTime());
        const subEnds   = subs.map(s => s.end_date).filter(Boolean).map(d => new Date(d!).getTime());
        const derivedStart = subStarts.length > 0 ? new Date(Math.min(...subStarts)).toISOString() : parent.start_date;
        const derivedEnd   = subEnds.length   > 0 ? new Date(Math.max(...subEnds)).toISOString()   : parent.end_date;
        const displayStart = parent.date_mode === 'manual' ? parent.start_date : derivedStart;
        const displayEnd   = parent.date_mode === 'manual' ? parent.end_date   : derivedEnd;

        return {
          ...parent,
          status: derivedStatus,
          start_date: displayStart,
          end_date: displayEnd,
          ...rollupStats,
          isAggregated: true,
          subMilestones: subs,
        };
      });

      // Build expanded set (auto-expand all parents with subs)
      setExpandedIds(prev => {
        const next = new Set(prev);
        organized.forEach(m => { if ((m.subMilestones?.length ?? 0) > 0) next.add(m.id); });
        return next;
      });

      setMilestones(organized);

      // Ad-hoc runs: no milestone_id AND no test_plan_id
      const adhoc = allRuns.filter(r => !r.milestone_id && !r.test_plan_id).map(r => {
        const runResults = projectResults.filter(res => res.run_id === r.id);
        const statusMap = new Map<string, string>();
        runResults.forEach((res: any) => { if (!statusMap.has(res.test_case_id)) statusMap.set(res.test_case_id, res.status); });
        const total = (r.test_case_ids || []).length;
        let passed = 0, failed = 0;
        (r.test_case_ids || []).forEach((tcId: string) => {
          const s = statusMap.get(tcId);
          if (s === 'passed') passed++;
          else if (s === 'failed' || s === 'blocked') failed++;
        });
        return {
          id: r.id,
          name: r.name || 'Unnamed Run',
          description: r.description || null,
          status: r.status || 'cancelled',
          created_at: r.created_at,
          test_case_ids: r.test_case_ids || [],
          passed,
          failed,
        } as AdhocRun;
      });
      setAdhocRuns(adhoc);

      // Milestone-direct runs: milestone_id set, test_plan_id = null
      const directRuns: DirectRun[] = allRuns
        .filter(r => r.milestone_id && !r.test_plan_id)
        .map(r => {
          const runResults = projectResults.filter(res => res.run_id === r.id);
          const statusMap = new Map<string, string>();
          runResults.forEach((res: any) => { if (!statusMap.has(res.test_case_id)) statusMap.set(res.test_case_id, res.status); });
          const total = (r.test_case_ids || []).length;
          let dpassed = 0, dfailed = 0;
          (r.test_case_ids || []).forEach((tcId: string) => {
            const s = statusMap.get(tcId);
            if (s === 'passed') dpassed++;
            else if (s === 'failed' || s === 'blocked') dfailed++;
          });
          return {
            id: r.id,
            name: r.name || 'Unnamed Run',
            description: r.description || null,
            status: r.status || 'cancelled',
            created_at: r.created_at,
            milestone_id: r.milestone_id,
            test_case_ids: r.test_case_ids || [],
            passed: dpassed,
            failed: dfailed,
          };
        });
      setAllDirectRuns(directRuns);

      // Load test plans with real TC counts
      const loadPlans = async () => {
        // Fetch plans directly (vw_test_plan_stats lacks owner_id and tc_count can be stale)
        const { data: plansData, error: plansError } = await supabase
          .from('test_plans')
          .select('id, name, status, priority, milestone_id, target_date, owner_id, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (!plansData || plansError) return;

        // Fetch TC counts per plan from junction table
        const planIds = plansData.map((p: any) => p.id);
        let tcCountMap = new Map<string, number>();
        if (planIds.length > 0) {
          const { data: tcRows } = await supabase
            .from('test_plan_test_cases')
            .select('test_plan_id')
            .in('test_plan_id', planIds);
          for (const row of (tcRows || [])) {
            tcCountMap.set(row.test_plan_id, (tcCountMap.get(row.test_plan_id) || 0) + 1);
          }
        }

        // Fetch run stats per plan
        let runStatsMap = new Map<string, { passed: number; failed: number }>();
        if (planIds.length > 0) {
          const { data: runsData } = await supabase
            .from('test_runs')
            .select('test_plan_id, passed, failed')
            .in('test_plan_id', planIds);
          for (const r of (runsData || [])) {
            if (!r.test_plan_id) continue;
            const prev = runStatsMap.get(r.test_plan_id) || { passed: 0, failed: 0 };
            runStatsMap.set(r.test_plan_id, {
              passed: prev.passed + (r.passed || 0),
              failed: prev.failed + (r.failed || 0),
            });
          }
        }

        // Fetch owner names
        const ownerIds = [...new Set(plansData.map((p: any) => p.owner_id).filter(Boolean))];
        let ownerMap = new Map<string, string>();
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ownerIds);
          (profiles || []).forEach((p: any) => {
            ownerMap.set(p.id, p.full_name || p.email?.split('@')[0] || 'Unknown');
          });
        }

        setAllPlans(plansData.map((p: any) => {
          const tcCount = tcCountMap.get(p.id) || 0;
          const stats = runStatsMap.get(p.id) || { passed: 0, failed: 0 };
          return {
            id: p.id,
            name: p.name,
            status: p.status,
            priority: p.priority,
            milestone_id: p.milestone_id,
            target_date: p.target_date,
            owner_id: p.owner_id,
            tc_count: tcCount,
            passed: stats.passed,
            failed: stats.failed,
            total: tcCount,
            ownerName: p.owner_id ? (ownerMap.get(p.owner_id) ?? null) : null,
          };
        }));
      };
      loadPlans().catch(() => {});

    } catch (err) {
      console.error('Milestone page data error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-select first milestone on initial load
  useEffect(() => {
    if (!loading && !selectedId && milestones.length > 0) {
      setSearchParams({ selected: milestones[0].id }, { replace: true });
    }
  }, [loading, milestones, selectedId]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const allMilestoneOptions = [
    ...milestones.map(m => ({ id: m.id, name: m.name })),
    ...milestones.flatMap(m => (m.subMilestones ?? []).map((s: any) => ({ id: s.id, name: `  ${s.name}` }))),
  ];

  const selectedMilestone: MilestoneWithStats | undefined =
    selectedId
      ? (milestones.find(m => m.id === selectedId) ||
         milestones.flatMap(m => m.subMilestones ?? []).find((s: any) => s.id === selectedId) as MilestoneWithStats | undefined)
      : undefined;

  const selectedAdhocRun: AdhocRun | undefined =
    selectedId && selectedId !== 'adhoc'
      ? adhocRuns.find(r => r.id === selectedId)
      : undefined;

  const isAdhocSelected = selectedId === 'adhoc' || (selectedAdhocRun !== undefined);

  const milestonePlans = selectedMilestone
    ? allPlans.filter(p => p.milestone_id === selectedMilestone.id)
    : [];

  const milestoneDirectRuns = selectedMilestone
    ? allDirectRuns.filter(r => r.milestone_id === selectedMilestone.id)
    : [];

  const promoteRun = promoteRunId ? adhocRuns.find(r => r.id === promoteRunId) : undefined;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelect = (id: string) => {
    setSearchParams({ selected: id });
  };

  const handleSelectAdhoc = (runId: string) => {
    setSearchParams({ selected: runId });
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateMilestone = async (data: {
    name: string;
    start_date: string;
    end_date: string;
    parent_milestone_id: string | null;
  }) => {
    if (data.parent_milestone_id) {
      const parent = milestones.find(m => m.id === data.parent_milestone_id) ||
        milestones.flatMap(m => m.subMilestones ?? []).find((s: any) => s.id === data.parent_milestone_id);
      if (parent && (parent as any).parent_milestone_id !== null) {
        showToast('Cannot create sub milestone under another sub (max 2 levels).', 'warning');
        return;
      }
    }
    try {
      const { data: newMs, error } = await supabase
        .from('milestones')
        .insert([{
          project_id: projectId,
          status: 'upcoming',
          progress: 0,
          name: data.name,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          parent_milestone_id: data.parent_milestone_id,
        }])
        .select()
        .single();
      if (error) throw error;
      setShowNewMilestoneModal(false);
      setNewMilestoneParentId(null);
      showToast('Milestone created.', 'success');
      await fetchData();
      if (newMs?.id) setSearchParams({ selected: newMs.id });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await notifyProjectMembers({
          projectId: projectId!,
          excludeUserId: user?.id,
          type: 'milestone_started',
          title: 'Milestone created',
          message: `"${data.name}" milestone was created.`,
          link: `/projects/${projectId}/milestones`,
        });
      } catch { /* silent */ }
    } catch (err: any) {
      showToast('Failed to create milestone: ' + err.message, 'error');
    }
  };

  const handleCreatePlan = async (data: {
    name: string;
    status: string;
    priority: string;
    milestone_id: string | null;
    start_date: string;
    end_date: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: plan, error } = await supabase
        .from('test_plans')
        .insert([{
          project_id: projectId,
          name: data.name,
          status: data.status,
          priority: data.priority,
          milestone_id: data.milestone_id,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          owner_id: user?.id || null,
        }])
        .select()
        .single();
      if (error) throw error;
      setShowNewPlanModal(false);
      setNewPlanMilestoneId(null);
      showToast('Test plan created.', 'success');
      await fetchData();
      if (plan?.id && data.milestone_id) {
        navigate(`/projects/${projectId}/milestones/${data.milestone_id}/plans/${plan.id}`);
      } else if (plan?.id) {
        navigate(`/projects/${projectId}/plans/${plan.id}`);
      }
    } catch (err: any) {
      showToast('Failed to create plan: ' + err.message, 'error');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, data: any) => {
    try {
      const { error } = await supabase.from('milestones').update(data).eq('id', milestoneId);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      showToast('Failed to update milestone: ' + err.message, 'error');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    setConfirmDeleteId(milestoneId);
    setEditingMilestone(null);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const { error } = await supabase.from('milestones').delete().eq('id', confirmDeleteId);
      if (error) throw error;
      setConfirmDeleteId(null);
      showToast('Milestone deleted.', 'success');
      fetchData();
      if (selectedId === confirmDeleteId) setSearchParams({});
    } catch (err: any) {
      setConfirmDeleteId(null);
      showToast('Failed to delete milestone: ' + err.message, 'error');
    }
  };

  const handlePromoteToPlans = async (data: { runId: string; milestoneId: string | null; planName: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Create a test plan
      const { data: plan, error: planErr } = await supabase
        .from('test_plans')
        .insert([{
          project_id: projectId,
          name: data.planName,
          status: 'planning',
          priority: 'medium',
          milestone_id: data.milestoneId,
          owner_id: user?.id || null,
        }])
        .select()
        .single();
      if (planErr) throw planErr;

      // Link the run to the plan
      const { error: runErr } = await supabase
        .from('test_runs')
        .update({ test_plan_id: plan.id })
        .eq('id', data.runId);
      if (runErr) throw runErr;

      setPromoteRunId(null);
      showToast(`Run promoted to plan "${data.planName}".`, 'success');
      await fetchData();
      if (data.milestoneId) {
        setSearchParams({ selected: data.milestoneId });
      }
    } catch (err: any) {
      showToast('Failed to promote run: ' + err.message, 'error');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <PageLoader fullScreen />;

  // Determine what to show in main panel
  const showAdhocPanel = isAdhocSelected;
  const showMilestonePanel = !!selectedMilestone;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', overflow: 'hidden' }}>
      <ProjectHeader projectId={projectId || ''} projectName={project?.name || ''} />

      {/* Mobile: hamburger toggle */}
      <div
        style={{
          display: 'none',
          alignItems: 'center', gap: 8,
          padding: '8px 16px', borderBottom: '1px solid var(--border)', background: '#fff',
        }}
        className="lg-hidden"
      >
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}
        >
          ☰
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
          {selectedMilestone ? selectedMilestone.name : 'Milestones'}
        </span>
      </div>

      {/* 2-column body */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Sidebar */}
        <MilestoneSidebar
          milestones={milestones}
          adhocRuns={adhocRuns}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={handleSelect}
          onSelectAdhoc={handleSelectAdhoc}
          onToggleExpand={handleToggleExpand}
          onNewMilestone={() => { setNewMilestoneParentId(null); setShowNewMilestoneModal(true); }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main panel */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {showMilestonePanel && selectedMilestone ? (
            <MilestonePlanList
              projectId={projectId!}
              milestone={selectedMilestone}
              plans={milestonePlans}
              directRuns={milestoneDirectRuns}
              onNewPlan={() => {
                setNewPlanMilestoneId(selectedMilestone.id);
                setShowNewPlanModal(true);
              }}
              onNewRun={() => navigate(`/projects/${projectId}/runs`)}
              onAIAssist={() => {
                setAiMilestoneId(selectedMilestone.id);
                setShowAIModal(true);
              }}
              onEdit={() => {
                setEditFormData({
                  name: selectedMilestone.name,
                  start_date: selectedMilestone.start_date ? selectedMilestone.start_date.split('T')[0] : '',
                  end_date: selectedMilestone.end_date ? selectedMilestone.end_date.split('T')[0] : '',
                  status: selectedMilestone.status,
                });
                setEditingMilestone(selectedMilestone);
              }}
            />
          ) : showAdhocPanel ? (
            <AdhocPanel
              projectId={projectId!}
              runs={adhocRuns}
              onPromote={(runId) => setPromoteRunId(runId)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-subtle)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚩</div>
                <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                  {milestones.length === 0 ? 'No milestones yet' : 'Select a milestone'}
                </p>
                {milestones.length === 0 && (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 16 }}
                    onClick={() => setShowNewMilestoneModal(true)}
                  >
                    Create your first milestone
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}

      {showNewMilestoneModal && (
        <NewMilestoneModal
          parentOptions={milestones.map(m => ({ id: m.id, name: m.name }))}
          defaultParentId={newMilestoneParentId}
          onClose={() => { setShowNewMilestoneModal(false); setNewMilestoneParentId(null); }}
          onSubmit={handleCreateMilestone}
        />
      )}

      {showNewPlanModal && (
        <NewPlanModal
          milestoneOptions={allMilestoneOptions}
          defaultMilestoneId={newPlanMilestoneId}
          onClose={() => { setShowNewPlanModal(false); setNewPlanMilestoneId(null); }}
          onSubmit={handleCreatePlan}
        />
      )}

      {promoteRun && (
        <PromoteToPlansModal
          runId={promoteRun.id}
          runName={promoteRun.name}
          milestoneOptions={allMilestoneOptions}
          onClose={() => setPromoteRunId(null)}
          onSubmit={handlePromoteToPlans}
        />
      )}

      {showAIModal && (
        <AIPlanAssistantModal
          projectId={projectId!}
          milestones={[
            ...milestones.map(m => ({ id: m.id, name: m.name, status: m.status, end_date: m.end_date })),
            ...milestones.flatMap(m => (m.subMilestones ?? []).map((s: any) => ({ id: s.id, name: s.name, status: s.status, end_date: s.end_date }))),
          ]}
          onClose={() => { setShowAIModal(false); setAiMilestoneId(null); }}
          onApply={async (tcIds, planName) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const { data: planData, error: planErr } = await supabase
                .from('test_plans')
                .insert([{ project_id: projectId, milestone_id: aiMilestoneId || null, name: planName, priority: 'medium', status: 'planning', owner_id: user?.id || null }])
                .select().single();
              if (planErr) throw planErr;
              if (tcIds.length > 0) {
                await supabase.from('test_plan_test_cases').insert(
                  tcIds.map(tcId => ({ test_plan_id: planData.id, test_case_id: tcId }))
                );
              }
              const milestoneSnap = aiMilestoneId;
              const planId = planData.id;
              setShowAIModal(false);
              setAiMilestoneId(null);
              showToast(`Plan "${planName}" created with ${tcIds.length} TCs`, 'success');
              fetchData();
              if (milestoneSnap && planId) {
                navigate(`/projects/${projectId}/milestones/${milestoneSnap}/plans/${planId}`);
              } else if (planId) {
                navigate(`/projects/${projectId}/plans/${planId}`);
              }
            } catch (err: any) {
              showToast('Failed to create AI plan: ' + err.message, 'error');
            }
          }}
        />
      )}

      {/* Edit Milestone Modal */}
      {editingMilestone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Edit Milestone</h2>
            {editingMilestone.isAggregated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-50)', border: '1px solid var(--primary-100)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--primary-600)' }}>
                <span>↻</span>
                <span>Roll-up mode — status is auto-aggregated from sub-milestones</span>
              </div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const updateData: any = { name: fd.get('name') };
              if (!editingMilestone.isAggregated) updateData.status = fd.get('status');
              const dateMode = editingMilestone.date_mode || 'auto';
              if (!editingMilestone.isAggregated || dateMode === 'manual') {
                updateData.start_date = fd.get('start_date') || null;
                updateData.end_date = fd.get('end_date') || null;
              }
              handleUpdateMilestone(editingMilestone.id, updateData);
              setEditingMilestone(null);
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Name</label>
                  <input className="input" type="text" name="name" defaultValue={editFormData.name} required />
                </div>
                {!editingMilestone.isAggregated && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Status</label>
                    <select className="input" name="status" defaultValue={editFormData.status} style={{ background: '#fff' }}>
                      <option value="upcoming">Upcoming</option>
                      <option value="started">In Progress</option>
                      <option value="past_due">Overdue</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Start Date</label>
                    <input
                      className="input"
                      type="date"
                      name="start_date"
                      defaultValue={editFormData.start_date}
                      disabled={editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode)}
                      style={{ opacity: (editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode)) ? 0.5 : 1 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>End Date</label>
                    <input
                      className="input"
                      type="date"
                      name="end_date"
                      defaultValue={editFormData.end_date}
                      disabled={editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode)}
                      style={{ opacity: (editingMilestone.isAggregated && (editingMilestone.date_mode === 'auto' || !editingMilestone.date_mode)) ? 0.5 : 1 }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => handleDeleteMilestone(editingMilestone.id)}
                  style={{ padding: '7px 14px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '1px solid var(--danger-100)', background: 'var(--danger-50)', color: 'var(--danger-600)', cursor: 'pointer' }}
                >
                  Delete
                </button>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => setEditingMilestone(null)}
                  className="btn"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--danger-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ri-delete-bin-line" style={{ color: 'var(--danger-600)', fontSize: 18 }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>Delete milestone?</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>This action cannot be undone.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button
                style={{ flex: 1, padding: '7px 14px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer' }}
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
