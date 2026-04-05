import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center px-2 py-0.5 font-mono text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-[0_1px_0_#d1d5db] leading-relaxed whitespace-nowrap">
      {children}
    </kbd>
  );
}

function KbdCombo({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <Kbd>{key}</Kbd>
          {i < keys.length - 1 && <span className="text-xs text-gray-400 font-normal">+</span>}
        </span>
      ))}
    </span>
  );
}

function KbdChord({ first, second }: { first: string; second: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Kbd>{first}</Kbd>
      <span className="text-xs text-gray-400">→</span>
      <Kbd>{second}</Kbd>
    </span>
  );
}

interface ShortcutRow {
  keys: React.ReactNode;
  action: string;
  desc: string;
}

function ShortcutTable({ rows }: { rows: ShortcutRow[] }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 w-48">Shortcut</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 w-44">Action</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-3">{row.keys}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{row.action}</td>
              <td className="px-4 py-3 text-gray-500 text-xs leading-relaxed">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsKeyboardShortcutsPage() {
  return (
    <DocsLayout
      title="Keyboard Shortcuts | Testably Docs"
      description="Complete keyboard shortcut reference for Testably — Cmd+K, G-chords, Focus Mode keys, and more."
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
        <i className="ri-arrow-right-s-line text-gray-400" />
        <span className="text-gray-900 font-medium">Keyboard Shortcuts</span>
      </div>

      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Keyboard Shortcuts</h1>
      <p className="text-gray-500 text-base leading-relaxed max-w-2xl mb-4">
        Testably provides a rich set of keyboard shortcuts so you can work quickly without a mouse. Press <Kbd>?</Kbd> on any page to see shortcuts available in the current context.
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-4 py-3 mb-10">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Mac / Windows</p>
        <p className="text-sm text-blue-800">In this guide, <Kbd>Cmd</Kbd> refers to the macOS Command (⌘) key; <Kbd>Ctrl</Kbd> refers to the Windows/Linux Control key. Testably auto-detects your OS and shows the appropriate symbol in the shortcut help overlay. Single-key shortcuts are disabled while an input field or IME composition is active.</p>
      </div>

      <div className="space-y-8">
        {/* ── Section 1: Global ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-global-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Global Shortcuts</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">Available on every page in Testably.</p>
          <ShortcutTable rows={[
            { keys: <Kbd>?</Kbd>, action: 'Open shortcut help', desc: 'Shows an overlay with all shortcuts available in the current page context.' },
            { keys: <KbdCombo keys={['Cmd', 'K']} />, action: 'Command Palette', desc: 'Opens the global search and command launcher from any page. Works even when an input field is focused.' },
            { keys: <KbdCombo keys={['Cmd', 'Shift', 'F']} />, action: 'Enter Focus Mode', desc: 'Launches Focus Mode from a Test Run detail page.' },
          ]} />
        </section>

        {/* ── Section 2: Navigation Chords ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-route-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Navigation Shortcuts (Go to…)</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Chord-style shortcuts for quick page navigation. Press <Kbd>G</Kbd>, then press the second key within 1 second.
          </p>
          <ShortcutTable rows={[
            { keys: <KbdChord first="G" second="T" />, action: 'Test Cases', desc: 'Go to the Test Cases list for the current project.' },
            { keys: <KbdChord first="G" second="R" />, action: 'Runs', desc: 'Go to the Runs list for the current project.' },
            { keys: <KbdChord first="G" second="D" />, action: 'Exploratory', desc: 'Go to the Exploratory list for the current project.' },
            { keys: <KbdChord first="G" second="M" />, action: 'Milestones', desc: 'Go to the Milestones list for the current project.' },
            { keys: <KbdChord first="G" second="P" />, action: 'Projects', desc: 'Go to the Projects home page.' },
          ]} />

          <div className="mt-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Chord Pattern</p>
            <p className="text-sm text-purple-800">When you press <Kbd>G</Kbd>, Testably waits up to 1 second for the second key. After 1 second the waiting state resets. Chord shortcuts are disabled when a text input is focused.</p>
          </div>
        </section>

        {/* ── Section 3: List Navigation ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-list-check text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">List Navigation &amp; Selection</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">Works on Test Cases, Runs, and any other list/table view.</p>
          <ShortcutTable rows={[
            { keys: <span className="inline-flex gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd></span>, action: 'Move between items', desc: 'Move focus to the previous or next item in the list.' },
            { keys: <span className="inline-flex gap-1"><Kbd>J</Kbd><Kbd>K</Kbd></span>, action: 'Move (Vim-style)', desc: 'J = next, K = previous. Same as arrow keys.' },
            { keys: <Kbd>Enter</Kbd>, action: 'Open / expand', desc: 'Open the detail page of the focused item, or expand an accordion row.' },
            { keys: <Kbd>Space</Kbd>, action: 'Toggle checkbox', desc: 'Select or deselect the focused item.' },
            { keys: <KbdCombo keys={['Cmd', 'A']} />, action: 'Select all', desc: 'Select all visible items. Press again to deselect all.' },
            { keys: <span className="inline-flex items-center gap-1"><KbdCombo keys={['Shift', '↑']} /><span className="text-xs text-gray-400">/</span><KbdCombo keys={['Shift', '↓']} /></span>, action: 'Range select', desc: 'Hold Shift and move up or down to select a contiguous range.' },
            { keys: <Kbd>Esc</Kbd>, action: 'Deselect / close', desc: 'Clear selection or close an open modal/overlay.' },
          ]} />
        </section>

        {/* ── Section 4: Focus Mode ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-focus-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Focus Mode Shortcuts</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Focus Mode is a dedicated UI for recording test results. Single-key shortcuts act instantly — no modifier needed.
          </p>
          <ShortcutTable rows={[
            { keys: <Kbd>P</Kbd>, action: 'Passed → next', desc: 'Mark the current test as Passed and automatically advance to the next test.' },
            { keys: <Kbd>F</Kbd>, action: 'Failed → next', desc: 'Mark as Failed and advance.' },
            { keys: <Kbd>B</Kbd>, action: 'Blocked → next', desc: 'Mark as Blocked and advance.' },
            { keys: <Kbd>R</Kbd>, action: 'Retest → next', desc: 'Mark as Retest and advance.' },
            { keys: <Kbd>S</Kbd>, action: 'Skip (Untested) → next', desc: 'Skip without changing the status (remains Untested) and advance.' },
            { keys: <Kbd>N</Kbd>, action: 'Add note', desc: 'Activate the note input field for the current test.' },
            { keys: <span className="inline-flex gap-1"><Kbd>←</Kbd><Kbd>K</Kbd></span>, action: 'Previous test', desc: 'Go back to the previous test case.' },
            { keys: <span className="inline-flex gap-1"><Kbd>→</Kbd><Kbd>J</Kbd></span>, action: 'Next test', desc: 'Advance to the next test case.' },
            { keys: <Kbd>Esc</Kbd>, action: 'Exit Focus Mode', desc: 'Close Focus Mode and return to the Run detail page.' },
          ]} />

          <div className="mt-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Power User Tip</p>
            <p className="text-sm text-green-800">Chain keys rapidly: <Kbd>P</Kbd> <Kbd>P</Kbd> <Kbd>P</Kbd> <Kbd>F</Kbd> <Kbd>P</Kbd> — each keypress records the result and jumps to the next test automatically, letting you blaze through large test suites.</p>
          </div>
        </section>

        {/* ── Section 5: Discovery Log ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-search-eye-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Discovery Log Session Shortcuts</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">Quickly switch observation type on the Discovery Log session detail page.</p>
          <ShortcutTable rows={[
            { keys: <Kbd>N</Kbd>, action: 'Note type', desc: 'Switch the observation input form to Note (general memo) type.' },
            { keys: <Kbd>B</Kbd>, action: 'Bug type', desc: 'Switch to Bug (defect found) type.' },
            { keys: <Kbd>O</Kbd>, action: 'Blocked type', desc: 'Switch to Blocked (test blocked) type.' },
            { keys: <Kbd>T</Kbd>, action: 'Step type', desc: 'Switch to Step (test step passed) type.' },
          ]} />
        </section>

        {/* ── Section 6: Project Dashboard ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-dashboard-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Project Dashboard Shortcuts</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">Quick creation shortcuts on the project dashboard. Only active when no modal is open.</p>
          <ShortcutTable rows={[
            { keys: <Kbd>N</Kbd>, action: 'Quick Create Test Case', desc: 'Open the Quick Create modal to rapidly add a new test case.' },
            { keys: <Kbd>R</Kbd>, action: 'Continue / Start Run', desc: 'Resume an active test run if one exists, or start a new run.' },
          ]} />
        </section>

        {/* ── Section 7: Quick Create Modal & Inline Edit ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-add-box-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quick Create Modal &amp; Inline Edit</h2>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-1 mt-2">Quick Create Test Case Modal</h3>
          <ShortcutTable rows={[
            { keys: <KbdCombo keys={['Cmd', 'Enter']} />, action: 'Create & close', desc: 'Create the test case and close the modal.' },
            { keys: <KbdCombo keys={['Cmd', 'Shift', 'Enter']} />, action: 'Create & edit', desc: 'Create the test case and open the full detail editor.' },
            { keys: <KbdCombo keys={['Cmd', 'Alt', 'Enter']} />, action: 'Create & add another', desc: 'Create the test case and clear the form for continuous creation.' },
            { keys: <Kbd>Esc</Kbd>, action: 'Close modal', desc: 'Close without creating.' },
          ]} />

          <h3 className="text-base font-semibold text-gray-900 mb-1 mt-6">Inline Edit</h3>
          <ShortcutTable rows={[
            { keys: <Kbd>Enter</Kbd>, action: 'Save', desc: 'Save the edit and exit editing mode.' },
            { keys: <KbdCombo keys={['Cmd', 'S']} />, action: 'Save (alternate)', desc: 'Same as Enter — saves and exits editing mode.' },
            { keys: <Kbd>Esc</Kbd>, action: 'Cancel', desc: 'Discard changes and exit editing mode.' },
          ]} />
        </section>

        {/* ── Section 8: Test Case List ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-file-list-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Test Case List Shortcuts</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">Manage test cases from the keyboard on the Test Cases list page.</p>
          <ShortcutTable rows={[
            { keys: <Kbd>N</Kbd>, action: 'New Test Case', desc: 'Open the new test case creation modal.' },
            { keys: <Kbd>E</Kbd>, action: 'Edit selected', desc: 'Activate editing mode for the selected test case.' },
            { keys: <Kbd>Delete</Kbd>, action: 'Delete selected', desc: 'Start deleting the selected test case(s). A confirmation modal is shown.' },
          ]} />

          <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-4 py-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Input Field Protection</p>
            <p className="text-sm text-blue-800">Single-key shortcuts (N, E, P, F, etc.) are disabled when an input, textarea, select, or contentEditable element has focus — preventing accidental triggers while typing. <KbdCombo keys={['Cmd', '…']} /> shortcuts still work inside input fields.</p>
          </div>
        </section>
      </div>

      {/* Navigation */}
      <div className="mt-10 pt-8 border-t border-gray-200 flex items-center justify-between">
        <Link
          to="/docs/account-billing"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <i className="ri-arrow-left-s-line"></i>
          Account &amp; Billing
        </Link>
        <Link
          to="/docs/faq"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          FAQ &amp; Troubleshooting
          <i className="ri-arrow-right-s-line"></i>
        </Link>
      </div>
    </DocsLayout>
  );
}
