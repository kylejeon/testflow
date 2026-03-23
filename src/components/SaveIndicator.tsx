import type { SaveStatus } from '../hooks/useAutoSave';
import type { MutationStatus } from '../hooks/useOptimisticMutation';

interface SaveIndicatorProps {
  status: SaveStatus | MutationStatus;
  className?: string;
}

/**
 * Header component showing auto-save / mutation state.
 * Displays: nothing (idle) → "Saving..." → "Saved" → "Error"
 * No spinner — subtle text animation only.
 */
export function SaveIndicator({ status, className = '' }: SaveIndicatorProps) {
  if (status === 'idle') return null;

  const configs = {
    saving: {
      text: 'Saving...',
      className: 'text-indigo-400',
      icon: (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse mr-1.5" />
      ),
    },
    saved: {
      text: 'Saved',
      className: 'text-green-500',
      icon: (
        <svg className="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    error: {
      text: 'Save failed',
      className: 'text-red-500',
      icon: (
        <svg className="inline-block w-3.5 h-3.5 mr-1" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
        </svg>
      ),
    },
  } as const;

  const config = configs[status as keyof typeof configs];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center text-xs font-medium transition-opacity duration-300 ${config.className} ${className}`}
    >
      {config.icon}
      {config.text}
    </span>
  );
}
