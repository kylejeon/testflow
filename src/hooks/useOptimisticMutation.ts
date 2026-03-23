import { useState, useCallback, useRef } from 'react';

export type MutationStatus = 'idle' | 'saving' | 'saved' | 'error';

interface OptimisticMutationOptions<T> {
  onMutate: (data: T) => void;
  mutationFn: (data: T) => Promise<void>;
  onRollback?: (previous: T | null, error: Error) => void;
  onSuccess?: () => void;
}

/**
 * Generic optimistic mutation hook.
 * Immediately applies UI change, syncs to server async.
 * Rolls back and shows error toast on failure.
 */
export function useOptimisticMutation<T>(options: OptimisticMutationOptions<T>) {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const previousRef = useRef<T | null>(null);

  const mutate = useCallback(async (data: T, currentState?: T) => {
    // Snapshot for rollback
    if (currentState !== undefined) {
      previousRef.current = currentState;
    }

    // Optimistically apply change immediately (within 1 frame)
    options.onMutate(data);
    setStatus('saving');

    try {
      await options.mutationFn(data);
      setStatus('saved');
      options.onSuccess?.();
      // Auto-reset to idle after 2s
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      // Rollback UI to previous state
      if (previousRef.current !== null) {
        options.onRollback?.(previousRef.current, error);
      }
      setStatus('error');
      // Auto-reset to idle after 4s
      setTimeout(() => setStatus('idle'), 4000);
    }
  }, [options]);

  return { mutate, status };
}
