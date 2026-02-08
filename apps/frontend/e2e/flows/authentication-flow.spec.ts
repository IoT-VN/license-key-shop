import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('sign in page loads', async ({ page }) => {
    await page.goto('/sign-in');

    await expect(page).toHaveTitle(/Sign In/);
  });

  test('sign up page loads', async ({ page }) => {
    await page.goto('/sign-up');

    await expect(page).toHaveTitle(/Sign Up/);
  });

  test('redirect to dashboard after sign in', async ({ page }) => {
    // This test requires Clerk test credentials
    test.skip(!process.env.CLERK_TEST_KEY, 'Clerk test key not configured');

    await page.goto('/sign-in');

    // Clerk sign in would happen here
    // After successful sign in, redirect to dashboard
    // await expect(page).toHaveURL('/dashboard');
  });

  test('protected routes redirect to sign in', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/dashboard/purchases', '/dashboard/license-keys'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/sign-in/);
    }
  });
});
