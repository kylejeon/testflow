import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../../components/SEOHead';
import MarketingFooter from '../../../components/marketing/MarketingFooter';
import MarketingHeader from '../../../components/marketing/MarketingHeader';

const features = [
  {
    icon: 'ri-folder-3-line',
    title: 'Organized Test Case Library',
    description:
      'Structure thousands of test cases with a hierarchical folder system. Filter by priority (Critical, High, Medium, Low), type (Functional, Regression, Smoke), tags, and execution status to find exactly what you need in seconds.',
  },
  {
    icon: 'ri-play-circle-line',
    title: 'Test Run Execution & Tracking',
    description:
      'Create targeted test runs tied to milestones or sprints. Assign test cases to team members, track real-time pass/fail/blocked results, and get a clear picture of your release readiness at a glance.',
  },
  {
    icon: 'ri-flag-line',
    title: 'Milestone & Release Planning',
    description:
      'Set release milestones and track QA progress against them. Know exactly which test cases are complete, in progress, or blocked — so you can ship with confidence on deadline.',
  },
  {
    icon: 'ri-sparkling-line',
    title: 'AI-Powered Test Generation',
    description:
      'Describe a feature in plain language and let Testably generate structured test cases with steps and expected results. Convert Jira tickets or exploratory findings into formal test cases with one click.',
  },
  {
    icon: 'ri-link',
    title: 'Jira Integration',
    description:
      'When a test fails, Testably automatically creates a Jira issue with full context — steps, screenshots, environment. Two-way sync keeps your QA and development teams aligned without extra effort.',
  },
  {
    icon: 'ri-git-merge-line',
    title: 'CI/CD & GitHub Integration',
    description:
      'Connect Playwright, Cypress, or Jest via our SDK. Push automated test results from GitHub Actions, Jenkins, or GitLab CI directly into your Testably runs. One command: npm install @testably.kr/playwright-reporter.',
  },
  {
    icon: 'ri-pie-chart-2-line',
    title: 'Advanced Reporting & Analytics',
    description:
      'Visualize QA health with four built-in dashboards: Pass Rate trends, Active Runs status, Team Activity heatmap, and Test Case Overview. Export any report as PDF for stakeholder review.',
  },
  {
    icon: 'ri-git-branch-line',
    title: 'Test Case Versioning',
    description:
      'Track every change with Major/Minor versioning. Browse version history, compare diffs, restore any previous version, and maintain a full audit trail — essential for compliance and regulated industries.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Create a Project',
    description: 'Set up a project for your product or feature. Invite your QA team and set role-based permissions (Owner, Admin, Member, Viewer).',
    icon: 'ri-add-circle-line',
  },
  {
    step: '02',
    title: 'Write & Organize Test Cases',
    description: 'Build a structured library using folders, priorities, tags, and preconditions. Use AI to generate test cases from plain text or Jira issues.',
    icon: 'ri-edit-2-line',
  },
  {
    step: '03',
    title: 'Execute Test Runs',
    description: 'Create a test run tied to a milestone. Assign cases to team members and track pass/fail/blocked results in real-time.',
    icon: 'ri-play-line',
  },
  {
    step: '04',
    title: 'Analyze Results & Ship',
    description: 'Review dashboards, export PDF reports for stakeholders, and ship when all critical tests pass.',
    icon: 'ri-bar-chart-box-line',
  },
];

const comparisonRows = [
  { feature: 'Pricing model', testably: 'Flat-rate (team pricing)', others: 'Per-seat charges' },
  { feature: 'Free plan', testably: 'Yes — 1 project, 2 members, forever', others: 'Trial only (14–30 days)' },
  { feature: 'AI test generation', testably: 'Built-in', others: 'Add-on or unavailable' },
  { feature: 'Jira integration', testably: 'Full two-way sync (all plans)', others: 'Premium tier only' },
  { feature: 'CI/CD SDK', testably: 'Playwright, Cypress, Jest SDK', others: 'REST API only' },
  { feature: 'Focus Mode (distraction-free)', testably: 'Yes', others: 'No' },
  { feature: 'Import from TestRail', testably: 'Built-in CSV with field mapping', others: 'Manual or paid service' },
  { feature: 'Setup time', testably: 'Under 5 minutes', others: '30+ minutes' },
];

