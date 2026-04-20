import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/StatusPill';
import ProgressBar from '../../components/ProgressBar';

interface SubMilestoneItem {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

interface PlanItem {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  target_date: string | null;
  owner_id: string | null;
}

interface RunItem {
  id: string;
  name: string;
  status: string;
  test_plan_id?: string | null;
  passed_count?: number;
  failed_count?: number;
  blocked_count?: number;
  untested_count?: number;
  retest_count?: number;
}

interface SessionItem {
  id: string;
  name: string;
  status: string;
  actualStatus?: string;
  created_at: string;
}

interface Props {
  projectId: string;
  subMilestones: SubMilestoneItem[];
  subMilestoneProgress: Map<string, number>;
  plans: PlanItem[];
  plansLoading?: boolean;
  plansError?: boolean;
  runs: RunItem[];
  sessions: SessionItem[];
  planMap: Map<string, PlanItem>;
  formatDateRange: (s: string | null, e: string | null) => string;
}

/**
 * Design-spec v3 §5-3 — Execution sections.
 * Empty-per-section hiding: each section is entirely removed from DOM when count = 0.
 * When all four sections are empty (and plans is not loading / erroring), renders a
 * single unified `.mo-exec-empty` card.
 *
 * Badge/progress consistency (dev-spec-milestone-badge-progress-consistency.md):
 * - All status badges use `<StatusPill>` (5-color system).
 * - All four section rows render `<ProgressBar>` (0% shows empty track).
 */
export default function ExecutionSections({
  projectId, subMilestones, subMilestoneProgress, plans, plansLoading, plansError,
  runs, sessions, planMap, formatDateRange,
}: Props) {
  const { t } = useTranslation('milestones');
  const hasSubs = subMilestones.length > 0;
  const hasPlans = plans.length > 0;
  const hasRuns = runs.length > 0;
  const hasSessions = sessions.length > 0;
  const isAllEmpty = !hasSubs && !hasPlans && !hasRuns && !hasSessions && !plansLoading && !plansError;

  // v3: single unified empty card when everything is 0
  if (isAllEmpty) {
    return (
      <div className="mo-exec-empty" role="status">
        <i className="ri-flag-line" aria-hidden="true" />
        <span>{t('detail.overview.executionEmpty')}</span>
      </div>
    );
  }

  // Show Test Plans block only if loading/error/non-empty
  const showPlansBlock = hasPlans || plansLoading || plansError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sub Milestones */}
      {hasSubs && (
        <>
          <div className="mo-sec-head">
            <i className="ri-git-branch-line" /> Sub Milestones
            <span className="count">{subMilestones.length}</span>
          </div>
          <div className="mo-sec-card">
            {subMilestones.map(sub => {
              const progressPct = subMilestoneProgress.get(sub.id) ?? 0;
              const isOverdue = sub.status === 'past_due' || sub.status === 'overdue';
              // AC-11: green wins at 100% even when overdue.
              const tone = progressPct >= 100
                ? 'green'
                : sub.status === 'completed'
                  ? 'green'
                  : isOverdue
                    ? 'red'
                    : sub.status === 'started' || sub.status === 'in_progress'
                      ? 'blue'
                      : 'gray';
              return (
                <Link key={sub.id} to={`/projects/${projectId}/milestones/${sub.id}`} className="row">
                  <div className="mo-row-icon primary"><i className="ri-flag-line" /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mo-row-name">{sub.name}</div>
                    <div className="mo-row-sub">{formatDateRange(sub.start_date, sub.end_date)}</div>
                  </div>
                  <div />
                  <StatusPill status={sub.status} />
                  <ProgressBar value={progressPct} tone={tone} />
                  <i className="ri-arrow-right-s-line" style={{ color: 'var(--text-subtle)' }} />
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Test Plans — render only when loading, error, or non-empty (v3 AC-E) */}
      {showPlansBlock && (
        <>
          <div className="mo-sec-head">
            <i className="ri-folder-chart-line" style={{ color: 'var(--violet)' }} /> Test Plans
            <span className="count">{plans.length}</span>
          </div>
          {plansLoading ? (
            <div className="mo-sec-card">
              {[0, 1, 2].map(i => <div key={i} className="mo-skeleton-row" style={{ margin: 8 }} />)}
            </div>
          ) : plansError ? (
            <div style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-100)', padding: '12px 16px', borderRadius: 10, color: 'var(--danger-600)', fontSize: 13 }}>
              Failed to load plans.
            </div>
          ) : (
            <div className="mo-sec-card">
              {plans.map(plan => {
                // 1차 PR: plan progress 집계 쿼리 없음 → 0% 빈 트랙 (Dev Spec §6.2, Out of Scope 3).
                const planProgressPct = 0;
                const planTone = plan.status === 'completed'
                  ? 'green'
                  : plan.status === 'cancelled'
                    ? 'red'
                    : plan.status === 'active'
                      ? 'blue'
                      : 'gray';
                return (
                  <Link key={plan.id} to={`/projects/${projectId}/plans/${plan.id}`} className="row">
                    <div className="mo-row-icon violet"><i className="ri-folder-chart-line" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mo-row-name">{plan.name}</div>
                      <div className="mo-row-sub">
                        {plan.priority && <span>Priority: {plan.priority}</span>}
                        {plan.target_date && <> · Target {new Date(plan.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                      </div>
                    </div>
                    <div />
                    <StatusPill status={plan.status} />
                    <ProgressBar value={planProgressPct} tone={planTone} />
                    <i className="ri-arrow-right-s-line" style={{ color: 'var(--text-subtle)' }} />
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Runs — Planned vs Direct (hidden entirely when 0) */}
      {hasRuns && (
        <>
          <div className="mo-sec-head">
            <i className="ri-play-circle-line" style={{ color: 'var(--blue)' }} /> Runs
            <span className="count">{runs.length}</span>
            <span className="legend">
              <span className="leg"><span className="run-type-dot planned" />Planned</span>
              <span className="leg"><span className="run-type-dot mdirect" />Milestone-direct</span>
            </span>
          </div>
          <div className="mo-sec-card">
            {runs.map(run => {
              const planned = !!run.test_plan_id;
              const linkedPlan = planned ? planMap.get(run.test_plan_id!) : null;
              const planLabel = planned ? (linkedPlan ? `Plan: ${linkedPlan.name}` : 'Plan: (deleted)') : 'Milestone-direct';
              const total = (run.passed_count || 0) + (run.failed_count || 0) + (run.blocked_count || 0) + (run.retest_count || 0) + (run.untested_count || 0);
              const done = (run.passed_count || 0) + (run.failed_count || 0) + (run.blocked_count || 0) + (run.retest_count || 0);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              // Dev Spec §6.3 tone rule.
              const tone = pct === 100 && run.status === 'completed'
                ? 'green'
                : run.status === 'in_progress'
                  ? 'blue'
                  : run.status === 'completed'
                    ? 'green'
                    : 'gray';
              return (
                <Link key={run.id} to={`/projects/${projectId}/runs/${run.id}`} className="row">
                  <div className={`mo-row-icon ${planned ? 'primary' : 'blue'}`}>
                    <i className="ri-play-circle-line" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mo-row-name">{run.name}</div>
                    <div style={{ marginTop: 3 }}>
                      <span className={`linkage-badge ${planned ? 'linkage-planned' : 'linkage-mdirect'}`}>
                        <span className={`run-type-dot ${planned ? 'planned' : 'mdirect'}`} />
                        {planLabel}
                      </span>
                    </div>
                  </div>
                  <div className="mo-stats-mini">
                    <span><b>{run.passed_count || 0}</b> passed</span>
                    <span><b>{run.failed_count || 0}</b> failed</span>
                    <span><b>{run.blocked_count || 0}</b> blocked</span>
                    <span><b>{run.untested_count || 0}</b> untested</span>
                  </div>
                  <StatusPill status={run.status} />
                  <ProgressBar value={pct} tone={tone} />
                  <i className="ri-arrow-right-s-line" style={{ color: 'var(--text-subtle)' }} />
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Exploratory */}
      {hasSessions && (
        <>
          <div className="mo-sec-head">
            <i className="ri-search-eye-line" style={{ color: 'var(--violet)' }} /> Exploratory
            <span className="count">{sessions.length}</span>
          </div>
          <div className="mo-sec-card">
            {sessions.map(session => (
              <Link key={session.id} to={`/projects/${projectId}/discovery-logs/${session.id}`} className="row">
                <div className="mo-row-icon violet"><i className="ri-search-eye-line" /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="mo-row-name">{session.name}</div>
                  <div className="mo-row-sub">{new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div />
                <StatusPill status={session.actualStatus ?? 'new'} />
                {/* Exploratory progress 집계 로직 없음 — Dev Spec §6.4 Out of Scope 4. */}
                <ProgressBar value={0} tone="gray" showLabel={false} />
                <i className="ri-arrow-right-s-line" style={{ color: 'var(--text-subtle)' }} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
