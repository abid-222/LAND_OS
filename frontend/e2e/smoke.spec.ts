import { test, expect } from '@playwright/test';

test.describe('LandOS Mobile-First Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'healthy', database_connected: true, redis_connected: true }),
      });
    });
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Unauthenticated' }),
      });
    });
  });

  test('loads home page, displays legal disclaimers and brand logo', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/বাংলাদেশ ল্যান্ডওএস/);

    // Check legal map disclaimer banner
    const disclaimer = page.getByRole('alert');
    await expect(disclaimer.first()).toBeVisible({ timeout: 15000 });

    // Check sticky bottom nav on mobile viewports
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    if (isMobile) {
      const bottomNav = page.getByRole('navigation', { name: 'Mobile Bottom Navigation' });
      await expect(bottomNav).toBeVisible({ timeout: 15000 });
    }
  });

  test('verifies language toggle switch between Bengali and English', async ({ page }) => {
    await page.goto('/');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('বাংলাদেশ ল্যান্ডওএস', { timeout: 15000 });

    // Click to switch to English
    await page.getByRole('button', { name: 'Toggle Language' }).click();
    await expect(heading).toHaveText('Bangladesh LandOS', { timeout: 10000 });

    // Click back to switch to Bengali
    await page.getByRole('button', { name: 'Toggle Language' }).click();
    await expect(heading).toHaveText('বাংলাদেশ ল্যান্ডওএস', { timeout: 10000 });
  });
});
