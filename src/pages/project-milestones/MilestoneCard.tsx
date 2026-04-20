import React from 'react';
import StatusPill from '../../components/StatusPill';

export interface MilestoneCardData {
  id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  parent_milestone_id: string | null;
  // computed
  passedTests: number;
  failedTests: number;
  totalTests: number;
  subMilestones?: MilestoneCardData[];
  isAggregated?: boolean;
}

interface Props {
  milestone: MilestoneCardData;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

const STATUS_DOT: Record<string, React.ReactNode> = {
  started: (
    <span
      style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--primary)', flexShrink: 0,
        display: 'inline-block',
      }}
    />
  ),
  past_due: (
    <span
      style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--danger)', flexShrink: 0,
        display: 'inline-block',
      }}
    />
  ),
  upcoming: (
    <span
      style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--text-subtle)', flexShrink: 0,
        display: 'inline-block',
      }}
    />
  ),
  completed: (
    <span style={{ color: 'var(--success-600)', fontSize: 13, flexShrink: 0, lineHeight: 1 }}>✓</span>
  ),
};

// Local STATUS_BADGE map removed — status rendering delegated to <StatusPill>
// (see /src/lib/statusPill.ts for the 5-color mapping).

function fmtDate(d: string | null) {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const [y, m, d] = endDate.split('T')[0].split('-');
  const end = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now.getTime()) / 86400000);
}

export default function MilestoneCard({ milestone, selectedId, expandedIds, onSelect, onToggleExpand }: Props) {
  const isSelected = selectedId === milestone.id;
  const hasSubs = (milestone.subMilestones?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(milestone.id);
  const isSub = !!milestone.parent_milestone_id;

  const passed = milestone.passedTests;
  const failed = milestone.failedTests;
  const total = milestone.totalTests;
  const remaining = total - passed - failed;
  const passPct = total > 0 ? (passed / total) * 100 : 0;
  const isDone = milestone.status === 'completed';
  const dl = daysLeft(milestone.end_date);

  const statusDot = STATUS_DOT[milestone.status] || STATUS_DOT.upcoming;

  // Plan count from sub plan list - we don't have it here so omit
  const dateLabel = isDone
    ? (milestone.end_date ? `📅 Actual: ${fmtDate(milestone.end_date)}` : '')
    : (milestone.end_date ? `🎯 Target: ${fmtDate(milestone.end_date)}` : '');

  const row4 = isDone
    ? 'completed'
    : (dl !== null && dl >= 0 ? `${dl} days left` : (dl !== null ? 'overdue' : ''));

  const cardCls = [
    'ms-card',
    isSub ? 'ms-sub' : '',
    isDone ? 'ms-completed' : '',
    isSelected ? 'selected' : '',
  ].filter(Boolean).join(' ');

  const cardEl = (
    <div
      className={cardCls}
      style={{ position: 'relative' }}
      onClick={() => onSelect(milestone.id)}
    >
      {/* Row 1 */}
      <div className="ms-card-row1">
        {!isSub && statusDot}
        {hasSubs && !isSub && (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(milestone.id); }}
            style={{
              border: 'none', background: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--text-subtle)', fontSize: 10, lineHeight: 1, flexShrink: 0,
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        )}
        <span className="ms-card-name">{milestone.name}</span>
        <StatusPill status={milestone.status} className="flex-shrink-0" />
        {milestone.isAggregated && !isSub && (
          <span
            className="badge"
            style={{
              fontSize: 10, padding: '1px 5px', flexShrink: 0,
              border: '1px solid #6366f1', color: '#4f46e5', background: '#eef2ff',
            }}
            title={`Aggregated from ${milestone.subMilestones?.length ?? 0} sub-milestones + direct runs`}
          >
            ↻ Roll-up
          </span>
        )}
      </div>

      {/* Row 2 — date + plans count (parent only) */}
      {!isSub && dateLabel && (
        <div className="ms-card-row2">{dateLabel}</div>
      )}

      {/* Progress bar */}
      <div className="ms-card-pbar">
        <div
          className={`ms-card-pbar-fill${passPct < 60 && total > 0 ? ' low' : ''}`}
          style={{ width: `${passPct}%` }}
        />
      </div>

      {/* Row 3 */}
      <div className="ms-card-row3">
        <span className="stat-pass">{passed}</span>&nbsp;passed &nbsp;·&nbsp;{' '}
        <span className="stat-fail">{failed}</span>&nbsp;failed &nbsp;·&nbsp; {remaining} left
      </div>

      {/* Row 4 */}
      {row4 && (
        <div className="ms-card-row4">{row4}</div>
      )}
    </div>
  );

  if (isSub) return cardEl;

  return (
    <>
      {cardEl}
      {hasSubs && isExpanded && (
        <div className="ms-sub-group">
          {(milestone.subMilestones ?? []).map(sub => (
            <MilestoneCard
              key={sub.id}
              milestone={sub}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </>
  );
}
