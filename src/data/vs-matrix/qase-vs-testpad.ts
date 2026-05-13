import type { VsMatrixData } from '../competitors/types';

/**
 * Qase vs TestPad — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://qase.io/pricing
 *   - https://www.testpad.com/pricing
 *   - docs/research/competitor-qase.md, competitor-testpad.md
 */
export const qaseVsTestpadData: VsMatrixData = {
  slug: 'qase-vs-testpad',
  a: 'qase',
  b: 'testpad',
  h1: 'Qase or TestPad? Why Neither Is the Best Choice for Growing QA Teams',
  subhead:
    "Qase's per-seat pricing climbs fast above 10 testers. TestPad is intentionally simple and skips structured Test Cases, AI, and full Jira sync. There is a better middle.",
  introBody:
    "Qase and TestPad both pitch a modern, friendly alternative to enterprise tools like TestRail. They land in very different places. Qase is the structured-but-modern option: full Test Case management, Shared Steps, Requirements Traceability on the Business plan, Jira two-way sync, and per-user pricing at $25/month Startup and $44/month Business. The Free plan covers 3 users and 500 test cases — generous for tiny teams. TestPad is the deliberately lightweight option: a test-script-as-checklist interface, no Shared Steps, no Requirements Traceability, no AI features, and bracket-based per-user pricing starting at £49/month for 3 users. Most growing QA teams hit a wall with either choice. Qase becomes expensive past 10 testers ($250–$880 per month). TestPad's checklist model is too thin for audit-heavy or regression-critical work. Testably is the structured-and-flat-rate middle: Free forever, $19 Hobby for 5 members, $49 Starter, $99 Professional for up to 20 testers. AI test case generation ships on every paid plan. Shared Steps pin to versions per test case — neither Qase nor TestPad offers that.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: '3 users · 500 TCs', b: 'No (30-day trial)' },
    { feature: 'Structured Test Cases', testably: true, a: true, b: 'Checklist style only' },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Always-latest', b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Paid add-on', b: false },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Business+', b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: 'Bracket-based' },
    { feature: 'Jira two-way sync', testably: 'All plans', a: 'Built-in', b: 'Higher plans' },
    { feature: 'CI/CD integration', testably: 'Professional+', a: true, b: 'Higher plans' },
    { feature: 'Setup time', testably: '< 5 min', a: '15 min', b: '< 5 min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: '$0/mo', detail: '3 users · 1 project · 500 TCs' },
      b: { price: 'No free tier', detail: '30-day trial only' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '$125/mo', detail: '$25 × 5 (Startup)' },
      b: { price: '£49–59/mo', detail: 'Essential, 3 users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$250/mo', detail: '$25 × 10 (Startup)' },
      b: { price: '£99–149/mo', detail: 'Pro plan, ~10 users' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$500–880/mo', detail: '$25–44 × 20' },
      b: { price: 'Custom', detail: 'Bracket pricing' },
    },
    {
      plan: 'AI test generation',
      testably: { price: 'Included', detail: 'All paid plans' },
      a: { price: 'Add-on', detail: 'Sold separately' },
      b: { price: 'Not offered', detail: 'No AI features' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'Qase per-seat pricing scales linearly',
      body: 'Startup is $25/user/month, Business is $44. A 20-tester team pays $500–$880/month before any AI add-on. The free-tier appeal disappears above 10 testers.',
    },
    {
      competitor: 'a',
      title: 'No Shared Steps version pinning',
      body: 'Qase Shared Steps cannot be pinned to a version. Edits propagate to every test case immediately, including in-progress runs — a regression risk.',
    },
    {
      competitor: 'b',
      title: 'No structured test cases',
      body: 'TestPad uses test-script-as-checklist by design. No Shared Steps, no version pinning, no Requirements Traceability. Audit-heavy and regulated teams need more structure.',
    },
    {
      competitor: 'b',
      title: 'AI and integrations missing',
      body: 'TestPad ships no AI test case generation. Jira two-way sync, CI/CD, and Slack are gated to higher plans or unavailable.',
    },
  ],
  testablyWins: [
    {
      title: 'Flat-rate $99/mo covers up to 20 testers',
      body: 'No per-seat math. Hobby is $19. Starter is $49. Professional is $99 for the entire QA team up to 20 members.',
    },
    {
      title: 'AI included on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan. No separate AI subscription.',
    },
    {
      title: 'Shared Steps with version pinning',
      body: 'Each test case pins the Shared Step version it links. Edits do not affect runs already in progress. Side-by-side diffs before every upgrade.',
    },
    {
      title: 'Structured Test Cases + Requirements Traceability on Hobby',
      body: 'Full Test Case structure plus unlimited RTM from $19/month — not gated to Business tier like Qase.',
    },
  ],
  metaTitle: 'Qase vs TestPad (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'Qase vs TestPad compared on pricing, AI, structure, and integrations. See where both fall short for growing QA teams and how Testably bridges the gap.',
  metaKeywords: [
    'qase vs testpad',
    'testpad vs qase',
    'qase alternative',
    'testpad alternative',
    'test management comparison',
    'flat-rate test management',
  ],
  faqs: [
    {
      question: 'Is Qase or TestPad better for small QA teams?',
      answer:
        'Qase has the more generous free tier (3 users, 500 test cases). TestPad is friendlier to start but lacks structured test cases, AI, and full Jira two-way sync. Above 5 testers, Qase becomes per-seat expensive. Testably solves both: free forever, then flat-rate at $19/$49/$99.',
    },
    {
      question: 'Does Qase or TestPad have AI test generation?',
      answer:
        'Qase sells AI as a paid add-on. TestPad has none. Testably includes AI test case generation on every paid plan starting at $19/month.',
    },
    {
      question: 'Can Qase Shared Steps be pinned to a specific version?',
      answer:
        'No. Qase Shared Steps are always-latest only. Edits propagate to every linked test case immediately. Testably is the only tool of these three with per-test-case Shared Step version pinning, side-by-side diff, and run snapshots.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default qaseVsTestpadData;
