import type { ReactNode } from 'react';

export type RiskLevel = 'on_track' | 'at_risk' | 'critical';

interface RiskSignalCardProps {
  riskLevel: RiskLevel;
  bullets: ReactNode[];
  /** Footer content — usually the AI CTA button/banner/viewer message. */
  footer?: ReactNode;
  /** Inline error banner inserted above footer (error fallback state). */
  errorBanner?: ReactNode;
  /** When true, body bullets are dimmed for loading state (design-spec §4-3). */
  dim?: boolean;
  /** Extra modifier class on root (e.g. 'loading') */
  extraClass?: string;
  /** Sets aria-busy on body during loading. */
  ariaBusy?: boolean;
}

/**
 * Rule-based "Risk Signal" card (design-spec v2 §4-2).
 * Replaces the old AiRiskInsight card; "AI" branding is now reserved for AiRiskAnalysisCard.
 */
export default function RiskSignalCard({
  riskLevel,
  bullets,
  footer,
  errorBanner,
  dim = false,
  extraClass = '',
  ariaBusy = false,
}: RiskSignalCardProps) {
  const pillIconClass =
    riskLevel === 'critical' ? 'ri-error-warning-fill'
    : riskLevel === 'at_risk' ? 'ri-alert-line'
    : 'ri-check-line';
  const pillLabel =
    riskLevel === 'critical' ? 'Critical'
    : riskLevel === 'at_risk' ? 'At Risk'
    : 'On track';

  return (
    <article
      className={`mo-risk-card signal ${extraClass}`.trim()}
      role="region"
      aria-label="Milestone risk analysis"
    >
      <div className="mo-risk-head">
        <i className={dim ? 'ri-loader-4-line mo-risk-head-spin' : 'ri-pulse-line'} aria-hidden="true" />
        <span>Risk Signal</span>
      </div>
      <div className="mo-risk-body" aria-live="polite" aria-busy={ariaBusy}>
        <div className={`mo-risk-level-row${dim ? ' dim' : ''}`}>
          <span className={`risk-pill ${riskLevel}`}>
            <i className={pillIconClass} aria-hidden="true" /> {pillLabel}
          </span>
        </div>
        {bullets.length === 0 ? (
          <div className="mo-risk-bullet" style={{ color: 'var(--text-subtle)' }}>
            Keep running tests to build risk signal.
          </div>
        ) : (
          bullets.map((b, i) => (
            <div key={i} className={`mo-risk-bullet${dim ? ' dim' : ''}`}>{b}</div>
          ))
        )}
      </div>
      {errorBanner ? <div>{errorBanner}</div> : null}
      {footer ? <div className="mo-risk-footer">{footer}</div> : null}
    </article>
  );
}
