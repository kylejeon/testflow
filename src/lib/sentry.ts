import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

const environment = (() => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'testably.app') return 'production';
  if (hostname.includes('vercel.app') || hostname.includes('preview')) return 'preview';
  return 'development';
})();

export function initSentry() {
  // Skip if no DSN — build still succeeds, monitoring is just inactive
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    // Only send traces in production to stay within free tier limits
    tracesSampleRate: environment === 'production' ? 0.1 : 0,
    // Replay 1% of sessions, 10% on error
    replaysSessionSampleRate: environment === 'production' ? 0.01 : 0,
    replaysOnErrorSampleRate: environment === 'production' ? 0.1 : 0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Never send these — too noisy or not actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Network Error$/,
      /^Load failed$/,
      /^Failed to fetch$/,
    ],
    beforeSend(event) {
      // Drop events from dev unless explicitly running in a browser context
      if (environment === 'development') return null;
      return event;
    },
  });
}

/**
 * Call after a successful Supabase auth to attach user context.
 * Only email + id — no PII beyond what's needed to triage errors.
 */
export function setSentryUser(user: { id: string; email?: string } | null) {
  if (!dsn) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Wrap a component with Sentry's error boundary.
 * Usage: export default withSentryErrorBoundary(MyPage, { fallback: <ErrorPage /> })
 */
export const withSentryErrorBoundary = Sentry.withErrorBoundary;

export { Sentry };
