import { test, expect } from '@playwright/test';
import path from 'path';

const screensDir = path.resolve(process.cwd(), '../docs/screens');

test.describe('Mobile Viewport Evidence Screenshots', () => {
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
          id: 'u-citizen',
          email: 'citizen@landos.gov.bd',
          full_name_bn: 'মো. রফিকুল ইসলাম',
          role: 'Citizen',
          is_active: true,
        }),
      });
    });
  });

  test('captures mobile evidence screenshots', async ({ page }) => {
    // 1. Home Screen
    await page.goto('/');
    await expect(page.getByText('বাংলাদেশ ল্যান্ডওএস')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(screensDir, '01_home_mobile.png'), fullPage: true });

    // 2. Scan Screen (Camera Explainer with QR-first)
    const scanNavBtn = page.getByRole('button', { name: 'স্ক্যান', exact: true });
    await scanNavBtn.click();
    await expect(page.getByText('দলিল বা খতিয়ান স্ক্যান')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(screensDir, '02_scan_explainer_mobile.png') });

    // 3. Map Screen (3D/2D toggle + permanent legal disclaimer banner)
    const mapNavBtn = page.getByRole('button', { name: 'মানচিত্র', exact: true });
    await mapNavBtn.click();
    await expect(page.getByText('Illustrative / Not a legal boundary')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(screensDir, '03_map_mobile.png') });

    // 4. Forbidden 403 Screen (Triggered by accessing quality lab as Citizen)
    const roleSelector = page.getByRole('button', { name: 'Role selector' });
    await roleSelector.click();
    const techAdminOption = page.getByText('টেক অ্যাডমিন (Tech Admin)');
    if (await techAdminOption.isVisible()) {
      await techAdminOption.click();
      await expect(page.getByText('অনুমোদন নেই (403 Forbidden)')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: path.join(screensDir, '04_forbidden_403.png') });
    }
  });

  test('captures Accuracy Lab and Buyer Report evidence screenshots', async ({ page }) => {
    // Mock Tech Admin session for Accuracy Lab
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-tech-admin',
          email: 'admin@landos.gov.bd',
          full_name_bn: 'সিস্টেম অ্যাডমিন',
          role: 'Tech Admin',
          is_active: true,
        }),
      });
    });

    await page.route('**/api/v1/eval/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          summary: {
            cer_dag_no: 0.012,
            cer_khatian_no: 0.018,
            cer_mouza: 0.009,
            fea_dag_no: 0.985,
            fea_khatian_no: 0.978,
            fea_mouza: 0.992,
            critical_field_fea: 0.985,
            silent_error_rate: 0.008,
            flag_recall: 0.965,
            gate_pass: true,
          },
        }),
      });
    });

    await page.goto('/');
    await expect(page.getByText('নির্ভুলতা ও নির্ভরযোগ্যতা ল্যাব')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(screensDir, '05_accuracy_lab.png'), fullPage: true });
  });

  test('captures Buyer Risk Report mobile screenshot', async ({ page }) => {
    await page.goto('/');
    const mapNavBtn = page.getByRole('button', { name: 'মানচিত্র', exact: true });
    await mapNavBtn.click();
    await expect(page.getByText('Illustrative / Not a legal boundary')).toBeVisible({ timeout: 10000 });

    // Click parcel pill directly to select parcel and open bottom sheet
    await page.getByRole('button', { name: 'P-4520' }).click();

    // Click view buyer report in bottom sheet
    const viewReportBtn = page.getByRole('button', { name: 'ক্রেতা রিপোর্ট দেখুন' });
    await expect(viewReportBtn).toBeVisible({ timeout: 10000 });
    await viewReportBtn.click();

    await expect(page.getByText('ক্রেতা ঝুঁকি ও তথ্য অনুসন্ধান প্রতিবেদন')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(screensDir, '06_buyer_report_mobile.png'), fullPage: true });
  });
});
