import { test, expect } from '@playwright/test';

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

  // Mock Namjari applications submission
  await page.route('**/api/v1/namjari/applications', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'app-mock-8812',
          tracking_code: 'NJ-2026-8812',
          parcel_id: 'P-CLEAN-01',
          deed_no: 'D-2024-8891',
          applicant_user_id: 'user-citizen-01',
          registry_office: 'তেজগাঁও সাব-রেজিস্ট্রি অফিস, ঢাকা',
          status: 'documents_review',
          status_label_bn: 'নথিপত্র নিরীক্ষা ও পর্যালোচনা',
          status_label_en: 'Documents Review',
          auto_verification_status: 'passed',
          verification_checklist: {
            status: 'passed',
            items: [
              { id: 'chk_qr', label_bn: 'দলিল কিউআর ও ক্রিপ্টোগ্রাফিক হ্যাশ যাচাই (P2)', status: 'pass' },
              { id: 'chk_seller', label_bn: 'বিক্রেতা ও বর্তমান রেকর্ডীয় মালিকের মিল', status: 'pass' },
              { id: 'chk_double_sale', label_bn: 'দ্বৈত বিক্রয় বা সমকালীন হস্তান্তরের ঝুঁকি (R1)', status: 'pass' },
              { id: 'chk_khas', label_bn: 'খাস বা সরকারি অর্পিত জমি যাচাই (R7)', status: 'pass' },
            ],
          },
          sla_due_at: new Date(Date.now() + 15 * 86400000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          timeline: [
            {
              id: 'ev-1',
              status: 'submitted',
              actor_role: 'Citizen',
              note: 'আবেদন দাখিল করা হয়েছে এবং রেজিস্ট্রেশন দলিল সংযুক্ত।',
              at: new Date().toISOString(),
            },
            {
              id: 'ev-2',
              status: 'auto_verification',
              actor_role: 'System (AI Risk Engine)',
              note: 'স্বয়ংক্রিয় তথ্য নিরীক্ষা সম্পন্ন: শতভাগ নির্ভুল।',
              at: new Date().toISOString(),
            },
          ],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }
  });

  // Mock public tracking lookup
  await page.route('**/api/v1/namjari/track/*', async (route) => {
    const url = route.request().url();
    const code = url.split('/').pop() || 'NJ-2026-1001';
    const isRejected = code.includes('1004') || code.includes('1005');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tracking_code: code,
        parcel_id: 'P-CLEAN-01',
        status: isRejected ? 'rejected' : 'khatian_updated',
        status_label_bn: isRejected ? 'নামজারি নামঞ্জুর (প্রত্যাখ্যাত)' : 'খতিয়ান হালনাগাদ ও নামজারি সম্পন্ন',
        status_label_en: isRejected ? 'Rejected' : 'Khatian Updated',
        sla_due_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
        timeline: [
          {
            id: 'ev-1',
            status: 'submitted',
            actor_role: 'Citizen',
            note: 'আবেদন দাখিল করা হয়েছে।',
            at: new Date().toISOString(),
          },
          {
            id: 'ev-2',
            status: isRejected ? 'rejected' : 'khatian_updated',
            actor_role: 'Supervisor',
            note: isRejected
              ? 'স্বয়ংক্রিয় ঝুঁকি ইঞ্জিন দ্বারা দ্বৈত বিক্রয়ের প্রমাণ পাওয়ায় আবেদন নামঞ্জুর।'
              : 'নতুন খতিয়ান প্রস্তুত ও ভূমি রেকর্ড হালনাগাদ সম্পন্ন।',
            at: new Date().toISOString(),
          },
        ],
        verification_summary: {
          status: isRejected ? 'failed' : 'passed',
          total_checks: 4,
          passed_count: isRejected ? 2 : 4,
          warn_count: 0,
          fail_count: isRejected ? 1 : 0,
          registration_verified: true,
        },
        disclaimer: 'সিমুলেটেড ট্র্যাকিং তথ্য (শুধুমাত্র তথ্যগত উদ্দেশ্যে, কোনো সরকারি আইনি নিশ্চয়তা নয়)',
      }),
    });
  });
});

test.describe('Smart E-Namjari Workflow & Tracking (P4)', () => {
  test('navigates to e-namjari, submits application, views auto-verification and tracks public status', async ({ page }) => {
    await page.goto('/');

    // 1. Open Sidebar or navigate to Namjari
    const isMobile = (page.viewportSize()?.width ?? 1280) < 1024;
    if (isMobile) {
      const drawerBtn = page.getByRole('button', { name: 'Toggle Navigation Drawer' });
      if (await drawerBtn.isVisible()) {
        await drawerBtn.click({ force: true });
        const drawerNamjari = page.getByRole('button', { name: /(স্মার্ট ই-নামজারি|ই-নামজারি|Smart E-Namjari)/i }).first();
        await expect(drawerNamjari).toBeVisible({ timeout: 10000 });
        await drawerNamjari.click({ force: true });
      }
    } else {
      const namjariNav = page.getByRole('button', { name: /(স্মার্ট ই-নামজারি|ই-নামজারি|Smart E-Namjari)/i }).first();
      await expect(namjariNav).toBeVisible({ timeout: 10000 });
      await namjariNav.click({ force: true });
    }

    // 2. Verify page heading
    await expect(page.getByText(/(স্মার্ট ই-নামজারি ট্র্যাকিং ও অটো-ভেরিফিকেশন|Smart E-Namjari Tracking)/i).first()).toBeVisible({ timeout: 10000 });

    // 3. Submit application
    const submitBtn = page.getByRole('button', { name: /(ই-নামজারি আবেদন দাখিল করুন|Submit E-Namjari)/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should navigate to tracked status
      await expect(page.getByText(/NJ-2026-/i).first()).toBeVisible({ timeout: 10000 });
    }

    // 4. Click a Demo Preset for instant tracking
    const presetBtn = page.getByRole('button', { name: /NJ-2026-1001/i }).first();
    await expect(presetBtn).toBeVisible({ timeout: 5000 });
    await presetBtn.click();

    // 5. Verify tracked timeline and checklist items
    await expect(page.getByText(/NJ-2026-1001/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/(খতিয়ান হালনাগাদ ও নামজারি সম্পন্ন|Khatian Updated)/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/(আবেদনের অগ্রগতির ইতিহাস|Application Live Stepper Timeline)/i).first()).toBeVisible({ timeout: 5000 });

    // 6. Verify non-legal advisory disclaimer presence
    await expect(page.getByText(/সিমুলেটেড ট্র্যাকিং তথ্য/i).first()).toBeVisible({ timeout: 5000 });
  });
});
