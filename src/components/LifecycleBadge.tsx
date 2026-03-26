import { useState, useRef, useEffect } from 'react';

export type LifecycleStatus = 'draft' | 'active' | 'deprecated';

interface LifecycleBadgeProps {
  status: LifecycleStatus;
  size?: 'sm' | 'md';
  clickable?: boolean;
  onStatusChange?: (newStatus: LifecycleStatus) => void;
}

const CONFIG: Record<LifecycleStatus, { label: string; icon: string; badgeCls: string; iconCls: string }> = {
  draft: {
    label: 'Draft',
    icon: 'ri-draft-line',
    badgeCls: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    iconCls: 'text-amber-600',
  },
  active: {
    label: 'Active',
    icon: 'ri-checkbox-circle-line',
    badgeCls: 'bg-green-50 text-green-800 border border-green-200',
    iconCls: 'text-green-600',
  },
  deprecated: {
    label: 'Deprecated',
    icon: 'ri-forbid-line',
    badgeCls: 'bg-slate-100 text-slate-500 border border-slate-200',
    iconCls: 'text-slate-400',
  },
};

const OPTIONS: LifecycleStatus[] = ['draft', 'active', 'deprecated'];

export function LifecycleBadge({ status, size = 'sm', clickable = false, onStatusChange }: LifecycleBadgeProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cfg = CONFIG[status];

  const textSizeCls = size === 'md' ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5';
  const iconSizeCls = size === 'md' ? 'text-sm' : 'text-[11px]';

  // Compute fixed position when opening
  const handleOpen = () => {
    if (!open && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((p) => !p);
  };

  // Close on outside click, Escape, or scroll
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const closeKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const closeScroll = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeKey);
    window.addEventListener('scroll', closeScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeKey);
      window.removeEventListener('scroll', closeScroll, true);
    };
  }, [open]);

  const handleSelect = (newStatus: LifecycleStatus) => {
    setOpen(false);
    if (newStatus !== status) onStatusChange?.(newStatus);
  };

  return (
    <>
      <span
        ref={badgeRef}
        role={clickable ? 'button' : undefined}
        aria-haspopup={clickable ? 'listbox' : undefined}
        aria-expanded={clickable ? open : undefined}
        onClick={clickable ? handleOpen : undefined}
        className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${textSizeCls} ${cfg.badgeCls} ${clickable ? 'cursor-pointer select-none' : ''}`}
      >
        <i className={`${cfg.icon} ${iconSizeCls}`} />
        {cfg.label}
        {clickable && <i className="ri-arrow-down-s-line text-[9px] ml-0.5" />}
      </span>

      {open && dropdownPos && (
        <div
          ref={dropdownRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-md py-1 min-w-[10rem] animate-dropdown"
        >
          {OPTIONS.map((opt) => {
            const c = CONFIG[opt];
            return (
              <button
                key={opt}
                role="option"
                aria-selected={opt === status}
                onClick={() => handleSelect(opt)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <i className={`${c.icon} ${c.iconCls}`} />
                <span>{c.label}</span>
                {opt === status && <i className="ri-check-line text-indigo-500 ml-auto text-sm" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