const faqs = [
  {
    q: 'What is a test case management system?',
    a: 'A test case management system is a tool that helps QA teams organize, write, execute, and track test cases throughout the software development lifecycle. It replaces spreadsheets with a structured platform that supports test runs, reporting, and team collaboration.',
  },
  {
    q: 'Why do QA teams need dedicated test case management software?',
    a: 'Spreadsheets and wikis break down as your test suite grows. Dedicated software provides version control, real-time execution tracking, integrations with tools like Jira and CI/CD pipelines, and analytics to measure QA effectiveness over time.',
  },
  {
    q: 'Can I migrate from TestRail to Testably?',
    a: 'Yes. Testably has built-in CSV import with TestRail field mapping. Export your test cases from TestRail as CSV and import them into Testably — priorities, steps, and expected results transfer automatically.',
  },
  {
    q: 'Is Testably suitable for Agile teams?',
    a: 'Absolutely. Testably is built for Agile and fast-moving teams. Create test runs per sprint, link them to milestones, get instant Jira issue creation on failure, and track QA velocity over time.',
  },
  {
    q: 'Does Testably support test automation integration?',
    a: 'Yes. Use our SDK (Playwright, Cypress, Jest) or REST API to push automated test results directly into Testably runs. Results appear alongside manual tests in the same dashboard.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Test Case Management System | Testably',
  description:
    'Learn how Testably helps QA teams manage test cases, track test runs, integrate with Jira and CI/CD, and leverage AI-powered test generation.',
  url: 'https://testably.app/use-cases/test-case-management',
  mainEntity: {
    '@type': 'SoftwareApplication',
    name: 'Testably',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Test case management system for modern QA teams.',
  },
};

export default function TestCaseManagementPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Test Case Management System | Testably"
        description="Testably is a modern test case management system for QA teams. Organize test cases, execute test runs, integrate with Jira & GitHub, and use AI to generate tests. Free plan available."
        keywords="test case management, test case management system, test management software, QA test management, test case tracking, test run management, test case organization"
        canonical="https://testably.app/use-cases/test-case-management"
        ogUrl="https://testably.app/use-cases/test-case-management"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
        <MarketingHeader />

        {/* Hero */}
        <section className="bg-slate-900 pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <i className="ri-folder-3-line text-indigo-400 text-sm"></i>
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">Test Case Management</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              Test Case Management System<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
                built for modern QA teams
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Stop managing test cases in spreadsheets. Testably gives your team a structured, integrated platform for writing, executing, and tracking test cases — with built-in Jira sync, CI/CD integration, and AI test generation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-400 transition-colors shadow-[0_0_30px_rgba(99,102,241,0.3)]"
              >
                Start for Free
              </button>
              <Link
                to="/use-cases/test-management-tool"
                className="px-8 py-4 text-slate-300 hover:text-white font-semibold transition-colors"
              >
                Compare test management tools →
              </Link>
            </div>
            <p className="text-slate-500 text-sm mt-4">No credit card required · Free plan available</p>
          </div>
        </section>

        {/* What is Test Case Management */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              What is test case management — and why does it matter?
            </h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
              <p>
                <strong>Test case management</strong> is the process of creating, organizing, executing, and tracking test cases throughout a software product's development lifecycle. A <strong>test case management system</strong> is the tool that makes this process systematic, repeatable, and scalable.
              </p>
              <p>
                Without dedicated test management software, QA teams typically rely on spreadsheets, wikis, or shared documents. This works for small projects but breaks down quickly: version conflicts, no real-time execution tracking, no integration with Jira or CI/CD pipelines, and no way to measure QA effectiveness over time.
              </p>
              <p>
                Modern QA teams — especially those working in Agile environments — need a <strong>test management tool</strong> that integrates with their entire development workflow: linking test cases to requirements, syncing failures to Jira, accepting automated results from CI pipelines, and generating reports for stakeholders.
              </p>
              <p>
                That's exactly what Testably is built for.
              </p>
            </div>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The problems with traditional test case management
            </h2>
            <p className="text-gray-500 mb-10">
              Most QA teams struggle with the same set of challenges when managing test cases without the right tools:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                { icon: 'ri-file-excel-line', problem: 'Spreadsheets don\'t scale', detail: 'Shared Excel files cause version conflicts, have no real-time updates, and break with large test suites.' },
                { icon: 'ri-eye-off-line', problem: 'No visibility into test coverage', detail: 'Without a system, it\'s impossible to know which features are tested, partially covered, or missing tests entirely.' },
                { icon: 'ri-tools-line', problem: 'Manual Jira ticket creation', detail: 'When tests fail, engineers copy-paste test steps into Jira issues. This wastes time and loses context.' },
                { icon: 'ri-git-close-pull-request-line', problem: 'Disconnected from CI/CD', detail: 'Automated test results from GitHub Actions or Jenkins exist in isolation — not linked to manual test runs.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 bg-red-50 border border-red-100 rounded-xl">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className={`${item.icon} text-red-500`}></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.problem}</h3>
                    <p className="text-sm text-gray-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How Testably solves test case management
            </h2>
            <p className="text-gray-500 mb-10">
              Testably is a <strong>purpose-built test case management system</strong> that integrates every part of your QA workflow — from writing test cases to shipping with confidence.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="py-10 pb-20 px-4 bg-white" id="features">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
              Core features for QA management & test tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((f, i) => (
                <div key={i} className="p-6 border border-gray-100 rounded-xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                    <i className={`${f.icon} text-indigo-600`}></i>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Your test case management workflow in 4 steps
              </h2>
              <p className="text-gray-500">Get up and running in under 5 minutes</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {workflow.map((step, i) => (
                <div key={i} className="text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${step.icon} text-indigo-600 text-xl`}></i>
                  </div>
                  <div className="text-xs font-bold text-indigo-400 mb-2">{step.step}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Why choose Testably as your test case management system?
              </h2>
              <p className="text-gray-500">How Testably compares to legacy test management tools</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 font-semibold text-gray-700">Feature</th>
                    <th className="text-center px-6 py-4 font-semibold text-indigo-600">Testably</th>
                    <th className="text-center px-6 py-4 font-semibold text-gray-400">Others (TestRail, Zephyr)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-4 text-gray-700 font-medium">{row.feature}</td>
                      <td className="px-6 py-4 text-center text-indigo-600 font-medium">
                        <i className="ri-check-line mr-1"></i>{row.testably}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-center">
              <Link to="/use-cases/test-management-tool" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                See full comparison vs TestRail, Zephyr, and qTest →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
              Test case management FAQ
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-slate-900">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Start managing test cases the modern way
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Join QA teams already using Testably to manage test cases, run tests faster, and ship with confidence. Free plan available — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-400 transition-colors"
              >
                Get Started Free
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-8 py-4 text-slate-300 hover:text-white font-semibold transition-colors"
              >
                View Pricing
              </button>
            </div>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </>
  );
}
