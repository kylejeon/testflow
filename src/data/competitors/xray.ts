// Sources (as of 2026-05):
// - https://www.getxray.app/
// - https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira
// - https://www.g2.com/products/xray-test-management/reviews
// - https://thectoclub.com/tools/xray-review/
// - https://www.automation-consultants.com/jira-test-case-management/
// See docs/research/competitor-xray.md for full citations.

import { CompetitorData } from './types';

export const xrayData: CompetitorData = {
  slug: 'xray',
  name: 'Xray',
  tagline: 'Standalone Test Management vs Jira-Locked Plugin',
  description:
    'Xray turns Jira issues into test cases — meaning you cannot manage tests without Jira, and your bill scales with the entire engineering org. Testably is a standalone platform with optional two-way Jira sync, flat-rate pricing, and AI on all paid plans (as of 2026-05).',
  savingsCallout:
    'Xray on Atlassian Marketplace bills against your Jira Cloud user tier, with CI integrations (Jenkins, GitHub) locked behind Xray Enterprise. Testably Professional is $99/mo flat for up to 20 testers — CI/CD and AI included.',
  metaTitle: 'Testably vs Xray (2026) | Standalone Alternative to Jira-Locked Test Management',
  metaDescription:
    'Compare Testably and Xray. Standalone test management with optional Jira sync, $19 Hobby plan, AI test generation on paid plans, and Shared Steps versioning. Skip the Jira plugin rabbit hole.',
  metaKeywords: [
    'xray alternative',
    'xray test management alternative',
    'xray jira alternative',
    'testably vs xray',
    'xray pricing',
    'jira test management plugin alternative',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: true, competitor: false },
    { feature: 'Works without Jira', testably: true, competitor: false },
    { feature: 'Standalone platform', testably: true, competitor: false },
    { feature: 'Bills per QA user only', testably: true, competitor: 'Tied to Jira user tier' },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: 'Jira + plugin setup' },
    { feature: 'AI test case generation', testably: 'All paid plans', competitor: 'Standard (basic) / Advanced (scripts)' },
    { feature: 'BDD / Gherkin support', testably: 'Roadmap', competitor: true },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: 'Step Library (no pinning)' },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Jira integration', testably: 'Native, optional', competitor: 'Required' },
    { feature: 'CI/CD integration (Jenkins, GitHub)', testably: 'Professional+', competitor: 'Enterprise edition only' },
    { feature: 'Cross-project reporting', testably: true, competitor: true },
    { feature: 'Reports without paid add-on', testably: true, competitor: 'Xporter add-on often needed' },
  ],
  keyDifferences: [
    {
      title: 'Test Cases as Jira Issues vs Dedicated Records',
      body: 'Xray stores every test case as a Jira issue. If you stop paying for Jira, you lose access to your tests. Testably keeps test cases in a dedicated data model — Jira is an optional integration, not the foundation. Your QA history travels with you.',
    },
    {
      title: 'CI/CD Locked Behind Xray Enterprise',
      body: 'Xray on Atlassian Marketplace gates Jenkins and GitHub connectors to its separate Xray Enterprise app. Testably ships CI/CD integration on the Professional plan ($99/mo flat) — no extra license, no separate app, no Atlassian Marketplace dependency.',
    },
    {
      title: 'AI Built In, Not Tiered by Edition',
      body: 'Xray Standard gives basic AI Test Case Generation; AI Test Script Generation requires Advanced; Visual Test Model Generation requires Enterprise. Testably ships AI test case generation on every paid plan starting at $19/mo — generate from text, Jira issues, or exploratory sessions.',
    },
    {
      title: 'Reports Without Paid Plugins',
      body: 'Xray users frequently report needing Xporter or other paid Atlassian plugins to export the reports they need. Testably includes CSV / Excel / API exports on all paid plans — no marketplace shopping to file a release report.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: 'No free tier', detail: 'Trial only' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small Jira team (≤10 users)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '~$100/yr Standard', detail: 'Standard edition, 10 Jira users' },
    },
    {
      plan: 'Mid Jira team (50 users, 10 testers)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: 'Tier scales w/ Jira', detail: 'Billed on all 50 Jira users' },
    },
    {
      plan: 'CI/CD integration',
      testably: { price: 'Included', detail: 'Professional plan' },
      competitor: { price: 'Enterprise app', detail: 'Separate Xray Enterprise license' },
    },
    {
      plan: 'Advanced AI features',
      testably: { price: 'Included', detail: 'AI on all paid plans' },
      competitor: { price: 'Advanced / Enterprise', detail: 'Higher edition required' },
    },
    {
      plan: 'Enterprise (100+ Jira users)',
      testably: { price: '$249–$499/mo', detail: 'Enterprise S / M (flat)' },
      competitor: { price: 'Custom', detail: 'Marketplace + Enterprise app' },
    },
  ],
  faqs: [
    {
      question: 'Can I use Testably if my team lives in Jira?',
      answer:
        'Yes. Testably integrates natively with Jira Cloud — link test cases to Jira issues, auto-create bugs from test failures, and sync statuses two-way. Available on all plans including Free. You keep the Jira workflow without locking your tests inside Jira.',
    },
    {
      question: 'Can I import test cases from Xray?',
      answer:
        'Yes. Export your Xray test cases as CSV (or via the Xray API) and import them directly into Testably. Step-by-step migration typically completes in under 30 minutes for most projects.',
    },
    {
      question: 'Does Testably support BDD / Gherkin tests?',
      answer:
        'Testably supports structured step-by-step test cases and exploratory sessions today. Gherkin-style BDD test cases are on the roadmap. If your team relies exclusively on BDD as the source of truth, run a pilot first.',
    },
    {
      question: 'Why is Xray more expensive at scale?',
      answer:
        'Xray bills on the underlying Jira Cloud user tier — your whole engineering org. If you have 100 Jira users but only 10 testers, you still pay for the 100-user tier. Testably charges per QA user only, with flat-rate plans ($19 / $49 / $99 / Enterprise) regardless of Jira headcount.',
    },
    {
      question: 'Do I need extra plugins (like Xporter) with Testably?',
      answer:
        'No. CSV, Excel, and API exports are built in on every paid plan. You do not need to shop the Atlassian Marketplace for basic reports.',
    },
    {
      question: 'How does CI/CD compare?',
      answer:
        'Testably ships CI/CD integration (GitHub Actions, GitLab CI, Jenkins) on the Professional plan at $99/mo flat. Xray gates Jenkins and GitHub connectors behind its separate Xray Enterprise app, increasing total cost.',
    },
  ],
  ctaText: 'Try Testably Free — No Jira Required',
  ctaSubtext: 'Free forever · Standalone platform · 14-day Starter trial available',

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['zephyr', 'testrail', 'qase'],

  alternativePageData: {
    h1: 'The Xray Alternative That Works Without Jira (and Costs Less)',
    subhead:
      'Xray turns test management into a Jira plugin you cannot leave. Testably is a standalone platform with optional Jira sync, flat-rate pricing, and AI built in — ready in five minutes, no Atlassian Marketplace shopping required.',
    introBody:
      'Xray is one of the most widely deployed test management tools on Jira — which is exactly the problem when your QA work outgrows Jira, or when finance asks why the Xray bill scales with the entire engineering organization instead of the QA team. Because Xray models each test case as a Jira issue, you cannot view, edit, or migrate tests without an active Jira Cloud subscription. Reports often require third-party Atlassian plugins like Xporter. CI/CD connectors for Jenkins and GitHub are gated behind a separate Xray Enterprise app, on top of the marketplace price. Testably approaches this problem from the opposite direction: a dedicated test management platform with an optional two-way Jira integration. You can start free, link Jira issues if and when you need to, and never pay for non-tester seats. The migration takes a CSV export, a field mapping, and a verification pass — usually under thirty minutes.',
    whyLeave: [
      {
        title: 'Jira is mandatory — even for non-coding QA',
        body: 'Xray test cases are Jira issues. Manual testers, analysts, and external auditors all need Jira seats to see test history. The bill scales with the whole org, not just QA.',
      },
      {
        title: 'CI/CD integrations are paywalled into a separate app',
        body: 'Jenkins and GitHub connectors require Xray Enterprise — a separate Atlassian Marketplace app on top of your base Xray license.',
      },
      {
        title: 'Reports often need paid plugins',
        body: 'Multiple G2 reviewers note that producing the reports they need requires Xporter or other paid Marketplace add-ons.',
      },
      {
        title: 'Cloud performance complaints on large suites',
        body: 'Reviewers cite slow test step editing on Xray Cloud, with multi-second load times when working in large test suites.',
      },
      {
        title: 'Learning curve for test plan / execution structure',
        body: 'Even experienced Jira admins describe Xray\'s test plan and test execution model as initially confusing.',
      },
    ],
    whySwitch: [
      {
        title: 'Standalone platform with optional Jira sync',
        body: 'Testably keeps test cases in a dedicated data model. You can integrate with Jira on day one and migrate freely later — your QA history is not Jira-shaped.',
      },
      {
        title: 'Flat-rate pricing tied to testers, not the whole org',
        body: 'Up to 20 members for $99/mo on Professional. Your Jira seat count and engineering headcount are irrelevant to the bill.',
      },
      {
        title: 'AI test case generation on every paid plan',
        body: 'Generate from text descriptions, Jira issues, or exploratory sessions — starting at $19/mo Hobby. No edition upgrade required.',
      },
      {
        title: 'CI/CD integration on Professional, not in a separate app',
        body: 'GitHub Actions, GitLab CI, and Jenkins connectors are part of the $99/mo Professional plan.',
      },
      {
        title: 'Shared Steps with version pinning + run snapshots',
        body: 'Pin Shared Step versions per test case, view side-by-side diffs, and freeze run-level snapshots so updates never invalidate an in-flight execution.',
      },
    ],
    metaTitle: 'Best Xray Alternative in 2026 — Testably',
    metaDescription:
      'Looking for an Xray alternative that does not lock test management inside Jira? Testably is a standalone platform with native Jira sync, flat-rate pricing, AI on paid plans, and CI/CD without a separate Enterprise app.',
    faqs: [
      {
        question: 'Will my Jira workflow break if we leave Xray?',
        answer:
          'No. Testably connects to Jira Cloud with two-way sync — link test cases to Jira issues, auto-create bugs from failures, and keep statuses aligned. Developers keep working in Jira; QA gets a dedicated tool.',
      },
      {
        question: 'How long does an Xray migration take?',
        answer:
          'For most projects: under 30 minutes. Export Xray test cases (CSV via the Xray API), map fields, import into Testably, and verify on a sample run. Larger suites (>1,000 cases) can be batched over an afternoon.',
      },
      {
        question: 'Do I lose BDD / Gherkin coverage?',
        answer:
          'Testably supports structured step-by-step test cases and exploratory sessions today. Gherkin-native BDD is on the roadmap. Teams that rely on BDD as the single source of truth should run a pilot before switching.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from Xray to Testably in under 30 minutes',
    steps: [
      {
        num: 1,
        title: 'Export Xray test cases as CSV',
        body: 'In Jira, use Xray\'s built-in CSV export (or the Xray REST/GraphQL API) to dump test cases, steps, and statuses. Include linked Jira issue keys so traceability survives the migration.',
      },
      {
        num: 2,
        title: 'Map Xray fields to Testably fields',
        body: 'Use the field mapping table below. Most projects only customize 2–3 fields beyond the defaults.',
      },
      {
        num: 3,
        title: 'Import the CSV into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload the file, and accept the mapping. Imports of 1,000 cases typically complete in under a minute.',
      },
      {
        num: 4,
        title: 'Connect Jira (optional but recommended)',
        body: 'In Testably, add the Jira Cloud integration to preserve issue linkage. Two-way sync is available on all plans including Free.',
      },
      {
        num: 5,
        title: 'Verify on a sample run',
        body: 'Pick a representative regression suite, run it in Testably, and confirm step-level results, attachments, and Jira links round-trip correctly.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Xray Test (Jira Issue Key)', to: 'Test Case ID', note: 'Stored as external reference; original key preserved.' },
      { from: 'Summary', to: 'Title' },
      { from: 'Test Steps (Action / Data / Expected)', to: 'Steps' },
      { from: 'Test Type', to: 'Type (Manual / Automated)' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Labels', to: 'Tags' },
      { from: 'Linked Jira issues', to: 'Linked Issues (via Jira integration)' },
      { from: 'Test Plan / Test Execution', to: 'Test Run', note: 'Xray execution becomes a Testably test run.' },
    ],
  },
};

export default xrayData;
