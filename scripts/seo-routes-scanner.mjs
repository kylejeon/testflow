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

// Full stealth mode: marketing routes redirected to /auth at vercel layer
// (see vercel.json). Sitemap intentionally limited to legal pages — these
// must remain crawlable per legal/compliance requirements but carry the
// lowest priority. All previously listed marketing/docs/use-cases/compare
// /alternatives/blog paths are intentionally excluded.
const STATIC_ROUTES = [
  // Legal (only routes that remain publicly indexable)
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
export async function getAllSeoRoutes(_rootDir = ROOT) {
  // Stealth mode: dynamic marketing scans (competitor / vs-matrix / blog)
  // intentionally disabled. Only STATIC_ROUTES (legal pages) are returned.
  // Source code for marketing pages remains in src/pages/* but is unreachable
  // — vercel.json redirects all marketing URLs to /auth before the SPA loads.
  return STATIC_ROUTES.map((r) => ({
    path: r.path,
    lastmod: STATIC_DEFAULT_LASTMOD,
    changefreq: r.changefreq,
    priority: r.priority,
  }));
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
