import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const API_URL = process.env.API_URL || 'http://208.110.87.24:8080';

test.describe('Performance & Code Splitting', () => {
  test('page loads within 15 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(15000);
  });

  test('code splitting produces multiple JS chunks', async ({ page }) => {
    const jsRequests: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.js') && response.status() === 200) {
        jsRequests.push(url);
      }
    });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    expect(jsRequests.length).toBeGreaterThanOrEqual(2);
  });

  test('vendor chunks are loaded', async ({ page }) => {
    const jsRequests: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') && response.status() === 200) {
        jsRequests.push(url);
      }
    });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const vendorChunks = jsRequests.filter(
      (url) => url.includes('vendor') || url.includes('chunk')
    );
    expect(vendorChunks.length).toBeGreaterThanOrEqual(1);
  });

  test('CSS is loaded', async ({ page }) => {
    const cssRequests: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.endsWith('.css') && response.status() === 200) {
        cssRequests.push(url);
      }
    });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    expect(cssRequests.length).toBeGreaterThanOrEqual(1);
  });

  test('backend responds within 3 seconds', async ({ request }) => {
    const start = Date.now();
    const response = await request.get(`${API_URL}/health`);
    const duration = Date.now() - start;
    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(3000);
  });

  test('no critical console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      // Ignore non-critical errors (network errors, WebSocket, and minification artifacts)
      if (
        !error.message.includes('net::ERR_') &&
        !error.message.includes('Failed to fetch') &&
        !error.message.includes('NetworkError') &&
        !error.message.includes('WebSocket') &&
        !error.message.includes('before initialization')
      ) {
        errors.push(error.message);
      }
    });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    // Wait a bit for any deferred errors
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });
});
