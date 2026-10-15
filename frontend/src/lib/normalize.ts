/**
 * Client-side Identifier & Mouza Normalization Engine for Bangladesh LandOS.
 * Mirrors backend/app/core/normalize.py and validates against shared test vectors.
 *
 * Pipeline:
 * 1. Unicode NFC; strip zero-width chars (U+200B, U+200C, U+200D, U+FEFF); NBSP -> space.
 * 2. Strip label prefixes (e.g., দাগ নং, Dag:, etc.).
 * 3. Map Bangla digits U+09E6..U+09EF to ASCII 0-9.
 * 4. Strip ALL whitespace inside numeric identifiers; unify separators ( / \ - . | । ) to "/".
 * 5. OCR confusable repair (O/o->0, l/I/|/।->1, S->5, B->8) with repaired flag & confidence penalty.
 * 6. Strip leading zeros per numeric part.
 * 7. Validate with regex (defaults: dag_no, khatian_no, document_no).
 * 8. Output ParsedIdentifier / NormalizedId.
 */

export interface ParsedIdentifier {
  rawValue: string;
  normalizedValue: string | null;
  mainNo: number | null;
  subNo: number | null;
  isValid: boolean;
  repaired?: boolean;
  confidence?: number;
  status?: 'valid' | 'repaired' | 'invalid';
  flagged?: boolean;
  flagReason?: string | null;
}

export type NormalizedId = ParsedIdentifier;

const ZERO_WIDTH_REGEX = /(?:\u200B|\u200C|\u200D|\uFEFF)/g;

const BANGLA_DIGIT_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const SEPARATOR_REGEX = /[/\\.\-—|।]+/g;

const PREFIX_REGEX =
  /^(?:দাগ\s*নং|খতিয়ান\s*নং|খতিয়ান\s*নং|দলিল\s*নং|দাগ|খতিয়ান|খতিয়ান|দলিল|dag\s*no\.?|dag:|dag|khatian\s*no\.?|khatian:|khatian|নং[:\-\s]*|no\.?[:\s]*)\s*[:\-.]*\s*/i;

const CONFUSABLE_MAP: Record<string, string> = {
  O: '0',
  o: '0',
  l: '1',
  I: '1',
  '|': '1',
  '।': '1',
  S: '5',
  s: '5',
  B: '8',
  Z: '2',
  z: '2',
};

const PATTERNS: Record<string, RegExp> = {
  dag_no: /^(?<main>\d{1,5})(?:\/(?<sub>\d{1,4}))?$/,
  khatian_no: /^(?<main>\d{1,6})(?:\/(?<sub>\d{1,3}))?$/,
  document_no: /^(?<main>\d{1,7})(?:\/(?<sub>\d{1,4}))?$/,
};

export function normalizeIdentifier(
  raw: string,
  patternType: 'dag_no' | 'khatian_no' | 'document_no' = 'dag_no',
  mouzaMaxNo?: number,
  baseConfidence: number = 1.0
): ParsedIdentifier {
  if (raw === null || raw === undefined || !String(raw).trim()) {
    return {
      rawValue: raw ?? '',
      normalizedValue: null,
      mainNo: null,
      subNo: null,
      isValid: false,
      repaired: false,
      confidence: 0,
      status: 'invalid',
      flagged: true,
      flagReason: 'EMPTY_INPUT',
    };
  }

  // 1. Unicode NFC; strip zero-width chars; NBSP -> space
  let text = String(raw).normalize('NFC').replace(ZERO_WIDTH_REGEX, '').replace(/\u00A0/g, ' ').trim();

  if (!text) {
    return {
      rawValue: raw,
      normalizedValue: null,
      mainNo: null,
      subNo: null,
      isValid: false,
      repaired: false,
      confidence: 0,
      status: 'invalid',
      flagged: true,
      flagReason: 'EMPTY_INPUT',
    };
  }

  // Strip prefix labels
  text = text.replace(PREFIX_REGEX, '').trim();

  // 2. Map Bangla digits U+09E6..U+09EF to ASCII 0-9
  text = text.replace(/[০-৯]/g, (ch) => BANGLA_DIGIT_MAP[ch] || ch);

  // 3. Unify separators ( / \ - . | । ) to "/" and strip ALL whitespace inside
  text = text.replace(SEPARATOR_REGEX, '/').replace(/\s+/g, '');

  // Strip trailing slash
  if (text.endsWith('/')) {
    text = text.slice(0, -1);
  }

  if (!text || text === '/') {
    return {
      rawValue: raw,
      normalizedValue: null,
      mainNo: null,
      subNo: null,
      isValid: false,
      repaired: false,
      confidence: 0,
      status: 'invalid',
      flagged: true,
      flagReason: 'INVALID_FORMAT',
    };
  }

  // 4. OCR confusable repair ONLY where digits are expected
  let repaired = false;
  let repairedChars = 0;
  const cleanChars: string[] = [];

  for (const char of text) {
    if (/[0-9/]/.test(char)) {
      cleanChars.push(char);
    } else if (CONFUSABLE_MAP[char] !== undefined) {
      cleanChars.push(CONFUSABLE_MAP[char]);
      repaired = true;
      repairedChars += 1;
    } else {
      cleanChars.push(char);
    }
  }

  text = cleanChars.join('');

  // 5. Strip leading zeros per numeric part
  const parts = text.split('/');
  if (parts.length > 2) {
    return {
      rawValue: raw,
      normalizedValue: null,
      mainNo: null,
      subNo: null,
      isValid: false,
      repaired,
      confidence: 0,
      status: 'invalid',
      flagged: true,
      flagReason: 'TOO_MANY_PARTS',
    };
  }

  const strippedParts = parts.map((p) => {
    if (/^\d+$/.test(p)) {
      const stripped = p.replace(/^0+/, '');
      return stripped.length > 0 ? stripped : '0';
    }
    return p;
  });

  const normalizedCandidate = strippedParts.join('/');

  // 6. Validate with regex
  const regex = PATTERNS[patternType] || PATTERNS.dag_no;
  const match = normalizedCandidate.match(regex);

  if (!match) {
    return {
      rawValue: raw,
      normalizedValue: null,
      mainNo: null,
      subNo: null,
      isValid: false,
      repaired,
      confidence: 0,
      status: 'invalid',
      flagged: true,
      flagReason: 'REGEX_MISMATCH',
    };
  }

  const mainVal = parseInt(match.groups?.main || match[1], 10);
  const subVal = match.groups?.sub ? parseInt(match.groups.sub, 10) : null;
  const canonical = subVal !== null ? `${mainVal}/${subVal}` : `${mainVal}`;

  // 7. Plausibility check
  let flagged = false;
  let flagReason: string | null = null;
  if (mainVal < 1 || mainVal > 99999 || (mouzaMaxNo && mainVal > mouzaMaxNo)) {
    flagged = true;
    flagReason = 'implausible';
  }

  // Confidence computation
  let confidence = baseConfidence;
  if (repaired) {
    confidence = Math.max(0.5, confidence - 0.15 * repairedChars);
  }

  const status = repaired ? 'repaired' : 'valid';

  if (status !== 'valid' || repaired || confidence < 0.8) {
    flagged = true;
    if (!flagReason) {
      flagReason = 'LOW_CONFIDENCE_OR_REPAIRED';
    }
  }

  return {
    rawValue: raw,
    normalizedValue: canonical,
    mainNo: mainVal,
    subNo: subVal,
    isValid: true,
    repaired,
    confidence: Math.round(confidence * 100) / 100,
    status,
    flagged,
    flagReason,
  };
}
