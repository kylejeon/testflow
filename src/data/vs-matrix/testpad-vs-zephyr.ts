import type { VsMatrixData } from '../competitors/types';

/**
 * TestPad vs Zephyr Scale — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.testpad.com/pricing
 *   - https://smartbear.com/product/zephyr-scale/
 *   - docs/research/competitor-testpad.md, competitor-zephyr.md
 */
export const testpadVsZephyrData: VsMatrixData = {
  slug: 'testpad-vs-zephyr',
  a: 'testpad',
  b: 'zephyr',
  h1: 'TestPad vs Zephyr Scale (2026): Lightweight Standalone vs Jira Add-On',
  subhead:
    'TestPad is the simple checklist — no AI, no structured Test Cases. Zephyr Scale is Jira-native but bills against your entire Jira user count. There is a better middle.',
  introBody:
    "TestPad and Zephyr Scale represent two extreme answers to the test management problem. TestPad is the lightweight standalone — a test-script-as-checklist UI, no Shared Steps, no version pinning, no Requirements Traceability, no AI, bracket-based per-user pricing starting at £49 per month for 3 users. Zephyr Scale is the most-installed Jira test management plugin — Jira-native test cycles, requirements built into Jira issues, and pricing that inherits Jira's curve. The Zephyr Scale free tier is only available if your Jira instance has 10 or fewer users; above that, billing scales on every Jira user, not just testers. A 100-Jira-user company with 5 QA engineers pays for all 100 seats. TestPad's simplicity makes it inadequate for audit-heavy or regression-critical work. Zephyr Scale's Jira coupling makes it impractical for non-Jira teams and expensive for large engineering orgs with small QA teams. Testably is the structured, flat-rate, Jira-optional alternative: Free forever, $19 Hobby for 5 members, $49 Starter, $99 Professional for up to 20 testers. Billing is by QA tester only — Jira user count is irrelevant. AI test case generation ships on every paid plan from $19/month.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (30-day trial)', b: 'Free only if Jira ≤10 users' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Structured Test Cases', testably: true, a: 'Checklist style only', b: true },
    { feature: 'Shared Steps version pinning', testably: true, a: false, b: 'Always-latest' },
    { feature: 'AI test generation', testably: 'All paid plans', a: false, b: false },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: false, b: 'Via Jira' },
    { feature: 'Jira two-way sync', testably: 'All plans (optional)', a: 'Higher plans', b: 'Native (required)' },
    { feature: 'Setup time', testably: '< 5 min', a: '< 5 min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '30-day trial only' },
      b: { price: '$0/mo', detail: 'Only if Jira has ≤10 users' },
    },
    {
      plan: 'Small team (5 testers, 50 Jira users)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: '£49–59/mo', detail: 'Essential, 3 users' },
      b: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
    },
    {
      plan: 'Mid team (10 testers, 100 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '£99–149/mo', detail: 'Pro plan, ~10 users' },
      b: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
    },
    {
      plan: 'Large team (20 testers, 200 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: 'Custom', detail: 'Bracket pricing' },
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
      title: 'TestPad has no structured test cases',
      body: 'Test-script-as-checklist by design. No Shared Steps, no version pinning, no Requirements Traceability. Audit-heavy and regulated teams need more.',
    },
    {
      competitor: 'a',
      title: 'AI and integrations missing',
      body: 'TestPad ships no AI test case generation. Jira two-way sync, CI/CD, and Slack notifications gated to higher plans or unavailable.',
    },
    {
      competitor: 'b',
      title: 'Zephyr Scale bills on Jira users',
      body: 'A 100-Jira-user company with 5 testers pays for all 100 seats. Engineering growth drives cost up even if QA team size is unchanged.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira',
      body: 'Zephyr Scale is a Jira add-on. Without Jira, it cannot run. The free tier is limited to Jira instances with 10 or fewer users.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone — Jira optional',
      body: 'Testably runs with or without Jira. Native two-way Jira sync on every plan including Free, never required.',
    },
    {
      title: 'Structured Test Cases + the speed of TestPad',
      body: 'Full Test Case structure with Shared Step version pinning — setup in under 5 minutes. CSV import, AI generation, optional Jira sync.',
    },
    {
      title: 'Flat-rate, billed on QA testers only',
      body: '$19 Hobby. $49 Starter. $99 Professional for up to 20 testers. Jira user count does not affect price.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on Hobby. Neither TestPad nor Zephyr Scale offer AI.',
    },
  ],
  metaTitle: 'TestPad vs Zephyr Scale (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'TestPad vs Zephyr Scale compared on pricing, Jira coupling, structure, and AI. See why both miss the middle and how Testably solves it flat-rate.',
  metaKeywords: [
    'testpad vs zephyr',
    'zephyr vs testpad',
    'testpad alternative',
    'zephyr scale alternative',
    'jira test management',
    'lightweight test management',
  ],
  faqs: [
    {
      question: 'Is TestPad or Zephyr Scale cheaper for small teams?',
      answer:
        'For a 10-Jira-user company, Zephyr Scale is free; TestPad is £49/month for 3 users. Above 10 Jira users, Zephyr Scale costs ~$10/user/month on every Jira user, so a 50-Jira-user company pays ~$500/month even with 3 testers. TestPad bills only on testers. Testably is $49/month flat for 5 testers regardless of Jira user count.',
    },
    {
      question: 'Does TestPad or Zephyr Scale ship AI test generation?',
      answer:
        'No. Neither TestPad nor Zephyr Scale ships AI test case generation. Testably bundles AI on every paid plan from $19/month.',
    },
    {
      question: 'Can I run Zephyr Scale without Jira?',
      answer:
        'No. Zephyr Scale is a Jira add-on. TestPad runs standalone. Testably also runs standalone with optional native Jira two-way sync.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default testpadVsZephyrData;
