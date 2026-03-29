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

const statusValues = [
  { value: 'passed', color: 'bg-green-100 text-green-700', description: 'Test case executed successfully, all assertions met' },
  { value: 'failed', color: 'bg-red-100 text-red-700', description: 'Test case did not meet expected outcome' },
  { value: 'blocked', color: 'bg-orange-100 text-orange-700', description: 'Test case could not be executed due to a dependency or environment issue' },
  { value: 'retest', color: 'bg-purple-100 text-purple-700', description: 'Test case needs to be re-executed (e.g., after a fix)' },
  { value: 'not_tested', color: 'bg-gray-100 text-gray-600', description: 'Test case has not been executed yet (default status)' },
];

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    methodColor: 'bg-green-100 text-green-700',
    path: '/v1/runs/:rid/results',
    description: 'List all test results for a specific run. Each result includes the test case reference, current status, optional note, elapsed time, and who tested it.',
    responseBody: `{
  "data": [
    {
      "id": "res_001",
      "test_case_id": "tc_001",
      "test_case_title": "Login with valid credentials",
      "status": "passed",
      "note": "Verified on Chrome 120 and Firefox 121",
      "elapsed": 45,
      "tested_by": "user_xyz",
      "tested_at": "2026-03-26T10:15:00Z"
    },
    {
      "id": "res_002",
      "test_case_id": "tc_002",
      "test_case_title": "Login with invalid password",
      "status": "failed",
      "note": "Error toast not showing — see screenshot",
      "elapsed": 30,
      "tested_by": "user_xyz",
      "tested_at": "2026-03-26T10:20:00Z"
    },
    {
      "id": "res_003",
      "test_case_id": "tc_005",
      "test_case_title": "Password reset flow",
      "status": "not_tested",
      "note": null,
      "elapsed": null,
      "tested_by": null,
      "tested_at": null
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "per_page": 20
  }
}`,
  },
  {
    method: 'PUT',
    methodColor: 'bg-amber-100 text-amber-700',
    path: '/v1/runs/:rid/results/:id',
    description: 'Update a single test result. Set the status, optionally add a note and elapsed time in seconds. The authenticated user is recorded as the tester.',
    comingSoon: true,
    params: [
      { name: 'status', type: 'string', required: true, description: 'Result status: passed, failed, blocked, retest, not_tested' },
      { name: 'note', type: 'string', required: false, description: 'Optional note or comment about the result' },
      { name: 'elapsed', type: 'integer', required: false, description: 'Time spent testing in seconds' },
    ],
    requestBody: `{
  "status": "failed",
  "note": "Button click does not trigger form submit on Safari 17",
  "elapsed": 120
}`,
    responseBody: `{
  "data": {
    "id": "res_002",
    "test_case_id": "tc_002",
    "test_case_title": "Login with invalid password",
    "status": "failed",
    "note": "Button click does not trigger form submit on Safari 17",
    "elapsed": 120,
    "tested_by": "user_xyz",
    "tested_at": "2026-03-29T14:30:00Z"
  }
}`,
  },
  {
    method: 'POST',
    methodColor: 'bg-blue-100 text-blue-700',
    path: '/v1/runs/:rid/results/bulk',
    description: 'Bulk upload test results, designed for CI/CD pipeline integration. Submit multiple results in a single request. Each result is matched by test_case_id within the run.',
    comingSoon: true,
    params: [
      { name: 'results', type: 'array', required: true, description: 'Array of result objects to upload' },
      { name: 'results[].test_case_id', type: 'string', required: true, description: 'Test case ID to match within the run' },
      { name: 'results[].status', type: 'string', required: true, description: 'Result status: passed, failed, blocked, retest, not_tested' },
      { name: 'results[].note', type: 'string', required: false, description: 'Optional note or error message' },
      { name: 'results[].elapsed', type: 'integer', required: false, description: 'Time spent in seconds' },
    ],
    requestBody: `{
  "results": [
    {
      "test_case_id": "tc_001",
      "status": "passed",
      "elapsed": 12
    },
    {
      "test_case_id": "tc_002",
      "status": "failed",
      "note": "AssertionError: expected 200 but got 500",
      "elapsed": 8
    },
    {
      "test_case_id": "tc_005",
      "status": "passed",
      "elapsed": 23
    },
    {
      "test_case_id": "tc_010",
      "status": "blocked",
      "note": "Staging DB unavailable"
    }
  ]
}`,
    responseBody: `{
  "data": {
    "updated": 4,
    "results": [
      { "test_case_id": "tc_001", "status": "passed" },
      { "test_case_id": "tc_002", "status": "failed" },
      { "test_case_id": "tc_005", "status": "passed" },
      { "test_case_id": "tc_010", "status": "blocked" }
    ]
  }
}`,
  },
];

export default function TestResultsApiPage() {
  return (
    <DocsLayout
      title="Test Results API | API Reference | Testably"
      description="Manage test results via the Testably API. Update results and bulk upload from CI/CD."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/docs/api" className="hover:text-indigo-600 transition-colors">API Reference</a>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Results</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Results API</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          View and update individual test results, or bulk upload results from your CI/CD pipeline.
        </p>
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
          <i className="ri-link text-gray-400 text-sm" />
          <span className="text-sm text-gray-500">Base URL:</span>
          <code className="text-sm font-mono text-indigo-600 font-medium">https://api.testably.app/v1</code>
        </div>
      </div>

      {/* Status Values Reference */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-list-check-2 text-indigo-500" />
          Status Values
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {statusValues.map((s) => (
                <tr key={s.value} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${s.color}`}>
                      {s.value}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-sm">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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

      {/* CI/CD Integration Tip */}
      <div className="mt-10 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="font-semibold text-indigo-900 text-sm mb-2 flex items-center gap-2">
          <i className="ri-lightbulb-line text-indigo-500" />
          CI/CD Integration Tip
        </h3>
        <p className="text-sm text-indigo-700 leading-relaxed">
          Use the bulk upload endpoint (<code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">POST /v1/runs/:rid/results/bulk</code>) to push automated test results from your CI pipeline.
          Create a run before your test suite executes, then upload all results in a single request when tests complete.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-gray-100 mt-10">
        <a href="/docs/api/test-runs" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          <i className="ri-arrow-left-line" />
          Test Runs API
        </a>
        <div />
      </div>
    </DocsLayout>
  );
}
