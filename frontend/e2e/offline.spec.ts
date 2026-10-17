import { test, expect } from '@playwright/test';

// Valid 1x1 test JPEG
const testJpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9,
]);

test.describe('P6 Offline-First Scan & Queue Sync Flow', () => {
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
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
          email: 'citizen_offline@example.com',
          role: 'Citizen',
          full_name_bn: 'সাদিয়া হক',
          is_active: true,
        }),
      });
    });
  });

  test('enqueues document securely in offline IndexedDB queue when network is disconnected', async ({
    page,
    context,
  }) => {
    // 1. Visit home page
    await page.goto('/');
    await expect(page).toHaveTitle(/বাংলাদেশ ল্যান্ডওএস/);

    // Give consent for offline storage
    await page.evaluate(() => {
      localStorage.setItem('landos_offline_capture_consent', 'true');
    });

    // Navigate to scan page
    const scanBtn = page.getByRole('button', { name: 'দলিল স্ক্যান' });
    await expect(scanBtn).toBeVisible({ timeout: 15000 });
    await scanBtn.click();

    // Explainer screen before camera prompt (give time for lazy-loaded ScanPage)
    await expect(page.getByText('ক্যামেরা চালু করার আগে নির্দেশনা')).toBeVisible({ timeout: 15000 });

    // 2. Disconnect network
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Upload an image via the file upload fallback
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'ছবি বা ফাইল নির্বাচন করুন' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'test_deed_offline.jpg',
      mimeType: 'image/jpeg',
      buffer: testJpegBuffer,
    });

    // Preview and Quality Analysis appear
    const proceedBtn = page.getByRole('button', { name: /(পরবর্তী ধাপে যান|তবুও ব্যবহার করুন)/ });
    await expect(proceedBtn).toBeVisible({ timeout: 10000 });
    await proceedBtn.click();

    // 3. Verify offline queue message is displayed
    await expect(
      page.getByText(/(সুরক্ষিতভাবে অফলাইন কিউতে সংরক্ষিত|Document stored securely in offline queue)/i).first()
    ).toBeVisible({ timeout: 15000 });

    // 4. Restore connectivity
    await context.setOffline(false);
  });
});
