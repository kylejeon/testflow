import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { HeatmapMatrix } from '../lib/environments';
import {
  deriveInsights,
  type InsightCritical,
  type InsightCoverageGap,
  type InsightBaseline,
  type InsightsDerived,
} from '../lib/environmentInsights';
import { useToast } from './Toast';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EnvironmentAIInsightsProps {
  matrix: HeatmapMatrix | null;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const AI_CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #EDE9FE',
  borderRadius: 8,
  padding: '10px 11px',
};

const TAG_BASE: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '1px 7px',
  borderRadius: 10,
  marginBottom: 6,
  display: 'inline-block',
};

const H4_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.3,
  margin: '0 0 4px',
  fontWeight: 600,
  color: 'var(--text)',
};

const P_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  lineHeight: 1.45,
  margin: 0,
};

const CHIP_STYLE: React.CSSProperties = {
  fontSize: 10.5,
  color: '#7C3AED',
  background: '#fff',
  border: '1px solid #DDD6FE',
  padding: '2px 7px',
  borderRadius: 10,
  fontWeight: 500,
  cursor: 'pointer',
  userSelect: 'none',
};

const ACTION_ROW: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginTop: 6,
  flexWrap: 'wrap',
};

const EMPTY_P: React.CSSProperties = {
  fontSize: 11,
  color: '#9CA3AF',
  lineHeight: 1.45,
  margin: 0,
};

// ─── Chip (action chip with hover + click→toast) ──────────────────────────────

function Chip({ label, onTrigger }: { label: string; onTrigger: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-disabled="true"
      onClick={onTrigger}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTrigger();
        }
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLSpanElement).style.background = '#F5F3FF';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.background = '#fff';
      }}
      style={CHIP_STYLE}
    >
      {label}
    </span>
  );
}

// ─── Card: Critical ───────────────────────────────────────────────────────────

function CriticalCard({
  data,
  onChipIssue,
  onChipFilter,
}: {
  data: InsightCritical | null;
  onChipIssue: () => void;
  onChipFilter: (envOrBrowser: string) => void;
}) {
  const { t } = useTranslation('environments');
  const tagStyle: React.CSSProperties = {
    ...TAG_BASE,
    background: '#FEF2F2',
    color: '#B91C1C',
  };
  if (!data) {
    return (
      <div style={AI_CARD_STYLE}>
        <span style={tagStyle}>{t('heatmap.ai.critical.tag')}</span>
        <p style={EMPTY_P}>{t('heatmap.ai.critical.empty')}</p>
      </div>
    );
  }
  const isEnv = data.kind === 'env_low';
  const title = isEnv
    ? t('heatmap.ai.critical.envLowTitle', { env: data.label })
    : t('heatmap.ai.critical.browserTitle', { browser: data.label });
  const detail = isEnv
    ? t('heatmap.ai.critical.envLowDetail', { env: data.label, rate: data.passRate })
    : t('heatmap.ai.critical.browserDetail', {
        browser: data.label,
        rate: data.passRate,
        osCount: data.osCount ?? 0,
      });
  return (
    <div style={AI_CARD_STYLE}>
      <span style={tagStyle}>{t('heatmap.ai.critical.tag')}</span>
      <h4 style={H4_STYLE}>{title}</h4>
      <p style={P_STYLE}>{detail}</p>
      <div style={ACTION_ROW}>
        <Chip label={t('heatmap.ai.critical.actionIssue')} onTrigger={onChipIssue} />
        <Chip
          label={`${t('heatmap.ai.critical.actionFilter')} ${data.label}`}
          onTrigger={() => onChipFilter(data.label)}
        />
      </div>
    </div>
  );
}

// ─── Card: Coverage gap ───────────────────────────────────────────────────────

function CoverageGapCard({
  data,
  onChipAssign,
}: {
  data: InsightCoverageGap | null;
  onChipAssign: () => void;
}) {
  const { t } = useTranslation('environments');
  const tagStyle: React.CSSProperties = {
    ...TAG_BASE,
    background: '#FFF7ED',
    color: '#C2410C',
  };
  if (!data) {
    return (
      <div style={AI_CARD_STYLE}>
        <span style={tagStyle}>{t('heatmap.ai.gap.tag')}</span>
        <p style={EMPTY_P}>{t('heatmap.ai.gap.empty')}</p>
      </div>
    );
  }
  const tcLabel = data.customId ? `${data.customId} ${data.tcTitle}` : data.tcTitle;
  return (
    <div style={AI_CARD_STYLE}>
      <span style={tagStyle}>{t('heatmap.ai.gap.tag')}</span>
      <h4 style={H4_STYLE}>{t('heatmap.ai.gap.title', { tc: tcLabel })}</h4>
      <p style={P_STYLE}>
        {t('heatmap.ai.gap.detail', {
          untested: data.untestedCount,
          total: data.totalEnvs,
        })}
      </p>
      <div style={ACTION_ROW}>
        <Chip label={t('heatmap.ai.gap.actionAssign')} onTrigger={onChipAssign} />
      </div>
    </div>
  );
}

// ─── Card: Stable baseline ────────────────────────────────────────────────────

