import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Search,
  Scale,
  Cpu,
  ArrowRight,
  Database,
  Check,
  Copy,
} from 'lucide-react';
import { api, ApiError } from '../api/client';

export interface MLExtractResponse {
  success: boolean;
  document_type_detected: string;
  khatian_type?: string | null;
  dag_identifiers: Array<{
    raw_value: string;
    canonical: string;
    main_no?: number | null;
    sub_no?: number | null;
    status: string;
    repaired: boolean;
    confidence: number;
  }>;
  khatian_identifiers: Array<{
    raw_value: string;
    canonical: string;
    main_no?: number | null;
    sub_no?: number | null;
    status: string;
    repaired: boolean;
    confidence: number;
  }>;
  mouza?: {
    raw_name: string;
    normalized_name: string;
    matched_mouza?: string | null;
    confidence: number;
    status: string;
  } | null;
  area?: {
    raw_value: string;
    area_decimal?: number | null;
    area_acres?: number | null;
    area_sq_ft?: number | null;
    original_unit?: string | null;
    confidence: number;
  } | null;
  parties: Array<{
    raw_name: string;
    normalized_name: string;
    role: string;
    honorifics_removed: string[];
    confidence: number;
  }>;
  overall_confidence: number;
  epistemic_status: string;
  model_version: string;
  timestamp: string;
}

export interface ConflictSimulateResponse {
  conflict_detected: boolean;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: Array<{
    rule_code: string;
    severity: string;
    title_bn: string;
    title_en: string;
    evidence_bn: string;
    mathematical_formula: string;
  }>;
  simulation_summary_bn: string;
}

export interface GuideAskResponse {
  status: string;
  answer_bn: string;
  answer_en: string;
  source?: string | null;
  similarity_score?: number | null;
  last_verified_at?: string | null;
}

