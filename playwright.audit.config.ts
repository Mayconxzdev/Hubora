import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './audit-tools/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true, // We will run sequentially to ensure stable screenshots and traces without maxing out local dev server
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['json', { outputFile: 'audit/08-route-crawl/playwright-results.json' }],
    ['html', { outputFolder: 'audit/08-route-crawl/playwright-report', open: 'never' }]
  ],
  use: {
    actionTimeout: 0,
    trace: 'off',
    video: 'off',
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'Desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'Mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
