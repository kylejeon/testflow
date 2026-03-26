import { useState, useEffect, useRef, useCallback } from 'react';

export type TestStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested';

export interface FocusTestCase {
  id: string;
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  precondition?: string;
  runStatus?: TestStatus;
  // Extended for 3-tier metadata bar
  customId?: string;
  folder?: string;
  priority?: string;
  tags?: string;
  assignee?: string;
  attachments?: { name: string; url: string; size: number }[];
}

interface FocusModeProps {
  tests: FocusTestCase[];
  runName: string;
  onStatusChange: (testId: string, status: TestStatus, note?: string) => Promise<void>;
  onExit: () => void;
  initialIndex?: number;
}

const STATUS_CONFIG: Record<TestStatus, { label: string; key: string; color: string; bg: string; ring: string }> = {
  passed:   { label: 'Passed',   key: 'P', color: 'text-emerald-700', bg: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-300' },
  failed:   { label: 'Failed',   key: 'F', color: 'text-red-700',     bg: 'bg-red-500 hover:bg-red-600',         ring: 'ring-red-300'     },
  blocked:  { label: 'Blocked',  key: 'B', color: 'text-amber-700',   bg: 'bg-amber-500 hover:bg-amber-600',     ring: 'ring-amber-300'   },
  retest:   { label: 'Retest',   key: 'R', color: 'text-violet-700',  bg: 'bg-violet-500 hover:bg-violet-600',   ring: 'ring-violet-300'  },
  untested: { label: 'Skip',     key: 'S', color: 'text-slate-600',   bg: 'bg-slate-400 hover:bg-slate-500',     ring: 'ring-slate-200'   },
};

/**
 * Focus Mode — fullscreen test execution.
 * Keyboard shortcuts: P/F/B/R/S = status, N = note, J/→ = next, K/← = previous, Esc = exit
 * Auto-advances 300ms after status selection.
 */
export function FocusMode({ tests, runName, onStatusChange, onExit, initialIndex = 0 }: FocusModeProps) {
  const [index, setIndex] = useState(initialIndex);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [pending, setPending] = useState<TestStatus | null>(null);
  const [noteInputFocused, setNoteInputFocused] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const test = tests[index];
  const progress = ((index) / tests.length) * 100;

  const markAndNext = useCallback(
    async (status: TestStatus) => {
      if (!test) return;
      setPending(status);
      try {
        await onStatusChange(test.id, status, note || undefined);
      } catch {
        // silently fail — optimistic update handles UI
      }
      setNote('');
      setShowNote(false);
      setPending(null);
      // Auto-advance after 300ms
      setTimeout(() => {
        setIndex((i) => Math.min(i + 1, tests.length - 1));
      }, 300);
    },
    [test, note, onStatusChange, tests.length]
  );

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, tests.length - 1));
    setNote('');
    setShowNote(false);
  }, [tests.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    setNote('');
    setShowNote(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (noteInputFocused) {
        // In note input: Cmd+Enter saves and advances, Esc closes note
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (pending) markAndNext(pending);
        }
        if (e.key === 'Escape') {
          setShowNote(false);
          setNoteInputFocused(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p': e.preventDefault(); markAndNext('passed'); break;
        case 'f': e.preventDefault(); setShowNote(true); setPending('failed'); setTimeout(() => noteRef.current?.focus(), 50); break;
        case 'b': e.preventDefault(); markAndNext('blocked'); break;
        case 'r': e.preventDefault(); markAndNext('retest'); break;
        case 's': e.preventDefault(); markAndNext('untested'); break;
        case 'n': e.preventDefault(); setShowNote(true); setTimeout(() => noteRef.current?.focus(), 50); break;
        case 'j':
        case 'arrowright': e.preventDefault(); goNext(); break;
        case 'k':
        case 'arrowleft': e.preventDefault(); goPrev(); break;
        case 'escape':
          e.preventDefault();
          if (showNote) {
            setShowNote(false);
          } else {
            onExit();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [noteInputFocused, markAndNext, goNext, goPrev, onExit, showNote, pending]);

  if (!test) return null;

  // Parse steps from JSON string or plain text
  let steps: { step: string; expectedResult: string }[] = [];
  try {
    const parsed = JSON.parse(test.steps || '[]');
    steps = Array.isArray(parsed) ? parsed : [];
  } catch {
    if (test.steps) {
      steps = test.steps.split('\n').filter(Boolean).map((s) => ({ step: s, expectedResult: '' }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 shrink-0">
        <div
          className="h-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500">{runName}</span>
          <span className="text-sm font-semibold text-gray-900">
            {index + 1} <span className="text-gray-400">/</span> {tests.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Keyboard hint badges */}
          <div className="hidden md:flex items-center gap-1 text-xs text-gray-400">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
              <span key={status} className="flex items-center gap-0.5">
                <kbd className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
                  {cfg.key}
                </kbd>
                <span className="text-gray-300">=</span>
                <span className={cfg.color}>{cfg.label}</span>
              </span>
            ))}
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-close-line" />
            Exit Focus Mode
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Test title */}
          <div className="mb-6">
            {test.runStatus && test.runStatus !== 'untested' && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium mb-3 ${
                test.runStatus === 'passed' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                test.runStatus === 'failed' ? 'border-red-300 bg-red-50 text-red-800' :
                test.runStatus === 'blocked' ? 'border-amber-300 bg-amber-50 text-amber-800' :
                'border-violet-300 bg-violet-50 text-violet-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  test.runStatus === 'passed' ? 'bg-emerald-500' :
                  test.runStatus === 'failed' ? 'bg-red-500' :
                  test.runStatus === 'blocked' ? 'bg-amber-500' :
                  'bg-violet-500'
                }`} />
                Previously {test.runStatus}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
            {test.description && (
              <p className="text-gray-600 mt-2">{test.description}</p>
            )}
          </div>

          {/* Precondition */}
          {test.precondition && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-alert-line text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Precondition</span>
              </div>
              <p className="text-sm text-amber-800">{test.precondition}</p>
            </div>
          )}

          {/* Steps */}
          {steps.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Test Steps
              </h3>
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{s.step}</p>
                      {s.expectedResult && (
                        <div className="mt-2 pl-3 border-l-2 border-indigo-200">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Expected:</span> {s.expectedResult}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected result (when no structured steps) */}
          {test.expected_result && steps.length === 0 && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-checkbox-circle-line text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Expected Result</span>
              </div>
              <p className="text-sm text-indigo-800">{test.expected_result}</p>
            </div>
          )}

          {/* Note input */}
          {showNote && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onFocus={() => setNoteInputFocused(true)}
                onBlur={() => setNoteInputFocused(false)}
                rows={3}
                placeholder="Describe what you observed..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                <kbd className="font-mono bg-gray-100 px-1 rounded">⌘↵</kbd> to save & continue
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer — status buttons */}
      <div className="border-t border-gray-100 bg-white shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Previous */}
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ri-arrow-left-s-line" />
              Previous
            </button>

            {/* Status buttons */}
            <div className="flex items-center gap-2">
              {(Object.entries(STATUS_CONFIG) as [TestStatus, typeof STATUS_CONFIG[TestStatus]][]).map(([status, cfg]) => (
                <button
                  key={status}
                  onClick={() => {
                    if (status === 'failed') {
                      setShowNote(true);
                      setPending('failed');
                      setTimeout(() => noteRef.current?.focus(), 50);
                    } else {
                      markAndNext(status);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 h-11 rounded-lg text-sm font-medium text-white transition-colors ${cfg.bg} ${
                    pending === status ? `ring-2 ${cfg.ring}` : ''
                  }`}
                >
                  <kbd className="text-xs bg-white/20 px-1 rounded font-mono">{cfg.key}</kbd>
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Next */}
            <button
              onClick={goNext}
              disabled={index === tests.length - 1}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <i className="ri-arrow-right-s-line" />
            </button>
          </div>

          {/* Completion message */}
          {index === tests.length - 1 && (
            <div className="mt-3 text-center text-sm text-gray-500">
              Last test — press any status key to complete the run
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
