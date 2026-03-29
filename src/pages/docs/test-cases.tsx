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

const aiFlowSteps = [
  { num: 1, title: 'Choose mode', desc: 'Select "Text-based" to describe a feature, or "Session-based" (Professional+) to analyze a Discovery Log session.' },
  { num: 2, title: 'Provide input', desc: 'Type a natural language description of the feature, or select a completed Discovery Log session.' },
  { num: 3, title: 'Review titles', desc: 'AI generates candidate test case titles. Edit, remove, or add titles before proceeding.' },
  { num: 4, title: 'Review details', desc: 'AI fills in steps, expected results, and priority for each case. Review and adjust before saving.' },
];

export default function DocsTestCasesPage() {
  return (
    <DocsLayout
      title="Test Cases | Testably Docs"
      description="Learn how to create, organize, and manage test cases in Testably — manually, in bulk, or with AI assistance."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Cases</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Cases</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Test cases are the building blocks of your QA process. Learn how to create, organize, and manage test cases effectively — manually, in bulk, or with AI assistance.
        </p>
      </div>

      <div className="space-y-8">
        {/* ---- Section 1: Creating Test Cases ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-add-circle-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Creating Test Cases</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Testably offers two ways to create test cases: manually for precise control, or via AI generation for speed. Both methods produce the same structured test case format.
          </p>

          {/* 1a: Manual Creation */}
          <h3 className="text-base font-semibold text-gray-900 mb-2">Manual Creation</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Navigate to the <strong>Test Cases</strong> tab in your project, then click <strong>"+ New Test Case"</strong>. Fill in the fields below to define your test case.
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
                  <td className="px-4 py-3 font-medium text-gray-900">Title</td>
                  <td className="px-4 py-3 text-gray-500">Yes</td>
                  <td className="px-4 py-3 text-gray-500">A clear description of what is tested. E.g. "User can login with valid credentials".</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Custom ID</td>
                  <td className="px-4 py-3 text-gray-500">Auto</td>
                  <td className="px-4 py-3 text-gray-500">Auto-generated from project prefix (e.g. PRJ-1). Cannot be set manually.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Folder</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Organize into folders. Select an existing folder or type to create a new one.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Priority</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Critical, High, Medium (default), or Low.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Type</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Manual (default) or Automated.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Lifecycle Status</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Draft → Active → Deprecated. New cases start as Draft.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Precondition</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Prerequisites or setup needed before executing the test.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Steps</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Step-by-step instructions for executing the test.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Expected Result</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">What should happen when the test is executed correctly.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Tags</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Free-form labels for categorization (e.g. "login", "regression", "smoke").</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1b: AI Generation */}
          <h3 className="text-base font-semibold text-gray-900 mb-2">AI-Powered Generation</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Click the <strong>"AI Generate"</strong> button to generate test cases automatically. Two modes are available:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-text-wrap text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Mode 1 — Text-based:</strong> Describe a feature in natural language. The AI generates relevant test cases based on your description.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
              <i className="ri-search-eye-line text-indigo-400 mt-0.5 flex-shrink-0"></i>
              <span><strong>Mode 2 — Session-based (Professional+):</strong> Select a Discovery Log session. The AI analyzes your recorded observations to generate structured test cases.</span>
            </li>
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Plan Limits — AI Test Case Generation</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
              <span>Free: <strong>5/month</strong></span>
              <span>Starter: <strong>30/month</strong></span>
              <span>Professional: <strong>150/month</strong></span>
              <span>Enterprise: <strong>Unlimited</strong></span>
            </div>
            <p className="text-xs text-blue-600 mt-1">Session-based mode requires a Professional plan or above.</p>
          </div>

          <StepList steps={aiFlowSteps} />
        </section>

        {/* ---- Section 2: Organizing with Folders ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-folder-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Organizing with Folders</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Folders help organize test cases into logical groups by feature, module, or sprint. A well-structured folder hierarchy makes it easy to find specific test cases and build focused test runs.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Creating a Folder</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            When creating or editing a test case, type a new name in the <strong>Folder</strong> field — the folder is created automatically. Each folder supports a custom icon and one of 10 colors: <span className="font-medium">Indigo, Violet, Pink, Emerald, Amber, Cyan, Red, Teal, Orange, Blue</span>.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Sidebar Navigation</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The left sidebar displays all folders with a test case count next to each. Click any folder to filter the list and show only the test cases within it.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Moving Test Cases</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-0">
            Select one or more test cases using the checkboxes, then use the <strong>Bulk Action Bar's "Move"</strong> option that appears at the bottom of the screen. Choose the target folder to relocate the selected cases.
          </p>
        </section>

        {/* ---- Section 3: Tags and Priority ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-price-tag-3-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Tags and Priority</h2>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Tags</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Tags are free-form labels used for categorization and filtering across your test library. Common examples include: <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">smoke</code>, <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">regression</code>, <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">login</code>, <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">payment</code>, <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">P1</code>.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Priority Levels</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">When to Use</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Critical</td>
                  <td className="px-4 py-3 text-gray-500">Core functionality that must always work (login, checkout, payment).</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Red badge</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">High</td>
                  <td className="px-4 py-3 text-gray-500">Important features that significantly impact users.</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Orange badge</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Medium</td>
                  <td className="px-4 py-3 text-gray-500">Standard functionality (default for new test cases).</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Blue badge</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Low</td>
                  <td className="px-4 py-3 text-gray-500">Nice-to-have features, edge cases, or cosmetic issues.</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Gray badge</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed">
            Use the <strong>filter bar</strong> above the test case list to filter by Priority and Lifecycle Status (Draft, Active, or Deprecated).
          </p>
        </section>

        {/* ---- Section 4: Bulk Operations ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-list-check-3 text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Operations</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Select multiple test cases using the row checkboxes — the <strong>Bulk Action Bar</strong> appears at the bottom of the screen with available actions. Use the header checkbox to select all visible test cases at once.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Assign</td>
                  <td className="px-4 py-3 text-gray-500">Assign selected test cases to a team member.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Move to Folder</td>
                  <td className="px-4 py-3 text-gray-500">Move selected cases to a different folder.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Remove from Folder</td>
                  <td className="px-4 py-3 text-gray-500">Remove the folder assignment from selected cases.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Change Lifecycle</td>
                  <td className="px-4 py-3 text-gray-500">Transition lifecycle status: Draft → Active → Deprecated.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Delete</td>
                  <td className="px-4 py-3 text-gray-500">Permanently delete selected cases (shows a confirmation dialog).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Section 5: Editing Test Case Details ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-file-edit-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Editing Test Case Details</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Click any test case title to open the <strong>detail view</strong>. From here you can edit all fields, add numbered steps, and manage attachments.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Steps &amp; Expected Results</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-3">
            Steps are numbered, with each step describing a single action. Here is an example:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 mb-4">
            <ol className="space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
              <li>Navigate to the login page.</li>
              <li>Enter a valid email address.</li>
              <li>Enter a valid password.</li>
              <li>Click "Sign In".</li>
            </ol>
            <p className="text-sm text-gray-600 mt-3"><strong>Expected Result:</strong> User is redirected to the dashboard and sees a welcome message.</p>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Attachments</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Upload screenshots, documents, or other files to provide additional context for the test case. Attachments are visible in both the detail view and during test run execution.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Lifecycle Transitions</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Test cases move through three lifecycle states: <strong>Draft</strong> (being written), <strong>Active</strong> (ready for use in runs), and <strong>Deprecated</strong> (retired from active use). Deprecated cases are hidden by default — use the lifecycle filter to show them.
          </p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 flex items-start gap-3">
            <i className="ri-lightbulb-line text-indigo-500 text-lg mt-0.5"></i>
            <p className="text-sm text-indigo-700 leading-relaxed">
              <strong>Tip:</strong> Write test case titles as user actions: <em>"User can [action]"</em> or <em>"Verify that [behavior]"</em>. This makes test cases self-documenting and easier to understand during execution.
            </p>
          </div>
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">Now that you know how to manage test cases, learn how to execute them in a test run or organize your releases with milestones.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/test-runs"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-play-circle-line"></i>
              Test Runs →
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
