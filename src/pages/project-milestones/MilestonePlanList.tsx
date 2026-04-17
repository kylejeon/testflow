import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { MilestoneCardData } from './MilestoneCard';

export interface TestPlanRow {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: string;
  milestone_id: string | null;
  target_date: string | null;
  owner_id: string | null;
  entry_criteria?: string[] | null;
  exit_criteria?: string[] | null;
  tc_count?: number;
  passed?: number;
  failed?: number;
  total?: number;
  ownerName?: string | null;
  ownerAvatar?: string | null;
}

export interface DirectRun {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
  milestone_id: string;
  test_case_ids?: string[];
  passed: number;
  failed: number;
}

interface Props {
  projectId: string;
  milestone: MilestoneCardData & {
    subMilestones?: MilestoneCardData[];
    isAggregated?: boolean;
  };
  plans: TestPlanRow[];
  directRuns: DirectRun[];
  onNewPlan: () => void;
  onNewRun: () => void;
  onAIAssist?: () => void;
  onEdit: () => void;
}

const PLAN_STATUS: Record<string, { label: string; cls: string }> = {
  planning:  { label: 'Planning',    cls: 'badge badge-blue' },
  active:    { label: 'In Progress', cls: 'badge badge-orange' },
  completed: { label: 'Completed',   cls: 'badge badge-success' },
  cancelled: { label: 'Cancelled',   cls: 'badge' },
};

const RUN_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  running:    { label: 'In Progress', cls: 'badge badge-orange' },
  in_progress:{ label: 'In Progress', cls: 'badge badge-orange' },
  completed:  { label: 'Completed',   cls: 'badge badge-success' },
  paused:     { label: 'Paused',      cls: 'badge badge-warning' },
  cancelled:  { label: 'Cancelled',   cls: 'badge' },
  new:        { label: 'Not Started', cls: 'badge' },
};

const MS_STATUS: Record<string, { label: string; cls: string }> = {
  started:   { label: 'In Progress', cls: 'badge badge-blue' },
  past_due:  { label: 'Overdue',     cls: 'badge badge-danger' },
  upcoming:  { label: 'Upcoming',    cls: 'badge' },
  completed: { label: 'Completed',   cls: 'badge badge-success' },
};

function fmtDate(d: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDateShort(d: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function daysLeftNum(endDate: string | null): number | null {
  if (!endDate) return null;
  const [y, m, d] = endDate.split('T')[0].split('-');
  const end = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now.getTime()) / 86400000);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 1) return `${days} days ago`;
  if (days === 1) return 'yesterday';
  if (hours >= 1) return `${hours}h ago`;
  if (mins >= 1) return `${mins}m ago`;
  return 'just now';
}

type FilterKey = 'all' | 'active' | 'planning' | 'completed';

