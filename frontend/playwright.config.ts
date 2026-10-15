import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Pixel 5 (Mobile Android)',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'iPhone 12 (Mobile Safari)',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Tablet (768px)',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'Desktop (1280px)',
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