function StableBaselineCard({ data }: { data: InsightBaseline | null }) {
  const { t } = useTranslation('environments');
  const tagStyle: React.CSSProperties = {
    ...TAG_BASE,
    background: '#EFF6FF',
    color: '#1D4ED8',
  };
  if (!data) {
    return (
      <div style={AI_CARD_STYLE}>
        <span style={tagStyle}>{t('heatmap.ai.baseline.tag')}</span>
        <p style={EMPTY_P}>{t('heatmap.ai.baseline.empty')}</p>
      </div>
    );
  }
  return (
    <div style={AI_CARD_STYLE}>
      <span style={tagStyle}>{t('heatmap.ai.baseline.tag')}</span>
      <h4 style={H4_STYLE}>
        {t('heatmap.ai.baseline.title', { env: data.envName, rate: data.passRate })}
      </h4>
      <p style={P_STYLE}>{t('heatmap.ai.baseline.detail')}</p>
    </div>
  );
}

// ─── Card: Quick stats ────────────────────────────────────────────────────────

function QuickStatsCard({
  data,
}: {
  data: InsightsDerived['quickStats'];
}) {
  const { t } = useTranslation('environments');
  const noData = t('heatmap.ai.stats.noData');
  const fmtRate = (rate: number) => `${rate}%`;

  const statCellStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  };
  const statLabelStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: 10.5,
    lineHeight: 1.3,
    marginBottom: 2,
  };
  const statValueBase: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 11,
    color: 'var(--text)',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
  const redHighlight: React.CSSProperties = { color: '#DC2626' };

  const renderValue = (
    stat: { name: string; rate: number } | null,
    highlightRed: boolean,
  ) => {
    if (!stat) return <b style={statValueBase}>{noData}</b>;
    return (
      <b style={highlightRed ? { ...statValueBase, ...redHighlight } : statValueBase}>
        {stat.name} {fmtRate(stat.rate)}
      </b>
    );
  };

  return (
    <div style={{ ...AI_CARD_STYLE, background: '#FAFAFA' }}>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {t('heatmap.ai.stats.tag')}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          fontSize: 11,
        }}
      >
        <div style={statCellStyle}>
          <span style={statLabelStyle}>{t('heatmap.ai.stats.bestEnv')}</span>
          {renderValue(data.bestEnv, false)}
        </div>
        <div style={statCellStyle}>
          <span style={statLabelStyle}>{t('heatmap.ai.stats.worstEnv')}</span>
          {renderValue(data.worstEnv, !!data.worstEnv)}
        </div>
        <div style={statCellStyle}>
          <span style={statLabelStyle}>{t('heatmap.ai.stats.bestTc')}</span>
          {renderValue(data.bestTc, false)}
        </div>
        <div style={statCellStyle}>
          <span style={statLabelStyle}>{t('heatmap.ai.stats.worstTc')}</span>
          {renderValue(data.worstTc, !!data.worstTc)}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton (loading) ───────────────────────────────────────────────────────

function AiInsightsSkeleton() {
  return (
    <aside
      style={{
        background:
          'linear-gradient(180deg, #F5F3FF 0%, #EEF2FF 100%)',
        border: '1px solid #DDD6FE',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 'fit-content',
      }}
    >
      <div
        style={{
          height: 14,
          width: 90,
          background: 'rgba(255,255,255,0.6)',
          borderRadius: 4,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: '10px 11px',
            border: '1px solid #EDE9FE',
          }}
        >
          <div
            style={{
              height: 10,
              width: 70,
              background: '#F3F4F6',
              borderRadius: 3,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 14,
              width: '70%',
              background: '#F3F4F6',
              borderRadius: 3,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              height: 10,
              width: '90%',
              background: '#F9FAFB',
              borderRadius: 3,
            }}
          />
        </div>
      ))}
    </aside>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function EnvironmentAIInsights({ matrix }: EnvironmentAIInsightsProps) {
  const { t } = useTranslation('environments');
  const { showToast } = useToast();

  const insights = useMemo(() => (matrix ? deriveInsights(matrix) : null), [matrix]);

  // Empty-state for all cards when matrix is effectively empty
  const hasData = !!matrix && matrix.rows.length > 0 && matrix.columns.length > 0;

  // Loading (no matrix at all)
  if (!matrix) return <AiInsightsSkeleton />;

  const derived: InsightsDerived =
    insights ??
    ({
      critical: null,
      coverageGap: null,
      stableBaseline: null,
      quickStats: { bestEnv: null, worstEnv: null, bestTc: null, worstTc: null },
      patternCount: 0,
    } as InsightsDerived);

  const onChipComingSoon = (key: string) => () => showToast(t(key), 'info');

  return (
    <aside
      style={{
        background: 'linear-gradient(180deg, #F5F3FF 0%, #EEF2FF 100%)',
        border: '1px solid #DDD6FE',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 'fit-content',
      }}
    >
      {/* Head */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#7C3AED',
        }}
      >
        <i className="ri-magic-line" aria-hidden="true" style={{ fontSize: 14 }} />
        <span>{t('heatmap.ai.sectionTitle')}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 500,
            background: '#fff',
            border: '1px solid #DDD6FE',
            padding: '2px 6px',
            borderRadius: 3,
            textTransform: 'none',
            letterSpacing: 0,
            color: '#7C3AED',
          }}
        >
          {t('heatmap.ai.patternCount', { count: derived.patternCount })}
        </span>
      </div>

      <CriticalCard
        data={hasData ? derived.critical : null}
        onChipIssue={onChipComingSoon('heatmap.ai.toast.createIssue')}
        onChipFilter={() => showToast(t('heatmap.ai.toast.filter'), 'info')}
      />
      <CoverageGapCard
        data={hasData ? derived.coverageGap : null}
        onChipAssign={onChipComingSoon('heatmap.ai.toast.assignRun')}
      />
      <StableBaselineCard data={hasData ? derived.stableBaseline : null} />
      <QuickStatsCard data={derived.quickStats} />
    </aside>
  );
}
