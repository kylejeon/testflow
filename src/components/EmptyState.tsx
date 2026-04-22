import React from 'react';

// ── Public types (f025 EmptyState v2) ──────────────────────────────────────

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateTone = 'default' | 'subtle' | 'vivid';
export type EmptyStateVariant = 'empty' | 'filtered' | 'search';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** Optional keyboard hint (e.g. "N", "⌘K") rendered as a <kbd> badge */
  kbd?: string;
}

export interface EmptyStateProps {
  /** Illustration element — <TestCasesIllustration />, <IllustrationPlaceholder kind="..." />, etc. */
  illustration?: React.ReactNode;

  /** Main heading (H3) — required */
  title: string;

  /** 1–2 line supporting copy */
  description?: string;

  /** Primary CTA — creates the resource */
  cta?: EmptyStateAction;

  /** Secondary CTA — alternative action (Import, Generate with AI, etc.) */
  secondaryCta?: EmptyStateAction;

  /** Layout size preset — default 'md' */
  size?: EmptyStateSize;

  /** Color intensity — default 'default' */
  tone?: EmptyStateTone;

  /** Semantic variant — affects headline color + illustration dim */
  variant?: EmptyStateVariant;

  /** a11y — used when illustration is meaningful (otherwise decorative) */
  illustrationAlt?: string;

  /** Extra class on outer wrapper */
  className?: string;

  /** data-testid */
  testId?: string;

  // ── v1 backward-compat props (deprecated, kept so existing callers don't break) ──
  /** @deprecated Use `illustration` */
  icon?: React.ReactNode;
  /** @deprecated Use `cta` */
  action?: { label: string; onClick: () => void };
  /** @deprecated Use `secondaryCta` */
  secondaryAction?: { label: string; onClick: () => void };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EmptyState({
  illustration,
  title,
  description,
  cta,
  secondaryCta,
  size = 'md',
  tone = 'default',
  variant = 'empty',
  illustrationAlt,
  className = '',
  testId,
  // v1 compat
  icon,
  action,
  secondaryAction,
}: EmptyStateProps) {
  // v1 compat — fold legacy props into v2 shape
  const resolvedIllustration = illustration ?? icon;
  const resolvedCta: EmptyStateAction | undefined =
    cta ?? (action ? { label: action.label, onClick: action.onClick } : undefined);
  const resolvedSecondaryCta: EmptyStateAction | undefined =
    secondaryCta ??
    (secondaryAction
      ? { label: secondaryAction.label, onClick: secondaryAction.onClick }
      : undefined);

  const descId = description ? `empty-state-desc-${Math.random().toString(36).slice(2, 8)}` : undefined;

  return (
    <section
      role="status"
      aria-live="polite"
      data-testid={testId ?? 'empty-state'}
      className={cx(
        'flex flex-col items-center justify-center text-center motion-safe:animate-[fadeIn_0.24s_ease-out]',
        size === 'sm' && 'py-10 px-6',
        size === 'md' && 'py-16 px-8',
        size === 'lg' && 'py-24 px-10',
        tone === 'vivid' &&
          'bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_60%)]',
        className,
      )}
    >
      {resolvedIllustration && (
        <div
          aria-hidden={illustrationAlt ? undefined : 'true'}
          role={illustrationAlt ? 'img' : undefined}
          aria-label={illustrationAlt}
          className={cx(
            'mb-6 flex items-center justify-center shrink-0',
            size === 'sm' && 'w-[160px] h-[100px]',
            size === 'md' && 'w-[160px] h-[100px] sm:w-[240px] sm:h-[150px]',
            size === 'lg' &&
              'w-[240px] h-[150px] md:w-[320px] md:h-[208px] lg:w-[400px] lg:h-[260px]',
            tone === 'subtle' && 'opacity-60',
            tone === 'vivid' && 'drop-shadow-[0_4px_20px_rgba(99,102,241,0.25)]',
            variant === 'filtered' && 'opacity-70 saturate-50 dark:opacity-60',
          )}
        >
          {resolvedIllustration}
        </div>
      )}

      <h3
        className={cx(
          'font-semibold',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-2xl font-bold tracking-tight',
          tone === 'default' && 'text-slate-900 dark:text-white',
          tone === 'subtle' && 'text-slate-700 dark:text-slate-300',
          tone === 'vivid' &&
            'bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent',
          variant === 'filtered' && tone === 'default' && 'text-slate-600 dark:text-slate-400',
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          id={descId}
          className={cx(
            'mt-1.5 leading-relaxed text-slate-500 dark:text-slate-400',
            size === 'sm' && 'text-xs max-w-xs',
            size === 'md' && 'text-sm max-w-sm',
            size === 'lg' && 'text-base max-w-md',
          )}
        >
          {description}
        </p>
      )}

      {(resolvedCta || resolvedSecondaryCta) && (
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap justify-center">
          {resolvedCta && (
            <button
              type="button"
              onClick={resolvedCta.onClick}
              disabled={resolvedCta.disabled || resolvedCta.loading}
              aria-describedby={descId}
              className={cx(
                'group inline-flex items-center justify-center gap-2',
                'bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-full',
                'shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_28px_rgba(99,102,241,0.4)]',
                'active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
                size === 'sm' && 'px-3.5 py-1.5 text-[13px]',
                size === 'md' && 'px-5 py-2.5 text-sm',
                size === 'lg' && 'px-7 py-3 text-base',
              )}
            >
              {resolvedCta.loading ? (
                <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
              ) : (
                resolvedCta.icon ?? null
              )}
              <span>{resolvedCta.label}</span>
              {resolvedCta.kbd && (
                <kbd className="ml-1 inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded bg-white/20 border border-white/30 text-[10px] font-mono font-semibold">
                  {resolvedCta.kbd}
                </kbd>
              )}
            </button>
          )}

          {resolvedSecondaryCta && (
            <button
              type="button"
              onClick={resolvedSecondaryCta.onClick}
              disabled={resolvedSecondaryCta.disabled || resolvedSecondaryCta.loading}
              className={cx(
                'inline-flex items-center justify-center gap-2',
                'rounded-full border font-semibold',
                'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
                'dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:border-white/10 dark:hover:border-white/20 dark:text-slate-200',
                'active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                size === 'sm' && 'px-3.5 py-1.5 text-[13px]',
                size === 'md' && 'px-5 py-2.5 text-sm',
                size === 'lg' && 'px-7 py-3 text-base',
              )}
            >
              {resolvedSecondaryCta.loading ? (
                <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
              ) : (
                resolvedSecondaryCta.icon ?? null
              )}
              <span>{resolvedSecondaryCta.label}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
