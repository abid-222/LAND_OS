import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Save,
  Search,
  ArrowRight,
  ShieldAlert,
  Edit3,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import type { TrustStatus } from '../types/trust';

interface ExtractedFieldData {
  id: string;
  field_name: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
  flagged: boolean;
  flag_reason?: string;
  user_corrected: boolean;
  status_label: TrustStatus;
}

interface ConfirmPageProps {
  documentId: string;
  onNavigateToSearch?: (params: { khatian_no?: string; dag_no?: string; mouza?: string }) => void;
}

export const ConfirmPage: React.FC<ConfirmPageProps> = ({
  documentId,
  onNavigateToSearch,
}) => {
  const [fields, setFields] = useState<ExtractedFieldData[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExtraction() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/documents/${documentId}/extraction`);
        if (!res.ok) throw new Error('নথির তথ্য লোড করা যায়নি');
        const data = await res.json();
        setFields(data.fields || []);

        const initialValues: Record<string, string> = {};
        (data.fields || []).forEach((f: ExtractedFieldData) => {
          initialValues[f.field_name] = f.normalized_value || f.raw_value || '';
        });
        setEditedValues(initialValues);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    if (documentId) {
      fetchExtraction();
    }
  }, [documentId]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSaveCorrections = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const payload = {
        fields: Object.entries(editedValues).map(([field_name, corrected_value]) => ({
          field_name,
          corrected_value,
        })),
        reason: 'ব্যবহারকারী কর্তৃক মাঠ পর্যায়ে যাচাই ও সংশোধন',
      };

      const res = await fetch(`/api/v1/documents/${documentId}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('সংশোধন সংরক্ষণ ব্যর্থ হয়েছে');

      const data = await res.json();
      setFields(data.fields || []);
      setSaveSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceedSearch = () => {
    if (onNavigateToSearch) {
      onNavigateToSearch({
        khatian_no: editedValues['khatian_no'],
        dag_no: editedValues['dag_no'],
        mouza: editedValues['mouza'],
      });
    }
  };

  const getFieldTitleBn = (name: string): string => {
    switch (name) {
      case 'khatian_no':
        return 'খতিয়ান নম্বর';
      case 'dag_no':
        return 'দাগ নম্বর';
      case 'mouza':
        return 'মৌজার নাম';
      case 'document_no':
      case 'deed_no':
        return 'দলিল নম্বর';
      case 'area_acres':
        return 'জমির পরিমাণ (একর)';
      case 'owner_names_bn':
        return 'মালিকের নাম';
      default:
        return name;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] text-center p-6 text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm font-medium">নথির তথ্য প্রক্রিয়া করা হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-lg mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      {/* Epistemic Trust Rule Notice */}
      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5 mb-4">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">স্বয়ংক্রিয় ওসিআর যাচাইকরণ:</span>{' '}
          ওসিআর দ্বারা প্রাপ্ত কোনো তথ্যই চূড়ান্ত আইনি সত্য হিসেবে গণ্য নয়। অনুগ্রহ করে মূল দলিলের সাথে মিলিয়ে সন্দেহজনক ক্ষেত্রগুলো সংশোধন করুন।
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">শনাক্তকৃত তথ্যাবলি</h1>
        </div>
        <span className="text-xs text-slate-400 font-mono">#{documentId.slice(0, 8)}</span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-danger/20 border border-danger/40 text-danger-light text-xs mb-4">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>তথ্য সফলভাবে সংরক্ষিত ও আপডেট হয়েছে!</span>
        </div>
      )}

      {/* Fields List */}
      <div className="flex flex-col gap-3.5">
        {fields.map((f) => {
          const isSuspicious = f.flagged || f.confidence < 0.8;
          return (
            <div
              key={f.id}
              className={`p-4 rounded-xl bg-slate-900 border transition-all ${
                isSuspicious
                  ? 'border-amber-500/80 bg-amber-950/20 shadow-lg shadow-amber-950/30'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  {getFieldTitleBn(f.field_name)}
                </span>
                <div className="flex items-center gap-1.5">
                  {isSuspicious && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      যাচাই করুন
                    </span>
                  )}
                  <TrustBadge status={f.status_label || (f.user_corrected ? 'USER_CORRECTED' : 'OCR_EXTRACTED')} />
                </div>
              </div>

              {/* Editable Input Box */}
              <div className="relative mt-1">
                <input
                  type="text"
                  value={editedValues[f.field_name] || ''}
                  onChange={(e) => handleFieldChange(f.field_name, e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 text-white font-medium text-sm focus:outline-none focus:ring-2 border transition-colors ${
                    isSuspicious
                      ? 'border-amber-500/60 focus:ring-amber-500'
                      : 'border-slate-700 focus:ring-primary'
                  }`}
                  placeholder={getFieldTitleBn(f.field_name)}
                />
                <Edit3 className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
              </div>

              {/* Suspicious Warning Reason */}
              {isSuspicious && f.flag_reason && (
                <p className="text-[11px] text-amber-300 mt-1.5 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{f.flag_reason}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Thumb Zone Action Buttons */}
      <div className="pt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSaveCorrections}
          disabled={isSaving}
          className="touch-target flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-700 text-sm active:scale-98 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংশোধন সংরক্ষণ'}</span>
        </button>

        <button
          onClick={handleProceedSearch}
          className="touch-target flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-lg shadow-primary/20 text-sm active:scale-98 transition-all"
        >
          <Search className="w-4 h-4" />
          <span>রেকর্ড সন্ধান করুন</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
