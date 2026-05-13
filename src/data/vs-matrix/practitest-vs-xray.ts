import type { VsMatrixData } from '../competitors/types';

/**
 * PractiTest vs Xray — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.practitest.com/pricing
 *   - https://www.getxray.app/pricing  (Cloud: tier-based, Server: per-Jira user)
 *   - docs/research/competitor-practitest.md, competitor-xray.md
 */
export const practitestVsXrayData: VsMatrixData = {
  slug: 'practitest-vs-xray',
  a: 'practitest',
  b: 'xray',
  h1: 'PractiTest vs Xray (2026): Standalone Enterprise vs Jira-Locked Plugin',
  subhead:
    'PractiTest forces a 10-seat annual minimum. Xray bills against your entire Jira user count and requires Jira to function. Both are enterprise-priced. A flat-rate alternative exists.',
  introBody:
    "PractiTest and Xray solve overlapping problems with very different shapes. PractiTest is a standalone enterprise test management suite with deep configurability, Requirements Traceability, and a 10-user annual minimum on the Team plan. Xray is the most-installed test management plugin in the Atlassian Marketplace, which means it inherits Jira's pricing curve: Xray Cloud is tier-priced by Jira user count (not by tester count), and the Server / Data Center editions bill per Jira user as well. A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Xray. PractiTest avoids the Jira coupling but enforces a 10-seat annual minimum that costs ~$5,640 per year. Both products end up expensive for small QA orgs inside larger engineering teams. Neither ships AI test case generation as a core feature. Testably is the flat-rate alternative: $0 Free, $19 Hobby for 5 members, $49 Starter, $99 Professional for up to 20 testers — all monthly, no annual minimum, no Jira coupling. Native Jira two-way sync ships on every plan including Free.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (14-day trial)', b: 'No (trial only)' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Beta add-on', b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Limited', b: 'Limited' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Built-in', b: 'Built-in (Jira)' },
    { feature: 'Annual minimum commitment', testably: false, a: '10 users / annual', b: false },
    { feature: 'Setup time', testably: '< 5 min', a: '1+ hour', b: '30+ min (Jira install)' },
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
      a: { price: 'N/A', detail: '10-user minimum' },
      b: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
    },
    {
      plan: 'Mid team (10 testers, 100 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$470/mo', detail: 'Team plan, 10 users' },
      b: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
    },
    {
      plan: 'Annual minimum',
      testably: { price: 'None', detail: 'Monthly billing' },
      a: { price: '$5,640+/yr', detail: '10 users × annual' },
      b: { price: 'Annual on Cloud Premium', detail: 'Higher tiers' },
    },
    {
      plan: 'AI test generation',
      testably: { price: 'Included', detail: 'All paid plans' },
      a: { price: 'Add-on', detail: 'Limited beta' },
      b: { price: 'Not offered', detail: 'No AI features' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'PractiTest 10-seat annual lock-in',
      body: 'Team plan starts at 10 users sold annually. Smaller QA teams over-purchase or stay on the trial.',
    },
    {
      competitor: 'a',
      title: 'Dense legacy UI',
      body: 'PractiTest is feature-rich but cluttered. New users typically need 1–2 hours of onboarding before they can author a structured test cycle.',
    },
    {
      competitor: 'b',
      title: 'Xray bills per Jira user, not per tester',
      body: 'A 100-Jira-user company with 5 testers still pays for all 100 seats. The math punishes large engineering orgs with small QA teams.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira to function',
      body: 'Xray is a Jira plugin. If your team does not run Jira, Xray is not an option. Even with Jira, the UI is two clicks deep inside each issue.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone — no Jira required',
      body: 'Run Testably with or without Jira. Native two-way Jira sync ships on every plan including Free, but is fully optional.',
    },
    {
      title: 'Billed on QA testers only',
      body: 'A 100-Jira-user company with 5 QA testers pays $49/month on Testably Starter, not $500/month like Xray.',
    },
    {
      title: 'Flat-rate, no annual minimum',
      body: '$19 Hobby for 5 members. $49 Starter. $99 Professional for up to 20 testers. Monthly billing. No 10-seat minimum like PractiTest.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan.',
    },
  ],
  metaTitle: 'PractiTest vs Xray (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'PractiTest vs Xray compared on pricing, Jira coupling, AI, and team scaling. See why both fall short and how Testably bills only on QA testers — flat rate.',
  metaKeywords: [
    'practitest vs xray',
    'xray vs practitest',
    'practitest alternative',
    'xray alternative',
    'jira test management',
    'standalone test management',
  ],
  faqs: [
    {
      question: 'Which is better for teams that already use Jira?',
      answer:
        "Xray is convenient if Jira is your everyday tool — it lives inside each Jira issue. But it bills on all Jira users, not just testers, so the cost scales with engineering headcount. PractiTest is standalone with native Jira integration. Testably is also standalone with native two-way Jira sync — and bills only on QA testers.",
    },
    {
      question: 'Does PractiTest or Xray ship AI test case generation?',
      answer:
        'PractiTest has limited beta AI as an add-on. Xray has no AI features. Testably bundles AI generation on every paid plan from $19/month.',
    },
    {
      question: 'Can I run Xray without Jira?',
      answer:
        'No. Xray is a Jira plugin. If you do not run Jira, Xray is not an option. Testably and PractiTest both function standalone.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default practitestVsXrayData;
