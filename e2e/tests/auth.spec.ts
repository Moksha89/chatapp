import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://208.110.87.24:8888';
const DEV_OTP = '123456';

async function sendOTPWithRetry(page: import('@playwright/test').Page, phone: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('button:has-text("Send OTP")').click();

    // Check for rate limit error
    await page.waitForTimeout(1000);
    const rateLimited = await page.locator('text=Too many requests').isVisible().catch(() => false);
    if (rateLimited) {
      await page.waitForTimeout(15000);
      continue;
    }
    return;
  }
  throw new Error('Rate limited after all retries');
}

test.describe('Authentication Flow', () => {
  // Allow extra time for rate limit retries
  test.setTimeout(120000);

  test('should show login page with all UI elements', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="tel"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=ChatApp')).toBeVisible();
    await expect(page.locator('text=Sign in to continue')).toBeVisible();
    // Send OTP button
    await expect(page.locator('button:has-text("Send OTP")')).toBeVisible();
    // Download Android app link
    await expect(page.locator('a[href="/version/download/android"]')).toBeVisible();
    await expect(page.locator('text=Download Android App')).toBeVisible();
    // QR login option
    await expect(page.locator('text=Login with QR code')).toBeVisible();
    // Test OTP hint
    await expect(page.locator('text=123456')).toBeVisible();
  });

  test('should show OTP input and handle invalid OTP', async ({ page }) => {
    const phone = '+1' + Date.now().toString().slice(-10);
    await sendOTPWithRetry(page, phone);
    await expect(page.locator('input[maxlength="6"]')).toBeVisible({ timeout: 30000 });
    // Enter invalid OTP
    await page.locator('input[maxlength="6"]').fill('000000');
    await page.locator('button:has-text("Verify")').click();
    await expect(page.locator('.text-red-500')).toBeVisible({ timeout: 15000 });
  });

  test('should register new user with valid OTP', async ({ page }) => {
    const phone = '+1' + (Date.now() + 200).toString().slice(-10);
    await sendOTPWithRetry(page, phone);
    await page.locator('input[maxlength="6"]').waitFor({ state: 'visible', timeout: 30000 });
    await page.locator('input[maxlength="6"]').fill(DEV_OTP);
    await page.locator('button:has-text("Verify")').click();

    // New user -> registration form OR existing user -> chat
    const result = await Promise.race([
      page.locator('text=New user').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'register' as const),
      page.locator('text=All').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'chat' as const),
    ]).catch(() => 'timeout' as const);

    if (result === 'register') {
      await page.locator('input[placeholder="Enter your name"]').fill('E2E Test User');
      await page.locator('button:has-text("Create Account")').click();
      await expect(page.locator('text=All')).toBeVisible({ timeout: 15000 });
    }
    expect(['register', 'chat']).toContain(result);
  });
});
