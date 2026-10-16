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

  it('renders application brand header and mobile 4 large actions', async () => {
    render(<App />);

    // Brand title
    expect(screen.getByText('বাংলাদেশ ল্যান্ডওএস')).toBeInTheDocument();

    // 4 large actions resolved after lazy import
    expect(await screen.findByText('দলিল স্ক্যান', {}, { timeout: 6000 })).toBeInTheDocument();
    expect(await screen.findByText('রেকর্ড অনুসন্ধান', {}, { timeout: 6000 })).toBeInTheDocument();
    expect(await screen.findByText('ভূমি সেবা', {}, { timeout: 6000 })).toBeInTheDocument();
    expect(await screen.findByText('আমার আবেদন', {}, { timeout: 6000 })).toBeInTheDocument();

    // Legal disclaimer banner
    expect(
      await screen.findByText('Illustrative / Not a legal boundary. উদাহরণ মাত্র, আইনি সীমানা নয়. Heights are illustrative.', {}, { timeout: 6000 })
    ).toBeInTheDocument();
  });

  it('renders epistemic trust badge status indicators', async () => {
    render(<App />);

    expect(await screen.findByTestId('trust-badge-OCR_EXTRACTED')).toBeInTheDocument();
    expect(await screen.findByTestId('trust-badge-VERIFIED_AUTHORIZED_SOURCE')).toBeInTheDocument();
    expect(await screen.findByTestId('trust-badge-VERIFICATION_REQUIRED')).toBeInTheDocument();
  });
});
