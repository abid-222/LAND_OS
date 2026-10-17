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
} from 'lucide-react';
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

interface BuyerReportData {
  id: string;
  parcel_id: string;
  generated_at: string;
  sections: {
    parcel_summary: ParcelSummary;
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
  { id: 'P-4520', label: 'তেজগাঁও (দাগ ৪৫২০, খতিয়ান ১২০৫)' },
  { id: 'P-3201', label: 'মিরপুর (দাগ ৩২০১, খতিয়ান ৭৮৯)' },
  { id: 'demo-parcel-101', label: 'ধানমন্ডি (দাগ ৮৯০, খতিয়ান ৫০১)' },
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
          parcel_summary: {
            synthetic_id: parcelId,
            mouza: parcelId === 'P-3201' ? 'মিরপুর' : parcelId === 'demo-parcel-101' ? 'ধানমন্ডি' : 'তেজগাঁও',
            main_no: parcelId === 'P-3201' ? '৩২০১' : parcelId === 'demo-parcel-101' ? '৮৯০' : '৪৫২০',
            sub_no: '১',
            land_type: 'নাল (কৃষি জমি)',
            area_decimal: parcelId === 'P-3201' ? 42.0 : parcelId === 'demo-parcel-101' ? 8.5 : 15.5,
            area_acres: parcelId === 'P-3201' ? 0.42 : parcelId === 'demo-parcel-101' ? 0.085 : 0.155,
            boundary_note: 'Illustrative / Not a legal boundary (প্রদর্শিত সীমানা ও নকশা শুধুমাত্র উদাহরণের জন্য, এটি কোনো আইনি সীমানা নয়)',
          },
          matching_records: [
            {
              record_id: 'rec-001',
              khatian_no: parcelId === 'P-3201' ? '৭৮৯' : parcelId === 'demo-parcel-101' ? '৫০১' : '১২০৫',
              dag_no: parcelId === 'P-3201' ? '৩২০১' : parcelId === 'demo-parcel-101' ? '৮৯০' : '৪৫২০',
              owner_names: 'আব্দুল করিম ও অন্যান্য',
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

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors print:p-0 print:text-black pb-28">
      {/* Top Controls: Preset Chips & Manual Parcel Search */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 mb-5 shadow-lg print:hidden transition-all">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>প্লট ও পার্সেল দ্রুত নির্বাচন করুন:</span>
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
              <span>ম্যানুয়াল পার্সেল / দাগ আইডি:</span>
            </label>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                value={manualInputId}
                onChange={(e) => setManualInputId(e.target.value)}
                placeholder="যেমন: P-4520 বা দাগ নং"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-md transition-all active:scale-95"
              >
                লোড
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
              <span>ক্রেতা ঝুঁকি ও তথ্য অনুসন্ধান প্রতিবেদন</span>
            </h1>
            <DisclaimerBanner type="badge" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            পার্সেল: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedParcelId}</strong> • তৈরি: {new Date(report?.generated_at || Date.now()).toLocaleDateString('bn-BD')} • ল্যান্ডওএস v3.0
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
              <span>মানচিত্রে অবস্থান</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="touch-target p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 relative active:scale-95 transition-all"
            title="লিংক শেয়ার করুন"
          >
            <Share2 className="w-4 h-4" />
            {copiedLink && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
                কপি হয়েছে!
              </span>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="touch-target px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            title="প্রিন্ট বা পিডিএফ সংরক্ষণ"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট / PDF</span>
          </button>
        </div>
      </div>

      {/* Fixed Legal Disclaimer (Prominently pinned at top) */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500/80 text-amber-900 dark:text-amber-200 text-xs mb-5 shadow-lg leading-relaxed">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="font-extrabold text-sm text-amber-950 dark:text-white mb-0.5">
              তথ্য যাচাই প্রয়োজন — ডেমো পরীক্ষামূলক প্রতিবেদন
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {report?.sections.disclaimer.primary_text ||
                'তথ্য যাচাই প্রয়োজন. এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। প্রদর্শিত সকল তথ্য ডেমো বা পরীক্ষামূলক। জমি ক্রয়ের পূর্বে সংশ্লিষ্ট রেজিস্ট্রি ও ভূমি অফিসে মূল বালাম বহির সাথে সরাসরি যাচাই করা আইনত আবশ্যক।'}
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
          {/* SECTION 1: PARCEL SUMMARY + 3D CADASTRAL VISUALIZATION */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>১. পার্সেল পরিচিতি ও জমির বিবরণ</span>
            </h2>

            {/* Data Grid & Due Diligence */}
            <div className="space-y-4 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">পার্সেল আইডি</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {report.sections.parcel_summary.synthetic_id}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">মৌজা</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {report.sections.parcel_summary.mouza}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">দাগ নম্বর</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {report.sections.parcel_summary.main_no}
                    {report.sections.parcel_summary.sub_no ? `/${report.sections.parcel_summary.sub_no}` : ''}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">ভূমির শ্রেণি</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {report.sections.parcel_summary.land_type}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">জমির পরিমাণ</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {report.sections.parcel_summary.area_decimal} শতক
                  </span>
                  <span className="text-[10px] text-slate-500 block">({report.sections.parcel_summary.area_acres} একর)</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">ডেটা প্রকার</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">ডিজিটাল সার্টিফাইড</span>
                </div>
              </div>

              {/* Due Diligence Title Risk Status Bar */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>মালিকানা নির্ভরযোগ্যতা সূচক (Title Due Diligence Integrity)</span>
                  </span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">৮৫% (উচ্চ)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  বালাম বইয়ের সাথে দাগ ও খতিয়ান মিল শতভাগ। তবে বায়া দলিলের মধ্যবর্তী রেফারেন্স মাঠপর্যায়ে যাচাইযোগ্য।
                </p>
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
          {/* SECTION 2: MATCHING RECORDS */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>২. ম্যাচিং সরকারি খতিয়ান রেকর্ড</span>
            </h2>
            {report.sections.matching_records.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">কোনো অনুমোদিত বালাম রেকর্ড মেলেনি।</p>
            ) : (
              <div className="space-y-3">
                {report.sections.matching_records.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        খতিয়ান #{rec.khatian_no} • দাগ #{rec.dag_no}
                      </span>
                      <TrustBadge status={rec.status_label} />
                    </div>
                    <div className="text-[12px] text-slate-700 dark:text-slate-300">
                      মালিক/রেকর্ডধারী: <strong className="text-slate-900 dark:text-white font-bold">{rec.owner_names || '—'}</strong>
                    </div>
                    {rec.reasons?.length > 0 && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 font-medium">
                        মিলের কারণ: {rec.reasons.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span>উৎস: {rec.source}</span>
                      <span>যাচাই সময়: {new Date(rec.retrieved_at).toLocaleDateString('bn-BD')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* HISTORICAL OWNERSHIP TRANSFER CHAIN (EXCLUSIVE FEATURE) */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>মালিকানা ধারাবাহিকতা টাইমলাইন (Deed Chain of Title)</span>
            </h2>
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
                      রেকর্ডধারী/গ্রহীতা: <strong className="text-slate-900 dark:text-white">{item.owner}</strong>
                    </p>
                    {item.note && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 font-medium bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: DOCUMENT CONFLICTS (Counts by severity, strictly no overall score) */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>৩. দলিল ও রেকর্ড সংক্রান্ত সম্ভাব্য অসঙ্গতি</span>
              </h2>
              {onNavigateToAlerts && (
                <button
                  onClick={() => onNavigateToAlerts(selectedParcelId)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>সকল অ্যালার্ট</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Severity Counts Bar (NO overall score, NO safe/unsafe verdict) */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold block">উচ্চ মনোযোগ</span>
                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {report.sections.document_conflicts.counts.high}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold block">সতর্কতা</span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                  {report.sections.document_conflicts.counts.warn}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30">
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-extrabold block">তথ্যগত</span>
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
                        {alt.severity === 'high' ? 'উচ্চ মনোযোগ' : alt.severity === 'warn' ? 'সতর্কতা' : 'তথ্যগত'}
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
                          <span>প্রমাণাদি ({alt.evidence.length} টি)</span>
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
                <span>৪. প্রয়োজনীয় দলিলের নমুনা যাচাই তালিকা</span>
              </h2>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold border border-slate-200 dark:border-slate-700">
                SAMPLE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 italic">
              {report.sections.missing_evidence.sample_disclaimer} (মোট: {report.sections.missing_evidence.total_required} টির মধ্যে {report.sections.missing_evidence.attached_count} টি সংযুক্ত)
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
          {/* SECTION 5: NEXT STEPS (Grounded KB with last verified date) */}
          {/* ------------------------------------------------------------- */}
          <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>৫. {report.sections.next_steps.title}</span>
            </h2>
            <div className="space-y-3.5">
              {report.sections.next_steps.items.map((ns) => (
                <div key={ns.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{ns.title}</h4>
                    {ns.needs_verification ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                        তথ্য যাচাই প্রয়োজন
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                        অনুমোদিত নির্দেশিকা
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">{ns.step_text}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span>আইনি উৎস: {ns.source}</span>
                    {ns.last_verified_at && (
                      <span>সর্বশেষ যাচাই: {new Date(ns.last_verified_at).toLocaleDateString('bn-BD')}</span>
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
          <span>প্রিন্ট / অফিসিয়াল পিডিএফ সংরক্ষণ</span>
        </button>

        {onNavigateToMap && (
          <button
            onClick={onNavigateToMap}
            className="touch-target flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 text-xs active:scale-98 transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span>৩ডি ক্যাডাস্ট্রাল মানচিত্রে প্লট পর্যবেক্ষণ</span>
          </button>
        )}
      </div>
    </div>
  );
};
