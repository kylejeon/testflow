import type { VsMatrixData } from '../competitors/types';

/**
 * TestRail vs Xray — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.testrail.com/pricing
 *   - https://www.getxray.app/pricing
 *   - docs/research/competitor-testrail.md, competitor-xray.md
 */
export const testrailVsXrayData: VsMatrixData = {
  slug: 'testrail-vs-xray',
  a: 'testrail',
  b: 'xray',
  h1: 'TestRail vs Xray (2026): Standalone Enterprise vs Jira-Native — and a Better Alternative',
  subhead:
    "TestRail charges $38–$71 per user per month. Xray bills against your entire Jira user count. Both punish growing teams. Here is the standalone, flat-rate alternative.",
  introBody:
    "TestRail and Xray are the two most-considered options on enterprise QA shortlists. TestRail is the standalone enterprise default: deep features, broad integrations, and pricing at $38 per user per month on Professional Cloud or $71 per user per month on Enterprise Cloud, with key features like Requirements Traceability and CI/CD locked into the Enterprise tier. Xray is the most-installed Jira test management plugin: deep Jira integration, requirements built into Jira issues, and pricing that inherits Jira's curve — Cloud is tier-priced by Jira user count (not tester count), and Server / Data Center editions bill per Jira user as well. A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Xray. TestRail does not have the Jira coupling but charges per tester at premium rates. Neither ships AI test case generation as a core feature. Neither offers true Shared Steps version pinning. Both products land on the wrong side of the per-seat trap for almost every growing team. Testably is the flat-rate, Jira-optional alternative: Free forever, $19 Hobby for 5 members, $49 Starter, $99 Professional for up to 20 testers. Native Jira two-way sync ships on every plan including Free, but Jira is never required. A 20-tester team saves $7,000–$17,000 per year versus TestRail Enterprise or Xray Cloud at typical Jira sizes.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (14-day trial)', b: 'No (trial only)' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: false, b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Always-latest', b: 'Limited' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Enterprise only', b: 'Built-in (Jira)' },
    { feature: 'CI/CD integration', testably: 'Professional+', a: 'Enterprise only', b: true },
    { feature: 'Jira two-way sync', testably: 'All plans (optional)', a: 'Paid plans only', b: 'Native (required)' },
    { feature: 'Setup time', testably: '< 5 min', a: '30+ min', b: '30+ min (Jira install)' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '14-day trial only' },
      b: { price: 'No free tier', detail: 'Trial only' },
    },
    {
      plan: 'Small team (5 testers, 50 Jira users)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '$185–370/mo', detail: '$38–71 × 5' },
      b: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
    },
    {
      plan: 'Mid team (10 testers, 100 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$370–740/mo', detail: '$38–71 × 10' },
      b: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
    },
    {
      plan: 'Large team (20 testers, 200 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$740–1,420/mo', detail: '$38–71 × 20' },
      b: { price: '~$2,000/mo', detail: 'Billed on 200 Jira users' },
    },
    {
      plan: 'Annual cost (20 testers, 200 Jira users)',
      testably: { price: '$1,188', detail: '$99 × 12' },
      a: { price: '$17,040', detail: '$71 × 20 × 12 (Enterprise)' },
      b: { price: '$24,000+', detail: 'Billed on Jira user count' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'TestRail gates everything to Enterprise',
      body: 'Requirements Traceability, CI/CD, and test case version control all require the $71/user Enterprise tier. The per-seat trap at $71 is the worst-case for any growing team.',
    },
    {
      competitor: 'a',
      title: 'No AI, no Shared Step versioning',
      body: 'TestRail ships no AI test case generation, no deduplication, no failure summarization. Shared Steps are always-latest only — no per-test-case version pinning.',
    },
    {
      competitor: 'b',
      title: 'Xray bills per Jira user, not tester',
      body: 'A 100-Jira-user company with 5 testers still pays for all 100 seats. Engineering headcount growth drives cost up even if QA team size is unchanged.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira to function',
      body: 'Xray is a Jira plugin. If your team does not run Jira, Xray is not an option. Even with Jira, test case authoring lives two clicks deep inside each issue.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone with optional Jira sync',
      body: 'Run Testably with or without Jira. Native two-way Jira sync ships on every plan including Free, but is never required.',
    },
    {
      title: 'Flat-rate, billed on QA testers only',
      body: '$19 Hobby. $49 Starter. $99 Professional for up to 20 testers. A 20-tester team saves $7,000–$17,000/year versus TestRail Enterprise or Xray Cloud.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan. Neither TestRail nor Xray offer AI.',
    },
    {
      title: 'Shared Steps with version pinning',
      body: 'Pin Shared Step versions per test case. Side-by-side diffs. Bulk updates. Frozen run snapshots so edits never affect runs already in progress.',
    },
  ],
  metaTitle: 'TestRail vs Xray (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'TestRail vs Xray compared on pricing, Jira coupling, AI, and Shared Steps. See why per-seat and per-Jira-user both penalize growth — and how Testably solves it.',
  metaKeywords: [
    'testrail vs xray',
    'xray vs testrail',
    'testrail alternative',
    'xray alternative',
    'jira test management',
    'enterprise test management',
  ],
  faqs: [
    {
      question: 'Is TestRail or Xray better for Jira-first teams?',
      answer:
        "Xray lives inside each Jira issue, which is convenient if Jira is your everyday tool. But it bills on every Jira user, so the cost scales with engineering headcount, not tester count. TestRail is standalone with paid Jira integration. Testably is also standalone with native two-way Jira sync on every plan including Free — and bills only on QA testers.",
    },
    {
      question: 'Does TestRail or Xray include AI test case generation?',
      answer:
        'No. Neither TestRail nor Xray ships AI test case generation as a core feature. Testably bundles AI on every paid plan from $19/month.',
    },
    {
      question: 'How much can I save by switching from TestRail or Xray?',
      answer:
        'A 20-tester team on TestRail Enterprise pays $17,040/year. The same team on Xray with 200 Jira users pays $24,000+/year. Testably Professional is $1,188/year flat — savings of $15,000–$22,000 per year.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default testrailVsXrayData;
