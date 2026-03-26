import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { useTeamActivity } from '../../hooks/useTeamActivity';
import PageLoader from '../../components/PageLoader';

const badgeStyle: Record<string, { bg: string; color: string }> = {
  created:   { bg: '#EEF2FF', color: '#6366F1' },
  executed:  { bg: '#ECFDF5', color: '#10B981' },
  failed:    { bg: '#FEF2F2', color: '#EF4444' },
  commented: { bg: '#FEF3C7', color: '#D97706' },
};

const HM_COLORS = ['#F1F5F9', '#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// GitHub style: rows 0–6 = Sun–Sat; show Mon(1)/Wed(3)/Fri(5) labels only
const DAY_LABELS: (string | null)[] = [null, 'Mon', null, 'Wed', null, 'Fri', null];
const HM_LABEL_W = 28;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function Heatmap({ data }: { data: number[] }) {
  const tooltip = useRef<HTMLDivElement | null>(null);

  // Anchor: oldest Sunday = 52 weeks back from this week's Sunday
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun
  const sunday52WeeksAgo = new Date(now);
  sunday52WeeksAgo.setDate(sunday52WeeksAgo.getDate() - todayDay - 51 * 7);
  sunday52WeeksAgo.setHours(0, 0, 0, 0);

  // Month labels: first week column where a new month starts
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < 52; col++) {
    const d = new Date(sunday52WeeksAgo);
    d.setDate(d.getDate() + col * 7);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ col, label: MONTH_NAMES[d.getMonth()] });
      lastMonth = d.getMonth();
    }
  }

  const hideTooltip = () => {
    if (tooltip.current) tooltip.current.style.display = 'none';
  };
  const showTooltip = (e: React.MouseEvent, col: number, row: number) => {
    const tip = tooltip.current;
    if (!tip) return;
    const d = new Date(sunday52WeeksAgo);
    d.setDate(d.getDate() + col * 7 + row);
    tip.textContent = toDateStr(d);
    tip.style.display = 'block';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const wrap = (e.currentTarget as HTMLElement).closest('.hm-wrap-outer') as HTMLElement | null;
    if (wrap) {
      const wb = wrap.getBoundingClientRect();
      tip.style.left = `${rect.left - wb.left + rect.width / 2}px`;
      tip.style.top = `${rect.top - wb.top - 24}px`;
    }
  };

  // Render: 7 rows × 52 cols; row 0=Sun … row 6=Sat (GitHub order)
  // Each row contains its label + cells in the same flex container → always aligned
  return (
    <div className="hm-wrap-outer" style={{ position: 'relative' }}>
      {/* Month labels row (with left spacer matching label column width) */}
      <div style={{ display: 'flex', marginBottom: 2 }}>
        <div style={{ width: HM_LABEL_W, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: 2, height: 13, alignItems: 'end' }}>
          {Array.from({ length: 52 }, (_, col) => {
            const lbl = monthLabels.find(m => m.col === col);
            return (
              <div key={col} style={{ fontSize: 9, color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'visible' }}>
                {lbl?.label ?? ''}
              </div>
            );
          })}
        </div>
      </div>
      {/* 7 day rows — label + cells share the same flex row for perfect alignment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: 7 }, (_, row) => (
          <div key={row} style={{ display: 'flex' }}>
            {/* Day label: only Mon/Wed/Fri visible; hidden rows still reserve space */}
            <div style={{
              width: HM_LABEL_W, flexShrink: 0,
              fontSize: 9, fontWeight: 500, textAlign: 'right', userSelect: 'none',
              color: DAY_LABELS[row] ? '#94A3B8' : 'transparent',
              paddingRight: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              {DAY_LABELS[row] ?? '\u00A0'}
            </div>
            {/* 52 weekly cells for this day-of-week */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: 2 }}>
              {Array.from({ length: 52 }, (_, col) => {
                const level = data[col * 7 + row] ?? 0;
                return (
                  <div
                    key={col}
                    style={{ aspectRatio: '1', borderRadius: 2, background: HM_COLORS[level], cursor: 'pointer', outline: '1px solid rgba(27,31,35,0.06)', outlineOffset: -1 }}
                    onMouseEnter={e => showTooltip(e, col, row)}
                    onMouseLeave={hideTooltip}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Tooltip */}
      <div ref={tooltip} style={{ display: 'none', position: 'absolute', pointerEvents: 'none', background: '#1E293B', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap', zIndex: 10, transform: 'translateX(-50%)' }} />
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: '0.375rem', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: '#94A3B8', margin: '0 2px' }}>Less</span>
        {HM_COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, outline: '1px solid rgba(27,31,35,0.06)', outlineOffset: -1 }} />
        ))}
        <span style={{ fontSize: 9, color: '#94A3B8', margin: '0 2px' }}>More</span>
      </div>
    </div>
  );
}

