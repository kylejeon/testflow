import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['milestones', 'common']);
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
      dedupeToast('ai-risk-no-tcs', t('milestones:aiRisk.needTcs'), 'info');
      return;
    }
    if (permLoading) return;
    if (!canAnalyze) return;
    if (!ai.tierOk) {
      dedupeToast('ai-risk-upgrade', t('milestones:aiRisk.upgradeToHobby'), 'info');
      return;
    }
    if (!ai.canUse) {
      dedupeToast('ai-risk-quota', t('milestones:aiRisk.quotaExhausted'), 'error');
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
            dedupeToast('ai-risk-refreshed', t('milestones:toast.analysisRefreshed'), 'success');
          } else {
            dedupeToast('ai-risk-success', t('milestones:toast.analysisReady'), 'success');
            setJustBecameAi(true);
          }
        },
        onError: (err: MilestoneAiRiskError) => {
          setErrorCode(err.error);
          setErrorDetail(err.detail ?? null);
          // Toast dedupe per error code
          switch (err.error) {
            case 'ai_timeout':
              dedupeToast('ai-risk-timeout', t('milestones:aiRisk.error.timeoutShort'), 'error');
              break;
            case 'upstream_rate_limit': {
              const sec = err.retry_after_sec ?? 60;
              setRateCountdown(sec);
              dedupeToast('ai-risk-rate', t('milestones:aiRisk.error.rateLimitToast', { sec }), 'error');
              break;
            }
            case 'monthly_limit_reached':
              dedupeToast('ai-risk-quota', t('milestones:aiRisk.quotaExhausted'), 'error');
              break;
            case 'ai_parse_failed':
              dedupeToast('ai-risk-parse', t('milestones:aiRisk.error.parseToast'), 'error');
              break;
            case 'network':
              dedupeToast('ai-risk-network', t('milestones:aiRisk.error.networkToast'), 'error');
              break;
            case 'tier_too_low':
              dedupeToast('ai-risk-upgrade', t('milestones:aiRisk.error.upgradeToast'), 'info');
              break;
            default:
              dedupeToast('ai-risk-internal', err.detail || t('common:toast.somethingWentWrong'), 'error');
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
    let msg = t('milestones:aiRisk.error.bannerFallback');
    switch (errorCode) {
      case 'ai_timeout':            msg = t('milestones:aiRisk.error.timeoutBanner'); break;
      case 'upstream_rate_limit':   msg = t('milestones:aiRisk.error.rateLimitBanner', { sec: rateCountdown }); break;
      case 'monthly_limit_reached': msg = t('milestones:aiRisk.error.quotaBanner'); break;
      case 'ai_parse_failed':       msg = t('milestones:aiRisk.error.parseBanner'); break;
      case 'network':               msg = t('milestones:aiRisk.error.networkBanner'); break;
      case 'tier_too_low':          msg = t('milestones:aiRisk.error.upgradeBanner'); break;
      case 'forbidden':             msg = t('milestones:aiRisk.error.forbiddenBanner'); break;
      default:                      msg = errorDetail || t('milestones:aiRisk.error.bannerFallback');
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
            {t('milestones:aiRisk.error.retryLink')}
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
          <span>{t('milestones:aiRisk.viewerMessage')}</span>
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
            aria-label={t('milestones:aiRisk.a11y.analyzeCta')}
            aria-disabled="true"
            title={t('milestones:aiRisk.ctaAnalyzeDisabledFree')}
          >
            <i className="ri-sparkling-2-line" aria-hidden="true" /> {t('milestones:aiRisk.analyzeCta')} →
          </button>
          <Link to="/settings/billing" className="mo-risk-upgrade-chip">
            {t('milestones:aiRisk.upgradeChip')}
          </Link>
        </div>
      );
    }

    // Quota exhausted → banner instead of button
    if (!ai.loading && ai.tierOk && !ai.canUse) {
      const suffix = ai.monthlyLimit > 0 ? ` (${ai.usedCredits}/${ai.monthlyLimit}).` : '.';
      return (
        <div className="mo-ai-quota-banner">
          <i className="ri-alert-line" aria-hidden="true" />
          <span>
            {t('milestones:aiRisk.quotaBannerInline', { suffix })}
          </span>
          <Link to="/settings/billing" className="upgrade-cta">{t('milestones:aiRisk.quotaBannerCta')}</Link>
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
          aria-label={t('milestones:aiRisk.a11y.analyzeCta')}
          aria-disabled="true"
          title={t('milestones:aiRisk.ctaAnalyzeDisabledTcZero')}
        >
          <i className="ri-sparkling-2-line" aria-hidden="true" /> {t('milestones:aiRisk.analyzeCta')} →
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
          <i className="ri-timer-line" aria-hidden="true" /> {t('milestones:aiRisk.rateLimitCountdown', { sec: rateCountdown })}
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
          <i className="ri-loader-4-line" aria-hidden="true" /> {t('milestones:aiRisk.analyzing')}
        </button>
      );
    }

    // Normal enabled CTA
    return (
      <button
        type="button"
        className="mo-risk-ai-cta"
        onClick={() => handleAnalyze(false)}
        aria-label={t('milestones:aiRisk.a11y.analyzeCta')}
      >
        <i className="ri-sparkling-2-line" aria-hidden="true" /> {t('milestones:aiRisk.analyzeCta')} →
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
