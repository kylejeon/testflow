import { CompetitorData } from './types';

export const zephyrData: CompetitorData = {
  slug: 'zephyr',
  name: 'Zephyr Scale',
  tagline: 'Standalone QA Platform vs Jira-Locked Plugin',
  description:
    'Zephyr Scale is a Jira add-on billed against your total Jira user count, not just testers. Testably is a standalone platform with native Jira integration, flat-rate pricing, and AI built in.',
  savingsCallout:
    'A company with 100 Jira users but only 5 QA engineers still pays for all 100 seats on Zephyr Scale. With Testably, $49/month covers your entire 5-person QA team — regardless of Jira headcount.',
  metaTitle: 'Testably vs Zephyr Scale (2026) | Independent Test Management Alternative',
  metaDescription:
    'Compare Testably and Zephyr Scale. Standalone test management with native Jira integration, $19 Hobby plan, AI test generation, and Shared Steps versioning. Stop paying for every Jira user.',
  metaKeywords: [
    'zephyr scale alternative',
    'testably vs zephyr',
    'zephyr pricing',
    'test management jira',
    'zephyr scale competitor',
    'free jira test management',
  ],
  features: [
    { feature: 'Free tier', testably: 'Forever (no Jira required)', competitor: 'Free for ≤10 Jira users only' },
    { feature: 'Standalone platform', testably: true, competitor: false },
    { feature: 'Works without Jira', testably: true, competitor: false },
    { feature: 'Charges per QA user only', testably: true, competitor: false },
    { feature: 'Flat-rate pricing', testably: true, competitor: false },
    { feature: 'Jira integration', testably: 'Native, optional', competitor: 'Required (add-on)' },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: 'Limited' },
    { feature: 'Run-level step snapshots', testably: true, competitor: 'Always-latest' },
    { feature: 'AI test case generation', testably: true, competitor: false },
    { feature: 'CI/CD integration', testably: 'Professional+', competitor: 'Limited' },
    { feature: 'Exploratory testing', testably: true, competitor: false },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: 'Jira setup required' },
  ],
  keyDifferences: [
    {
      title: 'Jira Dependency',
      body: 'Zephyr Scale is a Jira Marketplace add-on, meaning it only runs inside Jira. If you switch away from Jira or have team members without Jira licenses, they cannot access your test management. Testably is a standalone platform that integrates with Jira via two-way sync but does not depend on it.',
    },
    {
      title: 'The Per-Jira-User Pricing Trap',
      body: 'Zephyr Scale bills based on your total Jira user count, not just testers. If your Jira instance has 100 users but only 10 are testers, you pay for all 100. Testably uses flat-rate plans starting at $19/month — your bill is decoupled from Jira headcount entirely.',
    },
    {
      title: 'Independence & Flexibility',
      body: 'With Testably, your QA data lives in a dedicated platform. You can integrate with Jira today and migrate freely tomorrow — without losing test history. Zephyr locks your data into the Atlassian ecosystem.',
    },
    {
      title: 'AI & Modern Workflows',
      body: 'Testably ships with AI test case generation built in — generate from text descriptions, Jira issues, or exploratory sessions. Testably also offers true Shared Step version control with side-by-side diffs and bulk update flows. Zephyr Scale offers neither.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs' },
      competitor: { price: '$0/mo', detail: 'Only if Jira has ≤10 users' },
    },
    {
      plan: 'Hobby',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: 'N/A', detail: 'No equivalent plan' },
    },
    {
      plan: 'Small team (5)',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: 'Per Jira user', detail: 'Billed on all Jira users' },
    },
    {
      plan: 'Mid team (10)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: 'Per Jira user', detail: 'Grows with Jira headcount' },
    },
    {
      plan: 'Large team (20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: 'Scales with org', detail: 'Not capped to QA team' },
    },
    {
      plan: 'Enterprise (21–50)',
      testably: { price: '$249/mo', detail: 'Enterprise S' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
    {
      plan: 'Enterprise (51–100)',
      testably: { price: '$499/mo', detail: 'Enterprise M' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
    {
      plan: 'Enterprise (100+)',
      testably: { price: 'Custom', detail: 'Enterprise L' },
      competitor: { price: 'Custom', detail: 'Atlassian Enterprise pricing' },
    },
  ],
  faqs: [
    {
      question: 'Can I use Testably with Jira?',
      answer:
        'Yes. Testably integrates natively with Jira Cloud — two-way sync, issue linking, auto-create bugs from test failures, and status synchronization. Available on all plans including Free. You get all the Jira benefits without being locked into the Atlassian ecosystem.',
    },
    {
      question: 'What if we stop using Jira?',
      answer:
        'With Testably, your test management continues uninterrupted. With Zephyr Scale, losing Jira means losing access to all your QA data — it lives inside the Jira instance.',
    },
    {
      question: "Does Zephyr Scale really have a free tier?",
      answer:
        'Only if your entire Jira instance has 10 or fewer users. Once your company crosses 10 Jira seats — for any reason, not just testers — you must pay for Zephyr Scale on every seat. Testably stays free regardless of company size, with a 1-project / 2-member limit on the Free plan.',
    },
    {
      question: 'Can I import data from Zephyr Scale?',
      answer:
        'Yes. Export your test cases from Zephyr as CSV and import them into Testably. The migration process typically takes under 10 minutes.',
    },
    {
      question: 'Why pay separately for test management?',
      answer:
        "A standalone platform decouples your QA data from your issue tracker. You get independence, flat-rate pricing, AI features Zephyr doesn't have, and the freedom to integrate with any development workflow — Jira, GitHub, GitLab, or CI/CD pipelines.",
    },
  ],
  ctaText: 'Start Free — No Jira Required',
  ctaSubtext: 'Free forever · Standalone platform · 14-day Starter trial available',

  // ─── M1 신규 옵셔널 필드 ───
  // Sources (as of 2026-05): https://smartbear.com/test-management/zephyr-scale/, Atlassian Marketplace, G2 reviews.
  // See docs/research/competitor-zephyr.md for full citations.

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['testrail', 'xray', 'qase'],

  alternativePageData: {
    h1: 'The Zephyr Scale Alternative That Doesn\'t Charge for Every Jira User',
    subhead:
      'Zephyr Scale bills against your total Jira Cloud user count — including developers, designers, PMs, and finance — not just testers. Testably is a standalone platform with optional two-way Jira sync, flat-rate pricing, and AI built in.',
    introBody:
      'Zephyr Scale is one of the most established test management tools on Jira, with a deep feature set and tight Atlassian integration. The pricing model is the problem: as an Atlassian Marketplace app, Zephyr Scale is billed on the underlying Jira Cloud user tier. If your company has 100 Jira users but only 10 testers, you still pay the 100-user Zephyr Scale tier. The free tier exists only for Jira instances with 10 or fewer users — so the moment your organization crosses that threshold, even for non-QA reasons, Zephyr Scale becomes a paid line item indexed to total Jira headcount. Testably approaches this differently: a standalone test management platform with a permanent free tier for one project and two members, a $19 Hobby plan for small teams, and flat-rate Starter, Professional, and Enterprise plans. Jira integration is optional and two-way — link issues, auto-create bugs, sync statuses — without locking your QA history inside Atlassian. Migration is a CSV export, a field map, and a sample run; most teams complete it in under an hour and keep Jira issue traceability intact through the native integration.',
    whyLeave: [
      {
        title: 'Per-Jira-user billing — not per-tester',
        body: 'Zephyr Scale bills on your total Jira Cloud user tier. Developers, PMs, designers, and finance users all count, even though they never touch the test management tool.',
      },
      {
        title: 'Free tier vanishes at 11+ Jira users',
        body: 'The free tier requires fewer than 10 Jira users total — for any role. Cross that threshold and you pay on every seat.',
      },
      {
        title: 'Atlassian lock-in',
        body: 'Your QA data lives inside the Jira instance. Leaving Jira means losing test history without a migration project.',
      },
      {
        title: 'Limited Shared Steps versioning',
        body: 'Zephyr Scale\'s shared step model does not pin versions per test case, so step edits propagate without diff or bulk update flow.',
      },
      {
        title: 'No native AI test generation',
        body: 'Zephyr Scale does not ship AI test case generation, deduplication, or summarization features.',
      },
    ],
    whySwitch: [
      {
        title: 'Standalone platform — Jira is optional',
        body: 'Testably keeps test cases in a dedicated data model. Integrate with Jira on day one and migrate freely later.',
      },
      {
        title: 'Pay for testers only',
        body: 'Flat-rate plans tied to QA team size, not Jira headcount. $99/mo Professional supports up to 20 testers regardless of company size.',
      },
      {
        title: 'Real free tier — not gated by Jira headcount',
        body: '1 project, 2 members, 100 TCs, 10 runs/month, 3 AI generations/month. Permanent, independent of Jira.',
      },
      {
        title: 'AI test case generation on every paid plan',
        body: 'Generate from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan.',
      },
      {
        title: 'Shared Steps version pinning + run snapshots',
        body: 'Pin Shared Step versions per test case. Side-by-side diffs. Bulk updates. Frozen snapshots for in-flight runs.',
      },
    ],
    metaTitle: 'Best Zephyr Scale Alternative in 2026 — Testably',
    metaDescription:
      'Stop paying for every Jira user. Testably is a standalone test management alternative to Zephyr Scale — free forever, $99/mo for up to 20 testers, AI included.',
    faqs: [
      {
        question: 'Can I keep using Jira after leaving Zephyr Scale?',
        answer:
          'Yes. Testably integrates with Jira Cloud via native two-way sync — link test cases to Jira issues, auto-create bugs from test failures, and sync statuses. Developers keep working in Jira; QA gets a dedicated tool.',
      },
      {
        question: 'How do I migrate from Zephyr Scale?',
        answer:
          'Export Zephyr Scale test cases as CSV from the Jira UI (or use the Zephyr Scale API), map fields, import into Testably, and verify on a sample regression run. Most teams complete migration in under an hour.',
      },
      {
        question: 'Will my Jira issue links still work?',
        answer:
          'Yes. Add the Jira Cloud integration in Testably after import. Original Jira keys re-link automatically and continue to round-trip through the integration.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from Zephyr Scale to Testably in under an hour',
    steps: [
      {
        num: 1,
        title: 'Export Zephyr Scale test cases',
        body: 'In Jira, use the Zephyr Scale CSV export at the project level (or the Zephyr Scale REST API). Include custom fields, linked Jira issue keys, and execution history.',
      },
      {
        num: 2,
        title: 'Map Zephyr fields to Testably fields',
        body: 'Use the field mapping table below. Zephyr "Folders" become Testably Test Suites; "Cycles" become Test Runs.',
      },
      {
        num: 3,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload, and confirm the mapping.',
      },
      {
        num: 4,
        title: 'Reconnect Jira',
        body: 'Add the Jira Cloud integration in Testably (all plans, including Free). Existing Jira keys re-link automatically.',
      },
      {
        num: 5,
        title: 'Verify and decommission Zephyr',
        body: 'Run one regression cycle in Testably, confirm coverage and Jira links agree, then unsubscribe from Zephyr Scale on your Atlassian renewal date.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'Excel (.xlsx)', 'Testably API'],
    fieldMapping: [
      { from: 'Test Case Key', to: 'Test Case ID', note: 'Original Zephyr key preserved as external reference.' },
      { from: 'Name', to: 'Title' },
      { from: 'Steps (Action / Test Data / Expected Result)', to: 'Steps' },
      { from: 'Folder', to: 'Test Suite (folder)' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Labels', to: 'Tags' },
      { from: 'Linked Jira Issues', to: 'Linked Issues (via Jira integration)' },
      { from: 'Cycle / Plan', to: 'Test Run' },
    ],
  },
};

export default zephyrData;
