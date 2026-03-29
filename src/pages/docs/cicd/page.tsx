import { useState } from 'react';
import { Link } from 'react-router-dom';
import DocsLayout from '../../../components/docs/DocsLayout';

type CITab = 'github' | 'gitlab' | 'python';

const ghWorkflow = `name: Testably Upload

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run tests
        run: npm test

      - name: Upload results to Testably
        run: |
          curl -X POST "\${{ secrets.TESTABLY_URL }}/v1/results" \\
            -H "Authorization: Bearer \${{ secrets.TESTABLY_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "run_id": "run_abc123",
              "results": [
                {
                  "test_case_id": "TC-001",
                  "status": "passed"
                },
                {
                  "test_case_id": "TC-002",
                  "status": "failed",
                  "comment": "Assertion error on line 42"
                }
              ]
            }'`;

const gitlabCI = `stages:
  - test
  - upload-results

test:
  stage: test
  script:
    - npm test

upload-results:
  stage: upload-results
  script:
    - |
      curl -X POST "\${TESTABLY_URL}/v1/results" \\
        -H "Authorization: Bearer \${TESTABLY_TOKEN}" \\
        -H "Content-Type: application/json" \\
        -d '{
          "run_id": "run_abc123",
          "results": [
            {
              "test_case_id": "TC-001",
              "status": "passed"
            },
            {
              "test_case_id": "TC-002",
              "status": "failed",
              "comment": "Timeout on login page"
            }
          ]
        }'
  when: always`;

const pythonFunction = `import requests
import os

TESTABLY_URL = os.environ["TESTABLY_URL"]
TESTABLY_TOKEN = os.environ["TESTABLY_TOKEN"]

def report_result(run_id: str, test_case_id: str, status: str, comment: str = ""):
    """Report a single test result to Testably."""
    response = requests.post(
        f"{TESTABLY_URL}/v1/results",
        headers={
            "Authorization": f"Bearer {TESTABLY_TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "run_id": run_id,
            "results": [
                {
                    "test_case_id": test_case_id,
                    "status": status,
                    "comment": comment,
                }
            ],
        },
    )
    response.raise_for_status()
    return response.json()


# Usage
report_result("run_abc123", "TC-001", "passed")
report_result("run_abc123", "TC-002", "failed", "Login button not found")`;

const pythonConftest = `# conftest.py
import os
import requests
import pytest

TESTABLY_URL = os.environ.get("TESTABLY_URL", "")
TESTABLY_TOKEN = os.environ.get("TESTABLY_TOKEN", "")
RUN_ID = os.environ.get("TESTABLY_RUN_ID", "")

collected_results: list[dict] = []

def pytest_runtest_makereport(item, call):
    """Collect test results after each test execution."""
    if call.when == "call":
        tc_id = item.get_closest_marker("testably")
        if tc_id:
            status = "passed" if call.excinfo is None else "failed"
            collected_results.append({
                "test_case_id": tc_id.args[0],
                "status": status,
                "comment": str(call.excinfo.value) if call.excinfo else "",
            })

def pytest_sessionfinish(session, exitstatus):
    """Upload all collected results to Testably after the session ends."""
    if not collected_results or not TESTABLY_URL:
        return

    requests.post(
        f"{TESTABLY_URL}/v1/results",
        headers={
            "Authorization": f"Bearer {TESTABLY_TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "run_id": RUN_ID,
            "results": collected_results,
        },
    )

# --- In your test files, mark tests with @pytest.mark.testably("TC-XXX") ---
#
# @pytest.mark.testably("TC-001")
# def test_login():
#     assert login("user", "pass") is True
#
# @pytest.mark.testably("TC-002")
# def test_dashboard_loads():
#     assert dashboard.status_code == 200`;

const statusValues = [
  { value: 'passed', desc: 'Test executed successfully', color: 'bg-green-100 text-green-700' },
  { value: 'failed', desc: 'Test did not meet expected result', color: 'bg-red-100 text-red-700' },
  { value: 'blocked', desc: 'Test could not be executed due to a dependency', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'retest', desc: 'Test needs to be re-executed', color: 'bg-blue-100 text-blue-700' },
];

