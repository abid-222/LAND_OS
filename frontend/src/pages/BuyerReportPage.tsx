import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  Printer,
  Share2,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  History,
  Search,
  Compass,
  Scale,
  Building2,
  Landmark,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrustBadge } from '../components/TrustBadge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import type { TrustStatus } from '../types/trust';
import { CadastralPlotViewer } from '../components/CadastralPlotViewer';

export interface ParcelSummary {
  synthetic_id: string;
  mouza: string;
  main_no?: string;
  sub_no?: string;
  land_type: string;
  area_decimal: number;
  area_acres: number;
  boundary_note: string;
}

export interface MatchingRecord {
  record_id?: string;
  khatian_no?: string;
  dag_no?: string;
  owner_names?: string;
  similarity_score?: number;
  reasons: string[];
  status_label: TrustStatus;
  source: string;
  retrieved_at: string;
}

export interface ConflictAlert {
  rule_id: string;
  severity: 'high' | 'warn' | 'info';
  title_bn: string;
  reason_bn: string;
  evidence: Array<{
    document_id?: string;
    doc_type?: string;
    field_name?: string;
    extracted_value?: unknown;
    details?: string;
  }>;
}

export interface MissingEvidenceItem {
  doc_type: string;
  title_bn: string;
  description_bn?: string;
  mandatory_for_purchase: boolean;
  status: 'attached' | 'not_attached';
  status_bn: string;
}

export interface NextStepItem {
  id: string;
  title: string;
  step_text: string;
  source: string;
  last_verified_at?: string;
  needs_verification?: boolean;
}

export interface DueDiligenceStep {
  step: number;
  office: string;
  document: string;
  action_bn: string;
  action_en: string;
}

export interface TrafficLightSummary {
  overall_verdict: string;
  overall_verdict_bn: string;
  overall_status: 'clear' | 'caution' | 'stop';
  khas: 'clear' | 'caution' | 'stop';
  acquisition: 'clear' | 'caution' | 'stop';
  litigation: 'clear' | 'caution' | 'stop';
  ownership: 'clear' | 'caution' | 'stop';
  namjari: 'clear' | 'caution' | 'stop';
  sections?: {
    ownership_chain?: string;
    namjari_history?: string;
    litigation?: string;
    khas_status?: string;
    acquisition_status?: string;
  };
  action_checklist?: DueDiligenceStep[];
}

export interface OwnershipChainSection {
  status: string;
  status_bn: string;
  total_deeds: number;
  deeds: Array<{
    id?: string;
    deed_no: string;
    seller: string;
    buyer: string;
    area: string | number;
    deed_date?: string;
    registered_date?: string;
    registry_office?: string;
  }>;
  evidence_summary: string;
}

export interface NamjariHistorySection {
  status: string;
  status_bn: string;
  total_mutations: number;
  mutations: Array<{
    id?: string;
    case_no: string;
    from_party: string;
    to_party: string;
    area: string | number;
    mutation_date?: string;
  }>;
  evidence_summary: string;
}

export interface LitigationCase {
  id?: string;
  case_no: string;
  court: string;
  case_type?: string;
  status: string;
  filed_date?: string;
  parties?: string;
  summary?: string;
}

export interface LitigationSection {
  status: string;
  status_bn: string;
  total_cases: number;
  cases: LitigationCase[];
  evidence_summary: string;
}

export interface KhasStatusSection {
  status: string;
  status_bn: string;
  land_class: string;
  evidence_summary: string;
}

export interface AcquisitionStatusSection {
  status: string;
  status_bn: string;
  status_code: string;
  notice_no?: string | null;
  notice_date?: string | null;
  authority?: string | null;
  evidence_summary: string;
}

interface BuyerReportData {
  id: string;
  parcel_id: string;
  generated_at: string;
  sections: {
    parcel_summary: ParcelSummary;
    traffic_light_summary?: TrafficLightSummary;
    action_checklist?: DueDiligenceStep[];
    ownership_chain?: OwnershipChainSection;
    namjari_history?: NamjariHistorySection;
    litigation?: LitigationSection;
    khas_status?: KhasStatusSection;
    acquisition_status?: AcquisitionStatusSection;
    matching_records: MatchingRecord[];
    document_conflicts: {
      counts: {
        high: number;
        warn: number;
        info: number;
        total: number;
      };
      alerts: ConflictAlert[];
    };
    missing_evidence: {
      checklist_title: string;
      sample_disclaimer: string;
      items: MissingEvidenceItem[];
      total_required: number;
      attached_count: number;
    };
    next_steps: {
      title: string;
      items: NextStepItem[];
      unverified_count?: number;
    };
    disclaimer: {
      primary_text: string;
      version: string;
    };
  };
}

interface BuyerReportPageProps {
  initialParcelId?: string;
  onNavigateToAlerts?: (parcelId: string) => void;
  onNavigateToMap?: () => void;
}

const DEMO_PARCELS = [
  { id: 'P-CLEAN-01', label: 'তেজগাঁও (দাগ ১২১০, খতিয়ান ৫১২) — পরিচ্ছন্ন রেকর্ড (CLEAR)' },
  { id: 'P-KHAS-01', label: 'তেজগাঁও (দাগ ১২০৬, ১নং খতিয়ান) — সরকারি খাস জমি (STOP)' },
  { id: 'P-VESTED-02', label: 'তেজগাঁও (দাগ ১২০৭, খতিয়ান ৪৫) — অর্পিত সম্পত্তি (STOP)' },
  { id: 'P-ACQ-01', label: 'মিরপুর (দাগ ৩২০১, খতিয়ান ৮৯০) — অধিগ্রহণ নোটিশ জারি (CAUTION)' },
  { id: 'P-ACQ-02', label: 'মিরপুর (দাগ ৩২০২, খতিয়ান ৮৯১) — গেজেট অধিগ্রহণকৃত (STOP)' },
  { id: 'P-LIT-01', label: 'ধানমন্ডি (দাগ ৮৯০, খতিয়ান ৩৪৫) — দেওয়ানি স্বত্ব মোকদ্দমা (CAUTION)' },
  { id: 'P-LIT-INJ', label: 'ধানমন্ডি (দাগ ৮৯১, খতিয়ান ৩৪৬) — আদালতের স্থগিতাদেশ (STOP)' },
  { id: 'P-4520', label: 'তেজগাঁও (দাগ ৪৫২০, খতিয়ান ১২০৫) — দ্বৈত বিক্রয় ও অসঙ্গতি (STOP)' },
];

