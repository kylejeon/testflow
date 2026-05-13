/**
 * Shared Testably rank/summary preset for /blog/{slug}-alternatives-2026 pages.
 * Centralizes the Testably copy so a price or feature update in 2026 only edits
 * one file.
 */

import type { RankedTool, SummaryRow } from './AlternativesArticleLayout';

/** Testably ranked card (always rank 1 in the alternatives lists). */
export const TESTABLY_RANKED: RankedTool = {
  rank: 1,
  name: 'Testably',
  bestFor: 'Modern QA teams wanting flat-rate pricing, AI, and fast onboarding',
  pricing: 'Free forever; Hobby $19, Starter $49, Professional $99 (up to 20 members)',
  pros: [
    'Free forever plan with AI generations included',
    'Flat-rate team pricing ($99/mo for 20 testers)',
    'AI test case generation on every paid plan',
    'Shared Steps with version pinning + run snapshots',
    'Native Jira sync, RTM, CI/CD without Enterprise upsell',
    'CSV migration from TestRail/Zephyr/Qase in under an hour',
  ],
  cons: [
    'Newer product (launched in 2026) with a smaller user base than legacy TCMs',
    'No on-premise option yet — SaaS only',
  ],
  cta: { label: 'Start Testably free', href: 'https://app.testably.io/signup' },
  isTestably: true,
  iconClass: 'ri-flashlight-fill',
};

/** Testably summary row for the comparison table. */
export const TESTABLY_SUMMARY: SummaryRow = {
  name: 'Testably',
  bestFor: 'Flat-rate, AI-native test management for QA teams of any size',
  pricing: 'Free; $19+ paid',
  aiGen: 'Yes',
  cicdSdk: 'Yes',
  trialPlan: 'Free forever + 14-day Starter trial',
  highlight: true,
};

/** Standard related-reads block for alternative blog posts. */
export const STANDARD_RELATED_READS = [
  {
    label: 'Testably pricing — flat-rate plans without per-seat fees',
    to: '/pricing',
  },
  {
    label: 'How to choose the right test case management tool in 2026',
    to: '/blog/choosing-test-management-tool',
  },
  {
    label: 'Best test management tools in 2026 — full ranking',
    to: '/blog/best-test-management-tools-2026',
  },
];
