import { describe, it, expect } from 'vitest';
import { normalizeIdentifier } from './normalize';
import testCases from '../../../data/normalize_cases.json';

describe('normalizeIdentifier Shared Contract', () => {
  it('normalizes all 65 test cases from data/normalize_cases.json', () => {
    for (const c of testCases) {
      const res = normalizeIdentifier(c.raw, 'dag_no');
      expect(res.normalizedValue, `Failed for case ${c.id}: ${c.raw}`).toBe(c.expected_normalized);
      expect(res.mainNo, `Main no failed for case ${c.id}: ${c.raw}`).toBe(c.main_no);
      expect(res.subNo, `Sub no failed for case ${c.id}: ${c.raw}`).toBe(c.sub_no);
      if (c.expected_normalized !== null) {
        expect(res.isValid).toBe(true);
      } else {
        expect(res.isValid).toBe(false);
      }
    }
  });

  it('guarantees idempotency on all valid cases: normalize(normalize(x)) == normalize(x)', () => {
    for (const c of testCases) {
      if (c.expected_normalized !== null) {
        const first = normalizeIdentifier(c.raw, 'dag_no');
        expect(first.normalizedValue).not.toBeNull();
        const second = normalizeIdentifier(first.normalizedValue!, 'dag_no');
        expect(second.normalizedValue).toBe(first.normalizedValue);
        expect(second.mainNo).toBe(first.mainNo);
        expect(second.subNo).toBe(first.subNo);
      }
    }
  });

  it('marks OCR confusable repair and applies confidence penalty', () => {
    const res = normalizeIdentifier('O123', 'dag_no');
    expect(res.normalizedValue).toBe('123');
    expect(res.repaired).toBe(true);
    expect(res.status).toBe('repaired');
    expect(res.confidence).toBeLessThan(1.0);
  });

  it('flags implausible identifiers outside valid range', () => {
    const res = normalizeIdentifier('12345', 'dag_no', 5000);
    expect(res.normalizedValue).toBe('12345');
    expect(res.flagged).toBe(true);
    expect(res.flagReason).toBe('implausible');
  });
});
