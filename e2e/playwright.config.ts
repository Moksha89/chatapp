import { defineConfig, devices } from '@playwright/test';

// Use remote server for full E2E tests (frontend + backend together)
// Override with env vars for local development
const BASE_URL = process.env.BASE_URL || 'http://208.110.87.24:8888';
const API_URL = process.env.API_URL || 'http://208.110.87.24:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
