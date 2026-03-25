import { useEffect, useState } from 'react';

type TestStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';
type LifecycleStatus = 'draft' | 'active' | 'deprecated';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onSetStatus?: (status: TestStatus) => void;
  onSetLifecycleStatus?: (status: LifecycleStatus) => void;
  onAssign?: () => void;
  onTag?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  className?: string;
}

/**
 * BulkActionBar — floats at bottom of viewport when 1+ items are selected.
 * Slide-up animation. Shows count + action buttons + clear selection.
 *
 * Keyboard: Escape clears selection when bar is visible.
 */
export function BulkActionBar({
  selectedIds,
  onClear,
  onSetStatus,
  onSetLifecycleStatus,
  onAssign,
  onTag,
  onMove,
  onDelete,
  className = '',
}: BulkActionBarProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [lifecycleMenuOpen, setLifecycleMenuOpen] = useState(false);
  const count = selectedIds.size;

  // Close menus when selection clears
  useEffect(() => {
    if (count === 0) { setStatusMenuOpen(false); setLifecycleMenuOpen(false); }
  }, [count]);

  // Escape to clear selection
  useEffect(() => {
    if (count === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClear();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [count, onClear]);

  const STATUS_OPTIONS: { status: TestStatus; label: string; dot: string; text: string }[] = [
    { status: 'passed',   label: 'Passed',   dot: 'bg-emerald-500', text: 'text-emerald-800' },
    { status: 'failed',   label: 'Failed',   dot: 'bg-red-500',     text: 'text-red-800'     },
    { status: 'blocked',  label: 'Blocked',  dot: 'bg-amber-500',   text: 'text-amber-800'   },
    { status: 'retest',   label: 'Retest',   dot: 'bg-violet-500',  text: 'text-violet-800'  },
    { status: 'untested', label: 'Untested', dot: 'bg-slate-400',   text: 'text-slate-600'   },
  ];

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 transition-transform duration-200 ${
        count > 0 ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 bg-indigo-100 rounded flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-indigo-600 text-xs" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {count} item{count !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onAssign && (
              <BulkButton icon="ri-user-add-line" label="Assign" onClick={onAssign} />
            )}
            {onTag && (
              <BulkButton icon="ri-price-tag-3-line" label="Tag" onClick={onTag} />
            )}
            {onSetLifecycleStatus && (
              <div className="relative">
                <BulkButton
                  icon="ri-arrow-left-right-line"
                  label="Set Status"
                  onClick={() => setLifecycleMenuOpen((p) => !p)}
                  active={lifecycleMenuOpen}
                />
                {lifecycleMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-50">
                    {([
                      { status: 'draft' as LifecycleStatus, label: 'Draft', icon: 'ri-draft-line', color: 'text-amber-600' },
                      { status: 'active' as LifecycleStatus, label: 'Active', icon: 'ri-checkbox-circle-line', color: 'text-green-600' },
                      { status: 'deprecated' as LifecycleStatus, label: 'Deprecated', icon: 'ri-forbid-line', color: 'text-slate-400' },
                    ]).map(({ status, label, icon, color }) => (
                      <button
                        key={status}
                        onClick={() => {
                          onSetLifecycleStatus(status);
                          setLifecycleMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors"
                      >
                        <i className={`${icon} ${color}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onSetStatus && (
              <div className="relative">
                <BulkButton
                  icon="ri-checkbox-circle-line"
                  label="Set Status"
                  onClick={() => setStatusMenuOpen((p) => !p)}
                  active={statusMenuOpen}
                />
                {statusMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-50">
                    {STATUS_OPTIONS.map(({ status, label, dot }) => (
                      <button
                        key={status}
                        onClick={() => {
                          onSetStatus(status);
                          setStatusMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onMove && (
              <BulkButton icon="ri-folder-transfer-line" label="Move" onClick={onMove} />
            )}
            {onDelete && (
              <BulkButton
                icon="ri-delete-bin-line"
                label="Delete"
                onClick={onDelete}
                danger
              />
            )}
          </div>

          {/* Clear */}
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <i className="ri-close-line" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

interface BulkButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

function BulkButton({ icon, label, onClick, active, danger }: BulkButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : active
          ? 'bg-indigo-50 text-indigo-600'
          : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
      }`}
    >
      <i className={icon} />
      {label}
    </button>
  );
}
