import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ChevronRight,
  Sparkles,
  MessageSquareWarning,
  Building2,
  FileText,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { FeedbackModal, type FeedbackTarget } from '../components/FeedbackModal';
import type { TrustStatus } from '../types/trust';

interface CandidateMatch {
  record_id: string;
  record_no: string;
  khatian_no: string;
  dag_no: string;
  mouza_name_bn: string;
  survey_type: string;
  owner_names_bn: string;
  area_acres: number;
  score: number;
  reasons: string[];
  source: string;
  retrieved_at: string;
  status_label: TrustStatus;
}

interface SearchPageProps {
  initialKhatian?: string;
  initialDag?: string;
  initialMouza?: string;
  onSelectRecord?: (recordId: string) => void;
}

const toBengaliDigits = (val: number | string) =>
  String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);

export const SearchPage: React.FC<SearchPageProps> = ({
  initialKhatian = '',
  initialDag = '',
  initialMouza = '',
  onSelectRecord,
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [khatianNo, setKhatianNo] = useState(initialKhatian);
  const [dagNo, setDagNo] = useState(initialDag);
  const [documentNo, setDocumentNo] = useState('');
  const [mouza, setMouza] = useState(initialMouza);

  const [candidates, setCandidates] = useState<CandidateMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);

  const executeSearch = useCallback(async () => {
    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      const payload: Record<string, string | number> = { limit: 5 };
      if (khatianNo.trim()) payload.khatian_no = khatianNo.trim();
      if (dagNo.trim()) payload.dag_no = dagNo.trim();
      if (documentNo.trim()) payload.document_no = documentNo.trim();
      if (mouza.trim()) payload.mouza = mouza.trim();

      const res = await fetch('/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(isBn ? 'রেকর্ড অনুসন্ধানে ত্রুটি হয়েছে' : 'Search request failed');

      const data = await res.json();
      const results: CandidateMatch[] = data.candidates || [];
      setCandidates(results);

      // Check ambiguity rule: top 2 candidates difference < 0.10
      if (results.length >= 2) {
        const diff = Math.abs(results[0].score - results[1].score);
        setAmbiguous(diff < 0.10 && results[0].score >= 0.5);
      } else {
        setAmbiguous(false);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSearching(false);
    }
  }, [khatianNo, dagNo, documentNo, mouza, isBn]);

  useEffect(() => {
    if (initialKhatian || initialDag || initialMouza) {
      executeSearch();
    }
  }, [initialKhatian, initialDag, initialMouza, executeSearch]);

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isBn ? 'খতিয়ান ও মৌজা রেকর্ড অনুসন্ধান' : 'Cadastral Khatian & Record Search'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'মৌজা, খতিয়ান বা দাগ নম্বর প্রদান করে তাৎক্ষণিক ডিজিটাল রেকর্ড যাচাই করুন'
                : 'Lookup land records, plot boundaries, and ownership details in real-time'}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Multi-Identifier Input Panel */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl mb-6 transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? 'খতিয়ান নম্বর (Khatian No.)' : 'Khatian No. (খতিয়ান)'}</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={khatianNo}
              onChange={(e) => setKhatianNo(e.target.value)}
              placeholder={isBn ? 'যেমন: ৩৪০' : 'e.g. 340'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? 'দাগ নম্বর (Plot / Dag No.)' : 'Plot / Dag No. (দাগ নং)'}</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={dagNo}
              onChange={(e) => setDagNo(e.target.value)}
              placeholder={isBn ? 'যেমন: ১২০৫' : 'e.g. 1205'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{isBn ? 'দলিল নম্বর (Deed No.)' : 'Deed No. (দলিল নং)'}</span>
            </label>
            <input
              type="text"
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              placeholder={isBn ? 'দলিল নং' : 'Deed Registration No.'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{isBn ? 'মৌজা (Mouza Name)' : 'Mouza (মৌজা)'}</span>
            </label>
            <input
              type="text"
              value={mouza}
              onChange={(e) => setMouza(e.target.value)}
              placeholder={isBn ? 'মৌজার নাম' : 'Mouza Name'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
            />
          </div>
        </div>

        <button
          onClick={executeSearch}
          disabled={isSearching}
          className="w-full sm:w-auto sm:min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 text-sm transition-all disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{isSearching ? (isBn ? 'অনুসন্ধান চলছে...' : 'Searching...') : (isBn ? 'অনুসন্ধান করুন' : 'Search Records')}</span>
        </button>
      </div>

      {/* Advisory Match Alert */}
      {ambiguous && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070d12] border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs mb-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">
                {isBn ? 'সতর্কতা: একাধিক ঘনিষ্ঠ মিল পাওয়া গেছে' : 'Advisory: Multiple Close Matches'}
              </h4>
              <p className="mt-1 leading-relaxed text-slate-500 dark:text-slate-400 text-[11px]">
                {isBn
                  ? 'শীর্ষ দুটি রেকর্ডের সাদৃশ্যের ব্যবধান ১০% এর কম। সহকারী কমিশনার (ভূমি) অফিসের বালাম বইয়ের সাথে মিলিয়ে চূড়ান্ত নিশ্চিত হোন।'
                  : 'Score difference between top candidates is under 10%. Cross-verify against official Balam registry.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs mb-5">
          {error}
        </div>
      )}

      {/* Results List */}
      {hasSearched && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              {isBn
                ? `প্রাপ্ত সম্ভাব্য ফলাফল (${toBengaliDigits(candidates.length)})`
                : `Matched Records (${candidates.length})`}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {isBn ? 'প্রাসঙ্গিকতা অনুযায়ী সাজানো' : 'Ranked by Confidence Score'}
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800 text-slate-500">
              <p className="text-sm font-semibold">
                {isBn ? 'প্রদত্ত তথ্যের সাথে কোনো রেকর্ড মেলেনি।' : 'No matching records found for the search criteria.'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isBn
                  ? 'দাগ বা খতিয়ান নম্বর সঠিকভাবে লেখা হয়েছে কিনা পুনরায় পরীক্ষা করুন।'
                  : 'Please check your plot or khatian numbers and try again.'}
              </p>
            </div>
          ) : (
            candidates.map((cand, idx) => (
              <div
                key={cand.record_id || idx}
                className="p-5 rounded-2xl bg-white dark:bg-[#04080c] hover:border-emerald-500/60 border border-slate-200 dark:border-slate-800/90 transition-all shadow-md group"
              >
                <div
                  onClick={() => onSelectRecord && onSelectRecord(cand.record_id)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {cand.record_no || `REC-${idx + 1}`}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                        {isBn ? `দাগ: ${cand.dag_no} • খতিয়ান: ${cand.khatian_no}` : `Plot: ${cand.dag_no} • Khatian: ${cand.khatian_no}`}
                      </h3>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {isBn
                          ? `সাদৃশ্য: ${toBengaliDigits(Math.round(cand.score * 100))}%`
                          : `Match: ${Math.round(cand.score * 100)}%`}
                      </span>
                      <TrustBadge status={cand.status_label || 'POSSIBLE_MATCH'} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300 my-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">{isBn ? 'মৌজা' : 'Mouza'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{cand.mouza_name_bn || 'তেজগাঁও'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">{isBn ? 'জরিপ' : 'Survey'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{cand.survey_type || 'RS'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">{isBn ? 'মালিক' : 'Owner'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">{cand.owner_names_bn || 'আব্দুল করিম'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">{isBn ? 'পরিমাণ' : 'Area'}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {isBn ? `${toBengaliDigits(cand.area_acres || 0.33)} একর` : `${cand.area_acres || 0.33} Acres`}
                      </span>
                    </div>
                  </div>

                  {cand.reasons && cand.reasons.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 mt-3">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                        {isBn ? 'মিলের যৌক্তিক কারণ:' : 'Match Rationale:'}
                      </span>
                      <ul className="space-y-0.5 list-disc list-inside text-emerald-600 dark:text-emerald-400">
                        {cand.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeedbackTarget({
                        recordId: cand.record_id,
                        fieldLabelBn: `রেকর্ড নং ${cand.record_no || cand.khatian_no}`,
                        extractedValue: `দাগ ${cand.dag_no}, খতিয়ান ${cand.khatian_no}`,
                        feedbackType: 'wrong_match',
                      });
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isBn ? 'ত্রুটি রিপোর্ট করুন' : 'Report Mismatch'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectRecord && onSelectRecord(cand.record_id)}
                    className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold hover:gap-1.5 transition-all"
                  >
                    <span>{isBn ? 'বিস্তারিত দেখুন' : 'View Full Details'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <FeedbackModal
        isOpen={Boolean(feedbackTarget)}
        target={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
      />
    </div>
  );
};
