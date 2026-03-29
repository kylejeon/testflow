import DocsLayout from '../../../../components/docs/DocsLayout';

const curlExample = `curl -X GET https://api.testably.app/v1/projects \\
  -H "Authorization: Bearer testably_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json"`;

const fetchExample = `const response = await fetch('https://api.testably.app/v1/projects', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer testably_xxxxxxxxxxxx',
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);`;

const envExample = `# .env
TESTABLY_API_TOKEN=testably_xxxxxxxxxxxx`;

const gitignoreExample = `# .gitignore
.env
.env.local
.env.*.local`;

const errorCodes = [
  { code: '401', label: 'Unauthorized', color: 'text-red-600 bg-red-50', description: 'Invalid or missing API token. Check that your token is correct and included in the Authorization header.' },
  { code: '403', label: 'Forbidden', color: 'text-orange-600 bg-orange-50', description: 'Token does not have access to the requested resource. Verify the token has the required project scope.' },
  { code: '429', label: 'Too Many Requests', color: 'text-amber-600 bg-amber-50', description: 'Rate limit exceeded. You are allowed 60 requests per minute per token. Wait and retry with exponential backoff.' },
];

export default function AuthenticationPage() {
  return (
    <DocsLayout
      title="Authentication | API Reference | Testably"
      description="Learn how to authenticate with the Testably API using Bearer tokens."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/docs/api" className="hover:text-indigo-600 transition-colors">API Reference</a>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Authentication</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Authentication</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          All Testably API requests require authentication via Bearer token. Generate a token from your project settings and include it in every request.
        </p>
      </div>

      {/* API Key Generation */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-key-2-line text-indigo-500" />
          API Key Generation
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <ol className="space-y-4">
            {[
              { step: '1', icon: 'ri-settings-3-line', text: 'Navigate to Settings in your project' },
              { step: '2', icon: 'ri-key-line', text: 'Open the API & Tokens tab' },
              { step: '3', icon: 'ri-add-line', text: 'Click "New Token" button' },
              { step: '4', icon: 'ri-edit-line', text: 'Enter a descriptive name for your token (e.g., "CI Pipeline", "Local Dev")' },
              { step: '5', icon: 'ri-checkbox-circle-line', text: 'Click Create to generate the token' },
              { step: '6', icon: 'ri-file-copy-line', text: 'Copy the token immediately — it will only be shown once' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {item.step}
                </span>
                <div className="flex items-center gap-2">
                  <i className={`${item.icon} text-gray-400`} />
                  <span className="text-gray-700 text-sm">{item.text}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-2 font-medium">Token format:</p>
            <code className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded-md text-indigo-600">testably_xxxxxxxxxxxx</code>
          </div>
        </div>
      </section>

      {/* Bearer Token Usage */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-shield-keyhole-line text-indigo-500" />
          Bearer Token Usage
        </h2>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          Include your API token in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">Authorization</code> header of every request using the Bearer scheme.
        </p>

        <div className="space-y-4">
          {/* curl example */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
              <i className="ri-terminal-line text-indigo-400 text-sm" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">cURL</span>
            </div>
            <pre className="p-4 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{curlExample}</pre>
          </div>

          {/* JavaScript example */}
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
              <i className="ri-javascript-line text-yellow-400 text-sm" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">JavaScript (fetch)</span>
            </div>
            <pre className="p-4 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{fetchExample}</pre>
          </div>
        </div>
      </section>

      {/* Security Best Practices */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-lock-line text-indigo-500" />
          Security Best Practices
        </h2>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <i className="ri-error-warning-line text-amber-500 mt-0.5 flex-shrink-0" />
              <span>Never hardcode API tokens in your source code. Always use environment variables or secret management tools.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <i className="ri-file-shield-2-line text-green-500" />
                Use environment variables
              </h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <pre className="p-3 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{envExample}</pre>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <i className="ri-git-repository-line text-green-500" />
                Add .env to .gitignore
              </h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <pre className="p-3 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{gitignoreExample}</pre>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <i className="ri-cloud-line text-green-500" />
              CI/CD Secret Management
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <i className="ri-github-fill text-gray-700 text-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-900">GitHub Actions</p>
                  <p className="text-xs text-gray-500">Settings &rarr; Secrets &rarr; Actions</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <i className="ri-gitlab-fill text-orange-600 text-lg" />
                <div>
                  <p className="text-sm font-medium text-gray-900">GitLab CI</p>
                  <p className="text-xs text-gray-500">Settings &rarr; CI/CD &rarr; Variables</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-error-warning-line text-indigo-500" />
          Error Codes
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Code</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {errorCodes.map((err) => (
                <tr key={err.code} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${err.color}`}>
                      {err.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">{err.label}</td>
                  <td className="px-5 py-4 text-gray-500 leading-relaxed">{err.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Next Steps */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
        <div />
        <a href="/docs/api/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Projects API
          <i className="ri-arrow-right-line" />
        </a>
      </div>
    </DocsLayout>
  );
}
