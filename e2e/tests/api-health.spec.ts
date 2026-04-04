import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://208.110.87.24:8080';
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

test.describe('API Health & Infrastructure', () => {
  test('backend health endpoint returns ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(body.uptime).toBeGreaterThan(0);
  });

  test('backend liveness probe returns ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/live`);
    expect(response.status()).toBe(200);
  });

  test('backend readiness probe returns ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/ready`);
    expect(response.status()).toBe(200);
  });

  test('frontend serves index.html', async ({ request }) => {
    const response = await request.get(BASE_URL);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<div id="root">');
  });

  test('frontend serves CSS assets', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const html = await response.text();
    expect(html).toContain('.css');
  });

  test('API returns 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.get(`${API_URL}/users/me`);
    expect(response.status()).toBe(401);
  });

  test('OTP send endpoint accepts phone number', async ({ request }) => {
    const testPhone = '+1' + Date.now().toString().slice(-10);
    const response = await request.post(`${API_URL}/auth/send-otp`, {
      data: { phoneNumber: testPhone },
    });
    expect([200, 201]).toContain(response.status());
  });

  test('version check endpoint works', async ({ request }) => {
    const response = await request.get(`${API_URL}/version/check`);
    expect(response.status()).toBe(200);
  });

  test('APK download endpoint responds', async ({ request }) => {
    const response = await request.get(`${API_URL}/version/download/android`, {
      maxRedirects: 0,
    });
    expect([200, 404]).toContain(response.status());
  });
});
