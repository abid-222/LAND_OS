export type TrustStatus =
  | 'OCR_EXTRACTED'
  | 'POSSIBLE_MATCH'
  | 'USER_CORRECTED'
  | 'VERIFIED_AUTHORIZED_SOURCE'
  | 'VERIFICATION_REQUIRED';

export interface TrustBadgeConfig {
  labelBn: string;
  labelEn: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotClass: string;
  descriptionBn: string;
  descriptionEn: string;
}

export const TRUST_CONFIGS: Record<TrustStatus, TrustBadgeConfig> = {
  OCR_EXTRACTED: {
    labelBn: 'ওসিআর এক্সট্রাক্ট',
    labelEn: 'OCR EXTRACTED',
    bgClass: 'bg-sky-950/60',
    borderClass: 'border-sky-500/40',
    textClass: 'text-sky-300',
    dotClass: 'bg-sky-400',
    descriptionBn: 'সরাসরি ডকুমেন্ট থেকে অপটিক্যাল রিডারের মাধ্যমে প্রাপ্ত (অযাচাইকৃত)',
    descriptionEn: 'Direct optical character recognition output, unverified',
  },
  POSSIBLE_MATCH: {
    labelBn: 'সম্ভাব্য মিল',
    labelEn: 'POSSIBLE MATCH',
    bgClass: 'bg-amber-950/60',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300',
    dotClass: 'bg-amber-400',
    descriptionBn: 'ফাজি ট্রাইগ্রাম বা অ্যালগরিদম দ্বারা প্রাপ্ত সম্ভাব্য রেকর্ড',
    descriptionEn: 'Algorithmic or fuzzy match based on character similarity',
  },
  USER_CORRECTED: {
    labelBn: 'ব্যবহারকারী সংশোধিত',
    labelEn: 'USER CORRECTED',
    bgClass: 'bg-indigo-950/60',
    borderClass: 'border-indigo-500/40',
    textClass: 'text-indigo-300',
    dotClass: 'bg-indigo-400',
    descriptionBn: 'নাগরিক বা অপারেটর কর্তৃক ম্যানুয়ালি যাচাইপূর্বক সংশোধিত',
    descriptionEn: 'Manually inspected and updated by citizen or operator',
  },
  VERIFIED_AUTHORIZED_SOURCE: {
    labelBn: 'সরকারি সার্টিফাইড রেকর্ড',
    labelEn: 'VERIFIED AUTHORIZED SOURCE',
    bgClass: 'bg-emerald-950/60',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-300',
    dotClass: 'bg-emerald-400',
    descriptionBn: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর এবং সাব-রেজিস্ট্রির অনুমোদিত ডাটাবেজ দ্বারা সার্টিফাইড',
    descriptionEn: 'Cryptographically verified against official land sub-registry records',
  },
  VERIFICATION_REQUIRED: {
    labelBn: 'তথ্য যাচাই প্রয়োজন',
    labelEn: 'VERIFICATION REQUIRED',
    bgClass: 'bg-rose-950/60',
    borderClass: 'border-rose-500/40',
    textClass: 'text-rose-300',
    dotClass: 'bg-rose-400',
    descriptionBn: 'রেকর্ড গড়মিল বা অস্পষ্টতার কারণে ভূমি অফিসে সরাসরি যাচাই আবশ্যক',
    descriptionEn: 'Discrepancy detected; requires physical land office verification',
  },
};
