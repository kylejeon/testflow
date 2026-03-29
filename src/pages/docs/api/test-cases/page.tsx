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
    path: '/v1/projects/:pid/test-cases',
    description: 'List all test cases in a project. Supports filtering by folder, priority, type, and search keywords. Results are paginated.',
    params: [
      { name: 'folder_id', type: 'string', required: false, description: 'Filter by folder ID' },
      { name: 'priority', type: 'string', required: false, description: 'Filter by priority: critical, high, medium, low' },
      { name: 'type', type: 'string', required: false, description: 'Filter by type: functional, smoke, regression, etc.' },
      { name: 'search', type: 'string', required: false, description: 'Search test case titles' },
      { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
      { name: 'per_page', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
    ],
    responseBody: `{
  "data": [
    {
      "id": "tc_001",
      "title": "Login with valid credentials",
      "folder_id": "fld_auth",
      "priority": "critical",
      "type": "functional",
      "precondition": "User account exists and is active",
      "steps": [
        { "position": 1, "action": "Navigate to /login", "expected": "Login page loads" },
        { "position": 2, "action": "Enter valid email and password", "expected": "Fields populated" },
        { "position": 3, "action": "Click Sign In", "expected": "Redirect to dashboard" }
      ],
      "expected_result": "User is logged in and redirected to dashboard",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-03-20T08:30:00Z"
    }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20
  }
}`,
  },
  {
    method: 'GET',
    methodColor: 'bg-green-100 text-green-700',
    path: '/v1/projects/:pid/test-cases/:id',
    description: 'Retrieve a single test case by its ID, including all steps, preconditions, and metadata.',
    responseBody: `{
  "data": {
    "id": "tc_001",
    "title": "Login with valid credentials",
    "folder_id": "fld_auth",
    "priority": "critical",
    "type": "functional",
    "precondition": "User account exists and is active",
    "steps": [
      { "position": 1, "action": "Navigate to /login", "expected": "Login page loads" },
      { "position": 2, "action": "Enter valid email and password", "expected": "Fields populated" },
      { "position": 3, "action": "Click Sign In", "expected": "Redirect to dashboard" }
    ],
    "expected_result": "User is logged in and redirected to dashboard",
    "tags": ["auth", "smoke"],
    "created_by": "user_abc",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-03-20T08:30:00Z"
  }
}`,
  },
  {
    method: 'POST',
    methodColor: 'bg-blue-100 text-blue-700',
    path: '/v1/projects/:pid/test-cases',
    description: 'Create a new test case in the specified project. Provide the title, optional folder, priority, type, precondition, steps, and expected result.',
    comingSoon: true,
    params: [
      { name: 'title', type: 'string', required: true, description: 'Test case title' },
      { name: 'folder_id', type: 'string', required: false, description: 'Target folder ID' },
      { name: 'priority', type: 'string', required: false, description: 'Priority level: critical, high, medium, low (default: medium)' },
      { name: 'type', type: 'string', required: false, description: 'Test type: functional, smoke, regression, etc.' },
      { name: 'precondition', type: 'string', required: false, description: 'Precondition text' },
      { name: 'steps', type: 'array', required: false, description: 'Array of { action, expected } step objects' },
      { name: 'expected_result', type: 'string', required: false, description: 'Overall expected result' },
    ],
    requestBody: `{
  "title": "Forgot password sends reset email",
  "folder_id": "fld_auth",
  "priority": "high",
  "type": "functional",
  "precondition": "User has a registered email",
  "steps": [
    { "action": "Navigate to /forgot-password", "expected": "Reset form loads" },
    { "action": "Enter registered email", "expected": "Email field populated" },
    { "action": "Click Send Reset Link", "expected": "Success message shown" }
  ],
  "expected_result": "Password reset email is sent to the user"
}`,
    responseBody: `{
  "data": {
    "id": "tc_143",
    "title": "Forgot password sends reset email",
    "folder_id": "fld_auth",
    "priority": "high",
    "type": "functional",
    "precondition": "User has a registered email",
    "steps": [
      { "position": 1, "action": "Navigate to /forgot-password", "expected": "Reset form loads" },
      { "position": 2, "action": "Enter registered email", "expected": "Email field populated" },
      { "position": 3, "action": "Click Send Reset Link", "expected": "Success message shown" }
    ],
    "expected_result": "Password reset email is sent to the user",
    "created_at": "2026-03-29T10:00:00Z",
    "updated_at": "2026-03-29T10:00:00Z"
  }
}`,
  },
  {
    method: 'PATCH',
    methodColor: 'bg-amber-100 text-amber-700',
    path: '/v1/projects/:pid/test-cases/:id',
    description: 'Update an existing test case. Only provided fields will be modified. Steps can be replaced entirely by sending a new steps array.',
    comingSoon: true,
    params: [
      { name: 'title', type: 'string', required: false, description: 'Updated title' },
      { name: 'folder_id', type: 'string', required: false, description: 'Move to different folder' },
      { name: 'priority', type: 'string', required: false, description: 'Updated priority' },
      { name: 'type', type: 'string', required: false, description: 'Updated type' },
      { name: 'precondition', type: 'string', required: false, description: 'Updated precondition' },
      { name: 'steps', type: 'array', required: false, description: 'Replacement steps array' },
      { name: 'expected_result', type: 'string', required: false, description: 'Updated expected result' },
    ],
    requestBody: `{
  "priority": "critical",
  "title": "Forgot password sends reset email (updated)"
}`,
    responseBody: `{
  "data": {
    "id": "tc_143",
    "title": "Forgot password sends reset email (updated)",
    "priority": "critical",
    "updated_at": "2026-03-29T11:30:00Z"
  }
}`,
  },
  {
    method: 'DELETE',
    methodColor: 'bg-red-100 text-red-700',
    path: '/v1/projects/:pid/test-cases/:id',
    description: 'Permanently delete a test case. Associated run results will be preserved but the test case reference will be removed.',
    comingSoon: true,
    responseBody: `{
  "message": "Test case deleted successfully"
}`,
  },
  {
    method: 'POST',
    methodColor: 'bg-blue-100 text-blue-700',
    path: '/v1/projects/:pid/test-cases/bulk',
    description: 'Create multiple test cases in a single request. Useful for importing test cases from external tools or spreadsheets. Maximum 100 test cases per request.',
    comingSoon: true,
    requestBody: `{
  "test_cases": [
    {
      "title": "Signup with Google OAuth",
      "folder_id": "fld_auth",
      "priority": "high",
      "type": "functional",
      "steps": [
        { "action": "Click Continue with Google", "expected": "OAuth consent screen" },
        { "action": "Select Google account", "expected": "Account created, redirect to dashboard" }
      ]
    },
    {
      "title": "Signup with email",
      "folder_id": "fld_auth",
      "priority": "high",
      "type": "functional",
      "steps": [
        { "action": "Fill signup form", "expected": "Form validated" },
        { "action": "Click Create Account", "expected": "Verification email sent" }
      ]
    }
  ]
}`,
    responseBody: `{
  "data": {
    "created": 2,
    "test_cases": [
      { "id": "tc_144", "title": "Signup with Google OAuth" },
      { "id": "tc_145", "title": "Signup with email" }
    ]
  }
}`,
  },
];

export default function TestCasesApiPage() {
  return (
    <DocsLayout
      title="Test Cases API | API Reference | Testably"
      description="Manage test cases via the Testably API. CRUD operations, filtering, and bulk create."
    >
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <a href="/docs/api" className="hover:text-indigo-600 transition-colors">API Reference</a>
          <i className="ri-arrow-right-s-line text-gray-400" />
          <span className="text-gray-900 font-medium">Test Cases</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Test Cases API</h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Create, retrieve, update, and delete test cases. Supports filtering, pagination, and bulk operations.
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
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {ep.method === 'GET' ? 'Query Parameters' : 'Parameters'}
                  </h4>
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
        <a href="/docs/api/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          <i className="ri-arrow-left-line" />
          Projects API
        </a>
        <a href="/docs/api/test-runs" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Test Runs API
          <i className="ri-arrow-right-line" />
        </a>
      </div>
    </DocsLayout>
  );
}
