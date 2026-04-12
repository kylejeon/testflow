import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping',
);

const SMOKE_RUN_NAME = `SmokeRun${Date.now()}`;

test('run creation updates status', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });

  await page.goto(`/projects/${PROJECT_ID}/runs`);
  await page.waitForLoadState('networkidle');

  // ── Step 1: open new-run modal ──────────────────────────────────────────
  // Button text: "Start New Run" (project-runs/page.tsx line 1691)
  await page.getByRole('button', { name: 'Start New Run' }).click();

  // Wait for the step-1 modal (contains step indicator showing "1")
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Start New Run' })
    .or(page.locator('div[class*="shadow-2xl"]').filter({ hasText: 'RUN NAME' }));
  await expect(modal).toBeVisible({ timeout: 5_000 });

  // Fill run name — exact placeholder: "e.g. Sprint 24 — Regression Run" (line 1980)
  await page.getByPlaceholder('e.g. Sprint 24 — Regression Run').fill(SMOKE_RUN_NAME);

  // ── Step 1 → Step 2 ─────────────────────────────────────────────────────
  // Button text: "Next: Select Cases" with arrow icon (line 2121)
  await page.getByRole('button', { name: /next.*select cases/i }).click();

  // Wait for step 2 to render — "Create Run" button appears only in step 2
  const createRunBtn = page.getByRole('button', { name: 'Create Run' });
  await expect(createRunBtn).toBeVisible({ timeout: 5_000 });

  // ── Step 2: submit ───────────────────────────────────────────────────────
  await createRunBtn.click();

  // Modal should close and the run name should appear in the runs list
  await expect(page.getByText(SMOKE_RUN_NAME)).toBeVisible({ timeout: 15_000 });
});
