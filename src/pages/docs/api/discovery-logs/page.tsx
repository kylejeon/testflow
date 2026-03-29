import DocsLayout from '../../../../components/docs/DocsLayout';

/* ---------- badge helpers ---------- */
const methodBadge = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 border-green-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
    PATCH: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${colors[method] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {method}
    </span>
  );
};

const comingSoonBadge = (
  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 ml-2">
    Coming Soon
  </span>
);

/* ---------- reusable components ---------- */
const CodeBlock = ({ title, children }: { title: string; children: string }) => (
  <div className="bg-gray-950 rounded-xl overflow-hidden my-4">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
      <i className="ri-terminal-line text-indigo-400 text-sm" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
    </div>
    <pre className="p-4 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{children}</pre>
  </div>
);

const ParamTable = ({ params }: { params: { name: string; type: string; required?: boolean; desc: string }[] }) => (
  <div className="overflow-x-auto my-4">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-2 pr-4 font-semibold text-gray-900">Parameter</th>
          <th className="text-left py-2 pr-4 font-semibold text-gray-900">Type</th>
          <th className="text-left py-2 pr-4 font-semibold text-gray-900">Required</th>
          <th className="text-left py-2 font-semibold text-gray-900">Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map((p) => (
          <tr key={p.name} className="border-b border-gray-100">
            <td className="py-2 pr-4 font-mono text-indigo-600 text-xs">{p.name}</td>
            <td className="py-2 pr-4 text-gray-500">{p.type}</td>
            <td className="py-2 pr-4">{p.required ? <span className="text-red-500 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
            <td className="py-2 text-gray-600">{p.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SectionDivider = () => <hr className="my-10 border-gray-200" />;

/* ---------- page ---------- */
export default function DiscoveryLogsApiPage() {
  return (
    <DocsLayout
      title="Discovery Logs API | Testably"
      description="Manage discovery sessions and log entries. Capture notes, bugs, observations, and questions during exploratory testing."
    >
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <i className="ri-search-eye-line text-indigo-600 text-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Discovery Logs</h1>
        </div>
        <p className="text-gray-500 text-lg leading-relaxed">
          Capture findings during exploratory testing sessions. Log notes, bugs, observations, and questions, then convert promising entries into test cases.
        </p>
      </div>

      {/* Log types overview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-10">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Log entry types</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: 'note', icon: 'ri-sticky-note-line', color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'General observation or note' },
            { type: 'bug', icon: 'ri-bug-line', color: 'text-red-600 bg-red-50 border-red-200', desc: 'Potential or confirmed bug' },
            { type: 'observation', icon: 'ri-eye-line', color: 'text-amber-600 bg-amber-50 border-amber-200', desc: 'Behavioral observation' },
            { type: 'question', icon: 'ri-question-line', color: 'text-purple-600 bg-purple-50 border-purple-200', desc: 'Open question to investigate' },
          ].map((t) => (
            <div key={t.type} className={`rounded-lg border p-3 ${t.color}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <i className={`${t.icon} text-sm`} />
                <span className="text-xs font-bold uppercase">{t.type}</span>
              </div>
              <p className="text-xs opacity-80">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Endpoint 1: List sessions ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('GET')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/sessions</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">List discovery sessions</h2>
        <p className="text-gray-500 mb-4">Retrieve all discovery sessions for a project.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Query parameters</h4>
        <ParamTable
          params={[
            { name: 'page', type: 'number', desc: 'Page number for pagination (default: 1)' },
            { name: 'per_page', type: 'number', desc: 'Items per page (default: 20, max: 100)' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "https://api.testably.app/v1/projects/proj_abc123/sessions"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "data": [
    {
      "id": "sess_001",
      "title": "Checkout flow exploration",
      "description": "Testing edge cases in the payment checkout",
      "log_count": 12,
      "created_by": "user_42",
      "created_at": "2026-03-28T14:00:00Z",
      "updated_at": "2026-03-28T16:30:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 1 }
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 2: Create session ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('POST')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/sessions</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Create session</h2>
        <p className="text-gray-500 mb-4">Start a new discovery session for exploratory testing.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'title', type: 'string', required: true, desc: 'Session title' },
            { name: 'description', type: 'string', desc: 'Optional session description or charter' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X POST \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "title": "Mobile responsive testing",
       "description": "Testing all pages on iOS Safari and Android Chrome"
     }' \\
     "https://api.testably.app/v1/projects/proj_abc123/sessions"`}
        </CodeBlock>

        <CodeBlock title="Response  201 Created">
{`{
  "id": "sess_002",
  "title": "Mobile responsive testing",
  "description": "Testing all pages on iOS Safari and Android Chrome",
  "log_count": 0,
  "created_by": "user_42",
  "created_at": "2026-03-29T09:00:00Z",
  "updated_at": "2026-03-29T09:00:00Z"
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 3: List logs in session ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('GET')}
          <code className="text-sm font-mono text-gray-800">/v1/sessions/:session_id/logs</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">List logs in session</h2>
        <p className="text-gray-500 mb-4">Retrieve all log entries within a session. Optionally filter by log type.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Query parameters</h4>
        <ParamTable
          params={[
            { name: 'type', type: 'string', desc: 'Filter by log type: note, bug, observation, or question' },
            { name: 'page', type: 'number', desc: 'Page number for pagination (default: 1)' },
            { name: 'per_page', type: 'number', desc: 'Items per page (default: 20, max: 100)' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "https://api.testably.app/v1/sessions/sess_001/logs?type=bug"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "data": [
    {
      "id": "log_001",
      "type": "bug",
      "content": "Payment form does not validate expiry date in MM/YY format",
      "screenshot_url": "https://cdn.testably.app/screenshots/log_001.png",
      "converted_to_tc": null,
      "created_by": "user_42",
      "created_at": "2026-03-28T14:12:00Z"
    },
    {
      "id": "log_003",
      "type": "bug",
      "content": "Discount code field accepts negative values",
      "screenshot_url": null,
      "converted_to_tc": "tc_205",
      "created_by": "user_42",
      "created_at": "2026-03-28T14:45:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 2 }
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 4: Add log entry ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('POST')}
          <code className="text-sm font-mono text-gray-800">/v1/sessions/:session_id/logs</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Add log entry</h2>
        <p className="text-gray-500 mb-4">Add a new log entry to a discovery session.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'type', type: 'string', required: true, desc: 'Log type: note, bug, observation, or question' },
            { name: 'content', type: 'string', required: true, desc: 'Log entry content (supports Markdown)' },
            { name: 'screenshot_url', type: 'string', desc: 'URL to an attached screenshot' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X POST \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "type": "observation",
       "content": "Loading spinner persists for 5+ seconds on slow 3G",
       "screenshot_url": "https://cdn.testably.app/screenshots/obs_001.png"
     }' \\
     "https://api.testably.app/v1/sessions/sess_001/logs"`}
        </CodeBlock>

        <CodeBlock title="Response  201 Created">
{`{
  "id": "log_013",
  "type": "observation",
  "content": "Loading spinner persists for 5+ seconds on slow 3G",
  "screenshot_url": "https://cdn.testably.app/screenshots/obs_001.png",
  "converted_to_tc": null,
  "created_by": "user_42",
  "created_at": "2026-03-29T09:20:00Z"
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 5: Convert log to test case ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('POST')}
          <code className="text-sm font-mono text-gray-800">/v1/sessions/:session_id/logs/:log_id/convert</code>
          {comingSoonBadge}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Convert log to test case</h2>
        <p className="text-gray-500 mb-4">
          Convert a discovery log entry into a formal test case. The log content is used as the test case description. The original log is updated with a reference to the new test case.
        </p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'title', type: 'string', desc: 'Test case title (defaults to first line of log content)' },
            { name: 'folder_id', type: 'string', desc: 'Target folder for the new test case' },
            { name: 'priority', type: 'string', desc: 'Priority: low, medium, high, critical' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X POST \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "title": "Verify expiry date validation in payment form",
       "folder_id": "folder_checkout",
       "priority": "high"
     }' \\
     "https://api.testably.app/v1/sessions/sess_001/logs/log_001/convert"`}
        </CodeBlock>

        <CodeBlock title="Response  201 Created">
{`{
  "test_case": {
    "id": "tc_210",
    "title": "Verify expiry date validation in payment form",
    "description": "Payment form does not validate expiry date in MM/YY format",
    "priority": "high",
    "folder_id": "folder_checkout",
    "created_at": "2026-03-29T09:30:00Z"
  },
  "log": {
    "id": "log_001",
    "converted_to_tc": "tc_210"
  }
}`}
        </CodeBlock>
      </section>

      {/* Error reference */}
      <div className="mt-10 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <i className="ri-error-warning-line text-amber-500" />
          Error responses
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900">Status</th>
                <th className="text-left py-2 font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">400</td><td className="py-2 text-gray-600">Invalid request body or query parameters</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">401</td><td className="py-2 text-gray-600">Missing or invalid API token</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">403</td><td className="py-2 text-gray-600">Insufficient permissions</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">404</td><td className="py-2 text-gray-600">Session or log entry not found</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">409</td><td className="py-2 text-gray-600">Log entry already converted to a test case</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs text-red-600">429</td><td className="py-2 text-gray-600">Rate limit exceeded (60 req/min)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </DocsLayout>
  );
}
