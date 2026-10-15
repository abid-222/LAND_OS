/**
 * k6 Load Test Script for Bangladesh LandOS
 * Scenarios:
 * 1. Search Query: POST /api/v1/search (multilingual, dag/khatian/mouza)
 * 2. Document Upload: POST /api/v1/documents (multipart JPEG with magic bytes)
 *
 * Execution:
 *   k6 run infra/k6_load_test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
export const searchDuration = new Trend('search_duration_ms');
export const uploadDuration = new Trend('upload_duration_ms');
export const errorRate = new Rate('error_rate');
export const successCount = new Counter('successful_requests');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 VUs
    { duration: '1m',  target: 50 },  // Stay at 50 VUs (load peak)
    { duration: '30s', target: 100 }, // Stress peak at 100 VUs
    { duration: '20s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'], // 95% of requests under 400ms
    error_rate: ['rate<0.01'],                     // Error rate under 1.0%
    search_duration_ms: ['p(50)<80', 'p(95)<250'],
    upload_duration_ms: ['p(50)<150', 'p(95)<450'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'DEMO_CITIZEN_TOKEN';

// Minimal 64x64 valid JPEG binary representation
const SAMPLE_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAEAAQBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

export default function () {
  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };

  group('1. Land Record Multi-Identifier Search', function () {
    const searchPayload = JSON.stringify({
      dag_no: '১২০৫',
      khatian_no: '৩৪০',
      mouza: 'তেজগাঁও',
      limit: 10,
    });

    const res = http.post(`${BASE_URL}/api/v1/search`, searchPayload, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });

    searchDuration.add(res.timings.duration);
    const success = check(res, {
      'search status is 200': (r) => r.status === 200,
      'search returns candidates': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.candidates);
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    if (success) successCount.add(1);
  });

  sleep(0.5);

  group('2. Document Upload & Ingestion', function () {
    const payload = {
      file: http.file(SAMPLE_JPEG_BASE64, 'khatian_sample.jpg', 'image/jpeg'),
    };

    const res = http.post(`${BASE_URL}/api/v1/documents`, payload, {
      headers,
    });

    uploadDuration.add(res.timings.duration);
    const success = check(res, {
      'upload status is 200': (r) => r.status === 200,
      'magic bytes verified': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.magic_bytes_verified === true;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
    if (success) successCount.add(1);
  });

  sleep(1);
}
