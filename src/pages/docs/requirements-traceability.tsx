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

const jiraImportSteps = [
  { num: 1, title: 'Connect Jira', desc: 'Go to Settings → Integrations and configure your Jira domain, email, and API token. This must be completed before importing.' },
  { num: 2, title: 'Open Jira Import', desc: 'In the Requirements page, click "Import from Jira". A modal appears where you select your project and filters.' },
  { num: 3, title: 'Select issues', desc: 'Choose the Jira project key and optionally filter by issue type (Epic, Story, Task, etc.) or label. Preview the list of issues to be imported.' },
  { num: 4, title: 'Import', desc: 'Click "Import". Each Jira issue becomes a Requirement with its ID mapped to external_id, title, status, and a link back to the original Jira issue.' },
  { num: 5, title: 'Sync updates', desc: 'Re-run the import at any time to pull in new issues or status changes. Existing requirements are matched by external_id and updated in place.' },
];

const aiSuggestSteps = [
  { num: 1, title: 'Open a Requirement', desc: 'Click any requirement row to open its detail panel on the right side of the Requirements page.' },
  { num: 2, title: 'Click "Suggest TCs"', desc: 'Press the "Suggest TCs" button in the detail panel. The AI analyzes the requirement title and description.' },
  { num: 3, title: 'Review suggestions', desc: 'A list of candidate test case titles is shown, each with a relevance indicator. Select the ones you want to link.' },
  { num: 4, title: 'Link or create', desc: 'For existing TCs, the suggestion links them directly. For new ones, a pre-filled test case draft is created and linked automatically.' },
];

