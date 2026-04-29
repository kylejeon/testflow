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
    slug: 'cypress-reporter-ci-integration',
    title: 'Ship Your Cypress Test Results to Testably in 3 Lines',
    description:
      '@testably.kr/cypress-reporter — every Cypress run auto-syncs to Testably. One npm install, one setupNodeEvents line, three env vars.',
    publishDate: '2026-04-27',
    readTime: '6 min read',
    category: 'QA Engineering',
    icon: 'ri-test-tube-line',
  },
  {
    slug: 'playwright-reporter-ci-integration',
    title: 'Ship Your Playwright Test Results to Testably in 3 Lines',
    description:
      '@testably.kr/playwright-reporter — sync every Playwright CI run to your QA dashboard automatically. One install, one config line, three env vars.',
    publishDate: '2026-04-27',
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
