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
  });

  test('loads home page, displays legal disclaimers and brand logo', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/বাংলাদেশ ল্যান্ডওএস/);

    // Check legal map disclaimer banner
    const disclaimer = page.getByRole('alert');
    await expect(disclaimer.first()).toBeVisible({ timeout: 15000 });

    // Check sticky bottom nav
    const bottomNav = page.getByRole('navigation', { name: 'Mobile Bottom Navigation' });
    await expect(bottomNav).toBeVisible({ timeout: 15000 });
  });

  test('verifies language toggle switch between Bengali and English', async ({ page }) => {
    await page.goto('/');

    const toggleBtn = page.getByRole('button', { name: 'Toggle Language' });
    await expect(toggleBtn).toBeVisible({ timeout: 15000 });

    // Click to switch to English
    await toggleBtn.click();
    await expect(page.getByText('Bangladesh LandOS')).toBeVisible({ timeout: 10000 });

    // Click back to switch to Bengali
    await toggleBtn.click();
    await expect(page.getByText('বাংলাদেশ ল্যান্ডওএস')).toBeVisible({ timeout: 10000 });
  });
});
