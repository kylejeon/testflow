import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;

test.skip(!EMAIL || !PASSWORD, 'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD not configured — skipping auth tests');

/** Remove fixed overlays that block button clicks (Jira widget, onboarding bar, etc.) */
async function removeFixedOverlays(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="bottom"]').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="z-[1000]"]').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="z-[100]"]').forEach(el => el.remove());
  });
}

test('login with test account succeeds', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();

  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
  await removeFixedOverlays(page);
});
