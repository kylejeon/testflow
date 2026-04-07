import { Link } from 'react-router-dom';
import DocsLayout from '../../../../components/docs/DocsLayout';

const requestParams = [
  { name: 'run_id', type: 'string', required: true, description: 'The test run ID to upload results into' },
  { name: 'results', type: 'array', required: false, description: 'Array of result objects (JSON format). Required if junit_xml is not provided.' },
  { name: 'results[].test_case_id', type: 'string', required: true, description: 'Test case ID to match within the run' },
  { name: 'results[].status', type: 'string', required: true, description: 'Result status: passed, failed, blocked, retest, not_tested' },
  { name: 'results[].note', type: 'string', required: false, description: 'Optional note or error message from the test' },
  { name: 'results[].elapsed', type: 'integer', required: false, description: 'Time spent in seconds' },
  { name: 'format', type: 'string', required: false, description: 'Input format: "json" (default) or "junit"' },
  { name: 'junit_xml', type: 'string', required: false, description: 'Raw JUnit XML string. Required if format is "junit".' },
  { name: 'dry_run', type: 'boolean', required: false, description: 'If true, validates the payload without persisting results. Defaults to false.' },
];

const errorCodes = [
  { code: '200', color: 'bg-green-100 text-green-700', title: 'OK', desc: 'All results uploaded successfully.' },
  { code: '207', color: 'bg-yellow-100 text-yellow-700', title: 'Multi-Status', desc: 'Partial success. Some results uploaded; see failed_count and errors array.' },
  { code: '400', color: 'bg-red-100 text-red-700', title: 'Bad Request', desc: 'Invalid payload structure, missing required fields, or unknown status value.' },
  { code: '401', color: 'bg-red-100 text-red-700', title: 'Unauthorized', desc: 'Missing or invalid Authorization header.' },
  { code: '403', color: 'bg-red-100 text-red-700', title: 'Forbidden', desc: 'Token does not have write access to this project.' },
  { code: '404', color: 'bg-red-100 text-red-700', title: 'Not Found', desc: 'run_id does not exist or does not belong to the authenticated project.' },
  { code: '429', color: 'bg-orange-100 text-orange-700', title: 'Too Many Requests', desc: 'Rate limit exceeded. Retry after the time specified in Retry-After header.' },
  { code: '500', color: 'bg-red-100 text-red-700', title: 'Internal Server Error', desc: 'Unexpected server error. Contact support if this persists.' },
];

const requestBodyJson = `{
  "run_id": "run_abc123",
  "format": "json",
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
      "status": "blocked",
      "note": "Staging DB unavailable"
    }
  ]
}`;

const requestBodyJunit = `{
  "run_id": "run_abc123",
  "format": "junit",
  "junit_xml": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<testsuites>\\n  <testsuite name=\\"Login Tests\\" tests=\\"3\\">\\n    <testcase name=\\"login with valid credentials\\" time=\\"0.012\\" />\\n    <testcase name=\\"login with invalid password\\" time=\\"0.008\\">\\n      <failure>AssertionError: expected 200 but got 500</failure>\\n    </testcase>\\n  </testsuite>\\n</testsuites>"
}`;

const responseSuccess = `{
  "success": true,
  "uploaded_count": 3,
  "failed_count": 0,
  "stats": {
    "passed": 2,
    "failed": 1,
    "blocked": 0,
    "retest": 0,
    "not_tested": 0
  }
}`;

const responsePartial = `{
  "success": false,
  "partial_failure": true,
  "uploaded_count": 2,
  "failed_count": 1,
  "stats": {
    "passed": 1,
    "failed": 1,
    "blocked": 0,
    "retest": 0,
    "not_tested": 0
  },
  "errors": [
    {
      "test_case_id": "tc_999",
      "error": "test_case_id not found in this run"
    }
  ]
}`;

const sdkSnippetPlaywright = `// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['@testably.kr/playwright-reporter', {
      token: process.env.TESTABLY_TOKEN,
      runId: process.env.TESTABLY_RUN_ID,
    }]
  ],
});`;

const sdkSnippetJest = `// jest.config.ts
export default {
  reporters: [
    'default',
    ['@testably.kr/jest-reporter', {
      token: process.env.TESTABLY_TOKEN,
      runId: process.env.TESTABLY_RUN_ID,
    }]
  ],
};`;

