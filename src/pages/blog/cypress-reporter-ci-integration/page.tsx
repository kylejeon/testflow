import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../../components/SEOHead';
import MarketingFooter from '../../../components/marketing/MarketingFooter';
import MarketingHeader from '../../../components/marketing/MarketingHeader';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'Ship Cypress Test Results to Your QA Dashboard in 3 Lines',
  description:
    '@testably.kr/cypress-reporter — every Cypress run auto-syncs to Testably. One npm install, one setupNodeEvents line, three env vars.',
  url: 'https://testably.app/blog/cypress-reporter-ci-integration',
  datePublished: '2026-04-27',
  dateModified: '2026-04-27',
  author: { '@type': 'Organization', name: 'Testably' },
  publisher: {
    '@type': 'Organization',
    name: 'Testably',
    logo: { '@type': 'ImageObject', url: 'https://testably.app/brand/og-dark-1200x630.png' },
  },
  image: 'https://testably.app/brand/og-dark-1200x630.png',
};

const tocSections = [
  { id: 'blackhole', label: 'The CI result blackhole' },
  { id: 'workarounds', label: 'The usual workarounds and why they fail' },
  { id: 'fix', label: 'The fix: one reporter, three env vars' },
  { id: 'mapping', label: 'Mapping Cypress tests to Testably test cases' },
  { id: 'dashboard', label: 'What you see in the Testably dashboard' },
  { id: 'dry-run', label: 'Before you go live: test the connection' },
  { id: 'next-steps', label: 'Next steps' },
];

const installCode = `npm install --save-dev @testably.kr/cypress-reporter`;

const configCode = `import { defineConfig } from 'cypress';
import { setupTestablyReporter } from '@testably.kr/cypress-reporter';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      setupTestablyReporter(on, config, { testCaseIdSource: 'title' });
      return config;
    },
  },
});`;

const envCode = `# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    \${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  \${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: \${{ secrets.TESTABLY_RUN_ID }}`;

const titleStrategyCode = `// cypress/e2e/login.cy.ts
describe('login', () => {
  it('[TC-42] user can log in with valid credentials', () => {
    cy.visit('/login');
    // ...
  });
});

// ID on describe works too — applies to all its children
describe('[TC-101] checkout flow', () => {
  it('happy path', () => { /* ... */ });
});`;

const tagStrategyCode = `it('should log in @TC-7', () => { /* ... */ });
it('@TC-12 checkout flow', () => { /* ... */ });`;

const customMapperCode = `setupTestablyReporter(on, config, {
  testCaseIdSource: 'custom',
  mapTestCaseId: (fullTitle, filePath) => myMappingTable[filePath]?.[fullTitle],
});`;

const skipSummaryCode = `[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)`;

const dryRunCode = `TESTABLY_DRY_RUN=true npx cypress run`;

const dryRunOutputCode = `[Testably] Dry run passed. (Run: "Nightly E2E", tier: 3)`;

const dashboardItems = [
  {
    title: 'Pass/fail status per test case',
    body: 'Every mapped test case gets its result updated based on what Cypress reported. passed → passed, failed → failed, pending (it.skip / describe.skip) → blocked, dynamically skipped (or before-hook failure) → blocked.',
    icon: 'ri-check-double-line',
  },
  {
    title: 'Failure notes',
    body: 'The first 800 characters of Cypress\'s displayError are attached as the Testably note on failed results. Stack trace, assertion diffs, and custom error messages surface directly in the test case view. If Cypress retried a test (retries: N), the note is prefixed with "Retried N time(s)." so you always know how many attempts it took.',
    icon: 'ri-error-warning-line',
  },
  {
    title: 'AI run summary',
    body: 'Testably\'s AI run summary analyzes the uploaded results and generates a natural-language summary of what passed, what failed, and what patterns are worth investigating. This fires automatically on Professional plans.',
    icon: 'ri-sparkling-line',
  },
  {
    title: 'Flaky test detection & trend charts',
    body: 'When the same test case oscillates between passed and failed across runs, Testably\'s flaky analysis flags it. The dashboard also tracks pass rate over time — with CI uploads on every merge to main, you get a continuous, reliable signal rather than sporadic manual data points.',
    icon: 'ri-line-chart-line',
  },
];

