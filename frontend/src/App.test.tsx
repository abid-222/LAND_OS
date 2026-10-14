import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Bangladesh LandOS Frontend', () => {
  beforeEach(() => {
    // Mock health API response
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/health')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'healthy',
              service: 'Bangladesh LandOS',
              environment: 'test',
              version: '1.0.0',
              timestamp: '2026-10-15T00:00:00Z',
              checks: {
                status: 'ready',
                database_connected: true,
                redis_connected: true,
                details: { database: 'connected', redis: 'connected' },
              },
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it('renders application brand header and mobile scan-to-search card', async () => {
    render(<App />);

    // Brand title
    expect(screen.getByText('বাংলাদেশ ল্যান্ডওএস')).toBeInTheDocument();

    // Scan to search prompt
    expect(screen.getByText('দলিল বা খতিয়ান স্ক্যান করুন')).toBeInTheDocument();

    // Legal disclaimer banner
    expect(
      screen.getByText('প্রদর্শিত নকশা ও সীমানা শুধুমাত্র উদাহরণের জন্য / এটি কোনো আইনি সীমানা নয়।')
    ).toBeInTheDocument();

    // Health card renders
    const healthCard = screen.getByTestId('health-status-card');
    expect(healthCard).toBeInTheDocument();
  });

  it('renders epistemic trust badge status indicators', async () => {
    render(<App />);

    expect(screen.getByTestId('trust-badge-OCR_EXTRACTED')).toBeInTheDocument();
    expect(screen.getByTestId('trust-badge-VERIFIED_AUTHORIZED_SOURCE')).toBeInTheDocument();
    expect(screen.getByTestId('trust-badge-VERIFICATION_REQUIRED')).toBeInTheDocument();
  });
});
