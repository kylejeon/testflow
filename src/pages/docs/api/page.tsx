import { Link } from 'react-router-dom';
import MarketingLayout from '../../../components/marketing/MarketingLayout';

const endpoints = [
  {
    icon: 'ri-lock-line',
    title: 'Authentication',
    badge: 'POST',
    badgeColor: 'bg-blue-100 text-blue-700',
    desc: 'Generate and manage API tokens. Create project-scoped tokens for secure CI/CD access.',
    href: '/docs/api/authentication',
  },
  {
    icon: 'ri-file-list-3-line',
    title: 'Test Cases',
    badge: 'CRUD',
    badgeColor: 'bg-green-100 text-green-700',
    desc: 'Create, read, update, delete test cases. List with filters, manage folders and tags.',
    href: '/docs/api/test-cases',
  },
  {
    icon: 'ri-play-circle-line',
    title: 'Test Runs',
    badge: 'POST',
    badgeColor: 'bg-blue-100 text-blue-700',
    desc: 'Create test runs, upload results, and query run status. Bulk result upload for CI/CD.',
    href: '/docs/api/test-runs',
  },
  {
    icon: 'ri-check-double-line',
    title: 'Test Results',
    badge: 'PUT',
    badgeColor: 'bg-amber-100 text-amber-700',
    desc: 'Update individual results or bulk upload from automated test suites.',
    href: '/docs/api/test-results',
  },
  {
    icon: 'ri-folder-line',
    title: 'Projects',
    badge: 'GET',
    badgeColor: 'bg-green-100 text-green-700',
    desc: 'List projects and retrieve project settings and configuration.',
    href: '/docs/api/projects',
  },
  {
    icon: 'ri-flag-line',
    title: 'Milestones',
    badge: 'CRUD',
    badgeColor: 'bg-green-100 text-green-700',
    desc: 'Create, read, and update milestones. Link test runs to release targets.',
    href: '/docs/api/milestones',
  },
  {
    icon: 'ri-upload-cloud-line',
    title: 'CI/CD Results Upload',
    badge: 'POST',
    badgeColor: 'bg-blue-100 text-blue-700',
    desc: 'Upload test results from CI/CD pipelines. Supports JSON and JUnit XML formats. Used by @testably/playwright-reporter, cypress-reporter, jest-reporter SDKs.',
    href: '/docs/api/ci-upload',
  },
  {
    icon: 'ri-history-line',
    title: 'Upload Logs',
    badge: 'GET',
    badgeColor: 'bg-green-100 text-green-700',
    desc: 'Retrieve recent CI/CD upload history. View upload status, result counts, and error details for each pipeline run.',
    href: '/docs/api/ci-upload',
  },
  {
    icon: 'ri-webhook-line',
    title: 'Webhooks',
    badge: 'POST',
    badgeColor: 'bg-blue-100 text-blue-700',
    desc: 'Subscribe to events (run completed, test failed, etc.). Configure payload schemas.',
    href: '/docs/webhooks',
  },
];

const exampleCurl = `curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     https://api.testably.app/v1/test-cases`;

const exampleGha = `- name: Upload test results to Testably
  run: |
    curl -X POST https://api.testably.app/v1/runs/upload \\
      -H "Authorization: Bearer \${{ secrets.TESTABLY_TOKEN }}" \\
      -H "Content-Type: application/json" \\
      -d '{
        "project_id": "proj_abc123",
        "run_name": "CI Build #\${{ github.run_number }}",
        "results": "junit-results.xml"
      }'`;

export default function ApiReferencePage() {
  return (
    <MarketingLayout
      title="API Reference | Testably"
      description="Integrate with Testably's REST API. Authentication, endpoints, examples."
      keywords="testably api, rest api, api reference, test automation, CI/CD integration"
    >
      {/* Hero */}
      <header className="py-24 bg-gray-950 text-center relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <i className="ri-code-s-slash-line text-indigo-300 text-sm"></i>
            <span className="text-indigo-200 text-sm font-medium">Developer</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Testably API Reference
          </h1>
          <p className="text-white/50 text-lg leading-relaxed mb-8">
            Automate your QA workflow with our RESTful API. Push test results, manage cases, and integrate with any tool.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Authentication', 'Endpoints', 'Code Examples'].map((label) => (
              <span
                key={label}
                className="text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Authentication */}
      <section className="py-20 bg-white" id="auth">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
            <i className="ri-lock-line text-indigo-600 text-sm"></i>
            <span className="text-indigo-700 text-sm font-medium">Authentication</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">API authentication</h2>
          <p className="text-gray-500 text-lg mb-8 max-w-2xl">
            All API requests require a project-scoped API token passed in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">Authorization</code> header.
          </p>
          <div className="bg-gray-950 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
              <i className="ri-terminal-line text-indigo-400 text-sm"></i>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Example Request</span>
            </div>
            <pre className="p-5 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{exampleCurl}</pre>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                <i className="ri-time-line text-indigo-500"></i>Rate Limiting
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">60 requests per minute per token. Returns <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">429</code> when exceeded.</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                <i className="ri-error-warning-line text-indigo-500"></i>Error Responses
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">JSON with <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">error</code> and <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">message</code> fields. Standard HTTP status codes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-20 bg-gray-50" id="endpoints">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
              <i className="ri-route-line text-indigo-600 text-sm"></i>
              <span className="text-indigo-700 text-sm font-medium">Endpoints</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">API categories</h2>
            <p className="text-gray-500 mt-2">Explore our API endpoints organized by resource type.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {endpoints.map((ep) => (
              <Link
                key={ep.title}
                to={ep.href}
                className="bg-white border border-gray-100 rounded-2xl p-6 flex items-start gap-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className={`${ep.icon} text-indigo-600 text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{ep.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ep.badgeColor}`}>{ep.badge}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{ep.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 bg-white" id="examples">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-4">
            <i className="ri-code-line text-indigo-600 text-sm"></i>
            <span className="text-indigo-700 text-sm font-medium">Code Examples</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">CI/CD integration</h2>
          <p className="text-gray-500 text-lg mb-8 max-w-2xl">
            Push automated test results from your pipeline with a single API call.
          </p>
          <div className="bg-gray-950 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
              <i className="ri-github-line text-indigo-400 text-sm"></i>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GitHub Actions</span>
            </div>
            <pre className="p-5 text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">{exampleGha}</pre>
          </div>
          <p className="text-sm text-gray-400 mt-6 bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-center">
            <i className="ri-information-line text-indigo-400 mr-1.5"></i>
            Browse the full API reference by clicking any category above, or visit the <Link to="/docs/api/authentication" className="text-indigo-500 hover:underline">Authentication guide</Link> to get started.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
