import { useState, useRef, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { useTestCasesOverview, exportTestCasesCSV } from '../../hooks/useTestCasesOverview';
import NotificationBell from '../../components/feature/NotificationBell';
import QuickCreateTCModal from '../project-detail/components/QuickCreateTCModal';
import { supabase } from '../../lib/supabase';

/* ── Types ──────────────────────────────────────────────── */
interface UserProfile {
  email: string;
  full_name: string;
  subscription_tier: number;
  avatar_emoji: string;
}

const TIER_INFO = {
  1: { name: 'Free',         color: 'bg-gray-100 text-gray-700 border-gray-300',     icon: 'ri-user-line' },
  2: { name: 'Starter',      color: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: 'ri-vip-crown-line' },
  3: { name: 'Professional', color: 'bg-violet-50 text-violet-700 border-violet-300', icon: 'ri-vip-diamond-line' },
  4: { name: 'Enterprise',   color: 'bg-amber-50 text-amber-700 border-amber-300',    icon: 'ri-vip-diamond-line' },
};

/* ── Sparkline ──────────────────────────────────────────── */
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const W = 64, H = 24, PAD = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: parseFloat((PAD + (i / (data.length - 1)) * (W - PAD * 2)).toFixed(1)),
    y: parseFloat((PAD + (1 - (v - min) / range) * (H - PAD * 2)).toFixed(1)),
  }));
  const linePts = pts.map(p => `${p.x},${p.y}`).join(' L');
  const areaPath = `M${pts[0].x},${pts[0].y} L${pts.map(p => `${p.x},${p.y}`).join(' L')} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H}Z`;
  const gradId = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={`M${linePts}`} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Tier badge ─────────────────────────────────────────── */
const TIER_BG:     Record<number, string> = { 1: '#F1F5F9', 2: '#EEF2FF', 3: '#F5F3FF', 4: '#FFFBEB' };
const TIER_COLOR:  Record<number, string> = { 1: '#475569', 2: '#4338CA', 3: '#6D28D9', 4: '#92400E' };
const TIER_BORDER: Record<number, string> = { 1: '#CBD5E1', 2: '#A5B4FC', 3: '#C4B5FD', 4: '#FCD34D' };

function TierBadge({ tier }: { tier: number }) {
  const info = TIER_INFO[tier as keyof typeof TIER_INFO] ?? TIER_INFO[1];
  return (
    <div style={{ marginTop: '0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', border: `1px solid ${TIER_BORDER[tier] ?? '#CBD5E1'}`, background: TIER_BG[tier] ?? '#F1F5F9', color: TIER_COLOR[tier] ?? '#475569' }}>
      <i className={info.icon} style={{ fontSize: '0.75rem' }} />
      {info.name}
    </div>
  );
}

