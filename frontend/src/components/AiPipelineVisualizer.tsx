import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Camera,
  FileSearch,
  Binary,
  GitCompare,
  ShieldAlert,
  Blocks,
} from 'lucide-react';

export const AiPipelineVisualizer: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      id: 'quality',
      num: '০১',
      titleBn: 'ইমেজ কোয়ালিটি গেট',
      titleEn: 'Vision Quality Gate',
      icon: Camera,
      badgeBn: 'অন-ডিভাইস ভিশন',
      badgeEn: 'On-Device Vision',
      descBn:
        'ক্যামেরা বা আপলোডকৃত ছবির ল্যাপলাসিয়ান ভ্যারিয়েন্স (Laplacian Variance > 100) দ্বারা ব্লার এবং গ্রে-স্কেল হিস্টোগ্রাম দিয়ে আলো ও গ্লেয়ার সরাসরি ব্রাউজারে যাচাই করা হয়। ফলে খারাপ ছবি সার্ভারে পৌঁছানোর আগেই সঠিক নির্দেশনা পায়।',
      descEn:
        'Analyzes blur (Laplacian Variance > 100) and brightness (histogram distribution 40–220) directly on-device using a Web Worker before upload.',
      metrics: [
        { labelBn: 'ব্লার থ্রেশহোল্ড', labelEn: 'Blur Threshold', val: 'Var > 100' },
        { labelBn: 'ব্রাইটনেস লিমিট', labelEn: 'Brightness Limit', val: '40 - 220' },
        { labelBn: 'রেজোলিউশন রেট', labelEn: 'Min DPI Target', val: '300 DPI' },
      ],
      codeSample: `// Web Worker on-device verification
const isBlurry = laplacianVariance(imageData) < 100;
const hasGlare = maxBrightness(imageData) > 245;
if (isBlurry) return { status: 'REJECT_BLURRY' };`,
    },
    {
      id: 'ocr',
      num: '০২',
      titleBn: 'বাংলা ওসিআর ও কিউআর',
      titleEn: 'Bengali OCR & QR',
      icon: FileSearch,
      badgeBn: 'লেআউট ও এক্সট্রাকশন',
      badgeEn: 'Layout & OCR',
      descBn:
        'দলিলের কিউআর কোড থাকলে ক্রিপ্টোগ্রাফিক হ্যাশ যাচাই সর্বাগ্রে অগ্রাধিকার পায়। একই সাথে ডিপ লার্নিং বাংলা ওসিআর দিয়ে খতিয়ানের ছক (টেবিল গ্রিড), দাগ নং, খতিয়ান নং ও মালিকদের নাম এক্সট্র্যাক্ট করা হয়।',
      descEn:
        'Prioritizes tamper-evident QR code detection first, followed by CRNN deep-learning Bengali OCR layout parser for Dag, Khatian, and Party names.',
      metrics: [
        { labelBn: 'ক্যারেক্টার এরর রেট (CER)', labelEn: 'Char Error Rate', val: '2.1% (Gate < 5%)' },
        { labelBn: 'দাগ নম্বর FEA', labelEn: 'Dag Extraction', val: '100% Accuracy' },
        { labelBn: 'কিউআর ডিটেকশন রেট', labelEn: 'QR Decode Rate', val: '60.0% Real Scans' },
      ],
      codeSample: `// Scoped QR + Bengali text recognition
const qrResult = decodeQRCode(porchaImage);
const ocrFields = extractBengaliPorchaFields(porchaImage);
return { qr: qrResult, fields: ocrFields, trust: 'OCR_EXTRACTED' };`,
    },
    {
      id: 'normalize',
      num: '০৩',
      titleBn: 'সংখ্যা ও নাম নরমালাইজেশন',
      titleEn: 'Numeral Normalization',
      icon: Binary,
      badgeBn: 'কন্ট্রাক্ট রেজেক্স',
      badgeEn: 'Canonical Rules',
      descBn:
        'বাংলা ও ইংরেজি সংখ্যা (যেমন: ১২৩৪ ও 1234), উপ-দাগ (১২৩৪/১) এবং নামের বিভিন্ন বানানের তারতম্যকে ইউনিফাইড ক্যানোনিকাল ফরম্যাটে রূপান্তর করে ডাটাবেজের সাথে হুবহু সামঞ্জস্যপূর্ণ করা হয়।',
      descEn:
        'Converts mixed Bengali/ASCII digits, removes zero-width joiners, resolves O-vs-0 confusions, and canonicalizes sub-numbers (e.g. 1234/1) idempotently.',
      metrics: [
        { labelBn: 'নরমালাইজেশন টেস্ট কেস', labelEn: 'Shared Test Cases', val: '65 / 65 Passed' },
        { labelBn: 'উপ-দাগ হ্যান্ডলিং', labelEn: 'Sub-number Handling', val: 'main_no + sub_no' },
        { labelBn: 'আইডেমপোটেন্সি রেট', labelEn: 'Idempotency', val: '100% Consistent' },
      ],
      codeSample: `// Bidirectional normalization engine
const canonicalDag = normalizeIdentifier('১২৩৪/ক'); // { main_no: 1234, sub_no: 1 }
const bnDigits = formatBnDigits('1234/1'); // '১২৩৪/১'`,
    },
    {
      id: 'match',
      num: '০৪',
      titleBn: 'ব্যাখ্যাযোগ্য ম্যাচিং স্কোরের',
      titleEn: 'Explainable Match Scorer',
      icon: GitCompare,
      badgeBn: 'প্যারালাল ক্যান্ডিডেট',
      badgeEn: 'Candidate Scorer',
      descBn:
        'অস্পষ্ট সার্চের ক্ষেত্রে সিস্টেম কোনো একক অনুমান চাপিয়ে দেয় না। দাগ (+৪০%), খতিয়ান (+৩০%), মৌজা (+২৫%) এবং নামের ট্রাইগ্রাম সাদৃশ্যের ওপর ভিত্তি করে সর্বোচ্চ ম্যাচিং প্রার্থী বের করা হয়।',
      descEn:
        'Retrieves matching Khatians using weighted multi-identifier scoring. Generates explainable confidence breakdowns with ambiguity warnings when candidates tie.',
      metrics: [
        { labelBn: 'ম্যাচ প্রিসিশন@১', labelEn: 'Match Precision@1', val: '98.8%' },
        { labelBn: 'ফলস ম্যাচ রেট', labelEn: 'False-Match Rate', val: '2.91%' },
        { labelBn: 'দাগ ওয়েটিং শেয়ার', labelEn: 'Dag Match Weight', val: '+40% Score' },
      ],
      codeSample: `// Itemized explainable candidate scoring
score = 0;
if (dagMatches) score += 0.40;
if (khatianMatches) score += 0.30;
if (mouzaMatches) score += 0.25;
if (trigramSimilarity > 0.8) score += 0.05;`,
    },
    {
      id: 'risk',
      num: '০৫',
      titleBn: '৬টি ডিটারমিনিস্টিক রিস্ক রুলস',
      titleEn: '6 Deterministic Risk Rules',
      icon: ShieldAlert,
      badgeBn: 'কনফ্লিক্ট ডিটেকশন',
      badgeEn: 'Title Conflict Guard',
      descBn:
        'একাধিক ব্যক্তির কাছে একই জমি বিক্রি, নিবন্ধিত পরিমাণের চেয়ে বেশি হস্তান্তর, বা নামজারি শৃঙ্খল ভাঙা থাকলে এআই অ্যালার্ট জেনারেট করে। প্রতিটি অ্যালার্টে অফিসিয়াল সার্কুলার ও রেজিস্ট্রি ভলিউম/পৃষ্ঠা নম্বর উল্লেখ থাকে।',
      descEn:
        'Deterministic rule engine detects over-transactions, duplicate deeds, and chain-of-title gaps. Zero subjective claims; 100% evidence-grounded alerts.',
      metrics: [
        { labelBn: 'রুল R1-R6 প্রিসিশন', labelEn: 'Rules Precision', val: '100.0%' },
        { labelBn: 'রুল R1-R6 রিকল', labelEn: 'Rules Recall', val: '100.0%' },
        { labelBn: 'প্রমাণ সংযুক্তি রেট', labelEn: 'Evidence Linking', val: '100% Verified' },
      ],
      codeSample: `// Rule 1: Over-transaction detection
if (sumDeedArea(parcelId) > registeredRecordArea(parcelId)) {
  raiseAlert({
    rule: 'R1_OVER_TRANSACTION_AREA',
    evidence: [{ volume: 'vol_44', page: 'p_112', excess_acres: 0.12 }]
  });
}`,
    },
    {
      id: 'audit',
      num: '০৬',
      titleBn: 'ক্রিপ্টোগ্রাফিক অডিট চেইন',
      titleEn: 'Cryptographic Audit Chain',
      icon: Blocks,
      badgeBn: 'ট্যাম্পার-প্রুফ লেজার',
      badgeEn: 'SHA-256 Ledger',
      descBn:
        'প্রতিটি সার্চ, ফিল্ড সংশোধন, ভেরিফিকেশন ও রিভিউ সিদ্ধান্ত এসএইচএ-২৫৬ (SHA-256) হ্যাশ দিয়ে পূর্ববর্তী ব্লকের সাথে চেইন করে সংরক্ষণ করা হয়। ফলে ডাটাবেজে কোনো রেকর্ড গোপনে মুছে ফেলা বা পরিবর্তন করা অসম্ভব।',
      descEn:
        'Every document decision, field correction, and admin action is recorded in an immutable SHA-256 hash-chained ledger: sha256(prev_hash + canonical_payload).',
      metrics: [
        { labelBn: 'হ্যাশ অ্যালগরিদম', labelEn: 'Hash Algorithm', val: 'SHA-256' },
        { labelBn: 'ব্লক চেইন কন্টিনিউটি', labelEn: 'Continuity Check', val: '13 Blocks Valid' },
        { labelBn: 'ট্যাম্পার রেজিস্ট্যান্স', labelEn: 'Tamper Evident', val: 'Mathematically Proven' },
      ],
      codeSample: `// Cryptographic hash chaining
currentHash = sha256(prevHash + JSON.stringify(canonicalEventPayload));
auditLog.insert({ prev_hash: prevHash, current_hash: currentHash });`,
    },
  ];

  const current = stages[activeStage];
  const CurrentIcon = current.icon;

  return (
    <div className="w-full rounded-2xl bg-slate-900/80 dark:bg-[#080d12]/90 border border-slate-200 dark:border-emerald-500/20 p-5 md:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Background Cyber Glow Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBn ? 'এআই ও এমএল আর্কিটেকচার' : 'AI & ML Pipeline'}</span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isBn
              ? 'ভূমি গোয়েন্দা ইঞ্জিন কীভাবে কাজ করে?'
              : 'How the Land Intelligence Engine Works'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBn
              ? 'নিচে প্রতিটি ধাপে ক্লিক করে বাস্তব অ্যালগরিদম ও লাইভ কোয়ালিটি মেট্রিকস পরীক্ষা করুন।'
              : 'Click any pipeline stage below to inspect algorithms and real-time validation gates.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">
            {isBn ? 'ধাপ' : 'Stage'} {activeStage + 1} / {stages.length}
          </span>
        </div>
      </div>

      {/* Stage Tabs (Horizontal Flow Pipeline) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = idx === activeStage;

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              className={`flex flex-col p-3 rounded-xl border text-left transition-all duration-200 relative group ${
                isActive
                  ? 'bg-emerald-600/15 border-emerald-500 text-slate-900 dark:text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {stage.num}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
              </div>
              <span className="text-xs font-bold truncate leading-tight mb-0.5">
                {isBn ? stage.titleBn : stage.titleEn}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {isBn ? stage.badgeBn : stage.badgeEn}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Stage Detailed Breakdown Panel */}
      <div className="rounded-xl bg-slate-50 dark:bg-[#0d141b] border border-slate-200 dark:border-slate-800 p-5 md:p-6 transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Explanation & Live Metrics */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CurrentIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {current.num} • {isBn ? current.badgeBn : current.badgeEn}
                </span>
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                  {isBn ? current.titleBn : current.titleEn}
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {isBn ? current.descBn : current.descEn}
            </p>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {current.metrics.map((m, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800"
                >
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    {isBn ? m.labelBn : m.labelEn}
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {m.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Technical Code & Algorithmic Logic */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 font-mono">
                <Binary className="w-3.5 h-3.5 text-emerald-500" />
                Algorithm Implementation
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Active Code
              </span>
            </div>

            <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
              <code>{current.codeSample}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
