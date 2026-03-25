import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { usePassRateReport } from '../../hooks/usePassRateReport';
import { supabase } from '../../lib/supabase';

const priorityStyle: Record<string, { color: string; bg: string }> = {
  critical: { color: '#DC2626', bg: '#FEF2F2' },
  high:     { color: '#D97706', bg: '#FEF3C7' },
  medium:   { color: '#6366F1', bg: '#EEF2FF' },
  low:      { color: '#16A34A', bg: '#F0FDF4' },
};

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function dateRangeLabel(): string {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function PassRateReportPage() {
  const { data, loading, error } = usePassRateReport();
  const [userInitials, setUserInitials] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('full_name, avatar_emoji').eq('id', user.id).maybeSingle()
        .then(({ data: profile }) => {
          if (profile?.avatar_emoji) { setUserInitials(profile.avatar_emoji); return; }
          const name = profile?.full_name || user.email || '';
          const parts = name.split(/\s+/);
          setUserInitials(parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase());
        });
    });
  }, []);

  const maxDayTotal = data
    ? Math.max(...data.dailyTrend.map(d => d.passed + d.failed + d.blocked), 1)
    : 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .pr-anim { animation: fadeInUp 0.35s ease-out backwards; }
        .pr-row:hover td { background: #FAFAFF !important; }
        .pr-fi:hover { background: #FFFBFB !important; }
        .pr-daybar:hover { opacity: 0.85; }
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
          <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            {userInitials || '?'}
          </div>
        </div>
      </header>

      {/* Sub-header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0.625rem 1.5rem', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
          <Link to="/projects" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>Projects</Link>
          <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}><i className="ri-arrow-right-s-line" /></span>
          <span style={{ color: '#0F172A', fontWeight: 700 }}>Pass Rate Report — Last 7 Days</span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-download-2-line" /> Export PDF
        </button>
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-calendar-line" /> {dateRangeLabel()}
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
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-bar-chart-2-line" style={{ fontSize: '1.25rem', color: '#16A34A' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Pass Rate Report</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>7-day test execution results across all projects</div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#94A3B8', fontSize: '0.875rem' }}>
              <i className="ri-loader-4-line" style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />Loading report…
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary Cards (5-col) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {(() => {
                  const pct = data.totalExecuted > 0 ? `${data.overallPassRate}%` : '—';
                  const failPct = data.totalExecuted > 0 ? `${((data.failed / data.totalExecuted) * 100).toFixed(1)}%` : '—';
                  const blockPct = data.totalExecuted > 0 ? `${((data.blocked / data.totalExecuted) * 100).toFixed(1)}%` : '—';
                  const passPct = data.totalExecuted > 0 ? `${((data.passed / data.totalExecuted) * 100).toFixed(1)}%` : '—';
                  const hasDelta = data.passRateDelta !== null;
                  const deltaPos = hasDelta && data.passRateDelta! >= 0;
                  return [
                    { label: 'Overall Pass Rate', value: pct, sub: 'vs previous 7 days', color: data.overallPassRate >= 80 ? '#16A34A' : data.overallPassRate >= 60 ? '#F59E0B' : '#EF4444', badge: hasDelta ? { text: `${deltaPos ? '+' : ''}${data.passRateDelta}%`, color: deltaPos ? '#16A34A' : '#EF4444', bg: deltaPos ? '#F0FDF4' : '#FEF2F2' } : undefined },
                    { label: 'Total Executed', value: fmt(data.totalExecuted), sub: 'test case executions', color: '#0F172A' },
                    { label: 'Passed',         value: fmt(data.passed),        sub: `${passPct} of executed`,   color: '#16A34A' },
                    { label: 'Failed',         value: fmt(data.failed),        sub: `${failPct} of executed`,   color: '#EF4444' },
                    { label: 'Blocked',        value: fmt(data.blocked),       sub: `${blockPct} of executed`,  color: '#F59E0B' },
                  ];
                })().map((card, i) => (
                  <div key={i} className="pr-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: `${i * 0.04}s` }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>{card.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>
                      {card.value}
                      {card.badge && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.badge.color, background: card.badge.bg, padding: '0.125rem 0.375rem', borderRadius: '9999px', marginLeft: '0.375rem', verticalAlign: 'middle' }}>
                          {card.badge.text}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem' }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* 7-Day Trend Chart */}
              {data.dailyTrend.length > 0 && (
                <div className="pr-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', animationDelay: '0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Daily Pass / Fail / Blocked — Last 7 Days</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {[
                        { color: '#16A34A', label: 'Passed' },
                        { color: '#EF4444', label: 'Failed' },
                        { color: '#F59E0B', label: 'Blocked' },
                      ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: '#64748B' }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} /> {l.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: '220px' }}>
                    <svg viewBox="0 0 700 220" width="100%" height="100%" preserveAspectRatio="none">
                      {[20, 60, 100, 140, 180].map(y => (
                        <line key={y} x1={50} y1={y} x2={680} y2={y} stroke="#F1F5F9" strokeWidth={1} />
                      ))}
                      {data.dailyTrend.map((day, i) => {
                        const bw = 60;
                        const gap = 26;
                        const x = 66 + i * (bw + gap);
                        const scale = 160 / maxDayTotal;
                        const passH = day.passed * scale;
                        const failH = day.failed * scale;
                        const blockH = day.blocked * scale;
                        const totalH = passH + failH + blockH;
                        const baseY = 185;
                        const opacity = day.isToday ? 0.7 : 1;
                        return (
                          <g key={i} className="pr-daybar" opacity={opacity}>
                            <rect x={x} y={baseY - passH} width={bw} height={passH} rx={0} fill="#16A34A" />
                            <rect x={x} y={baseY - passH - blockH} width={bw} height={blockH} fill="#F59E0B" />
                            <rect x={x} y={baseY - totalH} width={bw} height={failH} rx={3} fill="#EF4444" />
                          </g>
                        );
                      })}
                      {data.dailyTrend.map((day, i) => {
                        const bw = 60;
                        const gap = 26;
                        const x = 66 + i * (bw + gap) + bw / 2;
                        return <text key={i} x={x} y={205} fontSize="9" fill="#94A3B8" textAnchor="middle" fontFamily="Inter, sans-serif">{day.label}</text>;
                      })}
                    </svg>
                  </div>
                </div>
              )}

              {/* Two-Column: Project Rates + Failed TCs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

                {/* Project Pass Rates */}
                <div className="pr-anim" style={{ animationDelay: '0.3s' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-pie-chart-line" style={{ color: '#6366F1' }} /> Pass Rate by Project
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    {data.byProject.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>No execution data yet</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC' }}>
                            {['Project', 'Pass Rate', 'Executed'].map(th => (
                              <th key={th} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }}>{th}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.byProject.map((row, i) => (
                            <tr key={i} className="pr-row" style={{ borderBottom: i < data.byProject.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#0F172A' }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.dot }} />
                                  {row.projectName}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${row.passRate}%`, height: '100%', background: row.rateColor, borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 800, width: 48, textAlign: 'right', color: row.rateColor }}>{row.passRate}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>{row.executed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Failed Test Cases */}
                <div className="pr-anim" style={{ animationDelay: '0.35s' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-close-circle-line" style={{ color: '#EF4444' }} /> Failed Test Cases
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        Recent Failures
                        {data.failed > 0 && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>{data.failed}</span>
                        )}
                      </span>
                      <Link to="/projects" style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
                    </div>
                    {data.failedItems.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.875rem' }}>No failures in the last 7 days</div>
                    ) : (
                      data.failedItems.map((item, i) => {
                        const ps = priorityStyle[item.priority?.toLowerCase()] ?? priorityStyle['medium'];
                        return (
                          <div key={i} className="pr-fi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: i < data.failedItems.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                            <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="ri-close-line" style={{ fontSize: '0.75rem', color: '#EF4444' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span style={{ color: '#94A3B8', marginRight: '0.25rem' }}>TC-{String(i + 1).padStart(3, '0')}:</span>{item.title}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.125rem' }}>{item.projectName} · Failed {item.failCount} {item.failCount === 1 ? 'time' : 'times'}</div>
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: ps.bg, color: ps.color, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{item.priority}</span>
                            <span style={{ fontSize: '0.6875rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.lastFailedAt}</span>
                          </div>
                        );
                      })
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
