/**
 * SEO Routes Scanner — single source of truth for marketing routes.
 *
 * Used by both `scripts/prerender.mjs` (route list for puppeteer prerender)
 * and `scripts/generate-sitemap.mjs` (writes public/sitemap.xml).
 *
 * Design notes:
 *   - Pure Node ESM, no dependency on Vite / `import.meta.glob`.
 *     (The client bundle uses src/data/competitors/index.ts via glob; we
 *     deliberately re-scan from disk so the two paths can never drift.)
 *   - Static routes are an explicit allow-list (homepage, pricing, docs,
 *     legal, etc.). Dynamic routes are derived from filesystem scans of
 *     `src/data/competitors/`, `src/data/vs-matrix/`, and from parsing
 *     `src/pages/blog/posts.ts` for the BLOG_POSTS array.
 *   - Each route carries SEO metadata (lastmod / changefreq / priority).
 *     For competitor/vs-matrix routes, `lastmod` comes from the data file's
 *     `lastReviewed: 'YYYY-MM-DD'` field (regex extracted). For blog posts,
 *     `lastmod` comes from `publishDate`. For static routes, a hardcoded
 *     default with the constant `STATIC_DEFAULT_LASTMOD` (build date).
 *   - Validation: vs-matrix slugs must follow `<a>-vs-<b>` with `a < b`
 *     alphabetical order, and both sides must be non-empty. Violations
 *     throw → fails the build (matches dev spec §10 M5 AC last item).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Build date used as the default `lastmod` for routes without a more
// specific timestamp (static marketing pages whose copy is changed
// infrequently). ISO yyyy-mm-dd.
const STATIC_DEFAULT_LASTMOD = new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// Static routes — explicit allow-list.
// Mirrors the marketing surface defined in src/router/config.tsx (only the
// public, prerender-friendly subset; authenticated routes are excluded).
// ─────────────────────────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  // Top-level marketing
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  { path: '/features', changefreq: 'monthly', priority: 0.9 },
  { path: '/blog', changefreq: 'weekly', priority: 0.9 },
  { path: '/docs', changefreq: 'weekly', priority: 0.8 },
  { path: '/compare', changefreq: 'monthly', priority: 0.8 },
  { path: '/alternatives', changefreq: 'monthly', priority: 0.9 },
  { path: '/changelog', changefreq: 'weekly', priority: 0.7 },
  { path: '/roadmap', changefreq: 'monthly', priority: 0.7 },
  { path: '/about', changefreq: 'monthly', priority: 0.6 },

  // Use-cases
  { path: '/use-cases/test-case-management', changefreq: 'monthly', priority: 0.9 },
  { path: '/use-cases/test-management-tool', changefreq: 'monthly', priority: 0.9 },

  // Docs (functional)
  { path: '/docs/getting-started', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/cicd', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/import-export', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/webhooks', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/integrations', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/test-cases', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/test-runs', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/milestones', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/discovery-logs', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/requirements-traceability', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/shared-steps', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/team-permissions', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/account-billing', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/keyboard-shortcuts', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/faq', changefreq: 'monthly', priority: 0.7 },

  // Docs/API
  { path: '/docs/api', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/authentication', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/projects', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/test-cases', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/test-runs', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/test-results', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/ci-upload', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/milestones', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/discovery-logs', changefreq: 'monthly', priority: 0.7 },
  { path: '/docs/api/members', changefreq: 'monthly', priority: 0.7 },

  // Legal
  { path: '/privacy', changefreq: 'yearly', priority: 0.4 },
  { path: '/terms', changefreq: 'yearly', priority: 0.4 },
  { path: '/cookies', changefreq: 'yearly', priority: 0.3 },
  { path: '/refund', changefreq: 'yearly', priority: 0.3 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — filesystem extraction
// ─────────────────────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads a competitor/vs-matrix data file and returns its `lastReviewed`
 * value (ISO yyyy-mm-dd) if present, otherwise null. We deliberately do
 * a regex extraction instead of dynamic import: data files contain Vite-
 * specific imports and JSX-adjacent syntax that vanilla Node can't load.
 */
function extractLastReviewed(filePath) {
  if (!existsSync(filePath)) return null;
  const src = readFileSync(filePath, 'utf8');
  const m = src.match(/lastReviewed\s*:\s*['"]([^'"]+)['"]/);
  if (!m) return null;
  if (!ISO_DATE_RE.test(m[1])) return null;
  return m[1];
}

/**
 * Lists `.ts` data files inside a directory, excluding index/types.
 * Returns slugs (filename without .ts).
 */
function listDataSlugs(dirAbs) {
  if (!existsSync(dirAbs)) return [];
  return readdirSync(dirAbs)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => name !== 'index.ts' && name !== 'types.ts')
    .map((name) => name.replace(/\.ts$/, ''))
    .sort();
}

/**
 * Validates a vs-matrix slug: must be `<a>-vs-<b>` with `a < b`
 * lexicographically. Throws on violation (fails the build).
 */
