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

const createSharedStepSteps = [
  { num: 1, title: 'Open Shared Steps library', desc: 'Navigate to Project → Shared Steps. Click "+ New Shared Step" to open the creation modal.' },
  { num: 2, title: 'Fill in the details', desc: 'Enter a name (required), optional description, category, and tags. Tags support comma separation (e.g. "login, auth, smoke").' },
  { num: 3, title: 'Add steps', desc: 'Define the step sequence just like you would in a regular test case: each row has a step description and an expected result.' },
  { num: 4, title: 'Save', desc: 'Click "Save". A unique ID is assigned (e.g. SS-001) and the shared step is immediately available to insert into any test case in the project.' },
];

const insertSharedStepSteps = [
  { num: 1, title: 'Open a test case', desc: 'Click any test case to open its detail view.' },
  { num: 2, title: 'Click "Insert Shared Step"', desc: 'In the Steps section, click the "Insert Shared Step" button below the step list.' },
  { num: 3, title: 'Search and select', desc: 'The library modal shows all shared steps in the project. Search by name, ID, or category. Click a row to preview its steps.' },
  { num: 4, title: 'Confirm', desc: 'Click "Insert". A reference block appears in the step list showing the shared step ID, name, and version it was inserted at.' },
];

const inlineConvertSteps = [
  { num: 1, title: 'Select steps to convert', desc: 'In the test case detail view, select one or more consecutive regular steps using the step checkboxes.' },
  { num: 2, title: 'Convert to Shared Step', desc: 'Click the "Convert to Shared Step" option from the step action menu (⋯ icon).' },
  { num: 3, title: 'Name the shared step', desc: 'A dialog asks you to give the new shared step a name. The selected steps become the body of the new shared step.' },
  { num: 4, title: 'Done', desc: 'The original inline steps are replaced by a shared step reference. The new shared step is added to the library and can be reused in other test cases.' },
];

