import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

type OS = 'mac' | 'win';
type TabId = 'all' | 'current' | 'global' | 'navigation' | 'focus' | 'editing';

interface Shortcut {
  label: string;
  keys: string[];
  chord?: boolean; // sequential keystrokes (G then T)
  single?: boolean; // single-key, dimmed when toggle is off
}

interface Group {
  id: Exclude<TabId, 'all' | 'current'>;
  title: string;
  shortcuts: Shortcut[];
}

function detectOS(): OS {
  return /Mac|iPhone|iPod|iPad/.test(navigator.platform) ? 'mac' : 'win';
}

function displayKey(key: string, os: OS): string {
  if (os === 'mac') {
    const map: Record<string, string> = {
      Cmd: '⌘', Shift: '⇧', Alt: '⌥', Enter: '↵', Backspace: '⌫',
    };
    return map[key] || key;
  }
  const map: Record<string, string> = { Cmd: 'Ctrl' };
  return map[key] || key;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-px">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const GROUPS: Group[] = [
  {
    id: 'global',
    title: 'Global',
    shortcuts: [
      { label: 'Open Command Palette', keys: ['Cmd', 'K'] },
      { label: 'Show keyboard shortcuts', keys: ['?'], single: true },
      { label: 'Go to Test Cases', keys: ['G', 'T'], chord: true },
      { label: 'Go to Runs', keys: ['G', 'R'], chord: true },
      { label: 'Go to Exploratory', keys: ['G', 'D'], chord: true },
      { label: 'Go to Milestones', keys: ['G', 'M'], chord: true },
      { label: 'Go to Projects', keys: ['G', 'P'], chord: true },
      { label: 'Enter Focus Mode', keys: ['Cmd', 'Shift', 'F'] },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    shortcuts: [
      { label: 'Navigate items', keys: ['↑', '↓'], single: true },
      { label: 'Navigate items (vim)', keys: ['J / K'], single: true },
      { label: 'Open / expand item', keys: ['Enter'] },
      { label: 'Close / deselect', keys: ['Esc'] },
      { label: 'Toggle checkbox', keys: ['Space'], single: true },
      { label: 'Select all visible', keys: ['Cmd', 'A'] },
      { label: 'Extend selection', keys: ['Shift', '↑/↓'] },
    ],
  },
  {
    id: 'focus',
    title: 'Focus Mode',
    shortcuts: [
      { label: 'Mark Passed + advance', keys: ['P'], single: true },
      { label: 'Mark Failed + advance', keys: ['F'], single: true },
      { label: 'Mark Blocked + advance', keys: ['B'], single: true },
      { label: 'Mark Retest + advance', keys: ['R'], single: true },
      { label: 'Skip (Untested) + advance', keys: ['S'], single: true },
      { label: 'Add note to current test', keys: ['N'], single: true },
      { label: 'Previous test', keys: ['← / K'], single: true },
      { label: 'Next test', keys: ['→ / J'], single: true },
      { label: 'Exit Focus Mode', keys: ['Esc'] },
    ],
  },
  {
    id: 'editing',
    title: 'Editing',
    shortcuts: [
      { label: 'New Test Case', keys: ['N'], single: true },
      { label: 'Edit selected', keys: ['E'], single: true },
      { label: 'Delete selected', keys: ['Delete'] },
    ],
  },
];

const CONTEXT_SHORTCUTS: {
  pattern: RegExp;
  title: string;
  shortcuts: Shortcut[];
}[] = [
  {
    pattern: /\/testcases/,
    title: 'Test Cases',
    shortcuts: [
      { label: 'New Test Case', keys: ['N'], single: true },
      { label: 'Edit selected', keys: ['E'], single: true },
      { label: 'Delete selected', keys: ['Delete'] },
      { label: 'Navigate items', keys: ['↑', '↓'], single: true },
      { label: 'Toggle checkbox', keys: ['Space'], single: true },
      { label: 'Select all visible', keys: ['Cmd', 'A'] },
      { label: 'Enter Focus Mode', keys: ['Cmd', 'Shift', 'F'] },
    ],
  },
  {
    pattern: /\/runs\/[^/]+/,
    title: 'Run Detail',
    shortcuts: [
      { label: 'Navigate items', keys: ['↑', '↓'], single: true },
      { label: 'Open / expand item', keys: ['Enter'] },
      { label: 'Enter Focus Mode', keys: ['Cmd', 'Shift', 'F'] },
    ],
  },
  {
    pattern: /\/runs/,
    title: 'Runs',
    shortcuts: [
      { label: 'Navigate items', keys: ['↑', '↓'], single: true },
      { label: 'Open / expand item', keys: ['Enter'] },
    ],
  },
  {
    pattern: /\/milestones/,
    title: 'Milestones',
    shortcuts: [
      { label: 'Navigate items', keys: ['↑', '↓'], single: true },
      { label: 'Open / expand item', keys: ['Enter'] },
    ],
  },
  {
    pattern: /\/discovery-logs|\/sessions/,
    title: 'Exploratory',
    shortcuts: [
      { label: 'Navigate items', keys: ['↑', '↓'], single: true },
      { label: 'Open / expand item', keys: ['Enter'] },
    ],
  },
];

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'current', label: 'Current Page' },
  { id: 'global', label: 'Global' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'focus', label: 'Focus Mode' },
  { id: 'editing', label: 'Editing' },
];

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const location = useLocation();
  const [os, setOs] = useState<OS>(detectOS);
  const [singleKeyEnabled, setSingleKeyEnabled] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  const currentContext = useMemo(
    () => CONTEXT_SHORTCUTS.find(ctx => ctx.pattern.test(location.pathname)) ?? null,
    [location.pathname],
  );

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveTab('all');
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handle, true);
    return () => document.removeEventListener('keydown', handle, true);
  }, [open, onClose]);

  const filteredGroups = useMemo(() => {
    let groups: { title: string; shortcuts: Shortcut[] }[];

    if (activeTab === 'current') {
      groups = currentContext
        ? [{ title: currentContext.title, shortcuts: currentContext.shortcuts }]
        : [];
    } else if (activeTab !== 'all') {
      const g = GROUPS.find(g => g.id === activeTab);
      groups = g ? [{ title: g.title, shortcuts: g.shortcuts }] : [];
    } else {
      groups = [];
      if (currentContext) {
        groups.push({
          title: `Current Page — ${currentContext.title}`,
          shortcuts: currentContext.shortcuts,
        });
      }
      GROUPS.forEach(g => groups.push({ title: g.title, shortcuts: g.shortcuts }));
    }

    if (!search) return groups;
    const q = search.toLowerCase();
    return groups
      .map(g => ({
        ...g,
        shortcuts: g.shortcuts.filter(
          s =>
            s.label.toLowerCase().includes(q) ||
            s.keys.some(k => k.toLowerCase().includes(q)),
        ),
      }))
      .filter(g => g.shortcuts.length > 0);
  }, [activeTab, search, currentContext]);

  if (!open) return null;

  const renderKeys = (sc: Shortcut) => (
    <div className="flex items-center gap-1 shrink-0">
      {sc.keys.map((key, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="text-gray-300 text-[10px] font-medium">
              {sc.chord ? 'then' : '+'}
            </span>
          )}
          <kbd className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 bg-white border border-gray-200 rounded text-[11px] font-mono text-gray-600 shadow-[0_1px_0_0_#d1d5db]">
            {displayKey(key, os)}
          </kbd>
        </span>
      ))}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes ks-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ks-slide { from { opacity: 0; transform: translateY(10px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .ks-overlay { animation: ks-fade 0.15s ease }
        .ks-modal { animation: ks-slide 0.18s ease }
      `}</style>

      <div
        className="ks-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        <div
          className="ks-modal relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full flex flex-col overflow-hidden"
          style={{ maxWidth: '520px', maxHeight: '72vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <i className="ri-keyboard-line text-indigo-600 text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-xs text-gray-500">Navigate Testably at the speed of thought</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3 flex-shrink-0">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search shortcuts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Tabs */}
          {!search && (
            <div className="px-5 pb-3 flex items-center gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
              {TABS.map(tab => {
                const disabled = tab.id === 'current' && !currentContext;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !disabled && setActiveTab(tab.id)}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : disabled
                        ? 'text-gray-300 cursor-default'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Shortcuts list */}
          <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                {search ? 'No shortcuts match your search.' : 'No shortcuts available for this page.'}
              </div>
            ) : (
              filteredGroups.map((group, gi) => (
                <div key={gi}>
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {group.title}
                  </h3>
                  <div className="space-y-0.5">
                    {group.shortcuts.map((sc, si) => {
                      const dimmed = sc.single && !singleKeyEnabled;
                      return (
                        <div
                          key={si}
                          className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg transition-all ${
                            dimmed ? 'opacity-25' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-sm text-gray-700 min-w-0">
                            <Highlight text={sc.label} query={search} />
                          </span>
                          {renderKeys(sc)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80 rounded-b-xl flex items-center gap-2 flex-shrink-0">
            {/* Single-key toggle */}
            <button
              onClick={() => setSingleKeyEnabled(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors font-medium ${
                singleKeyEnabled
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <i className={`ri-toggle-${singleKeyEnabled ? 'line' : 'fill'} text-sm`} />
              Single-key
            </button>

            {/* OS toggle */}
            <button
              onClick={() => setOs(o => (o === 'mac' ? 'win' : 'mac'))}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-white text-gray-500 border-gray-200 hover:bg-gray-50 transition-colors font-medium"
            >
              <i className={`ri-${os === 'mac' ? 'apple' : 'windows'}-line text-sm`} />
              {os === 'mac' ? 'macOS' : 'Windows'}
            </button>

            <span className="flex-1" />

            <p className="text-xs text-gray-400">
              Press{' '}
              <kbd className="font-mono bg-white border border-gray-200 px-1 rounded text-[11px]">Esc</kbd>{' '}
              to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
