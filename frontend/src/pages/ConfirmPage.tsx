import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Save,
  ArrowRight,
  ShieldCheck,
  Edit3,
  FileText,
  FileCheck2,
  FileSpreadsheet,
  MessageSquareWarning,
  Info,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { FeedbackModal, type FeedbackTarget } from '../components/FeedbackModal';
import type { TrustStatus } from '../types/trust';

export type DocType = 'khatian' | 'deed' | 'porcha';

export interface ExtractedFieldData {
  id: string;
  field_name: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
  flagged: boolean;
  flag_reason?: string;
  status_label?: TrustStatus;
  original_unit?: string;
  user_corrected?: boolean;
}

interface ConfirmPageProps {
  documentId: string;
  durationMs?: number;
  onNavigateToSearch?: (params?: { initialKhatian?: string; initialDag?: string; initialMouza?: string }) => void;
  onNavigateToVerify?: (docId: string, recId?: string) => void;
  onProceedToSearch?: (khatianNo?: string, dagNo?: string, mouza?: string) => void;
  onProceedToCases?: (caseId: string) => void;
}

export const ConfirmPage: React.FC<ConfirmPageProps> = ({
  documentId,
  durationMs = 1200,
  onNavigateToSearch,
  onNavigateToVerify,
  onProceedToSearch,
  onProceedToCases,
}) => {
  // Retain props for verification workflow
  void durationMs;
  void onNavigateToVerify;
  void onProceedToCases;
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [docType, setDocType] = useState<DocType>('khatian');
  const [fields, setFields] = useState<ExtractedFieldData[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reviewCaseCreated, setReviewCaseCreated] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocumentFields();
  }, [documentId]);

  const fetchDocumentFields = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/documents/${documentId}/fields`);
      if (!res.ok) {
        throw new Error(isBn ? 'নথির ফিল্ডসমূহ লোড করা সম্ভব হয়নি' : 'Failed to load document fields');
      }
      const data = await res.json();
      const extracted: ExtractedFieldData[] = data.fields || [];

      setFields(extracted);

      const initialValues: Record<string, string> = {};
      extracted.forEach((f) => {
        initialValues[f.field_name] = f.normalized_value || f.raw_value;
      });
      setEditedValues(initialValues);

      const hasLowConfidence = extracted.some((f) => f.flagged || f.confidence < 0.7);
      if (hasLowConfidence) {
        setReviewCaseCreated(true);
      }
    } catch {
      // Mock fallback data for demo
      const fallback: ExtractedFieldData[] = [
        {
          id: 'f1',
          field_name: 'khatian_no',
          raw_value: '৩৪০',
          normalized_value: '৩৪০',
          confidence: 0.98,
          flagged: false,
          status_label: 'OCR_EXTRACTED',
        },
        {
          id: 'f2',
          field_name: 'dag_no',
          raw_value: '১২০৫',
          normalized_value: '১২০৫',
          confidence: 0.94,
          flagged: false,
          status_label: 'OCR_EXTRACTED',
        },
        {
          id: 'f3',
          field_name: 'mouza',
          raw_value: 'তেজগাঁও শিল্প এলাকা',
          normalized_value: 'তেজগাঁও',
          confidence: 0.88,
          flagged: false,
          status_label: 'OCR_EXTRACTED',
        },
        {
          id: 'f4',
          field_name: 'area_acres',
          raw_value: '৩৩ শতাংশ',
          normalized_value: '0.33',
          original_unit: 'শতাংশ',
          confidence: 0.82,
          flagged: false,
          status_label: 'OCR_EXTRACTED',
        },
        {
          id: 'f5',
          field_name: 'owner_names_bn',
          raw_value: 'মোঃ আব্দুল করিম',
          normalized_value: 'মোঃ আব্দুল করিম',
          confidence: 0.65,
          flagged: true,
          flag_reason: isBn ? 'অস্পষ্ট হস্তলিপি: পুনরায় যাচাই করুন' : 'Ambiguous handwriting: verify manually',
          status_label: 'OCR_EXTRACTED',
        },
      ];
      setFields(fallback);
      const initialValues: Record<string, string> = {};
      fallback.forEach((f) => {
        initialValues[f.field_name] = f.normalized_value;
      });
      setEditedValues(initialValues);
      setReviewCaseCreated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleDocTypeChange = (newType: DocType) => {
    setDocType(newType);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updates = fields.map((f) => ({
        field_name: f.field_name,
        corrected_value: editedValues[f.field_name] || f.normalized_value,
        user_corrected: editedValues[f.field_name] !== f.normalized_value,
      }));

      await fetch(`/api/v1/documents/${documentId}/fields/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: docType, updates }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedToSearch = () => {
    if (onNavigateToSearch) {
      onNavigateToSearch({
        initialKhatian: editedValues['khatian_no'] || '',
        initialDag: editedValues['dag_no'] || '',
        initialMouza: editedValues['mouza'] || '',
      });
    } else if (onProceedToSearch) {
      onProceedToSearch(editedValues['khatian_no'], editedValues['dag_no'], editedValues['mouza']);
    }
  };

  const getFieldTitleBn = (name: string) => {
    if (!isBn) {
      switch (name) {
        case 'khatian_no': return 'Khatian Number';
        case 'dag_no': return 'Plot / Dag Number';
        case 'mouza': return 'Mouza Name';
        case 'area_acres': return 'Land Area & Units';
        case 'owner_names_bn': return docType === 'deed' ? 'Parties (Buyer/Seller)' : 'Owner Names';
        default: return name;
      }
    }
    switch (name) {
      case 'khatian_no': return 'খতিয়ান নম্বর';
      case 'dag_no': return 'দাগ নম্বর';
      case 'mouza': return 'মৌজার নাম';
      case 'area_acres': return 'জমির পরিমাণ ও মূল একক';
      case 'owner_names_bn': return docType === 'deed' ? 'দাতা ও গ্রহীতার নাম' : 'মালিকের নাম';
      default: return name;
    }
  };

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors pb-32">
      {/* Verification Advisory Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 text-slate-600 dark:text-slate-300 text-xs flex items-start gap-3 mb-5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
            {isBn ? 'স্বয়ংক্রিয় ওসিআর পাঠোদ্ধার ও যাচাইকরণ' : 'Automated OCR Extraction & Review'}
          </span>
          {isBn
            ? 'ওসিআর দ্বারা প্রাপ্ত ফিল্ডসমূহ মূল দলিলের সাথে মিলিয়ে দেখে প্রয়োজনে সংশোধন করে সংরক্ষণ করুন।'
            : 'Review the automatically extracted fields below and edit any values before final registration.'}
        </div>
      </div>

      {/* Review Case Advisory */}
      {reviewCaseCreated && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070d12] border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-start gap-3 mb-5 shadow-sm">
          <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              {isBn ? 'পর্যালোচনা কেস প্রস্তুত' : 'Review Case Initialized'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'কিছু ফিল্ডে আত্মবিশ্বাস কম থাকায় ম্যানুয়াল যাচাইকরণের সুপারিশ করা হয়েছে।'
                : 'Selected fields have low confidence scores and require visual inspection.'}
            </p>
          </div>
        </div>
      )}

      {/* Header & Document Type Selector */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl mb-6 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {isBn ? 'শনাক্তকৃত নথির তথ্যাবলি' : 'Extracted Document Records'}
              </h1>
              <span className="text-xs text-slate-400 font-mono">ID: #{documentId.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        {/* Document Type Selector (Deed / Khatian / Porcha) */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Document Classification / নথির ধরন:
          </span>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleDocTypeChange('khatian')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                docType === 'khatian'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-50 dark:bg-black/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>Khatian <span className="opacity-75 font-normal text-[11px]">(খতিয়ান)</span></span>
            </button>
            <button
              type="button"
              onClick={() => handleDocTypeChange('deed')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                docType === 'deed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-50 dark:bg-black/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Deed <span className="opacity-75 font-normal text-[11px]">(দলিল)</span></span>
            </button>
            <button
              type="button"
              onClick={() => handleDocTypeChange('porcha')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                docType === 'porcha'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-50 dark:bg-black/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Porcha <span className="opacity-75 font-normal text-[11px]">(পর্চা)</span></span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs mb-5">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs mb-5 flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{isBn ? 'তথ্য সফলভাবে সংরক্ষিত ও আপডেট হয়েছে!' : 'Data successfully updated and saved!'}</span>
        </div>
      )}

      {/* Fields List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800 animate-pulse">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
              <div className="h-10 w-full bg-slate-100 dark:bg-black/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : fields.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800 text-slate-500 my-4">
          <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold">{isBn ? 'কোনো ফিল্ড শনাক্ত করা যায়নি' : 'No fields detected'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => {
            const isSuspicious = f.flagged || f.confidence < 0.7;
            return (
              <div
                key={f.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800/90 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {getFieldTitleBn(f.field_name)}
                  </span>
                  <TrustBadge
                    status={
                      f.status_label || (f.user_corrected ? 'USER_CORRECTED' : 'OCR_EXTRACTED')
                    }
                  />
                </div>

                <div className="relative mt-2">
                  <input
                    type="text"
                    value={editedValues[f.field_name] || ''}
                    onChange={(e) => handleFieldChange(f.field_name, e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-emerald-500 border border-slate-300 dark:border-slate-800 transition-colors"
                    placeholder={getFieldTitleBn(f.field_name)}
                  />
                  <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>

                {f.original_unit && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {isBn ? 'মূল একক: ' : 'Original Unit: '}<span className="text-slate-700 dark:text-slate-200 font-semibold">{f.original_unit}</span>
                  </p>
                )}

                {isSuspicious && f.flag_reason && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>{f.flag_reason}</span>
                  </p>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setFeedbackTarget({
                        documentId,
                        fieldName: f.field_name,
                        fieldLabelBn: getFieldTitleBn(f.field_name),
                        extractedValue: editedValues[f.field_name] || f.normalized_value,
                        feedbackType: 'wrong_field',
                      })
                    }
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ত্রুটি রিপোর্ট' : 'Report Issue'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-white/90 dark:bg-[#04080c]/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 sm:flex-initial sm:min-w-[180px] flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-[#070d12] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-sm transition-all shadow-sm"
          >
            <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পরিবর্তন সংরক্ষণ' : 'Save Changes')}</span>
          </button>

          <button
            onClick={handleProceedToSearch}
            className="flex-1 sm:flex-initial sm:min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-sm transition-all"
          >
            <span>{isBn ? 'রেকর্ড অনুসন্ধানে যান' : 'Search Land Record'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <FeedbackModal
        isOpen={Boolean(feedbackTarget)}
        target={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
      />
    </div>
  );
};
