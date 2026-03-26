import { useState, useCallback, useRef } from 'react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;

export function useToast() {
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
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), 3000);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return { toasts, showToast, dismiss };
}

const icons: Record<ToastType, string> = {
  error: 'ri-error-warning-line',
  success: 'ri-checkbox-circle-line',
  warning: 'ri-alert-line',
  info: 'ri-information-line',
};

const styles: Record<ToastType, { bg: string; icon: string; text: string }> = {
  error:   { bg: 'bg-red-50 border-red-200',     icon: 'text-red-500',    text: 'text-red-800' },
  success: { bg: 'bg-green-50 border-green-200', icon: 'text-green-500',  text: 'text-green-800' },
  warning: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-500',  text: 'text-amber-800' },
  info:    { bg: 'bg-blue-50 border-blue-200',   icon: 'text-blue-500',   text: 'text-blue-800' },
};

interface ToastContainerProps {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}

export function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const s = styles[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-fade-in pointer-events-auto ${s.bg}`}
          >
            <i className={`${icons[toast.type]} text-lg flex-shrink-0 mt-0.5 ${s.icon}`} />
            <span className={`flex-1 text-sm font-medium ${s.text}`}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className={`flex-shrink-0 ml-1 cursor-pointer hover:opacity-70 ${s.icon}`}
            >
              <i className="ri-close-line text-base" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
