import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';

const GRAD_ID = 'tcSparkGrad';

const projectRows = [
  { dot: '#EC4899', name: 'Payment Integration',  count: 847,  added: 8,  sparkline: [820,825,830,834,838,843,847], critical: 12, passRate: 93 },
  { dot: '#6366F1', name: 'Mobile App v2',         count: 712,  added: 12, sparkline: [688,694,700,703,706,709,712], critical: 18, passRate: 91 },
  { dot: '#F59E0B', name: 'Admin Dashboard',       count: 534,  added: 5,  sparkline: [522,526,527,529,530,532,534], critical: 7,  passRate: 90 },
  { dot: '#8B5CF6', name: 'Web Dashboard',         count: 418,  added: 4,  sparkline: [409,411,412,413,414,415,418], critical: 5,  passRate: 89 },
  { dot: '#10B981', name: 'API Gateway v3',        count: 336,  added: 3,  sparkline: [327,329,330,331,332,333,336], critical: 9,  passRate: 82 },
];

const recentItems = [
  { priority: 'critical', name: 'TC-2847: OAuth token refresh race condition under load',           project: 'API Gateway v3',    time: '4 min ago' },
  { priority: 'high',     name: 'TC-2846: WebSocket reconnection after network interruption',       project: 'API Gateway v3',    time: '12 min ago' },
  { priority: 'medium',   name: 'TC-2845: Dashboard widget drag-and-drop reorder persistence',      project: 'Admin Dashboard',   time: '28 min ago' },
  { priority: 'critical', name: 'TC-2844: Payment timeout during 3DS verification flow',            project: 'Payment Integration', time: '45 min ago' },
  { priority: 'low',      name: 'TC-2843: Push notification deep-link handling on iOS 17',         project: 'Mobile App v2',     time: '1h ago' },
  { priority: 'high',     name: 'TC-2842: RBAC permission escalation edge case for admin role',    project: 'Admin Dashboard',   time: '1.5h ago' },
];

const weeklyData = [
  { label: 'W1', val: 2680 },
  { label: 'W2', val: 2712 },
  { label: 'W3', val: 2749 },
  { label: 'W4', val: 2771 },
  { label: 'W5', val: 2798 },
  { label: 'W6', val: 2821 },
  { label: 'W7', val: 2836 },
  { label: 'W8', val: 2847 },
];

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const W = 64, H = 24, PAD = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${pts.join(' L')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const priorityDot: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#6366F1',
  low: '#94A3B8',
};

const barMax = Math.max(...weeklyData.map(d => d.val));
const chartH = 140;

