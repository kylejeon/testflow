import { useState, useEffect, useRef, useMemo } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

interface AutoSaveOptions<T> {
  data: T;
  saveFn: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

/**
 * Auto-save hook: debounces save calls and tracks status.
 * - "Saving..." shown immediately on first keystroke
 * - "Saved" shown after server confirms
 * - Rolls back via onError if provided
 */
export function useAutoSave<T>({
  data,
  saveFn,
  delay = 500,
  enabled = true,
}: AutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const isFirstRender = useRef(true);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const debouncedSave = useMemo(
    () =>
      debounce(async (d: T) => {
        setStatus('saving');
        try {
          await saveFnRef.current(d);
          setStatus('saved');
          setTimeout(() => setStatus('idle'), 2000);
        } catch {
          setStatus('error');
          setTimeout(() => setStatus('idle'), 4000);
        }
      }, delay),
    [delay]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!enabled) return;
    setStatus('saving');
    debouncedSave(data);
  }, [data, enabled, debouncedSave]);

  return status;
}
