import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarStack, type AvatarStackMember } from '../../../components/Avatar';

// ── CountUp hook ──────────────────────────────────────────────────────────────
function useCountUp(target: number, decimals = 0, duration = 900): string {
  const [val, setVal] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef<number>(0);

  useEffect(() => {
    start.current = null;
    const animate = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [target, decimals, duration]);

  return decimals > 0 ? val.toFixed(decimals) : String(Math.floor(val));
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: 'green' | 'amber' | 'red' }) {
  const pathRef = useRef<SVGPathElement>(null);
  const W = 80, H = 36, PAD = 2;

  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / (max - min)) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M${pts.join(' L')}`;
  const area = `${line} L${(W - PAD).toFixed(1)},${H} L${PAD},${H} Z`;

  const strokeColor = color === 'green' ? '#16A34A' : color === 'amber' ? '#F59E0B' : '#EF4444';
  const gradId = `sparkGrad-${color}`;

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 0.8s 0.3s ease-out';
      el.style.strokeDashoffset = '0';
    });
  }, [data]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      preserveAspectRatio="none"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} opacity={0.18} />
      <path
        ref={pathRef}
        d={line}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const fillRef = useRef<SVGCircleElement>(null);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const color = pct >= 90 ? '#16A34A' : pct >= 70 ? '#F59E0B' : '#EF4444';

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    const targetOffset = circ * (1 - pct / 100);
    el.style.strokeDasharray = String(circ.toFixed(1));
    el.style.strokeDashoffset = String(circ.toFixed(1));
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1s ease-out';
      el.style.strokeDashoffset = String(targetOffset.toFixed(1));
    });
  }, [pct, circ]);

  return (
    <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="#F1F5F9" strokeWidth={3.5} />
        <circle
          ref={fillRef}
          cx={22}
          cy={22}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.5625rem',
        fontWeight: 700,
        color: '#334155',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

// ── Stat card wrapper ─────────────────────────────────────────────────────────
function StatCard({
  children,
  accent,
  delay,
  onClick,
}: {
  children: React.ReactNode;
  accent: string;
  delay: number;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#C7D2FE' : '#E2E8F0'}`,
        borderRadius: '0.75rem',
        padding: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: hovered ? '0 4px 16px rgba(99,102,241,0.08)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
        animation: `fadeInUp 0.3s ease-out ${delay}ms backwards`,
      }}
    >
      {/* Top accent bar on hover */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2.5px',
        background: accent,
        borderRadius: '2px 2px 0 0',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s',
      }} />
      {children}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface StatCardsData {
  totalTestCases: number;
  testCasesDeltaThisWeek: number;
  activeRuns: number;
  untestedRemaining: number;
  passRate: number | null;
  passRateDelta: number | null;
  deltaLabel: string | null;
  passRateSparkline: number[];
  teamMemberCount: number;
  teamMembers: AvatarStackMember[];
}

// ── Shared row components ─────────────────────────────────────────────────────

/** Row 1: icon + label — identical across all cards */
function LabelRow({ icon, label, iconBg, iconColor }: { icon: string; label: string; iconBg: string; iconColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        background: iconBg, color: iconColor,
        width: '2rem', height: '2rem', borderRadius: '0.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className={icon} style={{ fontSize: '1rem' }} />
      </div>
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>
        {label}
      </span>
    </div>
  );
}

/** Row 2: the big number — fixed height so all cards align */
const NUMBER_ROW_HEIGHT = '2.25rem';

function NumberRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: NUMBER_ROW_HEIGHT, display: 'flex', alignItems: 'center' }}>
      {children}
    </div>
  );
}