export default function DocsSharedStepsPage() {
  return (
    <DocsLayout
      title="Steps Library | Testably Docs"
      description="Learn how to create a Steps Library, insert reusable step blocks into test cases, convert inline steps, and track usage across your project."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Steps Library</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-3xl font-bold text-gray-900">Shared / Reusable Test Steps</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-semibold flex-shrink-0">
            <i className="ri-star-line"></i> Starter+
          </span>
        </div>
        <p className="text-gray-500 text-base leading-relaxed max-w-2xl">
          Shared Steps let you define a reusable sequence of test steps once and insert them into any number of test cases across your project. When a shared step is updated, all references are versioned so existing test cases remain stable.
        </p>
      </div>

      <div className="space-y-8">

        {/* ---- Section 1: Overview ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-stack-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Overview</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Shared Steps solve the problem of duplicated step sequences across your test suite. Common examples include:
          </p>
          <ul className="space-y-2 mb-5">
            {[
              { icon: 'ri-login-box-line', text: 'Login / Authentication flows that precede many tests' },
              { icon: 'ri-shopping-cart-line', text: 'Add-to-cart sequences reused across checkout tests' },
              { icon: 'ri-settings-3-line', text: 'Account setup or teardown steps' },
              { icon: 'ri-database-2-line', text: 'Test data preparation steps shared by multiple scenarios' },
            ].map((item) => (
              <li key={item.icon} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed">
                <i className={`${item.icon} text-indigo-400 mt-0.5 flex-shrink-0`}></i>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-blue-800 mb-1">Plan Limits — Steps Library</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-blue-700">
              <span>Free: <strong>Not available</strong></span>
              <span>Starter: <strong>Up to 20 shared steps per project</strong></span>
              <span>Professional+: <strong>Unlimited</strong></span>
            </div>
          </div>
        </section>

        {/* ---- Section 2: Creating a Shared Step ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-add-circle-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Creating a Shared Step</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Go to <strong>Project → Steps Library</strong> and click <strong>"+ New Shared Step"</strong> to open the library editor.
          </p>

          <StepList steps={createSharedStepSteps} />

          <div className="overflow-x-auto mt-6">
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
                  <td className="px-4 py-3 text-gray-500">Auto-assigned (e.g. <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">SS-001</code>). Cannot be changed.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Name</td>
                  <td className="px-4 py-3 text-gray-500">Yes</td>
                  <td className="px-4 py-3 text-gray-500">A clear label for the step group. Shown in the reference block inside test cases.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Description</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Notes about what this step group does or when to use it.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Category</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Group related shared steps (e.g. "Auth", "Checkout"). Used for filtering in the library.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Tags</td>
                  <td className="px-4 py-3 text-gray-500">No</td>
                  <td className="px-4 py-3 text-gray-500">Comma-separated labels for additional categorization (e.g. <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">smoke, login</code>).</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Steps</td>
                  <td className="px-4 py-3 text-gray-500">Yes</td>
                  <td className="px-4 py-3 text-gray-500">The actual step sequence. Each row has a step action and an expected result.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Section 3: Library Management ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-booklet-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Managing the Library</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            The Steps Library page lists all shared steps for the current project. You can search by name or ID, filter by category, and sort by usage count.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Editing a Shared Step</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Click a shared step row to open the editor. Any changes you save increment the <strong>version number</strong> (e.g. v1 → v2). Existing test case references continue to record the version they were inserted at, so your test history is preserved.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Deleting a Shared Step</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Deleting a shared step from the library automatically <strong>converts all references to inline steps</strong> within the test cases that used it. No test cases lose any step content — the steps become regular (non-shared) steps.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-2">Exporting the Library</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-0">
            Use the <strong>"Export CSV"</strong> button in the library toolbar to download all shared steps and their step definitions as a spreadsheet.
          </p>
        </section>

        {/* ---- Section 4: Inserting into Test Cases ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-insert-column-right text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Inserting into Test Cases</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            Once a shared step exists in the library, you can insert it at any position in a test case's step list.
          </p>

          <StepList steps={insertSharedStepSteps} />

          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 mt-5 flex items-start gap-3">
            <i className="ri-information-line text-indigo-500 text-lg mt-0.5"></i>
            <p className="text-sm text-indigo-700 leading-relaxed">
              The reference block in the test case shows the shared step's <strong>ID</strong>, <strong>name</strong>, and <strong>version</strong> at time of insertion. When executing the test, the steps are expanded inline so testers see the full step details.
            </p>
          </div>
        </section>

        {/* ---- Section 5: Inline Conversion ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-arrow-left-right-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Inline Conversion</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            You can promote regular inline steps directly into a new shared step without leaving the test case editor. This is useful when you realize an existing step sequence should be reused elsewhere.
          </p>

          <StepList steps={inlineConvertSteps} />
        </section>

        {/* ---- Section 6: Used By Tracking ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-eye-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Used By Tracking</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Every shared step in the library shows a <strong>usage count</strong> — the number of test cases that currently reference it. Click the count to open the <strong>"Used by"</strong> panel, which lists every test case that uses this shared step, along with its folder and ID.
          </p>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            This is especially useful before editing or deleting a shared step: you can review the impact on test cases first.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <i className="ri-alert-line text-amber-500 text-lg mt-0.5"></i>
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Before editing a high-usage shared step</strong>, check the "Used by" list and communicate the change to your team. Editing increments the version — references in existing test cases record the version they were inserted at, so run history is not affected, but reviewers may want to re-verify the new version.
            </p>
          </div>
        </section>

        {/* ---- Section 7: Version Management ---- */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <i className="ri-history-line text-indigo-600 text-lg"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Version Management</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Every time a shared step is saved with changes, its <strong>version number</strong> increments automatically (v1 → v2 → v3…). References in test cases record the version at the time they were inserted.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Scenario</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Shared step edited</td>
                  <td className="px-4 py-3 text-gray-500">Version increments. All <em>future</em> insertions use the new version. Existing references show the version they were inserted at.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Test case executed</td>
                  <td className="px-4 py-3 text-gray-500">The steps expanded during execution reflect the version stored in the reference at that time.</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">Shared step deleted</td>
                  <td className="px-4 py-3 text-gray-500">All references are converted to inline steps using the last saved version. No step content is lost.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Next Steps ---- */}
        <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <h3 className="font-semibold text-indigo-900 mb-3">Next Steps</h3>
          <p className="text-sm text-indigo-700 mb-4">
            Steps Library pairs well with the Requirements Traceability Matrix for comprehensive coverage visibility.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/docs/requirements-traceability"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-git-branch-line"></i>
              Requirements Traceability Matrix →
            </Link>
            <Link
              to="/docs/test-cases"
              className="inline-flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
            >
              <i className="ri-file-list-3-line"></i>
              Test Cases →
            </Link>
          </div>
        </section>

      </div>

      {/* Prev / Next navigation */}
      <div className="mt-10 pt-8 border-t border-gray-200 flex items-center justify-between">
        <Link
          to="/docs/requirements-traceability"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <i className="ri-arrow-left-s-line"></i>
          Requirements Traceability Matrix
        </Link>
        <Link
          to="/docs/team-permissions"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 font-medium transition-colors"
        >
          Team & Permissions
          <i className="ri-arrow-right-s-line"></i>
        </Link>
      </div>
    </DocsLayout>
  );
}
