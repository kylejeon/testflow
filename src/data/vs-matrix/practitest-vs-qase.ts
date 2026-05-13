import type { VsMatrixData } from '../competitors/types';

/**
 * PractiTest vs Qase — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.practitest.com/pricing  (10-user annual minimum on Team plan)
 *   - https://qase.io/pricing  (Free → Startup $25/u/mo → Business $44/u/mo)
 *   - docs/research/competitor-practitest.md
 *   - docs/research/competitor-qase.md
 *
 * Tone: PractiTest is heavyweight + expensive entry; Qase is modern but per-seat
 * scales hard above 10 users. Testably is the flat-rate middle.
 */
export const practitestVsQaseData: VsMatrixData = {
  slug: 'practitest-vs-qase',
  a: 'practitest',
  b: 'qase',
  h1: 'PractiTest vs Qase (2026): Pricing, Features, and a Better Alternative',
  subhead:
    "PractiTest's 10-seat annual minimum and Qase's per-user pricing both punish small QA teams. Here is how the two compare, and why most teams pick Testably instead.",
  introBody:
    "PractiTest and Qase land on opposite ends of the test management spectrum. PractiTest is a 17-year-old enterprise suite with deep Jira integration, requirements traceability, and a 10-user annual minimum that puts the entry cost above $5,640 per year. Qase is a newer, lighter platform that scales attractively at the small end (the Free plan supports 3 users) but billing climbs fast: Startup is $25 per user per month, Business is $44 per user per month, and the AI add-on costs extra. Both products force a tradeoff. PractiTest customers complain about a dense UI and slow setup. Qase customers report the per-seat math becoming uncomfortable above 10 testers and the lack of true Shared Steps version pinning. Testably ships flat-rate plans ($19 Hobby, $49 Starter for 5 testers, $99 Professional for up to 20 testers), bundles AI test case generation on every paid plan, and preserves Shared Steps versions per test case — all without the 10-seat annual minimum PractiTest requires.",
  featureMatrix: [
    {
      feature: 'Free tier',
      testably: 'Forever',
      a: 'No (14-day trial)',
      b: 'Yes (3 users, 500 TCs)',
    },
    {
      feature: 'Entry price',
      testably: '$0 / $19 Hobby',
      a: '~$470/mo (10-seat min)',
      b: '$25/user/mo Startup',
    },
    {
      feature: 'Flat-rate team pricing',
      testably: true,
      a: false,
      b: false,
    },
    {
      feature: 'AI test generation',
      testably: 'All paid plans',
      a: 'Beta add-on',
      b: 'Paid add-on',
    },
    {
      feature: 'Shared Steps version pinning',
      testably: true,
      a: 'Limited',
      b: 'Always-latest',
    },
    {
      feature: 'Requirements Traceability',
      testably: 'Hobby+',
      a: 'Built-in',
      b: 'Business+',
    },
    {
      feature: 'Jira two-way sync',
      testably: 'All plans',
      a: 'Built-in',
      b: 'Built-in',
    },
    {
      feature: 'CI/CD integration',
      testably: 'Professional+',
      a: true,
      b: true,
    },
    {
      feature: 'Annual minimum commitment',
      testably: false,
      a: '10 users / annual',
      b: false,
    },
    {
      feature: 'Setup time',
      testably: '< 5 min',
      a: '1+ hour',
      b: '15 min',
    },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '14-day trial only' },
      b: { price: '$0/mo', detail: '3 users · 1 project · 500 TCs' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter — up to 5 testers' },
      a: { price: 'N/A', detail: '10-user annual minimum' },
      b: { price: '$125/mo', detail: '$25 × 5 (Startup)' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$470/mo', detail: 'Team plan, 10-user minimum' },
      b: { price: '$250/mo', detail: '$25 × 10 (Startup)' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: 'Custom', detail: 'Enterprise quote' },
      b: { price: '$500–880/mo', detail: '$25–44 × 20' },
    },
    {
      plan: 'AI test generation',
      testably: { price: 'Included', detail: 'All paid plans' },
      a: { price: 'Add-on', detail: 'Limited beta access' },
      b: { price: 'Add-on', detail: 'Sold separately' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'PractiTest gates entry at 10 seats and ~$5,640 per year',
      body: 'The Team plan starts at 10 users and is sold annually. Teams smaller than 10 either over-purchase or stay on the trial. Even at 10 seats, the math equals ~$47 per user per month — comparable to TestRail Enterprise.',
    },
    {
      competitor: 'a',
      title: 'Dense legacy UI',
      body: 'Reviewers on G2 and Capterra consistently describe PractiTest as feature-rich but cluttered. New users typically need 1–2 hours of onboarding before they can author a structured test cycle.',
    },
    {
      competitor: 'b',
      title: 'Per-seat pricing climbs above 10 testers',
      body: 'Qase Startup is $25 per user per month and Business is $44. A 20-person QA org pays $500–$880 per month before any AI add-on. The savings vs PractiTest disappear at scale.',
    },
    {
      competitor: 'b',
      title: 'Shared Steps are always-latest only',
      body: 'Qase Shared Steps cannot be pinned to a version. Edits propagate to every test case immediately, including runs in progress — a regression risk for stable test suites.',
    },
  ],
  testablyWins: [
    {
      title: 'Flat-rate team plans, no annual minimum',
      body: 'Hobby is $19 per month for 5 members. Starter is $49 per month for 5 members. Professional is $99 per month for up to 20 testers — flat, monthly, no 10-seat annual lock-in.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan. No separate AI subscription.',
    },
    {
      title: 'Shared Steps with version pinning',
      body: 'Each test case pins the Shared Step version it links. Edits do not affect runs already in progress. Side-by-side diffs preview every change before you upgrade.',
    },
    {
      title: 'Setup in under 5 minutes',
      body: 'No 1-hour onboarding. Sign up, import a CSV from PractiTest or Qase, and start running tests. Most teams complete the move in one regression cycle.',
    },
  ],
  metaTitle: 'PractiTest vs Qase (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'PractiTest vs Qase compared on pricing, AI, Shared Steps, and team scaling. See where both fall short and why teams pick Testably for flat-rate test management.',
  metaKeywords: [
    'practitest vs qase',
    'qase vs practitest',
    'practitest alternative',
    'qase alternative',
    'test management comparison',
    'flat-rate test management',
  ],
  faqs: [
    {
      question: 'Is PractiTest cheaper than Qase?',
      answer:
        'Not for small teams. PractiTest enforces a 10-user annual minimum on the Team plan (~$5,640/year). Qase Startup is $25/user/month with no minimum, so a 3-person team pays ~$75/month on Qase versus $470/month on PractiTest. Qase becomes more expensive only above 15–20 testers.',
    },
    {
      question: 'Which has better AI features, PractiTest or Qase?',
      answer:
        'Both ship AI test case generation as paid add-ons rather than core features. PractiTest is in limited beta. Qase sells AI as a separate subscription. Testably bundles AI with every paid plan starting at $19/month.',
    },
    {
      question: 'Can I migrate from PractiTest to Qase?',
      answer:
        'Yes — both support CSV import and have public APIs. The same path works for migrating from either to Testably: CSV export, field map, import. Most teams complete it in under an hour for fewer than 1,000 test cases.',
    },
    {
      question: 'Why pick Testably over either PractiTest or Qase?',
      answer:
        "Three reasons: flat-rate pricing instead of per-seat, AI bundled on every paid plan, and Shared Steps with true version pinning. PractiTest has the enterprise feature depth but punishes small teams with the annual minimum. Qase scales attractively at the low end but the per-user math gets uncomfortable past 10 testers.",
    },
  ],
  lastReviewed: '2026-05-13',
};

export default practitestVsQaseData;
