import { Link } from 'react-router-dom';
import DocsLayout from '../../../components/docs/DocsLayout';

const priorityMapping = [
  { testrail: 'Critical', testably: 'Critical', color: 'bg-red-100 text-red-700' },
  { testrail: 'High', testably: 'High', color: 'bg-orange-100 text-orange-700' },
  { testrail: 'Medium', testably: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { testrail: 'Low', testably: 'Low', color: 'bg-green-100 text-green-700' },
  { testrail: '1 - Don\'t Test', testably: 'Low', color: 'bg-green-100 text-green-700' },
];

const exportColumns = [
  'ID', 'Title', 'Priority', 'Type', 'Status', 'Folder',
  'Precondition', 'Steps', 'Expected Result', 'Created', 'Updated',
];

export default function ImportExportPage() {
  return (
    <DocsLayout
      title="Import / Export | Testably Docs"
      description="Import test cases from TestRail CSV and export your data from Testably."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Import / Export</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Import / Export Guide</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Migrate your test cases from TestRail or export your Testably data for backup and reporting.
        </p>
      </div>

      {/* TestRail CSV Import */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-upload-2-line text-indigo-500" />
            TestRail CSV Import
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Migrate your test cases from TestRail to Testably using a standard CSV export.
          </p>

          {/* Step 1: Export from TestRail */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              Export from TestRail
            </h3>
            <div className="ml-8">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Open your TestRail project</li>
                <li>Navigate to <span className="font-medium text-gray-700">Test Cases</span></li>
                <li>Click <span className="font-medium text-gray-700">Export to CSV</span> from the toolbar</li>
                <li>Select all columns and download the file</li>
              </ol>
            </div>
          </div>

          {/* Step 2: Import in Testably */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              Import in Testably
            </h3>
            <div className="ml-8">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Open your Testably project</li>
                <li>Go to <span className="font-medium text-gray-700">Test Cases &rarr; Import</span></li>
                <li>Click <span className="font-medium text-gray-700">Upload CSV</span> and select your exported file</li>
                <li>Review the <span className="font-medium text-gray-700">auto column mapping</span> &mdash; Testably will match TestRail columns to Testably fields automatically</li>
                <li>Preview the data and confirm</li>
                <li>Click <span className="font-medium text-gray-700">Import</span></li>
              </ol>
            </div>
          </div>

          {/* Priority Mapping */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Priority Mapping</h3>
            <p className="text-gray-500 text-sm mb-3">
              TestRail priorities are automatically mapped to Testably priorities:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-600">TestRail Priority</th>
                    <th className="text-left py-2 pr-4 font-semibold text-gray-600">Testably Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityMapping.map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="py-2 pr-4 text-gray-700">{row.testrail}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${row.color}`}>
                          {row.testably}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <i className="ri-information-line text-blue-500 mt-0.5" />
              <p className="text-sm text-blue-700">
                Folder structure from TestRail (Sections) is preserved during import. Nested sections will be created as nested folders in Testably.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API-Based Import */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-code-s-slash-line text-indigo-500" />
              API-Based Import
            </h2>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              <i className="ri-time-line text-xs" />
              Coming Soon
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Import test cases programmatically via the Testably API for advanced migration scenarios.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600">Planned features:</p>
            <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
              <li>Bulk create test cases via REST API</li>
              <li>Preserve folder hierarchy</li>
              <li>Attach files and preconditions</li>
              <li>Map custom fields from any source</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CSV Export */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-download-2-line text-indigo-500" />
            CSV Export
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Export your test cases from Testably as a CSV file for backup, reporting, or migration.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <p className="text-sm text-gray-600">
                Open your project and navigate to <span className="font-medium text-gray-700">Test Cases</span>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <p className="text-sm text-gray-600">
                Click <span className="font-medium text-gray-700">Export</span> in the toolbar.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <p className="text-sm text-gray-600">
                Select the columns you want to include and click <span className="font-medium text-gray-700">Download</span>.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Available Columns</h3>
            <div className="flex flex-wrap gap-2">
              {exportColumns.map((col) => (
                <span key={col} className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TestRail-Compatible Export */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-file-transfer-line text-indigo-500" />
            TestRail-Compatible Export
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Export your test cases in a format compatible with TestRail and other tools that support RFC 4180 CSV.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
            <div className="text-gray-500"># RFC 4180 compliant CSV format</div>
            <div className="text-gray-500"># Fields are quoted, newlines within fields are preserved</div>
            <div className="mt-2">
              <span className="text-indigo-400">"ID"</span>,<span className="text-indigo-400">"Title"</span>,<span className="text-indigo-400">"Priority"</span>,<span className="text-indigo-400">"Type"</span>,<span className="text-indigo-400">"Steps"</span>,<span className="text-indigo-400">"Expected Result"</span>
            </div>
            <div>
              <span className="text-green-400">"TC-001"</span>,<span className="text-green-400">"Login with valid credentials"</span>,<span className="text-green-400">"High"</span>,<span className="text-green-400">"Functional"</span>,<span className="text-green-400">"1. Open login page
2. Enter credentials
3. Click Sign In"</span>,<span className="text-green-400">"User is redirected to dashboard"</span>
            </div>
          </div>
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <i className="ri-check-line text-green-500 mt-0.5" />
              <p className="text-sm text-green-700">
                This format is directly importable by TestRail, Zephyr, and other test management tools that support standard CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Next steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Related Guides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/docs/cicd"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-git-merge-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">CI/CD Integration</p>
              <p className="text-xs text-gray-500">Automate result uploads</p>
            </div>
          </Link>
          <Link
            to="/docs/api"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-code-s-slash-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">API Reference</p>
              <p className="text-xs text-gray-500">Full endpoint documentation</p>
            </div>
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