const HISTORICAL_CHAIN = [
  {
    year: '১৯৯২',
    stage: 'আরএস জরিপ রেকর্ড',
    owner: 'মো: হাসেম উল্লাহ',
    source: 'উপজেলা বালাম বহি (ভলিউম ৪২)',
    status: 'verified',
  },
  {
    year: '২০০৫',
    stage: 'হেবা-বিল-এওয়াজ দলিল নং ৪৫০২',
    owner: 'রফিক উল্লাহ',
    source: 'তেজগাঁও সাব-রেজিস্ট্রি অফিস',
    status: 'verified',
  },
  {
    year: '২০১৮',
    stage: 'ই-নামজারি ও জমাভাগ (কেস ১২০৫/২০১৮)',
    owner: 'আব্দুল করিম ও অন্যান্য',
    source: 'সহকারী কমিশনার (ভূমি) কার্যালয়',
    status: 'warning',
    note: 'বায়া দলিলের তফসিল ও খতিয়ানের মোট অংশে সামান্য ব্যবধান',
  },
  {
    year: '২০২৬',
    stage: 'প্রস্তাবিত বিক্রয় / বর্তমান মালিকানা অনুসন্ধান',
    owner: 'বর্তমান প্রত্যাশী ক্রেতা অনুসন্ধানাধীন',
    source: 'ল্যান্ডওএস ইন্টেলিজেন্স গেটওয়ে',
    status: 'current',
  },
];

