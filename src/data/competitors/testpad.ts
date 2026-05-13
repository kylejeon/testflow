// Sources (as of 2026-05):
// - https://testpad.com/plans/
// - https://www.g2.com/products/testpad-testpad/reviews
// - https://www.capterra.com/p/196993/Testpad/
// - https://testomat.io/blog/top-exploratory-testing-tools-to-watch/
// See docs/research/competitor-testpad.md for full citations.

import { CompetitorData } from './types';

export const testpadData: CompetitorData = {
  slug: 'testpad',
  name: 'TestPad',
  tagline: 'Checklists Are Lightweight. Testably Is Lightweight + Structured.',
  description:
    'TestPad turns test plans into editable checklists — quick to learn, but lean on structure, integrations, and a permanent free tier. Testably gives you both — structured test cases and exploratory mode — with a free forever plan and native Jira sync (as of 2026-05).',
  savingsCallout:
    'TestPad Essential starts at $49/mo for 3 users after a 30-day trial. Testably stays free forever for one project / two members, then $19/mo Hobby for five — with Jira sync, RTM, and AI included.',
  metaTitle: 'Testably vs TestPad (2026) | Free Test Management Alternative with Jira Sync',
  metaDescription:
    'Compare Testably and TestPad. Free forever plan, Jira two-way sync, AI test generation, and structured test cases plus exploratory mode. More than checklists, less than $49/mo.',
  metaKeywords: [
    'testpad alternative',
    'testably vs testpad',
    'testpad pricing',
    'free test management tool',
    'simple test management tool',
    'exploratory testing tool',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: true, competitor: false },
    { feature: '30-day trial', testably: '14-day Starter trial', competitor: '30-day, up to 20 users' },
    { feature: 'Structured step-by-step test cases', testably: true, competitor: 'Checklist-style only' },
    { feature: 'Exploratory testing', testably: true, competitor: true },
    { feature: 'AI test case generation', testably: 'All paid plans', competitor: false },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: false },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: 'Limited / missing' },
    { feature: 'Built-in issue tracker / linking', testably: 'Linked Issues, Jira sync', competitor: 'Minimal' },
    { feature: 'Requirements Traceability (RTM)', testably: 'Hobby+ unlimited', competitor: false },
    { feature: 'Reports (charts, coverage)', testably: true, competitor: 'Basic progress bars' },
    { feature: 'API access', testably: 'All plans', competitor: 'Team+ only' },
    { feature: 'Image attachments', testably: true, competitor: 'Team+ only' },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: false },
  ],
  keyDifferences: [
    {
      title: 'Checklists vs Structured Test Cases',
      body: 'TestPad models test plans as nested checklists — fast for ad-hoc and exploratory work, but limited when you need preconditions, expected results per step, priorities, or formal regression matrices. Testably supports both styles: structured step-by-step test cases plus a dedicated exploratory mode with timestamped notes.',
    },
    {
      title: 'A Real Free Tier — Forever',
      body: 'TestPad gives you 30 days of full access (up to 20 users), then charges from $49/mo Essential onward. Testably has a free forever plan (1 project, 2 members, 100 TCs) and a $19 Hobby plan for small teams. You can build a regression suite, ship to production, and never pay if your needs stay small.',
    },
    {
      title: 'Jira Two-Way Sync vs No Real Integration',
      body: 'TestPad has effectively no Jira integration — community feedback notes that linking and syncing with Jira is missing or minimal. Testably ships native Jira Cloud two-way sync on every plan, including Free.',
    },
    {
      title: 'AI Test Generation, Reports, and CI/CD',
      body: 'TestPad has no AI, only basic progress visualization, and no CI/CD pipeline integration. Testably ships AI test generation on every paid plan, full reporting (charts, coverage, defect leak), and CI/CD integration on the Professional plan.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: 'No free tier', detail: '30-day trial only' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (3)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '$49–59/mo', detail: 'Essential · 3 users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$99–119/mo', detail: 'Team · 10 users' },
    },
    {
      plan: 'Larger team (15)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$149–179/mo', detail: 'Team 15 · 15 users' },
    },
    {
      plan: 'Department (25)',
      testably: { price: '$249/mo', detail: 'Enterprise S' },
      competitor: { price: '$249–299/mo', detail: 'Department · 25 users' },
    },
    {
      plan: 'Enterprise',
      testably: { price: '$499/mo', detail: 'Enterprise M (up to 100)' },
      competitor: { price: 'Custom', detail: 'Enterprise (net-30 invoice)' },
    },
  ],
  faqs: [
    {
      question: 'Is Testably as fast to set up as TestPad?',
      answer:
        'Yes. Testably onboarding takes under 5 minutes — invite a teammate, create a project, and start writing test cases (or import a CSV from another tool). Unlike TestPad, you can keep using Testably for free forever after the trial ends.',
    },
    {
      question: 'Can I do exploratory testing in Testably?',
      answer:
        'Yes. Testably has a dedicated exploratory testing mode with timestamped notes, attachments, and a one-click "promote to test case" flow. You get both structured TCM and checklist-style exploratory in the same tool.',
    },
    {
      question: 'Can I import test plans from TestPad?',
      answer:
        'Yes. Export your TestPad plans as CSV and import them into Testably. Because TestPad uses a checklist model, you may want to add expected results per step during import — most teams do this for a subset of regression-critical cases.',
    },
    {
      question: 'Does Testably integrate with Jira?',
      answer:
        'Yes — natively, on all plans including Free. Two-way sync, issue linking, auto-create bugs from test failures, and status synchronization. TestPad has minimal Jira integration.',
    },
    {
      question: 'Do I lose simplicity by switching?',
      answer:
        'No. Testably is built to be approachable for non-technical testers — clean UI, keyboard shortcuts, and quick-add patterns. Structured test cases are optional; you can run entirely on exploratory sessions if you prefer.',
    },
  ],
  ctaText: 'Try Testably Free — Forever',
  ctaSubtext: 'No 30-day clock · Jira sync on all plans · Exploratory mode included',

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['testrail', 'qase', 'testiny'],

  alternativePageData: {
    h1: 'The TestPad Alternative with a Free Forever Plan and Jira Integration',
    subhead:
      'TestPad is fast to learn and great for ad-hoc checklists, but the trial expires in 30 days and Jira integration is minimal. Testably gives you both — structured test cases and exploratory mode — with a real free tier and native Jira sync.',
    introBody:
      'TestPad is one of the easiest test management tools to pick up on day one. Its checklist-first model lowers the learning curve for non-technical testers and works well for exploratory and ad-hoc passes. But two patterns show up in long-running deployments: the trial expires after 30 days and the cheapest paid plan is $49/mo for three users, and the lack of Jira integration becomes painful the moment QA needs to link failures to engineering tickets. Testably is designed for teams that want the same lightness without the trade-offs. There is a free forever plan that supports a real regression workflow (one project, two members, one hundred test cases, three AI generations per month). Above that, a $19 Hobby plan covers up to five members with unlimited Requirements Traceability, AI test generation, and Jira two-way sync. You can still run exploratory checklists when you want to; you can also run structured step-by-step regression suites when you need to. CSV import from TestPad takes minutes, and Jira links survive the migration because Testably re-creates them through the Jira Cloud integration.',
    whyLeave: [
      {
        title: 'No free tier after 30 days',
        body: 'TestPad\'s trial is 30 days. After that, the entry plan is $49/mo for three users. There is no permanent free option to fall back to.',
      },
      {
        title: 'Jira integration is essentially missing',
        body: 'TestPad has no native two-way Jira sync. Community feedback consistently flags this as a limitation when QA needs to live alongside Jira-based engineering.',
      },
      {
        title: 'Checklist-only structure',
        body: 'Complex step-by-step test cases with per-step expected results, preconditions, and priorities are difficult to model in a checklist.',
      },
      {
        title: 'Minimal reporting and visualization',
        body: 'Reviewers note that progress is shown in one view; coverage charts, defect leak metrics, and trend graphs are not built in.',
      },
      {
        title: 'No AI, no CI/CD',
        body: 'TestPad does not offer AI test generation, deduplication, or CI/CD pipeline triggers — all standard in modern TCMs.',
      },
    ],
    whySwitch: [
      {
        title: 'Free forever plan, not a 30-day trial',
        body: 'Testably Free supports 1 project, 2 members, 100 TCs, 10 runs/month, and 3 AI generations/month. No credit card, no countdown.',
      },
      {
        title: 'Structured test cases AND exploratory mode',
        body: 'Pick the right shape for the work. Step-by-step regression test cases for stable features. Exploratory sessions with timestamped notes for new features.',
      },
      {
        title: 'Native Jira two-way sync on all plans',
        body: 'Link test cases to Jira issues, auto-create bugs from failures, and keep statuses aligned — available on Free.',
      },
      {
        title: 'AI test generation from $19/mo',
        body: 'Generate test cases from text, Jira issues, or exploratory sessions. Available on every paid plan.',
      },
      {
        title: 'Reports and CI/CD when you need them',
        body: 'Coverage charts, defect leak metrics, and CI/CD pipeline integration (Professional+) — without leaving the tool.',
      },
    ],
    metaTitle: 'Best TestPad Alternative in 2026 — Testably',
    metaDescription:
      'Need a TestPad alternative with a real free tier and Jira sync? Testably offers a free forever plan, $19/mo Hobby, AI on paid plans, and native Jira two-way sync.',
    faqs: [
      {
        question: 'Will I lose the lightweight feel of TestPad?',
        answer:
          'No. Testably has a quick-add UI, keyboard shortcuts, and an exploratory mode that feels close to TestPad\'s checklist style. The difference is you can also build structured regression suites when needed.',
      },
      {
        question: 'How do I migrate TestPad checklists?',
        answer:
          'Export your TestPad plans as CSV and import into Testably. Each checklist item becomes a test case or a step (depending on your preference). Most teams complete migration in under 30 minutes.',
      },
      {
        question: 'Do I really get Jira sync on the free plan?',
        answer:
          'Yes. The Jira Cloud integration is included on all plans, including Free, with bidirectional sync and issue linking.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from TestPad to Testably in under 30 minutes',
    steps: [
      {
        num: 1,
        title: 'Export TestPad plans as CSV',
        body: 'In TestPad, export each plan as CSV. Repeat for any plans you want to migrate. Keep the original tags and labels.',
      },
      {
        num: 2,
        title: 'Decide: structured cases or checklist-as-cases?',
        body: 'TestPad checklist items can map 1:1 to Testably test cases, or you can promote each top-level item to a test case with checklist children as steps. Most teams pick the second option for regression-critical plans.',
      },
      {
        num: 3,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload, and confirm the mapping.',
      },
      {
        num: 4,
        title: 'Connect Jira',
        body: 'In Testably, add the Jira Cloud integration (free plan and up). Now your QA work has the issue linking TestPad never offered.',
      },
      {
        num: 5,
        title: 'Verify on a representative pass',
        body: 'Run one full test plan in Testably and confirm the workflow feels right before switching the team over.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Plan name', to: 'Project / Test Suite' },
      { from: 'Checklist item (top-level)', to: 'Test Case' },
      { from: 'Checklist item (child)', to: 'Step', note: 'Add expected result per step during import or after.' },
      { from: 'Tags', to: 'Tags' },
      { from: 'Run status', to: 'Latest Run Result' },
      { from: 'Notes', to: 'Test Case Description / Run Notes' },
    ],
  },
};

export default testpadData;
