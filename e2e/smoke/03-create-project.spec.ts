import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD not configured — skipping');

async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
}

const SMOKE_PROJECT_NAME = `__smoke_${Date.now()}`;

test('project creation appears in list', async ({ page }) => {
  await login(page);

  // Open new project dialog
  await page.getByRole('button', { name: 'New Project' }).click({ force: true });

  // Fill project name
  await page.getByPlaceholder('e.g. Mobile App Testing').fill(SMOKE_PROJECT_NAME);

  // Confirm — force: true bypasses any fixed overlay covering the button
  await page.getByRole('button', { name: 'Create Project' }).click({ force: true });

  await expect(page.getByText(SMOKE_PROJECT_NAME)).toBeVisible({ timeout: 10_000 });
});
