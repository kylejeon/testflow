import { CompetitorData } from './types';

export const qaseData: CompetitorData = {
  slug: 'qase',
  name: 'Qase',
  tagline: 'A Simpler, More Affordable Alternative to Qase',
  description:
    'Qase charges per user with no free tier for teams. Testably offers a generous free plan, flat-rate pricing, and AI-powered test case generation built in from day one.',
  savingsCallout:
    'A 10-person QA team pays $0–99/month on Testably vs $230+/month on Qase Business. Same core features, fraction of the cost.',
  metaTitle: 'Testably vs Qase (2026) | Simpler & More Affordable Alternative',
  metaDescription:
    'Compare Testably and Qase side by side. Free tier, flat-rate pricing, AI test generation, and Jira integration on all plans. See why teams choose Testably over Qase.',
  metaKeywords: [
    'qase alternative',
    'testably vs qase',
    'qase pricing',
    'free test management',
    'qase competitor',
    'test case management tool',
  ],
  features: [
    { feature: 'Free tier', testably: true, competitor: 'Limited (1 project)' },
    { feature: 'Test case management', testably: true, competitor: true },
    { feature: 'Test runs & milestones', testably: true, competitor: true },
    { feature: 'Jira integration', testably: 'All plans', competitor: 'Paid plans only' },
    { feature: 'CI/CD integration', testably: 'All plans', competitor: 'Business plan only' },
    { feature: 'AI test case generation', testably: true, competitor: 'Add-on cost' },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Exploratory sessions', testably: true, competitor: true },
    { feature: 'Slack & Teams notifications', testably: true, competitor: 'Business plan only' },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: '15–30 minutes' },
  ],
  keyDifferences: [
    {
      title: 'Pricing Model',
      body: 'Qase charges per user per month — costs scale linearly as your team grows. Testably uses flat-rate team plans, so adding one more engineer does not change your bill. A 20-person team pays the same $99/month as a 15-person team on Testably.',
    },
    {
      title: 'AI Test Case Generation',
      body: 'Testably ships AI test case generation as a core feature on all paid plans — generate test cases from plain-text descriptions, Jira issues, or exploratory session logs. Qase offers AI generation only as a paid add-on, increasing your total cost beyond the base subscription.',
    },
    {
      title: 'Jira & CI/CD on All Plans',
      body: 'Testably includes native Jira two-way sync and CI/CD integration on every plan, including Free. Qase gates these integrations behind their Business tier. If your team runs automated pipelines, you pay more on Qase just to unlock basic workflow connections.',
    },
    {
      title: 'Simplicity & Onboarding',
      body: "Testably is designed for fast onboarding — most teams are running their first test within 5 minutes. Qase has a broader feature surface that can slow initial setup. If you don't need every enterprise feature on day one, Testably gives you a cleaner path to value.",
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '3 projects · 3 members' },
      competitor: { price: '$0/mo', detail: '1 project · 3 members only' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Up to 5 members' },
      competitor: { price: '~$115/mo', detail: '$23/user × 5 (Startup plan)' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Up to 20 members' },
      competitor: { price: '~$230/mo', detail: '$23/user × 10 (Startup plan)' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Up to 20 members' },
      competitor: { price: '~$460/mo', detail: '$23/user × 20 (Startup plan)' },
    },
    {
      plan: 'Enterprise',
      testably: { price: '$249/mo', detail: 'Unlimited members' },
      competitor: { price: 'Custom', detail: 'Contact sales required' },
    },
  ],
  faqs: [
    {
      question: 'Can I import my test cases from Qase?',
      answer:
        'Yes. Export your test cases from Qase as CSV and import them directly into Testably. The migration typically takes under 10 minutes for most teams.',
    },
    {
      question: 'Does Testably have AI features like Qase?',
      answer:
        'Yes — and Testably includes AI test case generation on all paid plans at no extra cost. In Qase, AI generation is an add-on. With Testably, you get AI-powered generation from text descriptions, Jira issues, and exploratory session logs as part of your base plan.',
    },
    {
      question: 'Why is Testably cheaper for larger teams?',
      answer:
        "Testably uses flat-rate team pricing instead of per-user billing. Once you're on a plan, adding team members doesn't increase your bill. Qase charges per seat, so your cost grows linearly with team size.",
    },
    {
      question: 'Does Testably support exploratory testing like Qase?',
      answer:
        'Yes. Testably includes exploratory testing sessions where testers can log findings in real time, attach screenshots, and auto-generate test cases from session logs.',
    },
    {
      question: 'What if I need Jira integration?',
      answer:
        'Testably offers native two-way Jira Cloud sync on all plans, including Free. You can link test cases to Jira issues, create bugs directly from test runs, and sync statuses — with zero extra configuration.',
    },
  ],
  ctaText: 'Start Free — No Credit Card Required',
  ctaSubtext: 'Free forever plan · AI included · Setup in 5 minutes',
};
