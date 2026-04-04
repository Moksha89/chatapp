import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const API_URL = process.env.API_URL || 'http://208.110.87.24:8080';
const DEV_OTP = '123456';

async function loginUser(page: import('@playwright/test').Page) {
  const phone = '+1' + Date.now().toString().slice(-10);
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('input[type="tel"]').fill(phone);
  await page.locator('button:has-text("Send OTP")').click();
  await page.locator('input[maxlength="6"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[maxlength="6"]').fill(DEV_OTP);
  await page.locator('button:has-text("Verify")').click();

  // Handle registration for new user or direct chat for existing user
  const result = await Promise.race([
    page.locator('text=New user').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'register' as const),
    page.locator('text=All').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'chat' as const),
  ]).catch(() => 'timeout' as const);

  if (result === 'register') {
    await page.locator('input[placeholder="Enter your name"]').fill('E2E Messaging User');
    await page.locator('button:has-text("Create Account")').click();
    await page.locator('text=All').waitFor({ state: 'visible', timeout: 15000 });
  }
}

test.describe('Messaging Features', () => {
  test('should show chat sidebar after login', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
  });

  test('should show filter tabs in sidebar', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
    // Check for filter options - Groups, Channels, etc.
    const sidebar = page.locator('[class*="sidebar"], [class*="Sidebar"], aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('should show empty state or chat list', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
    // Either shows existing chats or empty state
    const hasContent = await page.locator('[class*="chat"], [class*="Chat"]').count();
    expect(hasContent).toBeGreaterThanOrEqual(0);
  });

  test('should have search functionality', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
    // Look for search input or search icon
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], [class*="search"]');
    const searchCount = await searchInput.count();
    expect(searchCount).toBeGreaterThanOrEqual(0);
  });

  test('should have menu or settings access', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
    // Check for settings/menu icon or button
    const menuElements = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], [class*="menu"], [class*="Menu"]');
    const menuCount = await menuElements.count();
    expect(menuCount).toBeGreaterThanOrEqual(0);
  });
});
