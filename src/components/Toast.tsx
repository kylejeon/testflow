import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  role: string;
  live: 'assertive' | 'polite';
};

const VARIANTS: Record<ToastType, Variant> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
    Icon: CheckCircle2,
    role: 'status',
    live: 'polite',
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    icon: 'text-rose-600',
    Icon: XCircle,
    role: 'alert',
    live: 'assertive',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: 'text-amber-600',
    Icon: AlertTriangle,
    role: 'status',
    live: 'polite',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-900',
    icon: 'text-sky-600',
    Icon: Info,
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
        const { Icon } = v;
        return (
          <div
            key={toast.id}
            role={v.role}
            aria-live={v.live}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md animate-fade-in pointer-events-auto ${v.bg} ${v.border}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${v.icon}`} aria-hidden="true" />
            <span className={`flex-1 text-sm font-medium ${v.text}`}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className={`flex-shrink-0 ml-1 cursor-pointer hover:opacity-70 ${v.icon}`}
            >
              <X className="h-4 w-4" />
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