export const MLPlayground: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  // Active Tab: 'extract' | 'conflict' | 'guide'
  const [activeTab, setActiveTab] = useState<'extract' | 'conflict' | 'guide'>('extract');

  // ---------------------------------------------------------------------------
  // Module 1: Entity Extraction States
  // ---------------------------------------------------------------------------
  const sampleDeedText = `বাংলাদেশ ফরম নং ৫৪। সাফ-কবলা বিক্রয় দলিল।
জেলা: ঢাকা, উপজেলা/থানা: তেজগাঁও, মৌজা: তেজগাঁও (জেএল নং ২৯)।
খতিয়ান নং ৩৪০, দাগ নং ১২০৫/১।
জমির মোট পরিমাণ: ৩৩ শতাংশ (০.৩৩ একর)।
ক্রেতা (গ্রহীতা): মোঃ রহিম মিয়া, পিতা: মরহুম আবদুর রহমান।
বিক্রেতা (দাতা): জনাব আবদুল করিম, পিতা: মরহুম ফজলুল হক।
চৌহদ্দি: উত্তরে সরকারি রাস্তা, দক্ষিণে খাল, পূর্বে দাগ নং ১২০৪, পশ্চিমে দাগ নং ১২০৬।`;

  const samplePorchaText = `বাংলাদেশ গভর্নমেন্ট প্রেস - আরএস খতিয়ান ও স্বত্বলিপি পরচা।
জেলা: ঢাকা, থানা: কেরানীগঞ্জ, মৌজা: জিনজিড়া (জেএল নং ১৫)।
খতিয়ান নং: ৮৮/২। দাগ নং: ৪২০/৩।
জমির শ্রেণি: নাল ও ভিটা, মোট পরিমাণ: ৫০ শতাংশ।
মালিকের নাম: শ্রী সুবোধ চন্দ্র পাল, পিতা: রমেশ চন্দ্র পাল।`;

  const sampleMutationText = `সহকারী কমিশনার (ভূমি) তেজগাঁও সার্কেল বরাবর ই-নামজারি ও জমাভাগ আবেদন।
প্রস্তাবিত মৌজা: তেজগাঁও, সাবেক দাগ নং ১২০৫, প্রস্তাবিত নতুন দাগ নং ১২০৫/২।
সাবেক খতিয়ান নং ৩৪০, আবেদনের জমি: ১০ শতাংশ।
আবেদনকারী: মোছাঃ ফাতেমা খাতুন, স্বামী: মোঃ রফিকুল ইসলাম।`;

  const [rawText, setRawText] = useState(sampleDeedText);
  const [regionCode, setRegionCode] = useState('dhaka');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<MLExtractResponse | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleRunExtraction = async () => {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const res = await api.post<MLExtractResponse>('/api/v1/ml/extract', {
        raw_text: rawText,
        region_code: regionCode,
      });
      setExtractResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setExtractError(err.message);
      } else {
        setExtractError(isBn ? 'তথ্য নিষ্কাশনে সমস্যা হয়েছে।' : 'Extraction failed.');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Module 2: Conflict & Fraud Simulation States
  // ---------------------------------------------------------------------------
  const [deedDate, setDeedDate] = useState('2024-05-15');
  const [mutationDate, setMutationDate] = useState('2023-01-10'); // R3 trigger by default
  const [deedArea, setDeedArea] = useState<number>(50.0); // R4 trigger
  const [recordArea, setRecordArea] = useState<number>(33.0);
  const [priorSold, setPriorSold] = useState<number>(0.0);
  const [sellerName, setSellerName] = useState('আব্দুল কাদের'); // R6 trigger
  const [recordOwner, setRecordOwner] = useState('মোঃ সামসুল হক');
  const [isSimulating, setIsSimulating] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictSimulateResponse | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const applyConflictPreset = (type: 'r3' | 'r4' | 'r6' | 'clean') => {
    if (type === 'r3') {
      setDeedDate('2024-08-20');
      setMutationDate('2023-03-12'); // Mutation predates deed
      setDeedArea(20.0);
      setRecordArea(33.0);
      setSellerName('মোঃ রফিকুল ইসলাম');
      setRecordOwner('মোঃ রফিকুল ইসলাম');
    } else if (type === 'r4') {
      setDeedDate('2022-02-10');
      setMutationDate('2023-05-15');
      setDeedArea(60.0); // Oversale!
      setRecordArea(33.0);
      setSellerName('আব্দুল করিম');
      setRecordOwner('আব্দুল করিম');
    } else if (type === 'r6') {
      setDeedDate('2022-02-10');
      setMutationDate('2023-05-15');
      setDeedArea(25.0);
      setRecordArea(33.0);
      setSellerName('তারেক রহমান চৌধুরী'); // Fake seller
      setRecordOwner('আব্দুল জব্বার তালুকদার');
    } else {
      // Clean
      setDeedDate('2022-01-15');
      setMutationDate('2023-06-10');
      setDeedArea(20.0);
      setRecordArea(33.0);
      setPriorSold(0.0);
      setSellerName('আব্দুল করিম');
      setRecordOwner('আব্দুল করিম');
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setConflictError(null);
    try {
      const res = await api.post<ConflictSimulateResponse>('/api/v1/ml/simulate-conflict', {
        deed_date: deedDate,
        mutation_date: mutationDate,
        deed_area_decimal: Number(deedArea),
        record_area_decimal: Number(recordArea),
        prior_sold_area_decimal: Number(priorSold),
        seller_name: sellerName,
        record_owner_name: recordOwner,
      });
      setConflictResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setConflictError(err.message);
      } else {
        setConflictError(isBn ? 'কনফ্লিক্ট সিমুলেশনে সমস্যা হয়েছে।' : 'Conflict simulation failed.');
      }
    } finally {
      setIsSimulating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Module 3: Semantic Land Guide RAG States
  // ---------------------------------------------------------------------------
  const [guideQuestion, setGuideQuestion] = useState('নামজারি আবেদনের কোর্ট ফি ও প্রয়োজনীয় কাগজপত্র কী কী?');
  const [isQueryingGuide, setIsQueryingGuide] = useState(false);
  const [guideResult, setGuideResult] = useState<GuideAskResponse | null>(null);
  const [guideError, setGuideError] = useState<string | null>(null);

  const handleQueryGuide = async (q?: string) => {
    const questionToAsk = q || guideQuestion;
    setIsQueryingGuide(true);
    setGuideError(null);
    try {
      const res = await api.post<GuideAskResponse>('/api/v1/guide/ask', {
        question: questionToAsk,
      });
      setGuideResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setGuideError(err.message);
      } else {
        setGuideError(isBn ? 'নির্দেশিকা অনুসন্ধান ব্যর্থ হয়েছে।' : 'Guide query failed.');
      }
    } finally {
      setIsQueryingGuide(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopyJson = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 border border-emerald-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              <span>Interactive Machine Learning Studio</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isBn ? 'ল্যান্ডওএস ইন্টেলিজেন্ট এমএল প্লেগ্রাউন্ড' : 'LandOS Intelligent ML Playground'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isBn
                ? 'এখানে আপনি নিজের বাংলা দলিল, পরচা বা নামজারির তথ্য প্রদান করে রিয়েল-টাইম এআই এক্সট্রাকশন ও ৬-দফা জালিয়াতি সিমুলেশন পরীক্ষা করতে পারবেন।'
                : 'Apply your own custom land text, transaction dates, and acreage to extract structured entities and simulate fraud conflict rules.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/30 text-emerald-400">
              Pipeline: LandOS-NLP-v3.2
            </span>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'extract'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                : 'bg-black/40 text-slate-300 hover:bg-black/60 border border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isBn ? '১. বাংলা দলিল ও পরচা নিষ্কাশন (NLP Extractor)' : '1. Document NLP Extractor'}</span>
          </button>

          <button
            onClick={() => setActiveTab('conflict')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'conflict'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                : 'bg-black/40 text-slate-300 hover:bg-black/60 border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isBn ? '২. R1-R6 কনফ্লিক্ট সিমুলেটর (Fraud Engine)' : '2. R1-R6 Conflict Simulator'}</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                : 'bg-black/40 text-slate-300 hover:bg-black/60 border border-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{isBn ? '৩. গ্রাউন্ডেড ভূমি আইন ও নির্দেশিকা (Semantic RAG)' : '3. Grounded Legal RAG'}</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Tab 1: NLP Entity Extraction */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'extract' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Custom Input Box */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'কাস্টম বাংলা নথির টেক্সট ইনপুট' : 'Custom Input Document Text'}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {rawText.length} {isBn ? 'অক্ষর' : 'chars'}
                </span>
              </div>

              {/* Preset Selection Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isBn ? 'ডেমো টেমপ্লেট নির্বাচন করুন:' : 'Load Sample Document:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRawText(sampleDeedText)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                  >
                    সাফ-কবলা দলিল (তেজগাঁও ১২০৫/১)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawText(samplePorchaText)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                  >
                    আরএস পরচা (জিনজিরা ৪২০/৩)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawText(sampleMutationText)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all"
                  >
                    ই-নামজারি আবেদন
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={9}
                placeholder="এখানে আপনার দলিলের টেক্সট লিখুন বা পেস্ট করুন..."
                className="w-full p-3.5 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {isBn ? 'অঞ্চল:' : 'Region:'}
                  </span>
                  <select
                    value={regionCode}
                    onChange={(e) => setRegionCode(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  >
                    <option value="dhaka">ঢাকা (Dhaka Division)</option>
                    <option value="chittagong">চট্টগ্রাম (Chittagong Division)</option>
                    <option value="sylhet">সিলেট (Sylhet Division)</option>
                    <option value="rajshahi">রাজশাহী (Rajshahi Division)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRunExtraction}
                  disabled={isExtracting || !rawText.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isBn ? 'মডেল প্রক্রিয়াকরণ...' : 'Running Inference...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isBn ? 'তথ্য নিষ্কাশন করুন (Run ML)' : 'Extract Entities'}</span>
                    </>
                  )}
                </button>
              </div>

              {extractError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{extractError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Extracted Live Structured Data Output */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm min-h-[420px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'এমএল মডেলের ফলাফল (Structured Output)' : 'Structured ML Output'}
                    </h3>
                  </div>

                  {extractResult && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {Math.round(extractResult.overall_confidence * 100)}% Confidence
                      </span>
                      <button
                        onClick={() => handleCopyJson(extractResult)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Copy JSON"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {!extractResult && !isExtracting && (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {isBn ? 'কোনো ফলাফল নেই' : 'No ML Inference Run Yet'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isBn
                          ? 'বাম পাশের বক্সে টেক্সট লিখে "তথ্য নিষ্কাশন করুন" বাটনে ক্লিক করুন।'
                          : 'Enter or choose document text on the left and click "Extract Entities".'}
                      </p>
                    </div>
                  </div>
                )}

                {isExtracting && (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 text-slate-400">
                    <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-emerald-500">
                      {isBn ? 'বাংলা এনএলপি টোকেনাইজেশন ও তথ্য যাচাই হচ্ছে...' : 'Tokenizing & extracting entities...'}
                    </span>
                  </div>
                )}

                {extractResult && (
                  <div className="space-y-3.5">
                    {/* Document & Khatian Type */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {isBn ? 'শনাক্তকৃত নথির ধরন' : 'Document Type Detected'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {extractResult.document_type_detected}
                        </span>
                      </div>
                      {extractResult.khatian_type && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {extractResult.khatian_type}
                        </span>
                      )}
                    </div>

                    {/* Dag & Khatian Identifiers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Dag */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          {isBn ? 'দাগ নম্বর (Dag No)' : 'Dag Number'}
                        </span>
                        {extractResult.dag_identifiers.length > 0 ? (
                          extractResult.dag_identifiers.map((d, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
                                {d.canonical}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {Math.round(d.confidence * 100)}% conf
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">শনাক্ত করা যায়নি</span>
                        )}
                      </div>

                      {/* Khatian */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          {isBn ? 'খতিয়ান নম্বর (Khatian No)' : 'Khatian Number'}
                        </span>
                        {extractResult.khatian_identifiers.length > 0 ? (
                          extractResult.khatian_identifiers.map((k, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-sm font-mono font-black text-cyan-600 dark:text-cyan-400">
                                {k.canonical}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {Math.round(k.confidence * 100)}% conf
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">শনাক্ত করা যায়নি</span>
                        )}
                      </div>
                    </div>

                    {/* Mouza & Land Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Mouza */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          {isBn ? 'মৌজা (Mouza)' : 'Mouza Name'}
                        </span>
                        {extractResult.mouza ? (
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {extractResult.mouza.normalized_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Raw: "{extractResult.mouza.raw_name}"
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">শনাক্ত করা যায়নি</span>
                        )}
                      </div>

                      {/* Area */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          {isBn ? 'জমির পরিমাণ (Normalized Area)' : 'Normalized Land Area'}
                        </span>
                        {extractResult.area && extractResult.area.area_decimal !== undefined ? (
                          <div>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {extractResult.area.area_decimal} শতাংশ
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {extractResult.area.area_acres} একর • {extractResult.area.area_sq_ft} বর্গফুট
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">শনাক্ত করা যায়নি</span>
                        )}
                      </div>
                    </div>

                    {/* Parties */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                        {isBn ? 'সংশ্লিষ্ট পক্ষ ও ব্যক্তি (Parties Identified)' : 'Parties Identified'}
                      </span>
                      {extractResult.parties.length > 0 ? (
                        <div className="space-y-1.5">
                          {extractResult.parties.map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                    p.role === 'buyer'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : p.role === 'seller'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  }`}
                                >
                                  {p.role}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {p.normalized_name}
                                </span>
                              </div>
                              {p.honorifics_removed.length > 0 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Stripped: {p.honorifics_removed.join(', ')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">কোনো পক্ষের নাম শনাক্ত করা যায়নি</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer */}
              {extractResult && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Model: {extractResult.model_version}</span>
                  <span>Epistemic Status: {extractResult.epistemic_status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Tab 2: Conflict & Fraud Simulation (R1-R6 Engine) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'conflict' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Input Parameters */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'আইনি ও গাণিতিক বিরোধ সিমুলেটর' : 'Conflict & Fraud Simulation Parameters'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Rules R1-R6
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isBn ? 'টেস্ট প্রিসেট নির্বাচন করুন:' : 'Select Test Preset:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyConflictPreset('r3')}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
                  >
                    R3: অসম্ভব কালানুক্রম (Date Bug)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyConflictPreset('r4')}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                  >
                    R4: অতিরিক্ত জমি বিক্রয় (Oversale)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyConflictPreset('r6')}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/30 hover:bg-pink-500/20 transition-all"
                  >
                    R6: নাম অমিল জালিয়াতি (Fake Seller)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyConflictPreset('clean')}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
                  >
                    ত্রুটিমুক্ত বৈধ দলিল (Clean)
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    দলিল নিবন্ধনের তারিখ (Deed Date)
                  </label>
                  <input
                    type="date"
                    value={deedDate}
                    onChange={(e) => setDeedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    নামজারি আদেশের তারিখ (Mutation Date)
                  </label>
                  <input
                    type="date"
                    value={mutationDate}
                    onChange={(e) => setMutationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    দলিলে বিক্রিত জমি (শতাংশ)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deedArea}
                    onChange={(e) => setDeedArea(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    খতিয়ানের মোট জমি (শতাংশ)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={recordArea}
                    onChange={(e) => setRecordArea(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    দলিলের বিক্রেতার নাম (Seller)
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    খতিয়ান রেকর্ডকৃত মূল মালিক (Owner)
                  </label>
                  <input
                    type="text"
                    value={recordOwner}
                    onChange={(e) => setRecordOwner(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isBn ? 'সিমুলেশন চলছে...' : 'Simulating Rules...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>{isBn ? 'অসঙ্গতি ও ঝুঁকি পরীক্ষা করুন (Run Conflict Engine)' : 'Simulate Conflict Rules'}</span>
                  </>
                )}
              </button>

              {conflictError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{conflictError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Simulation Report & Gauge */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm min-h-[420px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'কনফ্লিক্ট ডিটেকশন ফলাফল' : 'Conflict Analysis Results'}
                    </h3>
                  </div>

                  {conflictResult && (
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                        conflictResult.risk_level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : conflictResult.risk_level === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      Risk Score: {conflictResult.risk_score} / 100 ({conflictResult.risk_level})
                    </span>
                  )}
                </div>

                {!conflictResult && !isSimulating && (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {isBn ? 'সিমুলেশন শুরু করা হয়নি' : 'Awaiting Conflict Simulation'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isBn
                          ? 'বাম পাশের প্যারামিটার বা প্রিসেট নির্বাচন করে বাটনে ক্লিক করুন।'
                          : 'Select test presets or fill custom transaction values on the left.'}
                      </p>
                    </div>
                  </div>
                )}

                {conflictResult && (
                  <div className="space-y-4">
                    {/* Summary Card */}
                    <div
                      className={`p-4 rounded-xl border ${
                        conflictResult.conflict_detected
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-xs mb-1">
                        {conflictResult.conflict_detected ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <span>{conflictResult.simulation_summary_bn}</span>
                      </div>
                      <p className="text-[11px] opacity-80">
                        {conflictResult.alerts.length} {isBn ? 'টি আইনি অসঙ্গতি শনাক্ত হয়েছে।' : 'rule violations detected.'}
                      </p>
                    </div>

                    {/* Alerts Breakdown */}
                    {conflictResult.alerts.length > 0 && (
                      <div className="space-y-2.5">
                        {conflictResult.alerts.map((alert, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  {alert.rule_code}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {alert.title_bn}
                                </h5>
                              </div>
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {alert.severity}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {alert.evidence_bn}
                            </p>

                            <div className="text-[10px] font-mono p-1.5 rounded bg-slate-200/60 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400">
                              Formula: {alert.mathematical_formula}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Engine disclaimer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
                Rule Engine: LandOS R1-R6 Conflict Verification Spec
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Tab 3: Semantic Land Guide (Grounded RAG) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'guide' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'গ্রাউন্ডেড আইনি প্রশ্ন ইনপুট' : 'Grounded Land Inquiry Input'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  Zero Hallucination
                </span>
              </div>

              {/* Sample Questions */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isBn ? 'প্রস্তাবিত আইনি প্রশ্নাবলি:' : 'Suggested Legal Questions:'}
                </span>
                <div className="flex flex-col gap-1.5">
                  {[
                    'নামজারি আবেদনের কোর্ট ফি ও প্রয়োজনীয় কাগজপত্র কী কী?',
                    'খতিয়ানের ভুল সংশোধনের নিয়ম ও সময়সীমা কী?',
                    'দলিল হারিয়ে গেলে বা নষ্ট হলে প্রতিকার কী?',
                    'ভুয়া কোনো আইনি প্রশ্ন (Ungrounded Test - Refusal)',
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setGuideQuestion(q);
                        handleQueryGuide(q);
                      }}
                      className="text-left text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  value={guideQuestion}
                  onChange={(e) => setGuideQuestion(e.target.value)}
                  placeholder="আপনার আইনি প্রশ্ন লিখুন..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />

                <button
                  type="button"
                  onClick={() => handleQueryGuide()}
                  disabled={isQueryingGuide || !guideQuestion.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isQueryingGuide ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isBn ? 'অনুসন্ধান হচ্ছে...' : 'Querying RAG...'}</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>{isBn ? 'আইনি ডেটাবেজে অনুসন্ধান করুন' : 'Query Legal Knowledge Base'}</span>
                    </>
                  )}
                </button>
              </div>

              {guideError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{guideError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: RAG Result */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm min-h-[420px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'যাচাইকৃত সরকারি উত্তর ও সূত্র' : 'Grounded Legal Answer & Citation'}
                    </h3>
                  </div>

                  {guideResult && (
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        guideResult.status === 'verified_source'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {guideResult.status === 'verified_source' ? 'Verified Source' : 'Needs Physical Verification'}
                    </span>
                  )}
                </div>

                {!guideResult && !isQueryingGuide && (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {isBn ? 'কোনো অনুসন্ধান করা হয়নি' : 'Awaiting Inquiry'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isBn
                          ? 'বাম পাশের প্রশ্নাবলি থেকে নির্বাচন করুন বা কাস্টম প্রশ্ন টাইপ করুন।'
                          : 'Select a question on the left to query the verified land manual RAG.'}
                      </p>
                    </div>
                  </div>
                )}

                {guideResult && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {isBn ? 'উত্তর (Answer):' : 'Answer:'}
                      </h5>
                      <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {guideResult.answer_bn}
                      </div>
                    </div>

                    {guideResult.source && (
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 block">
                          {isBn ? 'উৎস ও আইনি উদ্ধৃতি (Official Source)' : 'Official Source:'}
                        </span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {guideResult.source}
                        </p>
                        {guideResult.last_verified_at && (
                          <p className="text-[10px] text-slate-400">
                            Verified on: {guideResult.last_verified_at}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
                Rule: Hallucination strictly prohibited. Returns "needs_verification" when ungrounded.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
