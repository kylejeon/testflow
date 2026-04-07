import { CompetitorData } from './types';

export const testrailData: CompetitorData = {
  slug: 'testrail',
  name: 'TestRail',
  tagline: 'The Modern, Affordable Alternative to TestRail',
  description:
    'TestRail charges $37–74/user/month with no free tier. Testably starts free and scales to flat-rate team plans from $19/month — with AI, Shared Steps versioning, and CI/CD on all paid plans.',
  savingsCallout:
    'A 20-person team saves up to $17,000/year by switching from TestRail Enterprise to Testably Professional ($99/mo flat).',
  metaTitle: 'Testably vs TestRail (2026) | Affordable Test Management Alternative',
  metaDescription:
    'Compare Testably and TestRail side by side. Free tier, $19 Hobby plan, AI test generation, Shared Steps with version control, and Jira integration on all plans. Save up to $17,000/year.',
  metaKeywords: [
    'testrail alternative',
    'testably vs testrail',
    'free test management tool',
    'testrail pricing',
    'test case management free',
    'testrail competitor',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: true, competitor: false },
    { feature: '14-day Starter trial (no card)', testably: true, competitor: 'Trial only' },
    { feature: 'Test case management', testably: true, competitor: true },
    { feature: 'Test runs & milestones', testably: true, competitor: true },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: 'Always-latest only' },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Requirements Traceability (RTM)', testably: 'Hobby+ unlimited', competitor: 'Enterprise only' },
    { feature: 'AI test case generation', testably: true, competitor: false },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: 'Paid plans only' },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: 'Enterprise only' },
    { feature: 'Slack & Teams notifications', testably: 'Hobby+', competitor: false },
    { feature: 'Exploratory testing', testably: true, competitor: false },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: '30+ minutes' },
  ],
  keyDifferences: [
    {
      title: 'Shared Steps with True Version Control',
      body: 'Testably is the only TCM that lets you pin Shared Step versions per test case, with a side-by-side diff and bulk update flow when newer versions are published. TestRail uses an always-latest model — any change instantly affects every test case, with no version pinning. For regression-critical teams, this is a major reliability gap.',
    },
    {
      title: 'Pricing Model',
      body: 'TestRail charges $37/user/month (Professional) or $74/user/month (Enterprise) with no free tier. Testably offers a free forever plan, a $19 Hobby plan for small teams, and flat-rate Starter ($49) and Professional ($99) plans. A 20-person team pays $99/month on Testably vs $740–1,480/month on TestRail.',
    },
    {
      title: 'AI & Modern Features',
      body: 'Testably ships with AI test case generation built in — generate from text descriptions, Jira issues, or exploratory sessions. TestRail has no native AI features. Testably also includes Run-level step snapshots, so updates to Shared Steps never affect test runs already in progress.',
    },
    {
      title: 'Try Before You Pay',
      body: 'Testably gives you a free forever plan plus a 14-day full-feature Starter trial — no credit card required. After the trial, you simply continue on Free or upgrade. TestRail offers a 14-day trial only, with no permanent free option to fall back to.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: 'No free tier', detail: '14-day trial only' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '$185–370/mo', detail: '$37–74 × 5 users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$370–740/mo', detail: '$37–74 × 10 users' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$740–1,480/mo', detail: '$37–74 × 20 users' },
    },
    {
      plan: 'Enterprise (21–50)',
      testably: { price: '$249/mo', detail: 'Enterprise S' },
      competitor: { price: 'Custom', detail: 'Contact sales required' },
    },
    {
      plan: 'Enterprise (51–100)',
      testably: { price: '$499/mo', detail: 'Enterprise M' },
      competitor: { price: 'Custom', detail: 'Contact sales required' },
    },
    {
      plan: 'Enterprise (100+)',
      testably: { price: 'Custom', detail: 'Enterprise L' },
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
        'Yes. The Free plan includes 1 project, 2 team members, 100 test cases, 10 test runs per month, and 3 AI generations per month. No credit card required, no trial period — free forever. If you need more, you can start a 14-day Starter trial (no card) or upgrade to the $19 Hobby plan.',
    },
    {
      question: 'How does Testably handle Shared Steps versioning?',
      answer:
        'Testably is the only TCM with true Shared Step version control. Each test case pins the version it was linked at, you get an upward arrow alert when a newer version exists, and you can preview a side-by-side diff before updating. You can also bulk-update all test cases at once. TestRail uses an always-latest model with no version pinning.',
    },
    {
      question: "How does Testably's Jira integration compare to TestRail?",
      answer:
        'Testably offers native two-way sync with Jira Cloud — link test cases to Jira issues, auto-create bugs from test failures, and sync statuses both directions. This is available on all plans, including Free. TestRail requires paid plans for Jira integration and gates advanced features behind Enterprise.',
    },
    {
      question: 'What if I need more than 20 team members?',
      answer:
        'Testably offers three Enterprise tiers: Enterprise S ($249/mo, 21–50 members), Enterprise M ($499/mo, 51–100 members), and Enterprise L (custom pricing for 100+). All Enterprise plans include dedicated support and SLA — still a fraction of TestRail Enterprise pricing.',
    },
    {
      question: 'Can I try before switching completely?',
      answer:
        "Absolutely. Most teams run Testably alongside TestRail for 2–4 weeks during migration. Start on the free plan, activate the 14-day Starter trial when you're ready to test premium features, and only upgrade when you're convinced.",
    },
  ],
  ctaText: 'Try Testably Free',
  ctaSubtext: 'No credit card required · Free forever plan · 14-day Starter trial available',
};
