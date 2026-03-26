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
  // Tier 2 metadata bar fields
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

// ── Design tokens from 38-focus-mode-design.html ──────────────────────────────

// Status button config: colors + icons matching design exactly
const STATUS_BUTTONS: {
  status: TestStatus;
  label: string;
  key: string;
  icon: string;
  bg: string;
  hoverBg: string;
}[] = [
  { status: 'passed',   label: 'Passed',  key: 'P', icon: 'ri-check-line',         bg: '#22C55E', hoverBg: '#16A34A' },
  { status: 'failed',   label: 'Failed',  key: 'F', icon: 'ri-close-line',          bg: '#EF4444', hoverBg: '#DC2626' },
  { status: 'blocked',  label: 'Blocked', key: 'B', icon: 'ri-forbid-line',         bg: '#F59E0B', hoverBg: '#D97706' },
  { status: 'retest',   label: 'Retest',  key: 'R', icon: 'ri-refresh-line',        bg: '#8B5CF6', hoverBg: '#7C3AED' },
  { status: 'untested', label: 'Skip',    key: 'S', icon: 'ri-skip-forward-line',   bg: '#94A3B8', hoverBg: '#64748B' },
];

// Priority dot colors: Critical #EF4444, High #F59E0B, Medium #6366F1, Low #94A3B8
const PRIORITY_DOT: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F59E0B',
  medium:   '#6366F1',
  low:      '#94A3B8',
};
const PRIORITY_TEXT_COLOR: Record<string, string> = {
  critical: '#991B1B',
  high:     '#92400E',
  medium:   '#3730A3',
  low:      '#64748B',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSteps(raw?: string): { step: string; expectedResult: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return raw.split('\n').filter(Boolean).map((s) => ({
    step: s.replace(/^\d+\.\s*/, ''),
    expectedResult: '',
  }));
}

function isImageFile(name: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * FocusMode — 3-Tier fullscreen test execution.
 *
 * Tier 1 (Main body):  Precondition → Attachments → Steps w/ P/F buttons → Expected Result → Note
 * Tier 2 (Meta bar):   TC-ID · Folder · Priority · Tags · Assignee (40px fixed bar)
 * Tier 3 (Collapsible): Comments (C key) + Execution History (H key) — collapsed by default
 *
 * Keyboard: P/F/B/R/S = status, N = note focus, C = comments, H = history, J/→ = next, K/← = prev, Esc = exit
 */
export function FocusMode({ tests, runName, onStatusChange, onExit, initialIndex = 0 }: FocusModeProps) {
  const [index, setIndex] = useState(initialIndex);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<TestStatus | null>(null);
  const [noteInputFocused, setNoteInputFocused] = useState(false);
  // Per-TC step results: { [tcId]: { [stepIndex]: 'passed' | 'failed' } }
  const [stepResults, setStepResults] = useState<Record<string, Record<number, 'passed' | 'failed'>>>({});
  // Tier 3 collapse state
  const [openPanel, setOpenPanel] = useState<'none' | 'comments' | 'history'>('none');
  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const test = tests[index];
  const progress = (index / tests.length) * 100;

  // Parse steps
  const steps = parseSteps(test?.steps);
  const currentStepResults = stepResults[test?.id] || {};
  const passedStepCount = Object.values(currentStepResults).filter((v) => v === 'passed').length;

  // Image attachments only (for lightbox navigation)
  const imageAttachments = (test?.attachments || []).filter((f) => isImageFile(f.name));

  // ── Navigation reset ──────────────────────────────────────────────────────
  const resetForNavigation = useCallback(() => {
    setOpenPanel('none');
    setNote('');
    setLightboxUrl(null);
    // Scroll body to top
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const markAndNext = useCallback(
    async (status: TestStatus) => {
      if (!test) return;
      setPending(status);
      try {
        await onStatusChange(test.id, status, note.trim() || undefined);
      } catch {
        // optimistic update handles UI
      }
      setPending(null);
      resetForNavigation();
      setTimeout(() => {
        setIndex((i) => Math.min(i + 1, tests.length - 1));
      }, 300);
    },
    [test, note, onStatusChange, tests.length, resetForNavigation]
  );

  const goNext = useCallback(() => {
    resetForNavigation();
    setIndex((i) => Math.min(i + 1, tests.length - 1));
  }, [tests.length, resetForNavigation]);

  const goPrev = useCallback(() => {
    resetForNavigation();
    setIndex((i) => Math.max(i - 1, 0));
  }, [resetForNavigation]);

  const handleStepResult = (stepIndex: number, result: 'passed' | 'failed' | null) => {
    setStepResults((prev) => {
      const tc = { ...(prev[test.id] || {}) };
      if (result === null) delete tc[stepIndex];
      else tc[stepIndex] = result;
      return { ...prev, [test.id]: tc };
    });
  };

  const openLightbox = (url: string) => {
    const idx = imageAttachments.findIndex((f) => f.url === url);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxUrl(url);
  };

  const lightboxPrev = () => {
    const newIdx = (lightboxIndex - 1 + imageAttachments.length) % imageAttachments.length;
    setLightboxIndex(newIdx);
    setLightboxUrl(imageAttachments[newIdx].url);
  };

  const lightboxNext = () => {
    const newIdx = (lightboxIndex + 1) % imageAttachments.length;
    setLightboxIndex(newIdx);
    setLightboxUrl(imageAttachments[newIdx].url);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Lightbox takes priority
      if (lightboxUrl) {
        if (e.key === 'Escape') { setLightboxUrl(null); return; }
        if (e.key === 'ArrowLeft') { lightboxPrev(); return; }
        if (e.key === 'ArrowRight') { lightboxNext(); return; }
        return;
      }

      // Block shortcuts when typing in input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (pending) markAndNext(pending);
        }
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          setNoteInputFocused(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p': e.preventDefault(); markAndNext('passed'); break;
        case 'f':
          e.preventDefault();
          setPending('failed');
          setTimeout(() => noteRef.current?.focus(), 50);
          break;
        case 'b': e.preventDefault(); markAndNext('blocked'); break;
        case 'r': e.preventDefault(); markAndNext('retest'); break;
        case 's': e.preventDefault(); markAndNext('untested'); break;
        case 'n':
          e.preventDefault();
          noteRef.current?.focus();
          break;
        case 'c': e.preventDefault(); setOpenPanel((v) => v === 'comments' ? 'none' : 'comments'); break;
        case 'h': e.preventDefault(); setOpenPanel((v) => v === 'history' ? 'none' : 'history'); break;
        case 'j':
        case 'arrowright': e.preventDefault(); goNext(); break;
        case 'k':
        case 'arrowleft': e.preventDefault(); goPrev(); break;
        case 'escape':
          e.preventDefault();
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [noteInputFocused, markAndNext, goNext, goPrev, onExit, pending, lightboxUrl, lightboxIndex]);

  if (!test) return null;

  const tagList = test.tags ? test.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const priority = test.priority?.toLowerCase() || '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* ① Progress bar — 4px, indigo fill */}
      <div className="h-1 bg-gray-100 shrink-0">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: '#6366F1' }}
        />
      </div>

      {/* ② Header — 0.75rem 1.5rem padding */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #E2E8F0', background: '#fff' }}
      >
        {/* Left: run name + counter */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>{runName}</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#94A3B8' }}>
            {index + 1} / {tests.length}
          </span>
        </div>

        {/* Center: keyboard hints */}
        <div className="hidden md:flex items-center gap-1" style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
          {STATUS_BUTTONS.map((s) => (
            <span key={s.status} className="flex items-center gap-0.5 mr-1">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>
                {s.key}
              </kbd>
              <span style={{ color: '#94A3B8' }}>{s.label}</span>
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 0.5rem', display: 'inline-block' }} />
          {[{ key: 'C', label: 'Comments' }, { key: 'H', label: 'History' }, { key: 'N', label: 'Note' }].map((h) => (
            <span key={h.key} className="flex items-center gap-0.5 mr-1">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>
                {h.key}
              </kbd>
              <span style={{ color: '#94A3B8' }}>{h.label}</span>
            </span>
          ))}
        </div>

        {/* Right: Exit button */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff' }}
        >
          <i className="ri-close-line" /> Exit
          <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace', marginLeft: '0.25rem' }}>
            Esc
          </kbd>
        </button>
      </div>

      {/* ③ TIER 2: Metadata Bar — 40px, #F8FAFC, padding 0.625rem 1.5rem */}
      <div
        className="flex items-center shrink-0 overflow-x-auto"
        style={{ height: 40, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0 1.5rem', gap: '0.75rem' }}
      >
        {/* TC-ID */}
        {test.customId && (
          <>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: '#7C3AED', whiteSpace: 'nowrap' }}>
              {test.customId}
            </span>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>
          </>
        )}

        {/* Folder */}
        {test.folder && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B' }}>
              <i className="ri-folder-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
              {test.folder}
            </span>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>
          </>
        )}

        {/* Priority */}
        {priority && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 600, color: PRIORITY_TEXT_COLOR[priority] || '#64748B' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_DOT[priority] || '#94A3B8', flexShrink: 0, display: 'inline-block' }} />
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
            {(tagList.length > 0 || test.assignee) && <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>}
          </>
        )}

        {/* Tags */}
        {tagList.length > 0 && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', color: '#64748B' }}>
              <i className="ri-price-tag-3-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
              <span className="flex gap-1">
                {tagList.map((tag) => (
                  <span key={tag} style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: '#EEF2FF', color: '#4338CA' }}>
                    {tag}
                  </span>
                ))}
              </span>
            </span>
            {test.assignee && <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>}
          </>
        )}

        {/* Assignee */}
        {test.assignee && (
          <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B' }}>
            <span style={{ width: '1.375rem', height: '1.375rem', borderRadius: '50%', background: '#6366F1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4375rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {test.assignee.substring(0, 2).toUpperCase()}
            </span>
            {test.assignee}
          </span>
        )}
      </div>

      {/* ④ TIER 1: Main Scrollable Body — padding: 2rem 3rem, max-width 720px centered */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto" style={{ padding: '2rem 3rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

          {/* Previously-status badge */}
          {test.runStatus && test.runStatus !== 'untested' && (
            <div
              className="inline-flex items-center gap-1.5 mb-3"
              style={{
                fontSize: '0.75rem', fontWeight: 600,
                padding: '0.25rem 0.625rem', borderRadius: '9999px',
                ...(test.runStatus === 'passed'
                  ? { background: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534' }
                  : test.runStatus === 'failed'
                  ? { background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
                  : { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }),
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: test.runStatus === 'passed' ? '#22C55E' : test.runStatus === 'failed' ? '#EF4444' : '#F59E0B', flexShrink: 0, display: 'inline-block' }} />
              Previously {test.runStatus}
            </div>
          )}

          {/* B. TC Title + Description */}
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem', lineHeight: 1.4 }}>
            {test.title}
          </h1>
          {test.description && (
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              {test.description}
            </p>
          )}

          {/* C. Precondition — #FFFBEB bg, #FDE68A border */}
          {test.precondition && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                <i className="ri-alert-line" style={{ fontSize: '0.875rem' }} />
                Precondition
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#92400E', lineHeight: 1.6 }}>{test.precondition}</p>
            </div>
          )}

          {/* D. Attachments — after precondition, before steps */}
          {test.attachments && test.attachments.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                <i className="ri-attachment-2" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
                Attachments ({test.attachments.length})
              </div>
              <div className="flex flex-wrap" style={{ gap: '0.625rem' }}>
                {test.attachments.map((file, i) => {
                  const isImg = isImageFile(file.name);
                  return isImg ? (
                    <button
                      key={i}
                      onClick={() => openLightbox(file.url)}
                      className="flex-shrink-0 overflow-hidden transition-all"
                      style={{ width: 120, height: 80, borderRadius: '0.5rem', border: '1px solid #E2E8F0', cursor: 'zoom-in', background: '#F1F5F9', padding: 0 }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#A5B4FC';
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ) : (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex flex-col justify-center transition-all"
                      style={{ height: 80, minWidth: 140, borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#F8FAFC', padding: '0.625rem 0.75rem', textDecoration: 'none' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#A5B4FC'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
                    >
                      <div className="flex items-center gap-1" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                        <i className="ri-file-text-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
                        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.125rem' }}>{formatFileSize(file.size)}</div>
                      <div className="flex items-center gap-0.5" style={{ fontSize: '0.6875rem', color: '#6366F1', fontWeight: 600, marginTop: '0.25rem' }}>
                        <i className="ri-download-2-line" style={{ fontSize: '0.75rem' }} />
                        Download
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* E. Test Steps + Expected (connected list design) */}
          {steps.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Test Steps
                </span>
                {passedStepCount > 0 && (
                  <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>{passedStepCount}</span>/{steps.length} passed
                  </span>
                )}
              </div>

              {/* Connected list — no gap, border connection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {steps.map((s, i) => {
                  const result = currentStepResults[i];
                  const isPassed = result === 'passed';
                  const isFailed = result === 'failed';
                  const isFirst = i === 0;
                  const isLast = i === steps.length - 1;
                  const isOnly = steps.length === 1;

                  const rowStyle: React.CSSProperties = {
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    border: '1px solid #E2E8F0',
                    borderTop: isFirst ? '1px solid #E2E8F0' : 'none',
                    borderRadius: isOnly ? '0.5rem' : isFirst ? '0.5rem 0.5rem 0 0' : isLast ? '0 0 0.5rem 0.5rem' : '0',
                    background: isPassed ? '#F0FDF4' : isFailed ? '#FEF2F2' : '#fff',
                    borderColor: isPassed ? '#BBF7D0' : isFailed ? '#FECACA' : '#E2E8F0',
                    position: 'relative',
                  };

                  const numStyle: React.CSSProperties = {
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
                    background: isPassed ? '#22C55E' : isFailed ? '#EF4444' : '#EEF2FF',
                    color: isPassed || isFailed ? '#fff' : '#6366F1',
                  };

                  const isHtml = /<[^>]+>/.test(s.step);

                  return (
                    <div key={i} style={rowStyle}>
                      <div style={numStyle}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isHtml ? (
                          <div
                            style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: s.step }}
                          />
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6 }}>{s.step}</p>
                        )}
                        {s.expectedResult && (
                          <div className="flex items-start gap-1.5" style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.375rem', padding: '0.375rem 0.625rem', lineHeight: 1.5 }}>
                            <i className="ri-checkbox-circle-line shrink-0" style={{ fontSize: '0.875rem', marginTop: '0.125rem' }} />
                            {s.expectedResult}
                          </div>
                        )}
                      </div>
                      {/* Step-level Pass/Fail buttons — 28px (1.75rem), radius 6px */}
                      <div className="flex gap-1 shrink-0" style={{ marginTop: '0.125rem' }}>
                        <button
                          onClick={() => handleStepResult(i, isPassed ? null : 'passed')}
                          title="Pass this step"
                          className="flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                            border: isPassed ? '1px solid #22C55E' : '1px solid #E2E8F0',
                            background: isPassed ? '#22C55E' : '#fff',
                            color: isPassed ? '#fff' : '#94A3B8',
                            fontSize: '0.75rem',
                          }}
                          onMouseEnter={(e) => {
                            if (!isPassed) {
                              (e.currentTarget as HTMLElement).style.background = '#F0FDF4';
                              (e.currentTarget as HTMLElement).style.color = '#16A34A';
                              (e.currentTarget as HTMLElement).style.borderColor = '#86EFAC';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isPassed) {
                              (e.currentTarget as HTMLElement).style.background = '#fff';
                              (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                              (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                            }
                          }}
                        >
                          <i className="ri-check-line" />
                        </button>
                        <button
                          onClick={() => handleStepResult(i, isFailed ? null : 'failed')}
                          title="Fail this step"
                          className="flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem',
                            border: isFailed ? '1px solid #EF4444' : '1px solid #E2E8F0',
                            background: isFailed ? '#EF4444' : '#fff',
                            color: isFailed ? '#fff' : '#94A3B8',
                            fontSize: '0.75rem',
                          }}
                          onMouseEnter={(e) => {
                            if (!isFailed) {
                              (e.currentTarget as HTMLElement).style.background = '#FEF2F2';
                              (e.currentTarget as HTMLElement).style.color = '#DC2626';
                              (e.currentTarget as HTMLElement).style.borderColor = '#FCA5A5';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isFailed) {
                              (e.currentTarget as HTMLElement).style.background = '#fff';
                              (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                              (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                            }
                          }}
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

          {/* F. Overall Expected Result — ALWAYS show if exists (bug fix: remove steps.length===0 guard) */}
          {test.expected_result && (
            <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.5rem' }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4338CA', marginBottom: '0.375rem' }}>
                <i className="ri-checkbox-circle-line" style={{ fontSize: '1rem', color: '#6366F1' }} />
                Expected Result
              </div>
              <p style={{ fontSize: '0.875rem', color: '#312E81', lineHeight: 1.6 }}>{test.expected_result}</p>
            </div>
          )}

          {/* G. Tier 3: Comments panel (collapsible, C key) */}
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={() => setOpenPanel((v) => v === 'comments' ? 'none' : 'comments')}
              className="w-full flex items-center justify-between cursor-pointer transition-all"
              style={{
                padding: '0.625rem 1rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: openPanel === 'comments' ? '0.5rem 0.5rem 0 0' : '0.5rem',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
            >
              <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                <i className="ri-chat-3-line" style={{ fontSize: '1rem', color: '#94A3B8' }} />
                Comments
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '0.0625rem 0.375rem', borderRadius: '9999px' }}>
                  0
                </span>
                <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', marginLeft: '0.25rem' }}>
                  C
                </kbd>
              </div>
              <i
                className="ri-arrow-right-s-line"
                style={{ fontSize: '1rem', color: '#94A3B8', transition: 'transform 0.2s', transform: openPanel === 'comments' ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            </button>
            {openPanel === 'comments' && (
              <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem 0' }}>No comments yet</p>
              </div>
            )}
          </div>

          {/* H. Tier 3: Execution History panel (collapsible, H key) */}
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={() => setOpenPanel((v) => v === 'history' ? 'none' : 'history')}
              className="w-full flex items-center justify-between cursor-pointer transition-all"
              style={{
                padding: '0.625rem 1rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: openPanel === 'history' ? '0.5rem 0.5rem 0 0' : '0.5rem',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
            >
              <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                <i className="ri-history-line" style={{ fontSize: '1rem', color: '#94A3B8' }} />
                Execution History
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '0.0625rem 0.375rem', borderRadius: '9999px' }}>
                  0
                </span>
                <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', marginLeft: '0.25rem' }}>
                  H
                </kbd>
              </div>
              <i
                className="ri-arrow-right-s-line"
                style={{ fontSize: '1rem', color: '#94A3B8', transition: 'transform 0.2s', transform: openPanel === 'history' ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            </button>
            {openPanel === 'history' && (
              <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem 0' }}>No execution history</p>
              </div>
            )}
          </div>

          {/* I. Note input — ALWAYS visible (not toggled) */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.375rem' }}>
              Note <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
            </div>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onFocus={() => setNoteInputFocused(true)}
              onBlur={() => setNoteInputFocused(false)}
              placeholder="Describe what you observed..."
              style={{
                width: '100%', minHeight: '5rem', padding: '0.75rem 1rem',
                border: '1px solid #E2E8F0', borderRadius: '0.5rem',
                fontSize: '0.875rem', fontFamily: 'inherit', color: '#334155',
                resize: 'vertical', outline: 'none', lineHeight: 1.6,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = '#6366F1';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <div style={{ fontSize: '0.6875rem', color: '#94A3B8', marginTop: '0.25rem', textAlign: 'right' }}>
              ⌘ + Enter to save with status
            </div>
          </div>

        </div>
      </div>

      {/* ⑤ Footer — Status Buttons + Nav, justify-center */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#fff', gap: '0.5rem' }}
      >
        {/* Previous */}
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex items-center gap-1 cursor-pointer transition-all"
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', opacity: index === 0 ? 0.4 : 1 }}
        >
          <i className="ri-arrow-left-s-line" style={{ fontSize: '1rem' }} />
          Previous
        </button>

        {/* Status buttons */}
        <div className="flex items-center" style={{ gap: '0.375rem', margin: '0 0.75rem' }}>
          {STATUS_BUTTONS.map((s) => (
            <button
              key={s.status}
              onClick={() => {
                if (s.status === 'failed') {
                  setPending('failed');
                  setTimeout(() => noteRef.current?.focus(), 50);
                } else {
                  markAndNext(s.status);
                }
              }}
              className="flex items-center gap-1.5 cursor-pointer transition-all border-0"
              style={{
                padding: '0.5rem 1.125rem', borderRadius: '0.5rem',
                fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                background: s.bg,
                outline: pending === s.status ? `2px solid ${s.bg}` : 'none',
                outlineOffset: 2,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = s.hoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = s.bg; }}
            >
              <i className={s.icon} />
              {s.label}
              <span style={{ fontSize: '0.6875rem', opacity: 0.7, padding: '0.0625rem 0.25rem', background: 'rgba(255,255,255,0.2)', borderRadius: '0.25rem' }}>
                {s.key}
              </span>
            </button>
          ))}
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={index === tests.length - 1}
          className="flex items-center gap-1 cursor-pointer transition-all"
          style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', opacity: index === tests.length - 1 ? 0.4 : 1 }}
        >
          Next
          <i className="ri-arrow-right-s-line" style={{ fontSize: '1rem' }} />
        </button>
      </div>

      {index === tests.length - 1 && (
        <p className="text-center pb-2" style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '-0.5rem' }}>
          Last test — press any status key to complete the run
        </p>
      )}

      {/* Lightbox — z-60, rgba(0,0,0,0.85) */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 60, background: 'rgba(0,0,0,0.85)', cursor: 'pointer' }}
          onClick={() => setLightboxUrl(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute flex items-center justify-center cursor-pointer"
            style={{ top: '1rem', right: '1rem', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <i className="ri-close-line" />
          </button>

          {/* Prev/Next arrows for multi-image */}
          {imageAttachments.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </>
          )}

          <img
            src={lightboxUrl}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '0.5rem', cursor: 'default' }}
          />
        </div>
      )}
    </div>
  );
}
