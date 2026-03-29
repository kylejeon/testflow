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

const createRunSteps = [
  { num: 1, title: 'Name your run', desc: 'Give the run a descriptive name such as "Sprint 12 Regression" or "Release 2.5 Smoke Test".' },
  { num: 2, title: 'Link to a Milestone (optional)', desc: "Associate the run with a milestone to contribute toward that milestone's progress tracking." },
  { num: 3, title: 'Select Test Cases', desc: 'Choose test cases individually, by folder, or select all cases in the project.' },
  { num: 4, title: 'Assign to team members (optional)', desc: 'Assign cases to specific team members. Each assignee sees only their assigned cases by default.' },
  { num: 5, title: 'Create', desc: 'Click "Create". The run is created with a status of New and is ready for execution.' },
];

export default function DocsTestRunsPage() {
  return (
    <DocsLayout
      title="Test Runs | Testably Docs"
      description="Create test runs, assign test cases, execute in Focus Mode, and record results."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Runs</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Runs</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          A test run is a single execution of a set of test cases. Create runs tied to milestones, assign test cases to team members, and execute them in Focus Mode for a distraction-free testing experience.
        </p>
      </div>

      <div className="space-y-8">
        {/* ---- Section 1: Creating a Test Run ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-add-circle-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Creating a Test Run</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Navigate to the <strong>Test Runs</strong> tab in your project and click <strong>"+ New Run"</strong>. A modal guides you through five steps to configure the run before creation.
          </p>
          <StepList steps={createRunSteps} />
        </section>

        {/* ---- Section 2: Run Status Flow ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-loop-left-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Run Status Flow</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Every test run goes through a defined lifecycle. Status can be updated manually from the run detail page, with the exception of <strong>Completed</strong>, which is a terminal state.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Transitions To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">New</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">new</code></td>
                  <td className="px-4 py-3 text-gray-500">Created but not started. No results recorded yet.</td>
                  <td className="px-4 py-3 text-gray-500">In Progress</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">In Progress</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">in_progress</code></td>
                  <td className="px-4 py-3 text-gray-500">Testing underway. At least one result has been recorded.</td>
                  <td className="px-4 py-3 text-gray-500">Paused, Under Review, Completed</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Paused</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">paused</code></td>
                  <td className="px-4 py-3 text-gray-500">Temporarily on hold (e.g. blocked by an external dependency).</td>
                  <td className="px-4 py-3 text-gray-500">In Progress</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Under Review</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">under_review</code></td>
                  <td className="px-4 py-3 text-gray-500">Testing complete but results are being reviewed before finalization.</td>
                  <td className="px-4 py-3 text-gray-500">Completed, In Progress</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Completed</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">completed</code></td>
                  <td className="px-4 py-3 text-gray-500">All testing done and results are final.</td>
                  <td className="px-4 py-3 text-gray-500 italic">Terminal state</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 mb-1">Automated Runs (CI/CD)</p>
            <p className="text-sm text-amber-700 leading-relaxed">
              Runs created through the CI/CD API are marked with an <strong>automation badge</strong>. These runs receive results from your pipeline automatically and do not require manual execution.
            </p>
          </div>
        </section>

        {/* ---- Section 3: Assigning Test Cases ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-user-received-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Assigning Test Cases</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Within a test run, each test case can be assigned to a specific team member, making it clear who is responsible for executing which cases.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">How to Assign</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Open the run detail page → click the <strong>assignee icon</strong> next to any test case → select a team member from the dropdown. Only users with Admin or Member roles appear in the assignee list.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Filtering by Assignee</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Use the <strong>contributor filter</strong> at the top of the run detail page to show only the test cases assigned to a specific person. This is useful for team members who want to focus on their own workload.
          </p>
        </section>

        {/* ---- Section 4: Focus Mode ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-focus-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Focus Mode</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Focus Mode is Testably's distraction-free testing interface, designed to let you move through test cases quickly and record results without context-switching.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Layout</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Left Panel — Test Case List</p>
              <p className="text-sm text-gray-500 leading-relaxed">All test cases in the run with their current status indicators. Click any case to load it in the right panel.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Right Panel — Active Test Case</p>
              <p className="text-sm text-gray-500 leading-relaxed">Full details of the selected case — title, steps, expected result, preconditions, and attachments. The result input area appears below.</p>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Entering Focus Mode</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Open any test run → click the <strong>"Focus Mode"</strong> button, or click directly on a test case row. The URL will include <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">?focus=true</code> while Focus Mode is active.
          </p>
        </section>

        {/* ---- Section 5: Recording Results ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Recording Results</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            For each test case in a run, record a status and optional supporting details. The run's progress bar updates in real-time as you submit results.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">When to Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Passed ✅</td>
                  <td className="px-4 py-3 text-gray-500">Test case executed as expected. All steps completed successfully.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Failed ❌</td>
                  <td className="px-4 py-3 text-gray-500">Actual result differs from expected. A defect was found.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Blocked ⛔</td>
                  <td className="px-4 py-3 text-gray-500">Test cannot be executed due to a dependency or environment issue.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Retest 🔄</td>
                  <td className="px-4 py-3 text-gray-500">A previously failed test that needs re-execution after a fix has been applied.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Untested ⬜</td>
                  <td className="px-4 py-3 text-gray-500">Not yet executed. Default state for all test cases in a new run.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Additional Result Fields</h3>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-edit-2-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Note:</strong> A comment explaining the result (e.g. "Failed on step 3 — button not clickable").</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-timer-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Elapsed time:</strong> Record how long the test took to execute.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-list-ordered text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Step-level status:</strong> Mark individual steps as passed or failed for granular tracking.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-links-line text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Issues:</strong> Link Jira issues to failed test results (requires Jira integration).</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-attachment-2 text-gray-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Attachments:</strong> Upload screenshots or evidence files to support the recorded result.</span>
            </li>
          </ul>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Run Progress Bar</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              The progress bar at the top of the run updates in real-time and shows a breakdown: <span className="text-green-600 font-medium">X passed</span>, <span className="text-red-600 font-medium">Y failed</span>, <span className="text-yellow-600 font-medium">Z blocked</span>, <span className="text-blue-600 font-medium">W retest</span>, <span className="text-gray-500 font-medium">V untested</span>.
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3">
            <i className="ri-lightbulb-line text-indigo-500 text-lg mt-0.5"></i>
            <p className="text-sm text-indigo-700 leading-relaxed">
              <strong>Tip:</strong> Use keyboard shortcuts in Focus Mode for faster execution. Navigate between test cases and record results without touching the mouse.
            </p>
          </div>
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">Learn how to build test cases or organize your runs under milestones for release tracking.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/test-cases"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-file-list-3-line"></i>
              Test Cases →
            </Link>
            <Link
              to="/docs/milestones"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-flag-line"></i>
              Milestones →
            </Link>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
