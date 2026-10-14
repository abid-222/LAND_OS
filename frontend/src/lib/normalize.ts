/**
 * Client-side Identifier Normalization Engine (Contract Stub for Prompt 4).
 * Handles Dag & Khatian canonical representations in mobile browser.
 */

export interface ParsedIdentifier {
  rawValue: string;
  normalizedValue: string | null;
  mainNo: number | null;
  subNo: number | null;
  isValid: boolean;
  repaired?: boolean;
  flagReason?: string | null;
}

export function normalizeIdentifier(
  raw: string,
  _patternType: 'dag_no' | 'khatian_no' = 'dag_no'
): ParsedIdentifier {
  if (!raw || !raw.trim()) {
    return {
      rawValue: raw,
      normalizedValue: null,
      mainNo: null,
      subNo: null,
      isValid: false,
      flagReason: 'EMPTY_INPUT',
    };
  }

  // Contract stub: Full normalization engine to be implemented in Prompt 4
  return {
    rawValue: raw,
    normalizedValue: null,
    mainNo: null,
    subNo: null,
    isValid: false,
    flagReason: 'NOT_IMPLEMENTED_UNTIL_PROMPT_4',
  };
}
