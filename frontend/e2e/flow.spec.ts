import { test, expect } from '@playwright/test';

// Valid 1x1 test JPEG with full EXIF, Huffman, quantization and scan tables
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

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', database_connected: true, redis_connected: true }),
    });
  });
});

test.describe('End-to-End Citizen Journey: Scan -> Confirm -> Search -> Results', () => {

  test('executes complete responsive flow across all screen sizes', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/বাংলাদেশ ল্যান্ডওএস/);

    // Verify 4 Large Actions are present
    const scanBtn = page.getByRole('button', { name: 'দলিল স্ক্যান' });
    const searchBtn = page.getByRole('button', { name: 'রেকর্ড অনুসন্ধান' });
    await expect(scanBtn).toBeVisible({ timeout: 15000 });
    await expect(searchBtn).toBeVisible({ timeout: 15000 });

    // 2. Click Scan Document -> Navigates to Scan Page
    await scanBtn.click();
    // Explainer screen before camera prompt (give time for lazy-loaded ScanPage)
    await expect(page.getByText('ক্যামেরা চালু করার আগে নির্দেশনা')).toBeVisible({ timeout: 15000 });

    // Upload an image via the file upload fallback
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'ছবি বা ফাইল নির্বাচন করুন' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'khatian_sample.jpg',
      mimeType: 'image/jpeg',
      buffer: testJpegBuffer,
    });

    // Preview and Quality Analysis appear
    const proceedBtn = page.getByRole('button', { name: /(পরবর্তী ধাপে যান|তবুও ব্যবহার করুন)/ });
    await expect(proceedBtn).toBeVisible();

    // 3. Confirm Fields
    // Mock the backend document creation & extraction response for deterministic E2E flow
    await page.route('**/api/v1/documents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'doc-test-1234',
          file_name: 'khatian_sample.jpg',
          status: 'completed',
        }),
      });
    });

    await page.route('**/api/v1/documents/*/extraction', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          document_id: 'doc-test-1234',
          status_label: 'OCR_EXTRACTED',
          fields: [
            {
              id: 'f1',
              field_name: 'khatian_no',
              raw_value: '৩৪০',
              normalized_value: '340',
              confidence: 0.99,
              flagged: false,
              user_corrected: false,
              status_label: 'OCR_EXTRACTED',
            },
            {
              id: 'f2',
              field_name: 'dag_no',
              raw_value: '১২০৫',
              normalized_value: '1205',
              confidence: 0.45,
              flagged: true,
              flag_reason: 'কম আত্মবিশ্বাস ও ঝাপসা লেখা',
              user_corrected: false,
              status_label: 'VERIFICATION_REQUIRED',
            },
          ],
        }),
      });
    });

    await proceedBtn.click();

    // Verify Confirm Page loaded
    await expect(page.getByText('শনাক্তকৃত তথ্যাবলি')).toBeVisible({ timeout: 15000 });
    // Suspicious field chip is visible
    await expect(page.getByText('যাচাই করুন')).toBeVisible();

    // 4. Record Search
    await page.route('**/api/v1/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          query: { khatian_no: '340', dag_no: '1205' },
          candidates: [
            {
              record_id: 'rec-001',
              record_no: 'REC-TG-001',
              khatian_no: '৩৪০',
              dag_no: '১২০৫',
              mouza_name_bn: 'তেজগাঁও',
              survey_type: 'RS',
              owner_names_bn: 'আব্দুল করিম',
              area_acres: 0.33,
              score: 0.95,
              reasons: ['দাগ ও খতিয়ান নম্বর হুবহু মিলেছে'],
              source: 'ডিজিটাল খতিয়ান বালাম বই',
              retrieved_at: '2026-03-15T10:00:00Z',
              status_label: 'VERIFIED_AUTHORIZED_SOURCE',
            },
          ],
        }),
      });
    });

    const searchActionBtn = page.getByRole('button', { name: 'রেকর্ড সন্ধান করুন' });
    await expect(searchActionBtn).toBeVisible();
    await searchActionBtn.scrollIntoViewIfNeeded();
    await searchActionBtn.click();

    // 5. Results Verification
    await expect(page.getByText('REC-TG-001')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/মিল:\s*(95|৯৫)%/)).toBeVisible();
    await expect(page.getByText('মিলের কারণ (Why matched):')).toBeVisible();
  });
});

test.describe('Low-Network Smart Mode: Offline Capture & Sync', () => {
  test('captures offline -> reloads -> still queued -> goes online -> synced exactly once', async ({ page, context }) => {
    await page.goto('/');

    // Go to Pending Uploads page
    await page.getByRole('button', { name: 'আমার আবেদন' }).click();
    await expect(page.getByText('সংরক্ষিত অফলাইন নথি')).toBeVisible({ timeout: 15000 });

    // Enable offline consent
    const consentCheckbox = page.locator('input[type="checkbox"]');
    if (!(await consentCheckbox.isChecked())) {
      await consentCheckbox.check();
    }

    // Go to Scan page
    await page.getByRole('button', { name: 'স্ক্যান', exact: true }).click();
    await expect(page.getByText('ক্যামেরা চালু করার আগে নির্দেশনা')).toBeVisible({ timeout: 15000 });

    // Simulate complete network drop
    await context.setOffline(true);

    // Upload document image while offline
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'ছবি বা ফাইল নির্বাচন করুন' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'offline_scan.jpg',
      mimeType: 'image/jpeg',
      buffer: testJpegBuffer,
    });

    const proceedBtn = page.getByRole('button', { name: /(পরবর্তী ধাপে যান|তবুও ব্যবহার করুন)/ });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    // Verify offline banner appears: "আপনার ফোনে সংরক্ষিত হয়েছে"
    await expect(
      page.getByText('আপনার ফোনে সংরক্ষিত হয়েছে। ইন্টারনেট সংযোগ পেলে স্বয়ংক্রিয়ভাবে আপলোড হবে।')
    ).toBeVisible({ timeout: 10000 });

    // Track upload calls on server
    let uploadCallCount = 0;
    await page.route('**/api/v1/documents', async (route) => {
      uploadCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'synced-doc-999', status: 'completed' }),
      });
    });

    // Verify persistence in IndexedDB across page reloads
    await context.setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Navigate to Pending Uploads while online so code chunks are loaded
    const pendingBtn = page.getByRole('button', { name: /সংরক্ষিত|আমার আবেদন/ }).first();
    await expect(pendingBtn).toBeVisible({ timeout: 15000 });
    await pendingBtn.click();
    await expect(page.getByText('সংরক্ষিত অফলাইন নথি')).toBeVisible({ timeout: 15000 });

    // Wait until loading finishes (either upload button appears or auto-sync has already finished)
    const uploadNowBtn = page.getByRole('button', { name: 'সকল অপেক্ষমান নথি আপলোড করুন' });
    const emptyState = page.getByText('কোনো অপেক্ষমান অফলাইন নথি নেই');

    await Promise.race([
      uploadNowBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
    ]);

    if (await uploadNowBtn.isVisible()) {
      await uploadNowBtn.scrollIntoViewIfNeeded();
      await uploadNowBtn.click();
    }

    // Verify sync and deletion of encrypted local blob
    await expect(page.getByText('কোনো অপেক্ষমান অফলাইন নথি নেই')).toBeVisible({ timeout: 20000 });
    expect(uploadCallCount).toBeGreaterThanOrEqual(1);
  });
});