function getResponseTimeColor(hours: number | null): string {
  if (hours === null) return '#94A3B8';
  if (hours < 1) return '#16A34A';
  if (hours <= 4) return '#D97706';
  return '#DC2626';
}

function formatResponseTime(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

export default function TeamActivityPage() {
  const { data, loading, error } = useTeamActivity();

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
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#DC2626', fontSize: '0.875rem' }}>
              <i className="ri-error-warning-line" style={{ marginRight: '0.5rem' }} />{error}
            </div>
          )}

          {/* Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-team-line" style={{ fontSize: '1.25rem', color: '#8B5CF6' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Team Activity</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>
                {loading ? 'Loading…' : data ? `${data.totalMembers} team member${data.totalMembers !== 1 ? 's' : ''} — ${data.activeToday} active today` : ''}
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && <PageLoader />}

          {!loading && data && (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Active Today',      value: String(data.activeToday),     extra: `/ ${data.totalMembers}`, sub: 'team members',                                                                color: '#8B5CF6' },
                  { label: 'TC Created Today',  value: String(data.tcCreatedToday),  sub: 'new test cases',                                                                                               color: '#0F172A' },
                  { label: 'TC Executed Today', value: String(data.tcExecutedToday), sub: `${data.tcPassedToday} passed, ${data.tcFailedToday} failed, ${data.tcBlockedToday} blocked`,                  color: '#16A34A' },
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
                {/* 4th card: AVG Response Time */}
                <div className="ta-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: '0.15s' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>Avg Response Time</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getResponseTimeColor(data.avgResponseTimeHours), lineHeight: 1 }}>
                    {formatResponseTime(data.avgResponseTimeHours)}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    {data.avgResponseTimeHours === null ? 'no resolutions today' : data.avgResponseTimeHours < 1 ? 'great response today' : data.avgResponseTimeHours <= 4 ? 'acceptable today' : 'needs attention'}
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="ta-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1rem', animationDelay: '0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>{data.totalActivities.toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}>activities in the last year</span>
                </div>
                <Heatmap data={data.heatmapData} />
              </div>

              {/* Main Grid: Members + Feed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem' }}>

                {/* Team Members */}
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-group-line" style={{ color: '#8B5CF6' }} /> Team Members
                  </div>
                  {data.members.length === 0 ? (
                    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>
                      No team members found
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {data.members.map((m, i) => (
                        <div key={m.userId} className="ta-anim ta-card" style={{
                          background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem',
                          padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                          cursor: 'pointer', transition: 'all 0.2s ease',
                          opacity: m.isOnline || m.executedToday > 0 || m.createdToday > 0 ? 1 : 0.6,
                          animationDelay: `${0.2 + i * 0.04}s`,
                        }}>
                          <div style={{ position: 'relative', width: '2.5rem', height: '2.5rem', flexShrink: 0 }}>
                            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                              {m.initials}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: m.isOnline ? '#16A34A' : '#CBD5E1', border: '2px solid #fff' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>{m.name}</div>
                            <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{m.role || 'Member'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                            {[
                              { count: m.executedToday, label: 'Executed', color: '#0F172A' },
                              { count: m.createdToday,  label: 'Created',  color: '#16A34A' },
                              { count: m.failedToday,   label: 'Failed',   color: '#EF4444' },
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
                  )}
                </div>

                {/* Activity Feed */}
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-history-line" style={{ color: '#8B5CF6' }} /> Live Activity Feed
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Recent</span>
                    </div>
                    {data.feedItems.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>No recent activity</div>
                    ) : (
                      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                        {data.feedItems.map((item) => {
                          const bs = badgeStyle[item.badge.type] ?? badgeStyle['executed'];
                          return (
                            <div key={item.key} className="ta-fi" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s', cursor: 'pointer' }}>
                              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 700, color: '#fff', flexShrink: 0, marginTop: '0.125rem' }}>
                                {item.initials}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.4 }}>
                                  <strong style={{ fontWeight: 600, color: '#0F172A' }}>{item.actorName}</strong>
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
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
