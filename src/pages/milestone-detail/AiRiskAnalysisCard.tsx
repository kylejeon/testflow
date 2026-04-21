/**
 * i18n policy (dev-spec-i18n-coverage AC-9):
 * - Wrapping labels ("Summary", "Observations", "Refresh", pill text) are translated.
 * - Body strings returned by Claude (data.summary, data.bullets[i], data.recommendations[i])
 *   are rendered as-is. Multi-locale prompts are tracked in a separate spec.
 */
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import type { MilestoneAiRiskCache } from './useMilestoneAiRisk';

interface AiRiskAnalysisCardProps {
  data: MilestoneAiRiskCache;
  canRefresh: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Applied immediately after a successful Analyze click, removed 600ms later. */
  justBecameAi?: boolean;
}

/**
 * AI Risk Analysis success card — design-spec v2 §4-4.
 * Violet gradient background, sparkle icon pulse, Observations + Recommendations.
 */
export default function AiRiskAnalysisCard({
  data,
  canRefresh,
  onRefresh,
  isRefreshing,
  justBecameAi = false,
}: AiRiskAnalysisCardProps) {
  const { t } = useTranslation('milestones');
  const isStale = data.stale_after
    ? Date.now() > Date.parse(data.stale_after)
    : data.generated_at
      ? Date.now() - Date.parse(data.generated_at) > 24 * 3600_000
      : false;

  const lowConf = data.confidence < 40;

  const pillIconClass =
    data.risk_level === 'critical' ? 'ri-error-warning-fill'
    : data.risk_level === 'at_risk' ? 'ri-alert-line'
    : 'ri-check-line';
  const pillLabel =
    data.risk_level === 'critical' ? t('riskSignal.critical')
    : data.risk_level === 'at_risk' ? t('riskSignal.atRisk')
    : t('riskSignal.onTrack');

  return (
    <article
      className={`mo-risk-card ai${justBecameAi ? ' just-became-ai' : ''}`}
      role="region"
      aria-label={t('aiRisk.a11y.region')}
    >
      <div className="mo-risk-head">
        <i className="ri-sparkling-2-line" aria-hidden="true" />
        <span>{t('aiRisk.title')}</span>
        <div className="mo-risk-meta">
          <span>
            {t('aiRisk.lastAnalyzed', { time: formatRelativeTime(data.generated_at, t) })}
            {isStale ? t('aiRisk.staleSuffix') : ''}
          </span>
          {canRefresh && (
            <button
              type="button"
              className={`refresh${isRefreshing ? ' loading' : ''}`}
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={t('aiRisk.a11y.refresh')}
            >
              <i className="ri-refresh-line" aria-hidden="true" />
              {isRefreshing ? t('aiRisk.refreshing') : t('aiRisk.refreshCta')}
            </button>
          )}
        </div>
      </div>
      <div className="mo-risk-body" aria-live="polite" aria-busy={isRefreshing}>
        <div className="mo-risk-level-row">
          <span className={`risk-pill ${data.risk_level}`}>
            <i className={pillIconClass} aria-hidden="true" /> {pillLabel}
          </span>
          <span
            className="conf-chip"
            role="status"
            aria-label={t('aiRisk.a11y.confidence', { value: data.confidence })}
          >
            {data.confidence}%
          </span>
          {lowConf && (
            <span className="conf-low-warn" role="note" title={t('aiRisk.lowConfidenceHint')}>
              {t('aiRisk.lowConfidenceChip')}
            </span>
          )}
        </div>

        {/* NOTE: data.summary is Claude-generated content. Do not translate (AC-9). */}
        {data.summary && (
          <>
            <div className="mo-risk-section-head">{t('aiRisk.summaryLabel')}</div>
            <div className="mo-risk-summary">{data.summary}</div>
          </>
        )}

        {/* NOTE: data.bullets[i] is Claude-generated content. Do not translate (AC-9). */}
        {data.bullets.length > 0 && (
          <>
            <div className="mo-risk-section-head">{t('aiRisk.observationsLabel')}</div>
            {data.bullets.map((b, i) => (
              <div key={i} className="mo-risk-observation">{b}</div>
            ))}
          </>
        )}

        {/* NOTE: data.recommendations[i] is Claude-generated content. Do not translate (AC-9). */}
        {data.recommendations.length > 0 && (
          <>
            <div className="mo-risk-section-head">{t('aiRisk.recommendationsLabel')}</div>
            {data.recommendations.map((r, i) => (
              <div key={i} className="mo-risk-recommendation">
                <span className="num">{i + 1}</span>
                <span>{r}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </article>
  );
}
