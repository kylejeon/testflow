import type { VsMatrixData } from '../competitors/types';

/**
 * TestPad vs Xray — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.testpad.com/pricing
 *   - https://www.getxray.app/pricing
 *   - docs/research/competitor-testpad.md, competitor-xray.md
 */
export const testpadVsXrayData: VsMatrixData = {
  slug: 'testpad-vs-xray',
  a: 'testpad',
  b: 'xray',
  h1: 'TestPad vs Xray (2026): Lightweight Standalone vs Jira-Native Plugin',
  subhead:
    'TestPad is the simple standalone — no AI, no structure. Xray is Jira-native but bills against your entire Jira user count. Most teams want the structured, flat-rate middle.',
  introBody:
    "TestPad and Xray look nothing alike. TestPad is a deliberately simple checklist-style test runner — no Shared Steps, no Requirements Traceability, no AI, bracket-based per-user pricing starting at £49 per month for 3 users. Xray is the most-installed Jira test management plugin — deep Jira integration, requirements built into Jira issues, and pricing that inherits Jira's curve (Cloud is tier-priced by Jira user count, not tester count). A 100-Jira-user company with 5 testers pays for all 100 seats on Xray. TestPad's simplicity becomes a liability for any team that needs structured test cases or audit trails. Xray's Jira coupling makes it impractical for teams that do not run Jira and dramatically expensive for large engineering orgs with small QA teams. Testably is the flat-rate, Jira-optional, structured middle: Free forever, $19 Hobby, $49 Starter, $99 Professional for up to 20 testers. Billing is by QA tester only. AI test case generation ships on every paid plan from $19/month. Shared Steps pin to versions per test case — neither TestPad nor Xray offers that.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (30-day trial)', b: 'No (trial only)' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Structured Test Cases', testably: true, a: 'Checklist style only', b: true },
    { feature: 'Shared Steps version pinning', testably: true, a: false, b: 'Limited' },
    { feature: 'AI test generation', testably: 'All paid plans', a: false, b: false },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: false, b: 'Built-in (Jira)' },
    { feature: 'Jira two-way sync', testably: 'All plans (optional)', a: 'Higher plans', b: 'Native (required)' },
    { feature: 'Setup time', testably: '< 5 min', a: '< 5 min', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '30-day trial only' },
      b: { price: 'No free tier', detail: 'Trial only' },
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
      title: 'TestPad lacks structured test cases',
      body: 'Test-script-as-checklist by design. No Shared Steps, no version pinning, no Requirements Traceability. Audit-heavy and regulated teams need more.',
    },
    {
      competitor: 'a',
      title: 'No AI, integrations gated',
      body: 'TestPad ships no AI features. Jira two-way sync, CI/CD, and Slack notifications gated to higher plans or unavailable.',
    },
    {
      competitor: 'b',
      title: 'Xray bills on Jira users, not testers',
      body: 'A 100-Jira-user company with 5 testers pays for all 100 seats. Engineering growth drives Xray cost up even if QA team size is unchanged.',
    },
    {
      competitor: 'b',
      title: 'Requires Jira to function',
      body: 'Xray is a Jira plugin. If your team does not run Jira, Xray is not an option. The free tier is limited to small Jira instances.',
    },
  ],
  testablyWins: [
    {
      title: 'Standalone with optional Jira sync',
      body: 'Run Testably with or without Jira. Native two-way Jira sync on every plan including Free, but not required like Xray.',
    },
    {
      title: 'Billed on QA testers only',
      body: 'A 100-Jira-user company with 5 testers pays $49/month on Testably Starter — not $500/month like Xray.',
    },
    {
      title: 'Structured Test Cases + AI',
      body: 'Get the audit-ready test case structure TestPad lacks, plus AI test case generation on every paid plan from $19/month.',
    },
    {
      title: 'Free forever, no trial countdown',
      body: 'TestPad has a 30-day trial only. Xray has a trial only. Testably Free is permanent.',
    },
  ],
  metaTitle: 'TestPad vs Xray (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'TestPad vs Xray compared on pricing, Jira coupling, structure, and AI. See why both miss the middle and how Testably stays flat-rate, standalone, and structured.',
  metaKeywords: [
    'testpad vs xray',
    'xray vs testpad',
    'testpad alternative',
    'xray alternative',
    'jira test management',
    'lightweight test management',
  ],
  faqs: [
    {
      question: 'Is TestPad cheaper than Xray for small teams?',
      answer:
        'For a small Jira instance (≤10 Jira users), Xray is free; TestPad is £49/month for 3 users. For a 50-Jira-user company with 3 testers, TestPad is £49/month but Xray is ~$500/month (billed on all 50 Jira users). Testably is $49/month flat for 5 testers regardless of Jira user count.',
    },
    {
      question: 'Does TestPad or Xray offer AI test case generation?',
      answer:
        'No. Neither TestPad nor Xray ships AI test case generation. Testably bundles AI on every paid plan from $19/month.',
    },
    {
      question: 'Do I need Jira to use Xray? What about TestPad and Testably?',
      answer:
        'Xray requires an active Jira license. TestPad runs standalone. Testably runs standalone with optional native Jira two-way sync on every plan.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default testpadVsXrayData;
