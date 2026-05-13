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

  // ─── M1 신규 옵셔널 필드 ───
  // Sources (as of 2026-05): https://www.testrail.com, G2 / Capterra / Reddit reviews.
  // See docs/research/competitor-testrail.md for full citations.

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['zephyr', 'qase', 'xray'],

  alternativePageData: {
    h1: 'The TestRail Alternative That Actually Has a Free Plan',
    subhead:
      "TestRail charges $38–$71 per user per month with no free tier, and gates CI/CD, RTM, and version control behind Enterprise. Testably gives you AI, Shared Steps versioning, and flat-rate team pricing — starting at $0.",
    introBody:
      'TestRail has been the default enterprise test management tool for over a decade, and it shows: a deep feature set, broad integrations, and many large customers. It also has the pricing of a 2014 enterprise SaaS — $38 per user per month on Professional Cloud, $71 per user per month on Enterprise Cloud, with the most important features (CI/CD, Requirements Traceability, test case version control) locked into the Enterprise tier. A 20-person QA team on Professional pays roughly $760 per month before any Enterprise add-ons; on Enterprise, that becomes $1,420 per month. Testably is built for teams that want the same outcome — structured test cases, traceability, run management, Jira sync — without the per-seat math. The free plan is permanent, not a trial. AI test case generation ships on every paid plan starting at $19 per month. Shared Steps version pinning, run-level snapshots, and unlimited Requirements Traceability come on the Hobby plan and above. Migration from TestRail is a CSV export and a field map; most teams complete it in under an hour. Many run both tools side-by-side for a regression cycle before switching the team over.',
    whyLeave: [
      {
        title: 'No free tier — only a 14-day trial',
        body: 'TestRail offers a 14-day trial. After that, the minimum is Professional Cloud at ~$38 per user per month. There is no permanent free fallback.',
      },
      {
        title: 'Per-user pricing scales linearly',
        body: 'A 20-person team pays $760–$1,420/mo. Testably Professional is $99/mo flat for the same headcount.',
      },
      {
        title: 'Key features locked to Enterprise',
        body: 'Requirements Traceability, CI/CD integration, and test case version control are all Enterprise-only — roughly doubling the per-seat cost.',
      },
      {
        title: 'Shared Steps use always-latest only',
        body: 'TestRail Shared Steps have no version pinning. Step edits propagate to every test case instantly.',
      },
      {
        title: 'No native AI',
        body: 'TestRail does not ship AI test case generation, deduplication, or failure summarization.',
      },
    ],
    whySwitch: [
      {
        title: 'Free forever plan',
        body: '1 project, 2 members, 100 TCs, 10 runs/month, 3 AI generations/month — permanent. No trial countdown.',
      },
      {
        title: 'Flat-rate team pricing',
        body: '$99/mo Professional covers up to 20 testers. Save up to $17,000/year vs TestRail Enterprise for a 20-person team.',
      },
      {
        title: 'AI on every paid plan from $19/mo',
        body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on Hobby.',
      },
      {
        title: 'Shared Steps with version pinning + run snapshots',
        body: 'Pin Shared Step versions per test case. Side-by-side diffs. Bulk updates. Frozen snapshots for in-flight runs.',
      },
      {
        title: 'Jira sync, RTM, and CI/CD without Enterprise',
        body: 'Native Jira two-way sync on Free. Unlimited RTM on Hobby. CI/CD on Professional.',
      },
    ],
    metaTitle: 'Best TestRail Alternative in 2026 — Testably',
    metaDescription:
      'Looking for a TestRail alternative without per-seat pricing? Testably is free to start, $19/mo for small teams, and $99/mo for up to 20 testers — AI included.',
    faqs: [
      {
        question: 'Can I really save $17,000 a year by switching from TestRail?',
        answer:
          'For a 20-person team on TestRail Enterprise ($71/user/mo × 20 × 12 = $17,040/year), yes — Testably Professional is $99/mo flat ($1,188/year). The exact savings depend on your tier and discount terms, but the order of magnitude holds across most team sizes 10 and above.',
      },
      {
        question: 'How long does a TestRail migration take?',
        answer:
          'For most teams: under one hour for 1,000 test cases. Export CSV from TestRail, map fields, import into Testably, and verify on a sample run.',
      },
      {
        question: 'Do I lose Requirements Traceability when I leave TestRail?',
        answer:
          'No. Testably ships unlimited Requirements Traceability on the Hobby plan and above. RTM is not gated to Enterprise.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from TestRail to Testably in under an hour',
    steps: [
      {
        num: 1,
        title: 'Export TestRail test cases',
        body: 'In TestRail, use the built-in CSV export at the suite level. Include custom fields, attachments references, and linked Jira issue keys.',
      },
      {
        num: 2,
        title: 'Map TestRail fields to Testably fields',
        body: 'Use the field mapping table below. Sections become test suites, milestones become run cycles.',
      },
      {
        num: 3,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload the file, and confirm the mapping. Imports of 1,000 cases typically complete in under a minute.',
      },
      {
        num: 4,
        title: 'Reconnect Jira',
        body: 'Add the Jira Cloud integration in Testably (all plans, including Free). Existing Jira keys re-link automatically.',
      },
      {
        num: 5,
        title: 'Run one regression cycle in parallel',
        body: 'Run a representative regression suite in both tools. Once results and coverage agree, switch the team over and decommission the TestRail subscription on the renewal date.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Case ID', to: 'Test Case ID', note: 'Original TestRail ID preserved as external reference.' },
      { from: 'Title', to: 'Title' },
      { from: 'Preconditions / Steps / Expected Result', to: 'Steps' },
      { from: 'Section', to: 'Test Suite (folder)' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Type', to: 'Type (Manual / Automated)' },
      { from: 'References (Jira)', to: 'Linked Issues (via Jira integration)' },
      { from: 'Milestone', to: 'Test Run cycle' },
      { from: 'Run / Test', to: 'Test Run' },
    ],
  },
};

export default testrailData;
