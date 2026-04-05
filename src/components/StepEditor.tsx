import { useState, useRef, useCallback, useEffect } from 'react';
import type { AnyStep } from '../types/shared-steps';
import { isSharedStepRef } from '../types/shared-steps';

export interface Step {
  id: string;
  step: string;
  expectedResult: string;
}

interface StepEditorProps {
  steps: AnyStep[];
  onChange: (steps: AnyStep[]) => void;
  onInsertSharedStep?: () => void;
  onConvertToSharedStep?: (stepId: string) => void;
}

let _nextId = Date.now();
function newId() { return String(++_nextId); }

/**
 * Notion-style inline step editor.
 * - Click step text to edit inline
 * - Tab / Shift+Tab navigates between step ↔ expected result fields
 * - Enter on step field adds a new step below and focuses it
 * - Backspace on empty step removes it and focuses previous
 * - SharedStepRef items render as non-editable badges
 */
export function StepEditor({ steps, onChange, onInsertSharedStep, onConvertToSharedStep }: StepEditorProps) {
  const [focusedCell, setFocusedCell] = useState<{ stepId: string; field: 'step' | 'expected' } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Close context menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

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
      const s = steps[0];
      if (isSharedStepRef(s)) {
        // Replace shared ref with empty normal step
        const empty = { id: newId(), step: '', expectedResult: '' };
        onChange([empty]);
        requestAnimationFrame(() => focusCell(empty.id, 'step'));
      } else {
        onChange([{ ...s, step: '', expectedResult: '' }]);
        focusCell(s.id, 'step');
      }
      return;
    }
    const idx = steps.findIndex(s => s.id === id);
    const remaining = steps.filter(s => s.id !== id);
    onChange(remaining);
    // Focus previous normal step if available
    const prevIdx = Math.max(0, idx - 1);
    const prev = remaining[prevIdx];
    if (prev && !isSharedStepRef(prev)) {
      requestAnimationFrame(() => focusCell(prev.id, 'step', true));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    id: string,
    field: 'step' | 'expected'
  ) => {
    // Only normal steps have textareas, so skip SharedStepRef
    const normalSteps = steps.filter(s => !isSharedStepRef(s));
    const idx = steps.findIndex(s => s.id === id);
    const normalIdx = normalSteps.findIndex(s => s.id === id);

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
      if (e.key === 'Tab' && e.shiftKey && normalIdx > 0) {
        e.preventDefault();
        focusCell(normalSteps[normalIdx - 1].id, 'expected');
        return;
      }
    } else {
      // expected result field
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        // Find next normal step after current position
        const nextNormal = steps.slice(idx + 1).find(s => !isSharedStepRef(s));
        if (nextNormal) {
          focusCell(nextNormal.id, 'step');
        } else {
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
        // ── Shared Step reference row ────────────────────────────────────────
        if (isSharedStepRef(step)) {
          return (
            <div
              key={step.id}
              className="relative flex gap-3 p-3 rounded-lg border border-indigo-200 bg-indigo-50/60"
            >
              {/* Drag handle */}
              <div className="flex-shrink-0 mt-1 opacity-0 hover:opacity-100 transition-opacity cursor-grab text-indigo-300">
                <i className="ri-draggable text-base" />
              </div>

              {/* Link icon */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center mt-1">
                <i className="ri-links-line text-xs" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex-shrink-0">
                    {step.shared_step_custom_id}
                  </span>
                  <span className="text-sm font-medium text-slate-700 truncate">{step.shared_step_name}</span>
                  <span className="text-[0.65rem] text-indigo-400 flex-shrink-0">v{step.shared_step_version}</span>
                  <span className="ml-auto text-[0.6rem] font-bold text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                    Shared
                  </span>
                </div>
              </div>

              {/* Delete */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); deleteStep(step.id); }}
                className="flex-shrink-0 opacity-0 hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 rounded mt-1"
                tabIndex={-1}
              >
                <i className="ri-delete-bin-line text-sm" />
              </button>
            </div>
          );
        }

        // ── Normal step row ──────────────────────────────────────────────────
        const isHovered = hoveredStepId === step.id;
        return (
          <div
            key={step.id}
            className="relative flex gap-3 p-3 rounded-lg border transition-colors"
            style={{ borderColor: isHovered ? '#E5E7EB' : 'transparent', backgroundColor: isHovered ? '#F9FAFB' : 'transparent' }}
            onMouseEnter={() => setHoveredStepId(step.id)}
            onMouseLeave={() => setHoveredStepId(null)}
          >
            {/* Drag handle */}
            <div className={`flex-shrink-0 mt-1 transition-opacity cursor-grab text-gray-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
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

            {/* Actions: ⋮ menu + delete */}
            <div className="flex-shrink-0 flex flex-col gap-1 mt-1">
              {/* ⋮ context menu */}
              {onConvertToSharedStep && (
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setOpenMenuId(openMenuId === step.id ? null : step.id);
                    }}
                    className={`transition-opacity w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    tabIndex={-1}
                  >
                    <i className="ri-more-line text-sm" />
                  </button>
                  {openMenuId === step.id && (
                    <div
                      className="absolute right-0 top-7 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onConvertToSharedStep(step.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <i className="ri-links-line text-indigo-500" />
                        Convert to Shared Step
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Delete */}
              {steps.length > 1 && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); deleteStep(step.id); }}
                  className={`transition-opacity w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 rounded ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                  tabIndex={-1}
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom action buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => addStepAfter(steps[steps.length - 1].id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <i className="ri-add-line" />
          Add step
        </button>
        {onInsertSharedStep && (
          <button
            type="button"
            onClick={onInsertSharedStep}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <i className="ri-links-line" />
            Insert Shared Step
          </button>
        )}
      </div>
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
