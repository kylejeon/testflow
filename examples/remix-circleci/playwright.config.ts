import { defineConfig, devices } from '@playwright/test';

/**
 * Remix + Testably Playwright Reporter — CircleCI reference config.
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

  use: {
    baseURL: 'https://example.com',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      '@testably.kr/playwright-reporter',
      {
        // Match annotation.type used in tests/*.spec.ts:
        //   testInfo.annotations.push({ type: 'testably', description: 'TC-101' })
        testCaseIdSource: 'annotation',
        failOnUploadError: false,
        verbose: true,
      },
    ],
  ],
});
