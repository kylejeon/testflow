import { CompetitorData } from './types';

export const zephyrData: CompetitorData = {
  slug: 'zephyr',
  name: 'Zephyr Scale',
  tagline: 'Standalone QA Platform vs Jira-Only Plugin',
  description:
    'Zephyr Scale is a Jira add-on that charges per Jira user, not per tester. Testably is a standalone platform with native Jira integration and transparent pricing.',
  savingsCallout:
    'A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Zephyr Scale. With Testably, you pay only for your QA team.',
  metaTitle: 'Testably vs Zephyr Scale (2026) | Independent Test Management Alternative',
  metaDescription:
    'Compare Testably and Zephyr Scale. Standalone test management with Jira integration, free tier, and flat-rate pricing. No more paying for every Jira user.',
  metaKeywords: [
    'zephyr scale alternative',
    'testably vs zephyr',
    'zephyr pricing',
    'test management jira',
    'zephyr scale competitor',
    'free jira test management',
  ],
  features: [
    { feature: 'Free tier', testably: true, competitor: false },
    { feature: 'Standalone platform', testably: true, competitor: false },
    { feature: 'Jira integration', testably: 'Native, optional', competitor: 'Required (add-on)' },
    { feature: 'Works without Jira', testably: true, competitor: false },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Charges per QA user only', testably: true, competitor: false },
    { feature: 'CI/CD integration', testably: 'All plans', competitor: 'Limited' },
    { feature: 'AI test case generation', testably: true, competitor: false },
    { feature: 'Exploratory sessions', testably: true, competitor: false },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: 'Jira setup required' },
  ],
  keyDifferences: [
    {
      title: 'Jira Dependency',
      body: 'Zephyr Scale is a Jira Marketplace add-on, meaning it only works inside Jira. If you switch away from Jira or have team members without Jira licenses, they cannot access your test management. Testably is a standalone platform that integrates with Jira but does not depend on it.',
    },
    {
      title: 'Pricing Trap: Per-Jira-User Billing',
      body: 'Zephyr Scale charges based on your total Jira user count, not just testers. If your Jira instance has 100 users but only 10 testers, you pay for all 100. Testably charges only for actual QA team members with flat monthly plans.',
    },
    {
      title: 'Independence & Flexibility',
      body: 'With Testably, your QA data lives in a dedicated platform. You can integrate with Jira, GitHub, GitLab, or any CI/CD tool. Zephyr locks you into the Atlassian ecosystem exclusively.',
    },
    {
      title: 'AI & Modern Features',
      body: 'Testably ships with AI test case generation built in — generate from text descriptions, Jira issues, or exploratory session logs. Zephyr Scale does not offer AI-assisted test case creation.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '3 projects · 3 members' },
      competitor: { price: 'No free tier', detail: 'Paid Jira + add-on required' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Up to 5 members' },
      competitor: { price: 'Per Jira user', detail: 'Billed on all Jira users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Up to 20 members' },
      competitor: { price: 'Per Jira user', detail: 'Grows with Jira headcount' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Up to 20 members' },
      competitor: { price: 'Scales with org', detail: 'Not capped to QA team size' },
    },
    {
      plan: 'Enterprise',
      testably: { price: '$249/mo', detail: 'Unlimited members' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
  ],
  faqs: [
    {
      question: 'Can I use Testably with Jira?',
      answer:
        "Yes! Testably integrates natively with Jira Cloud. You get two-way sync, issue linking, and bug creation — all without being locked into the Jira ecosystem.",
    },
    {
      question: 'What if we stop using Jira?',
      answer:
        'With Testably, your test management continues uninterrupted. With Zephyr Scale, losing Jira means losing access to all your QA data.',
    },
    {
      question: 'Does Zephyr Scale have a free tier?',
      answer:
        'No. Zephyr Scale requires a paid Jira Cloud subscription plus the Zephyr Scale add-on fee. Testably offers a fully-featured free tier.',
    },
    {
      question: 'Can I import data from Zephyr Scale?',
      answer:
        'Yes. Export your test cases from Zephyr as CSV and import them into Testably. The migration process typically takes under 10 minutes.',
    },
    {
      question: 'Why pay separately for test management?',
      answer:
        "A standalone platform means your QA data isn't locked to one tool. You get independence, better pricing, and the flexibility to integrate with any development workflow.",
    },
  ],
  ctaText: 'Start Free — No Jira Required',
  ctaSubtext: 'Free forever · Standalone platform · Jira integration included',
};