export default function CICDPage() {
  const [activeTab, setActiveTab] = useState<CITab>('github');

  const tabs: { key: CITab; label: string; icon: string }[] = [
    { key: 'github', label: 'GitHub Actions', icon: 'ri-github-line' },
    { key: 'gitlab', label: 'GitLab CI', icon: 'ri-gitlab-line' },
    { key: 'python', label: 'Python (pytest)', icon: 'ri-code-s-slash-line' },
  ];

  return (
    <DocsLayout
      title="CI/CD Integration | Testably Docs"
      description="Integrate Testably with your CI/CD pipeline. GitHub Actions, GitLab CI, and Python examples."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">CI/CD Integration</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">CI/CD Integration Guide</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Automatically upload test results from your CI/CD pipeline to Testably. Supports GitHub Actions, GitLab CI, and Python-based workflows.
        </p>
      </div>

      {/* Prerequisites */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-settings-3-line text-indigo-500" />
            Prerequisites
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Create an API Token</p>
                <p className="text-gray-500 text-sm mt-1">
                  Go to <span className="font-medium text-gray-700">Settings &rarr; API &amp; Tokens</span> in your Testably project and generate a new token. Copy it immediately &mdash; it will not be shown again.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Register Environment Variables</p>
                <p className="text-gray-500 text-sm mt-1">
                  Add the following environment variables to your CI/CD system:
                </p>
                <div className="mt-2 bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 overflow-x-auto">
                  <div><span className="text-indigo-400">TESTABLY_URL</span>=https://api.testably.app</div>
                  <div><span className="text-indigo-400">TESTABLY_TOKEN</span>=your_api_token_here</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <section className="mb-10">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`${tab.icon} text-base`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* GitHub Actions */}
        {activeTab === 'github' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-github-line text-gray-700" />
              GitHub Actions
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Add Secrets</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Go to your GitHub repository &rarr; <span className="font-medium text-gray-700">Settings &rarr; Secrets and variables &rarr; Actions</span>. Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_URL</code> and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_TOKEN</code>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Create Workflow</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Create <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">.github/workflows/testably.yml</code> with the following content:
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 border-b border-gray-700">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">YAML</span>
                <span className="text-xs text-gray-600 ml-auto">.github/workflows/testably.yml</span>
              </div>
              <pre className="bg-gray-900 text-gray-300 rounded-b-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre">{ghWorkflow}</pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <i className="ri-information-line text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Parameters</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-xs">run_id</code> &mdash; The ID of the test run in Testably (e.g. <code className="font-mono text-xs">run_abc123</code>)</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-xs">test_case_id</code> &mdash; The Testably test case ID (e.g. <code className="font-mono text-xs">TC-001</code>)</li>
                    <li><code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-xs">status</code> &mdash; One of: <code className="font-mono text-xs">passed</code>, <code className="font-mono text-xs">failed</code>, <code className="font-mono text-xs">blocked</code>, <code className="font-mono text-xs">retest</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GitLab CI */}
        {activeTab === 'gitlab' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-gitlab-line text-orange-500" />
              GitLab CI
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Add CI/CD Variables</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Go to your GitLab project &rarr; <span className="font-medium text-gray-700">Settings &rarr; CI/CD &rarr; Variables</span>. Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_URL</code> and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_TOKEN</code> (mark token as masked).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Add to .gitlab-ci.yml</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Add the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">upload-results</code> stage to your pipeline configuration:
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 border-b border-gray-700">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">YAML</span>
                <span className="text-xs text-gray-600 ml-auto">.gitlab-ci.yml</span>
              </div>
              <pre className="bg-gray-900 text-gray-300 rounded-b-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre">{gitlabCI}</pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <i className="ri-information-line text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700">
                  The <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-xs">when: always</code> directive ensures results are uploaded even when tests fail, so you always have complete reporting in Testably.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Python */}
        {activeTab === 'python' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i className="ri-code-s-slash-line text-indigo-500" />
              Python (pytest)
            </h2>

            {/* Method 1 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 rounded text-xs font-bold text-gray-600">1</span>
                Function-based reporting
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                A simple helper function you can call after each test to report results manually.
              </p>
              <div className="rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 border-b border-gray-700">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Python</span>
                  <span className="text-xs text-gray-600 ml-auto">report_result.py</span>
                </div>
                <pre className="bg-gray-900 text-gray-300 rounded-b-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre">{pythonFunction}</pre>
              </div>
            </div>

            {/* Method 2 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 rounded text-xs font-bold text-gray-600">2</span>
                Automatic collection with conftest.py
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Use pytest hooks to automatically collect and upload results at the end of a test session. Mark each test with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">@pytest.mark.testably("TC-XXX")</code>.
              </p>
              <div className="rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 border-b border-gray-700">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Python</span>
                  <span className="text-xs text-gray-600 ml-auto">conftest.py</span>
                </div>
                <pre className="bg-gray-900 text-gray-300 rounded-b-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre">{pythonConftest}</pre>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <i className="ri-alert-line text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Make sure to install the <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">requests</code> library: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">pip install requests</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Common Reference */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="ri-book-read-line text-indigo-500" />
            Common Reference
          </h2>

          {/* Status values */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Status Values</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-600">Value</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {statusValues.map((s, i) => (
                    <tr key={s.value} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="py-2 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>{s.value}</span>
                      </td>
                      <td className="py-2 text-gray-600">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* How to get run_id */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">How to get run_id</h3>
            <p className="text-gray-500 text-sm mb-2">
              You can find the run ID in two ways:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Open a Test Run in Testably &mdash; the ID is shown in the URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">/runs/<span className="text-indigo-600">run_abc123</span></code></li>
              <li>Use the <Link to="/docs/api/test-runs" className="text-indigo-600 hover:underline">Create Run API</Link> to create a run programmatically and receive the <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">run_id</code> in the response.</li>
            </ol>
          </div>

          {/* TC ID format */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Test Case ID Format</h3>
            <p className="text-gray-500 text-sm">
              Test case IDs follow the format <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">TC-XXX</code> where <code className="font-mono text-xs">XXX</code> is a sequential number. You can find the ID in the test case detail view or export your test cases via <Link to="/docs/import-export" className="text-indigo-600 hover:underline">CSV export</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Next steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Next Steps</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/docs/webhooks"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-webhook-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Webhooks</p>
              <p className="text-xs text-gray-500">Get notified when runs complete</p>
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
