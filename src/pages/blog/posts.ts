// Single source of truth for blog post metadata.
// When adding a new post: create the page under `src/pages/blog/<slug>/page.tsx`,
// register the route in `src/router/config.tsx`, and add an entry below.
// The blog index page (`/blog`) auto-renders newest-first by `publishDate`.

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishDate: string; // ISO yyyy-mm-dd
  readTime: string;
  category: string;
  /** Optional accent emoji/icon for the index card. Falls back to "ri-article-line". */
  icon?: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'best-test-management-tools-2026',
    title: 'Best Test Management Tools in 2026: 11 Tools Ranked',
    description:
      'A comprehensive ranking of the 11 most-considered test management tools in 2026 — Testably, TestRail, Zephyr, Qase, Xray, PractiTest, and more — across pricing, AI, CI/CD, and migration.',
    publishDate: '2026-05-14',
    readTime: '14 min read',
    category: 'Ultimate Guide',
    icon: 'ri-trophy-line',
  },
  {
    slug: 'testrail-alternatives-2026',
    title: 'Best TestRail Alternatives in 2026: 6 Tools Compared',
    description:
      "TestRail's per-seat pricing climbs fast and AI is absent. We compare 6 TestRail alternatives — including a free-forever option — across pricing, AI, CI/CD, and migration cost.",
    publishDate: '2026-05-14',
    readTime: '9 min read',
    category: 'Alternatives Guide',
    icon: 'ri-compass-line',
  },
  {
    slug: 'zephyr-alternatives-2026',
    title: 'Zephyr Too Expensive? 6 Alternatives Worth Trying in 2026',
    description:
      'Zephyr Scale charges per Jira user — not per QA user — and reviewers cite 10-minute load times. We compare 6 Zephyr alternatives across pricing, performance, and Jira-independence.',
    publishDate: '2026-05-14',
    readTime: '9 min read',
    category: 'Alternatives Guide',
    icon: 'ri-flashlight-line',
  },
  {
    slug: 'qase-alternatives-2026',
    title: 'Why Teams Switch from Qase to Testably (and 5 More Alternatives in 2026)',
    description:
      'Qase has a modern UI but charges extra for AI, gates CI/CD behind Business, and lacks Shared Steps version control. We rank 6 Qase alternatives across pricing, AI, and reliability.',
    publishDate: '2026-05-14',
    readTime: '9 min read',
    category: 'Alternatives Guide',
    icon: 'ri-exchange-line',
  },
  {
    slug: 'xray-alternatives-2026',
    title: 'Top 6 Xray Alternatives Compared (2026)',
    description:
      'Xray locks tests inside Jira and gates CI/CD behind Enterprise. We compare 6 Xray alternatives — including standalone platforms that keep your test data outside Atlassian.',
    publishDate: '2026-05-14',
    readTime: '9 min read',
    category: 'Alternatives Guide',
    icon: 'ri-bug-line',
  },
  {
    slug: 'practitest-alternatives-2026',
    title: "Looking for a PractiTest Alternative? Here's What QA Teams Use in 2026",
    description:
      "PractiTest's 10-seat annual minimum means a $5,640/year floor before you start. We compare 6 PractiTest alternatives across pricing, AI, and on-ramp cost.",
    publishDate: '2026-05-14',
    readTime: '8 min read',
    category: 'Alternatives Guide',
    icon: 'ri-search-line',
  },
  {
    slug: 'testpad-alternatives-2026',
    title: '6 TestPad Alternatives in 2026: More Than Checklists',
    description:
      "TestPad's checklist-based approach is fast for exploratory testing but limited for structured QA. We rank 6 TestPad alternatives that add Jira, AI, and proper test case structure.",
    publishDate: '2026-05-14',
    readTime: '8 min read',
    category: 'Alternatives Guide',
    icon: 'ri-list-check',
  },
  {
    slug: 'kiwi-tcms-alternatives-2026',
    title: 'Kiwi TCMS Alternatives: 6 SaaS Options Without the Self-Hosting in 2026',
    description:
      'Kiwi TCMS is free if you can run Docker — but managed hosting jumps to $2,000/month. We rank 6 Kiwi TCMS alternatives that give you SaaS convenience without the DevOps tax.',
    publishDate: '2026-05-14',
    readTime: '8 min read',
    category: 'Alternatives Guide',
    icon: 'ri-cloud-line',
  },
  {
    slug: 'testmonitor-alternatives-2026',
    title: '6 TestMonitor Alternatives for QA Teams in 2026',
    description:
      'TestMonitor has solid European hosting but no free plan, no AI, and a Java-plugin requirement for screenshots. We rank 6 alternatives across pricing, AI, and integrations.',
    publishDate: '2026-05-14',
    readTime: '8 min read',
    category: 'Alternatives Guide',
    icon: 'ri-radar-line',
  },
  {
    slug: 'browserstack-tm-alternatives-2026',
    title: '6 BrowserStack Test Management Alternatives in 2026',
    description:
      'BrowserStack TM bundles test management inside a 15-product suite with opaque pricing and noisy AI-generated test cases. We rank 6 dedicated TCM alternatives across pricing, AI quality, and clarity.',
    publishDate: '2026-05-14',
    readTime: '8 min read',
    category: 'Alternatives Guide',
    icon: 'ri-stack-line',
  },
  {
    slug: 'testiny-alternatives-2026',
    title: '6 Testiny Alternatives for Growing QA Teams in 2026',
    description:
      'Testiny has clean UX but no AI, no Shared Steps versioning, and API rate limits above 6,900 cases. We rank 6 Testiny alternatives across AI, scale, and pricing.',
    publishDate: '2026-05-14',
    readTime: '8 min read',
    category: 'Alternatives Guide',
    icon: 'ri-plant-line',
  },
  {
    slug: 'cypress-reporter-ci-integration',
    title: 'Ship Your Cypress Test Results to Testably in 3 Lines',
    description:
      '@testably.kr/cypress-reporter — every Cypress run auto-syncs to Testably. One npm install, one setupNodeEvents line, three env vars.',
    publishDate: '2026-05-13',
    readTime: '6 min read',
    category: 'QA Engineering',
    icon: 'ri-test-tube-line',
  },
  {
    slug: 'playwright-reporter-ci-integration',
    title: 'Ship Your Playwright Test Results to Testably in 3 Lines',
    description:
      '@testably.kr/playwright-reporter — sync every Playwright CI run to your QA dashboard automatically. One install, one config line, three env vars.',
    publishDate: '2026-05-11',
    readTime: '6 min read',
    category: 'QA Engineering',
    icon: 'ri-flashlight-line',
  },
  {
    slug: 'choosing-test-management-tool',
    title: 'How to Choose the Right Test Case Management Tool in 2026',
    description:
      'A practical guide to evaluating test case management tools in 2026. Compare TestRail, Zephyr, qTest, and Testably across pricing, features, integrations, and ease of migration.',
    publishDate: '2026-04-12',
    readTime: '10 min read',
    category: 'QA Guide',
    icon: 'ri-compass-3-line',
  },
];

export const sortedBlogPosts = (): BlogPost[] =>
  [...BLOG_POSTS].sort((a, b) => b.publishDate.localeCompare(a.publishDate));
