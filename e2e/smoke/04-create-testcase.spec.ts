import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping',
);

const SMOKE_TC_TITLE = `SmokeTC${Date.now()}`;

test('test case creation saves successfully', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });

  await page.goto(`/projects/${PROJECT_ID}/testcases`);
  await page.waitForLoadState('networkidle');

  // Open new test case modal — button is in the toolbar, not covered by the
  // Jira widget (top-right area vs bottom-right widget). No force needed.
  await page.getByRole('button', { name: 'New Test Case' }).first().click();

  // Wait for the modal to appear (fixed inset-0 overlay containing "New Test Case" header)
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'New Test Case' });
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Fill title — exact placeholder from TestCaseList.tsx line 3792
  await modal.getByPlaceholder('e.g., User login functionality test').fill(SMOKE_TC_TITLE);

  // Scroll the Create button into view (modal is max-h-[90vh] overflow-y-auto)
  const createBtn = modal.getByRole('button', { name: 'Create' });
  await createBtn.scrollIntoViewIfNeeded();
  await createBtn.click();

  // Modal should close and the new TC title should appear in the list
  await expect(modal).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(SMOKE_TC_TITLE)).toBeVisible({ timeout: 10_000 });
});
