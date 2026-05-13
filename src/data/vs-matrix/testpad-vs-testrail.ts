import type { VsMatrixData } from '../competitors/types';

/**
 * TestPad vs TestRail — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.testpad.com/pricing
 *   - https://www.testrail.com/pricing
 *   - docs/research/competitor-testpad.md, competitor-testrail.md
 */
export const testpadVsTestrailData: VsMatrixData = {
  slug: 'testpad-vs-testrail',
  a: 'testpad',
  b: 'testrail',
  h1: 'TestPad vs TestRail (2026): Lightweight Checklist vs Heavyweight Enterprise',
  subhead:
    "TestPad is the simple checklist. TestRail is the enterprise default. Most QA teams need the structured middle — free to start, flat-rate at scale.",
  introBody:
    "TestPad and TestRail are at opposite ends of the test management spectrum. TestPad ships a deliberately simple test-script-as-checklist interface — no Shared Steps, no version pinning, no Requirements Traceability, no AI features — at bracket-based per-user pricing starting at £49 per month for 3 users. TestRail is the 15-year-old enterprise default with deep features (Requirements Traceability, CI/CD, integrations) all gated to the $71-per-user Enterprise tier, plus a $38-per-user Professional Cloud floor and no free tier. Both products force a tradeoff. TestPad is friendly to start but too thin for audit-heavy or regression-critical work. TestRail has every feature but the per-seat math punishes growing teams. Testably is the structured middle: Free forever (1 project, 2 members, 100 test cases — permanent), $19 Hobby for 5 members, $49 Starter for 5 testers, $99 Professional for up to 20 testers. AI test case generation ships on every paid plan. Shared Steps pin to versions per test case — neither TestPad nor TestRail offers that. Requirements Traceability is unlimited on Hobby, not gated to Enterprise.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (30-day trial)', b: 'No (14-day trial)' },
    { feature: 'Structured Test Cases', testably: true, a: 'Checklist style only', b: true },
    { feature: 'Shared Steps version pinning', testably: true, a: false, b: 'Always-latest' },
    { feature: 'AI test generation', testably: 'All paid plans', a: false, b: false },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: false, b: 'Enterprise only' },
    { feature: 'CI/CD integration', testably: 'Professional+', a: 'Higher plans', b: 'Enterprise only' },
    { feature: 'Jira two-way sync', testably: 'All plans', a: 'Higher plans', b: 'Paid plans only' },
    { feature: 'Flat-rate pricing', testably: true, a: 'Bracket-based', b: false },
    { feature: 'Setup time', testably: '< 5 min', a: '< 5 min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '30-day trial only' },
      b: { price: 'No free tier', detail: '14-day trial only' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '£49–59/mo', detail: 'Essential, 3 users' },
      b: { price: '$185–370/mo', detail: '$38–71 × 5' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '£99–149/mo', detail: 'Pro plan, ~10 users' },
      b: { price: '$370–740/mo', detail: '$38–71 × 10' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: 'Custom', detail: 'Bracket pricing' },
      b: { price: '$740–1,420/mo', detail: '$38–71 × 20' },
    },
    {
      plan: 'AI test generation',
      testably: { price: 'Included', detail: 'All paid plans' },
      a: { price: 'Not offered', detail: 'No AI features' },
      b: { price: 'Not offered', detail: 'No AI features' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'TestPad has no structured test cases',
      body: 'Test-script-as-checklist by design. No Shared Steps, no version pinning, no Requirements Traceability. Audit-heavy and regulated teams need more structure.',
    },
    {
      competitor: 'a',
      title: 'AI and integrations missing',
      body: 'No AI test case generation. Jira two-way sync, CI/CD, and Slack notifications gated to higher plans or unavailable.',
    },
    {
      competitor: 'b',
      title: 'TestRail gates everything to Enterprise',
      body: 'Requirements Traceability, CI/CD, and test case version control all require the $71/user Enterprise tier. A 20-person team pays $17,040/year before negotiation.',
    },
    {
      competitor: 'b',
      title: 'No native AI, no Shared Step versioning',
      body: 'TestRail ships no AI features. Shared Steps are always-latest only — no per-test-case version pinning.',
    },
  ],
  testablyWins: [
    {
      title: 'Free forever, no trial countdown',
      body: 'TestPad has a 30-day trial only. TestRail has a 14-day trial. Testably Free is permanent: 1 project, 2 members, 100 test cases.',
    },
    {
      title: 'Structured Test Cases + the speed of TestPad',
      body: 'Full Test Case structure with Shared Step version pinning — but setup in under 5 minutes. Sign up, import a CSV, start running.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan. Neither TestPad nor TestRail offer AI.',
    },
    {
      title: 'RTM and Jira sync without Enterprise',
      body: 'Unlimited Requirements Traceability on Hobby. Native two-way Jira sync on every plan including Free.',
    },
  ],
  metaTitle: 'TestPad vs TestRail (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'TestPad vs TestRail compared on pricing, AI, structure, and integrations. See why both miss the middle ground and how Testably bridges them.',
  metaKeywords: [
    'testpad vs testrail',
    'testrail vs testpad',
    'testpad alternative',
    'testrail alternative',
    'lightweight test management',
    'enterprise test management',
  ],
  faqs: [
    {
      question: 'Which is cheaper, TestPad or TestRail?',
      answer:
        'TestPad is dramatically cheaper for small teams — Essential is £49/month for 3 users versus TestRail Professional at $38/user/month. But TestPad lacks structured test cases, AI, and full Jira integration. Testably is $19/month for 5 members on the Hobby plan with full structure and AI included.',
    },
    {
      question: 'Does TestPad or TestRail include AI test case generation?',
      answer:
        'No. Neither TestPad nor TestRail ships AI test case generation as a core feature. Testably bundles AI on every paid plan starting at $19/month.',
    },
    {
      question: 'Can I migrate from TestPad or TestRail to Testably?',
      answer:
        'Yes. Both export to CSV. Testably accepts CSV import with auto-mapping. Most migrations under 1,000 test cases complete in under an hour.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default testpadVsTestrailData;
