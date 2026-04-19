import type { MilestoneAiRiskCache } from './useMilestoneAiRisk';

interface AiRiskAnalysisCardProps {
  data: MilestoneAiRiskCache;
  canRefresh: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Applied immediately after a successful Analyze click, removed 600ms later. */
  justBecameAi?: boolean;
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - Date.parse(iso);
  if (Number.isNaN(diffMs)) return '';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
    data.risk_level === 'critical' ? 'Critical'
    : data.risk_level === 'at_risk' ? 'At Risk'
    : 'On track';

  return (
    <article
      className={`mo-risk-card ai${justBecameAi ? ' just-became-ai' : ''}`}
      role="region"
      aria-label="AI milestone risk analysis"
    >
      <div className="mo-risk-head">
        <i className="ri-sparkling-2-line" aria-hidden="true" />
        <span>AI Risk Analysis</span>
        <div className="mo-risk-meta">
          <span>
            Last analyzed {relativeTime(data.generated_at)}
            {isStale ? ' (stale)' : ''}
          </span>
          {canRefresh && (
            <button
              type="button"
              className={`refresh${isRefreshing ? ' loading' : ''}`}
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh AI analysis"
            >
              <i className="ri-refresh-line" aria-hidden="true" />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
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
            aria-label={`Analysis confidence ${data.confidence}%`}
          >
            {data.confidence}%
          </span>
          {lowConf && (
            <span className="conf-low-warn" role="note" title="Refresh after more runs">
              Low confidence
            </span>
          )}
        </div>

        {data.summary && (
          <>
            <div className="mo-risk-section-head">Summary</div>
            <div className="mo-risk-summary">{data.summary}</div>
          </>
        )}

        {data.bullets.length > 0 && (
          <>
            <div className="mo-risk-section-head">Observations</div>
            {data.bullets.map((b, i) => (
              <div key={i} className="mo-risk-observation">{b}</div>
            ))}
          </>
        )}

        {data.recommendations.length > 0 && (
          <>
            <div className="mo-risk-section-head">Recommendations</div>
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
