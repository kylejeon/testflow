import { test, expect } from '@playwright/test';

test('landing page loads and Get Started is clickable', async ({ page }) => {
  await page.goto('/');

  // Wait for the SPA to fully render (JS bundle load + React render)
  await page.waitForLoadState('networkidle');

  // Page must load without errors
  await expect(page).not.toHaveURL(/error/);
  await expect(page.locator('body')).toBeVisible();

  // Primary CTA must be present and enabled
  const cta = page.getByRole('link', { name: /get started/i }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toBeEnabled();
});
