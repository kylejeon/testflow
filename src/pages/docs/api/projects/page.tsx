import DocsLayout from '../../../../components/docs/DocsLayout';

interface Endpoint {
  method: string;
  methodColor: string;
  path: string;
  description: string;
  comingSoon?: boolean;
  requestBody?: string;
  responseBody: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    methodColor: 'bg-green-100 text-green-700',
    path: '/v1/projects',
    description: 'Returns a list of all projects accessible to the authenticated user. Results are sorted by most recently updated.',
    responseBody: `{
  "data": [
    {
      "id": "proj_abc123",
      "name": "Mobile App QA",
      "prefix": "MOB",
      "test_case_count": 142,
      "run_count": 38,
      "created_at": "2025-12-01T09:00:00Z",
      "updated_at": "2026-03-28T14:22:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 20
  }
}`,
  },
  {
    method: 'GET',
    methodColor: 'bg-green-100 text-green-700',
    path: '/v1/projects/:id',
    description: 'Retrieve a single project by its ID, including summary statistics and configuration details.',
    responseBody: `{
  "data": {
    "id": "proj_abc123",
    "name": "Mobile App QA",
    "prefix": "MOB",
    "description": "QA test suite for the mobile application",
    "test_case_count": 142,
    "run_count": 38,
    "member_count": 5,
    "created_at": "2025-12-01T09:00:00Z",
    "updated_at": "2026-03-28T14:22:00Z"
  }
}`,
  },
  {
    method: 'POST',
    methodColor: 'bg-blue-100 text-blue-700',
    path: '/v1/projects',
    description: 'Create a new project. The prefix is used for generating test case IDs (e.g., MOB-1, MOB-2).',
    comingSoon: true,
    requestBody: `{
  "name": "Mobile App QA",
  "prefix": "MOB"
}`,
    responseBody: `{
  "data": {
    "id": "proj_abc123",
    "name": "Mobile App QA",
    "prefix": "MOB",
    "test_case_count": 0,
    "run_count": 0,
    "member_count": 1,
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
}`,
    params: [
      { name: 'name', type: 'string', required: true, description: 'Display name for the project' },
      { name: 'prefix', type: 'string', required: true, description: 'Short prefix for test case IDs (2-5 uppercase letters)' },
    ],
  },
  {
    method: 'PATCH',
    methodColor: 'bg-amber-100 text-amber-700',
    path: '/v1/projects/:id',
    description: 'Update an existing project. Only provided fields will be modified.',
    comingSoon: true,
    requestBody: `{
  "name": "Mobile App QA - v2",
  "description": "Updated QA suite for mobile v2"
}`,
    responseBody: `{
  "data": {
    "id": "proj_abc123",
    "name": "Mobile App QA - v2",
    "prefix": "MOB",
    "description": "Updated QA suite for mobile v2",
    "updated_at": "2026-03-29T11:00:00Z"
  }
}`,
    params: [
      { name: 'name', type: 'string', required: false, description: 'New display name' },
      { name: 'description', type: 'string', required: false, description: 'Project description' },
    ],
  },
  {
    method: 'DELETE',
    methodColor: 'bg-red-100 text-red-700',
    path: '/v1/projects/:id',
    description: 'Permanently delete a project and all its associated test cases, runs, and results. This action cannot be undone.',
    comingSoon: true,
    responseBody: `{
  "message": "Project deleted successfully"
}`,
  },
];

export default function ProjectsApiPage() {
  return (
    <DocsLayout
      title="Projects API | API Reference | Testably"
      description="Manage projects via the Testably API. Create, list, update, and delete projects."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/docs/api" className="hover:text-indigo-600 transition-colors">API Reference</a>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Projects</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Projects API</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Manage your Testably projects programmatically. List, create, update, and delete projects.
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
        <a href="/docs/api/authentication" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          <i className="ri-arrow-left-line" />
          Authentication
        </a>
        <a href="/docs/api/test-cases" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Test Cases API
          <i className="ri-arrow-right-line" />
        </a>
      </div>
    </DocsLayout>
  );
}
