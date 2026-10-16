import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  RotateCcw,
  UserCheck,
  ShieldCheck,
  MapPin,
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

interface StaffPageProps {
  onNavigateToTab?: (tab: string, params?: Record<string, string>) => void;
}

export const StaffPage: React.FC<StaffPageProps> = ({ onNavigateToTab }) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [cases, setCases] = useState<ReviewCase[]>([
    {
      id: 'c-101',
      case_number: 'REV-2026-081',
      document_name: 'verified_khatian_scan.jpg',
      doc_type: isBn ? 'খতিয়ান' : 'Khatian Record',
      created_at: '2026-03-15 10:30',
      priority: 'high',
      status: 'pending',
      flagged_fields: [isBn ? 'দাগ নং ১২০৫' : 'Plot No. 1205'],
      assigned_to: isBn ? 'মো: রফিকুল ইসলাম (রিভিউয়ার)' : 'Md. Rafiqul Islam (Reviewer)',
    },
    {
      id: 'c-102',
      case_number: 'REV-2026-082',
      document_name: 'deed_tejgaon_4520.pdf',
      doc_type: isBn ? 'বিক্রয় কবলা দলিল' : 'Deed of Sale',
      created_at: '2026-03-15 11:15',
      priority: 'medium',
      status: 'pending',
      flagged_fields: [isBn ? 'দলিলের তারিখ' : 'Registration Date'],
      assigned_to: isBn ? 'নাসরিন সুলতানা (রিভিউয়ার)' : 'Nasreen Sultana (Reviewer)',
    },
    {
      id: 'c-103',
      case_number: 'REV-2026-083',
      document_name: 'porcha_dhanmondi_11.jpg',
      doc_type: isBn ? 'পর্চা' : 'Porcha Record',
      created_at: '2026-03-15 11:45',
      priority: 'low',
      status: 'approved',
      flagged_fields: [],
      assigned_to: isBn ? 'মো: রফিকুল ইসলাম (রিভিউয়ার)' : 'Md. Rafiqul Islam (Reviewer)',
    },
  ]);

  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(cases[0]);
  const [actionModal, setActionModal] = useState<'approve' | 'return' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredCases = cases.filter((c) => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

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
    <div className="flex flex-col min-h-screen-dvh max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isBn ? 'ভূমি কর্মকর্তা ও নিরীক্ষক ওয়ার্কস্পেস' : 'Reviewer & Land Officer Workspace'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn ? 'পর্যালোচনা কিউ ও ফিল্ড ওভারলে অডিট নিয়ন্ত্রণ' : 'Inspection queue and document overlay verification'}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
          {['all', 'pending', 'approved', 'returned'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterStatus === status
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {status === 'all'
                ? (isBn ? 'সকল' : 'All')
                : status === 'pending'
                ? (isBn ? 'অপেক্ষমান' : 'Pending')
                : status === 'approved'
                ? (isBn ? 'অনুমোদিত' : 'Approved')
                : (isBn ? 'ফেরত' : 'Returned')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Review Queue Table / Cards, Right Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Queue Table */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            {isBn ? `কেস তালিকা (${filteredCases.length})` : `Case Queue (${filteredCases.length})`}
          </span>

          <div className="flex flex-col gap-3">
            {filteredCases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-white dark:bg-[#04080c] border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.case_number}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{c.doc_type}</h4>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.status === 'pending'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          : c.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {c.status === 'pending'
                        ? (isBn ? 'অপেক্ষমান' : 'Pending')
                        : c.status === 'approved'
                        ? (isBn ? 'অনুমোদিত' : 'Approved')
                        : (isBn ? 'ফেরত' : 'Returned')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="truncate">{c.assigned_to}</span>
                    <span className="font-mono text-[11px]">{c.created_at.split(' ')[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Document Viewer */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedCase ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isBn ? `নথি নিরীক্ষণ: ${selectedCase.document_name}` : `Inspection: ${selectedCase.document_name}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    ID: {selectedCase.case_number} • {selectedCase.doc_type}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onNavigateToTab && (
                    <>
                      <button
                        onClick={() => onNavigateToTab('verify', { recordId: selectedCase.case_number })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                        title="Open in Verification Workspace"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isBn ? 'ভেরিফিকেশন' : 'Verify'}</span>
                      </button>
                      <button
                        onClick={() => onNavigateToTab('map', { parcelId: 'P-4520' })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                        title="View Plot on 3D Cadastral Map"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isBn ? 'ম্যাপ' : 'Map'}</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setActionModal('approve')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                  </button>

                  <button
                    onClick={() => setActionModal('return')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ফেরত পাঠান' : 'Return'}</span>
                  </button>
                </div>
              </div>

              {/* Document Simulator */}
              <div className="relative rounded-2xl bg-slate-100 dark:bg-black/90 aspect-[4/3] border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-5 shadow-inner">
                <div className="w-full h-full bg-white dark:bg-[#070d12] rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between font-serif relative shadow-md">
                  <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isBn ? 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার' : 'Government of the People\'s Republic of Bangladesh'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {isBn ? 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর — খতিয়ান' : 'Directorate of Land Records and Surveys'}
                    </p>
                  </div>

                  {/* Bounding Box Overlay 1 (khatian_no) */}
                  <div className="absolute top-20 left-8 p-1.5 border border-emerald-500 rounded-lg bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-300 font-sans font-bold">
                    {isBn ? 'খতিয়ান নং: ৩৪০ [0.99]' : 'Khatian No: 340 [0.99]'}
                  </div>

                  {/* Bounding Box Overlay 2 (dag_no) */}
                  <div className="absolute top-32 right-8 p-1.5 border border-emerald-600/50 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-200 font-sans font-bold">
                    {isBn ? 'দাগ নং: ১২০৫ [যাচাই প্রয়োজন]' : 'Plot No: 1205 [Review Required]'}
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-sans">
                    <p>{isBn ? 'মৌজা: তেজগাঁও, জেএল নং: ০৪৫' : 'Mouza: Tejgaon, JL No: 045'}</p>
                    <p>{isBn ? 'মালিকের নাম: মোঃ আব্দুল করিম' : 'Owner: Md. Abdul Karim'}</p>
                    <p>{isBn ? 'অংশের পরিমাণ: ০.৩৩ একর (নাল জমি)' : 'Area: 0.33 Acres'}</p>
                  </div>

                  <div className="text-right text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 font-sans">
                    {isBn
                      ? 'ডিজিটাল অখণ্ডতা: হ্যাশ মিল (SHA-256 অখণ্ডতা যাচাই)'
                      : 'Digital Integrity: Verified SHA-256 Hash Match'}
                  </div>
                </div>
              </div>

              {selectedCase.flagged_fields.length > 0 && (
                <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-[#070d12] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isBn ? 'পর্যালোচনার কারণ: ' : 'Flagged Reason: '}
                  </span>
                  <span>{selectedCase.flagged_fields.join(', ')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800 text-slate-400">
              {isBn ? 'বাম পাশ থেকে একটি কেস নির্বাচন করুন।' : 'Select a review case from the queue.'}
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/30 shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {actionModal === 'approve'
                ? (isBn ? 'কেস অনুমোদন নিশ্চিতকরণ' : 'Confirm Case Approval')
                : (isBn ? 'কেস ফেরত পাঠানোর কারণ' : 'Specify Return Reason')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {actionModal === 'approve'
                ? (isBn
                    ? 'অনুমোদনের পর নথির স্ট্যাটাস VERIFIED_AUTHORIZED_SOURCE এ রূপান্তরিত হবে।'
                    : 'Upon approval, document status transitions to VERIFIED_AUTHORIZED_SOURCE.')
                : (isBn
                    ? 'ফেরতের কারণ উল্লেখ করুন যাতে আবেদনকারী প্রয়োজনীয় সংশোধন করতে পারেন।'
                    : 'Detail the issues so the applicant can submit the required corrections.')}
            </p>

            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={isBn ? 'মন্তব্য বা কারণ লিখুন...' : 'Enter inspection remarks...'}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-500 mb-4 transition-colors"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDecision(actionModal === 'approve' ? 'approved' : 'returned')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                  actionModal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {isBn ? 'নিশ্চিত করুন' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