export const BuyerReportPage: React.FC<BuyerReportPageProps> = ({
  initialParcelId = 'P-4520',
  onNavigateToAlerts,
  onNavigateToMap,
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [selectedParcelId, setSelectedParcelId] = useState<string>(initialParcelId);
  const [manualInputId, setManualInputId] = useState<string>('');
  const [report, setReport] = useState<BuyerReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());
  const isDark = typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true;

  const fetchOrCreateReport = async (parcelId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/parcels/${parcelId}/buyer-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Report generation failed with status ${res.status}`);
      }

      const data: BuyerReportData = await res.json();
      setReport(data);
    } catch (err) {
      console.warn('Backend buyer report API offline, generating synthetic 5-section report:', err);
      const nowIso = new Date().toISOString();
      const fallbackData: BuyerReportData = {
        id: `rep-${parcelId}-${Date.now().toString().slice(-6)}`,
        parcel_id: parcelId,
        generated_at: nowIso,
        sections: {
          traffic_light_summary: {
            overall_verdict: parcelId.includes('KHAS') || parcelId.includes('VESTED') || parcelId.includes('INJ') || parcelId.includes('4520') || parcelId.includes('ACQ-02') ? 'STOP' : parcelId.includes('ACQ') || parcelId.includes('LIT') ? 'CAUTION' : 'CLEAR',
            overall_verdict_bn: parcelId.includes('KHAS') || parcelId.includes('VESTED') || parcelId.includes('INJ') || parcelId.includes('4520') || parcelId.includes('ACQ-02') ? 'স্থগিত / আইনি জটিলতা বিদ্যমান (STOP)' : parcelId.includes('ACQ') || parcelId.includes('LIT') ? 'সতর্কতা / বিশেষ যাচাই প্রয়োজন (CAUTION)' : 'রেকর্ড আপাতদৃষ্টিতে স্বচ্ছ (CLEAR)',
            overall_status: parcelId.includes('KHAS') || parcelId.includes('VESTED') || parcelId.includes('INJ') || parcelId.includes('4520') || parcelId.includes('ACQ-02') ? 'stop' : parcelId.includes('ACQ') || parcelId.includes('LIT') ? 'caution' : 'clear',
            khas: parcelId.includes('KHAS') || parcelId.includes('VESTED') ? 'stop' : 'clear',
            acquisition: parcelId.includes('ACQ-02') ? 'stop' : parcelId.includes('ACQ-01') ? 'caution' : 'clear',
            litigation: parcelId.includes('INJ') ? 'stop' : parcelId.includes('LIT') ? 'caution' : 'clear',
            ownership: parcelId.includes('4520') ? 'stop' : 'clear',
            namjari: parcelId.includes('4520') ? 'caution' : 'clear',
          },
          action_checklist: [
            {
              step: 1,
              office: 'উপজেলা ভূমি অফিস / তহশিল অফিস',
              document: 'নামজারি খতিয়ান ও ডিসিআর কপি',
              action_bn: 'আরএস ও বিএস খতিয়ানের মূল ভলিউম ও রেজিস্টার-২ এর সাথে বিক্রেতার নাম ও হোল্ডিং মিলিয়ে নিন।',
              action_en: 'Verify seller name and holding against original Volume & Register-II at Upazila Land Office.',
            },
            {
              step: 2,
              office: 'সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিস',
              document: '১২ বছরের তল্লাশ ও নির্দায় সনদ (NEC)',
              action_bn: 'সাব-রেজিস্ট্রি অফিসের বালাম বইয়ে ১২ বছরের তল্লাশ দিয়ে নিশ্চিত হোন জমিটি ইতোপূর্বে অন্য কারো কাছে বিক্রি বা বন্ধক দেওয়া হয়নি।',
              action_en: 'Run 12-year search in Sub-Registry Balam Books to ensure parcel was not double-sold or encumbered.',
            },
            {
              step: 3,
              office: 'বিজ্ঞ দেওয়ানি আদালত / ল্যান্ড সার্ভে ট্রাইব্যুনাল',
              document: 'মামলা তথ্য ও রায়-ডিক্রি',
              action_bn: 'সংশ্লিষ্ট দাগের জমিতে দেওয়ানি আদালতে কোনো নিষেধাজ্ঞা (Injunction), বাটোয়ারা মামলা বা স্বত্ব ঘোষণার মামলা আছে কিনা খতিয়ে দেখুন।',
              action_en: 'Check for active title suits, partition disputes, or court injunctions at Civil Court / Land Survey Tribunal.',
            },
            {
              step: 4,
              office: 'জেলা প্রশাসকের কার্যালয় (অধিগ্রহণ শাখা / রাজস্ব শাখা)',
              document: 'এল.এ কেস রেকর্ড ও ১নং খতিয়ান',
              action_bn: 'জমিটি সরকারি কোনো প্রকল্পের জন্য অধিগ্রহণাধীন নয় এবং সরকারি ১নং খাস খতিয়ান বা অর্পিত সম্পত্তির তফসিলভুক্ত নয় তা নিশ্চিত হোন।',
              action_en: 'Confirm parcel is not marked under Acquisition Section 4/7/8 or 1-No Khas Schedule at DC Office.',
            },
          ],
          ownership_chain: {
            status: parcelId.includes('4520') ? 'STOP' : 'CLEAR',
            status_bn: parcelId.includes('4520') ? 'দ্বৈত বিক্রয় নির্দেশক' : 'স্বচ্ছ হস্তান্তর ধারাবাহিকতা',
            total_deeds: parcelId.includes('4520') ? 2 : 1,
            deeds: [
              {
                deed_no: 'DEED-2022-458',
                seller: 'আব্দুল করিম',
                buyer: 'মোহাম্মদ রফিকুল ইসলাম',
                area: '১৮.০ শতাংশ',
                registered_date: '2022-04-11T00:00:00Z',
                registry_office: 'তেজগাঁও সাব-রেজিস্ট্রি অফিস',
              },
            ],
            evidence_summary: 'হস্তান্তরিত দলিলের রেকর্ড রেজিস্ট্রি বালামে রক্ষিত রয়েছে।',
          },
          namjari_history: {
            status: 'CLEAR',
            status_bn: 'রেকর্ড অনুযায়ী নামজারি সম্পন্ন',
            total_mutations: 1,
            mutations: [
              {
                case_no: 'MUT-2022/411',
                from_party: 'আব্দুল করিম',
                to_party: 'মোহাম্মদ রফিকুল ইসলাম',
                area: 18.0,
                mutation_date: '2022-06-15T00:00:00Z',
              },
            ],
            evidence_summary: 'উপজেলা সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি ও জমাভাগ অনুমোদিত।',
          },
          litigation: {
            status: parcelId.includes('INJ') ? 'STOP' : parcelId.includes('LIT') ? 'CAUTION' : 'CLEAR',
            status_bn: parcelId.includes('INJ') ? 'আদালতের স্থগিতাদেশ কার্যকর' : parcelId.includes('LIT') ? 'দেওয়ানি মামলা বিচারাধীন' : 'মামলামুক্ত রেকর্ড',
            total_cases: parcelId.includes('LIT') ? 1 : 0,
            cases: parcelId.includes('LIT')
              ? [
                  {
                    case_no: 'TS-42/2024',
                    court: '১ম সহকারী জজ আদালত, ঢাকা',
                    case_type: 'স্বত্ব ঘোষণা মোকদ্দমা (Title Suit)',
                    status: parcelId.includes('INJ') ? 'stayed' : 'open',
                    parties: 'মোস্তাফিজুর রহমান বনাম আনিসুর রহমান',
                    summary: 'মালিকানা সংক্রান্ত স্বত্ব ঘোষণা ও বণ্টন মোকদ্দমায় আদালত কর্তৃক স্থিতাবস্থা বা বিচারাধীন আদেশ।',
                  },
                ]
              : [],
            evidence_summary: parcelId.includes('LIT') ? '১টি দেওয়ানি মোকদ্দমা রেকর্ডভুক্ত।' : 'কোনো দেওয়ানি বা ফৌজদারি মামলার রেকর্ড মেলেনি।',
          },
          khas_status: {
            status: parcelId.includes('KHAS') || parcelId.includes('VESTED') ? 'STOP' : 'CLEAR',
            status_bn: parcelId.includes('KHAS') ? 'সরকারি ১নং খাস জমি' : parcelId.includes('VESTED') ? 'অর্পিত সম্পত্তি (শত্রু সম্পত্তি)' : 'ব্যক্তিগত মালিকানা রেকর্ডভুক্ত',
            land_class: parcelId.includes('KHAS') ? 'khas' : parcelId.includes('VESTED') ? 'vested_property' : 'private',
            evidence_summary: parcelId.includes('KHAS') || parcelId.includes('VESTED') ? 'সরকারি খাস বা অর্পিত সম্পত্তি বিধায় ব্যক্তিগত হস্তান্তর আইনত নিষিদ্ধ।' : '১নং খাস খতিয়ান বা অর্পিত সম্পত্তির তালিকায় এই দাগের কোনো অন্তর্ভুক্তি মেলেনি।',
          },
          acquisition_status: {
            status: parcelId.includes('ACQ-02') ? 'STOP' : parcelId.includes('ACQ-01') ? 'CAUTION' : 'CLEAR',
            status_bn: parcelId.includes('ACQ-02') ? 'গেজেট দ্বারা অধিগ্রহণকৃত (Acquired)' : parcelId.includes('ACQ-01') ? 'প্রাথমিক অধিগ্রহণ নোটিশ জারি (धारा ४)' : 'অধিগ্রহণমুক্ত জমি',
            status_code: parcelId.includes('ACQ-02') ? 'acquired' : parcelId.includes('ACQ-01') ? 'notice_issued' : 'none',
            notice_no: parcelId.includes('ACQ-01') ? 'LA-DHAKA-2025/44' : parcelId.includes('ACQ-02') ? 'GAZETTE-2024-ACQ' : null,
            authority: parcelId.includes('ACQ') ? 'জেলা প্রশাসকের কার্যালয়, ঢাকা' : null,
            evidence_summary: parcelId.includes('ACQ') ? 'ভূমি অধিগ্রহণ শাখা কর্তৃক এল.এ নোটিশ জারি করা হয়েছে।' : 'জেলা প্রশাসকের এল.এ শাখা হতে কোনো অধিগ্রহণ নোটিশ জারি হয়নি।',
          },
          parcel_summary: {
            synthetic_id: parcelId,
            mouza: parcelId.includes('ACQ') ? 'মিরপুর' : parcelId.includes('LIT') ? 'ধানমন্ডি' : 'তেজগাঁও',
            main_no: parcelId === 'P-3201' ? '৩২০১' : parcelId === 'demo-parcel-101' ? '৮৯০' : '৪৫২০',
            sub_no: '১',
            land_type: 'নাল (কৃষি জমি)',
            area_decimal: parcelId === 'P-3201' ? 42.0 : parcelId === 'demo-parcel-101' ? 8.5 : 18.0,
            area_acres: parcelId === 'P-3201' ? 0.42 : parcelId === 'demo-parcel-101' ? 0.085 : 0.18,
            boundary_note: 'Illustrative / Not a legal boundary (প্রদর্শিত সীমানা ও নকশা শুধুমাত্র উদাহরণের জন্য, এটি কোনো আইনি সীমানা নয়)',
          },
          matching_records: [
            {
              record_id: 'rec-001',
              khatian_no: parcelId.includes('ACQ') ? '৮৯০' : parcelId.includes('LIT') ? '৩৪৫' : '৫১২',
              dag_no: parcelId === 'P-3201' ? '৩২০১' : parcelId === 'demo-parcel-101' ? '৮৯০' : '১২১০',
              owner_names: 'মোহাম্মদ রফিকুল ইসলাম',
              similarity_score: 1.0,
              reasons: ['দাগ ও খতিয়ান নম্বর সরকারি বালাম বইয়ের সাথে সম্পূর্ণ মিলেছে'],
              status_label: 'VERIFIED_AUTHORIZED_SOURCE',
              source: 'উপজেলা ভূমি অফিস বালাম বই (ডিজিটাল আরএস খতিয়ান)',
              retrieved_at: nowIso,
            },
          ],
          document_conflicts: {
            counts: {
              high: 1,
              warn: 1,
              info: 1,
              total: 3,
            },
            alerts: [
              {
                rule_id: 'R_AREA_MISMATCH',
                severity: 'high',
                title_bn: 'জমির পরিমাণের তারতম্য নির্দেশক',
                reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: দলিলের জমির পরিমাণ বালাম রেকর্ডের পরিমাণের চেয়ে ১৭ শতক বেশি।',
                evidence: [
                  {
                    doc_type: 'সাব-রেজিস্ট্রি দলিল',
                    field_name: 'area_acres',
                    extracted_value: '০.৫০ একর',
                    details: 'দলিলের তফসিল অংশ',
                  },
                  {
                    doc_type: 'আরএস খতিয়ান বালাম',
                    field_name: 'area_acres',
                    extracted_value: '০.৩৩ একর',
                    details: 'সরকারি মূল খতিয়ান',
                  },
                ],
              },
              {
                rule_id: 'R_CHAIN_BREAK',
                severity: 'warn',
                title_bn: 'মালিকানা ধারাবাহিকতায় মধ্যবর্তী রেকর্ড অনুপস্থিতি',
                reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: ১৯৯৮ সালের বায়া দলিল ও বর্তমান খতিয়ানের মাঝে মধ্যবর্তী নামজারি রেফারেন্স পাওয়া যায়নি।',
                evidence: [
                  {
                    doc_type: 'বায়া দলিল (১৯৯৮)',
                    field_name: 'grantee_name',
                    extracted_value: 'রফিক উল্লাহ',
                    details: 'পূর্বে হস্তান্তরিত গ্রহীতা',
                  },
                ],
              },
              {
                rule_id: 'R_TAX_RECEIPT_STALE',
                severity: 'info',
                title_bn: 'হালনাগাদ দাখিলা তথ্য যাচাই প্রয়োজন',
                reason_bn: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন: সর্বশেষ খাজনা পরিশোধ ১৪২৮ বঙ্গাব্দের। বর্তমান ১৪৩১ বঙ্গাব্দের তথ্য অনুপস্থিত।',
                evidence: [
                  {
                    doc_type: 'খাজনা দাখিলা',
                    field_name: 'tax_year',
                    extracted_value: '১৪২৮ বঙ্গাব্দ',
                    details: 'ভূমি উন্নয়ন কর পরিশোধ বহি',
                  },
                ],
              },
            ],
          },
          missing_evidence: {
            checklist_title: 'জমির মালিকানা যাচাইয়ের নমুনা তথ্য তালিকা (ডেমো)',
            sample_disclaimer: 'এটি একটি নমুনা তালিকা (SAMPLE)। সরকারি বা আইনি আবশ্যিক শর্ত নয়।',
            total_required: 5,
            attached_count: 3,
            items: [
              {
                doc_type: 'khatian',
                title_bn: 'মূল আরএস/সিএস খতিয়ান',
                description_bn: 'সর্বশেষ জরিপের মূল রেকর্ড কপি',
                mandatory_for_purchase: true,
                status: 'attached',
                status_bn: 'সংযুক্ত রয়েছে',
              },
              {
                doc_type: 'deed',
                title_bn: 'বায়া দলিল (মালিকানা হস্তান্তরের পূর্ববর্তী দলিল)',
                description_bn: 'কমপক্ষে ২৫ বছরের পূর্ববর্তী হস্তান্তরের দলিল',
                mandatory_for_purchase: true,
                status: 'attached',
                status_bn: 'সংযুক্ত রয়েছে',
              },
              {
                doc_type: 'mutation',
                title_bn: 'নামজারি পরচা ও ডিসিআর (DCR)',
                description_bn: 'সহকারী কমিশনার (ভূমি) কর্তৃক অনুমোদিত মিউটেশন',
                mandatory_for_purchase: true,
                status: 'not_attached',
                status_bn: 'সংযুক্ত নেই (যাচাই আবশ্যক)',
              },
              {
                doc_type: 'tax_receipt',
                title_bn: 'হালনাগাদ ভূমি উন্নয়ন কর (দাখিলা)',
                description_bn: 'চলতি অর্থবছর পর্যন্ত খাজনা পরিশোধের রশিদ',
                mandatory_for_purchase: true,
                status: 'not_attached',
                status_bn: 'সংযুক্ত নেই (যাচাই আবশ্যক)',
              },
              {
                doc_type: 'cadastral_map',
                title_bn: 'মৌজা নকশা (ম্যাপ)',
                description_bn: 'জমির সঠিক অবস্থান ও সীমানা পরিমাপের নকশা',
                mandatory_for_purchase: false,
                status: 'attached',
                status_bn: 'সংযুক্ত রয়েছে',
              },
            ],
          },
          next_steps: {
            title: 'আইনি ও দাপ্তরিক পরবর্তী করণীয়',
            unverified_count: 1,
            items: [
              {
                id: 'ns-1',
                title: 'উপজেলা ভূমি অফিসে নামজারি খতিয়ান যাচাই',
                step_text: 'সংশ্লিষ্ট সহকারী কমিশনার (ভূমি) অফিসে ই-নামজারি কেস ও মূল বালামের সাথে রেকর্ড মিলিয়ে নিন।',
                source: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর সহায়িকা ২০২৪',
                last_verified_at: '2026-03-01T00:00:00Z',
                needs_verification: false,
              },
              {
                id: 'ns-2',
                title: 'সাব-রেজিস্ট্রি অফিসে বায়া দলিলের তল্লাশি',
                step_text: 'সাব-রেজিস্ট্রারের কার্যালয়ে মূল বালাম বই তল্লাশি করে বায়া দলিলের অস্তিত্ব নিশ্চিত করুন।',
                source: 'রেজিস্ট্রেশন আইন ১৯০৮ ও বিধিমালা',
                last_verified_at: '2026-02-15T00:00:00Z',
                needs_verification: false,
              },
              {
                id: 'ns-3',
                title: 'মাঠ পর্যায়ে জমি দখল ও সীমানা পরিমাপ',
                step_text: 'সরকারি আমিন দিয়ে নকশা অনুযায়ী জমির বাস্তব দখল ও দাগ সীমানা পরিমাপ করে নিন।',
                source: 'সার্ভে অ্যাক্ট ১৮৭৫',
                needs_verification: true,
              },
            ],
          },
          disclaimer: {
            primary_text: 'তথ্য যাচাই প্রয়োজন. এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। ডেমো ডেটা।',
            version: 'v3.0-epistemic-gov',
          },
        },
      };

      setReport(fallbackData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrCreateReport(selectedParcelId);
  }, [selectedParcelId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const toggleAlertExpand = (index: number) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInputId.trim()) {
      setSelectedParcelId(manualInputId.trim());
    }
  };

  const getOverallStatus = (): 'clear' | 'caution' | 'stop' => {
    if (report?.sections.traffic_light_summary?.overall_status) {
      return report.sections.traffic_light_summary.overall_status;
    }
    const verdict = (report?.sections.traffic_light_summary?.overall_verdict || '').toLowerCase();
    if (verdict.includes('stop')) return 'stop';
    if (verdict.includes('caution')) return 'caution';
    return 'clear';
  };

  const renderTrafficLightPill = (label: string, status: string, summary: string) => {
    const s = (status || '').toLowerCase();
    const isStop = s === 'stop' || s.includes('stop');
    const isCaution = s === 'caution' || s.includes('caution');

    const bg = isStop
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
      : isCaution
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300';

    const dot = isStop ? 'bg-rose-500' : isCaution ? 'bg-amber-500' : 'bg-emerald-500';

    return (
      <div className={`p-3 rounded-2xl border ${bg} flex flex-col justify-between transition-all shadow-sm`}>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <span className="text-[11px] font-bold">{label}</span>
          <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0 animate-pulse`} />
        </div>
        <span className="text-[10px] font-medium opacity-90 truncate">{summary}</span>
      </div>
    );
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors print:p-0 print:text-black pb-28">
      {/* Top Controls: Preset Chips & Manual Parcel Search */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 mb-5 shadow-lg print:hidden transition-all">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? 'প্লট ও পার্সেল দ্রুত নির্বাচন করুন:' : 'Quick Select Demo Parcel:'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_PARCELS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedParcelId(p.id);
                    setManualInputId('');
                  }}
                  className={`touch-target px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border text-left truncate ${
                    selectedParcelId === p.id
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-black/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                  }`}
                >
                  <span className="block truncate font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {p.id}
                  </span>
                  <span className="truncate block mt-0.5">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="md:w-72 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? 'ম্যানুয়াল পার্সেল / দাগ আইডি:' : 'Manual Parcel / Dag ID:'}</span>
            </label>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                value={manualInputId}
                onChange={(e) => setManualInputId(e.target.value)}
                placeholder={isBn ? 'যেমন: P-4520 বা দাগ নং' : 'e.g. P-4520 or Dag No.'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-md transition-all active:scale-95"
              >
                {isBn ? 'লোড' : 'Load'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Header Bar with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <FileBarChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? 'ক্রেতা ঝুঁকি ও তথ্য অনুসন্ধান প্রতিবেদন' : 'Buyer Due Diligence & Risk Report'}</span>
            </h1>
            <DisclaimerBanner type="badge" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {isBn ? 'পার্সেল:' : 'Parcel:'} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedParcelId}</strong> • {isBn ? 'তৈরি:' : 'Generated:'} {new Date(report?.generated_at || Date.now()).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')} • LandOS v3.0
          </p>
        </div>

        {/* Action Buttons (Print / Share / 3D Map) */}
        <div className="flex items-center gap-2 print:hidden self-end sm:self-auto">
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="touch-target px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isBn ? 'মানচিত্রে অবস্থান' : 'View on Map'}</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="touch-target p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 relative active:scale-95 transition-all"
            title={isBn ? 'লিংক শেয়ার করুন' : 'Share Link'}
          >
            <Share2 className="w-4 h-4" />
            {copiedLink && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
                {isBn ? 'কপি হয়েছে!' : 'Copied!'}
              </span>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="touch-target px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            title={isBn ? 'প্রিন্ট বা পিডিএফ সংরক্ষণ' : 'Print or Save as PDF'}
          >
            <Printer className="w-4 h-4" />
            <span>{isBn ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
          </button>
        </div>
      </div>

      {/* Fixed Legal Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500/80 text-amber-900 dark:text-amber-200 text-xs mb-5 shadow-lg leading-relaxed">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="font-extrabold text-sm text-amber-950 dark:text-white mb-0.5">
              {isBn ? 'তথ্য যাচাই প্রয়োজন — ডেমো পরীক্ষামূলক প্রতিবেদন' : 'Verification Required — Synthetic Demo Report'}
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {report?.sections.disclaimer.primary_text ||
                (isBn
                  ? 'তথ্য যাচাই প্রয়োজন. এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। প্রদর্শিত সকল তথ্য ডেমো বা পরীক্ষামূলক। জমি ক্রয়ের পূর্বে সংশ্লিষ্ট রেজিস্ট্রি ও ভূমি অফিসে মূল বালাম বহির সাথে সরাসরি যাচাই করা আইনত আবশ্যক।'
                  : 'Verification Required. This is not legal advice or title guarantee. All data shown is synthetic demo. Direct inspection with sub-registry and land offices is required before transacting.')}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-14 bg-slate-100 dark:bg-slate-950 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* ------------------------------------------------------------- */}
          {/* TRAFFIC LIGHT OVERVIEW BAR (P5 DUE DILIGENCE HEADER) */}
          {/* ------------------------------------------------------------- */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-tight">
                    {isBn ? 'ট্রাফিক লাইট নিরীক্ষা সারসংক্ষেপ (Traffic Light Due Diligence)' : 'Traffic Light Due Diligence Overview'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {isBn ? '৫টি আবশ্যিক আইনি ও রাজস্ব সূচকে প্লটের তাৎক্ষণিক নিরীক্ষা অবস্থা' : 'Instant status across 5 essential legal and revenue checkpoints'}
                  </span>
                </div>
              </div>

              {/* Overall Status Badge */}
              <div className="self-start sm:self-auto">
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase inline-flex items-center gap-1.5 ${
                  overallStatus === 'stop'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                    : overallStatus === 'caution'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    overallStatus === 'stop' ? 'bg-rose-500 animate-ping' : overallStatus === 'caution' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span>
                    {overallStatus === 'stop'
                      ? (isBn ? 'স্থগিত / ঝুঁকিপূর্ণ (STOP)' : 'STOP — High Risk')
                      : overallStatus === 'caution'
                      ? (isBn ? 'সতর্কতা / যাচাই আবশ্যক (CAUTION)' : 'CAUTION — Review Needed')
                      : (isBn ? 'স্বচ্ছ রেকর্ড (CLEAR)' : 'CLEAR — Apparent Title Clean')}
                  </span>
                </span>
              </div>
            </div>

            {/* 5 Traffic Light Capsules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {renderTrafficLightPill(
                isBn ? 'স্বত্ব ধারাবাহিকতা' : 'Ownership Chain',
                report.sections.traffic_light_summary?.ownership || report.sections.ownership_chain?.status || 'clear',
                report.sections.ownership_chain?.status_bn || (isBn ? 'স্বচ্ছ বালাম' : 'Clear chain')
              )}
              {renderTrafficLightPill(
                isBn ? 'নামজারি রেকর্ড' : 'Namjari Mutation',
                report.sections.traffic_light_summary?.namjari || report.sections.namjari_history?.status || 'clear',
                report.sections.namjari_history?.status_bn || (isBn ? 'রেকর্ড অনুযায়ী' : 'Mutated')
              )}
              {renderTrafficLightPill(
                isBn ? 'আদালতের মামলা' : 'Court Litigation',
                report.sections.traffic_light_summary?.litigation || report.sections.litigation?.status || 'clear',
                report.sections.litigation?.status_bn || (isBn ? 'মামলামুক্ত' : 'No litigation')
              )}
              {renderTrafficLightPill(
                isBn ? 'খাস ও অর্পিত জমি' : 'Khas / Vested Land',
                report.sections.traffic_light_summary?.khas || report.sections.khas_status?.status || 'clear',
                report.sections.khas_status?.status_bn || (isBn ? 'ব্যক্তিগত মালিকানা' : 'Private freehold')
              )}
              {renderTrafficLightPill(
                isBn ? 'ভূমি অধিগ্রহণ নোটিশ' : 'Acquisition Notice',
                report.sections.traffic_light_summary?.acquisition || report.sections.acquisition_status?.status || 'clear',
                report.sections.acquisition_status?.status_bn || (isBn ? 'অধিগ্রহণমুক্ত' : 'Not acquired')
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 1: PARCEL SUMMARY + 2D CADASTRAL PLOT */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '১. পার্সেল পরিচিতি ও জমির বিবরণ' : '1. Parcel Identification & Land Details'}</span>
            </h2>

            {/* Data Grid */}
            <div className="space-y-4 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {isBn ? 'পার্সেল আইডি' : 'Parcel ID'}
                  </span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {report.sections.parcel_summary.synthetic_id}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {isBn ? 'মৌজা' : 'Mouza'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {report.sections.parcel_summary.mouza}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {isBn ? 'দাগ নম্বর' : 'Plot / Dag No.'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {report.sections.parcel_summary.main_no}
                    {report.sections.parcel_summary.sub_no ? `/${report.sections.parcel_summary.sub_no}` : ''}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {isBn ? 'ভূমির শ্রেণি' : 'Land Class'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {report.sections.parcel_summary.land_type}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {isBn ? 'জমির পরিমাণ' : 'Land Area'}
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {report.sections.parcel_summary.area_decimal} {isBn ? 'শতক' : 'decimals'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ({report.sections.parcel_summary.area_acres} {isBn ? 'একর' : 'acres'})
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                    {isBn ? 'ডেটা প্রকার' : 'Data Type'}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isBn ? 'ডিজিটাল সার্টিফাইড' : 'Digital Certified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Authentic 2D Cadastral Plot & Mouza Naksha System */}
            <div className="mb-4">
              <CadastralPlotViewer
                parcelId={report.sections.parcel_summary.synthetic_id}
                isDark={isDark}
                onNavigateToMap={onNavigateToMap}
              />
            </div>

            {/* Mandatory Illustrative Boundary Note */}
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 italic bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-300 dark:border-amber-600/30">
              {report.sections.parcel_summary.boundary_note}
            </p>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 2: DUE DILIGENCE ACTION CHECKLIST */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '২. কেনার পূর্বে করণীয় অ্যাকশন চেকলিস্ট (Due Diligence Checklist)' : '2. Pre-Purchase Action Checklist'}</span>
            </h2>
            <div className="space-y-3">
              {(report.sections.action_checklist || report.sections.traffic_light_summary?.action_checklist || []).map((step) => (
                <div key={step.step} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {step.step}
                      </span>
                      <span>{step.office}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {step.document}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed pl-8">
                    {isBn ? step.action_bn : step.action_en}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: OWNERSHIP CHAIN (DEED TRANSFERS) */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? '৩. মালিকানা পরম্পরা ও হস্তান্তর দলিল (Ownership Chain)' : '3. Ownership Chain & Recorded Deeds'}</span>
              </h2>
              {report.sections.ownership_chain && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  report.sections.ownership_chain.status.toLowerCase() === 'stop'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                }`}>
                  {report.sections.ownership_chain.status_bn}
                </span>
              )}
            </div>

            {report.sections.ownership_chain?.deeds && report.sections.ownership_chain.deeds.length > 0 ? (
              <div className="space-y-3">
                {report.sections.ownership_chain.deeds.map((deed, dIdx) => (
                  <div key={dIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {isBn ? `দলিল নং: ${deed.deed_no}` : `Deed No: ${deed.deed_no}`}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {deed.registered_date ? new Date(deed.registered_date).toLocaleDateString(isBn ? 'bn-BD' : 'en-US') : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>{isBn ? 'বিক্রেতা:' : 'Seller:'} <strong className="text-slate-900 dark:text-white font-bold">{deed.seller}</strong></div>
                      <div>{isBn ? 'ক্রেতা:' : 'Buyer:'} <strong className="text-slate-900 dark:text-white font-bold">{deed.buyer}</strong></div>
                      <div>{isBn ? 'জমির অংশ:' : 'Share/Area:'} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{deed.area}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {HISTORICAL_CHAIN.map((item, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-8">
                    <div
                      className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 -translate-x-1/2 ${
                        item.status === 'verified'
                          ? 'bg-emerald-500 border-white dark:border-slate-900'
                          : item.status === 'warning'
                          ? 'bg-amber-500 border-white dark:border-slate-900'
                          : 'bg-primary border-white dark:border-slate-900 animate-pulse'
                      }`}
                    />
                    <div className="flex-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                            {item.year}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">{item.stage}</h4>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.source}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {isBn ? 'রেকর্ডধারী/গ্রহীতা:' : 'Record Holder/Grantee:'} <strong className="text-slate-900 dark:text-white">{item.owner}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 4: NAMJARI MUTATION HISTORY */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? '৪. নামজারি ও জমাভাগ ইতিহাস (Namjari History)' : '4. Mutation & Namjari History'}</span>
              </h2>
              {report.sections.namjari_history && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                  {report.sections.namjari_history.status_bn}
                </span>
              )}
            </div>
            {report.sections.namjari_history?.mutations && report.sections.namjari_history.mutations.length > 0 ? (
              <div className="space-y-3">
                {report.sections.namjari_history.mutations.map((mut, mIdx) => (
                  <div key={mIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {isBn ? `নামজারি কেস: ${mut.case_no}` : `Mutation Case: ${mut.case_no}`}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {mut.mutation_date ? new Date(mut.mutation_date).toLocaleDateString(isBn ? 'bn-BD' : 'en-US') : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>{isBn ? 'পূর্ববর্তী মালিক:' : 'From Party:'} <strong className="text-slate-900 dark:text-white">{mut.from_party}</strong></div>
                      <div>{isBn ? 'নতুন মালিক:' : 'Mutated To:'} <strong className="text-slate-900 dark:text-white">{mut.to_party}</strong></div>
                      <div>{isBn ? 'অনুমোদিত জমি:' : 'Mutated Area:'} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{mut.area} {isBn ? 'শতক' : 'dec'}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn ? 'কোনো অনুমোদিত নামজারি রেকর্ড মেলেনি।' : 'No recorded mutation history.'}
              </p>
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 5: COURT LITIGATION & INJUNCTIONS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                <span>{isBn ? '৫. আদালতের মামলা ও স্থগিতাদেশ (Litigation Status)' : '5. Civil Court Litigation & Injunctions'}</span>
              </h2>
              {report.sections.litigation && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  report.sections.litigation.status.toLowerCase() === 'stop'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                    : report.sections.litigation.status.toLowerCase() === 'caution'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                }`}>
                  {report.sections.litigation.status_bn}
                </span>
              )}
            </div>

            {report.sections.litigation?.cases && report.sections.litigation.cases.length > 0 ? (
              <div className="space-y-3">
                {report.sections.litigation.cases.map((lc, lIdx) => (
                  <div key={lIdx} className="p-4 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/30 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-extrabold text-rose-700 dark:text-rose-300 text-sm">
                        {lc.case_no} ({lc.court})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40">
                        {lc.status}
                      </span>
                    </div>
                    {lc.parties && (
                      <div className="text-[11px] text-slate-700 dark:text-slate-300">
                        <strong>{isBn ? 'পক্ষগণ:' : 'Parties:'}</strong> {lc.parties}
                      </div>
                    )}
                    {lc.summary && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        {lc.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{report.sections.litigation?.evidence_summary || (isBn ? 'কোনো দেওয়ানি বা ফৌজদারি মামলা বিচারাধীন নেই।' : 'No active litigation records found.')}</span>
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 6: KHAS & GOVERNMENT LAND STATUS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? '৬. সরকারি খাস ও অর্পিত সম্পত্তির তথ্য (Khas / Government Land)' : '6. Khas & Government Land Status'}</span>
              </h2>
              {report.sections.khas_status && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  report.sections.khas_status.status.toLowerCase() === 'stop'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                }`}>
                  {report.sections.khas_status.status_bn}
                </span>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <div className="text-[12px] text-slate-700 dark:text-slate-300">
                <strong>{isBn ? 'জমির শ্রেণিবিভাগ:' : 'Land Classification:'}</strong>{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {report.sections.khas_status?.land_class || report.sections.parcel_summary.land_type}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {report.sections.khas_status?.evidence_summary || (isBn ? '১নং খাস খতিয়ান বা অর্পিত সম্পত্তির তালিকায় এই দাগের কোনো অন্তর্ভুক্তি মেলেনি।' : 'No khas or government restriction.')}
              </p>
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 7: LAND ACQUISITION STATUS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? '৭. ভূমি অধিগ্রহণ নোটিশের অবস্থা (Acquisition Status)' : '7. Land Acquisition & Requisition Status'}</span>
              </h2>
              {report.sections.acquisition_status && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  report.sections.acquisition_status.status.toLowerCase() === 'stop'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                    : report.sections.acquisition_status.status.toLowerCase() === 'caution'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                }`}>
                  {report.sections.acquisition_status.status_bn}
                </span>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              {report.sections.acquisition_status?.notice_no && (
                <div className="text-[12px] text-amber-700 dark:text-amber-400 font-bold">
                  {isBn ? 'নোটিশ নং:' : 'Notice No:'} {report.sections.acquisition_status.notice_no}
                  {report.sections.acquisition_status.authority && ` • ${report.sections.acquisition_status.authority}`}
                </div>
              )}
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {report.sections.acquisition_status?.evidence_summary || (isBn ? 'জেলা প্রশাসকের এল.এ শাখা হতে কোনো অধিগ্রহণ নোটিশ জারি হয়নি।' : 'No acquisition notice recorded.')}
              </p>
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 8: MATCHING RECORDS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '৮. ম্যাচিং সরকারি খতিয়ান রেকর্ড' : '8. Matching Official Khatian Records'}</span>
            </h2>
            {report.sections.matching_records.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn ? 'কোনো অনুমোদিত বালাম রেকর্ড মেলেনি।' : 'No authorized balam records matched.'}
              </p>
            ) : (
              <div className="space-y-3">
                {report.sections.matching_records.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {isBn ? `খতিয়ান #${rec.khatian_no} • দাগ #${rec.dag_no}` : `Khatian #${rec.khatian_no} • Plot #${rec.dag_no}`}
                      </span>
                      <TrustBadge status={rec.status_label} />
                    </div>
                    <div className="text-[12px] text-slate-700 dark:text-slate-300">
                      {isBn ? 'মালিক/রেকর্ডধারী:' : 'Owner / Record Holder:'} <strong className="text-slate-900 dark:text-white font-bold">{rec.owner_names || '—'}</strong>
                    </div>
                    {rec.reasons?.length > 0 && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 font-medium">
                        {isBn ? 'মিলের কারণ:' : 'Match Reason:'} {rec.reasons.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>{isBn ? 'উৎস:' : 'Source:'} {rec.source}</span>
                      <span>{isBn ? 'যাচাই সময়:' : 'Retrieved:'} {new Date(rec.retrieved_at).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: DOCUMENT CONFLICTS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>{isBn ? '৩. দলিল ও রেকর্ড সংক্রান্ত সম্ভাব্য অসঙ্গতি' : '3. Potential Document & Record Discrepancies'}</span>
              </h2>
              {onNavigateToAlerts && (
                <button
                  onClick={() => onNavigateToAlerts(selectedParcelId)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>{isBn ? 'সকল অ্যালার্ট' : 'All Alerts'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Severity Counts Bar */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold block">
                  {isBn ? 'উচ্চ মনোযোগ' : 'High Priority'}
                </span>
                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {report.sections.document_conflicts.counts.high}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold block">
                  {isBn ? 'সতর্কতা' : 'Warnings'}
                </span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  {report.sections.document_conflicts.counts.warn}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30">
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-extrabold block">
                  {isBn ? 'তথ্যগত' : 'Informational'}
                </span>
                <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                  {report.sections.document_conflicts.counts.info}
                </span>
              </div>
            </div>

            {/* Conflict Alerts List */}
            <div className="space-y-3">
              {report.sections.document_conflicts.alerts.map((alt, idx) => {
                const isExp = expandedAlerts.has(idx);
                return (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-extrabold text-slate-900 dark:text-white flex-1 text-sm">{alt.title_bn}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          alt.severity === 'high'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                            : alt.severity === 'warn'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                            : 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40'
                        }`}
                      >
                        {alt.severity === 'high' ? (isBn ? 'উচ্চ মনোযোগ' : 'High') : alt.severity === 'warn' ? (isBn ? 'সতর্কতা' : 'Warning') : (isBn ? 'তথ্যগত' : 'Info')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{alt.reason_bn}</p>

                    {/* Expandable Evidence */}
                    {alt.evidence?.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                        <button
                          onClick={() => toggleAlertExpand(idx)}
                          className="flex items-center justify-between w-full text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          <span>{isBn ? `প্রমাণাদি (${alt.evidence.length} টি)` : `Evidence (${alt.evidence.length} items)`}</span>
                          {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {isExp && (
                          <div className="mt-2 space-y-2 text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            {alt.evidence.map((ev, eIdx) => (
                              <div key={eIdx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5 last:border-none">
                                <span>{ev.doc_type || ev.field_name}: <strong className="text-slate-900 dark:text-white font-bold">{String(ev.extracted_value ?? '—')}</strong></span>
                                {ev.details && <span className="text-slate-500 text-[10px]">{ev.details}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 4: MISSING EVIDENCE CHECKLIST */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? '৪. প্রয়োজনীয় দলিলের নমুনা যাচাই তালিকা' : '4. Required Document Checklist (Sample)'}</span>
              </h2>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold border border-slate-200 dark:border-slate-700">
                SAMPLE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 italic">
              {report.sections.missing_evidence.sample_disclaimer} ({isBn ? `মোট: ${report.sections.missing_evidence.total_required} টির মধ্যে ${report.sections.missing_evidence.attached_count} টি সংযুক্ত` : `Total: ${report.sections.missing_evidence.attached_count} of ${report.sections.missing_evidence.total_required} attached`})
            </p>
            <div className="space-y-2.5">
              {report.sections.missing_evidence.items.map((item, idx) => {
                const isAttached = item.status === 'attached';
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                      isAttached
                        ? 'bg-slate-50 dark:bg-black/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                        : 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-600/30 text-amber-900 dark:text-amber-100'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.title_bn}</h4>
                      {item.description_bn && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.description_bn}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        isAttached
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {item.status_bn}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 5: NEXT STEPS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? `৫. ${report.sections.next_steps.title}` : `5. ${report.sections.next_steps.title}`}</span>
            </h2>
            <div className="space-y-3.5">
              {report.sections.next_steps.items.map((ns) => (
                <div key={ns.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{ns.title}</h4>
                    {ns.needs_verification ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                        {isBn ? 'তথ্য যাচাই প্রয়োজন' : 'Verification Required'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                        {isBn ? 'অনুমোদিত নির্দেশিকা' : 'Official Guideline'}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">{ns.step_text}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span>{isBn ? 'আইনি উৎস:' : 'Legal Source:'} {ns.source}</span>
                    {ns.last_verified_at && (
                      <span>{isBn ? 'সর্বশেষ যাচাই:' : 'Last Verified:'} {new Date(ns.last_verified_at).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {/* Bottom Sticky Action Bar */}
      <div className="pt-6 flex flex-col sm:flex-row gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="touch-target flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl border border-slate-300 dark:border-slate-700 text-xs active:scale-98 transition-all"
        >
          <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{isBn ? 'প্রিন্ট / অফিসিয়াল পিডিএফ সংরক্ষণ' : 'Print / Save Official PDF'}</span>
        </button>

        {onNavigateToMap && (
          <button
            onClick={onNavigateToMap}
            className="touch-target flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 text-xs active:scale-98 transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span>{isBn ? '৩ডি ক্যাডাস্ট্রাল মানচিত্রে প্লট পর্যবেক্ষণ' : 'Inspect Plot on 3D Cadastral Map'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
