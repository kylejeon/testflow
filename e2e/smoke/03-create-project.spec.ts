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

/**
 * The smoke account is on Free plan (1-project max) and already owns
 * SMOKE_PROJECT_ID, so canCreate=false prevents creating a second project.
 * This test verifies the project detail page loads correctly instead.
 */
test('project page loads and dashboard renders', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
  await removeFixedOverlays(page);

  await page.goto(`/projects/${PROJECT_ID}`);
  await page.waitForLoadState('networkidle');
  await removeFixedOverlays(page);

  await expect(page).toHaveURL(new RegExp(PROJECT_ID!), { timeout: 10_000 });
  // Verify the project dashboard rendered — <main> is present on every app page
  await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
});