export default function DocsRequirementsTraceabilityPage() {
  return (
    <DocsLayout
      title="Requirements Traceability Matrix | Testably Docs"
      description="Learn how to manage requirements, link test cases, visualize coverage in the Traceability Matrix, import from Jira, and identify coverage gaps with AI."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Requirements Traceability Matrix</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-3xl font-bold text-gray-900">Requirements Traceability Matrix</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-semibold flex-shrink-0">
            <i className="ri-star-line"></i> Starter+
          </span>
        </div>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Requirements Traceability Matrix (RTM) lets you define product requirements, link them to test cases, and instantly see your test coverage. Identify gaps, track status, and import requirements directly from Jira.
        </p>
      </div>

      <div className="space-y-8">

        {/* ---- Section 1: Overview ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-git-branch-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Overview</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The RTM feature consists of two connected views:
          </p>
          <ul className="space-y-3 mb-4">
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-list-check-3 text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong className="text-gray-900">Requirements</strong> — Create and manage your product requirements. Each requirement gets a unique ID (e.g. <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">REQ-001</code>), a priority level, status, and can be linked to multiple test cases.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-table-line text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong className="text-gray-900">Traceability Matrix</strong> — A grid view where rows are requirements and columns are test cases. Each cell shows the latest test result for that pairing: Passed, Failed, Blocked, or Untested.</span>
            </li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-blue-800 mb-1">Plan Limits — RTM</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
              <span>Free: <strong>Not available</strong></span>
              <span>Starter: <strong>Full access</strong></span>
              <span>Professional+: <strong>Full access + AI suggestions</strong></span>
            </div>
          </div>
        </section>

        {/* ---- Section 2: Requirements Management ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-file-list-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Requirements Management</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Navigate to <strong>Project → Requirements</strong> to manage your requirements library. Click <strong>"+ New Requirement"</strong> to create one manually.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Field</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Required</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Custom ID</td>
                  <td className="px-4 py-3 text-gray-500">Auto</td>
                  <td className="px-4 py-3 text-gray-500">Auto-generated (e.g. <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">REQ-001</code>). Cannot be set manually.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Title</td>
                  <td className="px-4 py-3 text-gray-500">Yes</td>
                  <td className="px-4 py-3 text-gray-500">A concise description of the requirement. E.g. "User can reset password via email".</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Description</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Detailed acceptance criteria or additional context for the requirement.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Priority</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">P1 (Critical), P2 (High), P3 (Medium), P4 (Low). Defaults to P3.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Category</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Free-form grouping label (e.g. "Authentication", "Payments").</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Status</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500"><strong>Draft</strong> → <strong>Active</strong> → <strong>Deprecated</strong>. New requirements start as Draft.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Parent</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Assign a parent requirement to build a hierarchical structure (e.g. Epic → Story).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Filtering & Search</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-0">
            Use the filter bar above the requirements list to narrow by <strong>Status</strong>, <strong>Priority</strong>, or <strong>Category</strong>. The search box matches against the requirement title and custom ID.
          </p>
        </section>

        {/* ---- Section 3: Linking Test Cases ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-links-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Linking Test Cases</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            A requirement can be linked to any number of test cases. A test case can also be linked to multiple requirements. There is no limit on link counts.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">From the Requirements page</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Click a requirement row to open its detail panel, then click <strong>"Link Test Cases"</strong>. Search by test case title or ID and select the ones that verify this requirement. Add an optional note per link to document the coverage rationale.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Unlinking</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-0">
            Open the requirement detail panel and click the <strong>remove icon</strong> (×) next to any linked test case. The test case itself is not affected — only the link is removed.
          </p>
        </section>

        {/* ---- Section 4: Traceability Matrix ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-table-2 text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Traceability Matrix</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Navigate to <strong>Project → Traceability</strong> to open the matrix view. Rows represent requirements, columns represent linked test cases. Each cell displays the most recent test result for that requirement–test case pairing.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Cell Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Color</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Passed</td>
                  <td className="px-4 py-3"><span className="inline-block w-3 h-3 rounded-full bg-green-500"></span></td>
                  <td className="px-4 py-3 text-gray-500">The most recent test run for this TC passed.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Failed</td>
                  <td className="px-4 py-3"><span className="inline-block w-3 h-3 rounded-full bg-red-500"></span></td>
                  <td className="px-4 py-3 text-gray-500">The most recent result for this TC failed.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Blocked</td>
                  <td className="px-4 py-3"><span className="inline-block w-3 h-3 rounded-full bg-amber-400"></span></td>
                  <td className="px-4 py-3 text-gray-500">The TC was blocked in the most recent run.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Untested</td>
                  <td className="px-4 py-3"><span className="inline-block w-3 h-3 rounded-full bg-slate-400"></span></td>
                  <td className="px-4 py-3 text-gray-500">The TC is linked but has no result in any run yet.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">— (dash)</td>
                  <td className="px-4 py-3"><span className="inline-block w-3 h-3 rounded-full bg-slate-200"></span></td>
                  <td className="px-4 py-3 text-gray-500">Linked but not yet included in any test run.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3">
            <i className="ri-lightbulb-line text-indigo-500 text-lg mt-0.5"></i>
            <p className="text-sm text-indigo-700 leading-relaxed">
              <strong>Tip:</strong> Click any cell to jump directly to the test result detail for that run, letting you review failure notes and attachments without leaving the matrix.
            </p>
          </div>
        </section>

        {/* ---- Section 5: Coverage Analysis ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-pie-chart-2-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Coverage Analysis</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The coverage panel in the Requirements page shows, for each requirement, how many of its linked test cases have passed, failed, or are untested. A summary bar gives you an at-a-glance percentage.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Coverage Gap</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            A <strong>Coverage Gap</strong> is a requirement with zero linked test cases — meaning there is no testing evidence for it at all. The Requirements page flags these requirements with a warning badge so you can prioritize linking or creating TCs for them.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Coverage %</td>
                  <td className="px-4 py-3 text-gray-500">Percentage of requirements that have at least one linked test case.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Passed %</td>
                  <td className="px-4 py-3 text-gray-500">Among covered requirements, the share whose linked TCs all have a Passed result.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Coverage Gaps</td>
                  <td className="px-4 py-3 text-gray-500">Count of requirements with no linked test cases.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Untested Links</td>
                  <td className="px-4 py-3 text-gray-500">Requirements that have linked TCs, but none have been executed yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Section 6: Jira Import ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-links-fill text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Jira Import</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Import requirements directly from your Jira project. Each Jira issue becomes a Requirement in Testably, preserving the title, status, and a link back to the original issue.
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg px-4 py-3 mb-5">
            <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1">Prerequisite</p>
            <p className="text-sm text-yellow-800">
              Jira must be connected first. Go to <Link to="/settings?tab=integrations" className="font-semibold underline hover:text-yellow-900">Settings → Integrations</Link> and add your Jira domain, email, and API token before using this feature.
            </p>
          </div>

          <StepList steps={jiraImportSteps} />
        </section>

        {/* ---- Section 7: AI TC Suggestions ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-sparkling-2-line text-indigo-600 text-lg"></i>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">AI-Based TC Suggestions</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                <i className="ri-vip-crown-line"></i> Professional+
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            For any requirement, Testably's AI can analyze the requirement text and suggest existing test cases that are likely to cover it, or propose new ones. This reduces the manual effort of building coverage from scratch.
          </p>

          <StepList steps={aiSuggestSteps} />

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mt-5">
            <p className="text-sm font-semibold text-blue-800 mb-1">Plan Limits — AI TC Suggestions</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
              <span>Free / Starter: <strong>Not available</strong></span>
              <span>Professional: <strong>150 suggestions/month</strong></span>
              <span>Enterprise: <strong>Unlimited</strong></span>
            </div>
          </div>
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">
            Now that you understand RTM, learn how to reuse steps across test cases with Shared Steps, or set up your Jira integration.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/shared-steps"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-stack-line"></i>
              Shared Steps →
            </Link>
            <Link
              to="/docs/integrations"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-plug-line"></i>
              Jira Integration →
            </Link>
          </div>
        </section>

      </div>

      {/* Prev / Next navigation */}
      <div className="mt-10 pt-8 border-t border-gray-200 flex items-center justify-between">
        <Link
          to="/docs/discovery-logs"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <i className="ri-arrow-left-s-line"></i>
          Discovery Logs
        </Link>
        <Link
          to="/docs/shared-steps"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
        >
          Shared Steps
          <i className="ri-arrow-right-s-line"></i>
        </Link>
      </div>
    </DocsLayout>
  );
}
