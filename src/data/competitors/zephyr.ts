import { CompetitorData } from './types';

export const zephyrData: CompetitorData = {
  slug: 'zephyr',
  name: 'Zephyr Scale',
  tagline: 'Standalone QA Platform vs Jira-Locked Plugin',
  description:
    'Zephyr Scale is a Jira add-on billed against your total Jira user count, not just testers. Testably is a standalone platform with native Jira integration, flat-rate pricing, and AI built in.',
  savingsCallout:
    'A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Zephyr Scale. With Testably, $49/month covers your entire 5-person QA team — regardless of Jira headcount.',
  metaTitle: 'Testably vs Zephyr Scale (2026) | Independent Test Management Alternative',
  metaDescription:
    'Compare Testably and Zephyr Scale. Standalone test management with native Jira integration, $19 Hobby plan, AI test generation, and Shared Steps versioning. Stop paying for every Jira user.',
  metaKeywords: [
    'zephyr scale alternative',
    'testably vs zephyr',
    'zephyr pricing',
    'test management jira',
    'zephyr scale competitor',
    'free jira test management',
  ],
  features: [
    { feature: 'Free tier', testably: 'Forever (no Jira required)', competitor: 'Free for ≤10 Jira users only' },
    { feature: 'Standalone platform', testably: true, competitor: false },
    { feature: 'Works without Jira', testably: true, competitor: false },
    { feature: 'Charges per QA user only', testably: true, competitor: false },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Jira integration', testably: 'Native, optional', competitor: 'Required (add-on)' },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: 'Limited' },
    { feature: 'Run-level step snapshots', testably: true, competitor: 'Always-latest' },
    { feature: 'AI test case generation', testably: true, competitor: false },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: 'Limited' },
    { feature: 'Exploratory testing', testably: true, competitor: false },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: 'Jira setup required' },
  ],
  keyDifferences: [
    {
      title: 'Jira Dependency',
      body: 'Zephyr Scale is a Jira Marketplace add-on, meaning it only runs inside Jira. If you switch away from Jira or have team members without Jira licenses, they cannot access your test management. Testably is a standalone platform that integrates with Jira via two-way sync but does not depend on it.',
    },
    {
      title: 'The Per-Jira-User Pricing Trap',
      body: 'Zephyr Scale bills based on your total Jira user count, not just testers. If your Jira instance has 100 users but only 10 are testers, you pay for all 100. Testably uses flat-rate plans starting at $19/month — your bill is decoupled from Jira headcount entirely.',
    },
    {
      title: 'Independence & Flexibility',
      body: 'With Testably, your QA data lives in a dedicated platform. You can integrate with Jira today and migrate freely tomorrow — without losing test history. Zephyr locks your data into the Atlassian ecosystem.',
    },
    {
      title: 'AI & Modern Workflows',
      body: 'Testably ships with AI test case generation built in — generate from text descriptions, Jira issues, or exploratory sessions. Testably also offers true Shared Step version control with side-by-side diffs and bulk update flows. Zephyr Scale offers neither.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: '$0/mo', detail: 'Only if Jira has ≤10 users' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: 'Per Jira user', detail: 'Billed on all Jira users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: 'Per Jira user', detail: 'Grows with Jira headcount' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: 'Scales with org', detail: 'Not capped to QA team' },
    },
    {
      plan: 'Enterprise (21–50)',
      testably: { price: '$249/mo', detail: 'Enterprise S' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
    {
      plan: 'Enterprise (51–100)',
      testably: { price: '$499/mo', detail: 'Enterprise M' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
    {
      plan: 'Enterprise (100+)',
      testably: { price: 'Custom', detail: 'Enterprise L' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
  ],
  faqs: [
    {
      question: 'Can I use Testably with Jira?',
      answer:
        'Yes. Testably integrates natively with Jira Cloud — two-way sync, issue linking, auto-create bugs from test failures, and status synchronization. Available on all plans including Free. You get all the Jira benefits without being locked into the Atlassian ecosystem.',
    },
    {
      question: 'What if we stop using Jira?',
      answer:
        'With Testably, your test management continues uninterrupted. With Zephyr Scale, losing Jira means losing access to all your QA data — it lives inside the Jira instance.',
    },
    {
      question: "Does Zephyr Scale really have a free tier?",
      answer:
        'Only if your entire Jira instance has 10 or fewer users. Once your company crosses 10 Jira seats — for any reason, not just testers — you must pay for Zephyr Scale on every seat. Testably stays free regardless of company size, with a 1-project / 2-member limit on the Free plan.',
    },
    {
      question: 'Can I import data from Zephyr Scale?',
      answer:
        'Yes. Export your test cases from Zephyr as CSV and import them into Testably. The migration process typically takes under 10 minutes.',
    },
    {
      question: 'Why pay separately for test management?',
      answer:
        "A standalone platform decouples your QA data from your issue tracker. You get independence, flat-rate pricing, AI features Zephyr doesn't have, and the freedom to integrate with any development workflow — Jira, GitHub, GitLab, or CI/CD pipelines.",
    },
  ],
  ctaText: 'Start Free — No Jira Required',
  ctaSubtext: 'Free forever · Standalone platform · 14-day Starter trial available',
};
