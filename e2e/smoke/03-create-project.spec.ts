import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL!;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD!;

// Shared login helper — avoids repeating across smoke tests
async function login(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 15_000 });
}

const SMOKE_PROJECT_NAME = `__smoke_${Date.now()}`;

test('project creation appears in list', async ({ page }) => {
  await login(page);

  // Open new project dialog
  const newProjectBtn = page.getByRole('button', { name: /new project/i });
  await newProjectBtn.click();

  // Fill project name
  const nameInput = page.getByPlaceholder(/project name/i);
  await nameInput.fill(SMOKE_PROJECT_NAME);

  // Confirm
  await page.getByRole('button', { name: /create/i }).click();

  // Should navigate to the new project or show it in list
  await expect(page.getByText(SMOKE_PROJECT_NAME)).toBeVisible({ timeout: 10_000 });
});
