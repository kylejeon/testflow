import { Component, ReactNode, useEffect, useRef, useState } from 'react';
import { Sentry } from '../lib/sentry';
import i18n from '../i18n';

/** Returns true if the error is a Vite/webpack dynamic import chunk load failure. */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    (error.name === 'TypeError' && msg.includes('Failed to fetch'))
  );
}

const CHUNK_RELOAD_KEY = 'eb_chunk_reload';

interface Props {
  children: ReactNode;
  /** Custom fallback UI. If not provided, uses the default full-page error view. */
  fallback?: ReactNode;
  /**
   * Compact section-level mode: renders a small inline error card instead of
   * a full-page takeover. Use this to wrap individual panels/widgets.
   */
  section?: boolean;
  /** Human-readable label for the section (for Sentry breadcrumb). */
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** Sentry eventId returned from captureException, surfaced as a Report ID. */
  eventId: string | null;
}

function ReportIdLine({ eventId, t }: { eventId: string; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable (permissions/insecure context) — silently no-op
    }
  };

  return (
    <div className="mt-4 flex items-center justify-center gap-2 max-w-xs">
      <p className="font-mono text-xs text-slate-500 break-all">
        {t('common:errorBoundary.reportId', { id: eventId })}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('common:errorBoundary.copyReportId')}
        className="flex-none inline-flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
      >
        <i className={copied ? 'ri-check-line text-emerald-500' : 'ri-file-copy-line'} />
      </button>
      {copied && (
        <span role="status" className="text-xs text-emerald-600">
          {t('common:errorBoundary.reportIdCopied')}
        </span>
      )}
    </div>
  );
}

function FullPageFallback({ error, eventId, onReset }: { error: Error | null; eventId: string | null; onReset: () => void }) {
  // i18n singleton — ErrorBoundary may sit outside I18nextProvider, so useTranslation() is not reliable.
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

  // AC-10 / Design Spec §8-1 — focus title on mount so screen readers start
  // reading from the alert title.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Design Spec §8-1 — in dev (DSN unset), Sentry still returns an eventId that
  // is not actually sent. Hide the Report ID line in dev to avoid confusion.
  const isDev = import.meta.env.DEV;
  const showEventId = !isDev && !!eventId;
  const showEventIdMissing = !isDev && !eventId;

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center"
    >
      <svg viewBox="0 0 160 160" width="160" height="160" fill="none" aria-hidden="true">
        <circle cx="80" cy="80" r="64" fill="#eef2ff" stroke="#6366f1" strokeWidth="3" />
        <rect x="48" y="54" width="64" height="48" rx="6" fill="#fff" stroke="#6366f1" strokeWidth="3" />
        <line x1="58" y1="68" x2="78" y2="88" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1="78" y1="68" x2="58" y2="88" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        <line x1="88" y1="74" x2="102" y2="74" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <line x1="88" y1="84" x2="102" y2="84" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <path d="M64 110 h32 l-4 8 h-24 z" fill="#6366f1" />
      </svg>

      <h1
        ref={titleRef}
        tabIndex={-1}
        className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none"
      >
        {t('common:errorBoundary.title')}
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {t('common:errorBoundary.description')}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onReset}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {t('common:errorBoundary.reload')}
        </button>
        <a
          href="/projects"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {t('common:errorBoundary.goHome')}
        </a>
      </div>

      {showEventId && (
        <ReportIdLine eventId={eventId!} t={t} />
      )}
      {showEventIdMissing && (
        <p className="mt-4 text-xs text-slate-500">
          {t('common:errorBoundary.reportIdMissing')}
        </p>
      )}

      <a
        href="mailto:support@testably.app?subject=Error%20report"
        className="mt-4 text-xs text-slate-500 underline hover:text-slate-600"
      >
        {t('common:errorBoundary.sendReport')}
      </a>

      {isDev && error && (
        <details className="mt-8 max-w-xl text-left">
          <summary className="cursor-pointer text-xs text-slate-400">
            {t('common:errorBoundary.devDetailsSummary')}
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-slate-100 p-3 text-xs text-slate-600">
            {error.stack || error.message}
          </pre>
        </details>
      )}
    </main>
  );
}

function SectionFallback({ sectionName, onReset }: { sectionName?: string; onReset: () => void }) {
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-100 bg-red-50 p-6 text-center my-4"
    >
      <i className="ri-error-warning-line text-2xl text-red-400 mb-2 block"></i>
      <p className="text-sm font-medium text-red-700">
        {sectionName
          ? t('common:errorBoundary.section.title', { sectionName })
          : t('common:errorBoundary.section.titleGeneric')}
      </p>
      <p className="text-xs text-red-500 mt-1 mb-3">
        {t('common:errorBoundary.section.hint')}
      </p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
      >
        <i className="ri-refresh-line"></i>
        {t('common:errorBoundary.section.retry')}
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, eventId: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);

    // Auto-reload once on chunk load failures (stale hash after new deploy).
    // Use sessionStorage to avoid infinite reload loops.
    if (isChunkLoadError(error) && !this.props.section) {
      const reloadKey = `${CHUNK_RELOAD_KEY}:${window.location.pathname}`;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.href = window.location.href;
        return;
      }
    }

    // Report to Sentry with component stack context.
    // f024 — capture the returned eventId so we can surface it as Report ID.
    let capturedId: string | null = null;
    Sentry.withScope((scope) => {
      if (this.props.sectionName) {
        scope.setTag('error_boundary', this.props.sectionName);
      }
      scope.setExtra('componentStack', info.componentStack);
      scope.setExtra('isChunkLoadError', isChunkLoadError(error));
      const id = Sentry.captureException(error);
      if (id) capturedId = id;
    });
    if (capturedId) {
      this.setState({ eventId: capturedId });
    }
  }

  handleReset = () => {
    if (this.props.section) {
      // Section errors: reset state to retry rendering
      this.setState({ hasError: false, error: null, eventId: null });
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (this.props.section) {
        return (
          <SectionFallback
            sectionName={this.props.sectionName}
            onReset={this.handleReset}
          />
        );
      }

      return <FullPageFallback error={this.state.error} eventId={this.state.eventId} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
