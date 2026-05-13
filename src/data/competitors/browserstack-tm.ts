// Sources (as of 2026-05):
// - https://www.browserstack.com/test-management
// - https://www.browserstack.com/pricing?product=test-management
// - https://www.g2.com/products/browserstack/reviews
// - https://bug0.com/knowledge-base/browserstack-reviews
// - https://testdino.com/reviews/browserstack-test-reporting-review/
// See docs/research/competitor-browserstack-tm.md for full citations.

import { CompetitorData } from './types';

export const browserstackTmData: CompetitorData = {
  slug: 'browserstack-tm',
  name: 'BrowserStack Test Management',
  tagline: 'Dedicated TCM vs One Feature in a 15-Product Bundle',
  description:
    'BrowserStack Test Management is one piece of the BrowserStack platform — handy if you already pay for Live/Automate, opaque on standalone pricing. Testably is a dedicated test management tool with transparent flat-rate pricing and Shared Steps versioning (as of 2026-05).',
  savingsCallout:
    'BrowserStack Team Ultimate Bundle (15 products) is $375/mo for 5 users (annual). Testably Professional is $99/mo for up to 20 testers — focused on test management, with AI and CI/CD included.',
  metaTitle: 'Testably vs BrowserStack Test Management (2026) | Dedicated TCM Alternative',
  metaDescription:
    'Compare Testably and BrowserStack Test Management. Transparent flat-rate pricing, Shared Steps versioning, AI test generation, and a free forever plan — not a bundled DevTools feature.',
  metaKeywords: [
    'browserstack test management alternative',
    'browserstack test management pricing',
    'testably vs browserstack tm',
    'browserstack alternative',
    'test management with ci cd integration',
    'ai test case management',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: '1 project · 2 members · 100 TCs', competitor: 'Up to 5 members, unlimited TCs' },
    { feature: 'Standalone product (no bundle)', testably: true, competitor: 'Part of 15-product BrowserStack suite' },
    { feature: 'Public, transparent pricing', testably: true, competitor: 'Team Plan $99/mo (slab details opaque)' },
    { feature: 'AI test case generation', testably: 'All paid plans', competitor: 'AI agents (limits per user)' },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: false },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Requirements Traceability (RTM)', testably: 'Hobby+ unlimited', competitor: true },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: true },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: true },
    { feature: 'Migration tools from TestRail / Xray / Zephyr', testably: 'CSV / API', competitor: '24-hour migration (managed)' },
    { feature: 'Browser cloud (Live / Automate)', testably: 'Not included (focus: TCM)', competitor: 'Available as bundled product' },
    { feature: 'Flat-rate pricing', testably: true, competitor: 'Per-user / per-bundle' },
    { feature: 'Annual plan flexibility (user count)', testably: 'Monthly billing default', competitor: 'Annual commitment, user count fixed' },
  ],
  keyDifferences: [
    {
      title: 'A Dedicated TCM, Not a Bundled Feature',
      body: 'BrowserStack is primarily a cross-browser cloud (Live, Automate, App Live, App Automate). Test Management is a relatively new addition that pulls value from the surrounding suite — but pricing is structured around the Team Ultimate Bundle ($375/mo for 5 users, annual). If you only need test management, you are paying for fourteen other products too. Testably is a focused TCM with public, transparent flat-rate pricing.',
    },
    {
      title: 'Shared Steps Version Pinning — Testably-Only',
      body: 'BrowserStack TM does not pin Shared Step versions per test case. Testably is the only TCM where each test case locks the Shared Step version it was linked at, with side-by-side diffs and a bulk update flow. Critical for teams with mature regression suites.',
    },
    {
      title: 'AI Quality — Generation vs Noise',
      body: 'BrowserStack ships eight AI agents across the suite, but G2 reviewers flag AI-generated tests as often producing irrelevant cases that increase review time. Testably\'s AI is scoped to test case generation, deduplication, and exploratory summaries — narrower scope, fewer false positives.',
    },
    {
      title: 'Annual Commitment Inflexibility',
      body: 'BrowserStack reviewers note that on annual plans, user counts can only be adjusted yearly — painful when team size fluctuates. Testably is month-to-month by default; you can resize on any plan, any month.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: '$0', detail: 'Up to 5 members, unlimited TCs (TM only)' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '$99/mo (TM Team)', detail: 'Detailed slab not public' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$99+/mo', detail: 'TM Team scales (slab opaque)' },
    },
    {
      plan: 'Team Ultimate Bundle (5)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$375/mo', detail: '15-product bundle, annual' },
    },
    {
      plan: 'Enterprise',
      testably: { price: '$249–$499/mo', detail: 'Enterprise S / M (flat)' },
      competitor: { price: 'Custom', detail: 'Enterprise (SSO, IP whitelist)' },
    },
  ],
  faqs: [
    {
      question: 'I already pay for BrowserStack Automate. Is Test Management free?',
      answer:
        'BrowserStack Test Management has a free tier (5 members, unlimited test cases). The Team Plan is reported at $99/mo, but the exact slab structure is not public. If you only need test management, paying for a 15-product bundle is overspend. Testably is dedicated TCM at $99/mo for up to 20 testers.',
    },
    {
      question: 'Can I migrate from TestRail / Xray / Zephyr / qTest?',
      answer:
        'Yes. Testably supports CSV import from all four. BrowserStack offers a managed 24-hour migration as a sales-led service. Testably migrations are self-serve and typically complete in under one working day.',
    },
    {
      question: 'How does AI test generation compare?',
      answer:
        'BrowserStack ships eight AI agents across the suite. G2 reviewers report that AI-generated tests often produce many irrelevant cases. Testably\'s AI is narrower — test case generation, deduplication, and exploratory summarization — with stronger signal-to-noise.',
    },
    {
      question: 'Do I lose BrowserStack browser cloud access?',
      answer:
        'Yes. Testably is a dedicated test management tool; we do not run a browser cloud. If cross-browser cloud is essential, you can keep BrowserStack Live/Automate for browser execution and use Testably as the TCM via CI/CD integration. Many teams use this hybrid setup.',
    },
    {
      question: 'Can I avoid annual commitments?',
      answer:
        'Yes. Testably is month-to-month by default. BrowserStack annual plans lock user count to the original commitment.',
    },
  ],
  ctaText: 'Try Testably Free',
  ctaSubtext: 'Dedicated TCM · Transparent pricing · No bundle required',

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['testrail', 'xray', 'zephyr'],

  alternativePageData: {
    h1: 'The BrowserStack Test Management Alternative Built for QA — Not DevTools Bundles',
    subhead:
      'BrowserStack Test Management is one feature in a 15-product platform priced for the bundle. Testably is a dedicated test management tool with transparent flat-rate pricing, Shared Steps versioning, and AI focused on test case quality.',
    introBody:
      'BrowserStack made its name with the browser cloud (Live, Automate, App Live, App Automate) and has expanded into adjacent products including a test management tool. For teams already paying for BrowserStack Automate, bolting on Test Management can look free; for teams who only need test management, the pricing structure points toward the Team Ultimate Bundle at $375 per month for five users on annual billing — paying for fourteen other products you do not need. Reviews also flag AI test generation that produces many irrelevant cases, and annual plan rigidity that prevents seat adjustments when team size fluctuates. Testably is a different shape: focused entirely on test management, with public flat-rate pricing, Shared Steps version pinning, and AI scoped to a few high-confidence operations. Migration from TestRail, Xray, Zephyr, or qTest is handled by Testably\'s CSV import and typically completes within one working day. If you also need a browser cloud, many teams run a hybrid setup — BrowserStack for browser execution, Testably for test management — connected via the CI/CD integration on the Professional plan.',
    whyLeave: [
      {
        title: 'Pricing is bundle-shaped, not TCM-shaped',
        body: 'Team Ultimate Bundle is $375/mo for 5 users (annual) across 15 products. If you only need test management, much of that is unused.',
      },
      {
        title: 'AI generates noisy test cases',
        body: 'G2 reviewers report many irrelevant AI-generated cases that increase manual review time.',
      },
      {
        title: 'Annual plans lock user count',
        body: 'On annual billing, user counts can only change yearly — painful when team size fluctuates.',
      },
      {
        title: 'Session drops and performance complaints',
        body: 'Reviewers cite dropped sessions and mid-test timeouts on the broader BrowserStack platform.',
      },
      {
        title: 'No Shared Steps version pinning',
        body: 'BrowserStack TM does not pin Shared Step versions per test case, so step edits propagate everywhere.',
      },
    ],
    whySwitch: [
      {
        title: 'Dedicated TCM with public pricing',
        body: '$99/mo Professional for up to 20 testers. No bundle, no sales call required.',
      },
      {
        title: 'AI focused on test case quality',
        body: 'Generate from text, Jira issues, or exploratory sessions. Narrower scope, fewer noisy outputs.',
      },
      {
        title: 'Shared Steps version pinning + run snapshots',
        body: 'Pin Shared Step versions per test case. See diffs. Bulk update. Freeze snapshots for in-flight runs.',
      },
      {
        title: 'Month-to-month flexibility',
        body: 'Resize seats any month on every plan. No annual lock-in.',
      },
      {
        title: 'Hybrid-friendly with browser clouds',
        body: 'If you still need BrowserStack Automate for browser execution, plug it in via CI/CD integration. Testably becomes the TCM source of truth.',
      },
    ],
    metaTitle: 'Best BrowserStack Test Management Alternative in 2026 — Testably',
    metaDescription:
      'A dedicated test management alternative to BrowserStack TM: transparent flat-rate pricing, Shared Steps versioning, AI, and Jira sync — no 15-product bundle required.',
    faqs: [
      {
        question: 'Can I use Testably alongside BrowserStack Automate?',
        answer:
          'Yes. Many teams keep BrowserStack for browser execution and use Testably as the TCM via CI/CD integration. Testably ingests automation results from Automate runs.',
      },
      {
        question: 'How long does a BrowserStack TM migration take?',
        answer:
          'Under one working day for most teams. CSV export, field mapping, import, sample-run verification.',
      },
      {
        question: 'Does Testably have a free tier comparable to BrowserStack TM?',
        answer:
          'Both have free tiers. BrowserStack TM Free is more generous on TC count (unlimited). Testably Free is positioned as evaluation (100 TCs); the $19 Hobby plan removes the TC cap and adds RTM, Jira sync, AI, and Shared Steps versioning.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from BrowserStack Test Management to Testably in under a day',
    steps: [
      {
        num: 1,
        title: 'Export from BrowserStack TM',
        body: 'Use the BrowserStack TM CSV export (or REST API) to dump test cases, runs, and Jira-linked issue keys.',
      },
      {
        num: 2,
        title: 'Decide what to keep',
        body: 'Move only active regression suites. Archive deprecated cases inside BrowserStack before exporting.',
      },
      {
        num: 3,
        title: 'Map fields',
        body: 'Use the field mapping table below. The BrowserStack TM Test Case ID is preserved as an external reference for traceability.',
      },
      {
        num: 4,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload, and confirm the mapping.',
      },
      {
        num: 5,
        title: 'Reconnect Jira and CI/CD',
        body: 'Add the Jira Cloud integration (all plans). On Professional, configure CI/CD to ingest automation results from your existing BrowserStack Automate runs.',
      },
      {
        num: 6,
        title: 'Verify and switch traffic',
        body: 'Run one regression cycle in Testably and confirm coverage, results, and Jira links agree before retiring the BrowserStack TM tenant.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'BrowserStack Test Case ID', to: 'Test Case ID', note: 'Stored as external reference.' },
      { from: 'Title', to: 'Title' },
      { from: 'Steps (Action / Expected)', to: 'Steps' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Labels', to: 'Tags' },
      { from: 'Linked Issue (Jira)', to: 'Linked Issues (via Jira integration)' },
      { from: 'Test Run / Cycle', to: 'Test Run' },
      { from: 'Automation result (CI)', to: 'Automation result (CI/CD)', note: 'On Professional plan.' },
    ],
  },
};

export default browserstackTmData;
