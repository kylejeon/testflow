import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';

interface Member {
  initials: string;
  color: string;
  name: string;
  role: string;
  online: boolean;
  executed: number;
  created: number;
  failed: number;
  lastAction: string;
  lastTime: string;
}

const members: Member[] = [
  { initials: 'SK', color: '#6366F1', name: 'Sarah Kim',   role: 'QA Lead',              online: true,  executed: 24, created: 5, failed: 2, lastAction: 'Executed TC-2847',       lastTime: '4 min ago' },
  { initials: 'AP', color: '#10B981', name: 'Alex Park',   role: 'Backend QA',           online: true,  executed: 18, created: 3, failed: 4, lastAction: 'Created TC-2846',        lastTime: '12 min ago' },
  { initials: 'JL', color: '#EC4899', name: 'Jina Lee',    role: 'QA Engineer',          online: true,  executed: 15, created: 2, failed: 3, lastAction: 'Blocked TC-2839',        lastTime: '28 min ago' },
  { initials: 'MC', color: '#F59E0B', name: 'Mike Choi',   role: 'QA Engineer',          online: true,  executed: 12, created: 2, failed: 1, lastAction: 'Executed TC-2831',       lastTime: '45 min ago' },
  { initials: 'DK', color: '#06B6D4', name: 'David Kang',  role: 'Automation Engineer',  online: true,  executed: 10, created: 1, failed: 0, lastAction: 'Commented on TC-2840',   lastTime: '1h ago' },
  { initials: 'YH', color: '#8B5CF6', name: 'Yuna Han',    role: 'QA Engineer',          online: true,  executed: 8,  created: 1, failed: 1, lastAction: 'Executed TC-2828',       lastTime: '1.5h ago' },
  { initials: 'HJ', color: '#3B82F6', name: 'Hyun Jung',   role: 'QA Engineer',          online: false, executed: 2,  created: 0, failed: 0, lastAction: 'Last seen yesterday',    lastTime: 'Offline' },
  { initials: 'TN', color: '#EF4444', name: 'Tom Nguyen',  role: 'QA Engineer',          online: false, executed: 0,  created: 0, failed: 0, lastAction: 'On PTO until Mar 28',    lastTime: 'Offline' },
];

interface FeedItem {
  initials: string;
  color: string;
  name: string;
  action: string;
  target: string;
  badge: { text: string; type: 'created' | 'executed' | 'failed' | 'commented' };
  time: string;
  project: string;
}

const feedItems: FeedItem[] = [
  { initials: 'SK', color: '#6366F1', name: 'Sarah Kim',  action: 'executed',     target: 'TC-2847', badge: { text: 'Passed',  type: 'executed'  }, time: '4 min ago',  project: 'Payment Integration' },
  { initials: 'AP', color: '#10B981', name: 'Alex Park',  action: 'created',      target: 'TC-2846', badge: { text: 'New',     type: 'created'   }, time: '12 min ago', project: 'Admin Dashboard' },
  { initials: 'JL', color: '#EC4899', name: 'Jina Lee',   action: 'marked blocked', target: 'TC-2839', badge: { text: 'Blocked', type: 'failed'    }, time: '28 min ago', project: 'Payment Integration' },
  { initials: 'MC', color: '#F59E0B', name: 'Mike Choi',  action: 'executed',     target: 'TC-2831', badge: { text: 'Passed',  type: 'executed'  }, time: '45 min ago', project: 'Admin Dashboard' },
  { initials: 'SK', color: '#6366F1', name: 'Sarah Kim',  action: 'executed',     target: 'TC-2830', badge: { text: 'Failed',  type: 'failed'    }, time: '52 min ago', project: 'Mobile App v2' },
  { initials: 'DK', color: '#06B6D4', name: 'David Kang', action: 'commented on', target: 'TC-2840', badge: { text: 'Comment', type: 'commented' }, time: '1h ago',     project: 'Mobile App v2' },
  { initials: 'AP', color: '#10B981', name: 'Alex Park',  action: 'executed',     target: 'TC-2829', badge: { text: 'Failed',  type: 'failed'    }, time: '1h ago',     project: 'API Gateway v3' },
  { initials: 'YH', color: '#8B5CF6', name: 'Yuna Han',   action: 'executed',     target: 'TC-2828', badge: { text: 'Passed',  type: 'executed'  }, time: '1.5h ago',   project: 'Web Dashboard' },
  { initials: 'JL', color: '#EC4899', name: 'Jina Lee',   action: 'created',      target: 'TC-2844', badge: { text: 'New',     type: 'created'   }, time: '2h ago',     project: 'Mobile App v2' },
  { initials: 'SK', color: '#6366F1', name: 'Sarah Kim',  action: 'started run',  target: 'Sprint 24 — Regression', badge: { text: 'Run', type: 'executed' }, time: '2h ago', project: 'Mobile App v2' },
  { initials: 'MC', color: '#F59E0B', name: 'Mike Choi',  action: 'created',      target: 'TC-2843', badge: { text: 'New',     type: 'created'   }, time: '3h ago',     project: 'API Gateway v3' },
];

