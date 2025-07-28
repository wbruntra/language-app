import { test, expect } from '@playwright/test';

test.describe('Basic App Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Should see the login page
    await expect(page).toHaveTitle(/Language Practice/);
    await expect(page.locator('h2')).toContainText('Language Helper');
  });

  test('should have responsive navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Should see login form elements
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Log In');
    await expect(page.locator('text=Need an account? Register here')).toBeVisible();
  });
});
