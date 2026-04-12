import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping'
);

const SMOKE_RUN_NAME = `__smoke_run_${Date.now()}`;

test('run creation updates status', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });

  await page.goto(`/projects/${PROJECT_ID}/runs`);
  await page.waitForLoadState('networkidle');

  // Step 1: open new run modal
  await page.getByRole('button', { name: 'Start New Run' }).click({ force: true });

  // Fill run name
  await page.getByPlaceholder('e.g. Sprint 24 — Regression Run').fill(SMOKE_RUN_NAME);

  // Advance to step 2
  await page.getByRole('button', { name: /next.*select cases/i }).click({ force: true });

  // Step 2: confirm creation
  await page.getByRole('button', { name: 'Create Run' }).click({ force: true });

  // Run should appear in the list
  await expect(page.getByText(SMOKE_RUN_NAME)).toBeVisible({ timeout: 15_000 });
});
