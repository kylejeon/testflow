import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../../components/SEOHead';
import MarketingFooter from '../../../components/marketing/MarketingFooter';
import MarketingHeader from '../../../components/marketing/MarketingHeader';

const toolComparison = [
  {
    name: 'Testably',
    highlight: true,
    pricing: 'From $0 (flat-rate)',
    pricingNote: 'Free forever plan. Paid plans start at $19/mo for teams.',
    setup: 'Under 5 minutes',
    aiFeatures: 'Built-in (all plans)',
    jira: 'Full two-way sync',
    cicd: 'SDK + REST API',
    freeplan: 'Yes — forever',
    migration: 'CSV import with TestRail mapping',
    focusMode: 'Yes (unique)',
  },
  {
    name: 'TestRail',
    highlight: false,
    pricing: '$36/user/month',
    pricingNote: 'Per-seat pricing. Costs grow linearly with team size.',
    setup: '30+ minutes',
    aiFeatures: 'Limited (premium)',
    jira: 'Integration available',
    cicd: 'REST API only',
    freeplan: 'No (trial only)',
    migration: 'Export as CSV',
    focusMode: 'No',
  },
  {
    name: 'Zephyr Scale',
    highlight: false,
    pricing: '$10–$15/user/month',
    pricingNote: 'Per-seat Jira add-on. Full Jira dependency.',
    setup: 'Requires Jira',
    aiFeatures: 'None',
    jira: 'Native (Jira only)',
    cicd: 'REST API',
    freeplan: 'No',
    migration: 'Export as CSV',
    focusMode: 'No',
  },
  {
    name: 'qTest',
    highlight: false,
    pricing: 'Contact sales',
    pricingNote: 'Enterprise pricing. Opaque cost structure.',
    setup: '1–2 days',
    aiFeatures: 'None',
    jira: 'Integration available',
    cicd: 'REST API',
    freeplan: 'No',
    migration: 'Professional services',
    focusMode: 'No',
  },
];

const advantages = [
  {
    icon: 'ri-money-dollar-circle-line',
    title: 'Flat-rate pricing — not per-seat',
    description:
      'TestRail charges $36/user/month. Zephyr charges per seat. With Testably, you pay for the team tier, not per head. A 20-person QA team saves thousands per year.',
  },
  {
    icon: 'ri-timer-flash-line',
    title: 'Set up in under 5 minutes',
    description:
      'No configuration wizards, no onboarding calls, no IT tickets. Sign up, create a project, and write your first test case. Most teams are running their first test run the same day they sign up.',
  },
  {
    icon: 'ri-sparkling-line',
    title: 'AI test generation built-in',
    description:
      'TestRail and Zephyr don\'t generate tests. Testably does. Describe a feature, paste a Jira ticket URL, or upload a spec — and get structured test cases with steps and expected results instantly.',
  },
  {
    icon: 'ri-focus-3-line',
    title: 'Focus Mode — unique to Testably',
    description:
      'Execute test runs in a distraction-free fullscreen. Mark results with P/F/B/S keystrokes, auto-advance to the next step, and stay in the zone. No other test management tool has this.',
  },
  {
    icon: 'ri-arrow-left-right-line',
    title: 'Migrate from TestRail in minutes',
    description:
      'Export your test cases from TestRail as CSV and import them into Testably. Built-in field mapping handles priority, steps, and expected results automatically. No professional services needed.',
  },
  {
    icon: 'ri-terminal-box-line',
    title: 'First-class automation SDK',
    description:
      'While others only offer a REST API, Testably provides native SDKs for Playwright, Cypress, and Jest. One npm install connects your automation results to your manual test runs.',
  },
];

const migrationSteps = [
  {
    step: '01',
    title: 'Export from TestRail',
    description: 'In TestRail, go to your test suite and export as CSV. This takes about 2 minutes.',
    icon: 'ri-download-line',
  },
  {
    step: '02',
    title: 'Create a project in Testably',
    description: 'Sign up (free), create a project, and go to Import. Select "Import from TestRail CSV".',
    icon: 'ri-add-circle-line',
  },
  {
    step: '03',
    title: 'Map your fields',
    description: 'Testably auto-detects TestRail fields. Confirm the mapping for priority, steps, and expected results.',
    icon: 'ri-settings-3-line',
  },
  {
    step: '04',
    title: 'Done — run your first test',
    description: 'Your entire test library is ready. Create a test run and invite your team.',
    icon: 'ri-check-double-line',
  },
];

