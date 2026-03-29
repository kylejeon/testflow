import { Link } from 'react-router-dom';
import DocsLayout from '../../components/docs/DocsLayout';

function StepList({ steps }: { steps: { num: number; title: string; desc: string }[] }) {
  return (
    <ol className="space-y-4 mt-5">
      {steps.map((step) => (
        <li key={step.num} className="flex items-start gap-4">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center mt-0.5">
            {step.num}
          </span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
            <p className="text-gray-500 text-sm leading-relaxed mt-0.5">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const sessionSteps = [
  { num: 1, title: 'Name your session', desc: 'Use a descriptive name that captures the scope (e.g. "Checkout Flow Exploration", "Mobile Navigation Edge Cases").' },
  { num: 2, title: 'Define the mission (Charter)', desc: 'Write a brief charter describing what to explore. E.g. "Explore the checkout flow for edge cases: empty cart, expired coupon, address validation."' },
  { num: 3, title: 'Set time estimate (optional)', desc: 'Time-box the session (30 min, 1 hour, etc.). A live timer tracks how long the session has been active.' },
  { num: 4, title: 'Assign participants (optional)', desc: 'Add one or more team members. Multiple participants can contribute observations to the same session.' },
  { num: 5, title: 'Link to milestone (optional)', desc: 'Associate the session with a milestone to track exploratory coverage alongside formal test runs.' },
  { num: 6, title: 'Start exploring', desc: 'Click "Create". The session begins immediately and the live timer starts. You can pause and resume as needed.' },
];

const addEntrySteps = [
  { num: 1, title: 'Select entry type', desc: 'Choose from Step, Bug, Blocked, or Note using the bottom toolbar.' },
  { num: 2, title: 'Write your observation', desc: 'Use the rich text editor (powered by Quill) to describe what you found. Supports bold, italic, lists, and code blocks.' },
  { num: 3, title: 'Add attachments (optional)', desc: 'Attach screenshots or files to provide visual evidence alongside your observation.' },
  { num: 4, title: 'Submit', desc: 'Press Enter or click Submit. The entry appears timestamped in the chronological timeline.' },
];

export default function DocsDiscoveryLogsPage() {
  return (
    <DocsLayout
      title="Discovery Logs | Testably Docs"
      description="Start exploratory testing sessions, record observations in real-time, and convert findings into formal test cases."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Discovery Logs</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Discovery Logs</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Discovery Logs are Testably's tool for exploratory testing. Start a session, freely explore your application, and record observations as you go — notes, bugs, and test steps. Later, convert your findings into formal test cases.
        </p>
      </div>

      <div className="space-y-8">
        {/* ---- Section 1: Starting an Exploratory Session ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-search-eye-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Starting an Exploratory Session</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Navigate to the <strong>Sessions</strong> tab in your project and click <strong>"+ New Session"</strong>. The six-step setup flow gets your session ready in under a minute.
          </p>
          <StepList steps={sessionSteps} />
        </section>

        {/* ---- Section 2: Recording Observations ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-edit-box-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Recording Observations</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Once the session is active, record observations in real-time. Each entry is automatically timestamped and added to the chronological timeline. Testably supports four entry types:
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Icon</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Step</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-purple-700 font-medium">🧪 Purple</span></td>
                  <td className="px-4 py-3 text-gray-500">Record a test step or observed behavior that works correctly. Use for documenting what you tested.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Bug</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-red-700 font-medium">🐛 Red</span></td>
                  <td className="px-4 py-3 text-gray-500">Record a defect or unexpected behavior found during exploration.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Blocked</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-amber-700 font-medium">⛔ Amber</span></td>
                  <td className="px-4 py-3 text-gray-500">Record a scenario you could not test due to an environment or dependency issue.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Note</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-indigo-700 font-medium">📝 Indigo</span></td>
                  <td className="px-4 py-3 text-gray-500">General observations, improvement ideas, or questions to investigate later.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Adding an Entry</h3>
          <StepList steps={addEntrySteps} />

          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-blue-800 mb-1">Rich Text Editor</p>
            <p className="text-sm text-blue-700 leading-relaxed">
              The observation editor is powered by <strong>Quill</strong> and supports rich formatting: bold, italic, ordered and unordered lists, code blocks, and more. Click the edit icon on any submitted entry to modify its content or change its type.
            </p>
          </div>
        </section>

        {/* ---- Section 3: Timeline View ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-timeline-view text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Timeline View</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            All observations appear in a chronological timeline. Each entry displays the following information at a glance:
          </p>

          <ul className="space-y-2 mb-5 text-sm text-gray-500">
            <li className="flex items-start gap-2 leading-relaxed">
              <i className="ri-bookmark-fill text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Type indicator:</strong> Color-coded icon (purple=Step, red=Bug, amber=Blocked, indigo=Note).</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed">
              <i className="ri-file-text-line text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Content:</strong> Observation text with full rich-text formatting preserved.</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed">
              <i className="ri-time-line text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Timestamp:</strong> Exact time the entry was recorded during the session.</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed">
              <i className="ri-attachment-2 text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Attachments:</strong> Inline screenshots and files attached to the entry.</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed">
              <i className="ri-bug-line text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Issues:</strong> Linked Jira issues, if any were added to the entry.</span>
            </li>
          </ul>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-gray-700 mb-1">Live Timer</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              The live timer at the top of the session detail shows elapsed time in <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">HH:MM:SS</code> format. The timer pauses automatically when the session is paused, so duration accurately reflects active testing time.
            </p>
          </div>
        </section>

        {/* ---- Section 4: Session Metadata ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-information-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Session Metadata</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The right sidebar of the session detail page shows all metadata and controls for managing the session's state.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Status</p>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span><span><strong>Active</strong> — timer running</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0"></span><span><strong>Paused</strong> — timer stopped</span></div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0"></span><span><strong>Completed</strong> — session ended</span></div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Tracked Fields</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>Mission / Charter</li>
                <li>Assignees (participants)</li>
                <li>Time Box (estimated duration)</li>
                <li>Duration (actual elapsed time)</li>
                <li>Linked Milestone</li>
                <li>Tags</li>
              </ul>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Session Controls</h3>
          <ul className="space-y-2 text-sm text-gray-500 leading-relaxed">
            <li className="flex items-start gap-2">
              <i className="ri-pause-circle-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Pause / Resume:</strong> Temporarily stop the timer during breaks without ending the session.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-stop-circle-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Complete:</strong> End the session permanently. Timer stops and status changes to Completed.</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-edit-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Edit:</strong> Modify the session name, mission, assignees, or linked milestone after creation.</span>
            </li>
          </ul>
        </section>

        {/* ---- Section 5: Converting to Test Cases ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-exchange-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Converting to Test Cases</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The most powerful feature of Discovery Logs is the ability to convert exploratory findings directly into formal, structured test cases — either manually or with AI assistance.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Manual Conversion</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Click <strong>"Convert to Test Case"</strong> on any individual entry in the timeline. Testably creates a new test case with the entry content pre-populated as steps. You can then add an expected result, set priority, and assign a folder before saving.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">AI-Assisted Conversion (Professional+)</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Use the <strong>AI Generate</strong> feature with <em>Session-based</em> mode. Select a completed session and the AI analyzes all timeline entries — steps, bugs, notes, and blocked items — to generate a set of structured test cases with steps, expected results, and suggested priorities.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-green-800 mb-1">Pro Tip — Fastest Path to Coverage</p>
            <p className="text-sm text-green-700 leading-relaxed">
              Run a 30-minute exploratory session on a new feature, record all observations, then use AI Generate to convert the session into test cases. This is the fastest way to build comprehensive test coverage for a new feature — often generating 10–20 structured test cases from a single session.
            </p>
          </div>
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">Learn how to manage the test cases you generate from sessions, or configure the Jira integration to link issues from bug entries.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/test-cases"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-file-list-3-line"></i>
              Test Cases →
            </Link>
            <Link
              to="/docs/integrations"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-plug-line"></i>
              Integrations →
            </Link>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
