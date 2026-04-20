import React from 'react';
import StatusPill from '../../components/StatusPill';

export interface AdhocRun {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at: string;
  test_case_ids?: string[];
  passed?: number;
  failed?: number;
}

interface Props {
  run: AdhocRun;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Legacy 'running' status → normalize to 'in_progress' for StatusPill resolution.
const normalizeRunStatus = (s: string): string => (s === 'running' ? 'in_progress' : s);

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

export default function AdhocRunCard({ run, selectedId, onSelect }: Props) {
  const isSelected = selectedId === run.id;
  const isDone = run.status === 'completed';
  const total = run.test_case_ids?.length ?? 0;
  const passed = run.passed ?? 0;
  const failed = run.failed ?? 0;
  const remaining = total - passed - failed;
  const passPct = total > 0 ? (passed / total) * 100 : 0;

  return (
    <div
      className={`adhoc-card${isDone ? ' ms-completed' : ''}${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(run.id)}
    >
      {/* Row 1 */}
      <div className="adhoc-card-row1">
        <span className="adhoc-bolt">⚡</span>
        <span className="adhoc-card-name">{run.name}</span>
        <StatusPill status={normalizeRunStatus(run.status)} />
      </div>

      {/* Description sub-line */}
      {run.description && (
        <div className="adhoc-card-sub">— {run.description}</div>
      )}

      {/* Time row */}
      <div className="adhoc-card-time">
        🕐 {isDone ? 'Finished' : 'Started'} {timeAgo(run.created_at)}
        {total > 0 && ` · ${total} TCs`}
      </div>

      {/* Progress bar */}
      <div className="ms-card-pbar">
        <div
          className={`ms-card-pbar-fill${passPct < 60 && total > 0 ? ' low' : ''}`}
          style={{ width: `${passPct}%` }}
        />
      </div>

      {/* Stats row */}
      {total > 0 && (
        <div className="ms-card-row3" style={{ justifyContent: 'space-between' }}>
          <span>
            <span className="stat-pass">{passed}</span> passed ·{' '}
            <span className="stat-fail">{failed}</span> failed · {remaining} left
          </span>
          <span
            style={{
              fontWeight: 600,
              color: passPct >= 60 ? 'var(--success-600)' : 'var(--warning)',
            }}
          >
            {Math.round(passPct)}%
          </span>
        </div>
      )}
    </div>
  );
}
