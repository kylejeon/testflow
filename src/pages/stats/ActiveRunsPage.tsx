import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';

type RunStatus = 'in-progress' | 'blocked' | 'paused';

interface Run {
  name: string;
  status: RunStatus;
  project: string;
  tcCount: number;
  started: string;
  lastActivity: string;
  progressPct: number;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  assigneeInitials: string;
  assigneeName: string;
  assigneeRole: string;
  assigneeColor: string;
  note?: string;
}

const runs: Run[] = [
  {
    name: 'Sprint 24 — Regression Suite',
    status: 'in-progress',
    project: 'Mobile App v2',
    tcCount: 128,
    started: 'Started 2h ago',
    lastActivity: 'Last activity: 4 min ago',
    progressPct: 82,
    passed: 92, failed: 8, blocked: 5, untested: 23,
    assigneeInitials: 'SK', assigneeName: 'Sarah Kim', assigneeRole: 'QA Lead', assigneeColor: '#6366F1',
  },
  {
    name: 'API v3 Smoke Tests',
    status: 'in-progress',
    project: 'API Gateway v3',
    tcCount: 64,
    started: 'Started 45 min ago',
    lastActivity: 'Last activity: 12 min ago',
    progressPct: 56,
    passed: 31, failed: 3, blocked: 2, untested: 28,
    assigneeInitials: 'AP', assigneeName: 'Alex Park', assigneeRole: 'Backend QA', assigneeColor: '#10B981',
  },
  {
    name: 'Payment Flow — E2E',
    status: 'blocked',
    project: 'Payment Integration',
    tcCount: 42,
    started: 'Started 1d ago',
    lastActivity: 'Last activity: 3h ago',
    progressPct: 71,
    passed: 24, failed: 3, blocked: 3, untested: 12,
    assigneeInitials: 'JL', assigneeName: 'Jina Lee', assigneeRole: 'QA Engineer', assigneeColor: '#EC4899',
    note: 'Blocked by: Sandbox API down',
  },
  {
    name: 'Dashboard RBAC Verification',
    status: 'in-progress',
    project: 'Admin Dashboard',
    tcCount: 38,
    started: 'Started 3h ago',
    lastActivity: 'Last activity: 28 min ago',
    progressPct: 89,
    passed: 31, failed: 1, blocked: 2, untested: 4,
    assigneeInitials: 'MC', assigneeName: 'Mike Choi', assigneeRole: 'QA Engineer', assigneeColor: '#F59E0B',
  },
  {
    name: 'Accessibility Audit — WCAG 2.1',
    status: 'paused',
    project: 'Web Dashboard',
    tcCount: 40,
    started: 'Started 2d ago',
    lastActivity: 'Last activity: 1d ago',
    progressPct: 60,
    passed: 20, failed: 2, blocked: 2, untested: 16,
    assigneeInitials: 'SK', assigneeName: 'Sarah Kim', assigneeRole: 'QA Lead', assigneeColor: '#8B5CF6',
    note: 'Paused: Waiting for design update',
  },
];

const statusMeta: Record<RunStatus, { label: string; bg: string; color: string; dotColor: string; pulse: boolean }> = {
  'in-progress': { label: 'In Progress', bg: '#DBEAFE', color: '#2563EB', dotColor: '#2563EB', pulse: true },
  'blocked':     { label: 'Blocked',     bg: '#FEF2F2', color: '#DC2626', dotColor: '#DC2626', pulse: false },
  'paused':      { label: 'Paused',      bg: '#FEF3C7', color: '#D97706', dotColor: '#D97706', pulse: false },
};

