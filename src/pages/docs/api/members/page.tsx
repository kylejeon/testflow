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
export default function MembersApiPage() {
  return (
    <DocsLayout
      title="Members API | Testably"
      description="Manage project members, invite users, change roles, and remove members via the Testably REST API."
    >
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <i className="ri-team-line text-indigo-600 text-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        </div>
        <p className="text-gray-500 text-lg leading-relaxed">
          Manage project team members. Invite collaborators, assign roles, and control access permissions.
        </p>
      </div>

      {/* Role permissions table */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-10">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Role permissions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900">Permission</th>
                <th className="text-center py-2 px-4 font-semibold text-gray-900">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">admin</span>
                </th>
                <th className="text-center py-2 px-4 font-semibold text-gray-900">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">member</span>
                </th>
                <th className="text-center py-2 px-4 font-semibold text-gray-900">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">viewer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { perm: 'View test cases & runs', admin: true, member: true, viewer: true },
                { perm: 'Create & edit test cases', admin: true, member: true, viewer: false },
                { perm: 'Execute test runs', admin: true, member: true, viewer: false },
                { perm: 'Manage milestones', admin: true, member: true, viewer: false },
                { perm: 'Invite & remove members', admin: true, member: false, viewer: false },
                { perm: 'Change member roles', admin: true, member: false, viewer: false },
                { perm: 'Project settings', admin: true, member: false, viewer: false },
                { perm: 'Delete project', admin: true, member: false, viewer: false },
              ].map((row) => (
                <tr key={row.perm} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-700">{row.perm}</td>
                  <td className="py-2 px-4 text-center">{row.admin ? <i className="ri-check-line text-green-500" /> : <i className="ri-close-line text-gray-300" />}</td>
                  <td className="py-2 px-4 text-center">{row.member ? <i className="ri-check-line text-green-500" /> : <i className="ri-close-line text-gray-300" />}</td>
                  <td className="py-2 px-4 text-center">{row.viewer ? <i className="ri-check-line text-green-500" /> : <i className="ri-close-line text-gray-300" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Endpoint 1: List members ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('GET')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/members</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">List members</h2>
        <p className="text-gray-500 mb-4">Retrieve all members of a project including their role, email, and join date.</p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Query parameters</h4>
        <ParamTable
          params={[
            { name: 'role', type: 'string', desc: 'Filter by role: admin, member, or viewer' },
            { name: 'page', type: 'number', desc: 'Page number for pagination (default: 1)' },
            { name: 'per_page', type: 'number', desc: 'Items per page (default: 20, max: 100)' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "https://api.testably.app/v1/projects/proj_abc123/members"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "data": [
    {
      "id": "user_42",
      "email": "alice@example.com",
      "name": "Alice Kim",
      "avatar_url": "https://cdn.testably.app/avatars/user_42.png",
      "role": "admin",
      "joined_at": "2026-01-15T08:00:00Z"
    },
    {
      "id": "user_43",
      "email": "bob@example.com",
      "name": "Bob Park",
      "avatar_url": null,
      "role": "member",
      "joined_at": "2026-02-01T10:30:00Z"
    },
    {
      "id": "user_44",
      "email": "carol@example.com",
      "name": "Carol Lee",
      "avatar_url": null,
      "role": "viewer",
      "joined_at": "2026-03-10T14:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 3 }
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 2: Invite member ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('POST')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/members/invite</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invite member</h2>
        <p className="text-gray-500 mb-4">
          Send an invitation to join the project. The invited user receives an email with a join link. Requires <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">admin</span> role.
        </p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'email', type: 'string', required: true, desc: 'Email address to invite' },
            { name: 'role', type: 'string', required: true, desc: 'Assigned role: admin, member, or viewer' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X POST \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "email": "dave@example.com",
       "role": "member"
     }' \\
     "https://api.testably.app/v1/projects/proj_abc123/members/invite"`}
        </CodeBlock>

        <CodeBlock title="Response  201 Created">
{`{
  "id": "inv_001",
  "email": "dave@example.com",
  "role": "member",
  "status": "pending",
  "invited_by": "user_42",
  "expires_at": "2026-04-05T09:00:00Z",
  "created_at": "2026-03-29T09:00:00Z"
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 3: Change role ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('PATCH')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/members/:user_id</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Change member role</h2>
        <p className="text-gray-500 mb-4">
          Update a member's role. Requires <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">admin</span> role. You cannot change your own role if you are the last admin.
        </p>

        <h4 className="text-sm font-bold text-gray-900 mb-2">Request body</h4>
        <ParamTable
          params={[
            { name: 'role', type: 'string', required: true, desc: 'New role: admin, member, or viewer' },
          ]}
        />

        <CodeBlock title="Request">
{`curl -X PATCH \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{ "role": "admin" }' \\
     "https://api.testably.app/v1/projects/proj_abc123/members/user_43"`}
        </CodeBlock>

        <CodeBlock title="Response  200 OK">
{`{
  "id": "user_43",
  "email": "bob@example.com",
  "name": "Bob Park",
  "role": "admin",
  "joined_at": "2026-02-01T10:30:00Z",
  "updated_at": "2026-03-29T09:15:00Z"
}`}
        </CodeBlock>
      </section>

      <SectionDivider />

      {/* ---- Endpoint 4: Remove member ---- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {methodBadge('DELETE')}
          <code className="text-sm font-mono text-gray-800">/v1/projects/:project_id/members/:user_id</code>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Remove member</h2>
        <p className="text-gray-500 mb-4">
          Remove a member from the project. Requires <span className="inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">admin</span> role. You cannot remove yourself if you are the last admin.
        </p>

        <CodeBlock title="Request">
{`curl -X DELETE \\
     -H "Authorization: Bearer YOUR_API_TOKEN" \\
     "https://api.testably.app/v1/projects/proj_abc123/members/user_44"`}
        </CodeBlock>

        <CodeBlock title="Response  204 No Content">
{`(empty response body)`}
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
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">400</td><td className="py-2 text-gray-600">Invalid request body (e.g., invalid role value)</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">401</td><td className="py-2 text-gray-600">Missing or invalid API token</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">403</td><td className="py-2 text-gray-600">Insufficient permissions (admin role required)</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">404</td><td className="py-2 text-gray-600">Project or member not found</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">409</td><td className="py-2 text-gray-600">User already a member or pending invitation exists</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-4 font-mono text-xs text-red-600">422</td><td className="py-2 text-gray-600">Cannot remove or demote the last admin</td></tr>
              <tr><td className="py-2 pr-4 font-mono text-xs text-red-600">429</td><td className="py-2 text-gray-600">Rate limit exceeded (60 req/min)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </DocsLayout>
  );
}
