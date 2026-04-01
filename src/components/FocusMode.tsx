import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

// ── Design tokens ──────────────────────────────────────────────────────────────

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

// Status icon config for sidebar TC list (22px circles)
const STATUS_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  passed:   { icon: 'ri-check-line',      bg: '#DCFCE7', color: '#16A34A' },
  failed:   { icon: 'ri-close-line',      bg: '#FEE2E2', color: '#DC2626' },
  blocked:  { icon: 'ri-forbid-line',     bg: '#FEF3C7', color: '#D97706' },
  retest:   { icon: 'ri-refresh-line',    bg: '#EDE9FE', color: '#7C3AED' },
  untested: { icon: 'ri-subtract-line',   bg: '#F1F5F9', color: '#94A3B8' },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#94A3B8',
};
const PRIORITY_TEXT_COLOR: Record<string, string> = {
  critical: '#991B1B', high: '#92400E', medium: '#3730A3', low: '#64748B',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSteps(raw?: string, expectedResultRaw?: string): { step: string; expectedResult: string }[] {
  if (!raw) return [];
  const expectedArr = expectedResultRaw ? expectedResultRaw.split('\n').filter(Boolean) : [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s: any, i: number) => ({
        step: s.step || s.action || '',
        // Per-step expectedResult from JSON, with fallback to top-level expected_result line
        expectedResult:
          s.expectedResult || s.expected_result ||
          (expectedArr[i] || '').replace(/^\d+\.\s*/, ''),
      }));
    }
  } catch {}
  // Plain-text steps: zip with lines from top-level expected_result field
  const stepsArr = raw.split('\n').filter(Boolean);
  return stepsArr.map((s, i) => ({
    step: s.replace(/^\d+\.\s*/, ''),
    expectedResult: (expectedArr[i] || '').replace(/^\d+\.\s*/, ''),
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
 * FocusMode — Sidebar + 3-Tier fullscreen test execution.
 *
 * NEW: 280px collapsible sidebar (TC list, progress, filters, search)
 * Tier 1 (Main body):  Precondition → Attachments → Steps w/ P/F buttons → Note
 * Tier 2 (Meta bar):   TC-ID · Folder · Priority · Tags · Assignee (40px fixed bar)
 * Tier 3 (Collapsible): Comments (C key) + Execution History (H key)
 *
 * Keyboard: P/F/B/R/S = status, N = note, C = comments, H = history,
 *           J/K = next/prev, [ = sidebar, / = search, Esc = exit
 */
export function FocusMode({ tests, runName, onStatusChange, onExit, initialIndex = 0 }: FocusModeProps) {
  const [index, setIndex] = useState(initialIndex);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<TestStatus | null>(null);
  const [noteInputFocused, setNoteInputFocused] = useState(false);
  const [stepResults, setStepResults] = useState<Record<string, Record<number, 'passed' | 'failed'>>>({});
  const [openPanel, setOpenPanel] = useState<'none' | 'comments' | 'history'>('none');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [tcComments, setTcComments] = useState<Record<string, { id: string; text: string; author: string; timestamp: Date }[]>>({});
  const [tcHistory, setTcHistory] = useState<Record<string, { id: string; status: string; runName: string; author: string; timestamp: Date; note?: string }[]>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [focusToast, setFocusToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | TestStatus>('all');
  const [sidebarSearch, setSidebarSearch] = useState('');

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const sidebarSearchRef = useRef<HTMLInputElement>(null);
  const tcRefs = useRef<(HTMLDivElement | null)[]>([]);

  const test = tests[index];
  const progress = (index / tests.length) * 100;

  // Parse steps — pass top-level expected_result to zip with plain-text steps
  const steps = parseSteps(test?.steps, test?.expected_result);
  const currentStepResults = stepResults[test?.id] || {};
  const passedStepCount = Object.values(currentStepResults).filter((v) => v === 'passed').length;

  // Image attachments only (for lightbox navigation)
  const imageAttachments = (test?.attachments || []).filter((f) => isImageFile(f.name));

  // Sidebar computed values
  const completedCount = tests.filter(t => t.runStatus && t.runStatus !== 'untested').length;
  const filteredSidebarTests = tests.filter(t => {
    const status = t.runStatus || 'untested';
    if (sidebarFilter !== 'all' && status !== sidebarFilter) return false;
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.customId || '').toLowerCase().includes(q);
    }
    return true;
  });

  const showFocusToast = useCallback((type: 'success' | 'error', message: string) => {
    setFocusToast({ type, message });
    setTimeout(() => setFocusToast(null), type === 'success' ? 3000 : 5000);
  }, []);

  // ── Sidebar auto-scroll to active TC ─────────────────────────────────────
  useEffect(() => {
    tcRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    noteRef.current?.blur();
  }, [index]);

  // ── Navigation reset ──────────────────────────────────────────────────────
  const resetForNavigation = useCallback(() => {
    setOpenPanel('none');
    setNote('');
    setLightboxUrl(null);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, []);

  // ── Supabase data fetchers ────────────────────────────────────────────────
  const fetchComments = useCallback(async (tcId: string) => {
    if (tcComments[tcId] !== undefined) return;
    setLoadingComments(true);
    try {
      const { data } = await supabase
        .from('test_case_comments')
        .select(`id, comment, created_at, user_id, profiles:user_id (email, full_name)`)
        .eq('test_case_id', tcId)
        .order('created_at', { ascending: false });
      setTcComments((prev) => ({
        ...prev,
        [tcId]: (data || []).map((item: any) => ({
          id: item.id,
          text: item.comment,
          author: item.profiles?.full_name || item.profiles?.email || 'Unknown',
          timestamp: new Date(item.created_at),
        })),
      }));
    } catch {
      setTcComments((prev) => ({ ...prev, [tcId]: [] }));
    } finally {
      setLoadingComments(false);
    }
  }, [tcComments]);

  const fetchHistory = useCallback(async (tcId: string) => {
    if (tcHistory[tcId] !== undefined) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('test_results')
        .select(`id, status, note, author, created_at, run:runs(id, name)`)
        .eq('test_case_id', tcId)
        .order('created_at', { ascending: false })
        .limit(10);
      setTcHistory((prev) => ({
        ...prev,
        [tcId]: (data || []).map((item: any) => ({
          id: item.id,
          status: item.status,
          runName: item.run?.name || 'Unknown Run',
          author: item.author || '',
          timestamp: new Date(item.created_at),
          note: item.note || '',
        })),
      }));
    } catch {
      setTcHistory((prev) => ({ ...prev, [tcId]: [] }));
    } finally {
      setLoadingHistory(false);
    }
  }, [tcHistory]);

  // Auto-load when panel opens
  useEffect(() => {
    if (!test?.id) return;
    if (openPanel === 'comments') fetchComments(test.id);
    if (openPanel === 'history') fetchHistory(test.id);
  }, [openPanel, test?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  const markAndNext = useCallback(
    async (status: TestStatus) => {
      if (!test) return;
      setPending(status);
      try {
        await onStatusChange(test.id, status, note.trim() || undefined);
      } catch (err) {
        console.error('[FocusMode] Status change failed:', err);
        showFocusToast('error', err instanceof Error ? err.message : 'Failed to save result. Please try again.');
        setPending(null);
        return; // 실패 시 다음 TC로 이동하지 않음
      }
      setPending(null);
      resetForNavigation();
      setTimeout(() => {
        setIndex((i) => Math.min(i + 1, tests.length - 1));
      }, 300);
    },
    [test, note, onStatusChange, tests.length, resetForNavigation, showFocusToast]
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
      if (lightboxUrl) {
        if (e.key === 'Escape') { setLightboxUrl(null); return; }
        if (e.key === 'ArrowLeft') { lightboxPrev(); return; }
        if (e.key === 'ArrowRight') { lightboxNext(); return; }
        return;
      }

      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (pending) markAndNext(pending);
        }
        if (e.key === 'Escape') {
          // If search has text, clear it first; otherwise blur
          if (document.activeElement === sidebarSearchRef.current && sidebarSearch) {
            setSidebarSearch('');
          } else {
            (document.activeElement as HTMLElement).blur();
            setNoteInputFocused(false);
          }
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
        case '[':
          e.preventDefault();
          setSidebarOpen(v => !v);
          break;
        case '/':
          e.preventDefault();
          if (!sidebarOpen) setSidebarOpen(true);
          setTimeout(() => sidebarSearchRef.current?.focus(), 50);
          break;
        case 'j':
        case 'arrowright': e.preventDefault(); goNext(); break;
        case 'k':
        case 'arrowleft': e.preventDefault(); goPrev(); break;
        case 'escape':
          e.preventDefault();
          if (pending) {
            // 저장 후 종료 (confirm 대신 자동 저장 + 토스트)
            markAndNext(pending).then(() => onExit());
            break;
          }
          onExit();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [noteInputFocused, markAndNext, goNext, goPrev, onExit, pending, lightboxUrl, lightboxIndex, sidebarOpen, sidebarSearch]);

  if (!test) return null;

  const tagList = test.tags ? test.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const priority = test.priority?.toLowerCase() || '';

  // ── Sidebar filter chip config ──────────────────────────────────────────
  const FILTER_CHIPS: { key: string; label: string; dot: string | null }[] = [
    { key: 'all',      label: 'All',      dot: null      },
    { key: 'passed',   label: 'Passed',   dot: '#22C55E' },
    { key: 'failed',   label: 'Failed',   dot: '#EF4444' },
    { key: 'blocked',  label: 'Blocked',  dot: '#F59E0B' },
    { key: 'retest',   label: 'Retest',   dot: '#8B5CF6' },
    { key: 'untested', label: 'Untested', dot: '#94A3B8' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* FocusMode Toast */}
      {focusToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium"
          style={{
            background: focusToast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            borderColor: focusToast.type === 'success' ? '#BBF7D0' : '#FECACA',
            color: focusToast.type === 'success' ? '#15803D' : '#DC2626',
          }}
        >
          <i className={focusToast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} />
          {focusToast.message}
          <button onClick={() => setFocusToast(null)} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer">×</button>
        </div>
      )}

      {/* ① Progress bar — 4px, indigo fill */}
      <div className="h-1 bg-gray-100 shrink-0">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: '#6366F1' }}
        />
      </div>

      {/* ② Header — run name + counter + ALL kbd hints + Exit */}
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

        {/* Center: ALL keyboard hints */}
        <div className="hidden md:flex items-center" style={{ gap: '0.375rem', fontSize: '0.6875rem', color: '#94A3B8' }}>
          {STATUS_BUTTONS.map((s) => (
            <span key={s.status} className="flex items-center gap-0.5">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>{s.key}</kbd>
              <span style={{ color: '#94A3B8', marginRight: '0.25rem' }}>{s.label}</span>
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 0.375rem', display: 'inline-block' }} />
          {[{ key: 'C', label: 'Comments' }, { key: 'H', label: 'History' }, { key: 'N', label: 'Note' }].map((h) => (
            <span key={h.key} className="flex items-center gap-0.5">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>{h.key}</kbd>
              <span style={{ color: '#94A3B8', marginRight: '0.25rem' }}>{h.label}</span>
            </span>
          ))}
          <span style={{ width: 1, height: 16, background: '#E2E8F0', margin: '0 0.375rem', display: 'inline-block' }} />
          {[{ key: '[', label: 'Sidebar' }, { key: '/', label: 'Search' }].map((h) => (
            <span key={h.key} className="flex items-center gap-0.5">
              <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace' }}>{h.key}</kbd>
              <span style={{ color: '#94A3B8', marginRight: '0.25rem' }}>{h.label}</span>
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
          <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', padding: '0 0.25rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.625rem', fontWeight: 700, fontFamily: 'monospace', marginLeft: '0.25rem' }}>Esc</kbd>
        </button>
      </div>

      {/* ③ TIER 2: Metadata Bar — 40px, #F8FAFC */}
      <div
        className="flex items-center shrink-0 overflow-x-auto"
        style={{ height: 40, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0 1.5rem', gap: '0.75rem' }}
      >
        {test.customId && (
          <>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600, color: '#7C3AED', whiteSpace: 'nowrap' }}>{test.customId}</span>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>
          </>
        )}
        {test.folder && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B' }}>
              <i className="ri-folder-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />{test.folder}
            </span>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>
          </>
        )}
        {priority && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 600, color: PRIORITY_TEXT_COLOR[priority] || '#64748B' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_DOT[priority] || '#94A3B8', flexShrink: 0, display: 'inline-block' }} />
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
            {(tagList.length > 0 || test.assignee) && <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>}
          </>
        )}
        {tagList.length > 0 && (
          <>
            <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', color: '#64748B' }}>
              <i className="ri-price-tag-3-line" style={{ fontSize: '0.875rem', color: '#94A3B8' }} />
              <span className="flex gap-1">
                {tagList.map((tag) => (
                  <span key={tag} style={{ fontSize: '0.6875rem', fontWeight: 500, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', background: '#EEF2FF', color: '#4338CA' }}>{tag}</span>
                ))}
              </span>
            </span>
            {test.assignee && <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>·</span>}
          </>
        )}
        {test.assignee && (
          <span className="flex items-center gap-1 shrink-0" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B' }}>
            <span style={{ width: '1.375rem', height: '1.375rem', borderRadius: '50%', background: '#6366F1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4375rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {test.assignee.substring(0, 2).toUpperCase()}
            </span>
            {test.assignee}
          </span>
        )}
      </div>

      {/* ④ Focus layout: Sidebar + Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── SIDEBAR (280px collapsible) ── */}
        <div
          style={{
            width: sidebarOpen ? 280 : 0,
            minWidth: 0,
            background: '#FAFBFC',
            borderRight: sidebarOpen ? '1px solid #E2E8F0' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            position: 'relative',
          }}
        >
          {/* Sidebar inner — fixed 280px width so content doesn't reflow during animation */}
          <div style={{ width: 280, display: 'flex', flexDirection: 'column', height: '100%', opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: sidebarOpen ? 'auto' : 'none' }}>

            {/* Progress */}
            <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8' }}>Progress</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  <span style={{ color: '#6366F1' }}>{completedCount}</span>
                  <span style={{ color: '#94A3B8', fontWeight: 500 }}> / {tests.length} completed</span>
                </span>
              </div>
              {/* 5-color segment bar */}
              <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                {[
                  { status: 'passed',   color: '#22C55E' },
                  { status: 'failed',   color: '#EF4444' },
                  { status: 'blocked',  color: '#F59E0B' },
                  { status: 'retest',   color: '#8B5CF6' },
                  { status: 'untested', color: '#E2E8F0' },
                ].map(seg => {
                  const count = tests.filter(t => (t.runStatus || 'untested') === seg.status).length;
                  const pct = tests.length ? (count / tests.length) * 100 : 0;
                  return pct > 0 ? (
                    <div key={seg.status} style={{ width: `${pct}%`, background: seg.color, height: '100%', transition: 'width 0.4s ease', flexShrink: 0 }} />
                  ) : null;
                })}
              </div>
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0, flexWrap: 'wrap' }}>
              {FILTER_CHIPS.map(chip => {
                const isActive = sidebarFilter === chip.key;
                const count = chip.key === 'all'
                  ? tests.length
                  : tests.filter(t => (t.runStatus || 'untested') === chip.key).length;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setSidebarFilter(chip.key as 'all' | TestStatus)}
                    style={{
                      fontSize: '0.625rem', fontWeight: 600, padding: '0.1875rem 0.5rem', borderRadius: '9999px',
                      border: `1px solid ${isActive ? '#6366F1' : '#E2E8F0'}`,
                      background: isActive ? '#6366F1' : '#fff',
                      color: isActive ? '#fff' : '#64748B',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {chip.dot && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'rgba(255,255,255,0.5)' : chip.dot, display: 'inline-block', flexShrink: 0 }} />
                    )}
                    {chip.label}
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, opacity: 0.8 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '0.375rem', padding: '0.3125rem 0.5rem' }}>
                <i className="ri-search-line" style={{ fontSize: '0.8125rem', color: '#94A3B8', flexShrink: 0 }} />
                <input
                  ref={sidebarSearchRef}
                  type="text"
                  placeholder="Search TC..."
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  onFocus={() => setNoteInputFocused(true)}
                  onBlur={() => setNoteInputFocused(false)}
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.75rem', color: '#1E293B', fontFamily: 'inherit', flex: 1, minWidth: 0 }}
                />
                <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', padding: '0 0.2rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '0.25rem', fontSize: '0.5rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', flexShrink: 0 }}>/</kbd>
              </div>
            </div>

            {/* TC list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
              {filteredSidebarTests.map((t) => {
                const tcIndex = tests.indexOf(t);
                const isActive = tcIndex === index;
                const status = t.runStatus || 'untested';
                const icon = STATUS_ICON[status];
                return (
                  <div
                    key={t.id}
                    ref={el => { tcRefs.current[tcIndex] = el; }}
                    onClick={() => { resetForNavigation(); setIndex(tcIndex); }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                      padding: '0.5rem 0.75rem', margin: '0.0625rem 0.375rem',
                      borderRadius: '0.5rem', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? '#C7D2FE' : 'transparent'}`,
                      background: isActive ? '#EEF2FF' : 'transparent',
                      minHeight: 48, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* 22px status circle */}
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', flexShrink: 0, marginTop: '0.0625rem', background: icon.bg, color: icon.color }}>
                      <i className={icon.icon} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: isActive ? '#818CF8' : '#94A3B8', fontWeight: 500, lineHeight: 1.2 }}>
                        {t.customId || `TC-${String(tcIndex + 1).padStart(3, '0')}`}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: isActive ? '#4338CA' : '#334155', fontWeight: isActive ? 600 : 400, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredSidebarTests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.8125rem', color: '#94A3B8' }}>
                  No test cases match
                </div>
              )}
            </div>
          </div>

          {/* Sidebar toggle handle (24×56px, right edge) */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              position: 'absolute', top: '50%', right: -12, transform: 'translateY(-50%)',
              width: 24, height: 56, borderRadius: '0 8px 8px 0',
              background: '#fff', border: '1px solid #E2E8F0', borderLeft: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10,
              boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
          >
            <i
              className="ri-arrow-left-s-line"
              style={{ fontSize: '0.875rem', color: '#94A3B8', transition: 'transform 0.25s', transform: sidebarOpen ? 'none' : 'rotate(180deg)' }}
            />
          </button>
        </div>

        {/* Collapsed-tab: appears when sidebar is closed, at left edge of body */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 56, borderRadius: '0 8px 8px 0',
              background: '#fff', border: '1px solid #E2E8F0', borderLeft: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 20,
              boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; (e.currentTarget as HTMLElement).style.width = '20px'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.width = '16px'; }}
            title="Open sidebar ([)"
          >
            <i className="ri-arrow-right-s-line" style={{ fontSize: '0.875rem', color: '#6366F1' }} />
          </button>
        )}

        {/* ── Body + Footer (flex column, fills remaining space) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* TIER 1: Main scrollable body — padding: 2rem 3rem, max-width 720px */}
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

              {/* TC Title + Description */}
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                {test.title}
              </h1>
              {test.description && (
                <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {test.description}
                </p>
              )}

              {/* Precondition */}
              {test.precondition && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
                  <div className="flex items-center gap-1.5" style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                    <i className="ri-alert-line" style={{ fontSize: '0.875rem' }} />
                    Precondition
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#92400E', lineHeight: 1.6 }}>{test.precondition}</p>
                </div>
              )}

              {/* Attachments */}
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

              {/* Test Steps with step-level Pass/Fail (4-state) */}
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {steps.map((s, i) => {
                      const result = currentStepResults[i];
                      const isPassed = result === 'passed';
                      const isFailed = result === 'failed';
                      const isFirst = i === 0;
                      const isLast = i === steps.length - 1;
                      const isOnly = steps.length === 1;

                      const rowStyle: React.CSSProperties = {
                        display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem',
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
                              <div className="flex items-start gap-1" style={{ marginTop: '0.375rem' }}>
                                <i className="ri-checkbox-circle-line flex-shrink-0" style={{ fontSize: '0.875rem', color: '#22C55E', marginTop: '0.125rem' }} />
                                <p style={{ fontSize: '0.875rem', color: '#16A34A', lineHeight: 1.6 }}>
                                  {s.expectedResult.replace(/<[^>]*>/g, '').trim()}
                                </p>
                              </div>
                            )}
                          </div>
                          {/* Step-level Pass/Fail buttons — 4-state toggle */}
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

              {/* TIER 3: Comments panel (collapsible, C key) */}
              {(() => {
                const comments = tcComments[test.id] || [];
                const commentCount = tcComments[test.id]?.length ?? 0;
                const isOpen = openPanel === 'comments';
                return (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => setOpenPanel((v) => v === 'comments' ? 'none' : 'comments')}
                      className="w-full flex items-center justify-between cursor-pointer transition-all"
                      style={{ padding: '0.625rem 1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: isOpen ? '0.5rem 0.5rem 0 0' : '0.5rem', textAlign: 'left' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    >
                      <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                        <i className="ri-chat-3-line" style={{ fontSize: '1rem', color: '#94A3B8' }} />
                        Comments
                        {tcComments[test.id] !== undefined && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '0.0625rem 0.375rem', borderRadius: '9999px' }}>{commentCount}</span>
                        )}
                        <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', marginLeft: '0.25rem' }}>C</kbd>
                      </div>
                      <i className="ri-arrow-right-s-line" style={{ fontSize: '1rem', color: '#94A3B8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </button>
                    {isOpen && (
                      <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                        {loadingComments ? (
                          <div className="flex items-center justify-center gap-2" style={{ padding: '0.5rem 0', fontSize: '0.8125rem', color: '#94A3B8' }}>
                            <i className="ri-loader-4-line animate-spin" />Loading...
                          </div>
                        ) : comments.length === 0 ? (
                          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem 0' }}>No comments yet</p>
                        ) : (
                          comments.map((c) => {
                            const initials = c.author.substring(0, 2).toUpperCase();
                            const diff = Date.now() - c.timestamp.getTime();
                            const d = Math.floor(diff / 86400000);
                            const relTime = d === 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`;
                            return (
                              <div key={c.id} style={{ background: '#F8FAFC', borderRadius: '0.375rem', padding: '0.625rem 0.75rem', marginBottom: '0.5rem' }}>
                                <div className="flex items-center gap-1.5" style={{ marginBottom: '0.25rem' }}>
                                  <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4375rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4338CA' }}>{c.author}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>· {relTime}</span>
                                </div>
                                <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>{c.text}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TIER 3: Execution History panel (collapsible, H key) */}
              {(() => {
                const history = tcHistory[test.id] || [];
                const historyCount = tcHistory[test.id]?.length ?? 0;
                const isOpen = openPanel === 'history';
                const statusStyle = (s: string): React.CSSProperties => {
                  if (s === 'passed')  return { background: '#F0FDF4', color: '#166534' };
                  if (s === 'failed')  return { background: '#FEF2F2', color: '#991B1B' };
                  if (s === 'blocked') return { background: '#FFFBEB', color: '#92400E' };
                  if (s === 'retest')  return { background: '#F5F3FF', color: '#5B21B6' };
                  return { background: '#F8FAFC', color: '#64748B' };
                };
                const statusDot = (s: string) => ({ passed: '#22C55E', failed: '#EF4444', blocked: '#F59E0B', retest: '#8B5CF6' }[s] || '#94A3B8');
                return (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => setOpenPanel((v) => v === 'history' ? 'none' : 'history')}
                      className="w-full flex items-center justify-between cursor-pointer transition-all"
                      style={{ padding: '0.625rem 1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: isOpen ? '0.5rem 0.5rem 0 0' : '0.5rem', textAlign: 'left' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    >
                      <div className="flex items-center gap-1.5" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                        <i className="ri-history-line" style={{ fontSize: '1rem', color: '#94A3B8' }} />
                        Execution History
                        {tcHistory[test.id] !== undefined && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#F1F5F9', color: '#64748B', padding: '0.0625rem 0.375rem', borderRadius: '9999px' }}>{historyCount}</span>
                        )}
                        <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1rem', height: '1rem', background: '#E2E8F0', border: '1px solid #CBD5E1', borderRadius: '0.25rem', fontSize: '0.5625rem', fontWeight: 700, fontFamily: 'monospace', color: '#64748B', marginLeft: '0.25rem' }}>H</kbd>
                      </div>
                      <i className="ri-arrow-right-s-line" style={{ fontSize: '1rem', color: '#94A3B8', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </button>
                    {isOpen && (
                      <div style={{ border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                        {loadingHistory ? (
                          <div className="flex items-center justify-center gap-2" style={{ padding: '0.5rem 0', fontSize: '0.8125rem', color: '#94A3B8' }}>
                            <i className="ri-loader-4-line animate-spin" />Loading...
                          </div>
                        ) : history.length === 0 ? (
                          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center', padding: '0.5rem 0' }}>No execution history</p>
                        ) : (
                          history.map((h) => {
                            const diff = Date.now() - h.timestamp.getTime();
                            const d = Math.floor(diff / 86400000);
                            const relTime = d === 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`;
                            return (
                              <div key={h.id} className="flex items-start gap-2.5" style={{ padding: '0.5rem 0', borderBottom: '1px solid #F1F5F9' }}>
                                <div className="inline-flex items-center gap-1 whitespace-nowrap" style={{ ...statusStyle(h.status), fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', flexShrink: 0 }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusDot(h.status), display: 'inline-block' }} />
                                  {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#475569' }}>{h.runName}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{relTime}{h.author ? ` · by ${h.author}` : ''}</div>
                                  {h.note && <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', marginTop: '0.125rem', paddingLeft: '0.25rem' }}>"{h.note}"</div>}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Note input */}
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

          {/* ⑤ Footer — Status Buttons + Nav */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #E2E8F0', background: '#fff', gap: '0.5rem' }}
          >
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex items-center gap-1 cursor-pointer transition-all"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', opacity: index === 0 ? 0.4 : 1 }}
            >
              <i className="ri-arrow-left-s-line" style={{ fontSize: '1rem' }} />Previous
            </button>

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
                  <span style={{ fontSize: '0.6875rem', opacity: 0.7, padding: '0.0625rem 0.25rem', background: 'rgba(255,255,255,0.2)', borderRadius: '0.25rem' }}>{s.key}</span>
                </button>
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={index === tests.length - 1}
              className="flex items-center gap-1 cursor-pointer transition-all"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748B', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', background: '#fff', opacity: index === tests.length - 1 ? 0.4 : 1 }}
            >
              Next<i className="ri-arrow-right-s-line" style={{ fontSize: '1rem' }} />
            </button>
          </div>

          {index === tests.length - 1 && (
            <p className="text-center pb-2" style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '-0.5rem' }}>
              Last test — press any status key to complete the run
            </p>
          )}

        </div>{/* end body+footer column */}
      </div>{/* end focus layout */}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 60, background: 'rgba(0,0,0,0.85)', cursor: 'pointer' }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute flex items-center justify-center cursor-pointer"
            style={{ top: '1rem', right: '1rem', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: '1.25rem' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <i className="ri-close-line" />
          </button>
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