function validateVsMatrixSlug(slug) {
  const parts = slug.split('-vs-');
  if (parts.length !== 2) {
    throw new Error(
      `[seo-routes-scanner] vs-matrix slug "${slug}" must contain exactly one "-vs-" separator`,
    );
  }
  const [a, b] = parts;
  if (!a || !b) {
    throw new Error(
      `[seo-routes-scanner] vs-matrix slug "${slug}" has empty side(s)`,
    );
  }
  if (a === b) {
    throw new Error(
      `[seo-routes-scanner] vs-matrix slug "${slug}" cannot have two identical sides`,
    );
  }
  if (a.localeCompare(b) > 0) {
    throw new Error(
      `[seo-routes-scanner] vs-matrix slug "${slug}" violates alphabetical order — expected "${b}-vs-${a}"`,
    );
  }
}

/**
 * Parses src/pages/blog/posts.ts for blog post entries.
 *
 * We regex-extract `slug:` and `publishDate:` fields from each entry in
 * the BLOG_POSTS array. This avoids needing a TS loader in Node.
 */
function readBlogPosts(rootDir) {
  const filePath = join(rootDir, 'src/pages/blog/posts.ts');
  if (!existsSync(filePath)) return [];
  const src = readFileSync(filePath, 'utf8');

  // Match objects of the shape `{ slug: '...', ..., publishDate: '...', ... }`
  // Greedy block boundary on `},\n` works because BLOG_POSTS entries are
  // separated that way; we narrow with a local regex per entry.
  const posts = [];
  const objectBlocks = src.split(/\n\s*\{\s*\n/).slice(1);
  for (const block of objectBlocks) {
    const slugMatch = block.match(/slug\s*:\s*['"]([^'"]+)['"]/);
    const dateMatch = block.match(/publishDate\s*:\s*['"]([^'"]+)['"]/);
    if (!slugMatch || !dateMatch) continue;
    posts.push({ slug: slugMatch[1], publishDate: dateMatch[1] });
  }
  return posts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the complete list of public SEO routes with metadata.
 *
 * Shape: { path, lastmod, changefreq, priority }[]
 *
 * Throws if any vs-matrix slug violates the alphabetical ordering rule.
 */
export async function getAllSeoRoutes(rootDir = ROOT) {
  const competitorsDir = join(rootDir, 'src/data/competitors');
  const vsMatrixDir = join(rootDir, 'src/data/vs-matrix');

  const competitorSlugs = listDataSlugs(competitorsDir);
  const vsMatrixSlugs = listDataSlugs(vsMatrixDir);
  const blogPosts = readBlogPosts(rootDir);

  // Validate vs-matrix slugs first — fail fast.
  for (const slug of vsMatrixSlugs) validateVsMatrixSlug(slug);

  const routes = [];

  // 1. Static routes (homepage / pricing / docs / legal / …)
  for (const r of STATIC_ROUTES) {
    routes.push({
      path: r.path,
      lastmod: STATIC_DEFAULT_LASTMOD,
      changefreq: r.changefreq,
      priority: r.priority,
    });
  }

  // 2. /compare/{slug} — single competitor compare pages
  for (const slug of competitorSlugs) {
    const lastReviewed =
      extractLastReviewed(join(competitorsDir, `${slug}.ts`)) ||
      STATIC_DEFAULT_LASTMOD;
    routes.push({
      path: `/compare/${slug}`,
      lastmod: lastReviewed,
      changefreq: 'monthly',
      priority: 0.8,
    });
  }

  // 3. /alternatives/{slug}
  for (const slug of competitorSlugs) {
    const lastReviewed =
      extractLastReviewed(join(competitorsDir, `${slug}.ts`)) ||
      STATIC_DEFAULT_LASTMOD;
    routes.push({
      path: `/alternatives/${slug}`,
      lastmod: lastReviewed,
      changefreq: 'monthly',
      priority: 0.8,
    });
  }

  // 4. /compare/{a}-vs-{b}
  for (const slug of vsMatrixSlugs) {
    const lastReviewed =
      extractLastReviewed(join(vsMatrixDir, `${slug}.ts`)) ||
      STATIC_DEFAULT_LASTMOD;
    routes.push({
      path: `/compare/${slug}`,
      lastmod: lastReviewed,
      changefreq: 'monthly',
      priority: 0.7,
    });
  }

  // 5. /blog/{slug}
  for (const post of blogPosts) {
    routes.push({
      path: `/blog/${post.slug}`,
      lastmod: post.publishDate,
      changefreq: 'monthly',
      priority: 0.8,
    });
  }

  return routes;
}

/**
 * Path-only convenience for prerender.mjs.
 */
export async function getAllSeoRoutePaths(rootDir = ROOT) {
  const routes = await getAllSeoRoutes(rootDir);
  return routes.map((r) => r.path);
}

// CLI smoke test: `node scripts/seo-routes-scanner.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const routes = await getAllSeoRoutes();
  console.log(`[seo-routes-scanner] ${routes.length} routes`);
  for (const r of routes) {
    console.log(`  ${r.path.padEnd(60)} ${r.lastmod}  ${r.changefreq.padEnd(8)} ${r.priority}`);
  }
}
