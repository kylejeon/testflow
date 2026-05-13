import type { VsMatrixData } from '../competitors/types';

/**
 * TestRail vs Zephyr Scale — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.testrail.com/pricing
 *   - https://smartbear.com/product/zephyr-scale/
 *   - docs/research/competitor-testrail.md, competitor-zephyr.md
 *
 * The single highest-volume vs-matchup keyword in the cluster. Tone:
 * fair comparison, then surface Testably as the standalone, flat-rate alternative.
 */
export const testrailVsZephyrData: VsMatrixData = {
  slug: 'testrail-vs-zephyr',
  a: 'testrail',
  b: 'zephyr',
  h1: 'TestRail vs Zephyr Scale (2026): The Honest Comparison — and a Better Alternative',
  subhead:
    'TestRail charges $38–$71 per user per month. Zephyr Scale bills against your entire Jira user count. The standalone, flat-rate alternative most teams pick instead.',
  introBody:
    "TestRail and Zephyr Scale are the two most-considered options on enterprise QA shortlists. TestRail is the standalone enterprise default: a deep feature set, broad integrations, and pricing that reflects 2010s enterprise SaaS — $38 per user per month on Professional Cloud, $71 per user per month on Enterprise Cloud, with the most important features (Requirements Traceability, CI/CD, test case version control) gated to Enterprise. Zephyr Scale is the most-installed Jira test management plugin: Jira-native test cycles, requirements built into Jira issues, and pricing that inherits Jira's curve. Zephyr Scale Cloud is tier-priced by Jira user count, not tester count, and the free tier exists only for Jira instances with 10 or fewer users. A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Zephyr Scale. TestRail does not have the Jira coupling but charges premium per-seat rates. Neither ships AI test case generation as a core feature. Neither offers true Shared Steps version pinning. Most teams comparing TestRail and Zephyr Scale end up looking for a third option. Testably is the standalone, flat-rate, Jira-optional alternative: Free forever, $19 Hobby for 5 members, $49 Starter for 5 testers, $99 Professional for up to 20 testers. Native Jira two-way sync ships on every plan including Free, but Jira is never required. AI test case generation is on every paid plan. Shared Steps pin to versions per test case.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (14-day trial)', b: 'Free only if Jira ≤10 users' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: false, b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Always-latest', b: 'Always-latest' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Enterprise only', b: 'Via Jira' },
    { feature: 'CI/CD integration', testably: 'Professional+', a: 'Enterprise only', b: true },
    { feature: 'Jira two-way sync', testably: 'All plans (optional)', a: 'Paid plans only', b: 'Native (required)' },
    { feature: 'Setup time', testably: '< 5 min', a: '30+ min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '14-day trial only' },
      b: { price: '$0/mo', detail: 'Only if Jira has ≤10 users' },
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
      title: 'TestRail gates key features to Enterprise',
      body: 'Requirements Traceability, CI/CD, and test case version control all require the $71/user Enterprise tier. A 20-person team pays $17,040/year before negotiation.',
    },
    {
      competitor: 'a',
      title: 'No AI, no Shared Step versioning',
      body: 'TestRail does not ship AI test case generation. Shared Steps are always-latest only — no per-test-case version pinning.',
    },
    {
      competitor: 'b',
      title: 'Zephyr Scale bills per Jira user',
      body: 'A 100-Jira-user company with 5 testers still pays for all 100 seats. The free tier is restricted to Jira instances with 10 or fewer users.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira to function',
      body: 'Zephyr Scale is a Jira add-on. Without Jira, it cannot run. Test case authoring lives inside Jira issues — context switches and limited keyboard navigation.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone with optional Jira sync',
      body: 'Testably runs with or without Jira. Native two-way Jira sync ships on every plan including Free, but is never required.',
    },
    {
      title: 'Flat-rate, billed on QA testers only',
      body: '$19 Hobby. $49 Starter. $99 Professional for up to 20 testers. A 20-tester team saves $15,000–$22,000/year versus TestRail Enterprise or Zephyr Scale at typical Jira sizes.',
    },
    {
      title: 'AI on every paid plan from $19/month',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on Hobby. Neither TestRail nor Zephyr Scale offer AI.',
    },
    {
      title: 'Shared Steps with version pinning',
      body: 'Pin Shared Step versions per test case. Side-by-side diffs. Bulk updates. Frozen run snapshots — neither TestRail nor Zephyr Scale offer this.',
    },
  ],
  metaTitle: 'TestRail vs Zephyr Scale (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'TestRail vs Zephyr Scale compared on pricing, Jira coupling, AI, and Shared Steps. See why per-seat and per-Jira-user both penalize growth — and Testably solves it.',
  metaKeywords: [
    'testrail vs zephyr',
    'zephyr vs testrail',
    'testrail alternative',
    'zephyr scale alternative',
    'jira test management',
    'enterprise test management',
  ],
  faqs: [
    {
      question: 'Is TestRail or Zephyr Scale cheaper?',
      answer:
        'It depends on Jira user count. For a 50-Jira-user company with 10 testers, TestRail Professional is ~$380/month and Zephyr Scale is ~$500/month. For a 200-Jira-user company with 10 testers, Zephyr Scale jumps to ~$2,000/month while TestRail stays at $380/month. TestRail Enterprise ($71/user) is the most expensive of the two above 25 testers. Testably Professional is $99/month flat regardless.',
    },
    {
      question: 'Which has better Jira integration?',
      answer:
        "Zephyr Scale is Jira-native — test cycles, requirements, and bug links all live inside Jira. TestRail integrates with Jira via add-ons on paid plans. Testably has native two-way Jira sync on every plan including Free — but doesn't require Jira to function.",
    },
    {
      question: 'Do either offer AI test case generation?',
      answer:
        'No. Neither TestRail nor Zephyr Scale ships AI test case generation as a core feature. Testably bundles AI on every paid plan from $19/month.',
    },
    {
      question: 'How much can I save by switching from TestRail or Zephyr Scale?',
      answer:
        'A 20-tester team on TestRail Enterprise pays $17,040/year. The same team on Zephyr Scale with 200 Jira users pays $24,000+/year. Testably Professional is $1,188/year flat — savings of $15,000–$22,000 per year.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default testrailVsZephyrData;
