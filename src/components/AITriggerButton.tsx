interface AITriggerButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'ghost' | 'empty-state';
  label?: string;
  creditCount?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable AI trigger button.
 * Appears contextually at: empty state, create flow, command palette.
 *
 * variant="primary"     → solid indigo button (in toolbars)
 * variant="ghost"       → text/icon button (inline, less prominent)
 * variant="empty-state" → large centered CTA (empty list state)
 */
export function AITriggerButton({
  onClick,
  variant = 'primary',
  label = 'Generate with AI',
  creditCount = null,
  className = '',
  size = 'md',
}: AITriggerButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  if (variant === 'empty-state') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex flex-col items-center gap-3 px-8 py-6 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group cursor-pointer ${className}`}
      >
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
          <i className="ri-sparkling-2-line text-indigo-500 text-xl" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-indigo-600">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Describe your feature and AI will generate test cases
          </div>
        </div>
        {creditCount !== null && (
          <span className="text-xs text-indigo-400 font-medium">
            {creditCount} AI credits remaining
          </span>
        )}
      </button>
    );
  }

  if (variant === 'ghost') {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center ${sizeClasses[size]} text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium ${className}`}
      >
        <i className="ri-sparkling-2-line" />
        <span>{label}</span>
        {creditCount !== null && (
          <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold">
            {creditCount}
          </span>
        )}
      </button>
    );
  }

  // primary
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center ${sizeClasses[size]} bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-lg font-semibold transition-colors cursor-pointer ${className}`}
    >
      <i className="ri-sparkling-2-line" />
      <span>{label}</span>
      {creditCount !== null && (
        <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-semibold">
          {creditCount}
        </span>
      )}
    </button>
  );
}
