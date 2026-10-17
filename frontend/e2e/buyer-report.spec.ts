import { test, expect } from '@playwright/test';

// Valid 1x1 test JPEG with full EXIF, Huffman, quantization and scan tables
const validTestJpegBuffer = Buffer.from([
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

  await page.route('**/api/v1/parcels/*/buyer-report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'rep-demo-001',
        parcel_id: 'P-4520',
        generated_at: new Date().toISOString(),
        sections: {
          parcel_summary: {
            synthetic_id: 'P-4520',
            mouza: 'তেজগাঁও',
            main_no: '৪৫২০',
            sub_no: '১',
            land_type: 'নাল (কৃষি জমি)',
            area_decimal: 15.5,
            area_acres: 0.155,
            boundary_note: 'Illustrative / Not a legal boundary',
          },
          matching_records: [
            {
              record_id: 'rec-001',
              khatian_no: '১২০৫',
              dag_no: '৪৫২০',
              owner_names: 'আব্দুল করিম',
              similarity_score: 1.0,
              reasons: ['দাগ ও খতিয়ান নম্বর বালাম বইয়ের সাথে হুবহু মিলেছে'],
              status_label: 'VERIFIED_AUTHORIZED_SOURCE',
              source: 'ডিজিটাল আরএস বালাম বই',
              retrieved_at: new Date().toISOString(),
            },
          ],
          document_conflicts: {
            counts: { high: 1, warn: 1, info: 1, total: 3 },
            alerts: [
              {
                rule_id: 'R_AREA_MISMATCH',
                severity: 'high',
                title_bn: 'জমির পরিমাণের তারতম্য নির্দেশক',
                reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: দলিলের জমির পরিমাণ বালাম রেকর্ডের পরিমাণের চেয়ে ১৭ শতক বেশি।',
                evidence: [
                  { doc_type: 'দলিল', field_name: 'area_acres', extracted_value: '০.৫০ একর', details: 'দলিলের তফসিল' },
                  { doc_type: 'খতিয়ান', field_name: 'area_acres', extracted_value: '০.৩৩ একর', details: 'বালাম বহি' },
                ],
              },
            ],
          },
          missing_evidence: {
            checklist_title: 'নমুনা তালিকা',
            sample_disclaimer: 'এটি একটি নমুনা তালিকা (SAMPLE)। সরকারি বা আইনি আবশ্যিক শর্ত নয়।',
            total_required: 5,
            attached_count: 3,
            items: [
              { doc_type: 'khatian', title_bn: 'মূল খতিয়ান', status: 'attached', status_bn: 'সংযুক্ত রয়েছে', mandatory_for_purchase: true },
              { doc_type: 'deed', title_bn: 'বায়া দলিল', status: 'attached', status_bn: 'সংযুক্ত রয়েছে', mandatory_for_purchase: true },
              { doc_type: 'mutation', title_bn: 'নামজারি পরচা', status: 'not_attached', status_bn: 'সংযুক্ত নেই (যাচাই আবশ্যক)', mandatory_for_purchase: true },
            ],
          },
          next_steps: {
            title: 'আইনি ও দাপ্তরিক পরবর্তী করণীয়',
            items: [
              {
                id: 'ns-1',
                title: 'উপজেলা ভূমি অফিসে রেকর্ড যাচাই',
                step_text: 'মূল বালাম বইয়ের সাথে রেকর্ড মিলিয়ে নিন।',
                source: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর সহায়িকা ২০২৪',
                last_verified_at: '2026-03-01T00:00:00Z',
                needs_verification: false,
              },
            ],
          },
          disclaimer: {
            primary_text: 'তথ্য যাচাই প্রয়োজন — ডেমো পরীক্ষামূলক প্রতিবেদন',
            version: 'v1.0-epistemic-gov',
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/parcels/*/alerts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'alt-demo-1',
          parcel_id: 'P-4520',
          rule_id: 'R_DEMO_ALERT',
          severity: 'high',
          title_bn: 'জমির পরিমাণের উল্লেখযোগ্য তারতম্য',
          reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: দলিলের জমির পরিমাণ বালাম রেকর্ডের চেয়ে বেশি।',
          status: 'active',
          created_at: new Date().toISOString(),
          evidence: [
            {
              doc_type: 'দলিল',
              field_name: 'area_acres',
              field_name_bn: 'জমির ক্ষেত্রফল',
              extracted_value: '০.৫০ একর',
              details: 'সাব-রেজিস্ট্রি দলিল',
            },
          ],
        },
      ]),
    });
  });
});

test.describe('Buyer Risk Report & Parcel Alerts Flow (Mobile-First)', () => {
  test('pick demo plot -> bottom sheet alert count -> view report -> open alert evidence', async ({ page, isMobile }) => {
    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/বাংলাদেশ ল্যান্ডওএস/);

    // 2. Navigate to Map via Mobile Bottom Navigation or Sidebar
    if (isMobile) {
      const bottomNav = page.getByRole('navigation', { name: 'Mobile Bottom Navigation' });
      const mapNavBtn = bottomNav.getByRole('button', { name: 'মানচিত্র' });
      await expect(mapNavBtn).toBeVisible({ timeout: 15000 });
      await mapNavBtn.click({ force: true });
    } else {
      const mapSideBtn = page.getByRole('button', { name: /৩ডি ক্যাডাস্ট্রাল ম্যাপ|মানচিত্র/ }).first();
      await expect(mapSideBtn).toBeVisible({ timeout: 15000 });
      await mapSideBtn.click();
    }

    // Verify Map Page loaded
    await expect(
      page.getByText(/মানচিত্রটি শুধুমাত্র ধারণাগত \/ কোনো আইনি সীমানা নির্দেশ করে না/i)
    ).toBeVisible({ timeout: 15000 });

    // 3. Pick demo plot from quick demo selector: P-4520 (তেজগাঁও)
    const demoPlotBtn = page.getByRole('button', { name: /P-4520/i });
    await expect(demoPlotBtn).toBeVisible({ timeout: 10000 });
    await demoPlotBtn.click();

    // 4. Verify Parcel Bottom Sheet appears
    await expect(page.getByText('আইডি: P-4520')).toBeVisible({ timeout: 10000 });
    // Verify alert-count line is displayed in bottom sheet
    await expect(page.getByText('যাচাই প্রয়োজন:')).toBeVisible();
    await expect(page.getByText(/সতর্কতা:/)).toBeVisible();

    // 5. Click "ক্রেতা রিপোর্ট দেখুন" (View Buyer Report) button in bottom sheet
    const viewReportBtn = page.getByRole('button', { name: 'ক্রেতা রিপোর্ট দেখুন' });
    await expect(viewReportBtn).toBeVisible();
    await viewReportBtn.click({ force: true });

    // 6. Verify Buyer Risk Report Page loads with all 5 sections
    await expect(page.getByText('ক্রেতা ঝুঁকি ও তথ্য অনুসন্ধান প্রতিবেদন')).toBeVisible({ timeout: 15000 });

    // Fixed Disclaimer Banner (.first() ensures strict mode compliance)
    await expect(
      page.getByText(/তথ্য যাচাই প্রয়োজন — ডেমো পরীক্ষামূলক প্রতিবেদন|তথ্য যাচাই প্রয়োজন\. এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়/i).first()
    ).toBeVisible();

    // Section 1: Parcel Summary
    await expect(page.getByText(/পার্সেল পরিচিতি ও জমির বিবরণ/)).toBeVisible();
    await expect(page.getByText(/Illustrative \/ Not a legal boundary/i)).toBeVisible();

    // Matching Records
    await expect(page.getByText(/ম্যাচিং সরকারি খতিয়ান রেকর্ড/)).toBeVisible();

    // Document Conflicts (Counts by severity, strictly no overall score)
    await expect(page.getByText(/দলিল ও রেকর্ড সংক্রান্ত সম্ভাব্য অসঙ্গতি/)).toBeVisible();
    await expect(page.getByText('উচ্চ মনোযোগ').first()).toBeVisible();
    await expect(page.getByText('সতর্কতা').first()).toBeVisible();

    // Missing Evidence Checklist (Sample)
    await expect(page.getByText(/প্রয়োজনীয় দলিলের নমুনা যাচাই তালিকা/)).toBeVisible();
    await expect(page.getByText('SAMPLE').first()).toBeVisible();

    // Next Steps / Action Checklist
    await expect(page.getByText(/(আইনি ও দাপ্তরিক পরবর্তী করণীয়|কেনার পূর্বে করণীয় অ্যাকশন চেকলিস্ট)/).first()).toBeVisible();

    // Verify Print & Share buttons are visible
    await expect(page.getByTitle('লিংক শেয়ার করুন')).toBeVisible();
    await expect(page.getByTitle('প্রিন্ট বা পিডিএফ সংরক্ষণ')).toBeVisible();

    // 7. Open an alert's expandable evidence section
    const evidenceToggleBtn = page.getByRole('button', { name: /প্রমাণাদি \(\d+ টি\)/ }).first();
    await expect(evidenceToggleBtn).toBeVisible();
    await evidenceToggleBtn.click();

    // Verify evidence items are visible inside the expanded container
    await expect(page.getByText(/০\.৫০ একর|দলিলের তফসিল/).first()).toBeVisible();

    // 8. Navigate to full Parcel Alerts list screen
    const allAlertsLink = page.getByRole('button', { name: 'সকল অ্যালার্ট' });
    await expect(allAlertsLink).toBeVisible();
    await allAlertsLink.click();

    // Verify Parcel Alerts Page loaded
    await expect(page.getByText('পার্সেল সতর্কতা ও অসঙ্গতি তালিকা')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('পার্সেল আইডি: P-4520')).toBeVisible();
    await expect(page.getByText('অসঙ্গতি মূল্যায়ন নীতি:').first()).toBeVisible();

    // Open evidence in parcel alerts screen as well
    const alertsEvidenceBtn = page.getByRole('button', { name: /প্রমাণ ও সংশ্লিষ্ট নথি/ }).first();
    await expect(alertsEvidenceBtn).toBeVisible();
    await alertsEvidenceBtn.click();
    await expect(page.getByText(/মান:/).first()).toBeVisible();
  });

  test('verifies document type change and verification comparison screen', async ({ page, isMobile }) => {
    // Setup document creation & extraction mocks
    await page.route('**/api/v1/documents*', async (route) => {
      const url = route.request().url();
      if (url.includes('/extraction') || url.includes('/fields')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            document_id: 'doc-verify-001',
            doc_type: 'khatian',
            status_label: 'OCR_EXTRACTED',
            review_case_id: 'REV-CASE-888',
            fields: [
              {
                id: 'f1',
                field_name: 'khatian_no',
                raw_value: '৩৪০',
                normalized_value: '340',
                confidence: 0.98,
                flagged: false,
                user_corrected: false,
                status_label: 'OCR_EXTRACTED',
              },
              {
                id: 'f2',
                field_name: 'dag_no',
                raw_value: '১২০৫',
                normalized_value: '1205',
                confidence: 0.48,
                flagged: true,
                flag_reason: 'কম আত্মবিশ্বাস ও ঝাপসা লেখা',
                user_corrected: false,
                status_label: 'VERIFICATION_REQUIRED',
              },
              {
                id: 'f3',
                field_name: 'area_acres',
                raw_value: '০.৩৩ একর',
                normalized_value: '0.33',
                confidence: 0.92,
                flagged: false,
                user_corrected: false,
                status_label: 'OCR_EXTRACTED',
                original_unit: 'শতক / একর',
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'doc-verify-001',
            document_id: 'doc-verify-001',
            status: 'completed',
          }),
        });
      }
    });

    await page.route('**/api/v1/documents/*/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          document_id: 'doc-verify-001',
          record_id: 'REC-TG-001',
          status_label: 'POSSIBLE_MATCH',
          verified_at: new Date().toISOString(),
          comparisons: [
            {
              field: 'khatian_no',
              field_name_bn: 'খতিয়ান নম্বর',
              doc_value: '৩৪০',
              record_value: '৩৪০',
              result: 'exact',
              note_bn: 'খতিয়ান নম্বর মিলেছে',
            },
            {
              field: 'dag_no',
              field_name_bn: 'দাগ নম্বর',
              doc_value: '১২০৫',
              record_value: '১২০৫',
              result: 'exact',
              note_bn: 'দাগ নম্বর মিলেছে',
            },
          ],
          qr_integrity: {
            payload_type: 'sha256',
            hash_alg: 'sha256',
            hash_match: true,
            scope: 'integrity_only',
            scope_text: 'নথির তথ্য QR-এর সঙ্গে যাচাই শুধুমাত্র অখণ্ডতার প্রমাণ (মালিকানা বা স্বত্ব যাচাই নয়)।',
            ui_text_bn: 'নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)',
          },
        }),
      });
    });

    // 1. Visit Home
    await page.goto('/');

    // 2. Start scan flow
    const scanBtn = page.getByRole('button', { name: /(দলিল স্ক্যান|ডিজিটাল স্ক্যান ও ওসিআর|স্ক্যান)/ }).first();
    await expect(scanBtn).toBeVisible({ timeout: 15000 });
    await scanBtn.click({ force: true });

    // 3. Upload a test image
    await page.locator('input[type="file"]').setInputFiles({
      name: 'khatian_sample.jpg',
      mimeType: 'image/jpeg',
      buffer: validTestJpegBuffer,
    });

    const proceedBtn = page.getByRole('button', { name: /(পরবর্তী ধাপে যান|তবুও ব্যবহার করুন)/ });
    await expect(proceedBtn).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);
    await proceedBtn.click();
    // If still visible after a moment (WebKit event handling), click again
    if (await proceedBtn.isVisible()) {
      await proceedBtn.click({ force: true });
    }

    // 4. Confirm page: Check Document Type buttons (দলিল / খতিয়ান / পর্চা)
    await expect(page.getByText(/(স্বয়ংক্রিয় ওসিআর পাঠোদ্ধার ও যাচাইকরণ|Automated OCR Extraction)/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'দলিল' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'খতিয়ান' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'পর্চা' })).toBeVisible();

    // Verify "কম নিশ্চিত তথ্য: মানবীয় যাচাই লাগবে" banner
    await expect(page.getByText('কম নিশ্চিত তথ্য: মানবীয় যাচাই লাগবে')).toBeVisible();

    // Click Deed type
    await page.getByRole('button', { name: 'দলিল' }).click();

    // 5. Click "রেকর্ড মিল যাচাই" to navigate to Verification Comparison Screen
    const verifyBtn = page.getByRole('button', { name: 'রেকর্ড মিল যাচাই' });
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.scrollIntoViewIfNeeded();
    await verifyBtn.click();

    // 6. Verification Comparison Screen assertions
    await expect(page.getByText('নথির সত্যতা ও তুলনামূলক যাচাই')).toBeVisible({ timeout: 15000 });

    // Separate QR Integrity Card with exact scoped text
    await expect(page.getByText('QR ইন্টিগ্রিটি অখণ্ডতা পরীক্ষা')).toBeVisible();
    await expect(
      page.getByText('নথির তথ্য QR-এর সঙ্গে যাচাই শুধুমাত্র অখণ্ডতার প্রমাণ (মালিকানা বা স্বত্ব যাচাই নয়)।')
    ).toBeVisible();

    // Comparison result chips
    await expect(page.getByText(/মিলেছে|কাছাকাছি|মেলেনি/).first()).toBeVisible();
  });
});
