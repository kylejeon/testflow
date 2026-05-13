import type { VsMatrixData } from '../competitors/types';

/**
 * Qase vs TestRail — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://qase.io/pricing
 *   - https://www.testrail.com/pricing
 *   - docs/research/competitor-qase.md, competitor-testrail.md
 */
export const qaseVsTestrailData: VsMatrixData = {
  slug: 'qase-vs-testrail',
  a: 'qase',
  b: 'testrail',
  h1: 'Qase vs TestRail (2026): Modern Per-Seat vs Legacy Per-Seat',
  subhead:
    "Qase and TestRail both bill per user. Qase is the modern UI; TestRail is the legacy default. Both miss flat-rate plans and shared-step version pinning. There is a third option.",
  introBody:
    "Qase and TestRail are the most common head-to-head shortlist when QA leaders look for a test case management tool. TestRail is the 15-year-old enterprise default — deep feature set, broad integrations, and pricing that reflects 2010s enterprise SaaS: $38 per user per month on Professional Cloud, $71 per user per month on Enterprise Cloud, with key features like Requirements Traceability and CI/CD gated to Enterprise. Qase is the modern challenger: cleaner UI, generous free tier (3 users, 500 test cases), and lower per-seat pricing at $25 Startup and $44 Business. The catch is that both still bill per user. A 20-tester team pays $500–$880 per month on Qase and $760–$1,420 per month on TestRail. Neither offers true Shared Steps version pinning — Qase is always-latest, TestRail has no version control on Shared Steps. Neither bundles AI in the core plan; Qase sells AI as a paid add-on, TestRail has none. Testably is the flat-rate alternative: Free forever, $19 Hobby, $49 Starter, $99 Professional for up to 20 testers. AI ships on every paid plan. Shared Steps pin to versions per test case. The Free plan is permanent, not a trial.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: '3 users · 500 TCs', b: 'No (14-day trial)' },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Paid add-on', b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Always-latest', b: 'Always-latest' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Business+', b: 'Enterprise only' },
    { feature: 'CI/CD integration', testably: 'Professional+', a: true, b: 'Enterprise only' },
    { feature: 'Jira two-way sync', testably: 'All plans', a: 'Built-in', b: 'Paid plans only' },
    { feature: 'Per-user pricing', testably: false, a: '$25–44/u/mo', b: '$38–71/u/mo' },
    { feature: 'Setup time', testably: '< 5 min', a: '15 min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: '$0/mo', detail: '3 users · 1 project · 500 TCs' },
      b: { price: 'No free tier', detail: '14-day trial only' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '$125/mo', detail: '$25 × 5 (Startup)' },
      b: { price: '$185–370/mo', detail: '$38–71 × 5' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$250/mo', detail: '$25 × 10 (Startup)' },
      b: { price: '$370–740/mo', detail: '$38–71 × 10' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$500–880/mo', detail: '$25–44 × 20' },
      b: { price: '$740–1,420/mo', detail: '$38–71 × 20' },
    },
    {
      plan: 'Annual cost (20 testers, max plan)',
      testably: { price: '$1,188', detail: '$99 × 12' },
      a: { price: '$10,560', detail: '$44 × 20 × 12' },
      b: { price: '$17,040', detail: '$71 × 20 × 12' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'Qase per-seat math at scale',
      body: 'Business plan is $44/user/month. A 20-tester team pays $880/month before any AI add-on. The savings vs TestRail disappear above 15–20 testers.',
    },
    {
      competitor: 'a',
      title: 'Shared Steps are always-latest',
      body: 'Qase has no per-test-case version pinning. Edits to a shared step propagate to every linked test case instantly — a real regression risk for stable suites.',
    },
    {
      competitor: 'b',
      title: 'TestRail gates everything to Enterprise',
      body: 'Requirements Traceability, CI/CD, and test case version control all require the $71/user Enterprise tier. The per-seat trap at $71 is the worst-case for any growing team.',
    },
    {
      competitor: 'b',
      title: 'No AI, no modern Shared Steps',
      body: 'TestRail ships no AI features and no version control on Shared Steps. Customers integrate third-party AI via API and live with always-latest steps.',
    },
  ],
  testablyWins: [
    {
      title: 'Flat-rate $99/mo for up to 20 testers',
      body: 'No per-seat math. Save $7,000–$15,000/year vs Qase Business or TestRail Enterprise.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan.',
    },
    {
      title: 'Shared Steps with true version pinning',
      body: 'Pin Shared Step versions per test case. Side-by-side diffs. Bulk updates. Frozen run snapshots so edits never affect runs already in progress.',
    },
    {
      title: 'RTM and Jira sync without Enterprise',
      body: 'Unlimited Requirements Traceability on Hobby. Native two-way Jira sync on every plan including Free.',
    },
  ],
  metaTitle: 'Qase vs TestRail (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'Qase vs TestRail compared on pricing, AI, Shared Steps, and RTM. See where both fall short for growing teams and how Testably saves $7,000+/year flat rate.',
  metaKeywords: [
    'qase vs testrail',
    'testrail vs qase',
    'qase alternative',
    'testrail alternative',
    'test management comparison',
    'flat-rate test management',
  ],
  faqs: [
    {
      question: 'Is Qase cheaper than TestRail?',
      answer:
        'Yes, at every team size. Qase Startup is $25/user/month vs TestRail Professional at $38, and Qase Business is $44/user/month vs TestRail Enterprise at $71. For 20 users that is $500–$880/month on Qase versus $760–$1,420/month on TestRail. Both are still per-seat. Testably Professional is $99/month flat.',
    },
    {
      question: 'Which has better AI features?',
      answer:
        'Qase sells AI as a paid add-on. TestRail has no AI features. Testably bundles AI test case generation on every paid plan starting at $19/month.',
    },
    {
      question: 'Can either Qase or TestRail pin Shared Step versions?',
      answer:
        'No. Qase Shared Steps are always-latest. TestRail Shared Steps are always-latest. Testably is the only tool of the three with per-test-case Shared Step version pinning, side-by-side diff, and frozen run snapshots.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default qaseVsTestrailData;
