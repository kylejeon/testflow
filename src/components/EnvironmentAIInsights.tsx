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
import type { EnvAiInsightsResult, IssueCreatePrefill } from '../types/envAiInsights';
import { AITriggerButton } from './AITriggerButton';
import { formatRelativeTime } from '../lib/formatRelativeTime';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EnvironmentAIInsightsProps {
  matrix: HeatmapMatrix | null;
  /** f001 AI payload — when null + !isGenerating, rule-based only (AC-G9) */
  aiInsight?: EnvAiInsightsResult | null;
  isGenerating?: boolean;
  onRegenerate?: (force: boolean) => void;
  /** true if tier >= Starter && has credits (ai.available) */
  canUseAi?: boolean;
  tierOk?: boolean;
  creditCost?: number;
  /** -1 = unlimited, null = loading */
  remainingCredits?: number | null;
  monthlyLimit?: number | null;
  /** e.g. "Starter" — used for disabled tooltip */
  requiresTierName?: string;
  /** Current plan name for "29 credits left · Starter" subtext */
  currentPlanName?: string;
  aiError?:
    | 'ai_timeout'
    | 'upstream_rate_limit'
    | 'monthly_limit_reached'
    | 'ai_parse_failed'
    | 'network'
    | 'tier_too_low'
    | 'forbidden'
    | 'internal'
    | null;
  // f002 callbacks
  onHighlightEnv?: (label: string) => void;
  onCreateIssue?: (pre: IssueCreatePrefill) => void;
  onAssignRun?: () => void;
  /** Currently filtered env — used to toggle chip active style */
  highlightedEnv?: string | null;
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

const CHIP_ACTIVE_STYLE: React.CSSProperties = {
  ...CHIP_STYLE,
  color: '#fff',
  background: '#7C3AED',
  border: '1px solid #6D28D9',
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

// ─── Chip (action chip with hover + click) ────────────────────────────────────

function Chip({
  label,
  onTrigger,
  active = false,
  ariaPressed,
}: {
  label: string;
  onTrigger: () => void;
  active?: boolean;
  ariaPressed?: boolean;
}) {
  const style = active ? CHIP_ACTIVE_STYLE : CHIP_STYLE;
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={ariaPressed}
      onClick={onTrigger}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTrigger();
        }
      }}
      onMouseEnter={(e) => {
        if (active) {
          (e.currentTarget as HTMLSpanElement).style.background = '#6D28D9';
        } else {
          (e.currentTarget as HTMLSpanElement).style.background = '#F5F3FF';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.background = active ? '#7C3AED' : '#fff';
      }}
      style={style}
    >
      {label}
    </span>
  );
}

// ─── AI Headline Block (AC-G2, G8) ────────────────────────────────────────────