export default function ActiveRunsPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .ar-anim { animation: fadeInUp 0.35s ease-out backwards; }
        .ar-card:hover { border-color: #C7D2FE !important; box-shadow: 0 4px 16px rgba(99,102,241,0.08) !important; transform: translateY(-1px) !important; }
        .ar-pulse { animation: statusPulse 2s infinite; }
        .ar-tab { cursor: pointer; transition: all 0.15s; }
        .ar-tab:hover { background: #F1F5F9 !important; color: #334155 !important; }
      `}</style>

      {/* Top Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '3.5rem', gap: '1.5rem', flexShrink: 0 }}>
        <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginRight: '0.5rem' }}>
          <LogoMark />
          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9375rem' }}>Testably</span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {[
            { label: 'Projects', icon: 'ri-folder-3-line', to: '/projects', active: true },
            { label: 'Settings', icon: 'ri-settings-3-line', to: '/settings', active: false },
          ].map(item => (
            <Link key={item.label} to={item.to} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0 0.875rem', height: '100%',
              fontSize: '0.8125rem', fontWeight: 500,
              color: item.active ? '#6366F1' : '#64748B',
              borderBottom: item.active ? '2px solid #6366F1' : '2px solid transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              <i className={item.icon} style={{ fontSize: '1rem' }} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <i className="ri-notification-3-line" />
          </button>
        </div>
      </header>

      {/* Sub-header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0.625rem 1.5rem', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
          <Link to="/projects" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>Projects</Link>
          <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}><i className="ri-arrow-right-s-line" /></span>
          <span style={{ color: '#0F172A', fontWeight: 700 }}>Active Test Runs</span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #6366F1', background: '#6366F1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-play-line" /> Start New Run
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-play-circle-line" style={{ fontSize: '1.25rem', color: '#10B981' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Active Test Runs</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>5 runs in progress across 4 projects</div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Active Runs',     value: '5',    sub: 'across 4 projects',        color: '#2563EB' },
              { label: 'Total TC in Runs', value: '312',  sub: 'test cases being executed', color: '#0F172A' },
              { label: 'Untested',        value: '23',   sub: 'remaining across all runs', color: '#F59E0B' },
              { label: 'Avg Completion',  value: '76%',  sub: 'of all active runs',        color: '#16A34A' },
            ].map((card, i) => (
              <div key={i} className="ar-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: `${i * 0.05}s` }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1rem' }}>
            {[
              { label: 'All', count: 5, active: true },
              { label: 'In Progress', count: 3, active: false },
              { label: 'Blocked', count: 1, active: false },
              { label: 'Paused', count: 1, active: false },
            ].map(tab => (
              <button key={tab.label} className="ar-tab" style={{
                fontSize: '0.75rem', padding: '0.375rem 0.875rem', borderRadius: '9999px',
                border: '1px solid', fontFamily: 'inherit', fontWeight: 500,
                borderColor: tab.active ? '#6366F1' : '#E2E8F0',
                background: tab.active ? '#6366F1' : '#fff',
                color: tab.active ? '#fff' : '#64748B',
                cursor: 'pointer',
              }}>
                {tab.label}
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700,
                  background: tab.active ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                  color: tab.active ? '#fff' : '#64748B',
                  padding: '0.0625rem 0.375rem', borderRadius: '9999px', marginLeft: '0.25rem',
                }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Run Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {runs.map((run, i) => {
              const sm = statusMeta[run.status];
              const totalTC = run.passed + run.failed + run.blocked + run.untested;
              return (
                <div key={i} className="ar-anim ar-card" style={{
                  background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  animationDelay: `${0.2 + i * 0.05}s`,
                }}>
                  {/* Run top */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {run.name}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, padding: '0.1875rem 0.625rem', borderRadius: '9999px', background: sm.bg, color: sm.color, flexShrink: 0 }}>
                          <span className={sm.pulse ? 'ar-pulse' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dotColor, display: 'inline-block' }} />
                          {sm.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><i className="ri-folder-3-line" style={{ fontSize: '0.875rem' }} /> {run.project}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><i className="ri-file-list-3-line" style={{ fontSize: '0.875rem' }} /> {run.tcCount} test cases</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><i className="ri-time-line" style={{ fontSize: '0.875rem' }} /> {run.started}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: '#94A3B8', flexShrink: 0 }}>{run.lastActivity}</span>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#475569' }}>Progress</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0F172A' }}>{run.progressPct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${(run.passed / totalTC) * 100}%`, height: '100%', background: '#16A34A', transition: 'width 0.8s ease-out' }} />
                      <div style={{ width: `${(run.failed / totalTC) * 100}%`, height: '100%', background: '#EF4444', transition: 'width 0.8s ease-out' }} />
                      <div style={{ width: `${(run.blocked / totalTC) * 100}%`, height: '100%', background: '#F59E0B', transition: 'width 0.8s ease-out' }} />
                      <div style={{ flex: 1, height: '100%', background: '#E2E8F0' }} />
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {[
                      { color: '#16A34A', count: run.passed,   label: 'Passed' },
                      { color: '#EF4444', count: run.failed,   label: 'Failed' },
                      { color: '#F59E0B', count: run.blocked,  label: 'Blocked' },
                      { color: '#CBD5E1', count: run.untested, label: 'Untested' },
                    ].map(b => (
                      <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                        <span style={{ color: b.color === '#CBD5E1' ? '#94A3B8' : b.color }}>{b.count}</span>
                        <span style={{ color: '#64748B', fontWeight: 500 }}>{b.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Assignee */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', marginTop: '0.75rem' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: run.assigneeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {run.assigneeInitials}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{run.assigneeName}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                        {run.assigneeRole}
                        {run.note && (
                          <span style={{ color: run.status === 'blocked' ? '#DC2626' : '#D97706', fontWeight: 600, marginLeft: '0.25rem' }}>· {run.note}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
