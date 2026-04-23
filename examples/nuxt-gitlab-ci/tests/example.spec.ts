import { expect, test } from '@playwright/test';

/**
 * Title-based TC ID mapping.
 *
 * The reporter extracts `TC-###` from the test title via regex when
 * `testCaseIdSource: 'title'`. Keep titles human-readable; the bracketed prefix
 * is stripped automatically in display.
 *
 * Pattern accepted:
 *   [TC-101]   — plain integer suffix
 *   [TC-A3B2]  — alphanumeric
 *   [abcd1234-5678-…]  — UUID
 */

test('[TC-101] user can log in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Example Domain/);
});

test('[TC-102] add to cart', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('[TC-103] checkout flow fails on Visa', async ({ page }) => {
  await page.goto('/');
  // Intentionally failing to demonstrate how failures surface in Testably.
  await expect(page.locator('button#pay')).toBeVisible({ timeout: 1_000 });
});

test('receipt renders — no TC ID, will be skipped', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a')).toHaveCount(1);
});
