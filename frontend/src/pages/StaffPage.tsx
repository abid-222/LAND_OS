import React, { useState } from 'react';
import {
  Check,
  RotateCcw,
  UserCheck,
} from 'lucide-react';

interface ReviewCase {
  id: string;
  case_number: string;
  document_name: string;
  doc_type: string;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'returned';
  flagged_fields: string[];
  assigned_to: string;
}

export const StaffPage: React.FC = () => {
  const [cases, setCases] = useState<ReviewCase[]>([
    {
      id: 'c-101',
      case_number: 'REV-2026-081',
      document_name: 'verified_khatian_scan.jpg',
      doc_type: 'খতিয়ান',
      created_at: '২০২৬-০৩-১৫ ১০:৩০',
      priority: 'high',
      status: 'pending',
      flagged_fields: ['dag_no (দাগ নং ১২০৫)'],
      assigned_to: 'মো: রফিকুল ইসলাম (রিভিউয়ার)',
    },
    {
      id: 'c-102',
      case_number: 'REV-2026-082',
      document_name: 'deed_tejgaon_4520.pdf',
      doc_type: 'বিক্রয় কবলা দলিল',
      created_at: '২০২৬-০৩-১৫ ১১:১৫',
      priority: 'medium',
      status: 'pending',
      flagged_fields: ['document_date (দলিলের তারিখ)'],
      assigned_to: 'নাসরিন সুলতানা (রিভিউয়ার)',
    },
    {
      id: 'c-103',
      case_number: 'REV-2026-083',
      document_name: 'porcha_dhanmondi_11.jpg',
      doc_type: 'পর্চা',
      created_at: '২০২৬-০৩-১৫ ১১:৪৫',
      priority: 'low',
      status: 'approved',
      flagged_fields: [],
      assigned_to: 'মো: রফিকুল ইসলাম (রিভিউয়ার)',
    },
  ]);

  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(cases[0]);
  const [actionModal, setActionModal] = useState<'approve' | 'return' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredCases = cases.filter(
    (c) => filterStatus === 'all' || c.status === filterStatus
  );

  const handleDecision = (decision: 'approved' | 'returned') => {
    if (!selectedCase) return;
    setCases((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id ? { ...c, status: decision } : c
      )
    );
    setSelectedCase((prev) => (prev ? { ...prev, status: decision } : null));
    setActionModal(null);
    setActionReason('');
  };

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white">ভূমি কর্মকর্তা ও রিভিউয়ার ওয়ার্কস্পেস</h1>
            <p className="text-xs text-slate-400">পর্যালোচনা কিউ ও ফিল্ড ওভারলে অডিট</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {['all', 'pending', 'approved', 'returned'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-primary text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status === 'all' ? 'সকল' : status === 'pending' ? 'অপেক্ষমান' : status === 'approved' ? 'অনুমোদিত' : 'ফেরত'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Review Queue Table / Cards, Right Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Queue Table (Desktop) / Cards (Mobile) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <span className="text-xs font-semibold text-slate-400">
            কেস তালিকা ({filteredCases.length})
          </span>

          <div className="flex flex-col gap-2.5">
            {filteredCases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {c.case_number}
                      </span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{c.doc_type}</h4>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : c.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-danger/20 text-danger-light border border-danger/30'
                      }`}
                    >
                      {c.status === 'pending' ? 'অপেক্ষমান' : c.status === 'approved' ? 'অনুমোদিত' : 'ফেরত'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                    <span className="truncate">{c.assigned_to}</span>
                    <span>{c.created_at.split(' ')[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Document Viewer with Bounding-Box Overlay */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedCase ? (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    নথি নিরীক্ষণ: {selectedCase.document_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    আইডি: {selectedCase.case_number} • ধরন: {selectedCase.doc_type}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActionModal('approve')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>অনুমোদন</span>
                  </button>

                  <button
                    onClick={() => setActionModal('return')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger hover:bg-danger-hover text-white text-xs font-semibold shadow-md active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ফেরত পাঠান</span>
                  </button>
                </div>
              </div>

              {/* Simulated Document Viewer with Bounding-Box Overlay */}
              <div className="relative rounded-xl bg-slate-950 aspect-[4/3] border border-slate-800 overflow-hidden flex items-center justify-center p-4">
                <div className="w-full h-full bg-slate-900/80 rounded-lg p-6 border border-slate-800 flex flex-col justify-between font-serif relative">
                  <div className="text-center border-b border-slate-700 pb-2">
                    <h4 className="text-xs font-bold text-white">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h4>
                    <p className="text-[10px] text-slate-400">ভূমি রেকর্ড ও জরিপ অধিদপ্তর — খতিয়ান</p>
                  </div>

                  {/* Bounding Box Overlay 1 (khatian_no) */}
                  <div className="absolute top-16 left-8 p-1 border-2 border-emerald-400/80 rounded bg-emerald-500/10 text-[10px] text-emerald-300 font-sans">
                    খতিয়ান নং: ৩৪০ [0.99]
                  </div>

                  {/* Bounding Box Overlay 2 (dag_no - Flagged with Amber!) */}
                  <div className="absolute top-28 right-8 p-1.5 border-2 border-amber-500 rounded bg-amber-500/20 text-[10px] text-amber-200 font-sans animate-pulse">
                    ⚠️ দাগ নং: ১২০৫ [0.45 - যাচাই প্রয়োজন]
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-300">
                    <p>মৌজা: তেজগাঁও, জেএল নং: ০৪৫</p>
                    <p>মালিকের নাম: আব্দুল করিম, পিতা: মৃত মোখলেসুর রহমান</p>
                    <p>অংশের পরিমাণ: ০.৩৩ একর (নাল জমি)</p>
                  </div>

                  <div className="text-right text-[10px] text-slate-500 border-t border-slate-700 pt-1 font-sans">
                    QR কোড ডিজিটাল অখণ্ডতা: হ্যাশ মিল (Sha-256 অখণ্ডতা যাচাই — স্বত্ব বা মালিকানা প্রমাণ নয়)
                  </div>
                </div>
              </div>

              {/* Flagged Fields Alert */}
              {selectedCase.flagged_fields.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-200 text-xs">
                  <span className="font-bold text-amber-100">সতর্কতার কারণ: </span>
                  {selectedCase.flagged_fields.join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
              বাম পাশ থেকে একটি কেস নির্বাচন করুন।
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl animate-in zoom-in-95 text-slate-100">
            <h3 className="text-base font-bold text-white mb-2">
              {actionModal === 'approve' ? 'কেস অনুমোদন নিশ্চিতকরণ' : 'কেস ফেরত পাঠানোর কারণ'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {actionModal === 'approve'
                ? 'অনুমোদনের পর নথির স্ট্যাটাস VERIFIED_AUTHORIZED_SOURCE এ রূপান্তরিত হবে।'
                : 'ফেরতের কারণ উল্লেখ করুন যাতে আবেদনকারী প্রয়োজনীয় সংশোধন করতে পারেন।'}
            </p>

            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="মন্তব্য বা কারণ লিখুন..."
              className="w-full p-3 rounded-xl bg-slate-950 text-white border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                বাতিল
              </button>
              <button
                onClick={() => handleDecision(actionModal === 'approve' ? 'approved' : 'returned')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${
                  actionModal === 'approve' ? 'bg-primary hover:bg-primary-hover' : 'bg-danger hover:bg-danger-hover'
                }`}
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