const testimonials = [
  {
    quote:
      'We switched from TestRail and cut our test management time in half. The AI test generation alone saved us 10+ hours per sprint.',
    name: 'Sarah M.',
    role: 'QA Lead, Fintech Startup',
    initials: 'SM',
    color: '#6366F1',
  },
  {
    quote:
      'The keyboard shortcuts are a game-changer. I can execute an entire test run without touching my mouse. It\'s like Vim for QA.',
    name: 'James K.',
    role: 'Senior SDET, SaaS Platform',
    initials: 'JK',
    color: '#8B5CF6',
  },
];

const faqs = [
  {
    q: 'What is a test management tool?',
    a: 'A test management tool is software that helps QA teams plan, write, organize, execute, and report on test cases throughout the software testing lifecycle. The best tools integrate with Jira, CI/CD pipelines, and support both manual and automated testing in one place.',
  },
  {
    q: 'How does Testably compare to TestRail?',
    a: 'Testably uses flat-rate pricing (not per seat like TestRail\'s $36/user/month), has a free forever plan, includes AI test generation, offers Focus Mode for distraction-free execution, and migrates TestRail CSV imports automatically. Both tools support Jira integration and test run management.',
  },
  {
    q: 'How does Testably compare to Zephyr Scale?',
    a: 'Zephyr Scale is a Jira plugin — it requires Jira and adds cost per seat. Testably is a standalone tool with its own interface, free tier, AI features, CI/CD SDK, and flat-rate pricing. Testably is better for teams that want an independent QA system beyond Jira.',
  },
  {
    q: 'Can I import my existing test cases from another tool?',
    a: 'Yes. Testably supports CSV import with built-in field mapping for TestRail. Export your test cases from TestRail (or Zephyr/Qase) as CSV and import into Testably. The import handles priorities, test steps, and expected results.',
  },
  {
    q: 'Does Testably have a free plan?',
    a: 'Yes. The Free plan includes 1 project, 2 team members, 100 test cases per project, 10 test runs per month, and 3 AI generations per month — forever. No credit card required. Paid plans start at $19/month for growing teams.',
  },
  {
    q: 'Is there a limit to how many Viewers I can add?',
    a: 'No. Viewer seats are completely free and don\'t count toward your plan\'s member limit. You can invite unlimited stakeholders, managers, and executives to monitor testing progress at no extra cost.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Best Test Management Tool for QA Teams | Testably',
  description:
    'Compare the best test management tools: Testably vs TestRail vs Zephyr vs qTest. See pricing, features, and migration options.',
  url: 'https://testably.app/use-cases/test-management-tool',
};

export default function TestManagementToolPage() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Best Test Management Tool for QA Teams | Testably"
        description="Looking for the best test management tool? Compare Testably vs TestRail, Zephyr, and qTest. Flat-rate pricing, AI test generation, free plan, and easy migration from TestRail."
        keywords="test management tool, best test management tool, test management software, TestRail alternative, Zephyr alternative, QA management tool, test case management tool, test tracking tool"
        canonical="https://testably.app/use-cases/test-management-tool"
        ogUrl="https://testably.app/use-cases/test-management-tool"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-white" style={{ fontFamily: '"Inter", sans-serif' }}>
        <MarketingHeader />

        {/* Hero */}
        <section className="bg-slate-900 pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <i className="ri-tools-line text-indigo-400 text-sm"></i>
              <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">Test Management Tool Comparison</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              The Best Test Management Tool<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500">
                for modern QA teams in 2026
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Tired of per-seat pricing, slow setup, and tools that haven't evolved in a decade? Testably is the modern test management tool with flat-rate pricing, AI generation, and a free forever plan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-400 transition-colors shadow-[0_0_30px_rgba(99,102,241,0.3)]"
              >
                Try Testably Free
              </button>
              <Link
                to="/use-cases/test-case-management"
                className="px-8 py-4 text-slate-300 hover:text-white font-semibold transition-colors"
              >
                What is test case management? →
              </Link>
            </div>
            <p className="text-slate-500 text-sm mt-4">No credit card required · Free plan available · Cancel anytime</p>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-20 px-4 bg-white" id="comparison">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Test management tool comparison: Testably vs TestRail vs Zephyr vs qTest
              </h2>
              <p className="text-gray-500">Side-by-side comparison of the most popular QA management tools in 2026</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-5 py-4 font-semibold text-gray-500 bg-gray-50 w-40">Feature</th>
                    {toolComparison.map((tool) => (
                      <th
                        key={tool.name}
                        className={`px-5 py-4 font-bold text-center ${tool.highlight ? 'bg-indigo-50 text-indigo-700 border-x border-indigo-100' : 'bg-gray-50 text-gray-500'}`}
                      >
                        {tool.name}
                        {tool.highlight && (
                          <span className="block text-xs font-normal text-indigo-400 mt-0.5">Recommended</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Pricing', key: 'pricing' },
                    { label: 'Free plan', key: 'freeplan' },
                    { label: 'Setup time', key: 'setup' },
                    { label: 'AI test generation', key: 'aiFeatures' },
                    { label: 'Jira integration', key: 'jira' },
                    { label: 'CI/CD integration', key: 'cicd' },
                    { label: 'TestRail migration', key: 'migration' },
                    { label: 'Focus Mode', key: 'focusMode' },
                  ].map((row, i) => (
                    <tr key={row.key} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-5 py-4 font-medium text-gray-700">{row.label}</td>
                      {toolComparison.map((tool) => (
                        <td
                          key={tool.name}
                          className={`px-5 py-4 text-center ${tool.highlight ? 'bg-indigo-50/40 text-indigo-700 font-medium border-x border-indigo-100/50' : 'text-gray-500'}`}
                        >
                          {tool[row.key as keyof typeof tool] as string}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Pricing as of April 2026. TestRail pricing sourced from their public pricing page. Zephyr Scale pricing sourced from Atlassian Marketplace.
            </p>
          </div>
        </section>

        {/* Why Testably */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                6 reasons QA teams switch to Testably
              </h2>
              <p className="text-gray-500">What makes Testably the best test management tool for modern teams</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advantages.map((adv, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                    <i className={`${adv.icon} text-indigo-600`}></i>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{adv.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{adv.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Migration guide */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Migrate from TestRail to Testably in minutes
              </h2>
              <p className="text-gray-500">No professional services. No data loss. No downtime.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {migrationSteps.map((step, i) => (
                <div key={i} className="text-center p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${step.icon} text-indigo-600 text-xl`}></i>
                  </div>
                  <div className="text-xs font-bold text-indigo-400 mb-2">{step.step}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 p-6 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
              <p className="text-indigo-700 font-medium mb-3">
                Ready to migrate from TestRail?
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-500 transition-colors text-sm"
              >
                Start Free — Import Your Test Cases
              </button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
              What teams say after switching to Testably
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-gray-700 leading-relaxed mb-6 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: t.color }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-gray-400 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing snapshot */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, flat-rate pricing
            </h2>
            <p className="text-gray-500 mb-8">
              Unlike TestRail's per-seat model, Testably charges by team tier. The bigger your team, the more you save compared to per-seat tools.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { name: 'Free', price: '$0', note: '1 project · 2 members · forever' },
                { name: 'Starter', price: '$49/mo', note: '10 projects · 5 members · unlimited TCs' },
                { name: 'Professional', price: '$99/mo', note: 'Unlimited projects · 20 members · CI/CD' },
              ].map((plan, i) => (
                <div key={i} className={`p-6 rounded-xl border-2 ${i === 2 ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  <p className={`text-2xl font-black mt-1 mb-2 ${i === 2 ? 'text-indigo-600' : 'text-gray-900'}`}>{plan.price}</p>
                  <p className="text-xs text-gray-500">{plan.note}</p>
                </div>
              ))}
            </div>
            <Link to="/pricing" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
              View all pricing plans →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
              Test management tool FAQ
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
              Ready to switch to a better test management tool?
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Join QA teams who've left TestRail and Zephyr behind. Start free, import your test cases, and run your first test today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/auth')}
                className="px-8 py-4 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-400 transition-colors"
              >
                Start for Free
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
