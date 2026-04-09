import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://testably.app';

export default defineConfig({
  testDir: './e2e/smoke',
  timeout: 30_000,
  retries: 1,
  workers: 1, // run smoke tests serially to avoid account conflicts
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
