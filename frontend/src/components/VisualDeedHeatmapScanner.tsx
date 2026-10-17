import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scan,
  Scale,
  ShieldAlert,
  Flame,
  ZoomIn,
  ZoomOut,
  Layers,
  Info,
} from 'lucide-react';
import { api } from '../api/client';

export interface BoundingBox {
  id: string;
  field_name: string;
  label_bn: string;
  ocr_text: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number;
  height: number;
  status: 'verified' | 'tampered' | 'warning';
  confidence: number;
  official_record: string;
  evidence_bn: string;
}

export interface ForensicsData {
  document_template: string;
  deed_title_bn: string;
  deed_no: string;
  has_tampering: boolean;
  tamper_summary_bn: string;
  risk_score: number;
  boxes: BoundingBox[];
}

export const VisualDeedHeatmapScanner: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [activePreset, setActivePreset] = useState<'tampered' | 'clean' | 'porcha'>('tampered');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>('box-area');
  const [isLoading, setIsLoading] = useState(false);
  const [forensicsData, setForensicsData] = useState<ForensicsData | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState<boolean>(true);

  const fetchForensics = async (preset: 'tampered' | 'clean' | 'porcha') => {
    setIsLoading(true);
    try {
      const res = await api.post<ForensicsData>('/api/v1/ml/visual-forensics', {
        preset: preset,
      });
      setForensicsData(res);
      // Auto select first tampered box if exists
      const tampered = res.boxes.find((b) => b.status === 'tampered');
      setSelectedBoxId(tampered ? tampered.id : res.boxes[0]?.id || null);
    } catch {
      // Local fallback
      if (preset === 'tampered') {
        setForensicsData({
          document_template: 'deed_sale_54',
          deed_title_bn: 'সাফ-কবলা বিক্রয় দলিল (ঘষামাজা ও জাল জমি বিক্রয় টেস্ট)',
          deed_no: '৯৮৪২/২০২২',
          has_tampering: true,
          tamper_summary_bn:
            'উচ্চমাত্রার জালিয়াতি শনাক্ত! দলিলের ৩৪ শতাংশের স্থানে ওভাররাইট করে ৮৪ করা হয়েছে। মূল খতিয়ানে জমি মাত্র ৩৪ শতাংশ!',
          risk_score: 92.5,
          boxes: [
            {
              id: 'box-area',
              field_name: 'area',
              label_bn: 'জমির পরিমাণ (জালিয়াতি শনাক্ত)',
              ocr_text: 'জমির পরিমাণ: ৮৪ শতাংশ (ঘষামাজা চিহ্নিত)',
              x: 18,
              y: 35,
              width: 70,
              height: 6.5,
              status: 'tampered',
              confidence: 0.62,
              official_record: 'প্রকৃত রেকর্ড: ৩৪.০০ শতাংশ',
              evidence_bn:
                'দলিলের ৩৪ শতাংশের স্থানে কলমের কালি দিয়ে ঘষামাজা করে ৮৪ করা হয়েছে! মূল রেকর্ডকৃত খতিয়ানে জমি মাত্র ৩৪ শতাংশ (৫০ শতাংশ অতিরিক্ত জাল বিক্রয়)!',
            },
            {
              id: 'box-dag',
              field_name: 'dag_no',
              label_bn: 'দাগ নম্বর',
              ocr_text: 'দাগ নং ১২০৫/১',
              x: 18,
              y: 26,
              width: 25,
              height: 5.5,
              status: 'verified',
              confidence: 0.99,
              official_record: 'দাগ নং ১২০৫/১ (খতিয়ান ৩৪০)',
              evidence_bn: 'ক্যাডাস্ট্রাল ম্যাপ ও আরএস নকশার দাগ পলিগনের সাথে মিলেছে।',
            },
            {
              id: 'box-khatian',
              field_name: 'khatian_no',
              label_bn: 'খতিয়ান নম্বর',
              ocr_text: 'খতিয়ান নং ৩৪০',
              x: 48,
              y: 26,
              width: 25,
              height: 5.5,
              status: 'verified',
              confidence: 0.98,
              official_record: 'খতিয়ান নং ৩৪০ (আরএস)',
              evidence_bn: 'জেলা রেকর্ড রুমের আরএস স্বত্বলিপি খতিয়ানের সাথে মিলেছে।',
            },
            {
              id: 'box-mouza',
              field_name: 'mouza',
              label_bn: 'মৌজা ও জেএল নং',
              ocr_text: 'মৌজা: তেজগাঁও, জেএল নং ২৯',
              x: 55,
              y: 17.5,
              width: 38,
              height: 5.2,
              status: 'verified',
              confidence: 0.98,
              official_record: 'মৌজা: তেজগাঁও (জেএল ২৯)',
              evidence_bn: 'উপজেলা ও সার্কেল মৌজা গেজেটের সাথে সম্পূর্ণ একরূপ।',
            },
            {
              id: 'box-buyer',
              field_name: 'buyer',
              label_bn: 'গ্রহীতা / ক্রেতা',
              ocr_text: 'ক্রেতা: মোঃ রহিম মিয়া',
              x: 18,
              y: 45,
              width: 36,
              height: 5.5,
              status: 'verified',
              confidence: 0.97,
              official_record: 'মোঃ রহিম মিয়া (এনআইডি যাচাইকৃত)',
              evidence_bn: 'জাতীয় পরিচয়পত্র ও ভোটার তালিকার সাথে মিল পাওয়া গেছে।',
            },
          ],
        });
        setSelectedBoxId('box-area');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForensics(activePreset);
  }, [activePreset]);

  const activeBox = forensicsData?.boxes.find((b) => b.id === selectedBoxId);

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Preset Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-emerald-500/30 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Scan className="w-3.5 h-3.5" />
              <span>Side-by-Side Visual Heatmap & Forgery Forensics</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isBn ? 'লাইভ দলিল ভিজ্যুয়াল হিটম্যাপ স্ক্যানার' : 'Visual Deed OCR Heatmap & Tamper Scanner'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isBn
                ? 'মূল দলিলের ছবির উপর বাউন্ডিং বক্স বিশ্লেষণ করে স্বয়ংক্রিয়ভাবে ঘষামাজা, ওভাররাইট ও অবৈধ জমি বিক্রয়ের জালিয়াতি লাল সতর্কবার্তায় শনাক্ত করুন।'
                : 'Interactive visual bounding boxes inspect scanned deeds side-by-side with official government land databases in real-time.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-emerald-400">
              OCR Engine: CRNN + PaddleOCR-v4
            </span>
          </div>
        </div>

        {/* Demo Presets Bar */}
        <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400">
            {isBn ? 'ডেমো পরীক্ষা মোড:' : 'Inspection Preset:'}
          </span>

          <button
            type="button"
            onClick={() => setActivePreset('tampered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activePreset === 'tampered'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
                : 'bg-black/50 text-rose-300 hover:bg-black/70 border border-rose-500/40'
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{isBn ? '🔥 কিলার ডেমো: ঘষামাজা ও জাল জমি বিক্রয়' : '🔥 Tampered Deed Forgery Demo'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePreset('clean')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePreset === 'clean'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-black/50 text-slate-300 hover:bg-black/70 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isBn ? 'বৈধ সাফ-কবলা দলিল (তেজগাঁও ১২০৫/১ - Clean)' : 'Clean Deed (100% Match)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePreset('porcha')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePreset === 'porcha'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-2 ring-cyan-400'
                : 'bg-black/50 text-slate-300 hover:bg-black/70 border border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBn ? 'আরএস পরচা ও খতিয়ান (জিনজিরা ৪২০/৩)' : 'RS Porcha Record'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen: Left Document Canvas & Right Verification Record */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================================================================= */}
        {/* LEFT PANEL: Document Image Canvas with Glowing Bounding Boxes (7 cols) */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isBn ? 'মূল দলিলের ছবি ও বাউন্ডিং বক্স (Live Document View)' : 'Scanned Deed & Bounding Boxes'}
              </h3>
              {isLoading && (
                <span className="text-[10px] font-mono text-emerald-400 animate-pulse px-2 py-0.5 rounded bg-emerald-500/10">
                  {isBn ? 'বিশ্লেষণ চলছে...' : 'Analyzing...'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowHeatmapOverlay(!showHeatmapOverlay)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  showHeatmapOverlay
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{showHeatmapOverlay ? (isBn ? 'হিটম্যাপ সক্রিয়' : 'Heatmap On') : (isBn ? 'হিটম্যাপ বন্ধ' : 'Heatmap Off')}</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Realistic Deed Canvas Container */}
          <div className="relative w-full rounded-3xl bg-[#f5ede0] dark:bg-[#0c1015] border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden p-6 select-none transition-all">
            {/* Vintage Archival Background Pattern */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#b89758_1px,transparent_1px)] [background-size:16px_16px]" />

            <div
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
              className="relative w-full aspect-[1/1.3] bg-[#fbf7f0] dark:bg-[#060a0f] rounded-2xl border border-amber-900/20 dark:border-slate-800 shadow-inner p-6 flex flex-col justify-between overflow-hidden transition-transform duration-200"
            >
              {/* Official Bangladesh Government Stamp & Crest Banner */}
              <div className="border-b-2 border-double border-amber-900/40 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-800/40 dark:border-emerald-500/40 flex items-center justify-center p-1 bg-amber-500/10">
                    <img src="/logo.png" alt="Govt Crest" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-amber-900 dark:text-emerald-400 uppercase block">
                      গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-serif">
                      {forensicsData?.deed_title_bn || 'সাফ-কবলা বিক্রয় দলিল'}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-800/10 dark:bg-slate-800 text-amber-900 dark:text-amber-400 border border-amber-800/20">
                    FORM NO. 54
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-1">
                    REG: {forensicsData?.deed_no || '৯৮৪২/২০২২'}
                  </span>
                </div>
              </div>

              {/* Realistic Deed Text Body (Handwritten / Calligraphy Style Layout) */}
              <div className="space-y-4 my-auto text-xs leading-relaxed font-serif text-slate-800 dark:text-slate-200 relative">
                <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400 border-b border-amber-900/15 dark:border-slate-800/80 pb-2">
                  <span>সাব-রেজিস্ট্রি কার্যালয়: তেজগাঁও, ঢাকা</span>
                  <span>দলিল নিবন্ধনের তারিখ: ১২/০৫/২০২২ ইং</span>
                </div>

                {/* Line 1: Mouza & JL */}
                <p>
                  মহা পরাক্রমশালী পরম করুণাময় আল্লাহতায়ালার নাম স্মরণে অত্র সাফ-কবলা দলিলের বয়ান আরম্ভ করিলাম।
                  জেলা: ঢাকা, থানা: তেজগাঁও, মৌজা: <strong className="underline decoration-dotted">তেজগাঁও</strong> (জেএল নং ২৯)।
                </p>

                {/* Line 2: Dag & Khatian */}
                <p>
                  নিম্ন তপশীলোক্ত জমি যাহার সাবেক খতিয়ান নং ৩৪০, এসএ খতিয়ান নং ১২৪, সিটি আরএস খতিয়ান নং <strong className="underline decoration-dotted">৩৪০</strong>।
                  রেকর্ডীয় ক্যাডাস্ট্রাল দাগ নং <strong className="underline decoration-dotted">১২০৫/১</strong>।
                </p>

                {/* Line 3: Area (The Critical Tampered Line) */}
                <div className="p-2.5 rounded-xl bg-amber-100/60 dark:bg-black/40 border border-amber-300 dark:border-slate-800">
                  <p className="font-semibold text-xs sm:text-sm">
                    বিক্রিত জমির পরিমাণ: অত্র দাগে মোট জমি{' '}
                    {activePreset === 'tampered' ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 font-mono font-black underline decoration-wavy">
                        ৮৪ শতাংশ (ঘষামাজা চিহ্নিত)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 font-mono font-black">
                        ৩৩ শতাংশ (০.৩৩ একর)
                      </span>
                    )}{' '}
                    যাহার দখলীয় অংশ নিরঙ্কুশভাবে দাতা কর্তৃক হস্তান্তর করিলাম।
                  </p>
                </div>

                {/* Line 4: Parties */}
                <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">গ্রহীতা (১ম পক্ষ / ক্রেতা):</span>
                    <strong>মোঃ রহিম মিয়া</strong>, পিতা: মরহুম রহমান মিয়া
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">দাতা (২য় পক্ষ / বিক্রেতা):</span>
                    <strong>আবদুল করিম</strong>, পিতা: ফজলুল হক
                  </div>
                </div>

                {/* Line 5: Boundary (Chouhaddi) */}
                <div className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-amber-900/10 dark:border-slate-800">
                  চৌহদ্দি: উত্তরে সরকারি ১২ ফুট রাস্তা, দক্ষিণে দাগ নং ১২০৬, পূর্বে দাগ ১২০৪, পশ্চিমে সরকারি ড্রেন।
                </div>
              </div>

              {/* Deed Footer: Official Seal & Stamp Marks */}
              <div className="pt-2 border-t-2 border-amber-900/30 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>SEAL: SUB-REGISTRY-TEJGAON-OFFICIAL</span>
                </span>
                <span className="font-bold text-amber-900 dark:text-amber-400">বাংলাদেশ সরকার রাজস্ব স্ট্যাম্প</span>
              </div>

              {/* OVERLAY: Interactive Bounding Boxes Layer */}
              {showHeatmapOverlay && forensicsData?.boxes.map((b) => {
                const isSelected = selectedBoxId === b.id;
                const isTampered = b.status === 'tampered';

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBoxId(b.id)}
                    style={{
                      left: `${b.x}%`,
                      top: `${b.y}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`,
                    }}
                    className={`absolute rounded-lg cursor-pointer transition-all duration-200 z-20 flex items-center justify-between px-2 ${
                      isTampered
                        ? 'border-2 border-rose-500 bg-rose-500/20 shadow-lg shadow-rose-500/40 animate-pulse'
                        : isSelected
                        ? 'border-2 border-emerald-400 bg-emerald-400/25 shadow-lg shadow-emerald-400/40 ring-2 ring-emerald-300'
                        : 'border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400'
                    }`}
                  >
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm ${
                        isTampered
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {b.label_bn}
                    </span>

                    {isTampered ? (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3 fill-rose-500 text-white" />
                        <span>TAMPER</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {Math.round(b.confidence * 100)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL: Live Verification & Forensic Discrepancy (5 cols) */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {isBn ? 'ফরেনসিক যাচাই ও সরকারি রেকর্ড তুলনা' : 'Govt Record Comparison'}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">DATABASE SYNC: LIVE</span>
          </div>

          {/* Top Status Card: Highlighting Tamper or Clean */}
          {forensicsData && (
            <div
              className={`p-5 rounded-2xl border transition-all ${
                forensicsData.has_tampering
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200 shadow-xl shadow-rose-950/20 ring-1 ring-rose-500'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-lg shadow-emerald-950/10'
              }`}
            >
              <div className="flex items-start gap-3">
                {forensicsData.has_tampering ? (
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30 animate-bounce">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-black tracking-tight">
                      {forensicsData.has_tampering
                        ? (isBn ? 'উচ্চমাত্রার জালিয়াতি ও অসঙ্গতি শনাক্ত!' : 'Critical Forgery & Tamper Detected!')
                        : (isBn ? 'দলিল সম্পূর্ণ বৈধ ও রেকর্ডভুক্ত' : '100% Verified Authentic Deed')}
                    </h4>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        forensicsData.has_tampering
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      Risk: {forensicsData.risk_score}/100
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed opacity-90">
                    {forensicsData.tamper_summary_bn}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected Field Inspection Card */}
          {activeBox ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#070c12] border-2 border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      activeBox.status === 'tampered'
                        ? 'bg-rose-500 animate-ping'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {activeBox.label_bn}
                  </h5>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    activeBox.status === 'tampered'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {activeBox.status === 'tampered' ? 'TAMPERED / জালিয়াতি' : 'VERIFIED / সঠিক'}
                </span>
              </div>

              {/* Two Column Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    দলিল থেকে নিষ্কাশিত (OCR)
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-mono font-bold block ${
                      activeBox.status === 'tampered' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {activeBox.ocr_text}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    সরকারি কেন্দ্রীয় রেকর্ড (Khatian)
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                    {activeBox.official_record}
                  </span>
                </div>
              </div>

              {/* Forensic Evidence Note */}
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                  activeBox.status === 'tampered'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                  <Info className="w-3.5 h-3.5" />
                  <span>ফরেনসিক বিশ্লেষণ ও আইনি সিদ্ধান্ত:</span>
                </div>
                <p>{activeBox.evidence_bn}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              বাম পাশের দলিলের যেকোনো বাউন্ডিং বক্সে ক্লিক করে বিস্তারিত পরীক্ষা করুন।
            </div>
          )}

          {/* All Detected Fields List */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              দলিলের সকল ফিল্ডের সারসংক্ষেপ (Click to Inspect)
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {forensicsData?.boxes.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBoxId(b.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                    selectedBoxId === b.id
                      ? 'bg-slate-100 dark:bg-slate-800 border-emerald-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50/50 dark:bg-black/40 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {b.status === 'tampered' ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">{b.label_bn}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      b.status === 'tampered'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {b.status === 'tampered' ? 'মিলেনি' : 'মিলেছে'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
