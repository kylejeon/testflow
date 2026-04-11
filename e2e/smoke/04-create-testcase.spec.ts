import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

// Skip the entire file gracefully when credentials are not configured
test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping'
);

const SMOKE_TC_TITLE = `__smoke_tc_${Date.now()}`;

test('test case creation saves successfully', async ({ page }) => {
  // Log in
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });

  // Go to test cases for the smoke project
  await page.goto(`/projects/${PROJECT_ID}/testcases`);
  await page.waitForLoadState('networkidle');

  // Open new test case form — button text is "New Test Case"
  await page.getByRole('button', { name: 'New Test Case' }).first().click();

  // Fill title — placeholder is "e.g., User login functionality test"
  await page.getByPlaceholder('e.g., User login functionality test').fill(SMOKE_TC_TITLE);

  // Save — button text is "Create" (or "Update" when editing)
  await page.getByRole('button', { name: 'Create' }).click();

  // Test case should appear in the list
  await expect(page.getByText(SMOKE_TC_TITLE)).toBeVisible({ timeout: 10_000 });
});
