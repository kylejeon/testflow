#!/usr/bin/env node
// Renders the 3 PH launch-image HTMLs to PNG at 2x (2540x1520).
// Usage:  node marketing/launch-images-f028/build.mjs
//         node marketing/launch-images-f028/build.mjs --only=2
// Output: docs/marketing/assets/f028/f028-ph-image-{1|2|3}-{slug}@2x.png

import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outDir = path.join(repoRoot, 'docs', 'marketing', 'assets', 'f028');

const IMAGES = [
  { n: 1, slug: 'split',     html: 'image1.html' },
  { n: 2, slug: 'setup',     html: 'image2.html' },
  { n: 3, slug: 'dashboard', html: 'image3.html' },
];

const VIEWPORT = { width: 1270, height: 760 };
const DEVICE_SCALE = 2;
const WAIT_FOR_FONTS_MS = 1500;

const only = process.argv.find((a) => a.startsWith('--only='));
const filter = only ? Number(only.split('=')[1]) : null;

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
  });
  const page = await context.newPage();

  for (const { n, slug, html } of IMAGES) {
    if (filter && filter !== n) continue;
    const src = pathToFileURL(path.join(__dirname, html)).href;
    const dst = path.join(outDir, `f028-ph-image-${n}-${slug}@2x.png`);
    console.log(`[${n}] ${html}  →  ${path.relative(repoRoot, dst)}`);

    await page.goto(src, { waitUntil: 'networkidle' });
    // Give webfonts a beat to paint consistently.
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(WAIT_FOR_FONTS_MS);

    await page.screenshot({
      path: dst,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      omitBackground: false,
      type: 'png',
    });

    const { size } = await fs.stat(dst);
    console.log(`    wrote ${(size / 1024).toFixed(1)} KB`);
  }

  await browser.close();
  console.log('\nDone. Open each PNG to verify. Target size ≤ 1.2 MB per file.');
  console.log('If you need WebP fallback: squoosh-cli --webp q=90 docs/marketing/assets/f028/*.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
