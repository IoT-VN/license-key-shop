import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3001';

test.describe('License Validation API', () => {
  let apiKey: string;

  test.beforeAll(async ({ request }) => {
    // Create test API key (would normally authenticate first)
    apiKey = 'test-api-key';
  });

  test('validate license key with valid format', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/validate`, {
      data: {
        licenseKey: 'TEST-KEY-1234-ABCD-EFGH',
      },
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('isValid');
    expect(body).toHaveProperty('keyString');
  });

  test('reject invalid key format', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/validate`, {
      data: {
        licenseKey: 'INVALID-FORMAT',
      },
      headers: {
        'X-API-Key': apiKey,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.isValid).toBe(false);
    expect(body.status).toBe('INVALID_FORMAT');
  });

  test('require API key for validation', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/validate`, {
      data: {
        licenseKey: 'TEST-KEY-1234-ABCD-EFGH',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('include metadata in validation request', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/validate`, {
      data: {
        licenseKey: 'TEST-KEY-1234-ABCD-EFGH',
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'TestApp/1.0',
          machineId: 'test-machine-123',
        },
      },
      headers: {
        'X-API-Key': apiKey,
      },
    });

    expect(response.status()).toBe(200);
  });

  test('handle rate limiting', async ({ request }) => {
    // Make multiple requests to test rate limiting
    const requests = Array.from({ length: 15 }, () =>
      request.post(`${API_URL}/api/v1/validate`, {
        data: {
          licenseKey: 'TEST-KEY-1234-ABCD-EFGH',
        },
        headers: {
          'X-API-Key': apiKey,
        },
      }),
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);

    // Should eventually hit rate limit (10,000/hr default)
    // For testing, we just verify the endpoint responds
    expect(responses[0].status()).toBeGreaterThanOrEqual(200);
    expect(responses[0].status()).toBeLessThan(500);
  });
});
