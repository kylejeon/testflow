import type { VsMatrixData } from '../competitors/types';

/**
 * PractiTest vs TestPad — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.practitest.com/pricing
 *   - https://www.testpad.com/pricing  (Essential £39/mo, Pro £79/mo, etc.)
 *   - docs/research/competitor-practitest.md, competitor-testpad.md
 *
 * Tone: heavyweight enterprise vs lightweight checklist. Both miss the middle.
 */
export const practitestVsTestpadData: VsMatrixData = {
  slug: 'practitest-vs-testpad',
  a: 'practitest',
  b: 'testpad',
  h1: 'PractiTest vs TestPad (2026): Heavyweight vs Lightweight — and a Better Middle',
  subhead:
    'PractiTest forces a 10-seat annual minimum. TestPad is intentionally simple but lacks structured Test Cases, AI, and modern integrations. Most teams want the middle.',
  introBody:
    "PractiTest and TestPad are almost opposite products. PractiTest is a 17-year-old enterprise test management suite — deep configurability, requirements traceability, integrations, and a 10-user annual minimum on the Team plan that puts the entry cost above $5,640 per year. TestPad takes the opposite approach: a single test-script-as-checklist interface, no test case versioning, no Jira two-way sync on lower plans, and pricing that starts at £49 per month for 3 users. Both are popular in their niche but most QA teams sit in the middle: they want structured test cases with Shared Steps, traceability, Jira integration, and AI-assisted authoring — without the PractiTest annual minimum or the TestPad feature gaps. Testably is built for that middle. The Free plan is permanent. Hobby is $19 per month and covers 5 members with unlimited Requirements Traceability. Starter is $49 per month for up to 5 testers. Professional is $99 per month and covers up to 20 testers. AI test case generation ships on every paid plan.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (14-day trial)', b: 'No (30-day trial)' },
    { feature: 'Structured Test Cases', testably: true, a: true, b: 'Checklist style only' },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Limited', b: false },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Built-in', b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Beta add-on', b: false },
    { feature: 'Jira two-way sync', testably: 'All plans', a: 'Built-in', b: 'Higher plans' },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: 'Bracket-based per-user' },
    { feature: 'Annual minimum commitment', testably: false, a: '10 users / annual', b: false },
    { feature: 'Setup time', testably: '< 5 min', a: '1+ hour', b: '< 5 min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '14-day trial only' },
      b: { price: 'No free tier', detail: '30-day trial only' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: 'N/A', detail: '10-user minimum' },
      b: { price: '£49–59/mo', detail: 'Essential, 3 users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$470/mo', detail: '10 users on Team plan' },
      b: { price: '£99–149/mo', detail: 'Pro plan, ~10 users' },
    },
    {
      plan: 'Annual minimum',
      testably: { price: 'None', detail: 'Monthly billing' },
      a: { price: '$5,640+/yr', detail: '10 users × $47/mo × 12' },
      b: { price: 'None', detail: 'Monthly billing' },
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
      title: 'PractiTest forces a 10-seat annual minimum',
      body: 'The Team plan starts at 10 users sold annually — over $5,640 per year before any add-ons. Teams smaller than 10 either over-purchase or stay on the trial.',
    },
    {
      competitor: 'a',
      title: 'Dense legacy UI',
      body: 'Power features come at a complexity cost. New PractiTest users typically need 1–2 hours of onboarding before they can author a structured test cycle.',
    },
    {
      competitor: 'b',
      title: 'No structured test cases',
      body: 'TestPad uses test-script-as-checklist by design. There are no Shared Steps, no version pinning, and no Requirements Traceability. Audit-heavy and regulated teams need more.',
    },
    {
      competitor: 'b',
      title: 'AI and modern integrations missing',
      body: 'TestPad ships no AI test case generation. Jira two-way sync, CI/CD, and Slack notifications are gated to higher plans or unavailable.',
    },
  ],
  testablyWins: [
    {
      title: 'Free forever, no trial countdown',
      body: '1 project, 2 members, 100 TCs, 10 runs/month, 3 AI generations/month — permanent. PractiTest and TestPad both gate access to time-limited trials.',
    },
    {
      title: 'Structured test cases + AI together',
      body: 'Get the audit-ready test case structure PractiTest offers, plus the speed TestPad gives, plus AI generation on every paid plan from $19/month.',
    },
    {
      title: 'No annual lock-in',
      body: 'Monthly billing. No 10-seat minimum. Upgrade or downgrade between plans at any time. The Free fallback is permanent.',
    },
    {
      title: 'Shared Steps with version pinning',
      body: 'Pin Shared Step versions per test case. Side-by-side diffs. Bulk update flow. Frozen run snapshots so edits never break runs already in progress.',
    },
  ],
  metaTitle: 'PractiTest vs TestPad (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'PractiTest vs TestPad compared on pricing, AI, structure, and integrations. See where both fall short and why teams pick Testably for the middle ground.',
  metaKeywords: [
    'practitest vs testpad',
    'testpad vs practitest',
    'practitest alternative',
    'testpad alternative',
    'lightweight test management',
    'test management comparison',
  ],
  faqs: [
    {
      question: 'Is PractiTest or TestPad better for small teams?',
      answer:
        'Neither is ideal. PractiTest enforces a 10-user annual minimum (~$5,640/year). TestPad is friendly to start but lacks structured test cases, AI, and full Jira two-way sync. Testably is built specifically for the small-to-mid team band with a $19 Hobby plan covering 5 members.',
    },
    {
      question: "Does TestPad have AI test generation?",
      answer:
        'No. TestPad ships no AI test case generation. PractiTest has a limited beta as an add-on. Testably includes AI generation on every paid plan starting at $19/month.',
    },
    {
      question: 'Can I migrate from PractiTest or TestPad to Testably?',
      answer:
        'Yes. Testably accepts CSV import. PractiTest and TestPad both support CSV export. Most teams complete the migration in under an hour for fewer than 1,000 test cases.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default practitestVsTestpadData;
