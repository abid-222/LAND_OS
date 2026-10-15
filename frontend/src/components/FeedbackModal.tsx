import React, { useState } from 'react';
import { MessageSquareWarning, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

export interface FeedbackTarget {
  documentId?: string;
  recordId?: string;
  fieldName?: string;
  fieldLabelBn?: string;
  extractedValue?: string;
  feedbackType: 'wrong_field' | 'wrong_match' | 'ocr_error';
}

interface FeedbackModalProps {
  isOpen: boolean;
  target: FeedbackTarget | null;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  target,
  onClose,
}) => {
  const [correctedValue, setCorrectedValue] = useState('');
  const [reason, setReason] = useState('অক্ষর অস্পষ্ট বা ভুল এক্সট্রাকশন');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.post('/api/v1/feedback/corrections', {
        document_id: target.documentId || 'doc-general',
        record_id: target.recordId,
        field_name: target.fieldName || 'match_candidate',
        original_value: target.extractedValue || '',
        corrected_value: correctedValue.trim(),
        reason: reason,
        feedback_type: target.feedbackType,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setCorrectedValue('');
        onClose();
      }, 1800);
    } catch {
      // Offline fallback: save feedback into localStorage queue
      try {
        const key = 'landos_offline_feedback';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({
          document_id: target.documentId,
          field_name: target.fieldName,
          original_value: target.extractedValue,
          corrected_value: correctedValue.trim(),
          reason,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setCorrectedValue('');
          onClose();
        }, 1800);
      } catch (err: unknown) {
        setErrorMsg('মতামত পাঠাতে সমস্যা হয়েছে।');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">সংশোধন ও ফিডব্যাক (সঠিক নয়)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-sm font-bold text-white">ধন্যবাদ! ফিডব্যাক গৃহীত হয়েছে</h4>
            <p className="text-xs text-slate-300">
              আপনার মতামত সিস্টেমের কৃত্রিম বুদ্ধিমত্তা মডেল আরও নির্ভুল করতে সাহায্য করবে।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">নির্দিষ্ট ক্ষেত্র:</span>
                <span className="font-semibold text-emerald-400">{target.fieldLabelBn || target.fieldName || 'ম্যাচিং ফলাফল'}</span>
              </div>
              {target.extractedValue && (
                <div className="flex justify-between">
                  <span className="text-slate-400">শনাক্তকৃত মান:</span>
                  <span className="font-mono text-slate-200">{target.extractedValue}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                সঠিক মান (আপনার পাঠ অনুযায়ী লিখুন)
              </label>
              <input
                type="text"
                required
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                placeholder="যেমন: ৩৪০/ক"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ভুলের ধরন বা কারণ
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="অক্ষর অস্পষ্ট বা ভুল এক্সট্রাকশন">অক্ষর অস্পষ্ট বা ভুল এক্সট্রাকশন</option>
                <option value="সংখ্যা গুলিয়ে ফেলা (যেমন: ১ ও ৭, ৩ ও ৮)">সংখ্যা গুলিয়ে ফেলা (যেমন: ১ ও ৭, ৩ ও ৮)</option>
                <option value="ভুল রেকর্ড প্রার্থীর সাথে মিল দেখানো হয়েছে">ভুল রেকর্ড প্রার্থীর সাথে মিল দেখানো হয়েছে</option>
                <option value="দাগ বা খতিয়ান বিভাজন সাব-নম্বর বাদ পড়েছে">দাগ বা খতিয়ান বিভাজন সাব-নম্বর বাদ পড়েছে</option>
                <option value="অন্যান্য কারণ">অন্যান্য কারণ</option>
              </select>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 p-2 rounded bg-rose-500/10 border border-rose-500/20">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !correctedValue.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>জমা হচ্ছে...</span>
                </>
              ) : (
                <span>সংশোধন জমা দিন</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
