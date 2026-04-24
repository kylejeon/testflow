import { expect, test } from '@playwright/test';

/**
 * Tag-based TC ID mapping.
 *
 * Playwright 1.42+ lets you attach tags directly in the test options object.
 * The reporter reads `@TC-…` tags when `testCaseIdSource: 'tag'` is set.
 *
 * Each test's tag maps 1:1 to a Testably test case ID. Missing tag =
 * test is skipped during upload (logged when `verbose: true`).
 */

test('user can log in', { tag: '@TC-101' }, async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Example Domain/);
});

test('add to cart', { tag: '@TC-102' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('checkout flow completes', { tag: '@TC-103' }, async ({ page }) => {
  await page.goto('/');
  // Intentionally failing to demonstrate how failed tests surface in Testably.
  await expect(page.locator('button#nonexistent')).toBeVisible({ timeout: 1_000 });
});

test('receipt renders after purchase', { tag: '@TC-104' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a')).toHaveCount(1);
});

/**
 * This test has NO `@TC-…` tag — the reporter logs
 * `1 skipped (no TC ID)` for it. Useful to demonstrate partial coverage
 * when migrating a test suite to Testably gradually.
 */
test('non-mapped utility check', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/example/i);
});
