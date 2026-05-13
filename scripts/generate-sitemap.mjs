/**
 * Sitemap generator — writes `public/sitemap.xml` from `seo-routes-scanner`.
 *
 * Runs at `prebuild` (before `vite build`) so the sitemap is in sync with
 * the data files committed to git, even before Vite copies `public/` into
 * `dist/`. After prerender, the generated `dist/sitemap.xml` already
 * reflects whatever was committed for the deploy.
 *
 * Why write to `public/` (not `dist/`)?
 *   - The file stays in git so reviewers can diff what changed between PRs.
 *   - Vite copies `public/sitemap.xml` → `dist/sitemap.xml` for free.
 *   - If git tracking becomes noisy later, switch the OUT_PATH to dist/
 *     and add a postbuild step. For now, single source = single file.
 */

import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllSeoRoutes } from './seo-routes-scanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SITE_ORIGIN = process.env.SITEMAP_ORIGIN || 'https://testably.app';
const OUT_PATH = join(ROOT, 'public/sitemap.xml');

/** Escape XML reserved chars (defensive — none expected in our slugs). */
function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSitemap(routes) {
  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
  ].join('\n');

  const body = routes
    .map((r) => {
      // priority is rendered to 1 decimal place to match historical format
      // (`1.0`, `0.9`, etc.). `Number.toFixed(1)` is exactly that.
      const priority = Number(r.priority).toFixed(1);
      const loc = xmlEscape(`${SITE_ORIGIN}${r.path}`);
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${r.lastmod}</lastmod>`,
        `    <changefreq>${r.changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `${header}\n${body}\n</urlset>\n`;
}

async function main() {
  const routes = await getAllSeoRoutes(ROOT);
  if (routes.length === 0) {
    console.warn('[generate-sitemap] WARN — 0 routes resolved. STATIC_ROUTES + data scans both empty.');
  }

  const xml = buildSitemap(routes);
  await writeFile(OUT_PATH, xml, 'utf8');
  console.log(`[generate-sitemap] wrote ${routes.length} URLs → ${OUT_PATH.replace(ROOT + '/', '')}`);
}

main().catch((err) => {
  console.error('[generate-sitemap] fatal error:');
  console.error(err);
  process.exit(1);
});
