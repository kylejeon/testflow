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
import puppeteer from 'puppeteer-core';

// Vercel/AWS Lambda's serverless Linux image is missing the system libs
// (libnspr4, etc.) that puppeteer's bundled Chromium needs. @sparticuz/chromium
// ships a self-contained Lambda-compatible Chromium binary that does work
// there. Locally we fall back to a system Chrome install.
async function getLaunchOptions() {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return {
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: chromium.headless,
    };
  }

  const localCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean);

  const executablePath = localCandidates.find((p) => existsSync(p));
  if (!executablePath) {
    fail(
      `No local Chrome/Chromium found. Tried: ${localCandidates.join(', ')}.\n` +
      `Install Chrome or set PUPPETEER_EXECUTABLE_PATH=/path/to/chrome.`,
    );
  }

  return {
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  };
}

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
  '/docs/getting-started',
  '/docs/cicd',
  '/docs/import-export',
  '/docs/webhooks',
  '/docs/integrations',
  '/docs/test-cases',
  '/docs/test-runs',
  '/docs/milestones',
  '/docs/discovery-logs',
  '/docs/requirements-traceability',
  '/docs/shared-steps',
  '/docs/team-permissions',
  '/docs/account-billing',
  '/docs/keyboard-shortcuts',
  '/docs/faq',
  '/docs/api',
  '/docs/api/authentication',
  '/docs/api/projects',
  '/docs/api/test-cases',
  '/docs/api/test-runs',
  '/docs/api/test-results',
  '/docs/api/ci-upload',
  '/docs/api/milestones',
  '/docs/api/discovery-logs',
  '/docs/api/members',
  '/privacy',
  '/terms',
  '/cookies',
  '/refund',
];

const WAIT_FOR_MS = 1500;
const PORT = 45123;

// Pages that don't pass an explicit `canonical` prop to SEOHead fall back to
// `window.location.href`, which during prerender resolves to the local
// puppeteer URL (http://127.0.0.1:<port>/...). Rewrite those occurrences to
// the production origin so canonical/og:url tags ship correctly.
const PROD_ORIGIN = process.env.PRERENDER_ORIGIN || 'https://testably.app';
const LOCAL_ORIGIN = `http://127.0.0.1:${PORT}`;

function fail(msg, err) {
  console.error(`\n[prerender] ${msg}`);
  if (err) console.error(err);
  process.exit(1);
}

async function startServer(serveRoot) {
  if (!existsSync(serveRoot)) fail(`serve root ${serveRoot} does not exist`);

  // sirv serves SPA-style: any unknown path falls back to index.html,
  // which is exactly what the browser would receive before we prerender.
  const serve = sirv(serveRoot, { single: true, dev: false, etag: false });
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

async function prerenderRoute(browser, route, pendingWrites) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.setDefaultNavigationTimeout(60_000);

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

  // Queue the write — we deliberately don't write yet because for `/`
  // the target is dist/index.html, which is also the SPA shell sirv is
  // serving as fallback. Overwriting it mid-run would poison subsequent
  // route renders.
  const outPath = route === '/'
    ? join(DIST, 'index.html')
    : join(DIST, route.replace(/^\//, ''), 'index.html');
  pendingWrites.push({ route, outPath, html });

  const size = Buffer.byteLength(html, 'utf8');
  console.log(`  ✓ ${route.padEnd(50)} ${size.toString().padStart(7)} bytes  →  ${outPath.replace(ROOT + '/', '')}`);
}

async function main() {
  console.log(`[prerender] starting — ${ROUTES.length} routes`);

  // Sanity: dist/index.html (the SPA shell) must exist before we start.
  const shellPath = join(DIST, 'index.html');
  if (!existsSync(shellPath)) fail('dist/index.html missing — was vite build successful?');
  const shellHtml = await readFile(shellPath, 'utf8');
  console.log(`[prerender] SPA shell: ${shellPath} (${shellHtml.length} bytes)\n`);

  // Back up the pristine shell so we can always restore it if the run fails.
  const shellBackupPath = join(DIST, 'index.shell.html');
  await copyFile(shellPath, shellBackupPath);

  const server = await startServer(DIST);
  console.log(`[prerender] sirv listening on http://127.0.0.1:${PORT}\n`);

  const pendingWrites = [];
  let browser;
  try {
    const launchOpts = await getLaunchOptions();
    console.log(`[prerender] chromium: ${launchOpts.executablePath}`);
    browser = await puppeteer.launch(launchOpts);

    for (const route of ROUTES) {
      try {
        await prerenderRoute(browser, route, pendingWrites);
      } catch (err) {
        console.error(`  ✗ ${route} — ${err.message}`);
        throw err;
      }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((res) => server.close(res));
  }

  // Now that the server is down and no more sirv fallbacks happen, commit
  // all the prerendered HTML to disk. The `/` write overwrites the shell.
  // Rewrite the local prerender origin to the production origin so
  // canonical/og:url end up pointing at testably.app, not 127.0.0.1.
  for (const { outPath, html } of pendingWrites) {
    await mkdir(dirname(outPath), { recursive: true });
    const rewritten = html.split(LOCAL_ORIGIN).join(PROD_ORIGIN);
    await writeFile(outPath, rewritten, 'utf8');
  }

  // Remove the shell backup — vercel doesn't need it shipped.
  await rm(shellBackupPath, { force: true });

  console.log(`\n[prerender] done — ${ROUTES.length} routes written`);
}

main().catch((err) => fail('fatal error', err));
