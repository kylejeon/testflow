import { Link } from 'react-router-dom';
import DocsLayout from '../../../components/docs/DocsLayout';

const troubleshooting = [
  {
    problem: 'Connection test fails',
    icon: 'ri-wifi-off-line',
    solutions: [
      'Verify your Jira domain is correct (e.g. yourcompany.atlassian.net)',
      'Check that the email matches your Atlassian account email',
      'Ensure the API token has not expired \u2014 regenerate if needed',
      'Confirm your network allows outbound HTTPS to Atlassian',
    ],
  },
  {
    problem: 'Permission errors when creating issues',
    icon: 'ri-lock-line',
    solutions: [
      'The Jira user must have "Create Issues" permission in the target project',
      'Check that the project key exists and is accessible',
      'Verify the API token belongs to a user with project-level access',
    ],
  },
  {
    problem: 'Issue type not appearing',
    icon: 'ri-file-unknow-line',
    solutions: [
      'Only standard issue types are supported (Bug, Task, Story)',
      'Custom issue types may not appear \u2014 contact support if needed',
      'Ensure the issue type is available in the target Jira project scheme',
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <DocsLayout
      title="Jira Integration | Testably Docs"
      description="Connect Testably with Jira Cloud to create issues from failed test results automatically."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/docs" className="hover:text-indigo-600 transition-colors">Docs</Link>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Jira Integration</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Jira Integration Guide</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Connect Testably with Jira Cloud to streamline your bug tracking workflow. Create Jira issues directly from failed test results.
        </p>
      </div>

      {/* Tier callout */}
      <section className="mb-10">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-vip-crown-line text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Starter Plan or Above Required</p>
              <p className="text-sm text-blue-700 mt-1">
                Jira integration is available on the Starter plan and above. <Link to="/pricing" className="underline font-medium hover:text-blue-900">View pricing</Link> to upgrade your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prerequisites */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i className="ri-checkbox-circle-line text-indigo-500" />
            Prerequisites
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Jira Cloud Account</p>
                <p className="text-gray-500 text-sm mt-1">
                  You need an active Jira Cloud instance (e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">yourcompany.atlassian.net</code>). Jira Data Center / Server is not currently supported.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Create a Jira API Token</p>
                <p className="text-gray-500 text-sm mt-1">
                  Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">id.atlassian.com &rarr; API Tokens</a> and create a new token. Copy it immediately &mdash; it cannot be viewed again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-plug-line text-indigo-500" />
            Setup
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Connect your Jira Cloud instance to Testably in a few steps.
          </p>

          <div className="space-y-5">
            {[
              {
                num: 1,
                title: 'Open Integrations',
                desc: 'In Testably, go to Settings \u2192 Integrations and click on the Jira card.',
              },
              {
                num: 2,
                title: 'Enter Credentials',
                desc: 'Fill in your Jira domain, account email, and the API token you created.',
                extra: (
                  <div className="mt-3 bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300 space-y-1">
                    <div><span className="text-gray-500">Domain:</span> <span className="text-indigo-400">yourcompany.atlassian.net</span></div>
                    <div><span className="text-gray-500">Email:</span>  <span className="text-indigo-400">you@company.com</span></div>
                    <div><span className="text-gray-500">Token:</span>  <span className="text-indigo-400">ATATT3x...your_token</span></div>
                  </div>
                ),
              },
              {
                num: 3,
                title: 'Select Default Issue Type',
                desc: 'Choose the Jira issue type to use when creating issues from failed tests (e.g. Bug, Task, Story).',
              },
              {
                num: 4,
                title: 'Test Connection',
                desc: 'Click Test Connection to verify Testably can communicate with your Jira instance. You should see a success confirmation.',
              },
              {
                num: 5,
                title: 'Save',
                desc: 'Click Save to activate the integration. A green "Connected" badge will appear on the Jira card.',
              },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">{step.num}</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{step.title}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{step.desc}</p>
                  {step.extra}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Usage */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-bug-line text-indigo-500" />
            Usage: Create Jira Issues from Failed Tests
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Once connected, you can create Jira issues directly from your test results.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Open a Test Run</p>
                <p className="text-gray-500 text-sm mt-0.5">Navigate to a completed or in-progress test run.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Find a Failed Result</p>
                <p className="text-gray-500 text-sm mt-0.5">Look for test cases with a <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded">failed</span> status.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Click "Create Jira Issue"</p>
                <p className="text-gray-500 text-sm mt-0.5">
                  A dialog will appear pre-filled with the test case title, steps, and failure details. Select the Jira project, adjust fields if needed, and submit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <div>
                <p className="text-gray-900 font-medium">Issue Created</p>
                <p className="text-gray-500 text-sm mt-0.5">
                  The Jira issue key (e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">PROJ-123</code>) will be linked to the test result for easy reference.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <i className="ri-check-line text-green-500 mt-0.5" />
              <p className="text-sm text-green-700">
                Linked Jira issues appear in the test result detail view, so your team always has context on reported bugs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <i className="ri-error-warning-line text-indigo-500" />
            Troubleshooting
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Common issues and how to resolve them.
          </p>

          <div className="space-y-4">
            {troubleshooting.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <i className={`${item.icon} text-red-500`} />
                  <h3 className="font-semibold text-gray-900">{item.problem}</h3>
                </div>
                <ul className="space-y-2">
                  {item.solutions.map((sol, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <i className="ri-arrow-right-s-line text-gray-400 mt-0.5 flex-shrink-0" />
                      {sol}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Related Guides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/docs/webhooks"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-webhook-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Webhooks</p>
              <p className="text-xs text-gray-500">Slack and Teams notifications</p>
            </div>
          </Link>
          <Link
            to="/docs/cicd"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <i className="ri-git-merge-line text-indigo-500 text-lg" />
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">CI/CD Integration</p>
              <p className="text-xs text-gray-500">Automate result uploads from pipelines</p>
            </div>
          </Link>
        </div>
      </div>
    </DocsLayout>
  );
}