/* ── Project picker modal for New TC ─────────────────────── */
function ProjectPickerModal({ projects, onSelect, onClose }: {
  projects: { projectId: string; projectName: string; dot: string }[];
  onSelect: (projectId: string) => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1.5rem', width: '22rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>Select Project</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1.125rem' }}>
            <i className="ri-close-line" />
          </button>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '0.75rem' }}>Choose a project for the new test case:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {projects.map(p => (
            <button key={p.projectId} onClick={() => onSelect(p.projectId)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0F172A' }}>{p.projectName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
const priorityDotColor: Record<string, string> = { critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#94A3B8' };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function padId(n: number) {
  return `TC-${n.toString().padStart(3, '0')}`;
}

/* ══ Page ════════════════════════════════════════════════════ */
export default function TestCasesOverviewPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useTestCasesOverview();

  /* profile dropdown */
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  /* new TC modal */
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [quickTCProjectId, setQuickTCProjectId] = useState<string | null>(null);

  /* export state */
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name, subscription_tier, avatar_emoji')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) setUserProfile({ email: profile.email || user.email || '', full_name: profile.full_name || '', subscription_tier: profile.subscription_tier || 1, avatar_emoji: profile.avatar_emoji || '' });
      } catch {}
    })();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleExportCSV = async () => {
    if (!data?.projects.length || exporting) return;
    setExporting(true);
    try {
      const projectIds = data.projects.map(p => p.projectId);
      const nameMap = Object.fromEntries(data.projects.map(p => [p.projectId, p.projectName]));
      await exportTestCasesCSV(projectIds, nameMap);
    } finally {
      setExporting(false);
    }
  };

  const handleNewTC = () => {
    if (!data?.projects.length) return;
    if (data.projects.length === 1) {
      setQuickTCProjectId(data.projects[0].projectId);
    } else {
      setShowProjectPicker(true);
    }
  };

  /* chart data */
  const weeks = data?.weeklyGrowth ?? [];

  interface WeekTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }
  function WeekTooltip({ active, payload, label }: WeekTooltipProps) {
    if (!active || !payload?.length) return null;
    const created    = payload.find(p => p.name === 'total')?.value ?? 0;
    const cumulative = payload.find(p => p.name === 'cumulative')?.value ?? 0;
    return (
      <div style={{ background: '#1E293B', color: '#fff', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.6875rem', lineHeight: 1.6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '140px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem' }}>{label}</div>
        {([
          { color: '#6366F1', label: 'Created',          value: created },
          { color: '#8B5CF6', label: 'Cumulative Trend', value: cumulative },
        ] as const).map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#CBD5E1' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: row.color, flexShrink: 0, display: 'inline-block' }} />
              {row.label}
            </span>
            <span style={{ fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#F8FAFC', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .tco-anim { animation: fadeInUp 0.35s ease-out backwards; }
        .tco-row:hover td { background: #FAFAFF !important; }
        .tco-ri:hover { background: #FAFAFF !important; }
        .tco-bar:hover { opacity: 0.8; }
        .prof-menu-item:hover { background: #F8FAFC; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '3.5rem', gap: '1.5rem', flexShrink: 0 }}>
        <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginRight: '0.5rem' }}>
          <LogoMark />
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0 0.875rem', height: '100%', fontSize: '0.8125rem', fontWeight: 500, color: '#6366F1', borderBottom: '2px solid #6366F1', textDecoration: 'none' }}>
            <i className="ri-folder-3-line" style={{ fontSize: '1rem' }} /> Projects
          </Link>
          <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0 0.875rem', height: '100%', fontSize: '0.8125rem', fontWeight: 500, color: '#64748B', borderBottom: '2px solid transparent', textDecoration: 'none' }}>
            <i className="ri-settings-3-line" style={{ fontSize: '1rem' }} /> Settings
          </Link>
        </nav>

        {/* Right: Notification + Avatar */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <NotificationBell />
          <div ref={profileMenuRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setShowProfileMenu(v => !v)}
              style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'linear-gradient(135deg, #818CF8, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#fff', cursor: 'pointer', overflow: 'hidden' }}
            >
              {userProfile?.avatar_emoji
                ? <span style={{ fontSize: '1rem', lineHeight: 1 }}>{userProfile.avatar_emoji}</span>
                : <span>{userProfile?.full_name?.charAt(0) || 'U'}</span>}
            </div>
            {showProfileMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowProfileMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)', width: '14rem', background: '#fff', borderRadius: '0.625rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', zIndex: 20, overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F1F5F9' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{userProfile?.full_name || 'User'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{userProfile?.email}</p>
                    <TierBadge tier={userProfile?.subscription_tier ?? 1} />
                  </div>
                  <Link to="/settings" onClick={() => setShowProfileMenu(false)}
                    className="prof-menu-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', borderBottom: '1px solid #F1F5F9' }}>
                    <i className="ri-settings-3-line" style={{ fontSize: '1.125rem' }} /><span>Settings</span>
                  </Link>
                  <button onClick={handleLogout}
                    className="prof-menu-item"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <i className="ri-logout-box-line" style={{ fontSize: '1.125rem' }} /><span>Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Sub-header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0.625rem 1.5rem', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
          <Link to="/projects" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>Projects</Link>
          <span style={{ color: '#CBD5E1' }}><i className="ri-arrow-right-s-line" /></span>
          <span style={{ color: '#0F172A', fontWeight: 700 }}>Test Cases Overview</span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportCSV}
          disabled={exporting || loading || !data?.projects.length}
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: exporting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500, opacity: exporting ? 0.6 : 1 }}>
          <i className={exporting ? 'ri-loader-4-line' : 'ri-download-2-line'} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
        <button
          onClick={handleNewTC}
          disabled={loading || !data?.projects.length}
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid #6366F1', background: '#6366F1', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: 'inherit', fontWeight: 500 }}>
          <i className="ri-add-line" /> New Test Case
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ri-file-list-3-line" style={{ fontSize: '1.25rem', color: '#6366F1' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Test Cases Overview</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '0.125rem' }}>
                {loading ? 'Loading…' : `${(data?.totalCount ?? 0).toLocaleString()} total test cases across ${data?.projects.length ?? 0} projects`}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#94A3B8' }}>
              <i className="ri-loader-4-line" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }} /> Loading data…
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Total Test Cases', value: (data?.totalCount ?? 0).toLocaleString(), sub: `+${data?.deltaThisWeek ?? 0} this week`, valueColor: '#0F172A', badge: data?.deltaThisWeek ? { text: `+${data.deltaThisWeek}`, color: '#16A34A', bg: '#F0FDF4' } : undefined },
                  { label: 'Active',     value: (data?.byStatus.active     ?? 0).toLocaleString(), sub: `${data?.totalCount ? Math.round(((data.byStatus.active)     / data.totalCount) * 100) : 0}% of total`, valueColor: '#16A34A' },
                  { label: 'Draft',      value: (data?.byStatus.draft      ?? 0).toLocaleString(), sub: `${data?.totalCount ? Math.round(((data.byStatus.draft)      / data.totalCount) * 100) : 0}% of total`, valueColor: '#F59E0B' },
                  { label: 'Deprecated', value: (data?.byStatus.deprecated ?? 0).toLocaleString(), sub: `${data?.totalCount ? Math.round(((data.byStatus.deprecated) / data.totalCount) * 100) : 0}% of total`, valueColor: '#94A3B8' },
                ].map((card, i) => (
                  <div key={i} className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', animationDelay: `${i * 0.05}s` }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', marginBottom: '0.375rem' }}>{card.label}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.valueColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {card.value}
                      {card.badge && <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.badge.color, background: card.badge.bg, padding: '0.125rem 0.375rem', borderRadius: '9999px', marginLeft: '0.375rem', verticalAlign: 'middle' }}>{card.badge.text}</span>}
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
                  {(['critical', 'high', 'medium', 'low'] as const).map(p => {
                    const count = data?.byPriority[p] ?? 0;
                    const pct = data?.totalCount ? (count / data.totalCount) * 100 : 0;
                    const colors = { critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#94A3B8' };
                    const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
                    return (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', width: 72, flexShrink: 0 }}>{labels[p]}</span>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: colors[p], borderRadius: 4, minWidth: pct > 0 ? 4 : 0 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', width: 40, textAlign: 'right', flexShrink: 0 }}>{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                {/* By Status */}
                <div className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', animationDelay: '0.2s' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-pulse-line" style={{ color: '#6366F1' }} /> By Status
                  </div>
                  {[
                    { key: 'active',     label: 'Active',     color: '#16A34A' },
                    { key: 'draft',      label: 'Draft',      color: '#F59E0B' },
                    { key: 'deprecated', label: 'Deprecated', color: '#94A3B8' },
                  ].map(s => {
                    const count = data?.byStatus[s.key as keyof typeof data.byStatus] ?? 0;
                    const pct = data?.totalCount ? (count / data.totalCount) * 100 : 0;
                    return (
                      <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', width: 80, flexShrink: 0 }}>{s.label}</span>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 4, minWidth: pct > 0 ? 4 : 0 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', width: 40, textAlign: 'right', flexShrink: 0 }}>{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Growth Chart */}
              {weeks.length > 0 && (
                <div className="tco-anim" style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', animationDelay: '0.25s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Weekly Test Case Growth (Last 10 Weeks)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: '#64748B' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6366F1' }} /> Created
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: '#64748B' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8B5CF6' }} /> Cumulative Trend
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={210}>
                    <ComposedChart
                      data={weeks.map((w, i) => ({
                        label: w.label,
                        created: i === 0 ? w.total : w.total - weeks[i - 1].total,
                        cumulative: w.total,
                      }))}
                      barCategoryGap="35%"
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} width={35} allowDecimals={false} />
                      <Tooltip content={<WeekTooltip />} cursor={{ fill: 'rgba(241,245,249,0.6)' }} />
                      <Bar dataKey="created" name="total" fill="#6366F1" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                      <Line dataKey="cumulative" name="cumulative" type="monotone" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3.5, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* By Project Table */}
              {(data?.projects.length ?? 0) > 0 && (
                <div className="tco-anim" style={{ animationDelay: '0.3s', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-pie-chart-line" style={{ color: '#6366F1' }} /> Test Cases by Project
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          {['Project', 'Test Cases', 'Added (7d)', 'Growth', 'Pass Rate'].map(th => (
                            <th key={th} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', borderBottom: '1px solid #E2E8F0' }}>{th}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data!.projects.map((row, i) => {
                          const sparkData = [
                            Math.max(0, row.count - row.deltaThisWeek * 4),
                            Math.max(0, row.count - row.deltaThisWeek * 3),
                            Math.max(0, row.count - row.deltaThisWeek * 2),
                            Math.max(0, row.count - row.deltaThisWeek),
                            row.count,
                          ];
                          return (
                            <tr key={i} className="tco-row" style={{ borderBottom: i < data!.projects.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#0F172A' }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.dot }} />
                                  {row.projectName}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.9375rem', fontWeight: 800, color: '#0F172A' }}>{row.count.toLocaleString()}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                                  <i className="ri-arrow-up-s-line" style={{ fontSize: '0.875rem' }} />+{row.deltaThisWeek}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <MiniSparkline data={sparkData} color="#6366F1" />
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', fontWeight: 700, color: row.passRate === null ? '#94A3B8' : row.passRate >= 80 ? '#16A34A' : row.passRate >= 60 ? '#F59E0B' : '#EF4444' }}>
                                {row.passRate !== null ? `${row.passRate}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recently Added Test Cases */}
              {(data?.recent.length ?? 0) > 0 && (
                <div className="tco-anim" style={{ animationDelay: '0.35s' }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="ri-time-line" style={{ color: '#6366F1' }} /> Recently Added Test Cases
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A' }}>Last 7 Days</span>
                      <a href="#" style={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>View All →</a>
                    </div>
                    {data!.recent.map((item, i) => (
                      <div key={item.id} className="tco-ri" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: i < data!.recent.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityDotColor[item.priority] ?? '#94A3B8', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#6366F1', fontWeight: 600, marginRight: '0.375rem' }}>{padId(item.tcDisplayId)}</span>{item.title}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.125rem' }}>Created by {item.projectName} team</div>
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: '#EEF2FF', color: '#6366F1', whiteSpace: 'nowrap' }}>{item.projectName}</span>
                        <span style={{ fontSize: '0.6875rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>{timeAgo(item.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && data?.totalCount === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>
                  <i className="ri-file-list-3-line" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No test cases yet</div>
                  <div style={{ fontSize: '0.875rem' }}>Create your first test case to see stats here.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Project Picker Modal */}
      {showProjectPicker && data?.projects && (
        <ProjectPickerModal
          projects={data.projects}
          onSelect={(pid) => { setShowProjectPicker(false); setQuickTCProjectId(pid); }}
          onClose={() => setShowProjectPicker(false)}
        />
      )}

      {/* Quick Create TC Modal */}
      {quickTCProjectId && (
        <QuickCreateTCModal
          isOpen={true}
          onClose={() => setQuickTCProjectId(null)}
          projectId={quickTCProjectId}
        />
      )}
    </div>
  );
}
