import { useState } from 'react';
import { Link } from 'react-router-dom';

interface UpgradeBannerProps {
  /** Short message, e.g. "You've used 2 of 2 team members." */
  message: string;
  /** Call-to-action label, defaults to "Upgrade to unlock" */
  ctaLabel?: string;
  /** If provided, CTA renders as a button calling this instead of linking to /pricing */
  onCtaClick?: () => void;
  /** Inline mode renders as a compact bar; default is a card */
  inline?: boolean;
  /** Hide the dismiss button */
  hideDismiss?: boolean;
  /**
   * sessionStorage key for dismiss persistence.
   * When set, dismissal is remembered for the current browser session
   * (clears on tab close / next login). Omit to use component-local state only.
   */
  dismissKey?: string;
  /** Called when the user dismisses the banner */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Non-aggressive upgrade prompt.
 * Renders as a slim amber/indigo bar with an "Upgrade" link to /pricing.
 */
export default function UpgradeBanner({
  message,
  ctaLabel = 'Upgrade to unlock',
  onCtaClick,
  inline = false,
  hideDismiss = false,
  dismissKey,
  onDismiss,
  className = '',
}: UpgradeBannerProps) {
  const storageKey = dismissKey ? `_ub_dismissed_${dismissKey}` : null;
  const [dismissed, setDismissed] = useState(() =>
    storageKey ? sessionStorage.getItem(storageKey) === '1' : false,
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    if (storageKey) sessionStorage.setItem(storageKey, '1');
    setDismissed(true);
    onDismiss?.();
  };

  const ctaInline = onCtaClick ? (
    <button
      onClick={onCtaClick}
      className="text-indigo-600 font-semibold hover:text-indigo-800 whitespace-nowrap text-xs underline cursor-pointer"
    >
      {ctaLabel} →
    </button>
  ) : (
    <Link
      to="/pricing"
      className="text-indigo-600 font-semibold hover:text-indigo-800 whitespace-nowrap text-xs underline"
    >
      {ctaLabel} →
    </Link>
  );

  const ctaCard = onCtaClick ? (
    <button
      onClick={onCtaClick}
      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
    >
      <i className="ri-rocket-line text-xs"></i>
      {ctaLabel}
    </button>
  ) : (
    <Link
      to="/pricing"
      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors"
    >
      <i className="ri-vip-crown-line text-xs"></i>
      {ctaLabel}
    </Link>
  );

  if (inline) {
    return (
      <div className={`flex items-center gap-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm ${className}`}>
        <i className="ri-information-line text-amber-500 shrink-0 text-base"></i>
        <span className="text-amber-800 flex-1">{message}</span>
        {ctaInline}
        {!hideDismiss && (
          <button
            onClick={handleDismiss}
            className="text-amber-400 hover:text-amber-600 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss"
          >
            <i className="ri-close-line text-base"></i>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <i className="ri-vip-crown-line text-amber-600 text-base"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-800 font-medium">{message}</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {onCtaClick
              ? 'Try it free — no credit card required.'
              : 'Upgrade your plan to continue growing your workspace.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ctaCard}
          {!hideDismiss && (
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-md flex items-center justify-center text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
