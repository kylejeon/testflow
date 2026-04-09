import { defineConfig, devices } from '@playwright/test';

// Prefer www subdomain to avoid the 307 redirect on the bare domain
const BASE_URL = process.env.SMOKE_BASE_URL || 'https://www.testably.app';

export default defineConfig({
  testDir: './e2e/smoke',
  timeout: 60_000,
  retries: 1,
  workers: 1, // run smoke tests serially to avoid account conflicts
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // SPA navigation can be slow on CI — give assertions more breathing room
    actionTimeout: 15_000,
  },
  expect: {
    timeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