/** Row 3: subtitle text (left) + optional accessory (right) */
function SubRow({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '1.5rem' }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      {right && <div style={{ flexShrink: 0, marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}>{right}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatCards({ data }: { data: StatCardsData }) {
  const navigate = useNavigate();
  const tcVal = useCountUp(data.totalTestCases);
  const runsVal = useCountUp(data.activeRuns);
  const prVal = useCountUp(data.passRate ?? 0, 1);
  const teamVal = useCountUp(data.teamMemberCount);

  const pr = data.passRate ?? 0;
  const prColor = pr >= 90 ? 'green' : pr >= 70 ? 'amber' : 'red';
  const prCardAccent = pr >= 90 ? '#16A34A' : pr >= 70 ? '#F59E0B' : '#EF4444';
  const prDeltaUp = (data.passRateDelta ?? 0) >= 0;

  const numStyle: React.CSSProperties = {
    fontSize: '1.75rem', fontWeight: 800, color: '#0F172A',
    lineHeight: 1, letterSpacing: '-0.025em',
  };
  const subTextStyle: React.CSSProperties = {
    fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 500,
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '0.75rem',
      marginBottom: '1.25rem',
    }}
    className="stat-cards-grid"
    >
      {/* ── Card 1: Total Test Cases ── */}
      <StatCard accent="#6366F1" delay={0} onClick={() => navigate('/testcases-overview')}>
        <LabelRow icon="ri-file-list-3-line" label="Total Test Cases" iconBg="rgba(99,102,241,0.1)" iconColor="#6366F1" />
        <NumberRow>
          <span style={numStyle}>{tcVal}</span>
        </NumberRow>
        <SubRow
          left={
            data.testCasesDeltaThisWeek > 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6875rem', fontWeight: 600, borderRadius: '9999px', padding: '0.125rem 0.375rem', color: '#16A34A', background: '#F0FDF4' }}>
                <i className="ri-arrow-up-s-line" />
                +{data.testCasesDeltaThisWeek} this week
              </span>
            ) : (
              <span style={subTextStyle}>test cases total</span>
            )
          }
        />
      </StatCard>

      {/* ── Card 2: Active Runs ── */}
      <StatCard accent="#10B981" delay={50} onClick={() => navigate('/active-runs')}>
        <LabelRow icon="ri-play-circle-line" label="Active Runs" iconBg="rgba(16,185,129,0.1)" iconColor="#10B981" />
        <NumberRow>
          <span style={numStyle}>{runsVal}</span>
        </NumberRow>
        <SubRow
          left={
            <span style={subTextStyle}>
              {data.untestedRemaining > 0 ? `${data.untestedRemaining} untested remaining` : 'active test runs'}
            </span>
          }
        />
      </StatCard>

      {/* ── Card 3: Pass Rate ── */}
      <StatCard accent={prCardAccent} delay={100} onClick={() => navigate('/passrate-report')}>
        <LabelRow
          icon="ri-checkbox-circle-line"
          label="Pass Rate"
          iconBg={pr >= 90 ? 'rgba(22,163,74,0.1)' : pr >= 70 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}
          iconColor={pr >= 90 ? '#16A34A' : pr >= 70 ? '#F59E0B' : '#EF4444'}
        />
        <NumberRow>
          {data.passRate !== null ? (
            <span style={numStyle}>{prVal}%</span>
          ) : (
            <span style={{ ...numStyle, color: '#94A3B8' }}>—</span>
          )}
        </NumberRow>
        <SubRow
          left={
            data.passRateDelta !== null ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                fontSize: '0.6875rem', fontWeight: 600, borderRadius: '9999px',
                padding: '0.125rem 0.375rem',
                color: prDeltaUp ? '#16A34A' : '#DC2626',
                background: prDeltaUp ? '#F0FDF4' : '#FEF2F2',
              }}>
                <i className={`ri-arrow-${prDeltaUp ? 'up' : 'down'}-s-line`} />
                {prDeltaUp ? '+' : ''}{data.passRateDelta.toFixed(1)}% {data.deltaLabel ?? 'vs last week'}
              </span>
            ) : (
              <span style={subTextStyle}>overall pass rate</span>
            )
          }
          right={
            data.passRate !== null && data.passRateSparkline.length >= 2
              ? <Sparkline data={data.passRateSparkline} color={prColor} />
              : <ProgressRing pct={data.passRate ?? 0} />
          }
        />
      </StatCard>

      {/* ── Card 4: Team Activity ── */}
      <StatCard accent="#8B5CF6" delay={150} onClick={() => navigate('/team-activity')}>
        <LabelRow icon="ri-team-line" label="Team Activity" iconBg="rgba(139,92,246,0.1)" iconColor="#8B5CF6" />
        <NumberRow>
          <span style={numStyle}>
            {teamVal}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: '#94A3B8' }}> members</span>
          </span>
        </NumberRow>
        <SubRow
          left={<span style={subTextStyle}>across all projects</span>}
          right={<AvatarStack members={data.teamMembers} size="sm" max={5} />}
        />
      </StatCard>
    </div>
  );
}
