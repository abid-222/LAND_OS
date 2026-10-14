import { describe, it, expect } from 'vitest';
import { normalizeIdentifier } from './normalize';
import testCases from '../../../data/normalize_cases.json';

describe('normalizeIdentifier Contract', () => {
  it.fails(
    'contract test: normalizes cases from data/normalize_cases.json (to be implemented in Prompt 4)',
    () => {
      for (const c of testCases) {
        const res = normalizeIdentifier(c.raw);
        expect(res.normalizedValue).toBe(c.expected_normalized);
        expect(res.mainNo).toBe(c.main_no);
        expect(res.subNo).toBe(c.sub_no);
      }
    }
  );
});
