import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping',
);

async function removeFixedOverlays(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="bottom"]').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="z-[1000]"]').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="z-[100]"]').forEach(el => el.remove());
  });
}

const SMOKE_TC_TITLE = `SmokeTC${Date.now()}`;

test('test case creation saves successfully', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
  await removeFixedOverlays(page);

  await page.goto(`/projects/${PROJECT_ID}/testcases`);
  await page.waitForLoadState('networkidle');
  await removeFixedOverlays(page);

  // Open the new test case modal
  await page.getByRole('button', { name: 'New Test Case' }).first().click();

  // Wait for the modal overlay to appear
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'New Test Case' });
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Remove any overlays that appeared inside/over the modal
  await removeFixedOverlays(page);

  // Fill title — exact placeholder from TestCaseList.tsx
  await modal.getByPlaceholder('e.g., User login functionality test').fill(SMOKE_TC_TITLE);

  // Scroll the Create button into view (modal is max-h-[90vh] overflow-y-auto)
  const createBtn = modal.getByRole('button', { name: 'Create' });
  await createBtn.scrollIntoViewIfNeeded();
  await createBtn.click();

  // Modal should close and the new TC title should appear in the list
  await expect(modal).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(SMOKE_TC_TITLE)).toBeVisible({ timeout: 10_000 });
});
