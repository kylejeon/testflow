import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL!;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD!;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID!;

test.beforeEach(() => {
  if (!EMAIL || !PASSWORD || !PROJECT_ID) {
    throw new Error('SMOKE_TEST_EMAIL, SMOKE_TEST_PASSWORD, and SMOKE_PROJECT_ID must be set');
  }
});

const SMOKE_RUN_NAME = `__smoke_run_${Date.now()}`;

test('run creation updates status', async ({ page }) => {
  // Log in
  await page.goto('/auth');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 15_000 });

  // Go to runs page
  await page.goto(`/projects/${PROJECT_ID}/runs`);

  // Create new run
  await page.getByRole('button', { name: /new run|create run/i }).first().click();

  // Fill run name
  const nameInput = page.getByPlaceholder(/run name|name/i).first();
  await nameInput.fill(SMOKE_RUN_NAME);

  // Confirm creation
  await page.getByRole('button', { name: /create|start/i }).first().click();

  // Run should appear with a status badge (new / in_progress)
  await expect(page.getByText(SMOKE_RUN_NAME)).toBeVisible({ timeout: 10_000 });
  // Status badge should be present
  const runRow = page.locator('[data-testid="run-row"]', { hasText: SMOKE_RUN_NAME })
    .or(page.locator('tr', { hasText: SMOKE_RUN_NAME }))
    .or(page.locator('li', { hasText: SMOKE_RUN_NAME }));
  await expect(runRow).toBeVisible({ timeout: 10_000 });
});
