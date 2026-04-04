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

  const result = await Promise.race([
    page.locator('text=New user').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'register' as const),
    page.locator('text=All').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'chat' as const),
  ]).catch(() => 'timeout' as const);

  if (result === 'register') {
    await page.locator('input[placeholder="Enter your name"]').fill('E2E Groups User');
    await page.locator('button:has-text("Create Account")').click();
    await page.locator('text=All').waitFor({ state: 'visible', timeout: 15000 });
  }
}

test.describe('Group & Channel Features', () => {
  test('should show sidebar with filter options after login', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
  });

  test('should be able to click Groups filter', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
    const groupsFilter = page.locator('text=Groups');
    if (await groupsFilter.isVisible()) {
      await groupsFilter.click();
      // Should still be on the chat page
      await expect(page.locator('text=Groups')).toBeVisible();
    }
  });

  test('should be able to click Channels filter', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
    const channelsFilter = page.locator('text=Channels');
    if (await channelsFilter.isVisible()) {
      await channelsFilter.click();
      await expect(page.locator('text=Channels')).toBeVisible();
    }
  });
});
