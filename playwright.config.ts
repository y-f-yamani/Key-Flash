import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Locally reuses a running dev server; CI builds and starts
 * production (`PLAYWRIGHT_PROD=1 npx playwright test`).
 */
const useProdServer = !!process.env.PLAYWRIGHT_PROD;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Desktop-first product: Chromium is the primary target.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: useProdServer ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000/en',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
