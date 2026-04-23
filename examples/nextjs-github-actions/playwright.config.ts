import { defineConfig, devices } from '@playwright/test';

/**
 * Next.js 15 + Testably Playwright Reporter — GitHub Actions reference config.
 *
 * Reporter docs: https://www.npmjs.com/package/@testably.kr/playwright-reporter
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,

  // Run against example.com for this demo — point `baseURL` at your own app
  // (and add a `webServer` block) before using in production.
  use: {
    baseURL: 'https://example.com',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  reporter: [
    // Keep your existing reporters — Testably is purely additive.
    ['list'],
    ['html', { open: 'never' }],
    [
      '@testably.kr/playwright-reporter',
      {
        // Match the tag style used in tests/*.spec.ts: test(..., { tag: '@TC-101' }, ...)
        testCaseIdSource: 'tag',
        // Don't fail CI if Testably is momentarily unreachable. Flip to `true`
        // if you'd rather a network hiccup gate the PR.
        failOnUploadError: false,
        // Log skipped tests so mapping gaps surface during review.
        verbose: true,
      },
    ],
  ],
});
