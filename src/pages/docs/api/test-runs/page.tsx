import DocsLayout from '../../../../components/docs/DocsLayout';

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  method: string;
  methodColor: string;
  path: string;
  description: string;
  comingSoon?: boolean;
  requestBody?: string;
  responseBody: string;
  params?: Param[];
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    methodColor: 'bg-green-100 text-green-700',
    path: '/v1/projects/:pid/runs',
    description: 'List all test runs in a project. Returns runs sorted by creation date (newest first), including status summary and assignee information.',
    responseBody: `{
  "data": [
    {
      "id": "run_501",
      "name": "Sprint 12 Regression",
      "status": "active",
      "total": 45,
      "passed": 32,
      "failed": 5,
      "blocked": 2,
      "retest": 1,
      "not_tested": 5,
      "milestone_id": "ms_v2",
      "created_by": "user_abc",
      "created_at": "2026-03-25T09:00:00Z",
      "updated_at": "2026-03-28T16:45:00Z"
    }
  ],
  "meta": {
    "total": 38,
    "page": 1,
    "per_page": 20
  }
}`,
  },
  {
    method: 'GET',
    methodColor: 'bg-green-100 text-green-700',
    path: '/v1/projects/:pid/runs/:id',
    description: 'Retrieve a single test run by its ID, including all individual test results with their current status, notes, and elapsed time.',
    responseBody: `{
  "data": {
    "id": "run_501",
    "name": "Sprint 12 Regression",
    "status": "active",
    "total": 45,
    "passed": 32,
    "failed": 5,
    "blocked": 2,
    "retest": 1,
    "not_tested": 5,
    "milestone_id": "ms_v2",
    "created_by": "user_abc",
    "created_at": "2026-03-25T09:00:00Z",
    "updated_at": "2026-03-28T16:45:00Z",
    "results": [
      {
        "id": "res_001",
        "test_case_id": "tc_001",
        "test_case_title": "Login with valid credentials",
        "status": "passed",
        "note": "Verified on Chrome 120",
        "elapsed": 45,
        "tested_by": "user_xyz",
        "tested_at": "2026-03-26T10:15:00Z"
      },
      {
        "id": "res_002",
        "test_case_id": "tc_002",
        "test_case_title": "Login with invalid password",
        "status": "failed",
        "note": "Error message not displayed correctly",
        "elapsed": 30,
        "tested_by": "user_xyz",
        "tested_at": "2026-03-26T10:20:00Z"
      }
    ]
  }
}`,
  },
  {
    method: 'POST',
    methodColor: 'bg-blue-100 text-blue-700',
    path: '/v1/projects/:pid/runs',
    description: 'Create a new test run by selecting test cases to include. Optionally link the run to a milestone for release tracking.',
    comingSoon: true,
    params: [
      { name: 'name', type: 'string', required: true, description: 'Name for the test run' },
      { name: 'test_case_ids', type: 'string[]', required: true, description: 'Array of test case IDs to include' },
      { name: 'milestone_id', type: 'string', required: false, description: 'Link to a milestone (optional)' },
    ],
    requestBody: `{
  "name": "Sprint 13 Smoke Tests",
  "test_case_ids": ["tc_001", "tc_002", "tc_005", "tc_010"],
  "milestone_id": "ms_v2"
}`,
    responseBody: `{
  "data": {
    "id": "run_502",
    "name": "Sprint 13 Smoke Tests",
    "status": "active",
    "total": 4,
    "passed": 0,
    "failed": 0,
    "blocked": 0,
    "retest": 0,
    "not_tested": 4,
    "milestone_id": "ms_v2",
    "created_by": "user_abc",
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
}`,
  },
  {
    method: 'PATCH',
    methodColor: 'bg-amber-100 text-amber-700',
    path: '/v1/projects/:pid/runs/:id',
    description: 'Update an existing test run. You can rename the run or change the linked milestone.',
    comingSoon: true,
    params: [
      { name: 'name', type: 'string', required: false, description: 'Updated run name' },
      { name: 'milestone_id', type: 'string', required: false, description: 'Updated milestone link (set to null to unlink)' },
    ],
    requestBody: `{
  "name": "Sprint 13 Smoke Tests (Final)"
}`,
    responseBody: `{
  "data": {
    "id": "run_502",
    "name": "Sprint 13 Smoke Tests (Final)",
    "status": "active",
    "updated_at": "2026-03-29T11:00:00Z"
  }
}`,
  },
  {
    method: 'POST',
    methodColor: 'bg-blue-100 text-blue-700',
    path: '/v1/projects/:pid/runs/:id/close',
    description: 'Close a test run. Once closed, no further result updates can be made. The run becomes read-only and its pass rate is finalized.',
    comingSoon: true,
    responseBody: `{
  "data": {
    "id": "run_502",
    "name": "Sprint 13 Smoke Tests (Final)",
    "status": "closed",
    "total": 4,
    "passed": 3,
    "failed": 1,
    "blocked": 0,
    "retest": 0,
    "not_tested": 0,
    "pass_rate": 75.0,
    "closed_at": "2026-03-29T15:00:00Z",
    "updated_at": "2026-03-29T15:00:00Z"
  }
}`,
  },
];

export default function TestRunsApiPage() {
  return (
    <DocsLayout
      title="Test Runs API | API Reference | Testably"
      description="Manage test runs via the Testably API. Create, list, update, and close runs."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/docs/api" className="hover:text-indigo-600 transition-colors">API Reference</a>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Runs</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Runs API</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Create and manage test runs. List runs with status summaries, create new runs from test case selections, and close completed runs.
        </p>
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
          <i className="ri-link text-gray-400 text-sm" />
          <span className="text-sm text-gray-500">Base URL:</span>
          <code className="text-sm font-mono text-indigo-600 font-medium">https://api.testably.app/v1</code>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-8">
        {endpoints.map((ep, idx) => (
          <section key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${ep.methodColor}`}>
                {ep.method}
              </span>
              <code className="text-sm font-mono text-gray-800 font-medium">{ep.path}</code>
              {ep.comingSoon && (
                <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-medium">
                  <i className="ri-time-line text-xs" />
                  Coming Soon
                </span>
              )}
            </div>

            <div className="px-6 py-5 space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed">{ep.description}</p>

              {/* Parameters table */}
              {ep.params && ep.params.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Parameters</h4>
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Required</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.params.map((p) => (
                          <tr key={p.name} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2.5"><code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{p.name}</code></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{p.type}</td>
                            <td className="px-4 py-2.5">
                              {p.required ? (
                                <span className="text-xs font-medium text-red-600">Required</span>
                              ) : (
                                <span className="text-xs text-gray-400">Optional</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request body */}
              {ep.requestBody && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Request Body</h4>
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <pre className="p-4 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{ep.requestBody}</pre>
                  </div>
                </div>
              )}

              {/* Response */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Response</h4>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <pre className="p-4 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{ep.responseBody}</pre>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-gray-100 mt-10">
        <a href="/docs/api/test-cases" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          <i className="ri-arrow-left-line" />
          Test Cases API
        </a>
        <a href="/docs/api/test-results" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Test Results API
          <i className="ri-arrow-right-line" />
        </a>
      </div>
    </DocsLayout>
  );
}
