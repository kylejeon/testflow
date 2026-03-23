interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    label: 'Global',
    shortcuts: [
      { keys: ['⌘', 'K'], label: 'Open Command Palette' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['G', 'T'], label: 'Go to Test Cases' },
      { keys: ['G', 'R'], label: 'Go to Test Runs' },
      { keys: ['G', 'D'], label: 'Go to Discovery Logs' },
      { keys: ['G', 'M'], label: 'Go to Milestones' },
      { keys: ['⌘', '⇧', 'F'], label: 'Enter Focus Mode' },
    ],
  },
  {
    label: 'List Navigation',
    shortcuts: [
      { keys: ['↑', '↓'], label: 'Navigate items' },
      { keys: ['↵'], label: 'Open / expand item' },
      { keys: ['Esc'], label: 'Close / deselect' },
      { keys: ['Space'], label: 'Toggle checkbox' },
      { keys: ['⌘', 'A'], label: 'Select all visible' },
      { keys: ['⇧', '↑↓'], label: 'Extend selection' },
    ],
  },
  {
    label: 'Focus Mode (Test Execution)',
    shortcuts: [
      { keys: ['P'], label: 'Mark Passed + advance' },
      { keys: ['F'], label: 'Mark Failed + advance' },
      { keys: ['B'], label: 'Mark Blocked + advance' },
      { keys: ['R'], label: 'Mark Retest + advance' },
      { keys: ['S'], label: 'Skip (Untested) + advance' },
      { keys: ['N'], label: 'Add note to current test' },
      { keys: ['←', 'K'], label: 'Previous test' },
      { keys: ['→', 'J'], label: 'Next test' },
      { keys: ['Esc'], label: 'Exit Focus Mode' },
    ],
  },
];

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <p className="text-sm text-gray-500 mt-0.5">Navigate Testably at the speed of thought</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map(({ keys, label }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700">{label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-300 text-xs">+</span>}
                          <kbd className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600 shadow-sm">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-400 text-center">
            Press <kbd className="font-mono bg-white border border-gray-200 px-1 rounded">?</kbd> anywhere to open this panel ·{' '}
            <kbd className="font-mono bg-white border border-gray-200 px-1 rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
