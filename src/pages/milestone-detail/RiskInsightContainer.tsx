import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { usePermission } from '../../hooks/usePermission';
import { useAiFeature } from '../../hooks/useAiFeature';
import RiskSignalCard, { type RiskLevel } from './RiskSignalCard';
import AiRiskAnalysisCard from './AiRiskAnalysisCard';
import {
  useMilestoneAiRisk,
  type MilestoneAiRiskCache,
  type MilestoneAiRiskError,
} from './useMilestoneAiRisk';

interface RiskInsightContainerProps {
  projectId: string;
  milestoneId: string;
  riskLevel: RiskLevel;
  bullets: ReactNode[];
  aiCache: MilestoneAiRiskCache | null;
  hasTcs: boolean;
}

/**
 * Container for the 3-state Milestone AI Risk Insight card (design-spec v2 §4).
 *
 *   signal  → rule-based RiskSignalCard + "Analyze with AI" CTA
 *   loading → RiskSignalCard with dim bullets + loading CTA (min 500ms, AC-3)
 *   ai      → AiRiskAnalysisCard (gradient bg, confidence, summary/observations/recommendations)
 *   error   → RiskSignalCard + inline error banner + retry
 */
export default function RiskInsightContainer({
  projectId,
  milestoneId,
  riskLevel,
  bullets,
  aiCache,
  hasTcs,
}: RiskInsightContainerProps) {
  const { can, loading: permLoading } = usePermission(projectId);
  const ai = useAiFeature('milestone_risk');
  const mutation = useMilestoneAiRisk(milestoneId);
  const { showToast } = useToast();

  const [loadingSinceClick, setLoadingSinceClick] = useState<number | null>(null);
  const [loadingLock, setLoadingLock] = useState(false);    // ≥500ms guarantee
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [rateCountdown, setRateCountdown] = useState(0);
  const [justBecameAi, setJustBecameAi] = useState(false);
  const toastDedupeRef = useRef<Map<string, number>>(new Map());

  // Derived state
  const canAnalyze = can('trigger_ai_analysis');
  // During mutation, decide if it's a refresh by whether we had cache before:
  const hadCacheBeforeMutation = useRef<boolean>(!!aiCache);

  // ── Rate limit countdown tick ───────────────────────────────────────────────
  useEffect(() => {
    if (rateCountdown <= 0) return;
    const id = setInterval(() => {
      setRateCountdown(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rateCountdown]);

  // ── Loading min duration (500ms) ────────────────────────────────────────────
  useEffect(() => {
    if (mutation.isPending && loadingSinceClick == null) {
      setLoadingSinceClick(Date.now());
      setLoadingLock(true);
    }
    if (!mutation.isPending && loadingSinceClick != null) {
      const elapsed = Date.now() - loadingSinceClick;
      const wait = Math.max(0, 500 - elapsed);
      const id = setTimeout(() => {
        setLoadingLock(false);
        setLoadingSinceClick(null);
      }, wait);
      return () => clearTimeout(id);
    }
  }, [mutation.isPending, loadingSinceClick]);

  const dedupeToast = (id: string, msg: string, type: 'error' | 'success' | 'info' | 'warning' = 'error') => {
    const now = Date.now();
    const last = toastDedupeRef.current.get(id) ?? 0;
    if (now - last < 10_000) return;
    toastDedupeRef.current.set(id, now);
    showToast(msg, type);
  };

  // ── Reset justBecameAi after 600ms ──────────────────────────────────────────
  useEffect(() => {
    if (!justBecameAi) return;
    const id = setTimeout(() => setJustBecameAi(false), 600);
    return () => clearTimeout(id);
  }, [justBecameAi]);

  const handleAnalyze = (force: boolean) => {
    if (!hasTcs) {
      dedupeToast('ai-risk-no-tcs', 'Add test cases first to enable AI analysis.', 'info');
      return;
    }
    if (permLoading) return;
    if (!canAnalyze) return;
    if (!ai.tierOk) {
      dedupeToast('ai-risk-upgrade', 'Upgrade to Hobby to unlock AI analysis.', 'info');
      return;
    }
    if (!ai.canUse) {
      dedupeToast('ai-risk-quota', 'Monthly AI credits exhausted.', 'error');
      return;
    }
    if (rateCountdown > 0) return;

    hadCacheBeforeMutation.current = !!aiCache;
    setErrorCode(null);
    setErrorDetail(null);
    mutation.mutate(
      { force },
      {
        onSuccess: () => {
          setErrorCode(null);
          setErrorDetail(null);
          if (hadCacheBeforeMutation.current) {
            dedupeToast('ai-risk-refreshed', 'Analysis refreshed', 'success');
          } else {
            dedupeToast('ai-risk-success', 'AI analysis ready', 'success');
            setJustBecameAi(true);
          }
        },
        onError: (err: MilestoneAiRiskError) => {
          setErrorCode(err.error);
          setErrorDetail(err.detail ?? null);
          // Toast dedupe per error code
          switch (err.error) {
            case 'ai_timeout':
              dedupeToast('ai-risk-timeout', 'AI analysis timed out.', 'error');
              break;
            case 'upstream_rate_limit': {
              const sec = err.retry_after_sec ?? 60;
              setRateCountdown(sec);
              dedupeToast('ai-risk-rate', `Claude is rate-limited. Try again in ${sec}s.`, 'error');
              break;
            }
            case 'monthly_limit_reached':
              dedupeToast('ai-risk-quota', 'Monthly AI credits exhausted.', 'error');
              break;
            case 'ai_parse_failed':
              dedupeToast('ai-risk-parse', 'AI returned unexpected format.', 'error');
              break;
            case 'network':
              dedupeToast('ai-risk-network', 'Network error while analyzing.', 'error');
              break;
            case 'tier_too_low':
              dedupeToast('ai-risk-upgrade', 'Upgrade to unlock AI analysis.', 'info');
              break;
            default:
              dedupeToast('ai-risk-internal', err.detail || 'Something went wrong.', 'error');
          }
        },
      },
    );
  };

  // ── Decide UI state ─────────────────────────────────────────────────────────
  const isLoading = mutation.isPending || loadingLock;

  // Stale check — 24h TTL (dev-spec BR-2 / AC-8): stale cache must fall back to
  // rule-based Risk Signal, not render as valid AI. Prefer explicit stale_after
  // from server; fall back to 24h from generated_at if absent (older cache rows).
  const isStale = aiCache?.stale_after
    ? Date.now() > Date.parse(aiCache.stale_after)
    : aiCache?.generated_at
      ? Date.now() - Date.parse(aiCache.generated_at) > 24 * 3600_000
      : false;

  const hasValidAi =
    !!aiCache && !!aiCache.risk_level && !!aiCache.bullets && !isStale;

  // State: ai success (cache present and no active error/loading override)
  const showAi = hasValidAi && !isLoading && !errorCode;

  // ── Error banner ────────────────────────────────────────────────────────────
  const errorBanner = useMemo<ReactNode | null>(() => {
    if (!errorCode) return null;
    let msg = 'AI analysis failed.';
    switch (errorCode) {
      case 'ai_timeout':           msg = 'AI analysis timed out.'; break;
      case 'upstream_rate_limit':  msg = `Claude is rate-limited. Try again in ${rateCountdown}s.`; break;
      case 'monthly_limit_reached': msg = 'Monthly AI credits exhausted.'; break;
      case 'ai_parse_failed':      msg = 'AI returned unexpected format.'; break;
      case 'network':              msg = 'Network error. Try again.'; break;
      case 'tier_too_low':         msg = 'Upgrade to unlock AI analysis.'; break;
      case 'forbidden':            msg = 'You lack permission to run AI analysis.'; break;
      default:                     msg = errorDetail || 'AI analysis failed.';
    }
    const retryDisabled = errorCode === 'upstream_rate_limit' && rateCountdown > 0;
    return (
      <div className="mo-ai-error-banner" role="alert">
        <i className="ri-alert-line" aria-hidden="true" />
        <span>{msg}</span>
        {!retryDisabled && errorCode !== 'tier_too_low' && errorCode !== 'monthly_limit_reached' && (
          <button
            type="button"
            className="retry-link"
            onClick={() => handleAnalyze(hadCacheBeforeMutation.current)}
          >
            Retry →
          </button>
        )}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorCode, errorDetail, rateCountdown]);

  // ── Footer (CTA / banner / viewer message) ──────────────────────────────────
  const footer = useMemo<ReactNode>(() => {
    if (permLoading) {
      return <div style={{ height: 36 }} aria-hidden="true" />;
    }
    // Viewer/Tester: no CTA, message only (if no cache)
    if (!canAnalyze) {
      if (hasValidAi) return null;
      return (
        <div className="mo-risk-viewer-msg">
          <i className="ri-user-line" aria-hidden="true" />
          <span>Ask your admin to run AI analysis.</span>
        </div>
      );
    }

    // Tier too low (Free) → disabled button + Upgrade chip
    if (!ai.loading && !ai.tierOk) {
      return (
        <div className="mo-risk-ai-cta-wrap">
          <button
            type="button"
            className="mo-risk-ai-cta"
            disabled
            aria-label="Analyze milestone risk with AI"
            aria-disabled="true"
            title="Upgrade to Hobby to unlock AI analysis"
          >
            <i className="ri-sparkling-2-line" aria-hidden="true" /> Analyze with AI →
          </button>
          <Link to="/settings/billing" className="mo-risk-upgrade-chip">
            Upgrade
          </Link>
        </div>
      );
    }

    // Quota exhausted → banner instead of button
    if (!ai.loading && ai.tierOk && !ai.canUse) {
      return (
        <div className="mo-ai-quota-banner">
          <i className="ri-alert-line" aria-hidden="true" />
          <span>
            Monthly AI credits exhausted
            {ai.monthlyLimit > 0 ? ` (${ai.usedCredits}/${ai.monthlyLimit}).` : '.'}
          </span>
          <Link to="/settings/billing" className="upgrade-cta">Upgrade →</Link>
        </div>
      );
    }

    // TC 0 → disabled
    if (!hasTcs) {
      return (
        <button
          type="button"
          className="mo-risk-ai-cta"
          disabled
          aria-label="Analyze milestone risk with AI"
          aria-disabled="true"
          title="Add test cases first to enable AI analysis"
        >
          <i className="ri-sparkling-2-line" aria-hidden="true" /> Analyze with AI →
        </button>
      );
    }

    // Rate limited
    if (rateCountdown > 0) {
      return (
        <button
          type="button"
          className="mo-risk-ai-cta"
          disabled
          aria-disabled="true"
        >
          <i className="ri-timer-line" aria-hidden="true" /> Try again in {rateCountdown}s
        </button>
      );
    }

    // Loading
    if (isLoading) {
      return (
        <button
          type="button"
          className="mo-risk-ai-cta loading"
          disabled
          aria-busy="true"
        >
          <i className="ri-loader-4-line" aria-hidden="true" /> Analyzing with Claude…
        </button>
      );
    }

    // Normal enabled CTA
    return (
      <button
        type="button"
        className="mo-risk-ai-cta"
        onClick={() => handleAnalyze(false)}
        aria-label="Analyze milestone risk with AI"
      >
        <i className="ri-sparkling-2-line" aria-hidden="true" /> Analyze with AI →
      </button>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permLoading, canAnalyze, hasValidAi,
    ai.loading, ai.tierOk, ai.canUse, ai.monthlyLimit, ai.usedCredits,
    hasTcs, rateCountdown, isLoading,
  ]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (showAi && aiCache) {
    return (
      <AiRiskAnalysisCard
        data={aiCache}
        canRefresh={canAnalyze && !permLoading}
        onRefresh={() => handleAnalyze(true)}
        isRefreshing={isLoading}
        justBecameAi={justBecameAi}
      />
    );
  }

  // signal / loading / error-fallback all render as RiskSignalCard with modifier
  const extraClass = isLoading ? 'loading' : '';
  return (
    <RiskSignalCard
      riskLevel={riskLevel}
      bullets={bullets}
      footer={footer}
      errorBanner={errorBanner}
      dim={isLoading}
      ariaBusy={isLoading}
      extraClass={extraClass}
    />
  );
}

