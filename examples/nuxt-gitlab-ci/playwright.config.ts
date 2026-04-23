import { defineConfig, devices } from '@playwright/test';

/**
 * Nuxt 3 + Testably Playwright Reporter — GitLab CI reference config.
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
        // Match title style used in tests/*.spec.ts: '[TC-101] user can log in'
        testCaseIdSource: 'title',
        failOnUploadError: false,
        verbose: true,
      },
    ],
  ],
});
