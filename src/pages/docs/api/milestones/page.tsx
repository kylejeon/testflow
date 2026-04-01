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
export default function MilestonesApiPage() {
  return (
    <DocsLayout
      title="Milestones API | Testably"
      description="Create, list, update milestones and link test runs to release targets via the Testably REST API."
    >
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <i className="ri-flag-line text-indigo-600 text-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Milestones</h1>
        </div>
        <p className="text-gray-500 text-lg leading-relaxed">
          Create and manage milestones to track release targets. Link test runs, monitor progress, and organize sub-milestones.
        </p>
      </div>

      {/* Fields overview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-10">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Milestone object fields</h3>
        <ParamTable
          params={[
            { name: 'id', type: 'string', desc: 'Unique milestone identifier' },
            { name: 'name', type: 'string', required: true, desc: 'Milestone name' },
            { name: 'description', type: 'string', desc: 'Optional description' },
            { name: 'start_date', type: 'string (ISO 8601)', desc: 'Start date of the milestone' },
            { name: 'due_date', type: 'string (ISO 8601)', desc: 'Target due date' },
            { name: 'status', type: 'string', desc: 'One of: upcoming, started, past_due, completed. Read-only if sub milestones exist (auto-derived).' },
            { name: 'parent_milestone_id', type: 'string', desc: 'Parent milestone ID for sub-milestones (max 1 level nesting)' },
            { name: 'date_mode', type: 'string', desc: '"auto" = dates derived from sub milestones; "manual" = manually set. Default: "auto".' },
            { name: 'progress', type: 'number', desc: 'Completion percentage (0-100). Auto-aggregated from sub milestones if they exist.' },
            { name: 'created_at', type: 'string (ISO 8601)', desc: 'Creation timestamp' },
            { name: 'updated_at', type: 'string (ISO 8601)', desc: 'Last update timestamp' },
          ]}
        />
      </div>

      {/* ---- Endpoint 1: List milestones ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('GET')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/milestones</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">List milestones</h2>
        <p className="text-gray-500 mb-4">Retrieve all milestones for a project. Optionally filter by status.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Query parameters</h4>
        <ParamTable
          params={[
            { name: 'status', type: 'string', desc: 'Filter by status: active, completed, or archived' },
            { name: 'page', type: 'number', desc: 'Page number for pagination (default: 1)' },
            { name: 'per_page', type: 'number', desc: 'Items per page (default: 20, max: 100)' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "https://api.testably.app/v1/projects/proj_abc123/milestones?status=active"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "data": [
    {
      "id": "ms_001",
      "name": "v2.0 Release",
      "description": "Major release with new dashboard",
      "start_date": "2026-03-01T00:00:00Z",
      "due_date": "2026-04-15T00:00:00Z",
      "status": "active",
      "parent_id": null,
      "progress": 68,
      "created_at": "2026-02-28T10:00:00Z",
      "updated_at": "2026-03-28T14:22:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 1 }
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 2: Get milestone detail ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('GET')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/milestones/:id</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Get milestone detail</h2>
        <p className="text-gray-500 mb-4">Retrieve a single milestone including linked test runs and progress percentage.</p>

        <CodeBlock title="Request">
{`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "https://api.testably.app/v1/projects/proj_abc123/milestones/ms_001"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "id": "ms_001",
  "name": "v2.0 Release",
  "description": "Major release with new dashboard",
  "start_date": "2026-03-01T00:00:00Z",
  "due_date": "2026-04-15T00:00:00Z",
  "status": "active",
  "parent_id": null,
  "progress": 68,
  "linked_runs": [
    {
      "id": "run_101",
      "name": "Regression Suite",
      "status": "in_progress",
      "pass_rate": 72
    },
    {
      "id": "run_102",
      "name": "Smoke Test",
      "status": "completed",
      "pass_rate": 100
    }
  ],
  "sub_milestones": [
    {
      "id": "ms_002",
      "name": "v2.0 - API",
      "status": "completed",
      "progress": 100
    }
  ],
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-03-28T14:22:00Z"
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 3: Create milestone ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('POST')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/milestones</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Create milestone</h2>
        <p className="text-gray-500 mb-4">Create a new milestone. Provide a parent_id to create a sub-milestone.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'name', type: 'string', required: true, desc: 'Milestone name' },
            { name: 'description', type: 'string', desc: 'Optional description' },
            { name: 'start_date', type: 'string (ISO 8601)', desc: 'Start date' },
            { name: 'due_date', type: 'string (ISO 8601)', desc: 'Target due date' },
            { name: 'parent_id', type: 'string', desc: 'Parent milestone ID to create as sub-milestone' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X POST \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "name": "v2.1 Hotfix",
       "description": "Critical bug fixes",
       "due_date": "2026-04-20T00:00:00Z",
       "parent_id": "ms_001"
     }' \\
     "https://api.testably.app/v1/projects/proj_abc123/milestones"`}
        </CodeBlock>

        <CodeBlock title="Response  201 Created">
{`{
  "id": "ms_003",
  "name": "v2.1 Hotfix",
  "description": "Critical bug fixes",
  "start_date": null,
  "due_date": "2026-04-20T00:00:00Z",
  "status": "active",
  "parent_id": "ms_001",
  "progress": 0,
  "created_at": "2026-03-29T09:15:00Z",
  "updated_at": "2026-03-29T09:15:00Z"
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 4: Update milestone ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('PATCH')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/milestones/:id</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Update milestone</h2>
        <p className="text-gray-500 mb-4">Update milestone fields. Only include fields you want to change.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'name', type: 'string', desc: 'Updated milestone name' },
            { name: 'description', type: 'string', desc: 'Updated description' },
            { name: 'start_date', type: 'string (ISO 8601)', desc: 'Updated start date' },
            { name: 'due_date', type: 'string (ISO 8601)', desc: 'Updated due date' },
            { name: 'status', type: 'string', desc: 'Change status: active, completed, or archived' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X PATCH \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{ "status": "completed" }' \\
     "https://api.testably.app/v1/projects/proj_abc123/milestones/ms_001"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "id": "ms_001",
  "name": "v2.0 Release",
  "description": "Major release with new dashboard",
  "start_date": "2026-03-01T00:00:00Z",
  "due_date": "2026-04-15T00:00:00Z",
  "status": "completed",
  "parent_id": null,
  "progress": 100,
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-03-29T10:30:00Z"
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
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">404</td><td className="py-2 text-gray-600">Project or milestone not found</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs text-red-600">429</td><td className="py-2 text-gray-600">Rate limit exceeded (60 req/min)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </DocsLayout>
  );
}
