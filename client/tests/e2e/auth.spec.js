import { test, expect } from '@playwright/test';
import { generateTestUser, cleanupTestUser } from '../helpers/testUtils.js';

test.describe('User Authentication', () => {
  let testUser;

  test.beforeEach(async () => {
    // Generate a unique test user for each test
    testUser = generateTestUser();
  });

  test.afterEach(async ({ page }) => {
    // Clean up: try to delete the test user if it was created
    if (testUser.created) {
      await cleanupTestUser(testUser);
    }
  });

  test('should register a new user and login successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Should see the login form initially
    await expect(page).toHaveTitle(/Language Practice/);
    await expect(page.locator('h2')).toContainText('Language Helper');
    await expect(page.locator('h5')).toContainText('Please log in to continue');

    // Click on "Need an account? Register here" to switch to registration mode
    await page.click('text=Need an account? Register here');

    // Verify we're now in registration mode
    await expect(page.locator('h5')).toContainText('Create a new account');

    // Fill out the registration form
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#authCode', testUser.authCode);
    await page.fill('#firstName', testUser.firstName);
    await page.fill('#lastName', testUser.lastName);

    // Submit the registration form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('.alert-success')).toContainText('Account created successfully!');
    testUser.created = true;

    // Verify we're back to login mode
    await expect(page.locator('h5')).toContainText('Please log in to continue');

    // Wait for the form to be ready and email field to be populated
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#email:not([disabled])');
    
    // The email should still be filled from registration
    await expect(page.locator('#email')).toHaveValue(testUser.email);

    // Clear and refill the password field to ensure it's ready
    await page.locator('#password').clear();
    await page.fill('#password', testUser.password);

    // Submit the login form
    await page.click('button[type="submit"]');

    // Wait for navigation and main app to load
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to the main app - look for the unique logged-in navbar
    await expect(page.locator('#logged-in-navbar')).toBeVisible();
    await expect(page.locator('.navbar-brand')).toContainText('Language Helper');
    
    // Should see welcome message with user's first name (more specific selector)
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Should see logout button
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should show error for invalid registration', async ({ page }) => {
    await page.goto('/');

    // Switch to registration mode
    await page.click('text=Need an account? Register here');

    // Try to register with invalid auth code
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#authCode', 'invalid-code');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.alert-danger')).toBeVisible();
  });

  test('should show error for duplicate email registration', async ({ page }) => {
    // First, create a user
    await page.goto('/');
    await page.click('text=Need an account? Register here');
    
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#authCode', testUser.authCode);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert-success')).toContainText('Account created successfully!');
    testUser.created = true;

    // Try to register again with the same email
    await page.click('text=Need an account? Register here');
    await page.fill('#email', testUser.email);
    await page.fill('#password', 'different-password');
    await page.fill('#authCode', testUser.authCode);
    await page.click('button[type="submit"]');

    // Should show error message for duplicate email
    await expect(page.locator('.alert-danger')).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/');

    // Try to login with invalid credentials
    await page.fill('#email', 'nonexistent@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.alert-danger')).toBeVisible();

    // Should still be on login page
    await expect(page.locator('h5')).toContainText('Please log in to continue');
  });

  test('should logout successfully', async ({ page }) => {
    // First register and login a user
    await page.goto('/');
    await page.click('text=Need an account? Register here');
    
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#authCode', testUser.authCode);
    await page.fill('#firstName', testUser.firstName);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert-success')).toContainText('Account created successfully!');
    testUser.created = true;

    // Login
    await page.locator('#password').clear();
    await page.fill('#password', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for main app to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#logged-in-navbar');

    // Verify we're logged in - use the unique navbar selector
    await expect(page.locator('#logged-in-navbar')).toBeVisible();
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();

    // Click logout
    await page.click('text=Logout');

    // Should be back to login page
    await expect(page.locator('h2')).toContainText('Language Helper');
    await expect(page.locator('h5')).toContainText('Please log in to continue');
  });

  test('should validate required fields in registration', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Need an account? Register here');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show client-side validation errors (HTML5 validation)
    // The form should not submit and we should still be on registration page
    await expect(page.locator('h5')).toContainText('Create a new account');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Need an account? Register here');

    // Try to submit with invalid email format
    await page.fill('#email', 'invalid-email');
    await page.fill('#password', testUser.password);
    await page.fill('#authCode', testUser.authCode);

    // Try to submit - this might be prevented by HTML5 validation
    await page.click('button[type="submit"]');

    // Wait a moment for any potential error to appear
    await page.waitForTimeout(1000);

    // Check if form submission was prevented by HTML5 validation
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate(input => !input.validity.valid);
    
    if (isInvalid) {
      // HTML5 validation prevented submission - this is expected behavior
      expect(isInvalid).toBe(true);
    } else {
      // Form was submitted, should show server-side error
      const errorElement = page.locator('.alert-danger');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText(/email/i);
    }
  });
});
