import { CompetitorData } from './types';

export const testrailData: CompetitorData = {
  slug: 'testrail',
  name: 'TestRail',
  tagline: 'The Modern, Free Alternative to TestRail',
  description:
    'TestRail charges $38–69/user/month. Testably gives you the same power for free. Compare features, pricing, and see why teams are switching.',
  savingsCallout:
    'A 20-person team saves up to $8,700/year by switching from TestRail Professional to Testably Pro.',
  metaTitle: 'Testably vs TestRail (2026) | Free Test Management Alternative',
  metaDescription:
    'Compare Testably and TestRail side by side. Free test case management with Jira integration, CI/CD support, and team collaboration. Switch from TestRail and save $38–69/user/month.',
  metaKeywords: [
    'testrail alternative',
    'testably vs testrail',
    'free test management tool',
    'testrail pricing',
    'test case management free',
    'testrail competitor',
  ],
  features: [
    { feature: 'Free tier', testably: true, competitor: false },
    { feature: 'Test case management', testably: true, competitor: true },
    { feature: 'Test runs & milestones', testably: true, competitor: true },
    { feature: 'Jira integration', testably: 'All plans', competitor: 'Paid plans only' },
    { feature: 'CI/CD integration', testably: 'All plans', competitor: 'Enterprise only' },
    { feature: 'AI test case generation', testably: true, competitor: false },
    { feature: 'Slack & Teams notifications', testably: true, competitor: false },
    { feature: 'Exploratory', testably: true, competitor: false },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: '30+ minutes' },
  ],
  keyDifferences: [
    {
      title: 'Test Case Management',
      body: 'Testably provides a modern, intuitive interface for creating and organizing test cases with folders, tags, and priorities. TestRail also offers robust test case management, but its UI was designed over a decade ago. Both support rich text, attachments, and custom fields.',
    },
    {
      title: 'Jira Integration',
      body: 'Both platforms integrate with Jira for issue tracking. Testably offers native two-way sync with Jira Cloud, allowing you to link test cases to Jira issues and auto-update status. TestRail requires additional configuration and some advanced features are only available in the Enterprise plan.',
    },
    {
      title: 'CI/CD Integration',
      body: 'Testably includes CI/CD integration in all plans, letting you trigger test runs from your build pipeline and report results back automatically. TestRail limits CI/CD integration to their Enterprise tier, which costs $69/user/month.',
    },
    {
      title: 'Pricing Model',
      body: 'The biggest difference: Testably offers a generous free tier and flat-rate team plans. TestRail charges per seat with no free option, meaning a 10-person team would pay $380–690/month on TestRail vs $0–99/month on Testably.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '3 projects · 3 members' },
      competitor: { price: 'No free tier', detail: '' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Up to 5 members' },
      competitor: { price: '$190–345/mo', detail: '$38–69 × 5 users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Up to 20 members' },
      competitor: { price: '$380–690/mo', detail: '$38–69 × 10 users' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Up to 20 members' },
      competitor: { price: '$760–1,380/mo', detail: '$38–69 × 20 users' },
    },
    {
      plan: 'Enterprise (21–50)',
      testably: { price: '$249/mo', detail: 'Enterprise S · 21–50 members' },
      competitor: { price: 'Custom', detail: 'Contact sales required' },
    },
    {
      plan: 'Enterprise (51–100)',
      testably: { price: '$499/mo', detail: 'Enterprise M · 51–100 members' },
      competitor: { price: 'Custom', detail: 'Contact sales required' },
    },
    {
      plan: 'Enterprise (100+)',
      testably: { price: 'Custom', detail: 'Enterprise L · Contact Sales' },
      competitor: { price: 'Custom', detail: 'Contact sales required' },
    },
  ],
  faqs: [
    {
      question: 'Can I import my test cases from TestRail?',
      answer:
        'Yes. Testably supports CSV import, so you can export your test cases from TestRail and import them directly into Testably. Bulk import typically takes less than 5 minutes.',
    },
    {
      question: 'Is Testably really free?',
      answer:
        "Yes! The Free plan includes 3 projects, 3 team members, and unlimited test cases. No credit card required, no trial period. It's free forever.",
    },
    {
      question: "How does Testably's Jira integration compare to TestRail?",
      answer:
        'Testably offers native two-way sync with Jira Cloud. You can link test cases to Jira issues, create bugs directly from test runs, and auto-update statuses. This is available on all plans, including Free.',
    },
    {
      question: 'What if I need more than 20 team members?',
      answer:
        'Testably offers three Enterprise tiers: Enterprise S ($249/mo, 21–50 members), Enterprise M ($499/mo, 51–100 members), and Enterprise L (custom pricing for 100+). All Enterprise plans include dedicated support and SLA — still a fraction of what TestRail charges.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Testably uses industry-standard encryption, SOC 2 compliance practices, and regular security audits. Your test data is encrypted at rest and in transit.',
    },
    {
      question: 'Can I try before switching completely?',
      answer:
        'Absolutely. Most teams run Testably alongside TestRail for 2–4 weeks during migration. Our Free plan makes this zero-risk.',
    },
  ],
  ctaText: 'Try Testably Free',
  ctaSubtext: 'No credit card required · Free forever plan · Setup in 2 minutes',
};
