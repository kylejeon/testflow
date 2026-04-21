import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import i18n from '../i18n';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

let toastIdCounter = 0;

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

type Variant = {
  bg: string;
  border: string;
  text: string;
  icon: string;
  iconClass: string;
  role: string;
  live: 'assertive' | 'polite';
};

const VARIANTS: Record<ToastType, Variant> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
    iconClass: 'ri-checkbox-circle-line',
    role: 'status',
    live: 'polite',
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    icon: 'text-rose-600',
    iconClass: 'ri-close-circle-line',
    role: 'alert',
    live: 'assertive',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: 'text-amber-600',
    iconClass: 'ri-alert-line',
    role: 'status',
    live: 'polite',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    icon: 'text-sky-600',
    iconClass: 'ri-information-line',
    role: 'status',
    live: 'polite',
  },
};

export function ToastContainer({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return <ToastList toasts={toasts} dismiss={dismiss} />;
}

function ToastList({ toasts = [], dismiss }: { toasts?: ToastItem[]; dismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const v = VARIANTS[toast.type];
        return (
          <div
            key={toast.id}
            role={v.role}
            aria-live={v.live}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md animate-fade-in pointer-events-auto ${v.bg} ${v.border}`}
          >
            <i className={`mt-0.5 text-lg shrink-0 ${v.iconClass} ${v.icon}`} aria-hidden="true" />
            <span className={`flex-1 text-sm font-medium ${v.text}`}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className={`flex-shrink-0 ml-1 cursor-pointer hover:opacity-70 ${v.icon}`}
            >
              <i className="ri-close-line text-base" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = ++toastIdCounter;
    // max 3 toasts visible at once
    setToasts(prev => [...prev.slice(-2), { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), DURATIONS[type]);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastList toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/**
 * Converts an API or Supabase error into a human-readable message.
 * Avoids generic "Network error" by mapping known error codes/messages
 * to actionable descriptions.
 *
 * f024 — uses the i18n singleton (i18n.t) since this helper is a pure
 * function and may be called from non-hook contexts.
 */
export function getApiErrorMessage(error: unknown): string {
  const t = (key: string) => i18n.t(key);

  if (!error) return t('common:toast.apiErrors.generic');

  const err = error as { message?: string; code?: string; status?: number; statusCode?: number };

  // Supabase / PostgREST specific codes
  if (err.code) {
    switch (err.code) {
      case 'PGRST116': return t('common:toast.apiErrors.recordNotFound');
      case 'PGRST301': return t('common:toast.apiErrors.permissionDenied');
      case '23505': return t('common:toast.apiErrors.recordExists');
      case '23503': return t('common:toast.apiErrors.relatedMissing');
      case '42501': return t('common:toast.apiErrors.insufficientPrivilege');
      case 'auth/invalid-email': return t('common:toast.apiErrors.invalidEmail');
      case 'auth/user-not-found': return t('common:toast.apiErrors.userNotFound');
      case 'auth/wrong-password': return t('common:toast.apiErrors.wrongPassword');
    }
  }

  // HTTP status codes
  const status = err.status ?? err.statusCode;
  if (status === 401) return t('common:toast.apiErrors.sessionExpired');
  if (status === 403) return t('common:toast.apiErrors.permissionDenied');
  if (status === 404) return t('common:toast.apiErrors.notFound');
  if (status === 409) return t('common:toast.apiErrors.conflict');
  if (status === 429) return t('common:toast.apiErrors.rateLimited');
  if (status && status >= 500) return t('common:toast.apiErrors.serverError');

  // Network/fetch errors
  const msg = err.message?.toLowerCase() ?? '';
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('load failed')) {
    return t('common:toast.apiErrors.networkError');
  }
  if (msg.includes('timeout')) return t('common:toast.apiErrors.timeout');
  if (msg.includes('aborted')) return t('common:toast.apiErrors.cancelled');

  // Fall back to the error message itself if it's short and readable
  if (err.message && err.message.length < 120 && !err.message.startsWith('{}')) {
    return err.message;
  }

  return t('common:toast.apiErrors.generic');
}