export default function TestCasesOverviewPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .tco-anim { animation: fadeInUp 0.35s ease-out backwards; }
        .tco-row:hover td { background: #FAFAFF !important; }
        .tco-ri:hover { background: #FAFAFF !important; }
        .tco-bar:hover { opacity: 0.8; }
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
          <span style={{ color: '#0F172A', fontWeight: 700 }}>Test Cases Overview</span>
        </div>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-download-2-line" /> Export CSV
        </button>
        <button style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #6366F1', background: '#6366F1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-add-line" /> New Test Case
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-file-list-3-line" style={{ fontSize: '1.25rem', color: '#6366F1' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Test Cases Overview</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>2,847 total test cases across 5 projects</div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Test Cases', value: '2,847', sub: '+32 this week', valueColor: '#0F172A', badge: { text: '+32', color: '#16A34A', bg: '#F0FDF4' } },
              { label: 'Active',           value: '2,412', sub: '84.7% of total', valueColor: '#16A34A' },
              { label: 'Draft',            value: '298',   sub: '10.5% of total', valueColor: '#F59E0B' },
              { label: 'Deprecated',       value: '137',   sub: '4.8% of total',  valueColor: '#94A3B8' },
            ].map((card, i) => (
              <div key={i} className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: `${i * 0.05}s` }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.valueColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {card.value}
                  {card.badge && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.badge.color, background: card.badge.bg, padding: '0.125rem 0.375rem', borderRadius: '9999px', marginLeft: '0.375rem' }}>
                      {card.badge.text}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem' }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* By Priority */}
            <div className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', animationDelay: '0.2s' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ri-flag-2-line" style={{ color: '#6366F1' }} /> By Priority
              </div>
              {[
                { label: 'Critical', count: 284,  pct: 10,  color: '#EF4444' },
                { label: 'High',     count: 641,  pct: 22.5, color: '#F59E0B' },
                { label: 'Medium',   count: 1138, pct: 40,  color: '#6366F1' },
                { label: 'Low',      count: 784,  pct: 27.5, color: '#94A3B8' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', width: 72, flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', width: 40, textAlign: 'right', flexShrink: 0 }}>{row.count}</span>
                </div>
              ))}
            </div>
            {/* By Status */}
            <div className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', animationDelay: '0.2s' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="ri-bar-chart-horizontal-line" style={{ color: '#6366F1' }} /> By Status
              </div>
              {[
                { label: 'Active',      count: 2412, pct: 84.7, color: '#16A34A' },
                { label: 'Draft',       count: 298,  pct: 10.5, color: '#F59E0B' },
                { label: 'Deprecated',  count: 137,  pct: 4.8,  color: '#94A3B8' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', width: 72, flexShrink: 0 }}>{row.label}</span>
                  <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', width: 40, textAlign: 'right', flexShrink: 0 }}>{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Growth Chart */}
          <div className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', animationDelay: '0.25s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Weekly Growth — Test Cases Added</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6875rem', color: '#64748B' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6366F1' }} /> Added this week
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8B5CF6', marginLeft: '0.5rem' }} /> Trend
              </div>
            </div>
            <div style={{ position: 'relative', height: '180px' }}>
              <svg viewBox="0 0 700 180" width="100%" height="100%" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={GRAD_ID} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                {[20, 55, 90, 125, 160].map(y => (
                  <line key={y} x1={50} y1={y} x2={680} y2={y} stroke="#F1F5F9" strokeWidth={1} />
                ))}
                {/* Y labels */}
                {[{ y: 24, label: '2900' }, { y: 59, label: '2800' }, { y: 94, label: '2700' }, { y: 129, label: '2600' }, { y: 164, label: '2500' }].map(l => (
                  <text key={l.y} x={44} y={l.y} fontSize="9" fill="#94A3B8" textAnchor="end" fontFamily="Inter, sans-serif">{l.label}</text>
                ))}
                {/* Bars */}
                {weeklyData.map((d, i) => {
                  const bw = 52;
                  const gap = (630 - weeklyData.length * bw) / (weeklyData.length - 1);
                  const x = 60 + i * (bw + gap);
                  const barH = ((d.val - 2500) / 400) * chartH;
                  const y = 160 - barH;
                  return (
                    <rect key={i} className="tco-bar" x={x} y={y} width={bw} height={barH} rx={3} fill="#6366F1" opacity={i === weeklyData.length - 1 ? 0.7 : 1} />
                  );
                })}
                {/* Trend line */}
                {(() => {
                  const bw = 52;
                  const gap = (630 - weeklyData.length * bw) / (weeklyData.length - 1);
                  const pts = weeklyData.map((d, i) => {
                    const x = 60 + i * (bw + gap) + bw / 2;
                    const barH = ((d.val - 2500) / 400) * chartH;
                    const y = 160 - barH;
                    return `${x},${y}`;
                  });
                  return <polyline points={pts.join(' ')} fill="none" stroke="#8B5CF6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
                })()}
                {/* Trend dots */}
                {weeklyData.map((d, i) => {
                  const bw = 52;
                  const gap = (630 - weeklyData.length * bw) / (weeklyData.length - 1);
                  const x = 60 + i * (bw + gap) + bw / 2;
                  const barH = ((d.val - 2500) / 400) * chartH;
                  const y = 160 - barH;
                  return <circle key={i} cx={x} cy={y} r={3.5} fill="#8B5CF6" stroke="#fff" strokeWidth={2} />;
                })}
                {/* X labels */}
                {weeklyData.map((d, i) => {
                  const bw = 52;
                  const gap = (630 - weeklyData.length * bw) / (weeklyData.length - 1);
                  const x = 60 + i * (bw + gap) + bw / 2;
                  return <text key={i} x={x} y={175} fontSize="9" fill="#94A3B8" textAnchor="middle" fontFamily="Inter, sans-serif">{d.label}</text>;
                })}
              </svg>
            </div>
          </div>

          {/* Test Cases by Project Table */}
          <div className="tco-anim" style={{ animationDelay: '0.3s', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="ri-folder-3-line" style={{ color: '#6366F1' }} /> Test Cases by Project
            </div>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Project', 'Total TCs', 'Added (7d)', 'Growth', 'Critical', 'Pass Rate'].map(th => (
                      <th key={th} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }}>{th}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((row, i) => (
                    <tr key={i} className="tco-row" style={{ borderBottom: i < projectRows.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#0F172A' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.dot, flexShrink: 0 }} />
                          {row.name}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#0F172A' }}>{row.count.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                          +{row.added}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <MiniSparkline data={row.sparkline} color="#6366F1" />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444' }}>{row.critical}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: row.passRate >= 90 ? '#16A34A' : row.passRate >= 80 ? '#F59E0B' : '#EF4444' }}>{row.passRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Additions */}
          <div className="tco-anim" style={{ animationDelay: '0.35s' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="ri-time-line" style={{ color: '#6366F1' }} /> Recent Additions
            </div>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Latest Test Cases</span>
                <a href="#" style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View All →</a>
              </div>
              {recentItems.map((item, i) => (
                <div key={i} className="tco-ri" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: i < recentItems.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityDot[item.priority], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: '#EEF2FF', color: '#6366F1', whiteSpace: 'nowrap' }}>{item.project}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
