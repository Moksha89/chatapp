import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const DEV_OTP = '123456';

test.describe('Authentication Flow', () => {
  test('should show login page with phone input', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="tel"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=ChatApp')).toBeVisible();
    await expect(page.locator('text=Sign in to continue')).toBeVisible();
  });

  test('should show Send OTP button', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('button:has-text("Send OTP")')).toBeVisible();
  });

  test('should have download Android app link', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('a[href="/version/download/android"]')).toBeVisible();
    await expect(page.locator('text=Download Android App')).toBeVisible();
  });

  test('should have QR login option', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('text=Login with QR code')).toBeVisible();
  });

  test('should show test OTP hint', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('text=123456')).toBeVisible();
  });

  test('should show OTP input after entering phone number', async ({ page }) => {
    const phone = '+1' + Date.now().toString().slice(-10);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('button:has-text("Send OTP")').click();
    await expect(page.locator('input[maxlength="6"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=OTP Code')).toBeVisible();
  });

  test('should show error for invalid OTP', async ({ page }) => {
    const phone = '+1' + (Date.now() + 100).toString().slice(-10);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('button:has-text("Send OTP")').click();
    await page.locator('input[maxlength="6"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('input[maxlength="6"]').fill('000000');
    await page.locator('button:has-text("Verify")').click();
    await expect(page.locator('.text-red-500')).toBeVisible({ timeout: 10000 });
  });

  test('should register new user with valid OTP', async ({ page }) => {
    const phone = '+1' + (Date.now() + 200).toString().slice(-10);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('button:has-text("Send OTP")').click();
    await page.locator('input[maxlength="6"]').waitFor({ state: 'visible', timeout: 15000 });
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
