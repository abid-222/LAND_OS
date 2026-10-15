import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  MessageSquareWarning,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { FeedbackModal, type FeedbackTarget } from '../components/FeedbackModal';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
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

      if (!res.ok) throw new Error('রেকর্ড অনুসন্ধানে ত্রুটি হয়েছে');

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
  }, [khatianNo, dagNo, documentNo, mouza]);

  useEffect(() => {
    if (initialKhatian || initialDag || initialMouza) {
      executeSearch();
    }
  }, [initialKhatian, initialDag, initialMouza, executeSearch]);

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-lg mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">খতিয়ান ও রেকর্ড অনুসন্ধান</h1>
        </div>
        <DisclaimerBanner type="badge" />
      </div>

      {/* Multi-Identifier Input Panel */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              খতিয়ান নম্বর
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={khatianNo}
              onChange={(e) => setKhatianNo(e.target.value)}
              placeholder="যেমন: ৩৪০"
              className="touch-target w-full px-3 py-2.5 rounded-lg bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              দাগ নম্বর
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={dagNo}
              onChange={(e) => setDagNo(e.target.value)}
              placeholder="যেমন: ১২০৫"
              className="touch-target w-full px-3 py-2.5 rounded-lg bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              দলিল নম্বর (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              placeholder="দলিল নং"
              className="touch-target w-full px-3 py-2.5 rounded-lg bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              মৌজা (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={mouza}
              onChange={(e) => setMouza(e.target.value)}
              placeholder="মৌজার নাম"
              className="touch-target w-full px-3 py-2.5 rounded-lg bg-slate-950 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        <button
          onClick={executeSearch}
          disabled={isSearching}
          className="touch-target w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-lg shadow-primary/20 text-sm active:scale-98 transition-all disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{isSearching ? 'অনুসন্ধান চলছে...' : 'অনুসন্ধান করুন'}</span>
        </button>
      </div>

      {/* Ambiguity Alert Banner */}
      {ambiguous && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-600/60 text-amber-100 text-xs mb-4 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-200">
                সতর্কতা: সম্ভাব্য দ্ব্যর্থক ফলাফল (Ambiguous Match)
              </h4>
              <p className="mt-1 leading-relaxed text-amber-300/90">
                শীর্ষ দুটি রেকর্ডের সাদৃশ্যের ব্যবধান ১০% এরও কম (&lt;০.১০)। কোনো একটি ফলাফলকে চূড়ান্ত আইনি সত্য ধরে নেবেন না। সহকারী কমিশনার (ভূমি) অফিসের বালাম বইয়ের সাথে মূল খতিয়ান মিলিয়ে যাচাই করুন।
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-danger/20 border border-danger/40 text-danger-light text-xs mb-4">
          {error}
        </div>
      )}

      {/* Results List */}
      {hasSearched && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>প্রাপ্ত সম্ভাব্য ফলাফল ({candidates.length})</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              প্রাসঙ্গিকতা অনুযায়ী সাজানো
            </span>
          </div>

          {candidates.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <p className="text-sm">প্রদত্ত তথ্যের সাথে কোনো রেকর্ড মেলেনি।</p>
              <p className="text-xs text-slate-500 mt-1">
                দাগ বা খতিয়ান নম্বর সঠিকভাবে লেখা হয়েছে কিনা পরীক্ষা করুন।
              </p>
            </div>
          ) : (
            candidates.map((cand, idx) => (
              <div
                key={cand.record_id || idx}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all shadow-md"
              >
                <div
                  onClick={() => onSelectRecord && onSelectRecord(cand.record_id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {cand.record_no || `REC-${idx + 1}`}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        দাগ: {cand.dag_no} • খতিয়ান: {cand.khatian_no}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        সাদৃশ্য: {toBengaliDigits(Math.round(cand.score * 100))}%
                      </span>
                      <TrustBadge status={cand.status_label || 'POSSIBLE_MATCH'} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 my-2.5 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500">মৌজা: </span>
                      <span className="font-medium text-slate-200">{cand.mouza_name_bn || 'তেজগাঁও'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">জরিপ: </span>
                      <span className="font-medium text-slate-200">{cand.survey_type || 'RS'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">মালিক: </span>
                      <span className="font-medium text-slate-200 truncate">{cand.owner_names_bn || 'আব্দুল করিম'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">পরিমাণ: </span>
                      <span className="font-medium text-slate-200">{cand.area_acres || 0.33} একর</span>
                    </div>
                  </div>

                  {/* Why Matched Reasons Panel */}
                  {cand.reasons && cand.reasons.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-[11px] text-slate-300 mt-2">
                      <span className="text-slate-400 font-semibold block mb-1">
                        মিলের কারণ (Why matched):
                      </span>
                      <ul className="space-y-0.5 list-disc list-inside text-emerald-300/90">
                        {cand.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/50">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeedbackTarget({
                        recordId: cand.record_id,
                        fieldLabelBn: `রেকর্ড নং ${cand.record_no || cand.khatian_no}`,
                        extractedValue: `দাগ ${cand.dag_no}, খতিয়ান ${cand.khatian_no}`,
                        feedbackType: 'wrong_match',
                      });
                    }}
                    className="text-amber-400/90 hover:text-amber-300 flex items-center gap-1 underline text-[11px]"
                  >
                    <MessageSquareWarning className="w-3 h-3" />
                    <span>সঠিক নয়? রিপোর্ট করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectRecord && onSelectRecord(cand.record_id)}
                    className="text-emerald-400 flex items-center gap-0.5 font-medium hover:text-emerald-300"
                  >
                    বিস্তারিত দেখুন <ChevronRight className="w-3.5 h-3.5" />
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
