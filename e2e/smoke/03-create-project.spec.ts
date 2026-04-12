import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping',
);

/**
 * NOTE: The smoke account is on the Free plan (1-project limit) and already
 * has SMOKE_PROJECT_ID, so creating a second project would hit the plan cap
 * (canCreate = false → handleSubmit is a no-op). Instead we verify the
 * project page is reachable and the dashboard renders correctly.
 */
test('project page loads and dashboard renders', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });

  // Navigate directly to the smoke project detail page
  await page.goto(`/projects/${PROJECT_ID}`);
  await page.waitForLoadState('networkidle');

  // The project dashboard should render without error
  await expect(page).toHaveURL(new RegExp(PROJECT_ID!), { timeout: 10_000 });

  // At least one of these project-detail landmarks should be visible
  const dashboard = page.locator('[class*="dashboard"], main, [data-page="project"]')
    .or(page.getByText(/test case|test run|overview/i).first());
  await expect(dashboard).toBeVisible({ timeout: 10_000 });
});
