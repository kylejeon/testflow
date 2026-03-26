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

const STATUS_CONFIG: Record<TestStatus, { label: string; key: string; bg: string; ring: string }> = {
  passed:   { label: 'Passed',  key: 'P', bg: 'bg-green-500 hover:bg-green-600',    ring: 'ring-green-300'   },
  failed:   { label: 'Failed',  key: 'F', bg: 'bg-red-500 hover:bg-red-600',        ring: 'ring-red-300'     },
  blocked:  { label: 'Blocked', key: 'B', bg: 'bg-amber-500 hover:bg-amber-600',    ring: 'ring-amber-300'   },
  retest:   { label: 'Retest',  key: 'R', bg: 'bg-violet-500 hover:bg-violet-600',  ring: 'ring-violet-300'  },
  untested: { label: 'Skip',    key: 'S', bg: 'bg-slate-400 hover:bg-slate-500',    ring: 'ring-slate-200'   },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-700',
  high:     'text-amber-700',
  medium:   'text-sky-700',
  low:      'text-gray-500',
};
const PRIORITY_DOTS: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-amber-500',
  medium:   'bg-sky-500',
  low:      'bg-gray-400',
};

function isImageFile(name: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Focus Mode — 3-Tier fullscreen test execution.
 * Tier 1: Main content (precondition, attachments, steps with P/F buttons, expected result)
 * Tier 2: Metadata bar (TC-ID, folder, priority, tags, assignee)
 * Tier 3: Collapsible (comments + history)
 * Keyboard shortcuts: P/F/B/R/S = status, N = note, J/→ = next, K/← = previous, Esc = exit
 */
export function FocusMode({ tests, runName, onStatusChange, onExit, initialIndex = 0 }: FocusModeProps) {
  const [index, setIndex] = useState(initialIndex);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [pending, setPending] = useState<TestStatus | null>(null);
  const [noteInputFocused, setNoteInputFocused] = useState(false);
  const [stepResults, setStepResults] = useState<Record<string, Record<number, 'passed' | 'failed'>>>({});
  const [tier3Open, setTier3Open] = useState<'none' | 'comments' | 'history'>('none');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const test = tests[index];
  const progress = (index / tests.length) * 100;

  // Parse steps
  let steps: { step: string; expectedResult: string }[] = [];
  if (test?.steps) {
    try {
      const parsed = JSON.parse(test.steps);
      steps = Array.isArray(parsed) ? parsed : [];
    } catch {
      steps = test.steps.split('\n').filter(Boolean).map((s) => ({
        step: s.replace(/^\d+\.\s*/, ''),
        expectedResult: '',
      }));
    }
  }

  const currentStepResults = stepResults[test?.id] || {};
  const passedStepCount = Object.values(currentStepResults).filter((v) => v === 'passed').length;

  const handleStepResult = (stepIndex: number, status: 'passed' | 'failed' | null) => {
    setStepResults((prev) => {
      const tcResults = { ...(prev[test.id] || {}) };
      if (status === null) delete tcResults[stepIndex];
      else tcResults[stepIndex] = status;
      return { ...prev, [test.id]: tcResults };
    });
  };

  const markAndNext = useCallback(
    async (status: TestStatus) => {
      if (!test) return;
      setPending(status);
      try {
        await onStatusChange(test.id, status, note || undefined);
      } catch {
        // optimistic update handles UI
      }
      setNote('');
      setShowNote(false);
      setPending(null);
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
      if (lightboxUrl) {
        if (e.key === 'Escape') setLightboxUrl(null);
        return;
      }
      if (noteInputFocused) {
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
        case 'c': e.preventDefault(); setTier3Open((v) => v === 'comments' ? 'none' : 'comments'); break;
        case 'h': e.preventDefault(); setTier3Open((v) => v === 'history' ? 'none' : 'history'); break;
        case 'j':
        case 'arrowright': e.preventDefault(); goNext(); break;
        case 'k':
        case 'arrowleft': e.preventDefault(); goPrev(); break;
        case 'escape':
          e.preventDefault();
          if (showNote) setShowNote(false);
          else onExit();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [noteInputFocused, markAndNext, goNext, goPrev, onExit, showNote, pending, lightboxUrl]);

  if (!test) return null;

  const tagList = test.tags ? test.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const hasAttachments = test.attachments && test.attachments.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 shrink-0">
        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{runName}</span>
          <span className="text-sm font-medium text-gray-400">{index + 1} / {tests.length}</span>
        </div>
        <div className="flex items-center gap-2 text-[0.625rem] text-gray-400">
          {(Object.entries(STATUS_CONFIG) as [TestStatus, typeof STATUS_CONFIG[TestStatus]][]).map(([status, cfg]) => (
            <span key={status} className="flex items-center gap-0.5">
              <kbd className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 border border-gray-200 rounded text-[0.5625rem] font-mono">
                {cfg.key}
              </kbd>
              <span className="hidden md:inline">{cfg.label}</span>
            </span>
          ))}
          <span className="w-px h-3 bg-gray-200 mx-1" />
          <span className="flex items-center gap-0.5"><kbd className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 border border-gray-200 rounded text-[0.5625rem] font-mono">C</kbd> Comments</span>
          <span className="flex items-center gap-0.5"><kbd className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 border border-gray-200 rounded text-[0.5625rem] font-mono">H</kbd> History</span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
        >
          <i className="ri-close-line" />
          Exit
          <kbd className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 border border-gray-200 rounded text-[0.5625rem] font-mono ml-1">Esc</kbd>
        </button>
      </div>

      {/* ── TIER 2: Metadata Bar ── */}
      <div className="flex items-center gap-2 px-6 bg-gray-50 border-b border-gray-200 shrink-0 h-10 overflow-x-auto">
        {test.customId && (
          <>
            <span className="font-mono text-[0.8125rem] font-semibold text-violet-700 shrink-0">{test.customId}</span>
            <span className="text-gray-300 shrink-0">·</span>
          </>
        )}
        {test.folder && (
          <>
            <span className="flex items-center gap-1 text-[0.8125rem] text-gray-500 shrink-0">
              <i className="ri-folder-line text-gray-400 text-sm" />
              {test.folder}
            </span>
            <span className="text-gray-300 shrink-0">·</span>
          </>
        )}
        {test.priority && (
          <>
            <span className={`flex items-center gap-1 text-[0.8125rem] font-semibold shrink-0 ${PRIORITY_COLORS[test.priority] || 'text-gray-500'}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOTS[test.priority] || 'bg-gray-400'}`} />
              {test.priority.charAt(0).toUpperCase() + test.priority.slice(1)}
            </span>
            {(tagList.length > 0 || test.assignee) && <span className="text-gray-300 shrink-0">·</span>}
          </>
        )}
        {tagList.length > 0 && (
          <>
            <span className="flex items-center gap-1 text-[0.8125rem] text-gray-500 shrink-0">
              <i className="ri-price-tag-3-line text-gray-400 text-sm" />
              <span className="flex gap-1">
                {tagList.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[0.6875rem] font-medium">{tag}</span>
                ))}
              </span>
            </span>
            {test.assignee && <span className="text-gray-300 shrink-0">·</span>}
          </>
        )}
        {test.assignee && (
          <span className="flex items-center gap-1 text-[0.8125rem] text-gray-600 shrink-0">
            <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[0.4375rem] font-bold shrink-0">
              {test.assignee.substring(0, 2).toUpperCase()}
            </span>
            {test.assignee}
          </span>
        )}
      </div>

      {/* ── TIER 1: Main Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-6 py-8">

          {/* Previously-status badge */}
          {test.runStatus && test.runStatus !== 'untested' && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium mb-3 ${
              test.runStatus === 'passed' ? 'border-green-300 bg-green-50 text-green-800' :
              test.runStatus === 'failed' ? 'border-red-300 bg-red-50 text-red-800' :
              test.runStatus === 'blocked' ? 'border-amber-300 bg-amber-50 text-amber-800' :
              'border-violet-300 bg-violet-50 text-violet-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                test.runStatus === 'passed' ? 'bg-green-500' :
                test.runStatus === 'failed' ? 'bg-red-500' :
                test.runStatus === 'blocked' ? 'bg-amber-500' : 'bg-violet-500'
              }`} />
              Previously {test.runStatus}
            </div>
          )}

          {/* Title + description */}
          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{test.title}</h1>
          {test.description && (
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">{test.description}</p>
          )}

          {/* Precondition */}
          {test.precondition && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <i className="ri-alert-line text-amber-500" />
                <span className="text-[0.6875rem] font-bold text-amber-700 uppercase tracking-wider">Precondition</span>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">{test.precondition}</p>
            </div>
          )}

          {/* Attachments (thumbnails 120×80 + lightbox) */}
          {hasAttachments && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <i className="ri-attachment-2 text-gray-400" />
                Attachments ({test.attachments!.length})
              </div>
              <div className="flex flex-wrap gap-2.5">
                {test.attachments!.map((file, i) => {
                  const isImg = isImageFile(file.name);
                  return isImg ? (
                    <button
                      key={i}
                      onClick={() => setLightboxUrl(file.url)}
                      className="w-[120px] h-[80px] rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-zoom-in flex-shrink-0"
                    >
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-[80px] min-w-[140px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 flex flex-col justify-center hover:border-indigo-300 transition-colors flex-shrink-0"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-0.5">
                        <i className="ri-file-text-line text-gray-400 text-sm" />
                        <span className="truncate max-w-[100px]">{file.name}</span>
                      </div>
                      <div className="text-[0.6875rem] text-gray-400">{formatFileSize(file.size)}</div>
                      <div className="text-[0.6875rem] text-indigo-500 font-semibold flex items-center gap-0.5 mt-0.5">
                        <i className="ri-download-2-line text-xs" /> Download
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Test Steps with Step-Level P/F buttons */}
          {steps.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Test Steps
                </span>
                {passedStepCount > 0 && (
                  <span className="text-[0.6875rem] text-gray-400">
                    <span className="text-green-600 font-semibold">{passedStepCount}</span>/{steps.length} passed
                  </span>
                )}
              </div>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                {steps.map((s, i) => {
                  const result = currentStepResults[i];
                  const rowClass =
                    result === 'passed' ? 'bg-green-50 border-green-200' :
                    result === 'failed'  ? 'bg-red-50 border-red-200' :
                    'bg-white';
                  const numClass =
                    result === 'passed' ? 'bg-green-500 text-white' :
                    result === 'failed'  ? 'bg-red-500 text-white' :
                    'bg-indigo-100 text-indigo-600';
                  const isHtml = /<[^>]+>/.test(s.step);
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 px-4 py-3.5 border-b last:border-b-0 ${rowClass} ${i > 0 ? 'border-t' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.6875rem] font-bold flex-shrink-0 mt-0.5 ${numClass}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isHtml ? (
                          <div
                            className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: s.step }}
                            onClick={(e) => {
                              const t = e.target as HTMLElement;
                              if (t.tagName === 'IMG') setLightboxUrl((t as HTMLImageElement).src);
                            }}
                          />
                        ) : (
                          <p className="text-sm text-gray-700 leading-relaxed">{s.step}</p>
                        )}
                        {s.expectedResult && (
                          <div className="mt-2 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5 flex items-start gap-1.5">
                            <i className="ri-checkbox-circle-line text-green-500 text-sm flex-shrink-0 mt-0.5" />
                            <p className="text-[0.8125rem] text-green-700 leading-relaxed">{s.expectedResult}</p>
                          </div>
                        )}
                      </div>
                      {/* Step-level Pass/Fail buttons */}
                      <div className="flex gap-1 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => handleStepResult(i, result === 'passed' ? null : 'passed')}
                          title="Pass this step"
                          className={`w-7 h-7 flex items-center justify-center rounded-md text-sm border transition-all cursor-pointer ${
                            result === 'passed'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-white border-gray-200 text-gray-400 hover:bg-green-50 hover:border-green-300 hover:text-green-600'
                          }`}
                        >
                          <i className="ri-check-line" />
                        </button>
                        <button
                          onClick={() => handleStepResult(i, result === 'failed' ? null : 'failed')}
                          title="Fail this step"
                          className={`w-7 h-7 flex items-center justify-center rounded-md text-sm border transition-all cursor-pointer ${
                            result === 'failed'
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                          }`}
                        >
                          <i className="ri-close-line" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overall Expected Result (when no steps) */}
          {test.expected_result && steps.length === 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <i className="ri-checkbox-circle-line text-indigo-500" />
                <span className="text-[0.6875rem] font-bold text-indigo-700 uppercase tracking-wider">Expected Result</span>
              </div>
              <p className="text-sm text-indigo-800 leading-relaxed">{test.expected_result}</p>
            </div>
          )}

          {/* Note input */}
          {showNote && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Note <span className="text-gray-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                ref={noteRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onFocus={() => setNoteInputFocused(true)}
                onBlur={() => setNoteInputFocused(false)}
                rows={3}
                placeholder="Describe what you observed..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed"
              />
              <p className="text-[0.6875rem] text-gray-400 mt-1 text-right">
                <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-[0.5625rem]">⌘↵</kbd> to save & continue
              </p>
            </div>
          )}

          {/* ── TIER 3: Collapsible panels ── */}
          <div className="mt-4 space-y-2">
            {/* Comments accordion */}
            <div>
              <button
                onClick={() => setTier3Open((v) => v === 'comments' ? 'none' : 'comments')}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 text-left transition-colors cursor-pointer ${
                  tier3Open === 'comments' ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                } hover:bg-gray-100`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                  <i className="ri-chat-3-line text-gray-400" />
                  Comments
                </span>
                <div className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center justify-center w-4 h-4 bg-gray-200 border border-gray-300 rounded text-[0.5625rem] font-mono text-gray-500">C</kbd>
                  <i className={`ri-arrow-right-s-line text-gray-400 transition-transform ${tier3Open === 'comments' ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {tier3Open === 'comments' && (
                <div className="border border-gray-200 border-t-0 rounded-b-lg px-4 py-3 bg-white">
                  <p className="text-xs text-gray-400 text-center py-3">No comments yet</p>
                </div>
              )}
            </div>

            {/* History accordion */}
            <div>
              <button
                onClick={() => setTier3Open((v) => v === 'history' ? 'none' : 'history')}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 text-left transition-colors cursor-pointer ${
                  tier3Open === 'history' ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                } hover:bg-gray-100`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                  <i className="ri-time-line text-gray-400" />
                  Execution History
                </span>
                <div className="flex items-center gap-1.5">
                  <kbd className="inline-flex items-center justify-center w-4 h-4 bg-gray-200 border border-gray-300 rounded text-[0.5625rem] font-mono text-gray-500">H</kbd>
                  <i className={`ri-arrow-right-s-line text-gray-400 transition-transform ${tier3Open === 'history' ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {tier3Open === 'history' && (
                <div className="border border-gray-200 border-t-0 rounded-b-lg px-4 py-3 bg-white">
                  <p className="text-xs text-gray-400 text-center py-3">No execution history</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — status buttons */}
      <div className="border-t border-gray-100 bg-white shrink-0">
        <div className="max-w-[720px] mx-auto px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Previous */}
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="ri-arrow-left-s-line" />
            Previous
          </button>

          {/* Status buttons */}
          <div className="flex items-center gap-1.5">
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
                className={`flex items-center gap-1.5 px-3.5 py-2.5 h-10 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer border-0 ${cfg.bg} ${
                  pending === status ? `ring-2 ${cfg.ring}` : ''
                }`}
              >
                <kbd className="text-[0.625rem] bg-white/20 px-1 rounded font-mono">{cfg.key}</kbd>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={goNext}
            disabled={index === tests.length - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
        {index === tests.length - 1 && (
          <p className="text-center text-xs text-gray-400 pb-2 -mt-1">Last test — press any status key to complete the run</p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-xl border-0 cursor-pointer"
          >
            <i className="ri-close-line" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
