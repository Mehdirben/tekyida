import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E', () => {
  test('should render hero, navigation and footer', async ({ page }) => {
    await page.goto('/');

    // Check title contains Tekyida
    await expect(page).toHaveTitle(/Tekyida/i);

    // Verify main landmarks are present
    const main = page.locator('main');
    await expect(main).toBeVisible();

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should navigate from landing page to app via CTA', async ({ page }) => {
    await page.goto('/');

    // Find CTA link to /app
    const getStartedLink = page.locator('a[href="/app"]').first();
    await expect(getStartedLink).toBeVisible();

    await getStartedLink.click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('should adapt properly to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
