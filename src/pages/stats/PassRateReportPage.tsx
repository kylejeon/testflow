import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';

const projectRates = [
  { dot: '#EC4899', name: 'Payment Integration', rate: 93.4, rateColor: '#16A34A', executed: 287 },
  { dot: '#6366F1', name: 'Mobile App v2',        rate: 91.2, rateColor: '#16A34A', executed: 512 },
  { dot: '#F59E0B', name: 'Admin Dashboard',      rate: 89.7, rateColor: '#16A34A', executed: 348 },
  { dot: '#8B5CF6', name: 'Web Dashboard',        rate: 88.5, rateColor: '#16A34A', executed: 408 },
  { dot: '#10B981', name: 'API Gateway v3',       rate: 82.1, rateColor: '#F59E0B', executed: 287 },
];

const failedItems = [
  { name: 'TC-2801: OAuth token refresh race condition',         project: 'API Gateway v3',     priority: 'Critical', time: '1h ago',  failCount: 3 },
  { name: 'TC-2756: WebSocket reconnection after network drop',  project: 'API Gateway v3',     priority: 'Critical', time: '2h ago',  failCount: 5 },
  { name: 'TC-2834: Payment timeout 3DS verification',          project: 'Payment Integration', priority: 'High',     time: '3h ago',  failCount: 2 },
  { name: 'TC-2819: Dashboard widget drag reorder persistence', project: 'Admin Dashboard',     priority: 'Medium',   time: '5h ago',  failCount: 1 },
  { name: 'TC-2798: Push notification deep-link iOS 17',        project: 'Mobile App v2',       priority: 'High',     time: '8h ago',  failCount: 2 },
  { name: 'TC-2785: RBAC permission escalation edge case',      project: 'Admin Dashboard',     priority: 'Critical', time: '12h ago', failCount: 1 },
];

const priorityStyle: Record<string, { color: string; bg: string }> = {
  Critical: { color: '#DC2626', bg: '#FEF2F2' },
  High:     { color: '#D97706', bg: '#FEF3C7' },
  Medium:   { color: '#6366F1', bg: '#EEF2FF' },
};

// Chart data: 7 days — [passed, failed, blocked]
const chartDays = [
  { label: 'Mar 19', pass: 141, fail: 12, block: 8 },
  { label: 'Mar 20', pass: 153, fail: 12, block: 8 },
  { label: 'Mar 21', pass: 125, fail: 14, block: 7 },
  { label: 'Mar 22', pass: 147, fail: 12, block: 8 },
  { label: 'Mar 23', pass: 157, fail: 11, block: 8 },
  { label: 'Mar 24', pass: 165, fail: 8,  block: 8 },
  { label: 'Today',  pass: 141, fail: 19, block: 7, partial: true },
];
const maxDayTotal = Math.max(...chartDays.map(d => d.pass + d.fail + d.block));

export default function PassRateReportPage() {
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
          <i className="ri-calendar-line" /> Mar 19 – Mar 25
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

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

          {/* Summary Cards (5-col) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Overall Pass Rate', value: '87.3%', sub: 'vs previous 7 days', color: '#16A34A', badge: { text: '+2.1%', color: '#16A34A', bg: '#F0FDF4' } },
              { label: 'Total Executed',   value: '1,842', sub: 'test case executions', color: '#0F172A' },
              { label: 'Passed',           value: '1,608', sub: '87.3% of executed',    color: '#16A34A' },
              { label: 'Failed',           value: '156',   sub: '8.5% of executed',     color: '#EF4444' },
              { label: 'Blocked',          value: '78',    sub: '4.2% of executed',     color: '#F59E0B' },
            ].map((card, i) => (
              <div key={i} className="pr-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: `${i * 0.04}s` }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>
                  {card.value}
                  {card.badge && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.badge.color, background: card.badge.bg, padding: '0.125rem 0.375rem', borderRadius: '9999px', marginLeft: '0.375rem', verticalAlign: 'middle' }}>
                      <i className="ri-arrow-up-s-line" style={{ fontSize: '0.75rem' }} />{card.badge.text}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* 7-Day Trend Chart */}
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
                {/* Gridlines */}
                {[20, 60, 100, 140, 180].map(y => (
                  <line key={y} x1={50} y1={y} x2={680} y2={y} stroke="#F1F5F9" strokeWidth={1} />
                ))}
                {/* Y Labels */}
                {[{ y: 24, t: '300' }, { y: 64, t: '250' }, { y: 104, t: '200' }, { y: 144, t: '150' }, { y: 184, t: '100' }].map(l => (
                  <text key={l.y} x={44} y={l.y} fontSize="9" fill="#94A3B8" textAnchor="end" fontFamily="Inter, sans-serif">{l.t}</text>
                ))}
                {/* Bars */}
                {chartDays.map((day, i) => {
                  const bw = 60;
                  const totalSlots = 7;
                  const gap = (630 - totalSlots * bw) / (totalSlots - 1);
                  const x = 60 + i * (bw + gap);
                  const scale = 160 / maxDayTotal;
                  const passH = day.pass * scale;
                  const failH = day.fail * scale;
                  const blockH = day.block * scale;
                  const totalH = passH + failH + blockH;
                  const baseY = 185;
                  const opacity = day.partial ? 0.7 : 1;
                  return (
                    <g key={i} className="pr-daybar" opacity={opacity}>
                      <rect x={x} y={baseY - passH} width={bw} height={passH} rx={0} fill="#16A34A" />
                      <rect x={x} y={baseY - passH - blockH} width={bw} height={blockH} fill="#F59E0B" />
                      <rect x={x} y={baseY - totalH} width={bw} height={failH} rx={3} fill="#EF4444" />
                    </g>
                  );
                })}
                {/* X Labels */}
                {chartDays.map((day, i) => {
                  const bw = 60;
                  const gap = (630 - 7 * bw) / 6;
                  const x = 60 + i * (bw + gap) + bw / 2;
                  return <text key={i} x={x} y={205} fontSize="9" fill="#94A3B8" textAnchor="middle" fontFamily="Inter, sans-serif">{day.label}</text>;
                })}
              </svg>
            </div>
          </div>

          {/* Two-Column: Project Rates + Failed TCs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

            {/* Project Pass Rates */}
            <div className="pr-anim" style={{ animationDelay: '0.3s' }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ri-pie-chart-line" style={{ color: '#6366F1' }} /> Pass Rate by Project
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Project', 'Pass Rate', 'Executed'].map(th => (
                        <th key={th} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }}>{th}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projectRates.map((row, i) => (
                      <tr key={i} className="pr-row" style={{ borderBottom: i < projectRates.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#0F172A' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.dot }} />
                            {row.name}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${row.rate}%`, height: '100%', background: row.rateColor, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 800, width: 48, textAlign: 'right', color: row.rateColor }}>{row.rate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>{row.executed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>156</span>
                  </span>
                  <a href="#" style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View All →</a>
                </div>
                {failedItems.map((item, i) => {
                  const ps = priorityStyle[item.priority];
                  return (
                    <div key={i} className="pr-fi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: i < failedItems.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                      <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ri-close-line" style={{ fontSize: '0.75rem', color: '#EF4444' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.125rem' }}>{item.project} · Failed {item.failCount} {item.failCount === 1 ? 'time' : 'times'}</div>
                      </div>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: ps.bg, color: ps.color, whiteSpace: 'nowrap' }}>{item.priority}</span>
                      <span style={{ fontSize: '0.6875rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
