import { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

/**
 * EditableCell — double-click to edit, Enter/blur to save, Esc to cancel.
 * Implements optimistic update pattern: saves immediately, reverts on error.
 *
 * Trigger: double-click or Enter when focused
 * Save: Enter key or blur (click outside)
 * Cancel: Escape key — reverts to original value
 */
export function EditableCell({
  value,
  onSave,
  className = '',
  placeholder = 'Click to edit...',
  multiline = false,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      // Select all text on focus
      inputRef.current?.select();
    }
  }, [editing]);

  // Keep draft in sync if value changes externally
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleSave = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setEditing(false);
    setError(false);
    try {
      await onSave(draft);
    } catch {
      setError(true);
      setDraft(value); // rollback
      setTimeout(() => setError(false), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
    if (multiline && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        title="Double-click to edit"
        className={`cursor-pointer hover:bg-indigo-50 rounded px-1 -mx-1 transition-colors select-none ${
          error ? 'text-red-500' : ''
        } ${!value ? 'text-gray-400 italic' : ''} ${className}`}
        onDoubleClick={() => { setDraft(value); setEditing(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { setDraft(value); setEditing(true); }
        }}
      >
        {value || placeholder}
      </span>
    );
  }

  const sharedProps = {
    ref: inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: handleSave,
    onKeyDown: handleKeyDown,
    className: `w-full px-2 py-1 rounded border-2 border-indigo-500 outline-none text-sm bg-white ${
      error ? 'border-red-500 animate-shake' : ''
    }`,
    placeholder,
  };

  return multiline ? (
    <textarea {...sharedProps} rows={3} style={{ resize: 'vertical' }} />
  ) : (
    <input {...sharedProps} type="text" />
  );
}

interface InlineStatusToggleProps {
  current: string;
  onChange: (status: string) => void;
  statuses?: string[];
}

const STATUS_STYLES: Record<string, string> = {
  passed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  failed: 'border-red-300 bg-red-50 text-red-800',
  blocked: 'border-amber-300 bg-amber-50 text-amber-800',
  retest: 'border-violet-300 bg-violet-50 text-violet-800',
  untested: 'border-slate-300 bg-slate-50 text-slate-600',
};

const STATUS_DOT: Record<string, string> = {
  passed: 'bg-emerald-500',
  failed: 'bg-red-500',
  blocked: 'bg-amber-500',
  retest: 'bg-violet-500',
  untested: 'bg-slate-400',
};

/**
 * InlineStatusToggle — click badge to open dropdown, select new status.
 */
export function InlineStatusToggle({
  current,
  onChange,
  statuses = ['passed', 'failed', 'blocked', 'retest', 'untested'],
}: InlineStatusToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1 rounded-full border text-xs font-medium px-2.5 py-1 transition-colors"
        style={{ borderColor: 'transparent' }}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
            STATUS_STYLES[current] ?? STATUS_STYLES.untested
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[current] ?? STATUS_DOT.untested}`} />
          {current.charAt(0).toUpperCase() + current.slice(1)}
        </span>
        <i className="ri-arrow-down-s-line text-gray-400 text-xs" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${
                s === current ? 'bg-indigo-50 font-medium' : ''
              }`}
            >
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${
                  STATUS_STYLES[s] ?? STATUS_STYLES.untested
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s] ?? STATUS_DOT.untested}`} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
