import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { usePassRateReport, type PeriodFilter } from '../../hooks/usePassRateReport';
import PageLoader from '../../components/PageLoader';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/Avatar';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import NotificationBell from '../../components/feature/NotificationBell';
import { queryClient } from '../../lib/queryClient';

const priorityStyle: Record<string, { color: string; bg: string }> = {
  critical: { color: '#DC2626', bg: '#FEF2F2' },
  high:     { color: '#D97706', bg: '#FEF3C7' },
  medium:   { color: '#6366F1', bg: '#EEF2FF' },
  low:      { color: '#16A34A', bg: '#F0FDF4' },
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string; desc: string }[] = [
  { value: 'active_run', label: 'Active Run',   desc: '— ongoing runs' },
  { value: '7d',         label: 'Last 7 Days',  desc: '' },
  { value: '30d',        label: 'Last 30 Days', desc: '' },
  { value: 'all',        label: 'All Time',     desc: '' },
];

const LS_KEY = 'passrate_period';

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function PassRateReportPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>(
    () => (localStorage.getItem(LS_KEY) as PeriodFilter | null) ?? 'active_run'
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { data, loading, error } = usePassRateReport(period);
  const [userInitials, setUserInitials] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>();
  const [userAvatarId, setUserAvatarId] = useState<string | undefined>();
  const [userAvatarName, setUserAvatarName] = useState<string | undefined>();
  const [userAvatarEmail, setUserAvatarEmail] = useState<string | undefined>();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Persist period selection
  useEffect(() => {
    localStorage.setItem(LS_KEY, period);
  }, [period]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      queryClient.clear();
      navigate('/auth');
    } catch {}
  };

  const selectedOption = PERIOD_OPTIONS.find(o => o.value === period) ?? PERIOD_OPTIONS[0];
  const periodLabel = selectedOption.label;

  async function exportPDF() {
    if (!pdfContentRef.current || exporting) return;
    setExporting(true);
    try {
      const el = pdfContentRef.current;
      const canvas = await toCanvas(el, {
        pixelRatio: 2,
        backgroundColor: '#F8FAFC',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      let yPos = margin;
      let remainingH = imgH;
      const sliceH = pageH - margin * 2;

      // Multi-page: slice canvas across pages
      while (remainingH > 0) {
        const currentSlice = Math.min(remainingH, sliceH);
        const srcY = (imgH - remainingH) * (canvas.height / imgH);
        const srcH = currentSlice * (canvas.height / imgH);

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);

        if (yPos > margin) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', margin, margin, imgW, currentSlice);
        remainingH -= currentSlice;
        yPos += currentSlice;
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`pass-rate-report-${date}.pdf`);
    } catch (e) {
      console.error('Export PDF error:', e);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('full_name, avatar_emoji, avatar_url').eq('id', user.id).maybeSingle()
        .then(({ data: profile }) => {
          setUserAvatarId(user.id);
          setUserAvatarEmail(user.email || undefined);
          setUserAvatarName(profile?.full_name || undefined);
          setUserAvatarUrl(profile?.avatar_url || undefined);
          if (profile?.avatar_emoji) { setUserInitials(profile.avatar_emoji); return; }
          const name = profile?.full_name || user.email || '';
          const parts = name.split(/\s+/);
          setUserInitials(parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase());
        });
    });
  }, []);

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }

  function ChartTooltip({ active, payload, label }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const passed  = payload.find(p => p.name === 'passed')?.value  ?? 0;
    const failed  = payload.find(p => p.name === 'failed')?.value  ?? 0;
    const blocked = payload.find(p => p.name === 'blocked')?.value ?? 0;
    return (
      <div style={{ background: '#1E293B', color: '#fff', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.6875rem', lineHeight: 1.6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '140px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem' }}>{label}</div>
        {([
          { color: '#22C55E', label: 'Passed',  value: passed },
          { color: '#EF4444', label: 'Failed',  value: failed },
          { color: '#F59E0B', label: 'Blocked', value: blocked },
        ] as const).map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#CBD5E1' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: row.color, flexShrink: 0, display: 'inline-block' }} />
              {row.label}
            </span>
            <span style={{ fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
          </div>
        ))}
        <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '0.25rem 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span style={{ fontWeight: 600, color: '#fff' }}>Total</span>
          <span style={{ fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{passed + failed + blocked}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .pr-anim { animation: fadeInUp 0.35s ease-out backwards; }
        .pr-row:hover td { background: #FAFAFF !important; }
        .pr-fi:hover { background: #FFFBFB !important; }
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <NotificationBell />
          <div ref={profileMenuRef} style={{ position: 'relative' }}>
            <div onClick={() => setShowProfileMenu(v => !v)} style={{ cursor: 'pointer' }}>
              <Avatar userId={userAvatarId} name={userAvatarName} email={userAvatarEmail} photoUrl={userAvatarUrl} size="sm" />
            </div>
            {showProfileMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowProfileMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', width: '14rem', background: '#fff', borderRadius: '0.625rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', zIndex: 20, overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{userAvatarName || userAvatarEmail || 'User'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{userAvatarEmail}</p>
                  </div>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', borderBottom: '1px solid #F1F5F9' }} className="hover:bg-gray-50">
                    <i className="ri-settings-3-line text-lg" /><span>Settings</span>
                  </Link>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} className="hover:bg-gray-50">
                    <i className="ri-logout-box-line text-lg" /><span>Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sub-header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0.625rem 1.5rem', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
          <Link to="/projects" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>Projects</Link>
          <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}><i className="ri-arrow-right-s-line" /></span>
          <span style={{ color: '#0F172A', fontWeight: 700 }}>Pass Rate Report — {periodLabel}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={exportPDF} disabled={exporting || !data} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: exporting ? '#F8FAFC' : '#fff', color: exporting ? '#94A3B8' : '#475569', cursor: exporting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className={exporting ? 'ri-loader-4-line' : 'ri-download-2-line'} style={exporting ? { animation: 'spin 1s linear infinite' } : {}} /> {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
        {/* Period filter dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: `1px solid ${dropdownOpen ? '#6366F1' : '#E2E8F0'}`, background: dropdownOpen ? '#EEF2FF' : '#fff', color: dropdownOpen ? '#6366F1' : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}
          >
            <i className="ri-filter-3-line" /> {periodLabel} <i className="ri-arrow-down-s-line" />
          </button>
          {dropdownOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '0.25rem 0', minWidth: 180, zIndex: 50 }}>
              {PERIOD_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => { setPeriod(opt.value); setDropdownOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: period === opt.value ? '#6366F1' : '#334155', fontWeight: period === opt.value ? 600 : 400, cursor: 'pointer', background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{opt.label}{opt.desc && <span style={{ fontSize: '0.6875rem', color: '#94A3B8', marginLeft: '0.25rem' }}>{opt.desc}</span>}</span>
                  {period === opt.value && <i className="ri-check-line" style={{ fontSize: '0.875rem', color: '#6366F1' }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div ref={pdfContentRef} style={{ maxWidth: '1200px', margin: '0 auto' }}>

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
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>{periodLabel} test execution results across all projects</div>
            </div>
          </div>

          {/* Loading */}
          {loading && <PageLoader />}

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
                  const deltaSub = data.deltaLabel ? data.deltaLabel : 'overall pass rate';
                  return [
                    { label: 'Overall Pass Rate', value: pct, sub: deltaSub, color: data.overallPassRate >= 80 ? '#16A34A' : data.overallPassRate >= 60 ? '#F59E0B' : '#EF4444', badge: hasDelta ? { text: `${deltaPos ? '+' : ''}${data.passRateDelta}%`, color: deltaPos ? '#16A34A' : '#EF4444', bg: deltaPos ? '#F0FDF4' : '#FEF2F2' } : undefined },
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
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.dailyTrend} barCategoryGap="35%" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} width={35} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(241,245,249,0.6)' }} />
                      <Bar dataKey="passed"  stackId="a" fill="#16A34A" name="passed" />
                      <Bar dataKey="blocked" stackId="a" fill="#F59E0B" name="blocked" />
                      <Bar dataKey="failed"  stackId="a" fill="#EF4444" name="failed" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                      <Link to={`/testcases?status=failed&period=${period}`} style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
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
                                <span style={{ color: '#94A3B8', marginRight: '0.25rem' }}>{item.tcIdLabel}:</span>{item.title}
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
