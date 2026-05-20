/**
 * SEO Routes Scanner — single source of truth for crawlable routes.
 *
 * Used by `scripts/prerender.mjs` (route list for puppeteer prerender) and
 * `scripts/generate-sitemap.mjs` (writes public/sitemap.xml).
 *
 * Internal-only mode: dynamic marketing scans removed. Only the legal pages
 * remain crawlable; everything else is auth-gated and redirects at the Vercel
 * layer (see vercel.json).
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const STATIC_DEFAULT_LASTMOD = new Date().toISOString().slice(0, 10);

// Legal pages — must stay crawlable for compliance.
const STATIC_ROUTES = [
  { path: '/privacy', changefreq: 'yearly', priority: 0.4 },
  { path: '/terms',   changefreq: 'yearly', priority: 0.4 },
  { path: '/cookies', changefreq: 'yearly', priority: 0.3 },
  { path: '/refund',  changefreq: 'yearly', priority: 0.3 },
];

/**
 * Returns the complete list of public SEO routes with metadata.
 * Shape: { path, lastmod, changefreq, priority }[]
 */
export async function getAllSeoRoutes(_rootDir = ROOT) {
  return STATIC_ROUTES.map((r) => ({
    path: r.path,
    lastmod: STATIC_DEFAULT_LASTMOD,
    changefreq: r.changefreq,
    priority: r.priority,
  }));
}

/** Path-only convenience for prerender.mjs. */
export async function getAllSeoRoutePaths(rootDir = ROOT) {
  const routes = await getAllSeoRoutes(rootDir);
  return routes.map((r) => r.path);
}

// CLI smoke test: `node scripts/seo-routes-scanner.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const routes = await getAllSeoRoutes();
  console.log(`[seo-routes-scanner] ${routes.length} routes`);
  for (const r of routes) console.log(`  ${r.path}`);
}
