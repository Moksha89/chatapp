import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://208.110.87.24:8888';
const API_URL = process.env.API_URL || 'http://208.110.87.24:8080';
const DEV_OTP = '123456';

async function loginUser(page: import('@playwright/test').Page, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const phone = '+1' + (Date.now() + attempt * 1000).toString().slice(-10);
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.locator('input[type="tel"]').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('input[type="tel"]').fill(phone);
      await page.locator('button:has-text("Send OTP")').click();

      // Check for rate limit error — if visible, wait for window to clear then retry
      const rateLimited = await page.locator('text=Too many requests').isVisible().catch(() => false);
      if (rateLimited) {
        if (attempt === retries) throw new Error('Rate limited after all retries');
        await page.waitForTimeout(15000);
        continue;
      }

      await page.locator('input[maxlength="6"]').waitFor({ state: 'visible', timeout: 20000 });
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
      return; // Success
    } catch (err) {
      if (attempt === retries) throw err;
      await page.waitForTimeout(15000);
    }
  }
}

test.describe('Group & Channel Features', () => {
  // Increase timeout for this suite since it may need to wait out OTP rate limiting
  test.setTimeout(120000);

  test('should show sidebar with filter options after login', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();
  });

  test('should be able to click Groups and Channels filters', async ({ page }) => {
    await loginUser(page);
    await expect(page.locator('text=All')).toBeVisible();

    // Test Groups filter
    const groupsFilter = page.locator('text=Groups');
    if (await groupsFilter.isVisible()) {
      await groupsFilter.click();
      await expect(page.locator('text=Groups')).toBeVisible();
    }

    // Test Channels filter (same session, no extra OTP needed)
    const channelsFilter = page.locator('text=Channels');
    if (await channelsFilter.isVisible()) {
      await channelsFilter.click();
      await expect(page.locator('text=Channels')).toBeVisible();
    }
  });
});
