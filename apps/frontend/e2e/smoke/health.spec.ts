import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/License Key Shop/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('dashboard page accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign in if not authenticated
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('API health check', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await request.get(`${apiUrl}/health`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
  });

  test('license key validation endpoint accessible', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await request.post(`${apiUrl}/api/v1/validate`, {
      data: {
        licenseKey: 'TEST-KEY-1234',
      },
      headers: {
        'X-API-Key': 'test-api-key',
      },
    });

    // Should return 401 without valid API key
    expect([401, 400]).toContain(response.status());
  });
});
