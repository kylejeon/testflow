import type { VsMatrixData } from '../competitors/types';

/**
 * Qase vs Xray — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://qase.io/pricing
 *   - https://www.getxray.app/pricing
 *   - docs/research/competitor-qase.md, competitor-xray.md
 */
export const qaseVsXrayData: VsMatrixData = {
  slug: 'qase-vs-xray',
  a: 'qase',
  b: 'xray',
  h1: 'Qase vs Xray (2026): Standalone Per-Seat vs Jira-Locked Per-Jira-User',
  subhead:
    'Qase bills per QA tester. Xray bills against your entire Jira user count. Both penalize growth. Here is the comparison and the flat-rate alternative.',
  introBody:
    "Qase and Xray solve the same problem with very different shapes. Qase is the modern standalone — clean UI, generous free tier (3 users, 500 test cases), and per-user pricing at $25 Startup and $44 Business. Xray is the most-installed Jira test management plugin, which means its pricing inherits Jira's curve: Xray Cloud is tier-priced by Jira user count, not tester count, and Server / Data Center editions bill per Jira user as well. A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Xray. Qase is cheaper for small teams (the 3-user free tier is unmatched) but per-seat math climbs fast above 10 testers. Xray is cheaper if your Jira user count is small but punishes large engineering orgs with small QA teams. Neither ships AI test case generation as a core feature. Neither offers true Shared Steps version pinning. Testably is the flat-rate, Jira-optional alternative: Free forever, $19 Hobby for 5 members, $49 Starter for 5 testers, $99 Professional for up to 20 testers. Billing is by QA tester only — Jira user count is irrelevant. Native Jira two-way sync ships on every plan including Free.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: '3 users · 500 TCs', b: 'No (trial only)' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Paid add-on', b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Always-latest', b: 'Limited' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Business+', b: 'Built-in (Jira)' },
    { feature: 'Jira two-way sync', testably: 'All plans', a: 'Built-in', b: 'Native (Jira required)' },
    { feature: 'Setup time', testably: '< 5 min', a: '15 min', b: '30+ min (Jira install)' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: '$0/mo', detail: '3 users · 1 project · 500 TCs' },
      b: { price: 'No free tier', detail: 'Trial only' },
    },
    {
      plan: 'Small team (5 testers, 50 Jira users)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '$125/mo', detail: '$25 × 5 (Startup)' },
      b: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
    },
    {
      plan: 'Mid team (10 testers, 100 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$250/mo', detail: '$25 × 10 (Startup)' },
      b: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
    },
    {
      plan: 'Large team (20 testers, 200 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '$500–880/mo', detail: '$25–44 × 20' },
      b: { price: '~$2,000/mo', detail: 'Billed on 200 Jira users' },
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
      body: 'A 20-tester team pays $500–$880/month before AI. The free-tier appeal disappears above 10 testers.',
    },
    {
      competitor: 'a',
      title: 'Always-latest Shared Steps',
      body: 'Qase Shared Steps cannot pin to a version. Edits propagate to every test case immediately, including in-progress runs.',
    },
    {
      competitor: 'b',
      title: 'Xray bills on Jira users, not testers',
      body: 'A 100-Jira-user company with 5 testers pays for all 100 seats. Engineering headcount growth drives Xray cost up even if QA team size is unchanged.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira',
      body: 'Xray is a Jira plugin. Without Jira, it cannot run. Even with Jira, test case authoring lives two clicks deep inside each issue.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone — Jira optional',
      body: 'Run Testably with or without Jira. Native two-way Jira sync on every plan including Free, but not required.',
    },
    {
      title: 'Billed on QA testers only',
      body: 'A 100-Jira-user company with 5 testers pays $49/month on Testably Starter — not $500/month like Xray.',
    },
    {
      title: 'Flat-rate at every team size',
      body: '$19 Hobby. $49 Starter. $99 Professional for up to 20 testers. No per-seat math, no Jira-user math.',
    },
    {
      title: 'AI and Shared Step pinning included',
      body: 'AI test case generation on every paid plan from $19/month. Shared Steps pin to versions per test case — neither Qase nor Xray offer that.',
    },
  ],
  metaTitle: 'Qase vs Xray (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'Qase vs Xray compared on pricing, Jira coupling, AI, and Shared Steps. See why per-seat and per-Jira-user pricing both punish growth and how Testably solves it.',
  metaKeywords: [
    'qase vs xray',
    'xray vs qase',
    'qase alternative',
    'xray alternative',
    'jira test management',
    'standalone test management',
  ],
  faqs: [
    {
      question: 'Is Qase or Xray better for Jira-first teams?',
      answer:
        "Xray is convenient if Jira is your everyday tool — test cases live inside Jira issues. But the cost scales with Jira user count, not tester count. Qase has a generous free tier (3 users) and per-tester pricing but lacks Jira-native UI depth. Testably is standalone with native two-way Jira sync — billed on QA testers only.",
    },
    {
      question: 'Does Qase or Xray ship AI test case generation?',
      answer:
        'Qase sells AI as a paid add-on. Xray has no AI features. Testably bundles AI generation on every paid plan from $19/month.',
    },
    {
      question: 'Can I migrate from Qase or Xray to Testably?',
      answer:
        'Yes. Qase supports CSV export and a public API. Xray supports CSV export and the Atlassian Marketplace API. Testably accepts CSV import for both. Most migrations of fewer than 1,000 test cases complete in under an hour.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default qaseVsXrayData;
