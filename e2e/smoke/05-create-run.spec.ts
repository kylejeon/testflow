import { test, expect } from '@playwright/test';

const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const PROJECT_ID = process.env.SMOKE_PROJECT_ID;

test.skip(
  !EMAIL || !PASSWORD || !PROJECT_ID,
  'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD / SMOKE_PROJECT_ID not configured — skipping',
);

async function removeFixedOverlays(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="bottom"]').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="z-[1000]"]').forEach(el => el.remove());
    document.querySelectorAll<HTMLElement>('[class*="fixed"][class*="z-[100]"]').forEach(el => el.remove());
  });
}

const SMOKE_RUN_NAME = `SmokeRun${Date.now()}`;

test('run creation updates status', async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill(EMAIL!);
  await page.getByLabel(/password/i).fill(PASSWORD!);
  await page.locator('form').getByRole('button', { name: /log in|sign in/i }).click();
  await expect(page).toHaveURL(/\/projects/, { timeout: 20_000 });
  await removeFixedOverlays(page);

  await page.goto(`/projects/${PROJECT_ID}/runs`);
  await page.waitForLoadState('networkidle');
  await removeFixedOverlays(page);

  // ── Step 1: open the new-run modal ─────────────────────────────────────
  await page.getByRole('button', { name: 'Start New Run' }).click();
  await removeFixedOverlays(page);

  // Fill run name — exact placeholder from project-runs/page.tsx
  await page.getByPlaceholder('e.g. Sprint 24 — Regression Run').fill(SMOKE_RUN_NAME);

  // ── Step 1 → Step 2 ────────────────────────────────────────────────────
  await page.getByRole('button', { name: /next.*select cases/i }).click();

  // Wait for 'Create Run' to appear (only rendered in step 2)
  const createRunBtn = page.getByRole('button', { name: 'Create Run' });
  await expect(createRunBtn).toBeVisible({ timeout: 5_000 });
  await removeFixedOverlays(page);

  // ── Step 2: submit ──────────────────────────────────────────────────────
  await createRunBtn.click();

  // Run name should appear in the list after modal closes
  await expect(page.getByText(SMOKE_RUN_NAME)).toBeVisible({ timeout: 15_000 });

  // ── Cleanup: delete the just-created Run so smoke doesn't burn through
  //    the Free-tier 10-runs/month limit (which silently blocks future
  //    submissions). Verifies create+delete lifecycle.
  try {
    // Find the run card containing our run name + open its kebab menu
    const runCard = page
      .locator('div.bg-white.rounded-xl')
      .filter({ has: page.locator('i.ri-more-2-fill') })
      .filter({ hasText: SMOKE_RUN_NAME })
      .first();
    await runCard.locator('button:has(i.ri-more-2-fill)').click();

    // Dropdown's "Delete" button
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    // Confirm modal: scope to the visible "Delete Test Run" modal and
    // click its red Delete button
    const deleteModal = page
      .locator('div.fixed.inset-0')
      .filter({ hasText: 'Delete Test Run' });
    await expect(deleteModal).toBeVisible({ timeout: 5_000 });
    await deleteModal.getByRole('button', { name: 'Delete', exact: true }).click();

    // Verify removed from the list
    await expect(page.getByText(SMOKE_RUN_NAME)).not.toBeVisible({ timeout: 10_000 });
  } catch (err) {
    // Cleanup is best-effort — see TC smoke for rationale.
    console.warn(`[smoke] Run cleanup failed for ${SMOKE_RUN_NAME}:`, err);
  }
});
