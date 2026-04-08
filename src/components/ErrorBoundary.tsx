import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
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

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        We hit an unexpected error and couldn't finish loading this page.
        Try reloading — if it keeps happening, head back to your dashboard.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onReset}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Reload page
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Go to Dashboard
        </a>
      </div>

      <a
        href="mailto:support@testably.app?subject=Error%20report"
        className="mt-4 text-xs text-slate-400 underline hover:text-slate-600"
      >
        Send an error report
      </a>

      {import.meta.env.DEV && error && (
        <details className="mt-8 max-w-xl text-left">
          <summary className="cursor-pointer text-xs text-slate-400">Error details</summary>
          <pre className="mt-2 overflow-auto rounded bg-slate-100 p-3 text-xs text-slate-600">
            {error.stack || error.message}
          </pre>
        </details>
      )}
    </main>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
