import { describe, it, expect } from 'vitest';
import { normalizeIdentifier, normalizeSpokenBengali, parseVoiceCommand } from './normalize';
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

  it('normalizes spoken Bengali numerals and words', () => {
    expect(normalizeSpokenBengali('চার পাঁচ দুই শূন্য')).toBe('4 5 2 0');
    expect(normalizeSpokenBengali('দাগ নং ৪১২')).toBe('দাগ নং 412');
    expect(normalizeSpokenBengali('খতিয়ান ১২০')).toBe('খতিয়ান 120');

    // Voice command: buyer report
    const cmd1 = parseVoiceCommand('জমি কেনার আগে যাচাই করুন পার্সেল P-4520');
    expect(cmd1.intent).toBe('buyer_report');
    expect(cmd1.parcelId).toBe('P-4520');

    // Voice command: namjari track
    const cmd2 = parseVoiceCommand('আমার নামজারি আবেদন NJ-2026-1001 কোথায়');
    expect(cmd2.intent).toBe('namjari_track');
    expect(cmd2.trackingCode).toBe('NJ-2026-1001');

    // Voice command: parcel watch
    const cmd3 = parseVoiceCommand('পার্সেল P-CLEAN-01 এর গার্ডিয়ান ওয়াচ চালু করুন');
    expect(cmd3.intent).toBe('parcel_watch');
    expect(cmd3.parcelId).toBe('P-CLEAN-01');

    // Voice command: record search
    const cmd4 = parseVoiceCommand('দাগ নম্বর ৪১২ এবং খতিয়ান ১২০ অনুসন্ধান');
    expect(cmd4.intent).toBe('search_record');
    expect(cmd4.dagNo).toBe('412');
    expect(cmd4.khatianNo).toBe('120');
  });
});
