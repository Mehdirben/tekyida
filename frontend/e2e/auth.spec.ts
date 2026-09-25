import { test, expect } from '@playwright/test';

test.describe('Authentication Flows E2E', () => {
  test('should render login page with inputs and navigate to register', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    const registerLink = page.locator('a[href="/register"]').first();
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    await expect(page).toHaveURL(/\/register/);
  });

  test('should render register page with name, email and password inputs', async ({ page }) => {
    await page.goto('/register');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should render reset password page', async ({ page }) => {
    await page.goto('/reset-password');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});
