import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL!;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD!;

test.beforeEach(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD must be set');
  }
});

test('login with test account succeeds', async ({ page }) => {
  await page.goto('/auth');

  // Fill email
  await page.getByLabel(/email/i).fill(EMAIL);

  // Fill password
  await page.getByLabel(/password/i).fill(PASSWORD);

  // Submit
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Should land on /projects after successful login
  await expect(page).toHaveURL(/\/projects/, { timeout: 15_000 });
});
