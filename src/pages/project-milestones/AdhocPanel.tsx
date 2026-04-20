import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdhocRun } from './AdhocRunCard';
import StatusPill from '../../components/StatusPill';

interface Props {
  projectId: string;
  runs: AdhocRun[];
  onPromote: (runId: string) => void;
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

export default function AdhocPanel({ projectId, runs, onPromote }: Props) {
  const navigate = useNavigate();

  const total = runs.length;
  const completed = runs.filter(r => r.status === 'completed').length;
  const inProgress = runs.filter(r => r.status === 'running').length;

  return (
    <div className="main-panel">
      {/* Header */}
      <div className="ms-header-area">
        <div className="ms-title-row">
          <div
            className="ms-flag-icon"
            style={{ background: 'var(--orange-50)', color: 'var(--orange)', fontSize: 20 }}
          >
            ⚡
          </div>
          <div>
            <h2 className="ms-main-title">Ad-hoc Runs</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Runs not assigned to any milestone or plan
            </div>
          </div>
        </div>
        <div className="ms-stats-row">
          <div className="ms-stat-item">
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{total}</span>
            <span style={{ color: 'var(--text-muted)' }}>total runs</span>
          </div>
          {completed > 0 && (
            <>
              <div className="ms-stat-vsep" />
              <div className="ms-stat-item">
                <span className="dot dot-success" />
                <span>{completed} completed</span>
              </div>
            </>
          )}
          {inProgress > 0 && (
            <>
              <div className="ms-stat-vsep" />
              <div className="ms-stat-item">
                <span className="dot dot-blue" />
                <span>{inProgress} in progress</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Run list */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {runs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No ad-hoc runs</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Ad-hoc runs are test runs not linked to any milestone or plan.
            </p>
          </div>
        )}

        {runs.map(run => {
          const tcTotal = run.test_case_ids?.length ?? 0;
          const passed = run.passed ?? 0;
          const failed = run.failed ?? 0;
          const remaining = tcTotal - passed - failed;
          const passPct = tcTotal > 0 ? (passed / tcTotal * 100) : 0;
          const failPct = tcTotal > 0 ? (failed / tcTotal * 100) : 0;
          const passRate = (passed + failed) > 0 ? Math.round(passed / (passed + failed) * 100) : 0;

          return (
            <div
              key={run.id}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onClick={() => navigate(`/projects/${projectId}/runs/${run.id}`)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1, color: 'var(--orange)' }}>⚡</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.name}
                </span>
                <StatusPill status={normalizeRunStatus(run.status)} />
              </div>

              {run.description && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
                  {run.description}
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 10 }}>
                🕐 {timeAgo(run.created_at)}
                {tcTotal > 0 && ` · ${tcTotal} TCs`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${passPct}%`, background: 'var(--success)' }} />
                  <div style={{ position: 'absolute', left: `${passPct}%`, top: 0, bottom: 0, width: `${failPct}%`, background: 'var(--danger)' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {passed} passed · {failed} failed
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'right', flexShrink: 0, color: tcTotal > 0 ? (passRate >= 80 ? 'var(--success-600)' : passRate >= 60 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)' }}>
                  {tcTotal > 0 ? `${passRate}%` : '—'}
                </span>
                <button
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 500,
                    padding: '3px 9px', borderRadius: 6,
                    border: '1px solid var(--border)', background: '#fff',
                    color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                  onClick={e => { e.stopPropagation(); onPromote(run.id); }}
                >
                  <svg style={{ width: 11, height: 11 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Promote to Plan
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
