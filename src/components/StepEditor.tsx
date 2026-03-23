import { useState, useRef, useCallback, useEffect } from 'react';

export interface Step {
  id: string;
  step: string;
  expectedResult: string;
}

interface StepEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

let _nextId = Date.now();
function newId() { return String(++_nextId); }

/**
 * Notion-style inline step editor.
 * - Click step text to edit inline
 * - Tab / Shift+Tab navigates between step ↔ expected result fields
 * - Enter on step field adds a new step below and focuses it
 * - Backspace on empty step removes it and focuses previous
 * - Drag handle on hover (decorative, visual only)
 */
export function StepEditor({ steps, onChange }: StepEditorProps) {
  const [focusedCell, setFocusedCell] = useState<{ stepId: string; field: 'step' | 'expected' } | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const getRef = (id: string, field: 'step' | 'expected') =>
    `${id}:${field}`;

  const focusCell = useCallback((id: string, field: 'step' | 'expected', cursorAtEnd = true) => {
    setFocusedCell({ stepId: id, field });
    requestAnimationFrame(() => {
      const el = textareaRefs.current.get(getRef(id, field));
      if (el) {
        el.focus();
        if (cursorAtEnd) {
          el.selectionStart = el.selectionEnd = el.value.length;
        }
      }
    });
  }, []);

  const updateStep = (id: string, field: 'step' | 'expectedResult', value: string) => {
    onChange(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addStepAfter = (afterId: string) => {
    const idx = steps.findIndex(s => s.id === afterId);
    const id = newId();
    const next = [...steps];
    next.splice(idx + 1, 0, { id, step: '', expectedResult: '' });
    onChange(next);
    requestAnimationFrame(() => focusCell(id, 'step'));
  };

  const deleteStep = (id: string) => {
    if (steps.length <= 1) {
      onChange([{ ...steps[0], step: '', expectedResult: '' }]);
      focusCell(steps[0].id, 'step');
      return;
    }
    const idx = steps.findIndex(s => s.id === id);
    const prevIdx = Math.max(0, idx - 1);
    const prevId = steps[prevIdx].id;
    onChange(steps.filter(s => s.id !== id));
    requestAnimationFrame(() => focusCell(prevId, 'step', true));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    id: string,
    field: 'step' | 'expected'
  ) => {
    const idx = steps.findIndex(s => s.id === id);

    if (field === 'step') {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addStepAfter(id);
        return;
      }
      if (e.key === 'Backspace' && (e.currentTarget.value === '')) {
        e.preventDefault();
        deleteStep(id);
        return;
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        focusCell(id, 'expected');
        return;
      }
      if (e.key === 'Tab' && e.shiftKey && idx > 0) {
        e.preventDefault();
        focusCell(steps[idx - 1].id, 'expected');
        return;
      }
    } else {
      // expected result field
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (idx < steps.length - 1) {
          focusCell(steps[idx + 1].id, 'step');
        } else {
          // last step — add new
          addStepAfter(id);
        }
        return;
      }
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        focusCell(id, 'step');
        return;
      }
    }
  };

  // Auto-resize textarea
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResize(el));
  }, [steps]);

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isEditing = focusedCell?.stepId === step.id;
        return (
          <div
            key={step.id}
            className="group relative flex gap-3 p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {/* Drag handle */}
            <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-gray-300">
              <i className="ri-draggable text-base" />
            </div>

            {/* Step number */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-1">
              {index + 1}
            </div>

            {/* Fields */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Step text */}
              <AutoResizeTextarea
                value={step.step}
                placeholder="Step action…"
                isFocused={focusedCell?.stepId === step.id && focusedCell?.field === 'step'}
                onFocus={() => setFocusedCell({ stepId: step.id, field: 'step' })}
                onBlur={() => setFocusedCell(null)}
                onChange={(v) => updateStep(step.id, 'step', v)}
                onKeyDown={(e) => handleKeyDown(e, step.id, 'step')}
                refCallback={(el) => {
                  if (el) textareaRefs.current.set(getRef(step.id, 'step'), el);
                  else textareaRefs.current.delete(getRef(step.id, 'step'));
                }}
                className="text-sm text-gray-900"
              />

              {/* Expected result — always shown but visually subdued when empty */}
              <div className="pl-3 border-l-2 border-indigo-100">
                <AutoResizeTextarea
                  value={step.expectedResult}
                  placeholder="Expected result (optional)"
                  isFocused={focusedCell?.stepId === step.id && focusedCell?.field === 'expected'}
                  onFocus={() => setFocusedCell({ stepId: step.id, field: 'expected' })}
                  onBlur={() => setFocusedCell(null)}
                  onChange={(v) => updateStep(step.id, 'expectedResult', v)}
                  onKeyDown={(e) => handleKeyDown(e, step.id, 'expected')}
                  refCallback={(el) => {
                    if (el) textareaRefs.current.set(getRef(step.id, 'expected'), el);
                    else textareaRefs.current.delete(getRef(step.id, 'expected'));
                  }}
                  className="text-xs text-gray-500"
                />
              </div>
            </div>

            {/* Delete button */}
            {steps.length > 1 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); deleteStep(step.id); }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 rounded mt-1"
                tabIndex={-1}
              >
                <i className="ri-delete-bin-line text-sm" />
              </button>
            )}
          </div>
        );
      })}

      {/* Add step */}
      <button
        onClick={() => addStepAfter(steps[steps.length - 1].id)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
      >
        <i className="ri-add-line" />
        Add step
      </button>
    </div>
  );
}

// ── Internal auto-resize textarea ──────────────────────────────────────────

interface AutoResizeTextareaProps {
  value: string;
  placeholder: string;
  isFocused: boolean;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  refCallback: (el: HTMLTextAreaElement | null) => void;
  className?: string;
}

function AutoResizeTextarea({
  value, placeholder, isFocused, onChange, onKeyDown, onFocus, onBlur, refCallback, className = '',
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        refCallback(el);
      }}
      value={value}
      placeholder={placeholder}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`w-full resize-none bg-transparent outline-none placeholder:text-gray-300 leading-relaxed ${
        isFocused
          ? 'ring-1 ring-indigo-300 rounded px-2 py-1 -mx-2 -my-1 bg-white'
          : 'cursor-text'
      } ${className}`}
      style={{ overflow: 'hidden', minHeight: '1.5rem' }}
    />
  );
}
