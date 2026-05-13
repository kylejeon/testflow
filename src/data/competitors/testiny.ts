// Sources (as of 2026-05):
// - https://www.testiny.io/pricing/
// - https://www.testiny.io/docs/pricing-and-payment/
// - https://www.g2.com/products/testiny/reviews
// - https://www.capterra.com/p/10004572/Testiny/
// - https://thectoclub.com/tools/testiny-review/
// See docs/research/competitor-testiny.md for full citations.

import { CompetitorData } from './types';

export const testinyData: CompetitorData = {
  slug: 'testiny',
  name: 'Testiny',
  tagline: 'Same Clean UX. Add AI. Subtract Per-User Pricing.',
  description:
    'Testiny is a clean modern TCM with a generous 3-user free tier, but it lacks AI, Shared Steps version pinning, and charges per user from $18.50 onward. Testably matches the UX, adds AI and version control, and uses flat-rate team pricing (as of 2026-05).',
  savingsCallout:
    'At 10 people, Testiny Business is ~$205/mo ($20.50/user × 10). Testably Professional is $99/mo flat for up to 20 testers — with AI and Shared Steps versioning included.',
  metaTitle: 'Testably vs Testiny (2026) | Flat-Rate Alternative with AI and Shared Steps Versioning',
  metaDescription:
    'Compare Testably and Testiny. AI test generation, Shared Steps versioning, run-level snapshots, and flat-rate pricing — for growing QA teams that outgrow per-user plans.',
  metaKeywords: [
    'testiny alternative',
    'testably vs testiny',
    'testiny pricing',
    'affordable test management tool',
    'simple test case management free',
    'testiny competitor',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: '1 project · 2 members · 100 TCs', competitor: 'Up to 3 members · 5 GB' },
    { feature: '14-day Starter trial (no card)', testably: true, competitor: 'Free tier serves this role' },
    { feature: 'AI test case generation', testably: 'All paid plans', competitor: false },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: false },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Requirements Traceability (RTM)', testably: 'Hobby+ unlimited', competitor: 'Custom fields workaround' },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: 'Starter+' },
    { feature: 'GitHub / GitLab / Azure DevOps', testably: 'GitHub on roadmap; Jira today', competitor: true },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: 'Business+ (automation results)' },
    { feature: 'Milestones', testably: true, competitor: 'Business+' },
    { feature: 'SSO (SAML / OAuth)', testably: 'Enterprise', competitor: 'Business+' },
    { feature: 'MCP Server (LLM context)', testably: 'Roadmap', competitor: 'Starter+' },
    { feature: 'Flat-rate team pricing', testably: true, competitor: false },
    { feature: 'On-premise option', testably: 'Enterprise', competitor: 'Enterprise (Testiny Server)' },
  ],
  keyDifferences: [
    {
      title: 'AI Test Case Generation — Built In',
      body: 'Testiny does not ship AI test generation, deduplication, or summarization features. Testably includes AI test case generation on every paid plan starting at $19/mo — generate from text descriptions, Jira issues, or exploratory sessions.',
    },
    {
      title: 'Shared Steps with True Version Control',
      body: 'Testiny does not pin Shared Step versions per test case. Testably is the only TCM where each test case locks the Shared Step version it was linked at, with side-by-side diffs and a bulk update flow when newer versions are published.',
    },
    {
      title: 'Flat-Rate Beats Per-User at Scale',
      body: 'Testiny Starter is $18.50/user/month and Business is $20.50/user/month. A 10-person team pays ~$185–$205/mo on Testiny. The same team is $99/mo flat on Testably Professional — and you can grow to 20 members without the bill moving.',
    },
    {
      title: 'Run-Level Step Snapshots Protect In-Flight Data',
      body: 'When a Shared Step changes mid-run, Testably freezes the snapshot for already-executed cases while letting un-executed cases pull the latest version. Testiny has no equivalent safeguard, so step edits during a regression cycle can disconnect results from the steps that produced them.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: '$0', detail: 'Up to 3 members · 5 GB storage' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '~$92.50/mo', detail: 'Starter · $18.50 × 5 (annual)' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '~$185–205/mo', detail: 'Starter/Business · $18.50–20.50 × 10' },
    },
    {
      plan: 'Larger team (20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '~$370–410/mo', detail: 'Starter/Business · $18.50–20.50 × 20' },
    },
    {
      plan: 'Enterprise (5+)',
      testably: { price: '$249–$499/mo', detail: 'Enterprise S / M (flat)' },
      competitor: { price: '$150+/mo', detail: '$30/user × 5 (annual minimum)' },
    },
  ],
  faqs: [
    {
      question: 'Can I import test cases from Testiny?',
      answer:
        'Yes. Testiny supports CSV / Excel export and a REST API. Export your test cases and import them into Testably via the standard CSV import flow. Most teams complete migration in under an hour.',
    },
    {
      question: 'Does Testably feel as clean as Testiny?',
      answer:
        'Yes. Both products optimize for a fast, modern UI — quick keyboard navigation, clean test case editing, minimal chrome. The difference is that Testably layers AI, Shared Steps version pinning, and flat-rate pricing on top of that experience.',
    },
    {
      question: 'How does AI test generation work in Testably?',
      answer:
        'Testably ships AI test case generation on every paid plan starting at $19/mo. Generate from a text description, a Jira issue, an exploratory session, or a feature brief. AI proposes cases; humans accept, edit, or reject.',
    },
    {
      question: 'What about MCP Server / LLM context?',
      answer:
        'Testiny ships an MCP Server on the Starter plan. Testably MCP integration is on the roadmap. If MCP is mandatory for your workflow today, contact sales for the latest timing.',
    },
    {
      question: 'Why is Testably cheaper at 10+ testers?',
      answer:
        'Testably uses flat-rate team pricing. Professional ($99/mo) supports up to 20 testers. Testiny charges per user ($18.50–$20.50), so the bill scales linearly. At 10 people the gap is roughly 2×; at 20 people, ~4×.',
    },
  ],
  ctaText: 'Try Testably Free',
  ctaSubtext: 'Modern UX + AI + flat-rate pricing · No credit card required',

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['qase', 'testrail', 'testpad'],

  alternativePageData: {
    h1: 'The Testiny Alternative with AI, Shared Steps Versioning, and Flat-Rate Pricing',
    subhead:
      'Testiny nailed the clean modern UX. The next pain points show up at 10+ testers: per-user pricing scales linearly, AI is missing, and Shared Steps edits propagate everywhere. Testably keeps the UX and fixes the scaling problems.',
    introBody:
      'Testiny is one of the most polished newer entrants in test management — fast, minimal, modern. For teams under five testers, the free tier and Starter plan deliver a clean experience and the integrations that matter (Jira, GitHub, GitLab, Azure DevOps). Two limits surface as teams grow. The first is the pricing model: $18.50 per user on Starter and $20.50 per user on Business turn a 10-person QA team into a $185–$205 monthly bill, and a 20-person team into roughly $370–$410. The second is feature scope: AI test generation, Shared Steps version pinning, and run-level step snapshots are not part of Testiny\'s offering. For teams running regression suites where step changes can silently invalidate prior results, the missing version control becomes a real risk. Testably keeps Testiny\'s clean UX bet and adds the missing pieces. Pricing is flat-rate ($19 / $49 / $99 / Enterprise). AI ships on every paid plan. Shared Steps version pinning, side-by-side diffs, bulk updates, and run-level snapshots are part of the base offering. Migration is a CSV export and a field map — most teams finish in under an hour.',
    whyLeave: [
      {
        title: 'Per-user pricing scales linearly',
        body: 'At 10 testers, ~$185–$205/mo. At 20 testers, ~$370–$410/mo. There is no flat-rate plan.',
      },
      {
        title: 'No AI test generation',
        body: 'Testiny does not ship AI test case generation, deduplication, or summarization features.',
      },
      {
        title: 'No Shared Steps version pinning',
        body: 'Editing a shared step propagates to every test case that references it — instantly, with no version pinning, diff, or bulk update preview.',
      },
      {
        title: 'API rate limits hit at scale',
        body: 'Reviewers note API rate limit messages once test case counts exceed roughly 6,900.',
      },
      {
        title: 'Limited reporting depth',
        body: 'Capterra reviewers ask for more advanced reporting features and integrations.',
      },
    ],
    whySwitch: [
      {
        title: 'Flat-rate team pricing — $99/mo for up to 20',
        body: 'Testably Professional supports up to 20 testers for $99/mo flat. Hiring more QA does not change the bill.',
      },
      {
        title: 'AI on every paid plan from $19/mo',
        body: 'Generate test cases from text, Jira issues, or exploratory sessions starting on Hobby.',
      },
      {
        title: 'Shared Steps with version pinning',
        body: 'Pin Shared Step versions per test case. See side-by-side diffs when newer versions exist. Bulk update with one click.',
      },
      {
        title: 'Run-level step snapshots',
        body: 'In-flight regression cycles never get desynchronized by mid-run step edits.',
      },
      {
        title: 'Native Jira two-way sync on all plans',
        body: 'Link, sync, and auto-create bugs — available on the Free plan too.',
      },
    ],
    metaTitle: 'Best Testiny Alternative in 2026 — Testably',
    metaDescription:
      'Need a Testiny alternative for a growing QA team? Testably has flat-rate pricing ($99/mo for 20 testers), AI on paid plans, and Shared Steps version pinning.',
    faqs: [
      {
        question: 'How does Testably feel compared to Testiny?',
        answer:
          'Similar clean modern feel. Testably adds AI, Shared Steps version control, and flat-rate pricing on top of the experience.',
      },
      {
        question: 'How long does a Testiny migration take?',
        answer:
          'Most teams complete migration in under an hour: export CSV from Testiny, map fields, import into Testably, verify on a sample run.',
      },
      {
        question: 'Do you support GitHub / GitLab / Azure DevOps like Testiny?',
        answer:
          'Jira Cloud is fully supported today on all plans. GitHub, GitLab, and Azure DevOps integrations are on the roadmap. CI/CD ingestion via JUnit-XML on Professional works with any framework today.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from Testiny to Testably in under an hour',
    steps: [
      {
        num: 1,
        title: 'Export Testiny test cases',
        body: 'In Testiny, export test cases as CSV or Excel (Starter and above). Include custom fields and Jira links.',
      },
      {
        num: 2,
        title: 'Map fields to Testably',
        body: 'Use the field mapping table below. Most teams only customize 2–3 fields beyond the defaults.',
      },
      {
        num: 3,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload, and confirm the mapping.',
      },
      {
        num: 4,
        title: 'Reconnect Jira',
        body: 'Add the Jira Cloud integration (all plans). Re-link issues using the original Jira keys preserved from Testiny.',
      },
      {
        num: 5,
        title: 'Run one regression cycle and switch',
        body: 'Run one full regression suite in Testably to confirm parity. Switch the team over once results agree.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Test Case ID', to: 'Test Case ID', note: 'Original ID preserved as external reference.' },
      { from: 'Title', to: 'Title' },
      { from: 'Steps (Action / Expected)', to: 'Steps' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Custom fields', to: 'Custom fields (Enterprise) or Tags' },
      { from: 'Labels', to: 'Tags' },
      { from: 'Linked Jira issue', to: 'Linked Issues (via Jira integration)' },
      { from: 'Milestone', to: 'Milestone / Test Run' },
    ],
  },
};

export default testinyData;
