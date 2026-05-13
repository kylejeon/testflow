import type { VsMatrixData } from '../competitors/types';

/**
 * Qase vs Zephyr Scale — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://qase.io/pricing
 *   - https://smartbear.com/product/zephyr-scale/  (per-Jira-user pricing)
 *   - docs/research/competitor-qase.md, competitor-zephyr.md
 */
export const qaseVsZephyrData: VsMatrixData = {
  slug: 'qase-vs-zephyr',
  a: 'qase',
  b: 'zephyr',
  h1: 'Qase vs Zephyr Scale (2026): Standalone vs Jira Add-On',
  subhead:
    'Qase has a generous free tier but scales per seat. Zephyr Scale is Jira-native but bills against your entire Jira user count. The standalone, flat-rate alternative.',
  introBody:
    "Qase and Zephyr Scale appear on the same shortlists but take opposite approaches to test management. Qase is the modern standalone — clean UI, 3-user / 500-test-case free tier, and per-user pricing at $25 Startup and $44 Business. Zephyr Scale is the most-installed Jira test management plugin, which means it inherits Jira's pricing curve: tier-priced by Jira user count, not tester count. The free Zephyr Scale tier exists only for Jira instances with 10 or fewer users. A company with 100 Jira users but only 5 QA engineers pays for all 100 seats on Zephyr Scale. Qase is cheaper for small QA teams but climbs above 10 testers ($250–$880 per month). Zephyr Scale is cheaper if Jira user count is small but punishes large engineering orgs with small QA teams. Neither offers true Shared Steps version pinning. Neither bundles AI in the core plan. Testably is the standalone, flat-rate, Jira-optional alternative: Free forever, $19 Hobby for 5 members, $49 Starter, $99 Professional for up to 20 testers — billed on QA testers only, native Jira two-way sync on every plan including Free.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: '3 users · 500 TCs', b: 'Free only if Jira ≤10 users' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Paid add-on', b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Always-latest', b: 'Always-latest' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Business+', b: 'Via Jira' },
    { feature: 'Jira two-way sync', testably: 'All plans (optional)', a: 'Built-in', b: 'Native (required)' },
    { feature: 'Setup time', testably: '< 5 min', a: '15 min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: '$0/mo', detail: '3 users · 1 project · 500 TCs' },
      b: { price: '$0/mo', detail: 'Only if Jira has ≤10 users' },
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
      title: 'Qase per-seat pricing climbs above 10 testers',
      body: 'Startup is $25/user/month, Business is $44. A 20-tester team pays $500–$880/month before AI. The free-tier appeal evaporates above 10 testers.',
    },
    {
      competitor: 'a',
      title: 'Always-latest Shared Steps',
      body: 'No version pinning. Edits propagate to every linked test case immediately — a regression risk for stable suites.',
    },
    {
      competitor: 'b',
      title: 'Zephyr Scale bills on Jira users',
      body: 'A 100-Jira-user company with 5 testers pays for all 100 seats. Engineering growth drives Zephyr Scale cost up even if your QA team stays the same size.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira',
      body: 'Zephyr Scale is a Jira add-on. Without an active Jira license your team cannot use it. The free tier exists only for Jira instances with 10 or fewer users.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone — Jira optional',
      body: 'Testably runs with or without Jira. Native two-way Jira sync ships on every plan including Free, but is never required.',
    },
    {
      title: 'Billed on QA testers only',
      body: 'A 100-Jira-user company with 5 testers pays $49/month on Testably Starter — not $500/month like Zephyr Scale.',
    },
    {
      title: 'Flat-rate at every team size',
      body: '$19 Hobby. $49 Starter. $99 Professional for up to 20 testers. No per-seat or per-Jira-user math.',
    },
    {
      title: 'Shared Steps with version pinning + AI',
      body: 'Pin Shared Step versions per test case. AI test case generation on every paid plan from $19/month — neither Qase nor Zephyr Scale offer both.',
    },
  ],
  metaTitle: 'Qase vs Zephyr Scale (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'Qase vs Zephyr Scale compared on pricing, Jira coupling, AI, and Shared Steps. See why per-seat and per-Jira-user pricing both penalize growth.',
  metaKeywords: [
    'qase vs zephyr',
    'zephyr vs qase',
    'qase alternative',
    'zephyr scale alternative',
    'jira test management',
    'standalone test management',
  ],
  faqs: [
    {
      question: 'Is Qase or Zephyr Scale cheaper for small QA teams?',
      answer:
        'Qase wins for small QA teams in small Jira instances — the 3-user free tier is generous. Zephyr Scale is free only if your Jira instance has 10 or fewer users. Past that threshold, Zephyr Scale is billed on every Jira user (not just testers), so it gets expensive fast in larger engineering orgs. Testably bills only on QA testers at flat rates.',
    },
    {
      question: 'Does Qase or Zephyr Scale offer AI test case generation?',
      answer:
        'Qase sells AI as a paid add-on. Zephyr Scale has no AI features. Testably bundles AI generation on every paid plan from $19/month.',
    },
    {
      question: 'Can I migrate from Qase or Zephyr Scale to Testably?',
      answer:
        'Yes. Both export to CSV. Testably accepts CSV import with auto-mapping. Most migrations of fewer than 1,000 test cases complete in under an hour.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default qaseVsZephyrData;
