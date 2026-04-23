import { expect, test } from '@playwright/test';

/**
 * Annotation-based TC ID mapping.
 *
 * The reporter reads annotations whose `type === 'testably'` when
 * `testCaseIdSource: 'annotation'`. This is the default strategy — clean
 * separation between test titles (human-readable) and metadata.
 */

test('user can log in', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-101' });
  await page.goto('/');
  await expect(page).toHaveTitle(/Example Domain/);
});

test('add to cart', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-102' });
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('checkout flow fails on declined card', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-103' });
  await page.goto('/');
  // Intentionally failing to demonstrate how failures surface in Testably.
  await expect(page.locator('button#pay')).toBeVisible({ timeout: 1_000 });
});

test('receipt renders — no annotation, will be skipped', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a')).toHaveCount(1);
});
