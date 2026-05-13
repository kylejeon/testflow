#!/usr/bin/env node
/**
 * Static prerender for marketing routes.
 *
 * Why not react-snap? react-snap@1.23 ships an old bundled puppeteer (1.x)
 * whose Chromium can't parse modern JS we emit (optional chaining, etc.),
 * so the page script throws SyntaxError before our React app mounts and
 * react-snap captures the empty shell HTML.
 *
 * This script does the same job using the puppeteer version we install
 * ourselves (latest), which ships a modern Chromium:
 *   1. Boot the freshly-built `dist/` over sirv on localhost.
 *   2. For each marketing route, navigate puppeteer to it, wait for the
 *      SEOHead useEffect to update the document head, then snapshot the
 *      full DOM (including server-rendered meta tags) to
 *      `dist/<route>/index.html`.
 *   3. Authenticated/dashboard routes are explicitly NOT prerendered —
 *      they are served by vercel.json rewrites as SPA fallback.
 *
 * Run automatically as the `postbuild` npm script.
 */

import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import sirv from 'sirv';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');

const ROUTES = [
  '/',
  '/pricing',
  '/features',
  '/docs',
  '/changelog',
  '/roadmap',
  '/about',
  '/use-cases/test-case-management',
  '/use-cases/test-management-tool',
  '/blog',
  '/blog/choosing-test-management-tool',
  '/blog/playwright-reporter-ci-integration',
  '/blog/cypress-reporter-ci-integration',
  '/compare',
  '/compare/testrail',
  '/compare/zephyr',
  '/compare/qase',
  '/privacy',
  '/terms',
  '/cookies',
  '/refund',
];

const WAIT_FOR_MS = 1500;
const PORT = 45123;

function fail(msg, err) {
  console.error(`\n[prerender] ${msg}`);
  if (err) console.error(err);
  process.exit(1);
}

async function startServer() {
  if (!existsSync(DIST)) fail('dist/ does not exist — run `vite build` first.');

  // sirv serves SPA-style: any unknown path falls back to dist/index.html,
  // which is exactly what the browser would receive before we prerender.
  const serve = sirv(DIST, { single: true, dev: false, etag: false });
  const server = http.createServer((req, res) => serve(req, res, () => {
    res.statusCode = 404;
    res.end('not found');
  }));

  await new Promise((res, rej) => {
    server.once('error', rej);
    server.listen(PORT, '127.0.0.1', res);
  });
  return server;
}

async function prerenderRoute(browser, route) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.setDefaultNavigationTimeout(60_000);

  // Suppress noisy 3rd-party network failures (fonts/analytics) — they're
  // expected in a headless prerender environment and would clutter logs.
  page.on('pageerror', (err) => {
    console.warn(`  [pageerror @ ${route}] ${err.message}`);
  });

  const url = `http://127.0.0.1:${PORT}${route}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });

  // Give SEOHead's useEffect (and any client-side async meta updates) time
  // to mutate document.head before we serialize.
  await new Promise((r) => setTimeout(r, WAIT_FOR_MS));

  // Snapshot the full document.
  const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);

  await page.close();

  // Write to dist/<route>/index.html (root → dist/index.html).
  const outPath = route === '/'
    ? join(DIST, 'index.html')
    : join(DIST, route.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');

  const size = Buffer.byteLength(html, 'utf8');
  console.log(`  ✓ ${route.padEnd(50)} ${size.toString().padStart(7)} bytes  →  ${outPath.replace(ROOT + '/', '')}`);
}

async function main() {
  console.log(`[prerender] starting — ${ROUTES.length} routes`);

  // Sanity: dist/index.html (the SPA shell) must exist before we start.
  const shellPath = join(DIST, 'index.html');
  if (!existsSync(shellPath)) fail('dist/index.html missing — was vite build successful?');
  const shellSize = (await readFile(shellPath, 'utf8')).length;
  console.log(`[prerender] SPA shell: ${shellPath} (${shellSize} bytes)\n`);

  const server = await startServer();
  console.log(`[prerender] sirv listening on http://127.0.0.1:${PORT}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const route of ROUTES) {
      try {
        await prerenderRoute(browser, route);
      } catch (err) {
        console.error(`  ✗ ${route} — ${err.message}`);
        throw err;
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((res) => server.close(res));
  }

  console.log(`\n[prerender] done — ${ROUTES.length} routes written`);
}

main().catch((err) => fail('fatal error', err));