const badgeStyle: Record<string, { bg: string; color: string }> = {
  created:   { bg: '#EEF2FF', color: '#6366F1' },
  executed:  { bg: '#ECFDF5', color: '#10B981' },
  failed:    { bg: '#FEF2F2', color: '#EF4444' },
  commented: { bg: '#FEF3C7', color: '#D97706' },
};

// Heatmap data: 4 weeks × 7 days
const heatmapData = [
  3,4,5,4,3,1,0,
  2,5,4,5,4,2,0,
  4,3,5,5,4,1,1,
  5,4,5,3,5,0,0,
];
const heatmapColors = ['#F1F5F9', '#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'];

function Heatmap() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    el.innerHTML = '';
    heatmapData.forEach(level => {
      const cell = document.createElement('div');
      cell.style.cssText = `aspect-ratio:1;border-radius:3px;background:${heatmapColors[level]};cursor:pointer;transition:transform 0.15s;`;
      cell.addEventListener('mouseenter', () => { cell.style.transform = 'scale(1.3)'; cell.style.zIndex = '1'; cell.style.position = 'relative'; });
      cell.addEventListener('mouseleave', () => { cell.style.transform = ''; cell.style.zIndex = ''; cell.style.position = ''; });
      el.appendChild(cell);
    });
  }, []);

  return (
    <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }} />
  );
}

export default function TeamActivityPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ta-anim { animation: fadeInUp 0.35s ease-out backwards; }
        .ta-card:hover { border-color: #C7D2FE !important; box-shadow: 0 4px 16px rgba(99,102,241,0.08) !important; transform: translateY(-1px) !important; }
        .ta-fi:hover { background: #FAFAFF !important; }
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
          <span style={{ color: '#0F172A', fontWeight: 700 }}>Team Activity</span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-calendar-line" /> Last 30 Days
        </button>
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-download-2-line" /> Export
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-team-line" style={{ fontSize: '1.25rem', color: '#8B5CF6' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Team Activity</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>12 team members — 8 active today</div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Active Today',      value: '8', extra: '/ 12', sub: 'team members',              color: '#8B5CF6' },
              { label: 'TC Created Today',  value: '14', sub: 'across 4 projects',                         color: '#0F172A' },
              { label: 'TC Executed Today', value: '89', sub: '73 passed, 12 failed, 4 blocked',            color: '#16A34A' },
              { label: 'Avg Response Time', value: '2.4h', sub: 'to blocked/failed items',                  color: '#0F172A' },
            ].map((card, i) => (
              <div key={i} className="ta-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: `${i * 0.05}s` }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>
                  {card.value}
                  {card.extra && <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94A3B8' }}> {card.extra}</span>}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="ta-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1rem', animationDelay: '0.2s' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>Team Activity — Last 4 Weeks</div>
            <Heatmap />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginTop: '0.375rem' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <span key={d} style={{ fontSize: '0.5625rem', color: '#94A3B8', textAlign: 'center', fontWeight: 500 }}>{d}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.5625rem', color: '#94A3B8' }}>Less</span>
              {heatmapColors.map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
              ))}
              <span style={{ fontSize: '0.5625rem', color: '#94A3B8' }}>More</span>
            </div>
          </div>

          {/* Main Grid: Members + Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem' }}>

            {/* Team Members */}
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ri-group-line" style={{ color: '#8B5CF6' }} /> Team Members
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {members.map((m, i) => (
                  <div key={i} className="ta-anim ta-card" style={{
                    background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem',
                    padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    opacity: m.online ? 1 : 0.6,
                    animationDelay: `${0.2 + i * 0.04}s`,
                  }}>
                    <div style={{ position: 'relative', width: '2.5rem', height: '2.5rem', flexShrink: 0 }}>
                      <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                        {m.initials}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: m.online ? '#16A34A' : '#CBD5E1', border: '2px solid #fff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>{m.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{m.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      {[
                        { count: m.executed, label: 'Executed', color: '#0F172A' },
                        { count: m.created,  label: 'Created',  color: '#16A34A' },
                        { count: m.failed,   label: 'Failed',   color: '#EF4444' },
                      ].map(stat => (
                        <div key={stat.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.count}</div>
                          <div style={{ fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8', marginTop: '0.125rem' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right', minWidth: 100 }}>
                      <div style={{ fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{m.lastAction}</div>
                      {m.lastTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ri-history-line" style={{ color: '#8B5CF6' }} /> Live Activity Feed
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Today</span>
                  <a href="#" style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>Full History →</a>
                </div>
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {feedItems.map((item, i) => {
                    const bs = badgeStyle[item.badge.type];
                    return (
                      <div key={i} className="ta-fi" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: i < feedItems.length - 1 ? '1px solid #F1F5F9' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: '0.125rem' }}>
                          {item.initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.4 }}>
                            <strong style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</strong>
                            {' '}
                            <span style={{ color: '#6366F1', fontWeight: 600 }}>{item.action}</span>
                            {' '}
                            <span style={{ color: '#475569' }}>{item.target}</span>
                            <span style={{ fontSize: '0.625rem', fontWeight: 500, padding: '0.0625rem 0.375rem', borderRadius: '9999px', marginLeft: '0.375rem', background: bs.bg, color: bs.color }}>
                              {item.badge.text}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#94A3B8', marginTop: '0.25rem' }}>{item.time} · {item.project}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
