// Sources (as of 2026-05):
// - https://www.testmonitor.com/pricing
// - https://help.testmonitor.com/how-does-pricing-work
// - https://www.g2.com/products/testmonitor/reviews
// - https://www.capterra.com/p/161759/TestMonitor/reviews/
// See docs/research/competitor-testmonitor.md for full citations.

import { CompetitorData } from './types';

export const testmonitorData: CompetitorData = {
  slug: 'testmonitor',
  name: 'TestMonitor',
  tagline: 'Free Forever vs $13+/User After Trial',
  description:
    'TestMonitor is a clean Dutch test management tool with strong Jira / Azure DevOps integrations — once you commit to a 14-day trial and a per-user price. Testably gives you a free forever plan, AI on every paid plan, and flat-rate team pricing (as of 2026-05).',
  savingsCallout:
    'TestMonitor Starter: $11–$13/user/month. Testably Professional: $99/mo flat for up to 20 testers — including AI, Shared Steps versioning, and unlimited RTM.',
  metaTitle: 'Testably vs TestMonitor (2026) | Free Forever Alternative with AI Built In',
  metaDescription:
    'Compare Testably and TestMonitor. Free forever plan, AI test generation, Shared Steps versioning, and flat-rate team pricing for QA teams of any size.',
  metaKeywords: [
    'testmonitor alternative',
    'testably vs testmonitor',
    'testmonitor pricing',
    'european test management tool',
    'free test management 2026',
    'test management with jira integration',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: true, competitor: false },
    { feature: 'Trial', testably: '14-day Starter trial (no card)', competitor: '14-day full-feature (no card)' },
    { feature: 'AI test case generation', testably: 'All paid plans', competitor: false },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: false },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Requirements Traceability (RTM)', testably: 'Hobby+ unlimited', competitor: true },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: 'Professional+ (two-way)' },
    { feature: 'Azure DevOps integration', testably: 'Roadmap', competitor: true },
    { feature: 'SSO', testably: 'Enterprise', competitor: 'Professional+ (SAML on Enterprise)' },
    { feature: 'Custom fields / branding', testably: 'Enterprise', competitor: 'Professional+' },
    { feature: 'Automation result ingestion', testably: 'Professional+ (CI/CD)', competitor: '500/day Starter, 2,500/day Pro' },
    { feature: 'Flat-rate team pricing', testably: true, competitor: false },
    { feature: 'Built-in issue tracker', testably: 'Linked Issues + Jira sync', competitor: true },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: 'Onboarding session recommended' },
  ],
  keyDifferences: [
    {
      title: 'Free Forever vs 14-Day Trial',
      body: 'TestMonitor offers a 14-day trial; after that, the minimum is Starter at $11–$13 per user per month, with a 3-user starting tier. Testably is free forever for one project and two members, with a $19 Hobby plan covering five — no trial countdown.',
    },
    {
      title: 'AI Built In, Not Missing',
      body: 'TestMonitor does not ship AI test generation, deduplication, or step automation. Testably ships AI test case generation on every paid plan starting at $19/mo — generate from text descriptions, Jira issues, or exploratory sessions.',
    },
    {
      title: 'Flat-Rate Pricing Beats Per-User at Scale',
      body: 'TestMonitor charges $11–$13 per user per month on Starter, scaling to $10–$18 per user on Professional. A 15-person QA team pays $165–$270/mo on TestMonitor; the same team is $99/mo flat on Testably Professional.',
    },
    {
      title: 'Shared Steps and Run-Level Snapshots',
      body: 'TestMonitor does not pin Shared Step versions per test case. Testably is the only TCM where each test case locks the Shared Step version it was linked at, with side-by-side diffs, bulk update flows, and frozen snapshots for in-flight runs.',
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
      plan: 'Small team (3)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '~$33–39/mo', detail: 'Starter · $11–$13/user × 3' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '~$50–90/mo', detail: 'Professional min · $10–$18/user × 5' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '~$100–180/mo', detail: 'Professional · $10–$18/user × 10' },
    },
    {
      plan: 'Larger team (20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '~$200–360/mo', detail: 'Professional · $10–$18/user × 20' },
    },
    {
      plan: 'Enterprise',
      testably: { price: '$249–$499/mo', detail: 'Enterprise S / M' },
      competitor: { price: 'Custom', detail: 'Enterprise · 10-user min, SAML 2.0' },
    },
  ],
  faqs: [
    {
      question: 'Can I import test cases from TestMonitor?',
      answer:
        'Yes. Export your TestMonitor cases as CSV (or via the API) and import them into Testably. Most teams complete migration in under an hour.',
    },
    {
      question: 'Does Testably integrate with Azure DevOps?',
      answer:
        'Azure DevOps integration is on the roadmap. Jira Cloud is supported natively today across all plans. If Azure DevOps is mandatory for your workflow, contact sales for current timing or pilot via the public REST API.',
    },
    {
      question: 'How does AI test generation compare?',
      answer:
        'TestMonitor does not offer AI test generation. Testably ships AI test case generation on every paid plan starting at $19/mo — generate from text descriptions, Jira issues, or exploratory sessions.',
    },
    {
      question: 'Is data hosted in the EU?',
      answer:
        'Testably hosts production data in EU-based infrastructure with GDPR-compliant processing. If you have specific data-residency requirements for your industry, contact sales for the Data Processing Addendum.',
    },
    {
      question: 'What about screenshot attachments?',
      answer:
        'Testably supports drag-and-drop screenshot attachments directly in the browser — no Java plugin required. TestMonitor reviewers have reported needing a Java plugin to attach screenshots.',
    },
  ],
  ctaText: 'Try Testably Free',
  ctaSubtext: 'No 14-day trial countdown · AI on paid plans · Free forever plan',

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['testrail', 'qase', 'practitest'],

  alternativePageData: {
    h1: 'The TestMonitor Alternative with AI, a Free Plan, and No Per-Seat Gotchas',
    subhead:
      'TestMonitor is a clean European TCM with solid Jira and Azure DevOps integrations, but it has no free tier, no AI, and per-user pricing that scales linearly with team size. Testably gives you free forever, AI on every paid plan, and flat-rate team pricing.',
    introBody:
      'TestMonitor has built a steady reputation among European QA teams: GDPR-friendly hosting, native Jira and Azure DevOps integrations, and a polished interface. The price for that polish is a 14-day trial followed by per-user billing starting at $11 to $13 on Starter and $10 to $18 on Professional, with a minimum of three users on Starter and five on Professional. Once you are running a meaningful regression suite, AI assistance shows up as a gap — TestMonitor does not generate test cases from natural language, deduplicate similar tests, or summarize failure clusters. Testably solves both problems in different directions. The free tier (one project, two members, one hundred test cases) is permanent, not a trial. AI test case generation ships on every paid plan starting at $19 per month. And the flat-rate Professional plan covers up to twenty testers for $99 per month flat, which becomes structurally cheaper than TestMonitor the moment your team crosses about seven testers. Migration is a CSV export and a field map; most teams complete it inside one working day.',
    whyLeave: [
      {
        title: 'No free tier — only a 14-day trial',
        body: 'After the trial, the minimum is Starter at $11–$13 per user with a 3-user start. There is no permanent free fallback.',
      },
      {
        title: 'No AI test generation',
        body: 'AI test case generation, deduplication, and failure summarization are not part of the TestMonitor feature set.',
      },
      {
        title: 'Per-user pricing scales linearly',
        body: 'Costs grow with team size. A 15-person QA team pays $165–$270/mo on TestMonitor; the same team is $99/mo flat on Testably.',
      },
      {
        title: 'Java plugin for screenshots',
        body: 'Reviewers note that adding printscreens requires a Java plugin and breaks if Java is out of date.',
      },
      {
        title: 'Onboarding session recommended',
        body: 'TestMonitor users describe needing a walkthrough session to feel comfortable with terminology like Suite, Case, and Requirements.',
      },
    ],
    whySwitch: [
      {
        title: 'Free forever plan, no trial countdown',
        body: 'Testably Free is permanent: 1 project, 2 members, 100 TCs, 10 runs/month, 3 AI generations/month.',
      },
      {
        title: 'AI on every paid plan',
        body: 'Generate test cases from text, Jira issues, or exploratory sessions — starting on Hobby at $19/mo.',
      },
      {
        title: 'Flat-rate team pricing',
        body: '$99/mo Professional covers up to 20 testers. Hiring more QA does not change the bill until you exceed 20.',
      },
      {
        title: 'Shared Steps version pinning + run snapshots',
        body: 'TestMonitor does not pin Shared Step versions per test case. Testably does — with diffs and bulk updates.',
      },
      {
        title: 'Native browser attachments, no plugins',
        body: 'Drag-and-drop screenshots, paste from clipboard, attach files up to 25 MB. No Java, no plugins, no version mismatches.',
      },
    ],
    metaTitle: 'Best TestMonitor Alternative in 2026 — Testably',
    metaDescription:
      'Need a TestMonitor alternative with a real free tier, AI, and flat-rate pricing? Testably is free forever, $19/mo Hobby, $99/mo for up to 20 testers — AI included.',
    faqs: [
      {
        question: 'Is Testably hosted in Europe?',
        answer:
          'Testably hosts production data in EU-based infrastructure with GDPR-compliant processing. Contact sales for the DPA and specific region details.',
      },
      {
        question: 'How do I migrate from TestMonitor?',
        answer:
          'Export TestMonitor test cases as CSV (or via the API), map fields, import into Testably, and verify on a sample regression run. Most teams complete migration in under one working day.',
      },
      {
        question: 'Does Testably support Azure DevOps like TestMonitor?',
        answer:
          'Azure DevOps integration is on the roadmap. Jira Cloud is fully supported on all plans today.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from TestMonitor to Testably in under a day',
    steps: [
      {
        num: 1,
        title: 'Export TestMonitor test cases',
        body: 'Use TestMonitor\'s CSV export (or the REST API) to dump test cases, requirements, and run history.',
      },
      {
        num: 2,
        title: 'Decide on suites and projects',
        body: 'TestMonitor uses Suite / Case / Requirement; Testably uses Project / Test Suite / Test Case / Requirement. Decide whether each TestMonitor Suite becomes a Testably Test Suite or a separate project.',
      },
      {
        num: 3,
        title: 'Map fields and import CSV',
        body: 'Use the field mapping table below. Open the Testably project, choose "Import → CSV", and confirm the mapping.',
      },
      {
        num: 4,
        title: 'Connect Jira (and Azure DevOps when available)',
        body: 'Add the Jira Cloud integration in Testably to preserve existing issue links. Azure DevOps is on the roadmap.',
      },
      {
        num: 5,
        title: 'Verify on a representative regression run',
        body: 'Re-run one regression suite in Testably, confirm coverage and results agree with TestMonitor, then cut traffic over.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Suite', to: 'Test Suite' },
      { from: 'Case → Title', to: 'Test Case → Title' },
      { from: 'Case → Steps (Action / Expected)', to: 'Steps' },
      { from: 'Case → Priority', to: 'Priority' },
      { from: 'Case → Labels', to: 'Tags' },
      { from: 'Requirement', to: 'Requirement (RTM)' },
      { from: 'Issue link (Jira / Azure)', to: 'Linked Issues (via integration)' },
      { from: 'Milestone / Run', to: 'Test Run', note: 'TestMonitor milestone becomes a Testably test run cycle.' },
    ],
  },
};

export default testmonitorData;
