import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { AnyStep, SharedStepRef } from '../types/shared-steps';
import { isSharedStepRef } from '../types/shared-steps';
import { supabase } from '../lib/supabase';

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
  onUpdateSharedStepVersion?: (stepId: string, newVersion: number) => void;
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
export function StepEditor({ steps, onChange, onInsertSharedStep, onConvertToSharedStep, onUpdateSharedStepVersion }: StepEditorProps) {
  const [focusedCell, setFocusedCell] = useState<{ stepId: string; field: 'step' | 'expected' } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => { setOpenMenuId(null); setMenuPos(null); };
    document.addEventListener('click', handler);
    document.addEventListener('scroll', handler, true);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('scroll', handler, true);
    };
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
            <SharedStepRefRow
              key={step.id}
              step={step}
              showDelete={steps.length > 1}
              onDelete={() => deleteStep(step.id)}
              onUpdateVersion={onUpdateSharedStepVersion}
            />
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
              {/* ⋮ context menu — portal-rendered to escape overflow:auto clipping */}
              {onConvertToSharedStep && (
                <>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (openMenuId === step.id) {
                        setOpenMenuId(null);
                        setMenuPos(null);
                      } else {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setOpenMenuId(step.id);
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    tabIndex={-1}
                    title="More options"
                  >
                    <i className="ri-more-2-line text-base" />
                  </button>
                  {openMenuId === step.id && menuPos && createPortal(
                    <div
                      style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                      className="w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          setMenuPos(null);
                          onConvertToSharedStep(step.id);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <i className="ri-links-line text-indigo-500" />
                        Convert to Shared Step
                      </button>
                    </div>,
                    document.body
                  )}
                </>
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

// ── Shared Step reference row (fetches + renders actual steps) ─────────────

type SubStep = { step: string; expectedResult: string };

interface SharedStepRefRowProps {
  step: SharedStepRef;
  showDelete?: boolean;
  onDelete?: () => void;
  onUpdateVersion?: (stepId: string, newVersion: number) => void;
  /** TC id — when provided and onUpdateVersion is absent, clicking "Update to vN" writes directly to DB */
  tcId?: string;
  onVersionUpdated?: () => void;
}

export function SharedStepRefRow({ step, showDelete, onDelete, onUpdateVersion, tcId, onVersionUpdated }: SharedStepRefRowProps) {
  const [pinnedSteps, setPinnedSteps] = useState<SubStep[]>([]);
  const [latestSteps, setLatestSteps] = useState<SubStep[]>([]);
  const [latestVersion, setLatestVersion] = useState(step.shared_step_version);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [showVersionDiff, setShowVersionDiff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const parseSteps = (raw: any): SubStep[] => {
      if (!raw) return [];
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    };

    const load = async () => {
      const { data: latest, error } = await supabase
        .from('shared_steps')
        .select('steps, version')
        .eq('id', step.shared_step_id)
        .single();

      if (cancelled) return;
      if (error) {
        console.error('[SharedStepRefRow] fetch error:', error.message, 'id:', step.shared_step_id);
        setLoading(false);
        return;
      }

      const latestVer = latest?.version ?? step.shared_step_version;
      const latestSubs = parseSteps(latest?.steps);
      setLatestVersion(latestVer);
      setLatestSteps(latestSubs);

      if (step.shared_step_version >= latestVer) {
        setPinnedSteps(latestSubs);
        setLoading(false);
        return;
      }

      // Fetch pinned version content from history
      const { data: hist } = await supabase
        .from('shared_step_versions')
        .select('steps')
        .eq('shared_step_id', step.shared_step_id)
        .eq('version', step.shared_step_version)
        .maybeSingle();

      if (cancelled) return;
      setPinnedSteps(hist?.steps ? parseSteps(hist.steps) : latestSubs);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [step.shared_step_id, step.shared_step_version]);

  const hasDrift = latestVersion > step.shared_step_version;

  const renderSubStep = (s: SubStep, i: number, highlight = false) => (
    <div key={i} className="flex gap-2">
      <div className={`flex-shrink-0 w-5 h-5 rounded-full text-[0.6rem] font-bold flex items-center justify-center mt-0.5 ${highlight ? 'bg-emerald-200 text-emerald-700' : 'bg-indigo-200 text-indigo-600'}`}>
        {i + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-700 leading-relaxed">{s.step}</p>
        {s.expectedResult && (
          <div className="mt-1 pl-2 border-l-2 border-indigo-200">
            <p className="text-[0.7rem] text-indigo-500 leading-relaxed">{s.expectedResult}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Collapse/expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-indigo-400 hover:text-indigo-600 transition-colors"
            tabIndex={-1}
          >
            <i className={`text-xs ${expanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}`} />
          </button>

          {/* Link icon */}
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center">
            <i className="ri-links-line text-[0.6rem]" />
          </div>

          {/* ID badge */}
          <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded flex-shrink-0">
            {step.shared_step_custom_id}
          </span>

          {/* Name */}
          <span className="text-sm font-medium text-slate-700 truncate flex-1 min-w-0">{step.shared_step_name}</span>

          {/* Version + drift indicator */}
          <span className="text-[0.65rem] flex-shrink-0 flex items-center gap-1">
            <span className="text-indigo-400">v{step.shared_step_version}</span>
            {hasDrift && (
              <button
                type="button"
                onClick={() => setShowVersionDiff(true)}
                className="inline-flex items-center gap-0.5 px-1 py-px bg-amber-100 text-amber-600 hover:bg-amber-200 border border-amber-300 rounded text-[0.6rem] font-bold transition-colors"
                title={`v${latestVersion} available — click to view changes`}
              >
                <i className="ri-arrow-up-line text-[0.6rem]" /> v{latestVersion}
              </button>
            )}
          </span>

          {/* Shared badge */}
          <span className="text-[0.6rem] font-bold text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
            Shared
          </span>

          {/* Delete */}
          {showDelete && onDelete && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onDelete(); }}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-indigo-300 hover:text-red-500 transition-colors rounded"
              tabIndex={-1}
            >
              <i className="ri-delete-bin-line text-xs" />
            </button>
          )}
        </div>

        {/* Sub-steps (pinned version, expanded) */}
        {expanded && (
          <div className="border-t border-indigo-100 px-3 pb-3 pt-2 space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-indigo-400 py-1">
                <i className="ri-loader-4-line animate-spin" /> Loading steps…
              </div>
            ) : pinnedSteps.length === 0 ? (
              <p className="text-xs text-indigo-300 italic">No steps defined.</p>
            ) : (
              pinnedSteps.map((s, i) => renderSubStep(s, i))
            )}
          </div>
        )}
      </div>

      {/* Version Diff modal — portal to escape overflow clipping */}
      {showVersionDiff && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999]"
          style={{ background: 'rgba(15,23,42,0.5)' }}
          onClick={() => setShowVersionDiff(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.65rem] font-mono font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {step.shared_step_custom_id}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-800">{step.shared_step_name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  New version available — v{step.shared_step_version} (current) → v{latestVersion} (latest)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionDiff(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            {/* Body: side-by-side diff */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="p-4">
                  <div className="text-[0.6875rem] font-semibold uppercase text-slate-400 tracking-wider mb-3">
                    v{step.shared_step_version} (Current)
                  </div>
                  <div className="space-y-2">
                    {pinnedSteps.length === 0
                      ? <p className="text-xs text-slate-300 italic">No steps</p>
                      : pinnedSteps.map((s, i) => renderSubStep(s, i))}
                  </div>
                </div>
                <div className="p-4 bg-emerald-50/40">
                  <div className="text-[0.6875rem] font-semibold uppercase text-emerald-600 tracking-wider mb-3">
                    v{latestVersion} (Latest)
                  </div>
                  <div className="space-y-2">
                    {latestSteps.length === 0
                      ? <p className="text-xs text-slate-300 italic">No steps</p>
                      : latestSteps.map((s, i) => renderSubStep(s, i, true))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVersionDiff(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Keep v{step.shared_step_version}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onUpdateVersion) {
                    onUpdateVersion(step.id, latestVersion);
                    setShowVersionDiff(false);
                  } else if (tcId) {
                    // Detail-panel path: update directly in DB
                    try {
                      const { data: tcData } = await supabase
                        .from('test_cases')
                        .select('steps')
                        .eq('id', tcId)
                        .single();
                      if (tcData) {
                        let stepsArr: any[] = [];
                        try { stepsArr = typeof tcData.steps === 'string' ? JSON.parse(tcData.steps) : (tcData.steps || []); } catch {}
                        const updated = stepsArr.map((s: any) =>
                          s.type === 'shared_step_ref' && s.shared_step_id === step.shared_step_id
                            ? { ...s, shared_step_version: latestVersion }
                            : s
                        );
                        await supabase.from('test_cases').update({ steps: JSON.stringify(updated) }).eq('id', tcId);
                        await supabase.from('shared_step_usage')
                          .update({ linked_version: latestVersion })
                          .eq('test_case_id', tcId)
                          .eq('shared_step_id', step.shared_step_id);
                        setShowVersionDiff(false);
                        onVersionUpdated?.();
                      }
                    } catch (err) {
                      console.error('[SharedStepRefRow] direct version update failed:', err);
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <i className="ri-arrow-up-line" />
                Update to v{latestVersion}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
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
