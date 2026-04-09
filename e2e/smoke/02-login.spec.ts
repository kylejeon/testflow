import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;

// Skip the entire file gracefully when credentials are not configured
test.skip(!EMAIL || !PASSWORD, 'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD not configured — skipping auth tests');

test('login with test account succeeds', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  // Fill email — label is now properly associated via htmlFor/id
  await page.getByLabel(/email/i).fill(EMAIL!);

  // Fill password
  await page.getByLabel(/password/i).fill(PASSWORD!);

  // Submit
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // Should land on /projects after successful login
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
});
