// Sources (as of 2026-05):
// - https://kiwitcms.org/
// - https://github.com/kiwitcms/Kiwi
// - https://kiwitcms.org/blog/kiwi-tcms-team/2026/02/18/community-edition-explained/
// - https://www.softwaresuggest.com/kiwi-tcms
// See docs/research/competitor-kiwi-tcms.md for full citations.

import type { CompetitorData } from './types';

export const kiwiTcmsData: CompetitorData = {
  slug: 'kiwi-tcms',
  name: 'Kiwi TCMS',
  tagline: 'SaaS Convenience vs Docker Self-Hosting',
  description:
    'Kiwi TCMS is open source (GPL-2.0) and powerful for teams that can run their own Docker stack. Once you want a managed SaaS with real support, the price jumps to $600–$2,000/month. Testably gives you modern SaaS, AI, and SLA support for a fraction of that (as of 2026-05).',
  savingsCallout:
    'Kiwi TCMS Managed Hosting: $2,000/mo ($24,000/yr). Testably Professional: $99/mo ($1,188/yr) for up to 20 testers — including AI, RTM, and CI/CD.',
  metaTitle: 'Testably vs Kiwi TCMS (2026) | Modern SaaS Alternative to Self-Hosted Open Source',
  metaDescription:
    'Compare Testably and Kiwi TCMS. Skip the Docker setup — get a modern test management SaaS with AI, Jira sync, and SLA support starting free.',
  metaKeywords: [
    'kiwi tcms alternative',
    'testably vs kiwi tcms',
    'open source test management alternative',
    'self hosted test management saas',
    'kiwi tcms pricing',
    'test management tool no setup',
  ],
  features: [
    { feature: 'Free tier (forever)', testably: '1 project · 2 members · 100 TCs', competitor: 'Community Edition (self-hosted)' },
    { feature: 'Hosting model', testably: 'SaaS (managed)', competitor: 'Self-host (Community) or paid managed' },
    { feature: 'Setup time', testably: '< 5 minutes', competitor: 'Docker, DNS, SSL, backups (DevOps required)' },
    { feature: 'Ads in UI', testably: false, competitor: 'EthicalAds in Community Edition' },
    { feature: 'Modern UI / UX', testably: true, competitor: 'Functional, dated' },
    { feature: 'AI test case generation', testably: 'All paid plans', competitor: false },
    { feature: 'Shared Steps with version pinning', testably: true, competitor: false },
    { feature: 'Run-level step snapshots', testably: true, competitor: false },
    { feature: 'Jira two-way sync', testably: 'All plans', competitor: 'Bug tracker links' },
    { feature: 'CI/CD plugins', testably: 'Professional+', competitor: true },
    { feature: 'REST API', testably: 'All plans', competitor: true },
    { feature: 'On-premise option', testably: 'Enterprise', competitor: 'Community / Enterprise' },
    { feature: 'OAuth / LDAP / Kerberos', testably: 'Enterprise', competitor: 'Enterprise edition' },
    { feature: 'Open source', testably: false, competitor: true },
    { feature: '24/7 SLA support', testably: 'Enterprise', competitor: 'Managed Hosting ($2,000/mo)' },
  ],
  keyDifferences: [
    {
      title: 'SaaS in 5 Minutes vs DevOps Project',
      body: 'Kiwi TCMS Community Edition is free, but you have to provision Docker, configure a database, set up SSL, manage upgrades, and maintain backups. For teams without dedicated DevOps capacity, this is the dominant cost — not the license. Testably is a managed SaaS with sign-up to first test case in five minutes.',
    },
    {
      title: 'Managed SaaS Pricing — $99 vs $2,000',
      body: 'If you want a managed Kiwi TCMS with real support, the tiers are Private Tenant ($75/mo, limited support hours), Enterprise on-prem ($600/mo), or Managed Hosting ($2,000/mo). Testably Professional is $99/mo flat for up to 20 testers — modern UX, AI, RTM, CI/CD all included.',
    },
    {
      title: 'AI, Shared Steps Versioning — Not in Kiwi',
      body: 'Kiwi TCMS does not ship AI test generation, deduplication, or step-version control. Testably has AI on every paid plan starting at $19/mo, plus Shared Steps version pinning and run-level snapshots that protect mid-execution data integrity.',
    },
    {
      title: 'Open Source Is Still an Option — On Enterprise',
      body: 'If self-hosting is non-negotiable (regulated industries, air-gapped networks), Testably offers an Enterprise on-premise deployment with the same UX as the SaaS. You do not lose the option; you just get to choose when to pay for it.',
    },
  ],
  pricingRows: [
    {
      plan: 'Free / Community',
      testably: { price: '$0/mo', detail: '1 project · 2 members · 100 TCs (managed)' },
      competitor: { price: '$0', detail: 'Community Edition (self-host, ads, no support)' },
    },
    {
      plan: 'Hobby / Self Support',
      testably: { price: '$19/mo', detail: '3 projects · 5 members · RTM unlimited' },
      competitor: { price: '$25/mo', detail: 'Self-host + tagged release + limited support' },
    },
    {
      plan: 'Small team (5) / Private Tenant',
      testably: { price: '$49/mo', detail: 'Starter · Up to 5 members' },
      competitor: { price: '$75/mo', detail: 'SaaS Private Tenant (Mon–Fri 10–16 UTC)' },
    },
    {
      plan: 'Mid team (10–20)',
      testably: { price: '$99/mo', detail: 'Professional · Up to 20 members' },
      competitor: { price: '$150–600/mo', detail: 'Private Tenant Extras / Enterprise on-prem' },
    },
    {
      plan: 'Managed Hosting / Enterprise SaaS',
      testably: { price: '$249–$499/mo', detail: 'Enterprise S / M (managed)' },
      competitor: { price: '$2,000/mo', detail: 'Managed Hosting (AWS, 7 days/week support)' },
    },
  ],
  faqs: [
    {
      question: 'Is Testably open source like Kiwi TCMS?',
      answer:
        'Testably is a commercial SaaS, not open source. If open source is a hard requirement (license, audit, or air-gapped deployment), Kiwi TCMS Community Edition or Testably\'s Enterprise on-premise option are the two paths to consider.',
    },
    {
      question: 'Why not just self-host Kiwi TCMS?',
      answer:
        'The license is free, but the operational cost is not. You take on Docker setup, database management, SSL, backups, upgrades, and uptime. For teams without DevOps capacity, the engineering hours often exceed the cost of a managed SaaS like Testably Professional ($99/mo).',
    },
    {
      question: 'Can I import test cases from Kiwi TCMS?',
      answer:
        'Yes. Kiwi TCMS supports CSV and JSON export. Import the resulting files into Testably via the standard CSV import flow. Linked bug tracker references are preserved as external links.',
    },
    {
      question: 'Does Testably support Robot Framework, pytest, JUnit?',
      answer:
        'Yes. Testably integrates with major automation frameworks via the CI/CD integration on the Professional plan — Robot Framework, pytest, JUnit, JUnit-XML reports, Playwright, Cypress, and more.',
    },
    {
      question: 'What if I am in a regulated industry that needs on-prem?',
      answer:
        'Testably offers an Enterprise on-premise deployment with the same UX as the SaaS. Contact sales for pricing and deployment details.',
    },
  ],
  ctaText: 'Try Testably Free — No Docker Required',
  ctaSubtext: 'Managed SaaS · 5-minute setup · AI on paid plans · Free forever plan',

  lastReviewed: '2026-05-13',
  relatedCompetitors: ['testrail', 'testpad', 'qase'],

  alternativePageData: {
    h1: "The Kiwi TCMS Alternative That's Ready in 5 Minutes (No Docker Required)",
    subhead:
      'Kiwi TCMS is a respected open source TCM, but self-hosting takes Docker, DNS, SSL, and ongoing DevOps work — and Managed Hosting costs $2,000/month. Testably is modern SaaS for $99/month flat.',
    introBody:
      'Kiwi TCMS occupies a unique position in test management: it is one of the few open source options with a serious feature set, and large organizations including government agencies have adopted it precisely because it is GPL-2.0 and self-hostable. For teams with strong DevOps capacity and a long-term commitment to running their own infrastructure, it is a defensible choice. For most QA teams, though, the math does not work out. The free Community Edition requires Docker, database administration, SSL configuration, version upgrades, and backup ownership — plus it serves ads. Once you want a managed SaaS with real support, Kiwi TCMS Private Tenant is $75/month with weekday-only EU-hours support, the on-premise Enterprise edition is $600/month, and the fully Managed Hosting tier is $2,000/month. Testably is a different bet: managed SaaS from day one with sign-up to first test case in five minutes, AI test generation on every paid plan, Shared Steps version pinning, run-level snapshots, and Jira two-way sync on Free. Most teams considering Kiwi TCMS settle the question by trying both side-by-side for a week.',
    whyLeave: [
      {
        title: 'Self-hosting is a DevOps project',
        body: 'Docker setup, database administration, SSL certificates, version upgrades, and backups are all on you. Even mature teams underestimate the ongoing hours.',
      },
      {
        title: 'Community Edition shows ads',
        body: 'Kiwi TCMS uses EthicalAds in the free Community Edition. Only paid tiers remove them.',
      },
      {
        title: 'Modern QA workflows are not built in',
        body: 'No AI test generation, no Shared Steps version pinning, no run-level snapshots, no exploratory mode with timestamped notes.',
      },
      {
        title: 'Managed SaaS pricing is high',
        body: 'Private Tenant ($75/mo) has weekday EU-hours support. Real 7-day support requires Managed Hosting at $2,000/mo.',
      },
      {
        title: 'Dated UI',
        body: 'The interface reflects open source engineering priorities — functional but visually behind modern SaaS competitors.',
      },
    ],
    whySwitch: [
      {
        title: 'Five-minute setup, fully managed',
        body: 'Sign up, invite teammates, start writing test cases. No Docker, no DNS, no upgrades to schedule.',
      },
      {
        title: 'AI test case generation on every paid plan',
        body: 'Generate from text, Jira issues, or exploratory sessions starting on the $19 Hobby plan.',
      },
      {
        title: 'Shared Steps with true version control',
        body: 'Pin Shared Step versions per test case, see diffs when a newer version exists, bulk-update with one click. Open source TCMs do not offer this.',
      },
      {
        title: '$99/month flat for up to 20 testers',
        body: 'Testably Professional is the same price as a single seat on most enterprise competitors — and a twentieth of Kiwi Managed Hosting.',
      },
      {
        title: 'Optional on-premise on Enterprise',
        body: 'If self-hosting is mandatory, the Enterprise plan offers an on-prem deployment with the same UX as the SaaS — without forcing you into open source maintenance.',
      },
    ],
    metaTitle: 'Best Kiwi TCMS Alternative in 2026 — Testably',
    metaDescription:
      'Skip Docker, SSL, and weekend upgrades. Testably is a managed test management SaaS with AI, Jira sync, and Shared Steps versioning — starting free.',
    faqs: [
      {
        question: 'Do you have an open source version?',
        answer:
          'No. Testably is a commercial SaaS. If open source is mandatory, Kiwi TCMS Community Edition or Testably\'s Enterprise on-premise deployment are the two paths.',
      },
      {
        question: 'How do I migrate from a self-hosted Kiwi TCMS?',
        answer:
          'Export test cases as CSV or JSON from Kiwi TCMS, then import via Testably\'s CSV importer. Most teams complete migration in under an hour for projects under 2,000 cases.',
      },
      {
        question: 'Does Testably support pytest, Robot Framework, JUnit?',
        answer:
          'Yes — via the CI/CD integration on the Professional plan. Submit JUnit-XML test results from any framework, and Testably will associate them with the right test cases and runs.',
      },
    ],
  },

  migrationGuide: {
    title: 'Move from Kiwi TCMS to Testably in under an hour',
    steps: [
      {
        num: 1,
        title: 'Export test cases from Kiwi TCMS',
        body: 'Use Kiwi\'s built-in CSV or JSON export. Include test plans, test runs, and tags.',
      },
      {
        num: 2,
        title: 'Decide what to keep',
        body: 'Old test plans you no longer run can be archived; only active regression suites need to move. Most teams cut 30–50% of their case count during migration.',
      },
      {
        num: 3,
        title: 'Map Kiwi fields to Testably fields',
        body: 'Use the field mapping table below. Linked bug tracker references are preserved as external links.',
      },
      {
        num: 4,
        title: 'Import into Testably',
        body: 'Open the target project in Testably, choose "Import → CSV", upload, and confirm the mapping.',
      },
      {
        num: 5,
        title: 'Connect Jira (or your bug tracker)',
        body: 'Add the Jira Cloud integration in Testably. Existing Kiwi bug-tracker links become Jira links automatically when keys match.',
      },
      {
        num: 6,
        title: 'Decommission the self-hosted Kiwi stack',
        body: 'Once Testably has been the source of truth for one full regression cycle, retire the Docker stack and the on-call rotation that came with it.',
      },
    ],
    importFormats: ['CSV (UTF-8)', 'JSON', 'Testably API'],
    fieldMapping: [
      { from: 'TestCase ID', to: 'Test Case ID', note: 'Original ID preserved as external reference.' },
      { from: 'Summary', to: 'Title' },
      { from: 'Action / Expected', to: 'Steps' },
      { from: 'Priority', to: 'Priority' },
      { from: 'Category / Component', to: 'Tags' },
      { from: 'TestPlan', to: 'Test Suite / Test Run' },
      { from: 'Bug Tracker link', to: 'Linked Issues (via integration)' },
    ],
  },
};

export default kiwiTcmsData;
