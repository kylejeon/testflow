import type { VsMatrixData } from '../competitors/types';

/**
 * Xray vs Zephyr Scale — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.getxray.app/pricing
 *   - https://smartbear.com/product/zephyr-scale/
 *   - docs/research/competitor-xray.md, competitor-zephyr.md
 *
 * Both products are Jira-coupled. Tone: a fair comparison of two Jira add-ons,
 * then Testably as the standalone, flat-rate alternative.
 */
export const xrayVsZephyrData: VsMatrixData = {
  slug: 'xray-vs-zephyr',
  a: 'xray',
  b: 'zephyr',
  h1: 'Xray vs Zephyr Scale (2026): Two Jira Add-Ons — and a Standalone Alternative',
  subhead:
    'Xray and Zephyr Scale are the two most-installed Jira test management plugins. Both bill against your entire Jira user count. The standalone, flat-rate alternative.',
  introBody:
    "Xray and Zephyr Scale are the two most-installed Jira test management plugins and they price like it. Both inherit Jira's pricing curve: tier-based by Jira user count, not by tester count. A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on either product. Xray edges out Zephyr Scale on test automation depth — its REST API and BDD support are stronger. Zephyr Scale edges Xray on traceability inside Jira issues and on Cloud-native UI polish. Both are tied to Jira: if your team does not run Jira, neither is an option. The free Zephyr Scale tier exists only for Jira instances with 10 or fewer users. Xray has no free tier — only a trial. Neither ships AI test case generation as a core feature. Neither offers true Shared Steps version pinning. Most teams comparing Xray and Zephyr Scale end up evaluating whether a standalone tool would serve them better. Testably is the standalone, flat-rate, Jira-optional alternative: Free forever, $19 Hobby for 5 members, $49 Starter, $99 Professional for up to 20 testers. Billing is by QA tester only — Jira user count is irrelevant. Native Jira two-way sync ships on every plan including Free, but Jira is never required.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (trial only)', b: 'Free only if Jira ≤10 users' },
    { feature: 'Standalone (no Jira required)', testably: true, a: false, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: false, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: false, b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Limited', b: 'Always-latest' },
    { feature: 'Test automation API depth', testably: true, a: true, b: 'Limited' },
    { feature: 'BDD / Gherkin support', testably: 'Via import', a: 'Native', b: 'Add-on' },
    { feature: 'Jira-native UI', testably: false, a: true, b: true },
    { feature: 'Setup time', testably: '< 5 min', a: '30+ min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: 'Trial only' },
      b: { price: '$0/mo', detail: 'Only if Jira has ≤10 users' },
    },
    {
      plan: 'Small team (5 testers, 50 Jira users)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
      b: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
    },
    {
      plan: 'Mid team (10 testers, 100 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
      b: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
    },
    {
      plan: 'Large team (20 testers, 200 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$2,000/mo', detail: 'Billed on 200 Jira users' },
      b: { price: '~$2,000/mo', detail: 'Billed on 200 Jira users' },
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
      title: 'Xray bills on Jira users, not testers',
      body: 'A 100-Jira-user company with 5 testers pays for all 100 seats. The math punishes large engineering orgs with small QA teams.',
    },
    {
      competitor: 'a',
      title: 'No free tier, no AI',
      body: 'Xray offers only a trial — no permanent free plan. AI test case generation is not available at any tier.',
    },
    {
      competitor: 'b',
      title: 'Zephyr Scale bills on Jira users too',
      body: 'Same per-Jira-user math as Xray. The free tier exists only for Jira instances with 10 or fewer users.',
    },
    {
      competitor: 'b',
      title: 'Always-latest Shared Steps, no AI',
      body: 'No per-test-case Shared Step version pinning. No AI features. Test automation API is thinner than Xray.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone — Jira optional',
      body: 'Run Testably with or without Jira. Native two-way Jira sync ships on every plan including Free, but is never required.',
    },
    {
      title: 'Billed on QA testers only',
      body: 'A 200-Jira-user company with 20 testers pays $99/month on Testably Professional — not ~$2,000/month like Xray or Zephyr Scale.',
    },
    {
      title: 'Flat-rate at every team size',
      body: '$19 Hobby. $49 Starter. $99 Professional for up to 20 testers. No per-seat or per-Jira-user math.',
    },
    {
      title: 'AI on every paid plan + Shared Step versioning',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on Hobby. Pin Shared Step versions per test case — neither Xray nor Zephyr Scale offer both.',
    },
  ],
  metaTitle: 'Xray vs Zephyr Scale (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'Xray vs Zephyr Scale compared on pricing, Jira coupling, AI, and Shared Steps. See why both Jira add-ons penalize growth and how Testably stays flat-rate.',
  metaKeywords: [
    'xray vs zephyr',
    'zephyr vs xray',
    'xray alternative',
    'zephyr scale alternative',
    'jira test management',
    'jira plugin test management',
  ],
  faqs: [
    {
      question: 'Is Xray or Zephyr Scale better for Jira-first teams?',
      answer:
        'Both are excellent for Jira-first teams. Xray edges Zephyr Scale on test automation depth (REST API, BDD/Gherkin native). Zephyr Scale edges Xray on Cloud-native UI polish and traceability inside Jira issues. Pricing is similar (both per-Jira-user) at most Jira sizes.',
    },
    {
      question: 'Which is cheaper, Xray or Zephyr Scale?',
      answer:
        'For most Jira user counts, Xray and Zephyr Scale Cloud prices are similar (both tier-priced on Jira users). Zephyr Scale has a free tier for Jira instances with 10 or fewer users; Xray does not. Testably is dramatically cheaper at all team sizes ($19–99/month flat) because it bills on QA testers only.',
    },
    {
      question: 'Do either Xray or Zephyr Scale offer AI test case generation?',
      answer:
        'No. Neither Xray nor Zephyr Scale ships AI test case generation. Testably bundles AI on every paid plan from $19/month.',
    },
    {
      question: 'Can I run Xray or Zephyr Scale without Jira?',
      answer:
        'No. Both are Jira add-ons and require an active Jira license. Testably runs standalone with optional native Jira two-way sync on every plan.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default xrayVsZephyrData;