export default function CiUploadApiPage() {
  return (
    <DocsLayout
      title="CI/CD Results Upload API | API Reference | Testably"
      description="Upload test results from CI/CD pipelines to Testably. Supports JSON and JUnit XML formats."
    >
      {/* Breadcrumb */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs/api" className="hover:text-indigo-600 transition-colors">API Reference</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">CI/CD Results Upload</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">CI/CD Results Upload</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Push automated test results from your CI/CD pipeline into a Testably run. Supports JSON and JUnit XML formats. This endpoint is called automatically by the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">@testably.kr/playwright-reporter</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">@testably.kr/cypress-reporter</code>, and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">@testably.kr/jest-reporter</code> SDKs.
        </p>
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
          <i className="ri-link text-gray-400 text-sm" />
          <span className="text-sm text-gray-500">Base URL:</span>
          <code className="text-sm font-mono text-indigo-600 font-medium">https://api.testably.app/v1</code>
        </div>
      </div>

      {/* SDK Note */}
      <section className="mb-10">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-lightbulb-line text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-indigo-900 text-sm">SDK handles this automatically</p>
              <p className="text-sm text-indigo-700 mt-1 leading-relaxed">
                In most cases you do not need to call this endpoint directly. Install one of the reporter SDKs and configure your <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">TESTABLY_TOKEN</code> and <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">TESTABLY_RUN_ID</code> environment variables — the SDK will call this endpoint after your test suite finishes. Direct calls are for advanced use cases.
              </p>
              <Link to="/docs/cicd" className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-2">
                View SDK setup guide <i className="ri-arrow-right-line text-xs" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoint */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">POST</span>
            <code className="text-sm font-mono text-gray-800 font-medium">/v1/results</code>
          </div>
          <div className="px-6 py-5 space-y-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              Upload one or more test results into an existing run. Results are matched by <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">test_case_id</code>. Each upload is idempotent — re-uploading the same <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">test_case_id</code> overwrites the previous result.
            </p>

            {/* Auth */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Authentication</h4>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 font-mono text-sm text-gray-700">
                Authorization: Bearer <span className="text-indigo-600">{'<CI_TOKEN>'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Use a project-scoped CI token from Settings → API Tokens. The token must have write access to the target project.</p>
            </div>

            {/* Parameters */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Request Body Parameters</h4>
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
                    {requestParams.map((p) => (
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

            {/* Request body examples */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Example — JSON Format</h4>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{requestBodyJson}</pre>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Example — JUnit XML Format</h4>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{requestBodyJunit}</pre>
                </div>
              </div>
            </div>

            {/* Responses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Response — 200 Success</h4>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{responseSuccess}</pre>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Response — 207 Partial Failure</h4>
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{responsePartial}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limiting */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-time-line text-indigo-500" />
            Rate Limiting
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Limit</p>
              <p className="text-2xl font-bold text-gray-900">60</p>
              <p className="text-xs text-gray-500 mt-0.5">requests per minute per token</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payload Size</p>
              <p className="text-2xl font-bold text-gray-900">10 MB</p>
              <p className="text-xs text-gray-500 mt-0.5">max request body size</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">On Limit Exceeded</p>
              <p className="text-2xl font-bold text-gray-900">429</p>
              <p className="text-xs text-gray-500 mt-0.5">check Retry-After header</p>
            </div>
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-error-warning-line text-indigo-500" />
              Error Codes
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Meaning</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {errorCodes.map((e) => (
                <tr key={e.code} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${e.color}`}>{e.code}</span>
                  </td>
                  <td className="px-5 py-3 text-xs font-semibold text-gray-700">{e.title}</td>
                  <td className="px-5 py-3 text-xs text-gray-600 leading-relaxed">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SDK Snippets */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-terminal-line text-indigo-500" />
            Using the SDKs (Recommended)
          </h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Rather than calling this endpoint directly, use one of the reporter SDKs. They handle authentication, run creation, and result upload automatically.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playwright</span>
                <code className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">@testably.kr/playwright-reporter</code>
              </div>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{sdkSnippetPlaywright}</pre>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jest</span>
                <code className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">@testably.kr/jest-reporter</code>
              </div>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{sdkSnippetJest}</pre>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link to="/docs/cicd" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              <i className="ri-terminal-line text-sm" />
              Full SDK setup guide for Playwright, Cypress, and Jest
            </Link>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-gray-100">
        <Link to="/docs/api/test-results" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          <i className="ri-arrow-left-line" />
          Test Results API
        </Link>
        <Link to="/docs/api/milestones" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Milestones API
          <i className="ri-arrow-right-line" />
        </Link>
      </div>
    </DocsLayout>
  );
}
