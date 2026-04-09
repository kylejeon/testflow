import { test, expect } from '@playwright/test';

test('unauthenticated /projects redirects to login', async ({ page }) => {
  await page.goto('/projects');

  // Dashboard must not be accessible without auth — expect redirect to /auth
  await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  await expect(page.locator('body')).toBeVisible();
});
