import { test, expect } from '@playwright/test';

test.describe('Report Catalog e2e-RC', () => {
  test('e2e-RC-1 shows the catalog page after login', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Report Catalog' })).toBeVisible();
    await expect(page.getByPlaceholder('Search reports…')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible(); // type filter
  });

  test('e2e-RC-2 displays report cards', async ({ page }) => {
    await page.goto('/');

    // Wait for the report count to appear (data has loaded)
    await expect(page.getByText(/\d+ reports?/)).toBeVisible({ timeout: 10000 });

    // At least one report card should be in the grid
    const cards = page.locator('.grid > a, .grid > div');
    await expect(cards.first()).toBeVisible();
  });

  test('e2e-RC-3 search filters the results', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/\d+ reports?/)).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Search reports…').fill('zzznomatch');
    await expect(page.getByText('No reports found.')).toBeVisible({ timeout: 5000 });
  });
});