export default function MilestonePlanList({ projectId, milestone, plans, directRuns, onNewPlan, onNewRun, onAIAssist, onEdit }: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('all');
  // AI Suggestion card removed

  const msStatus = MS_STATUS[milestone.status] || MS_STATUS.upcoming;
  const hasSubs = (milestone.subMilestones?.length ?? 0) > 0;
  const isRollup = !!milestone.isAggregated;

  // Stats
  const passed = milestone.passedTests;
  const failed = milestone.failedTests;
  const total = milestone.totalTests;
  const remaining = total - passed - failed;
  const completePct = total > 0 ? ((passed + failed) / total * 100) : 0;
  const passRate = (passed + failed) > 0 ? (passed / (passed + failed) * 100) : 0;
  const passPct = total > 0 ? (passed / total * 100) : 0;
  const failPct = total > 0 ? (failed / total * 100) : 0;

  const dl = daysLeftNum(milestone.end_date);
  const isDone = milestone.status === 'completed';

  // Flag icon style
  const flagStyle =
    milestone.status === 'completed'
      ? { bg: 'var(--success-50)', color: 'var(--success-600)' }
      : milestone.status === 'past_due'
      ? { bg: 'var(--danger-50)', color: 'var(--danger-600)' }
      : { bg: 'var(--primary-50)', color: 'var(--primary)' };

  // Filter tabs
  const filterCounts = {
    all:       plans.length,
    active:    plans.filter(p => p.status === 'active').length,
    planning:  plans.filter(p => p.status === 'planning').length,
    completed: plans.filter(p => p.status === 'completed').length,
  };

  const filteredPlans = filter === 'all' ? plans :
    plans.filter(p => {
      if (filter === 'active')    return p.status === 'active';
      if (filter === 'planning')  return p.status === 'planning';
      if (filter === 'completed') return p.status === 'completed';
      return true;
    });

  // AI suggestion: show if >= 1 plan and any has failures
  // showAI removed — AI Suggestion card eliminated

  const TABS: { key: FilterKey; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'active',    label: 'Active' },
    { key: 'planning',  label: 'Planning' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="main-panel">
      {/* White header area */}
      <div className="ms-header-area">

        {/* Title row */}
        <div className="ms-title-row">
          <div
            className="ms-flag-icon"
            style={{ background: flagStyle.bg, color: flagStyle.color }}
          >
            {milestone.status === 'completed' ? '🏁' : '🚩'}
          </div>
          <div>
            <h2 className="ms-main-title">{milestone.name}</h2>
            {isRollup && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                ↻ Roll-up · Aggregated from {milestone.subMilestones?.length ?? 0} sub-milestones
              </div>
            )}
          </div>
          <span className={msStatus.cls}>{msStatus.label}</span>
          <div className="ms-header-actions">
            <button className="btn btn-sm" onClick={onEdit}>
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="ms-meta-row">
          <svg className="icon-sm" style={{ color: 'var(--text-subtle)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {(milestone.start_date || milestone.end_date)
            ? `${fmtDateShort(milestone.start_date)} – ${fmtDateShort(milestone.end_date)}`
            : 'No dates set'
          }
          {plans.length > 0 && (
            <><span className="ms-meta-sep">·</span>{plans.length} plan{plans.length !== 1 ? 's' : ''}</>
          )}
          {hasSubs && (
            <><span className="ms-meta-sep">·</span>{milestone.subMilestones!.length} sub{milestone.subMilestones!.length !== 1 ? 's' : ''}</>
          )}
          {!isDone && dl !== null && dl >= 0 && (
            <><span className="ms-meta-sep">·</span>{dl} days left</>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="ms-progress-wrap">
            <div className="ms-progress-bar">
              <div className="ms-progress-pass" style={{ width: `${passPct}%` }} />
              <div className="ms-progress-fail" style={{ left: `${passPct}%`, width: `${failPct}%` }} />
            </div>
          </div>
        )}

        {/* Stats row */}
        {total > 0 && (
          <div className="ms-stats-row">
            <div className="ms-stat-item">
              <span className="dot dot-success" />
              <span>Passed <b>{passed}</b></span>
            </div>
            <div className="ms-stat-item">
              <span className="dot dot-danger" />
              <span>Failed <b>{failed}</b></span>
            </div>
            <div className="ms-stat-item">
              <span className="dot dot-neutral" />
              <span>Remaining <b>{remaining}</b></span>
            </div>
            <div className="ms-stat-vsep" />
            <span className="font-semibold" style={{ color: 'var(--text)' }}>
              {completePct.toFixed(1)}% complete
            </span>
            <div className="ms-stat-vsep" />
            <span>{passRate.toFixed(1)}% pass rate</span>
            {isRollup && (
              <>
                <div className="ms-stat-vsep" />
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                  ↻ Aggregated from {milestone.subMilestones?.length ?? 0} sub-milestones + direct runs
                </span>
              </>
            )}
          </div>
        )}

        {/* Filter tabs + New Plan button */}
        <div className="filter-tabs" style={{ alignItems: 'center' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`filter-tab${filter === tab.key ? ' active' : ''}`}
              onClick={() => setFilter(tab.key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {tab.label}
              <span className="tc">{filterCounts[tab.key]}</span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm" style={{ margin: '0 4px' }} onClick={onNewPlan}>
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Plan
          </button>
        </div>
      </div>

      {/* Plans list */}
      <div className="plans-list">
        {filteredPlans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No test plans yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Create your first plan to organize test execution for this milestone.
            </p>
            <button className="btn btn-primary" onClick={onNewPlan}>
              Create your first plan
            </button>
          </div>
        )}

        {filteredPlans.map(plan => {
          const statusInfo = PLAN_STATUS[plan.status] || PLAN_STATUS.planning;
          const planPassed = plan.passed ?? 0;
          const planFailed = plan.failed ?? 0;
          const planTotal = plan.total ?? (plan.tc_count ?? 0);
          const planPassPct = planTotal > 0 ? (planPassed / planTotal * 100) : 0;
          const planFailPct = planTotal > 0 ? (planFailed / planTotal * 100) : 0;
          const planExecuted = planPassed + planFailed;
          const planCompletePct = planTotal > 0 ? Math.round(planExecuted / planTotal * 100) : 0;
          const isOverdue = plan.target_date && new Date(plan.target_date) < new Date() && plan.status !== 'completed';
          const pctColor = planCompletePct >= 80
            ? 'var(--success-600)'
            : planCompletePct >= 50
            ? 'var(--warning)'
            : 'var(--text-muted)';

          return (
            <div
              key={plan.id}
              className="plan-card"
              onClick={() => navigate(`/projects/${projectId}/milestones/${milestone.id}/plans/${plan.id}`)}
            >
              <div className="plan-card-top">
                <span className="plan-card-icon">📋</span>
                <span className="plan-card-name">{plan.name}</span>
                <span className={statusInfo.cls}>{statusInfo.label}</span>
              </div>
              <div className="plan-card-meta">
                {plan.tc_count !== undefined ? `${plan.tc_count} TCs` : '—'}
                {plan.entry_criteria && plan.entry_criteria.length > 0 && (
                  <><span>·</span>Entry: {plan.entry_criteria[0]?.slice(0, 20) || 'set'}</>
                )}
                {plan.exit_criteria && plan.exit_criteria.length > 0 && (
                  <><span>·</span>Exit: {plan.exit_criteria[0]?.slice(0, 20) || 'set'}</>
                )}
                {isOverdue && (
                  <><span>·</span><span style={{ color: 'var(--danger)' }}>Overdue {fmtDateShort(plan.target_date)}</span></>
                )}
              </div>
              {plan.ownerName && (
                <div className="plan-card-owner">
                  <Avatar
                    userId={plan.owner_id || undefined}
                    name={plan.ownerName}
                    size="xs"
                  />
                  <span>{plan.ownerName.split(/\s+/).pop() || plan.ownerName}</span>
                </div>
              )}
              <div className="plan-card-bottom">
                <div className="plan-pbar">
                  <div className="plan-pbar-pass" style={{ width: `${planPassPct}%` }} />
                  <div className="plan-pbar-fail" style={{ left: `${planPassPct}%`, width: `${planFailPct}%` }} />
                </div>
                <span className="plan-card-counts">
                  {planPassed} passed · {planFailed} failed
                </span>
                <span className="plan-card-pct" style={{ color: planTotal > 0 ? pctColor : 'var(--text-muted)' }}>
                  {planTotal > 0 ? `${planCompletePct}%` : '—'}
                </span>
                <svg className="plan-card-caret icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Direct Runs section ──────────────────────────────────────────────── */}
      <div className="runs-section">
        <div className="runs-section-header">
          <div className="runs-section-title">
            <span style={{ fontSize: 14 }}>⚡</span>
            Direct Runs
            <span className="runs-section-count">{directRuns.length}</span>
          </div>
          <button className="btn btn-sm" onClick={onNewRun}>
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Run
          </button>
        </div>

        {directRuns.length === 0 ? (
          <div className="runs-empty">
            No direct runs · runs linked directly to this milestone without a plan
          </div>
        ) : (
          directRuns.map(run => {
            const total = run.test_case_ids?.length ?? 0;
            const runPassed = run.passed;
            const runFailed = run.failed;
            const runRemaining = total - runPassed - runFailed;
            const runPassPct = total > 0 ? (runPassed / total * 100) : 0;
            const runFailPct = total > 0 ? (runFailed / total * 100) : 0;
            const statusInfo = RUN_STATUS_BADGE[run.status] || { label: 'Cancelled', cls: 'badge' };

            return (
              <div
                key={run.id}
                className="direct-run-card"
                onClick={() => navigate(`/projects/${projectId}/runs/${run.id}`)}
              >
                <span className="adhoc-bolt" style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="adhoc-card-row1" style={{ marginBottom: 2 }}>
                    <span className="adhoc-card-name">{run.name}</span>
                    <span className={statusInfo.cls} style={{ fontSize: 10, padding: '1px 5px', flexShrink: 0 }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {run.description && (
                    <div className="adhoc-card-sub">— {run.description}</div>
                  )}
                  <div className="adhoc-card-time">
                    🕐 {timeAgo(run.created_at)}{total > 0 && ` · ${total} TCs`}
                  </div>
                  {total > 0 && (
                    <>
                      <div className="plan-pbar" style={{ marginTop: 6 }}>
                        <div className="plan-pbar-pass" style={{ width: `${runPassPct}%` }} />
                        <div className="plan-pbar-fail" style={{ left: `${runPassPct}%`, width: `${runFailPct}%` }} />
                      </div>
                      <div className="ms-card-row3" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                        <span>
                          <span className="stat-pass">{runPassed}</span> passed ·{' '}
                          <span className="stat-fail">{runFailed}</span> failed · {runRemaining} left
                        </span>
                        <span style={{ fontWeight: 600, color: runPassPct >= 60 ? 'var(--success-600)' : 'var(--warning)' }}>
                          {Math.round(runPassPct)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <svg className="icon-sm" style={{ color: 'var(--text-subtle)', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })
        )}
      </div>

      {/* AI Suggestion card removed — AI Plan Assistant is accessible from Plan Detail "AI Optimize" */}
    </div>
  );
}
