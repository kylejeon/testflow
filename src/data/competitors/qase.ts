import { CompetitorData } from './types';

export const qaseData: CompetitorData = {
  slug: 'qase',
  name: 'Qase',
  tagline: 'Smarter Versioning, Lower Cost, Same Modern UX',
  description:
    'Qase is a clean modern TCM, but it charges per user and locks AI behind add-ons. Testably matches the modern UX, adds true Shared Step version control, and uses flat-rate pricing — starting at $19/month.',
  savingsCallout:
    'A 10-person QA team pays $99/month flat on Testably Professional vs $250+/month on Qase Business. Add Qase AI on top, and the gap widens further.',
  metaTitle: 'Testably vs Qase (2026) | Flat-Rate Alternative with Shared Steps Versioning',
  metaDescription:
    'Compare Testably and Qase side by side. Free tier, $19 Hobby plan, AI test generation built in, Shared Steps with version pinning, and Jira integration on all plans.',
  metaKeywords: [
    'qase alternative',
    'testably vs qase',
    'qase pricing',
    'free test management',
    'qase competitor',
    'test case management tool',
  ],
  features: [
    { feature: 'Free tier', testably: '1 project · 100 TCs', competitor: '1 project · 3 members · 500 TCs' },
    { feature: '14-day Starter trial (no card)', testably: true, competitor: 'Trial only' },
    { feature: 'Test case management', testably: true, competitor: true },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: 'Always-latest' },
    { feature: 'Side-by-side step diff & bulk update', testably: true, competitor: false },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'AI test case generation', testably: 'Built-in, all paid plans', competitor: 'Paid add-on' },
    { feature: 'Requirements Traceability (RTM)', testably: 'Hobby+ unlimited', competitor: 'Business+ only' },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: 'Paid plans only' },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: 'Business+ only' },
    { feature: 'Slack & Teams notifications', testably: 'Hobby+', competitor: 'Business+ only' },
    { feature: 'Flat-rate team pricing', testably: true, competitor: false },
    { feature: 'Exploratory testing', testably: true, competitor: true },
  ],
  keyDifferences: [
    {
      title: 'Shared Steps with True Version Control',
      body: 'Testably is the only TCM where each test case pins the Shared Step version it was linked at. When a newer version exists, you see an upward arrow alert and can preview a side-by-side diff before updating — or bulk-update all dependent test cases at once. Qase uses an always-latest model with no version pinning, so any change instantly affects every test case.',
    },
    {
      title: 'Pricing Model',
      body: 'Qase charges per user per month — costs scale linearly as your team grows. Testably uses flat-rate team plans: $19 Hobby (5 members), $49 Starter (5 members), or $99 Professional (20 members). A 20-person team pays $99/month on Testably vs $460+/month on Qase Startup, before any AI add-ons.',
    },
    {
      title: 'AI Built In, Not Bolted On',
      body: 'Testably includes AI test case generation as a core feature on all paid plans — generate from text descriptions, Jira issues, or exploratory sessions. Qase offers AI generation only as a paid add-on, increasing your total cost beyond the base subscription.',
    },
    {
      title: 'Run Integrity',
      body: 'When a Shared Step is updated mid-execution, Testably preserves the original step snapshot for any test case already executed (passed/failed/blocked), while allowing untested cases in the same run to update to the latest version. Qase has no equivalent safeguard — your test results can become disconnected from the steps that produced them.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: '$0/mo', detail: '1 project · 3 members · 500 TCs' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '~$125/mo', detail: '$25/user × 5 (Startup)' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '~$250/mo', detail: '$25/user × 10 (Startup)' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '~$500/mo', detail: '$25/user × 20 (Startup)' },
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
      question: 'Qase Free has 500 test cases — why is Testably Free only 100?',
      answer:
        "Honest answer: Qase's Free tier is more generous on TC count. Testably's Free is positioned as an evaluation tier — enough to build a real regression suite for one feature and experience every core capability. If you need more, the $19 Hobby plan gives you 3 projects, 5 members, RTM, and Shared Steps — still less than half of Qase Startup. We compete on Shared Step versioning, AI built in, and flat-rate team pricing, not on free-tier TC count.",
    },
    {
      question: 'Can I import my test cases from Qase?',
      answer:
        'Yes. Export your test cases from Qase as CSV and import them directly into Testably. The migration typically takes under 10 minutes for most teams.',
    },
    {
      question: 'Does Testably have AI features like Qase?',
      answer:
        'Yes — and Testably includes AI test case generation on all paid plans at no extra cost. In Qase, AI generation is a paid add-on. With Testably, you get AI generation from text descriptions, Jira issues, and exploratory sessions as part of your base plan.',
    },
    {
      question: 'How does Testably handle Shared Steps versioning?',
      answer:
        'Each test case pins the Shared Step version it was linked at. When a newer version is published, you see an upward arrow alert, can preview a side-by-side diff, and choose to update individually or bulk-update all dependent test cases. During test runs, executed test cases keep their original step snapshot for audit integrity, while untested cases can pull the latest version. Qase does not offer this level of version control.',
    },
    {
      question: 'Why is Testably cheaper for larger teams?',
      answer:
        "Testably uses flat-rate team pricing. Once you're on Professional ($99/mo), you can add up to 20 team members at no extra cost. Qase charges per seat, so your bill grows linearly with team size.",
    },
    {
      question: 'What if I need Jira integration?',
      answer:
        'Testably offers native two-way Jira Cloud sync on all plans, including Free — link test cases to Jira issues, auto-create bugs from test failures, and sync statuses both directions. Qase locks Jira integration behind paid plans.',
    },
  ],
  ctaText: 'Start Free — No Credit Card Required',
  ctaSubtext: 'Free forever plan · AI included on paid plans · 14-day Starter trial available',

  // ─── M1 신규 옵셔널 필드 ───
  // Sources (as of 2026-05): https://qase.io/pricing, G2 / Capterra reviews.
  // See docs/research/competitor-qase.md for full citations.

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['testrail', 'testiny', 'zephyr'],

  alternativePageData: {
    h1: 'The Qase Alternative with Shared Steps Versioning and AI Without the Add-On',
    subhead:
      'Qase nails the modern TCM look but charges per user, ships AI as a paid add-on, and uses always-latest Shared Steps. Testably matches the UX and fixes all three.',
    introBody:
      'Qase has rightly earned a strong reputation for modern UX in test management — clean information architecture, fast keyboard navigation, polished test case editing. Two limits show up as teams grow. First, the pricing model is per-user, starting at roughly $25 per seat on the Startup plan. A 20-person QA team pays around $500 per month on Qase Startup before adding AI. Second, Qase AI is sold as a paid add-on, not bundled with the base subscription. Third, Qase Shared Steps use an always-latest model: editing a shared step propagates to every test case instantly, with no version pinning, diff, or bulk update preview. For teams running mature regression suites, that lack of version control is the highest-risk gap. Testably keeps Qase\'s modern UX bet and addresses the three structural limits. Pricing is flat-rate ($19 / $49 / $99 / Enterprise). AI test case generation is included on every paid plan starting at $19 per month. Shared Steps version pinning, side-by-side diffs, bulk updates, and run-level snapshots are part of the base offering — the same is true for unlimited Requirements Traceability and Jira two-way sync. Migration is a CSV export and a field map; most teams complete it in under an hour.',
    whyLeave: [
      {
        title: 'Per-user pricing scales linearly',
        body: 'At 10 testers, ~$250/mo on Startup. At 20, ~$500/mo — before adding the AI add-on or upgrading to Business.',
      },
      {
        title: 'AI is a paid add-on, not bundled',
        body: 'Qase AI ships as a separate paid add-on. Total cost includes both the base subscription and the AI line item.',
      },
      {
        title: 'Always-latest Shared Steps',
        body: 'Editing a shared step changes every test case instantly. No version pinning, no diff preview, no bulk update flow.',
      },
      {
        title: 'No run-level step snapshots',
        body: 'If a Shared Step is edited mid-run, executed cases become disconnected from the steps that produced their results.',
      },
      {
        title: 'Key integrations gated by plan',
        body: 'Slack notifications, CI/CD integration, and RTM are gated to Business and above.',
      },
    ],
    whySwitch: [
      {
        title: 'Flat-rate team pricing',
        body: '$99/mo Professional supports up to 20 testers. ~5× cheaper than Qase Startup at the same headcount.',
      },
      {
        title: 'AI on every paid plan — no add-on',
        body: 'Generate test cases from text, Jira issues, or exploratory sessions. Included starting at $19/mo Hobby.',
      },
      {
        title: 'Shared Steps with version pinning',
        body: 'Pin Shared Step versions per test case. See side-by-side diffs. Bulk update when newer versions are published.',
      },
      {
        title: 'Run-level step snapshots',
        body: 'Executed cases freeze their step snapshot. Un-executed cases pull the latest. Run integrity preserved.',
      },
      {
        title: 'Jira sync and RTM on all plans (and Hobby)',
        body: 'Native Jira two-way sync ships on Free. Unlimited RTM on Hobby and above.',
      },
    ],
    metaTitle: 'Best Qase Alternative in 2026 — Testably',
    metaDescription:
      'A Qase alternative with Shared Steps versioning, AI included on paid plans, and flat-rate team pricing. Free forever plan, $19/mo Hobby, $99/mo for up to 20 testers.',
    faqs: [
      {
        question: 'I like Qase\'s UX. Will Testably feel like a regression?',
        answer:
          'No. Testably optimizes for the same modern UX bet — fast keyboard navigation, clean test case editing, minimal chrome. The difference is the structural features below: flat-rate pricing, AI bundled with every paid plan, and Shared Steps version pinning.',
      },
      {
        question: 'How do I migrate from Qase?',
        answer:
          'Export your Qase test cases as CSV (Qase Startup and above support CSV export), map fields, import into Testably, and verify on a sample regression run. Most teams complete migration in under an hour.',
      },
      {
        question: 'Do I really get AI without an add-on?',
        answer:
          'Yes. AI test case generation is included on every Testably paid plan starting at $19/mo Hobby. There is no separate AI line item.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from Qase to Testably in under an hour',
    steps: [
      {
        num: 1,
        title: 'Export Qase test cases',
        body: 'In Qase (Startup plan and above), export test cases as CSV. Include custom fields, tags, and Jira issue links.',
      },
      {
        num: 2,
        title: 'Map Qase fields to Testably fields',
        body: 'Use the field mapping table below. Qase Suites become Testably Test Suites; Qase Runs become Test Runs.',
      },
      {
        num: 3,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload, and confirm the mapping.',
      },
      {
        num: 4,
        title: 'Reconnect Jira',
        body: 'Add the Jira Cloud integration in Testably (all plans, including Free). Original Jira keys re-link automatically.',
      },
      {
        num: 5,
        title: 'Drop the AI add-on',
        body: 'Once your team is on Testably, you no longer need the Qase AI add-on subscription. Cancel on the renewal date.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Case ID', to: 'Test Case ID', note: 'Original Qase ID preserved as external reference.' },
      { from: 'Title', to: 'Title' },
      { from: 'Steps (Action / Expected)', to: 'Steps' },
      { from: 'Suite', to: 'Test Suite (folder)' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Severity', to: 'Severity (Tag)' },
      { from: 'Tags', to: 'Tags' },
      { from: 'Jira / Linear / GitHub issue', to: 'Linked Issues (via integration)' },
      { from: 'Run', to: 'Test Run' },
    ],
  },
};

export default qaseData;
