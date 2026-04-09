import { test, expect } from '@playwright/test';

test('landing page loads and primary CTA is visible', async ({ page }) => {
  await page.goto('/');

  // Wait for the SPA to fully render (JS bundle load + React render)
  await page.waitForLoadState('networkidle');

  // Page must load without errors
  await expect(page).not.toHaveURL(/error/);
  await expect(page.locator('body')).toBeVisible();

  // Primary CTA — the home page uses <button> elements that navigate('/auth'),
  // not <a> tags, so we match by button role with common CTA text variants.
  const cta = page
    .getByRole('button', { name: /get started|start for free|start free/i })
    .first();
  await expect(cta).toBeVisible();
  await expect(cta).toBeEnabled();
});