function AIHeadlineBlock({
  headline,
  confidence,
  generatedAt,
  fromCache,
  t,
}: {
  headline: string;
  confidence: number;
  generatedAt?: string;
  fromCache?: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const isLow = typeof confidence === 'number' && confidence > 0 && confidence < 40;
  const relTime = generatedAt ? formatRelativeTime(generatedAt, t as unknown as (k: string, opts?: Record<string, unknown>) => string) : '';
  void fromCache; // kept for potential "Cached" badge in meta row in future
  return (
    <div
      aria-live="polite"
      style={{
        background: 'linear-gradient(135deg, #F5F3FF 0%, #FAF5FF 100%)',
        border: '1px solid #DDD6FE',
        borderRadius: 8,
        padding: '10px 11px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <i
          className="ri-sparkling-2-line"
          aria-hidden="true"
          style={{ fontSize: 14, color: '#7C3AED', flexShrink: 0, marginTop: 2 }}
        />
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#4C1D95',
            lineHeight: 1.4,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {headline}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        {confidence > 0 && (
          <span
            style={{
              fontSize: 10,
              color: isLow ? '#B45309' : '#7C3AED',
              background: isLow ? '#FFFBEB' : '#fff',
              border: isLow ? '1px solid #FDE68A' : '1px solid #DDD6FE',
              padding: '1px 6px',
              borderRadius: 999,
              fontWeight: 500,
            }}
          >
            {isLow
              ? t('heatmap.ai.lowConfidence', { rate: confidence })
              : t('heatmap.ai.confidence', { rate: confidence })}
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            color: '#A78BFA',
            marginLeft: 'auto',
          }}
        >
          {t('heatmap.ai.aiMetaTime', { time: relTime || 'now' })}
        </span>
      </div>
    </div>
  );
}

// ─── AI Info Banner (too_little_data) — AC-G10 ────────────────────────────────

function AIInfoBanner({
  t,
}: {
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div
      role="status"
      style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 8,
        padding: '10px 11px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <i
          className="ri-information-line"
          aria-hidden="true"
          style={{ fontSize: 14, color: '#1D4ED8', flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 11.5, color: '#1E40AF', lineHeight: 1.45 }}>
          <div style={{ fontWeight: 600 }}>{t('heatmap.ai.tooLittleDataTitle')}</div>
          <div style={{ marginTop: 2 }}>{t('heatmap.ai.tooLittleData')}</div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Error Banner ──────────────────────────────────────────────────────────

function AIErrorBanner({
  errorCode,
  onRetry,
  t,
}: {
  errorCode: EnvironmentAIInsightsProps['aiError'];
  onRetry?: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  let msg = t('heatmap.ai.errorInternal');
  switch (errorCode) {
    case 'ai_timeout':         msg = t('heatmap.ai.errorTimeout'); break;
    case 'upstream_rate_limit': msg = t('heatmap.ai.errorRateLimit', { sec: 60 }); break;
    case 'ai_parse_failed':    msg = t('heatmap.ai.errorParseFailed'); break;
    case 'network':            msg = t('heatmap.ai.errorNetwork'); break;
    case 'forbidden':          msg = t('heatmap.ai.errorForbidden'); break;
    case 'monthly_limit_reached': msg = t('heatmap.ai.toast.limitReached'); break;
    case 'tier_too_low':       msg = t('heatmap.ai.requiresTier', { plan: 'Starter' }); break;
  }
  return (
    <div
      role="alert"
      style={{
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 8,
        padding: '10px 11px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <i
          className="ri-alert-line"
          aria-hidden="true"
          style={{ fontSize: 14, color: '#B91C1C', flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1, fontSize: 11.5, color: '#991B1B', lineHeight: 1.45 }}>
          <div style={{ fontWeight: 600 }}>{t('heatmap.ai.errorTitle')}</div>
          <div style={{ marginTop: 2 }}>{msg}</div>
          <div style={{ marginTop: 2, fontSize: 10, color: '#DC2626', fontStyle: 'italic' }}>
            {t('heatmap.ai.errorRetryNote')}
          </div>
        </div>
        {onRetry && errorCode !== 'tier_too_low' && errorCode !== 'monthly_limit_reached' && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#6D28D9',
              textDecoration: 'underline',
              background: 'transparent',
              border: 'none',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {t('heatmap.ai.errorRetry')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Recommendations Card — AC-G5 ─────────────────────────────────────────────

function RecommendationsCard({
  items,
  t,
}: {
  items: string[];
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  if (!items || items.length === 0) return null;
  const tagStyle: React.CSSProperties = {
    ...TAG_BASE,
    background: '#F5F3FF',
    color: '#7C3AED',
  };
  return (
    <div style={AI_CARD_STYLE}>
      <span style={tagStyle}>{t('heatmap.ai.recommendationsTag')}</span>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {items.slice(0, 4).map((item, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'flex-start',
              fontSize: 11.5,
              color: 'var(--text)',
              lineHeight: 1.45,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                width: 16,
                height: 16,
                borderRadius: 999,
                background: '#EDE9FE',
                color: '#6D28D9',
                fontSize: 10,
                fontWeight: 600,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1 }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Card: Critical (AC-G3) ───────────────────────────────────────────────────

function CriticalCard({
  data,
  aiCriticalEnv,
  aiCriticalReason,
  onChipIssue,
  onChipFilter,
  highlightedEnv,
}: {
  data: InsightCritical | null;
  aiCriticalEnv: string | null;
  aiCriticalReason: string | null;
  onChipIssue: (prefill: IssueCreatePrefill) => void;
  onChipFilter: (envOrBrowser: string) => void;
  highlightedEnv?: string | null;
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

  // AC-G3: If AI critical_reason provided, use it. Else fallback to rule detail.
  const ruleDetail = isEnv
    ? t('heatmap.ai.critical.envLowDetail', { env: data.label, rate: data.passRate })
    : t('heatmap.ai.critical.browserDetail', {
        browser: data.label,
        rate: data.passRate,
        osCount: data.osCount ?? 0,
      });
  const detail = aiCriticalReason || ruleDetail;

  // Chip label for filter
  const filterLabel = aiCriticalEnv || data.label;
  const isFiltered = highlightedEnv === filterLabel;

  const handleIssue = () => {
    onChipIssue({
      title,
      description: `${detail}\n\n—\nContext: Environment Coverage\nGenerated by Testably`,
      envName: filterLabel,
      source: aiCriticalReason ? 'ai' : 'rule',
    });
  };

  return (
    <div style={AI_CARD_STYLE}>
      <span style={tagStyle}>{t('heatmap.ai.critical.tag')}</span>
      <h4 style={H4_STYLE}>{title}</h4>
      <p style={P_STYLE}>{detail}</p>
      <div style={ACTION_ROW}>
        <Chip label={t('heatmap.ai.critical.actionIssue')} onTrigger={handleIssue} />
        <Chip
          label={
            isFiltered
              ? `${filterLabel} ✕`
              : `${t('heatmap.ai.critical.actionFilter')} ${filterLabel}`
          }
          onTrigger={() => onChipFilter(filterLabel)}
          active={isFiltered}
          ariaPressed={isFiltered}
        />
      </div>
    </div>
  );
}

// ─── Card: Coverage gap (AC-G4) ───────────────────────────────────────────────

function CoverageGapCard({
  data,
  aiCoverageGapTc,
  aiCoverageGapReason,
  onChipAssign,
}: {
  data: InsightCoverageGap | null;
  aiCoverageGapTc: string | null;
  aiCoverageGapReason: string | null;
  onChipAssign: () => void;
}) {
  const { t } = useTranslation('environments');
  const tagStyle: React.CSSProperties = {
    ...TAG_BASE,
    background: '#FFF7ED',
    color: '#C2410C',
  };
  if (!data && !aiCoverageGapTc) {
    return (
      <div style={AI_CARD_STYLE}>
        <span style={tagStyle}>{t('heatmap.ai.gap.tag')}</span>
        <p style={EMPTY_P}>{t('heatmap.ai.gap.empty')}</p>
      </div>
    );
  }
  const tcLabel = aiCoverageGapTc
    || (data ? (data.customId ? `${data.customId} ${data.tcTitle}` : data.tcTitle) : '—');
  const detail = aiCoverageGapReason
    || (data
      ? t('heatmap.ai.gap.detail', { untested: data.untestedCount, total: data.totalEnvs })
      : '');
  return (
    <div style={AI_CARD_STYLE}>
      <span style={tagStyle}>{t('heatmap.ai.gap.tag')}</span>
      <h4 style={H4_STYLE}>{t('heatmap.ai.gap.title', { tc: tcLabel })}</h4>
      <p style={P_STYLE}>{detail}</p>
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

export default function EnvironmentAIInsights({
  matrix,
  aiInsight = null,
  isGenerating = false,
  onRegenerate,
  canUseAi,
  tierOk = true,
  creditCost = 1,
  remainingCredits = null,
  monthlyLimit,
  requiresTierName = 'Starter',
  currentPlanName,
  aiError = null,
  onHighlightEnv,
  onCreateIssue,
  onAssignRun,
  highlightedEnv = null,
}: EnvironmentAIInsightsProps) {
  const { t } = useTranslation('environments');

  const insights = useMemo(() => (matrix ? deriveInsights(matrix) : null), [matrix]);

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

  // AI-derived flags
  const aiValid = !!aiInsight && !aiInsight.too_little_data;
  const aiTooLittle = !!aiInsight?.too_little_data;
  const aiFromCache = !!aiInsight?.meta?.from_cache;
  const aiHeadline = aiValid ? aiInsight!.headline : null;
  const aiCriticalEnv = aiValid ? aiInsight!.critical_env : null;
  const aiCriticalReason = aiValid ? aiInsight!.critical_reason : null;
  const aiCoverageGapTc = aiValid ? aiInsight!.coverage_gap_tc : null;
  const aiCoverageGapReason = aiValid ? aiInsight!.coverage_gap_reason : null;
  const aiRecs = aiValid ? aiInsight!.recommendations : [];
  const aiConfidence = aiValid ? aiInsight!.confidence : 0;
  const aiGeneratedAt = aiValid ? aiInsight!.generated_at : undefined;

  // Dim rule-based cards when generating
  const cardGroupStyle: React.CSSProperties = isGenerating
    ? { opacity: 0.5, transition: 'opacity 200ms ease-in', display: 'contents' }
    : { display: 'contents' };

  // Disabled reason
  let disabledReason: 'tier' | 'credits' | 'no-data' | null = null;
  let disabledTooltip: string | undefined;
  let buttonDisabled = false;
  if (!tierOk) {
    disabledReason = 'tier';
    disabledTooltip = t('heatmap.ai.requiresTier', { plan: requiresTierName });
    buttonDisabled = true;
  } else if (canUseAi === false) {
    disabledReason = 'credits';
    disabledTooltip = t('heatmap.ai.noCredits');
    buttonDisabled = true;
  }

  // Button click handler
  const handleTriggerClick = () => {
    if (!onRegenerate) return;
    onRegenerate(false);
  };

  // Secondary meta line
  const secondaryMeta = tierOk
    ? (remainingCredits === -1
        ? t('heatmap.ai.unlimitedCreditsSuffix', { plan: currentPlanName || '' })
        : remainingCredits !== null
          ? t('heatmap.ai.creditsLeftSuffix', { remaining: remainingCredits, plan: currentPlanName || '' })
          : '')
    : t('heatmap.ai.upgradeToPlan', { plan: requiresTierName });

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
      aria-busy={isGenerating || undefined}
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
        {aiFromCache && aiValid && !isGenerating && (
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 500,
              background: '#fff',
              border: '1px solid #DDD6FE',
              padding: '2px 6px',
              borderRadius: 999,
              color: '#7C3AED',
              textTransform: 'none',
              letterSpacing: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <i className="ri-time-line" aria-hidden="true" style={{ fontSize: 10 }} />
            {t('heatmap.ai.cacheBadge')}
          </span>
        )}
      </div>

      {/* AI Trigger row */}
      {onRegenerate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <AITriggerButton
            variant="ghost"
            size="sm"
            label={isGenerating ? t('heatmap.ai.regenerating') : t('heatmap.ai.regenerate')}
            onClick={handleTriggerClick}
            loading={isGenerating}
            disabled={buttonDisabled}
            disabledReason={disabledReason}
            disabledTooltip={disabledTooltip}
            creditCost={!buttonDisabled && !isGenerating ? creditCost : undefined}
            creditCount={typeof remainingCredits === 'number' ? remainingCredits : null}
            ariaLabel={t('heatmap.ai.srAnalyzing')}
          />
          {secondaryMeta && (
            <div style={{ fontSize: 10.5, color: '#9CA3AF', paddingLeft: 12 }}>
              {secondaryMeta}
              {monthlyLimit !== undefined && monthlyLimit !== null && monthlyLimit > 0 && remainingCredits === 0 && (
                <span> ({0}/{monthlyLimit})</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Headline block */}
      {aiValid && aiHeadline && !isGenerating && (
        <AIHeadlineBlock
          headline={aiHeadline}
          confidence={aiConfidence}
          generatedAt={aiGeneratedAt}
          fromCache={aiFromCache}
          t={t as (k: string, opts?: Record<string, unknown>) => string}
        />
      )}

      {/* too_little_data banner */}
      {aiTooLittle && !isGenerating && (
        <AIInfoBanner t={t as (k: string, opts?: Record<string, unknown>) => string} />
      )}

      {/* AI error banner */}
      {aiError && !isGenerating && !aiInsight && (
        <AIErrorBanner
          errorCode={aiError}
          onRetry={onRegenerate ? () => onRegenerate(false) : undefined}
          t={t as (k: string, opts?: Record<string, unknown>) => string}
        />
      )}

      {/* Rule-based cards (dimmed during generation) */}
      <div style={cardGroupStyle}>
        <CriticalCard
          data={hasData ? derived.critical : null}
          aiCriticalEnv={aiCriticalEnv}
          aiCriticalReason={aiCriticalReason}
          onChipIssue={(prefill) => onCreateIssue?.(prefill)}
          onChipFilter={(label) => onHighlightEnv?.(label)}
          highlightedEnv={highlightedEnv}
        />
        <CoverageGapCard
          data={hasData ? derived.coverageGap : null}
          aiCoverageGapTc={aiCoverageGapTc}
          aiCoverageGapReason={aiCoverageGapReason}
          onChipAssign={() => onAssignRun?.()}
        />
        <StableBaselineCard data={hasData ? derived.stableBaseline : null} />

        {/* Recommendations (AI only) */}
        {aiValid && aiRecs.length > 0 && !isGenerating && (
          <RecommendationsCard items={aiRecs} t={t as (k: string, opts?: Record<string, unknown>) => string} />
        )}

        <QuickStatsCard data={derived.quickStats} />
      </div>
    </aside>
  );
}