interface CodeBlockProps {
  language?: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  return (
    <div className="my-5 rounded-lg overflow-hidden border border-slate-800 shadow-sm">
      {language && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{language}</span>
        </div>
      )}
      <pre className="bg-slate-900 text-slate-100 p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function BlogCypressReporterCiIntegrationPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Ship Cypress Test Results to Your QA Dashboard in 3 Lines | Testably"
        description="@testably.kr/cypress-reporter — every Cypress run auto-syncs to Testably. One npm install, one setupNodeEvents line, three env vars."
        keywords="cypress reporter, cypress ci integration, cypress test results dashboard, CI test management, cypress testably"
        canonical="https://testably.app/blog/cypress-reporter-ci-integration"
        ogUrl="https://testably.app/blog/cypress-reporter-ci-integration"
        ogType="article"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
        <MarketingHeader />

        {/* Hero */}
        <section className="bg-slate-900 pt-32 pb-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Link to="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Home</Link>
              <i className="ri-arrow-right-s-line text-slate-600 text-sm"></i>
              <Link to="/blog" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Blog</Link>
            </div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <i className="ri-code-s-slash-line text-indigo-400 text-sm"></i>
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">QA Engineering · May 2026</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-6" style={{ lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Ship Cypress Test Results to Your QA Dashboard in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
                3 Lines
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-base font-mono">@testably.kr/cypress-reporter</code> — every Cypress run auto-syncs to Testably. One npm install, one <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-base font-mono">setupNodeEvents</code> line, three env vars.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><i className="ri-time-line"></i> 6 min read</span>
              <span className="flex items-center gap-1.5"><i className="ri-calendar-line"></i> April 27, 2026</span>
              <span className="flex items-center gap-1.5"><i className="ri-user-line"></i> Testably Team</span>
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <section className="py-10 px-4 bg-gray-50 border-b border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">In this guide</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tocSections.map((section, i) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors py-1"
                >
                  <span className="text-xs font-bold text-indigo-400 w-6">{String(i + 1).padStart(2, '0')}</span>
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Article */}
        <article className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
              <p className="text-lg">
                If you run Cypress in CI but your QA team still updates test runs by hand, you're paying a tax on every release. The <strong>Testably Cypress reporter</strong> closes that loop in three lines of config — install the npm package, register the plugin in <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">cypress.config.ts</code>, and set three CI secrets.
              </p>
              <p className="mt-4">
                This guide shows the full setup, the three ways to map Cypress tests to Testably test cases, and how to validate the integration before your next release run.
              </p>
            </div>

            {/* Section 1 — The CI result blackhole */}
            <section id="blackhole" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-eye-off-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 01</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">The CI result blackhole</h2>
                </div>
              </div>
              <div className="pl-14 space-y-4 text-gray-600 text-sm leading-relaxed">
                <p>
                  You run <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">npx cypress run</code> in CI. 42 tests pass. 3 fail. The pipeline exits.
                </p>
                <p>And then the information vanishes.</p>
                <p>
                  Maybe someone screenshots the terminal output and pastes it into Jira. Maybe a team lead manually updates the test run in your QA tool. Maybe — and this is the most common outcome — nobody does anything, and that run's results live and die inside the CI log, unavailable for trend analysis, unreachable from the test management dashboard where your team actually makes decisions.
                </p>
                <p>
                  This is the CI result blackhole: a gap between the automation infrastructure your developers manage and the QA workflow your testers live in. Both systems are doing their jobs. They're just not talking to each other.
                </p>
              </div>
            </section>

            {/* Section 2 — Workarounds */}
            <section id="workarounds" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-error-warning-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 02</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">The usual workarounds and why they fail</h2>
                </div>
              </div>
              <div className="pl-14 space-y-4 text-gray-600 text-sm leading-relaxed">
                <p>Most teams patch this gap in one of three ways.</p>
                <p>
                  <strong>Custom upload scripts.</strong> Someone writes a Python or Node script that parses the JUnit XML output and POSTs it to the QA tool's API. Works until the QA tool's API changes, the script author leaves, or the XML format shifts after a Cypress upgrade. Maintenance cost: unpredictable.
                </p>
                <p>
                  <strong>Jira as the bridge.</strong> Every failed test automatically opens a Jira ticket. This is useful for bug tracking but it's not a QA dashboard. You still don't know pass rate trends, which test cases are consistently flaky, or how this run's results compare to the last milestone.
                </p>
                <p>
                  <strong>Manual updates.</strong> The QA lead opens the test management tool after every CI run and marks results by hand. Time cost: 10–30 minutes per run. Error rate: higher than anyone admits.
                </p>
                <p>
                  None of these solutions are wrong. They're just the wrong tool for the problem. What you actually want is the CI results flowing directly into your test case management platform — automatically, reliably, with zero manual steps.
                </p>
              </div>
            </section>

            {/* Section 3 — The fix */}
            <section id="fix" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-tools-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 03</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">The fix: one reporter, three env vars</h2>
                </div>
              </div>
              <div className="pl-14 space-y-4 text-gray-600 text-sm leading-relaxed">
                <p>
                  <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">@testably.kr/cypress-reporter</code> is a standard Cypress plugin that uploads your test results to Testably the moment the run completes — hooked into Cypress's <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">after:run</code> event.
                </p>
                <p>Here is the entire setup.</p>

                <h3 className="text-base font-bold text-gray-900 mt-6">Step 1: Install the package</h3>
                <CodeBlock language="bash" code={installCode} />
                <p>
                  Peer dependency: <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">cypress &gt;= 12.0.0</code>. Cypress 10 / 11 are past EOL and are not supported.
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-6">Step 2: Register the plugin in <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-base font-mono">cypress.config.ts</code></h3>
                <CodeBlock language="typescript" code={configCode} />
                <p>
                  On CommonJS projects (<code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">cypress.config.js</code>)? The package ships both bundles — <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">require('@testably.kr/cypress-reporter')</code> works as-is.
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-6">Step 3: Add three secrets to your CI provider</h3>
                <CodeBlock language="yaml" code={envCode} />

                <ul className="space-y-2 mt-3">
                  <li className="flex items-start gap-2 text-sm">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_URL</code> — your Testably workspace URL, e.g. <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">https://app.testably.app</code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_TOKEN</code> — a CI token generated in <strong>Settings → CI/CD Tokens</strong> (format: <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">testably_&lt;32 hex chars&gt;</code>)
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_RUN_ID</code> — the UUID of the Testably test run you want to populate
                    </span>
                  </li>
                </ul>

                <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    <strong>That's it.</strong> Run <code className="bg-white text-indigo-900 px-1.5 py-0.5 rounded text-sm font-mono">npx cypress run</code> and results appear in your Testably dashboard automatically.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 — Mapping */}
            <section id="mapping" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-link text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 04</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Mapping Cypress tests to Testably test cases</h2>
                </div>
              </div>
              <div className="pl-14 space-y-4 text-gray-600 text-sm leading-relaxed">
                <p>
                  The reporter needs to know which Cypress test corresponds to which Testably test case. There are three strategies — pick the one that fits your team's workflow.
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-6">Title strategy <span className="text-xs font-normal text-gray-500">(easiest for existing suites)</span></h3>
                <p>
                  Put the Testably test case ID in brackets inside <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">it()</code> — or inside <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">describe()</code> for the whole block:
                </p>
                <CodeBlock language="typescript" code={titleStrategyCode} />
                <p>
                  Set <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">testCaseIdSource: 'title'</code> in <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">setupTestablyReporter</code> (shown above). No other changes needed. UUIDs work in addition to <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">TC-&lt;n&gt;</code> format.
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-6">Tag strategy</h3>
                <p>
                  Cypress doesn't have a native annotations API, so the community convention is to embed <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">@TC-&lt;n&gt;</code> as a token inside the title. The plugin enforces a whitespace boundary, so an email address like <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">user@domain.com</code> will not match accidentally:
                </p>
                <CodeBlock language="typescript" code={tagStrategyCode} />
                <p>
                  Set <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">testCaseIdSource: 'tag'</code>.
                </p>

                <h3 className="text-base font-bold text-gray-900 mt-6">Custom mapper <span className="text-xs font-normal text-gray-500">(for teams with existing ID schemes)</span></h3>
                <p>
                  If your test file paths or titles already encode some identifier that maps to Testably IDs, you can supply a callback:
                </p>
                <CodeBlock language="typescript" code={customMapperCode} />

                <p className="mt-4">
                  Tests without a recognizable ID are skipped gracefully — the run summary tells you exactly how many:
                </p>
                <CodeBlock code={skipSummaryCode} />

                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    <strong>Why no annotation strategy?</strong> Unlike Playwright, Cypress doesn't expose a <code className="bg-white text-amber-900 px-1.5 py-0.5 rounded text-sm font-mono">testInfo.annotations</code> API. If your team migrated from Playwright and relied on annotations there, the title or tag strategy is the direct equivalent in Cypress.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 — What you see in the dashboard */}
            <section id="dashboard" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-dashboard-3-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 05</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">What you see in the Testably dashboard</h2>
                </div>
              </div>
              <div className="pl-14">
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  Once the reporter uploads results, your Testably test run reflects the full picture:
                </p>
                <div className="space-y-4">
                  {dashboardItems.map((item) => (
                    <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className={`${item.icon} text-indigo-600`}></i>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 6 — Dry run */}
            <section id="dry-run" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-shield-check-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 06</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Before you go live: test the connection</h2>
                </div>
              </div>
              <div className="pl-14 space-y-4 text-gray-600 text-sm leading-relaxed">
                <p>
                  Don't commit to a real run before you've verified the credentials work. Use dry-run mode:
                </p>
                <CodeBlock language="bash" code={dryRunCode} />
                <p>
                  The reporter sends the request to the server (so auth and run ID are validated) but the server writes nothing to the database. You'll see:
                </p>
                <CodeBlock code={dryRunOutputCode} />
                <p>
                  You can also pass <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">dryRun: true</code> directly to <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">setupTestablyReporter</code>, or set <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">TESTABLY_DRY_RUN=true</code> inside <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">cypress.env.json</code> — all three routes resolve the same way.
                </p>
                <p>
                  If you see <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">Upload skipped: this feature requires a Professional plan or higher</code>, the token belongs to an account below Professional tier. Upgrade at <strong>Billing → Plans</strong> — the test run itself finishes with exit code 0, so CI isn't broken.
                </p>
              </div>
            </section>

            {/* Section 7 — Next steps */}
            <section id="next-steps" className="mt-16 scroll-mt-20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <i className="ri-rocket-line text-indigo-600"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Section 07</span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">Next steps</h2>
                </div>
              </div>
              <div className="pl-14 space-y-4 text-gray-600 text-sm leading-relaxed">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <strong>Generate a CI token:</strong> Settings → CI/CD Tokens in your Testably workspace
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <strong>Install:</strong> <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">npm install --save-dev @testably.kr/cypress-reporter</code>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <strong>Full options reference:</strong>{' '}
                      <a
                        href="https://www.npmjs.com/package/@testably.kr/cypress-reporter"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 underline"
                      >
                        npm README
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <strong>Source:</strong>{' '}
                      <a
                        href="https://github.com/kylejeon/testflow/tree/main/packages/cypress"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 underline"
                      >
                        github.com/kylejeon/testflow
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-check-line text-indigo-500 mt-0.5 flex-shrink-0"></i>
                    <span>
                      <strong>Don't have a Testably account?</strong>{' '}
                      <Link to="/auth" className="text-indigo-600 hover:text-indigo-700 underline">
                        Start free
                      </Link>
                      {' '}— no credit card required. CI/CD integration requires the Professional plan ($99/month flat-rate, up to 20 members).
                    </span>
                  </li>
                </ul>

                <div className="mt-6 p-5 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-900 leading-relaxed">
                    Already using the <strong>Playwright reporter</strong>? <code className="bg-white text-indigo-900 px-1.5 py-0.5 rounded text-sm font-mono">@testably.kr/cypress-reporter</code> is from the same family — both packages share <code className="bg-white text-indigo-900 px-1.5 py-0.5 rounded text-sm font-mono">@testably.kr/reporter-core</code>, the same env vars, and the same error matrix. Same three secrets, same dashboard, different framework. Jest reporter is coming soon.
                  </p>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>About <code className="bg-white text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">1.0.1</code>:</strong> stable API, SemVer-followed. No breaking changes without a major version bump — safe to pin in your CI.
                  </p>
                </div>
              </div>
            </section>

            {/* Related resources */}
            <section className="mt-16 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Related resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/docs/cicd" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <i className="ri-arrow-right-line text-xs"></i>
                    CI/CD integration guide — full documentation
                  </Link>
                </li>
                <li>
                  <Link to="/blog/playwright-reporter-ci-integration" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <i className="ri-arrow-right-line text-xs"></i>
                    Ship Playwright Test Results to Testably in 3 Lines — sister guide
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <i className="ri-arrow-right-line text-xs"></i>
                    Testably pricing — Professional plan with CI/CD integration
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </article>

        {/* CTA */}
        <section className="py-20 px-4 bg-slate-900">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Stop losing CI test data
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Connect your Cypress suite to Testably in three lines. Free forever plan to get started — Professional plan unlocks automated CI/CD uploads.
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
