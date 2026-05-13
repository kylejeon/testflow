import type { VsMatrixData } from '../competitors/types';

/**
 * PractiTest vs TestRail — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.practitest.com/pricing
 *   - https://www.testrail.com/pricing
 *   - docs/research/competitor-practitest.md, competitor-testrail.md
 */
export const practitestVsTestrailData: VsMatrixData = {
  slug: 'practitest-vs-testrail',
  a: 'practitest',
  b: 'testrail',
  h1: 'PractiTest vs TestRail (2026): Two Enterprise Suites, One Better Alternative',
  subhead:
    'Both PractiTest and TestRail charge $36–$71 per user per month or force annual minimums. Both miss AI and modern Shared Steps. Here is the comparison and a flat-rate alternative.',
  introBody:
    "PractiTest and TestRail are the two longest-standing enterprise test case management tools and they price like it. PractiTest enforces a 10-user annual minimum on its Team plan that puts the entry cost above $5,640 per year. TestRail charges $38 per user per month on Professional Cloud and $71 per user per month on Enterprise Cloud, with the most important features — CI/CD, Requirements Traceability, test case version control — locked into the Enterprise tier. Neither ships AI test case generation as a core feature. Neither offers Shared Steps with true version pinning. Both have dense, decade-old UIs that take 1–2 hours of onboarding before a new tester can author a structured test cycle. Most QA teams comparing these two end up looking for a third option. Testably is built for that team. The Free plan is permanent, not a trial. AI test case generation ships on every paid plan from $19 per month. Shared Steps pin to versions per test case. Requirements Traceability is unlimited on the Hobby plan, not gated to Enterprise. A 20-person team pays $99 per month on Testably versus $760–$1,420 per month on TestRail or a $5,640-per-year annual commitment on PractiTest.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (14-day trial)', b: 'No (14-day trial)' },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Beta add-on', b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Limited', b: 'Always-latest' },
    { feature: 'Requirements Traceability', testably: 'Hobby+ unlimited', a: 'Built-in', b: 'Enterprise only' },
    { feature: 'CI/CD integration', testably: 'Professional+', a: true, b: 'Enterprise only' },
    { feature: 'Jira two-way sync', testably: 'All plans', a: 'Built-in', b: 'Paid plans only' },
    { feature: 'Annual minimum commitment', testably: false, a: '10 users / annual', b: false },
    { feature: 'Per-user pricing', testably: false, a: '~$47/u/mo (annualized)', b: '$38–71/u/mo' },
    { feature: 'Setup time', testably: '< 5 min', a: '1+ hour', b: '30+ min' },
  ],
  pricingMatrix: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      a: { price: 'No free tier', detail: '14-day trial only' },
      b: { price: 'No free tier', detail: '14-day trial only' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter — 5 testers' },
      a: { price: 'N/A', detail: '10-user minimum' },
      b: { price: '$185–370/mo', detail: '$38–71 × 5' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$470/mo', detail: 'Team plan, 10 users' },
      b: { price: '$370–740/mo', detail: '$38–71 × 10' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: 'Custom', detail: 'Enterprise quote' },
      b: { price: '$740–1,420/mo', detail: '$38–71 × 20' },
    },
    {
      plan: 'Annual cost (20 users)',
      testably: { price: '$1,188', detail: 'Flat $99 × 12' },
      a: { price: '$11,280+', detail: '~$47 × 20 × 12' },
      b: { price: '$8,880–17,040', detail: '$38–71 × 20 × 12' },
    },
  ],
  bothLimitations: [
    {
      competitor: 'a',
      title: 'PractiTest 10-seat annual minimum',
      body: 'Team plan starts at 10 users sold annually — over $5,640 per year before any add-ons. Smaller teams are forced to over-purchase or stay on the trial.',
    },
    {
      competitor: 'a',
      title: 'AI test generation is beta-only',
      body: 'PractiTest AI features are limited beta access. Most teams cannot rely on them for daily authoring.',
    },
    {
      competitor: 'b',
      title: 'TestRail gates everything to Enterprise',
      body: 'Requirements Traceability, CI/CD integration, and test case version control all require the $71-per-user Enterprise tier. A 20-person team pays $17,040 per year before negotiation.',
    },
    {
      competitor: 'b',
      title: 'No native AI features',
      body: 'TestRail does not ship AI test case generation, deduplication, or failure summarization. Customers integrate third-party AI via API, which adds another vendor and another bill.',
    },
  ],
  testablyWins: [
    {
      title: 'Free forever — no trial countdown',
      body: '1 project, 2 members, 100 TCs, 10 runs/month, 3 AI generations/month. Permanent. PractiTest and TestRail both gate access to time-limited trials.',
    },
    {
      title: 'Flat-rate plans, monthly billing',
      body: '$19 Hobby for 5 members. $49 Starter for 5 testers. $99 Professional for up to 20 testers. No per-user math, no 10-seat annual lock-in.',
    },
    {
      title: 'AI included on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions. No add-on subscription. Starts on the $19 Hobby plan.',
    },
    {
      title: 'RTM, CI/CD, and Jira sync without Enterprise',
      body: 'Unlimited Requirements Traceability on Hobby. CI/CD on Professional. Native Jira two-way sync on every plan including Free.',
    },
  ],
  metaTitle: 'PractiTest vs TestRail (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'PractiTest vs TestRail compared on pricing, AI, Shared Steps, and RTM. See why both fall short for small-to-mid teams and how Testably saves $7,000+/year.',
  metaKeywords: [
    'practitest vs testrail',
    'testrail vs practitest',
    'practitest alternative',
    'testrail alternative',
    'enterprise test management',
    'flat-rate test management',
  ],
  faqs: [
    {
      question: 'Which is cheaper, PractiTest or TestRail?',
      answer:
        'For 10 users, PractiTest Team is roughly $470/month (annualized) versus TestRail Professional at $370/month. TestRail wins at 5 users (PractiTest has the 10-seat minimum). TestRail Enterprise ($71/user) is the most expensive of the three above 20 users. Testably Professional is $99/month flat for the same headcount.',
    },
    {
      question: 'Do either PractiTest or TestRail include AI test case generation?',
      answer:
        'No, not as a core feature. PractiTest has limited beta AI. TestRail has none. Testably bundles AI test case generation on every paid plan starting at $19/month.',
    },
    {
      question: 'Can I migrate from PractiTest or TestRail to Testably?',
      answer:
        'Yes. Both support CSV export. Testably accepts CSV import with auto-mapping. Most teams complete the migration in under an hour for fewer than 1,000 test cases. Run one regression cycle in parallel before switching.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default practitestVsTestrailData;
