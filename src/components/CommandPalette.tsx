import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
  shortcut?: string;
}

interface CommandGroup {
  label: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  onAIGenerate?: () => void;
}

const RECENT_KEY = 'cmdpalette_recent';
const MAX_RECENT = 5;

function saveRecent(item: { id: string; title: string; icon: string; path: string }) {
  try {
    const existing: typeof item[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const filtered = existing.filter((r) => r.id !== item.id);
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...filtered].slice(0, MAX_RECENT)));
  } catch {}
}

function getRecent(): { id: string; title: string; icon: string; path: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function CommandPalette({ open, onClose, projectId, onAIGenerate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [groups, setGroups] = useState<CommandGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const navigateTo = useCallback(
    (path: string, item: { id: string; title: string; icon: string; path: string }) => {
      saveRecent(item);
      navigate(path);
      onClose();
    },
    [navigate, onClose]
  );

  // Build static groups (pages + actions)
  const buildStaticGroups = useCallback((): CommandGroup[] => {
    const pages: CommandItem[] = [
      {
        id: 'page-projects',
        title: 'Projects',
        icon: 'ri-folder-line',
        shortcut: 'G P',
        action: () => navigateTo('/projects', { id: 'page-projects', title: 'Projects', icon: 'ri-folder-line', path: '/projects' }),
      },
      ...(projectId
        ? [
            {
              id: 'page-overview',
              title: 'Overview',
              subtitle: 'Current project',
              icon: 'ri-dashboard-3-line',
              action: () => navigateTo(`/projects/${projectId}`, { id: 'page-overview', title: 'Overview', icon: 'ri-dashboard-3-line', path: `/projects/${projectId}` }),
            },
            {
              id: 'page-testcases',
              title: 'Test Cases',
              subtitle: 'Current project',
              icon: 'ri-file-list-3-line',
              action: () => navigateTo(`/projects/${projectId}/testcases`, { id: 'page-testcases', title: 'Test Cases', icon: 'ri-file-list-3-line', path: `/projects/${projectId}/testcases` }),
            },
            {
              id: 'page-runs',
              title: 'Test Runs',
              subtitle: 'Current project',
              icon: 'ri-play-circle-line',
              action: () => navigateTo(`/projects/${projectId}/runs`, { id: 'page-runs', title: 'Test Runs', icon: 'ri-play-circle-line', path: `/projects/${projectId}/runs` }),
            },
            {
              id: 'page-discovery',
              title: 'Discovery Logs',
              subtitle: 'Current project',
              icon: 'ri-compass-discover-line',
              action: () => navigateTo(`/projects/${projectId}/sessions`, { id: 'page-discovery', title: 'Discovery Logs', icon: 'ri-compass-discover-line', path: `/projects/${projectId}/sessions` }),
            },
            {
              id: 'page-milestones',
              title: 'Milestones',
              subtitle: 'Current project',
              icon: 'ri-flag-2-line',
              action: () => navigateTo(`/projects/${projectId}/milestones`, { id: 'page-milestones', title: 'Milestones', icon: 'ri-flag-2-line', path: `/projects/${projectId}/milestones` }),
            },
          ]
        : []),
      {
        id: 'page-settings',
        title: 'Settings',
        icon: 'ri-settings-3-line',
        action: () => navigateTo('/settings', { id: 'page-settings', title: 'Settings', icon: 'ri-settings-3-line', path: '/settings' }),
      },
    ];

    const actions: CommandItem[] = projectId
      ? [
          {
            id: 'action-new-testcase',
            title: 'New Test Case',
            icon: 'ri-add-circle-line',
            action: () => { navigateTo(`/projects/${projectId}/testcases`, { id: 'action-new-testcase', title: 'New Test Case', icon: 'ri-add-circle-line', path: `/projects/${projectId}/testcases` }); },
          },
          {
            id: 'action-new-run',
            title: 'New Test Run',
            icon: 'ri-play-circle-line',
            action: () => { navigateTo(`/projects/${projectId}/runs`, { id: 'action-new-run', title: 'New Test Run', icon: 'ri-play-circle-line', path: `/projects/${projectId}/runs` }); },
          },
          {
            id: 'action-new-discovery',
            title: 'New Discovery Log',
            icon: 'ri-compass-discover-line',
            action: () => { navigateTo(`/projects/${projectId}/sessions`, { id: 'action-new-discovery', title: 'New Discovery Log', icon: 'ri-compass-discover-line', path: `/projects/${projectId}/sessions` }); },
          },
          {
            id: 'action-new-milestone',
            title: 'New Milestone',
            icon: 'ri-flag-2-line',
            action: () => { navigateTo(`/projects/${projectId}/milestones`, { id: 'action-new-milestone', title: 'New Milestone', icon: 'ri-flag-2-line', path: `/projects/${projectId}/milestones` }); },
          },
        ]
      : [];

    return [
      { label: 'Pages', items: pages },
      ...(actions.length > 0 ? [{ label: 'Actions', items: actions }] : []),
      // AI actions always shown if projectId is present
      ...(projectId && onAIGenerate
        ? [
            {
              label: 'AI',
              items: [
                {
                  id: 'action-ai-generate',
                  title: 'Generate Test Cases with AI',
                  subtitle: 'Describe a feature, AI writes the tests',
                  icon: 'ri-sparkling-2-line',
                  shortcut: '⌘⇧A',
                  action: () => {
                    onAIGenerate?.();
                    onClose();
                  },
                },
              ],
            },
          ]
        : []),
    ];
  }, [projectId, navigateTo]);

  // Search test cases and runs via Supabase
  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setGroups(buildStaticGroups());
        return;
      }

      setLoading(true);
      try {
        const results: CommandGroup[] = [];

        if (projectId) {
          // Search test cases
          const { data: testCases } = await supabase
            .from('test_cases')
            .select('id, title, custom_id')
            .eq('project_id', projectId)
            .ilike('title', `%${q}%`)
            .limit(5);

          if (testCases && testCases.length > 0) {
            results.push({
              label: `Test Cases (${testCases.length})`,
              items: testCases.map((tc) => ({
                id: `tc-${tc.id}`,
                title: tc.title,
                subtitle: tc.custom_id || undefined,
                icon: 'ri-file-list-3-line',
                action: () =>
                  navigateTo(`/projects/${projectId}/testcases`, {
                    id: `tc-${tc.id}`,
                    title: tc.title,
                    icon: 'ri-file-list-3-line',
                    path: `/projects/${projectId}/testcases`,
                  }),
              })),
            });
          }

          // Search test runs
          const { data: runs } = await supabase
            .from('test_runs')
            .select('id, name, status')
            .eq('project_id', projectId)
            .ilike('name', `%${q}%`)
            .limit(5);

          if (runs && runs.length > 0) {
            results.push({
              label: `Test Runs (${runs.length})`,
              items: runs.map((r) => ({
                id: `run-${r.id}`,
                title: r.name,
                subtitle: r.status,
                icon: 'ri-play-circle-line',
                action: () =>
                  navigateTo(`/projects/${projectId}/runs/${r.id}`, {
                    id: `run-${r.id}`,
                    title: r.name,
                    icon: 'ri-play-circle-line',
                    path: `/projects/${projectId}/runs/${r.id}`,
                  }),
              })),
            });
          }
        }

        // Filter static groups by query
        const staticGroups = buildStaticGroups();
        const q_lower = q.toLowerCase();
        for (const group of staticGroups) {
          const filtered = group.items.filter(
            (item) =>
              item.title.toLowerCase().includes(q_lower) ||
              item.subtitle?.toLowerCase().includes(q_lower)
          );
          if (filtered.length > 0) {
            results.push({ label: group.label, items: filtered });
          }
        }

        setGroups(results);
      } catch {
        // Fall back to static on error
        setGroups(buildStaticGroups());
      } finally {
        setLoading(false);
      }
    },
    [projectId, buildStaticGroups, navigateTo]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 150);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);

      // Show recent items when empty
      const recent = getRecent();
      if (recent.length > 0) {
        setGroups([
          {
            label: 'Recent',
            items: recent.map((r) => ({
              id: r.id,
              title: r.title,
              icon: r.icon,
              action: () => navigateTo(r.path, r),
            })),
          },
          ...buildStaticGroups(),
        ]);
      } else {
        setGroups(buildStaticGroups());
      }

      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, buildStaticGroups, navigateTo]);

  // Flat list for keyboard nav
  const flatItems = groups.flatMap((g) => g.items);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flatItems[activeIndex]?.action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, flatItems, activeIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-active="true"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Reset active on query change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{ animation: 'cmdpalette-in 150ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <i className="ri-search-line text-gray-400 text-lg" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tests, runs, actions..."
            className="flex-1 py-3.5 text-base outline-none placeholder:text-gray-400 text-gray-900"
          />
          {loading ? (
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          ) : (
            <kbd className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
              Esc
            </kbd>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {groups.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results for "{query}"
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = flatIndex === activeIndex;
                  const currentIndex = flatIndex;
                  flatIndex++;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setActiveIndex(currentIndex);
                        item.action();
                      }}
                    >
                      <i className={`${item.icon} text-gray-400 text-base w-4`} />
                      <span className="flex-1 text-left truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-gray-400 truncate max-w-[120px]">
                          {item.subtitle}
                        </span>
                      )}
                      {item.shortcut && (
                        <kbd className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-400">
          <span><kbd className="font-mono bg-gray-100 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> open</span>
          <span><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
