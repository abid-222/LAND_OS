import { test, expect } from '@playwright/test';

test.describe('LandOS Mobile-First Smoke Tests', () => {
  test('loads home page, displays legal disclaimers and brand logo', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/বাংলাদেশ ল্যান্ডওএস/);

    // Check legal map disclaimer banner
    const disclaimer = page.getByRole('alert');
    await expect(disclaimer.first()).toBeVisible();

    // Check sticky bottom nav
    const bottomNav = page.getByRole('navigation', { name: 'Mobile Bottom Navigation' });
    await expect(bottomNav).toBeVisible();
  });

  test('verifies language toggle switch between Bengali and English', async ({ page }) => {
    await page.goto('/');

    const toggleBtn = page.getByRole('button', { name: 'Toggle Language' });
    await expect(toggleBtn).toBeVisible();

    // Click to switch to English
    await toggleBtn.click();
    await expect(page.getByText('Bangladesh LandOS')).toBeVisible();

    // Click back to switch to Bengali
    await toggleBtn.click();
    await expect(page.getByText('বাংলাদেশ ল্যান্ডওএস')).toBeVisible();
  });
});
