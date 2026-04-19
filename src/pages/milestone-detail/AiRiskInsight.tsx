import type { ReactNode } from 'react';

interface AiRiskInsightProps {
  riskLevel: 'on_track' | 'at_risk' | 'critical';
  bullets: ReactNode[];
  confidence?: number | null;
}

/**
 * Design-spec §4-2 (E) — AI Risk Insight (span 2).
 */
export default function AiRiskInsight({ riskLevel, bullets, confidence }: AiRiskInsightProps) {
  const prefix =
    riskLevel === 'critical' ? (<span style={{ color: 'var(--danger-600)' }}>⚠ Critical</span>)
    : riskLevel === 'at_risk' ? (<span style={{ color: 'var(--warning)' }}>● At Risk</span>)
    : (<span style={{ color: 'var(--success-600)' }}>✓ On track</span>);

  return (
    <article className="mo-ai-insight" aria-label="AI risk insight">
      <div className="mo-ai-insight-head">
        <i className="ri-sparkling-2-line" />
        AI Risk Insight
        {confidence != null && <span className="conf">confidence {confidence}%</span>}
      </div>
      <div className="mo-ai-bullet" style={{ fontSize: '11.5px' }}>
        {prefix}
      </div>
      {bullets.length === 0 ? (
        <div className="mo-ai-bullet" style={{ color: 'var(--text-subtle)' }}>
          Keep running tests to build AI insight.
        </div>
      ) : (
        bullets.map((b, i) => (
          <div key={i} className="mo-ai-bullet">{b}</div>
        ))
      )}
    </article>
  );
}
