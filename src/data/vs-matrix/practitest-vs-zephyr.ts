import type { VsMatrixData } from '../competitors/types';

/**
 * PractiTest vs Zephyr Scale — vs-matrix data.
 *
 * Sources (as of 2026-05):
 *   - https://www.practitest.com/pricing
 *   - https://smartbear.com/product/zephyr-scale/  (per Jira user pricing)
 *   - docs/research/competitor-practitest.md, competitor-zephyr.md
 */
export const practitestVsZephyrData: VsMatrixData = {
  slug: 'practitest-vs-zephyr',
  a: 'practitest',
  b: 'zephyr',
  h1: 'PractiTest vs Zephyr Scale (2026): Standalone vs Jira Add-On',
  subhead:
    'PractiTest forces a 10-seat annual minimum. Zephyr Scale bills against your total Jira user count. Both enterprise-priced. A flat-rate, standalone alternative exists.',
  introBody:
    "PractiTest and Zephyr Scale are popular at opposite ends of the test management market. PractiTest is the enterprise standalone — deep configurability, Requirements Traceability, and a 10-user annual minimum on the Team plan that puts the entry cost above $5,640 per year. Zephyr Scale is the most-installed Jira-native test management plugin, which means it inherits Jira's pricing curve: a company with 100 Jira users but only 5 QA engineers pays for all 100 seats. The Zephyr Scale free tier exists only for Jira instances with 10 or fewer users. Both products lock down on the per-seat math at scale. Neither ships AI test case generation as a core feature. Neither offers true Shared Steps version pinning. Testably is the flat-rate alternative: Free forever, $19 Hobby, $49 Starter, $99 Professional for up to 20 testers. Native Jira two-way sync ships on every plan including Free — but is fully optional. The Free plan does not require Jira.",
  featureMatrix: [
    { feature: 'Free tier', testably: 'Forever', a: 'No (14-day trial)', b: 'Free only if Jira ≤10 users' },
    { feature: 'Standalone (no Jira required)', testably: true, a: true, b: false },
    { feature: 'Billed on QA testers only', testably: true, a: true, b: false },
    { feature: 'Flat-rate pricing', testably: true, a: false, b: false },
    { feature: 'AI test generation', testably: 'All paid plans', a: 'Beta add-on', b: false },
    { feature: 'Shared Steps version pinning', testably: true, a: 'Limited', b: 'Always-latest' },
    { feature: 'Requirements Traceability', testably: 'Hobby+', a: 'Built-in', b: 'Via Jira' },
    { feature: 'Annual minimum', testably: false, a: '10 users / annual', b: false },
    { feature: 'Setup time', testably: '< 5 min', a: '1+ hour', b: '30+ min' },
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
      a: { price: 'N/A', detail: '10-user minimum' },
      b: { price: '~$500/mo', detail: 'Billed on 50 Jira users' },
    },
    {
      plan: 'Mid team (10 testers, 100 Jira users)',
      testably: { price: '$99/mo', detail: 'Professional — up to 20 testers' },
      a: { price: '~$470/mo', detail: 'Team plan' },
      b: { price: '~$1,000/mo', detail: 'Billed on 100 Jira users' },
    },
    {
      plan: 'Annual cost (10 testers / 100 Jira users)',
      testably: { price: '$1,188', detail: '$99 × 12' },
      a: { price: '$5,640+', detail: '~$47 × 10 × 12' },
      b: { price: '$12,000+', detail: '~$10 × 100 × 12' },
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
      title: 'PractiTest 10-seat annual minimum',
      body: 'Team plan starts at 10 users sold annually — over $5,640 per year. Smaller QA teams over-purchase.',
    },
    {
      competitor: 'a',
      title: 'Beta-only AI',
      body: 'PractiTest AI is limited beta access. Not yet ready for daily test authoring.',
    },
    {
      competitor: 'b',
      title: 'Zephyr Scale bills per Jira user',
      body: 'A 100-Jira-user company with 5 testers pays for all 100 seats. Engineering headcount growth makes Zephyr Scale dramatically more expensive even if your QA team stays the same size.',
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
      body: 'Testably runs with or without Jira. Native two-way Jira sync ships on every plan including Free, but is not required.',
    },
    {
      title: 'Billed on QA testers only',
      body: 'A 100-Jira-user company with 5 testers pays $49/month on Testably Starter — not $500/month like Zephyr Scale.',
    },
    {
      title: 'Flat-rate, no annual minimum',
      body: '$19 Hobby for 5 members. $49 Starter. $99 Professional for up to 20 testers. Monthly billing.',
    },
    {
      title: 'AI on every paid plan',
      body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on Hobby. No separate AI add-on.',
    },
  ],
  metaTitle: 'PractiTest vs Zephyr Scale (2026): Pricing, Features & a Better Alternative',
  metaDescription:
    'PractiTest vs Zephyr Scale compared on pricing, Jira coupling, AI, and team scaling. See why both fall short and how Testably flat-rate plans solve the per-seat trap.',
  metaKeywords: [
    'practitest vs zephyr',
    'zephyr vs practitest',
    'practitest alternative',
    'zephyr scale alternative',
    'jira test management',
    'standalone test management',
  ],
  faqs: [
    {
      question: 'Is Zephyr Scale cheaper than PractiTest for small teams?',
      answer:
        'It depends on your Jira user count. For a 50-Jira-user company with 5 testers, Zephyr Scale runs around $500/month — about the same as PractiTest Team annualized. For a 10-Jira-user company, Zephyr Scale is free but PractiTest still costs $5,640 per year (the 10-user minimum). Testably is $49–99/month flat regardless.',
    },
    {
      question: 'Does PractiTest or Zephyr Scale offer AI test generation?',
      answer:
        'PractiTest has limited beta AI as an add-on. Zephyr Scale has no AI features. Testably bundles AI generation on every paid plan from $19/month.',
    },
    {
      question: 'Can I migrate test cases from PractiTest or Zephyr Scale?',
      answer:
        'Yes. PractiTest supports CSV export. Zephyr Scale supports CSV export and the Atlassian Marketplace API. Testably accepts CSV import for both. Most migrations under 1,000 test cases complete in under an hour.',
    },
  ],
  lastReviewed: '2026-05-13',
};

export default practitestVsZephyrData;
