import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ScanLine,
  Map as MapIcon,
  ShieldAlert,
  FileCheck2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: string, params?: Record<string, string>) => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'bn';
  const isBn = currentLang.startsWith('bn');

  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      stepNumber: 1,
      titleBn: 'বাংলাদেশ ল্যান্ডওএস প্ল্যাটফর্ম পরিচিতি',
      titleEn: 'Platform Overview & Core Mission',
      tagBn: '০১ / ভিশন ও স্থাপত্য',
      tagEn: '01 / Vision & Core Architecture',
      icon: Sparkles,
      descBn:
        'বাংলাদেশ ল্যান্ডওএস হলো জাতীয় স্তরের সার্বভৌম ভূমি গোয়েন্দা ও স্ক্যান-টু-সার্চ প্ল্যাটফর্ম। এটি বাংলা খতিয়ান ও দলিলের জটিল ভাষা, দাগ/খতিয়ানের উপ-নম্বর এবং জালিয়াতি শনাক্তকরণে এআই ও ক্রিপ্টোগ্রাফিক চেইন ব্যবহার করে।',
      descEn:
        'Bangladesh LandOS is an epistemic-first AI land intelligence and scan-to-search platform built specifically for Bangladesh land administration reality, combining Bengali OCR, 3D Cadastral maps, and deterministic conflict detection.',
      highlightsBn: [
        'বাংলা ও ইংরেজি উভমুখী ডুয়েল ইন্টারফেস ও সার্বক্ষণিক ডার্ক/লাইট মোড।',
        '৫,২৫০+ ভূমি রেকর্ড ও ৪০টি মৌজার প্রাক-সংযুক্ত ডেমো ডাটাবেজ।',
        'সার্ভার-সাইড সেশন ও আরগোন২আইডি মাল্টি-ফ্যাক্টর নিরাপত্তা।',
      ],
      highlightsEn: [
        'Dual English & Bengali interface with responsive Dark & Light themes.',
        '5,250+ pre-seeded land records across 40 surveyed mouzas.',
        'Argon2id password hashing + HTTP-only session cookies with Double Submit CSRF.',
      ],
      actionTab: 'home',
      actionLabelBn: 'ড্যাশবোর্ড দেখুন',
      actionLabelEn: 'Explore Dashboard',
    },
    {
      stepNumber: 2,
      titleBn: 'স্মার্ট স্ক্যান-টু-সার্চ ও বাংলা ওসিআর',
      titleEn: 'Smart Scan-to-Search & Bengali OCR',
      tagBn: '০২ / স্ক্যান ও এক্সট্রাকশন',
      tagEn: '02 / Scan & Intelligence',
      icon: ScanLine,
      descBn:
        'মোবাইল বা স্ক্যানার থেকে ছবি তুললে অন-ডিভাইস কোয়ালিটি গেট ছবিটির ব্লার, আলো ও রেজোলিউশন যাচাই করে। প্রথমে কিউআর কোড ডিটেক্ট করে ক্রিপ্টোগ্রাফিক হ্যাশ যাচাই হয়, এরপর বাংলা ওসিআর দিয়ে দাগ ও খতিয়ান ফিল্ড নিষ্কাশন করা হয়।',
      descEn:
        'Direct photo upload triggers on-device quality verification (blur, glare, resolution). Cryptographic QR codes are prioritized first, followed by robust Bengali OCR for Dag and Khatian field extraction.',
      highlightsBn: [
        'অন-ডিভাইস কোয়ালিটি গেট ও লাইভ ক্যামেরা দিকনির্দেশনা।',
        'বাংলা সংখ্যা ও দাগের উপ-নম্বর (যেমন: ১২৩৪/১) নিখুঁত নরমালাইজেশন।',
        'এপিস্টেমিক ট্রাস্ট ব্যাজ: OCR_EXTRACTED ও USER_CORRECTED ফিল্ড লেবেলিং।',
      ],
      highlightsEn: [
        'On-device image quality verification with Bengali guidance.',
        'Seamless normalization of Bengali numerals and sub-numbers (e.g. 1234/1).',
        'Epistemic trust badges: explicit labeling of extracted vs verified data.',
      ],
      actionTab: 'scan',
      actionLabelBn: 'স্ক্যান পোর্টালে যান',
      actionLabelEn: 'Open Scan Portal',
    },
    {
      stepNumber: 3,
      titleBn: 'ব্যাখ্যাযোগ্য রেকর্ড ম্যাচিং ও ৩ডি ক্যাডাস্ট্রাল ম্যাপ',
      titleEn: 'Explainable Matching & 3D Cadastral Map',
      tagBn: '০৩ / রেকর্ড ও মানচিত্র',
      tagEn: '03 / Records & 3D GIS',
      icon: MapIcon,
      descBn:
        'এক্সট্র্যাক্ট করা ফিল্ড দিয়ে সেকেন্ডের মধ্যে সম্ভাব্য রেকর্ড খুঁজে বের করা হয়। কোনো ব্ল্যাক-বক্স অনুমান নয়—দাগ (+৪০%), খতিয়ান (+৩০%), এবং মৌজা (+২৫%) এর স্পষ্ট স্কোর ব্রেকডাউন দেওয়া হয়। ৩ডি ম্যাপে দাগের প্লট সরাসরি পরিদর্শন করা যায়।',
      descEn:
        'Retrieved records are presented with full explainability (+40% Dag, +30% Khatian, +25% Mouza). The interactive 3D map renders parcel polygons with terrain pitch, elevation, and layer toggles.',
      highlightsBn: [
        'স্বচ্ছ ম্যাচিং স্কোর ও একাধিক সম্ভাব্য প্রার্থীর ক্ষেত্রে অ্যাম্বিগুইটি ওয়ার্নিং।',
        'ত্রিমাত্রিক ক্যাডাস্ট্রাল ভিউ (pitch 60°, bearing -15°) এবং স্তর টগল।',
        'স্থায়ী আইনি দাবিত্যাগ ব্যানার: "Illustrative / Not a legal boundary"।',
      ],
      highlightsEn: [
        'Transparent itemized score breakdown avoiding black-box assertions.',
        'Interactive 3D Cadastral Map with layer filters and touch gestures.',
        'Permanent legal disclaimer banner adhering to boundary sovereignty.',
      ],
      actionTab: 'map',
      actionLabelBn: '৩ডি ম্যাপ ওপেন করুন',
      actionLabelEn: 'Open 3D Map',
    },
    {
      stepNumber: 4,
      titleBn: '৬টি ডিটারমিনিস্টিক রিস্ক ও কনফ্লিক্ট রুলস',
      titleEn: '6 Deterministic Risk & Conflict Rules',
      tagBn: '০৪ / ঝুঁকি ও অ্যালার্ট ইঞ্জিন',
      tagEn: '04 / Risk Engine',
      icon: ShieldAlert,
      descBn:
        'বাংলাদেশে জমি নিয়ে সবচেয়ে বেশি মামলা হয় একাধিক বিক্রি ও জাল দলিলের কারণে। ল্যান্ডওএস ৬টি সুনির্দিষ্ট নিয়মে খতিয়ান ও দলিলের অসঙ্গতি বের করে এবং প্রতিটি অ্যালার্টের সাথে ভলিউম ও পেজ নম্বরের অকাট্য প্রমাণ প্রদর্শন করে।',
      descEn:
        'Identifies duplicate deed sales, chain-of-title discontinuities, and impossible dates using 6 deterministic rules, citing registered volume, page numbers, and official circular evidence.',
      highlightsBn: [
        'রুল R1: অতিরিক্ত জমি বিক্রি বা ওভার-ট্রানজাকশন শনাক্তকরণ।',
        'রুল R2-R6: ডুপ্লিকেট রেফারেন্স, অসম্ভাব্য তারিখ ও নামজারি বিচ্ছিন্নতা।',
        'ভূমি মন্ত্রণালয়ের অফিসিয়াল সার্কুলার লিংক ও প্রমাণ তালিকা।',
      ],
      highlightsEn: [
        'Rule R1: Over-transaction & multiple simultaneous sales detection.',
        'Rules R2-R6: Duplicate deed references, chronological date anomalies, title gaps.',
        'Every alert grounded in Ministry circular citations and page evidence.',
      ],
      actionTab: 'alerts',
      actionLabelBn: 'নমুনা প্লট অ্যালার্ট দেখুন',
      actionLabelEn: 'View Sample Alerts',
    },
    {
      stepNumber: 5,
      titleBn: 'ক্রেতার ঝুঁকি রিপোর্ট ও অ্যাকুরেসি ল্যাব',
      titleEn: 'Buyer Due Diligence Report & AI Lab',
      tagBn: '০৫ / বায়ার রিপোর্ট ও গভর্ন্যান্স',
      tagEn: '05 / Buyer Report & Governance',
      icon: FileCheck2,
      descBn:
        'জমি কেনার আগে ক্রেতারা ৬টি সম্পূর্ণ অংশে বিভক্ত বায়ার ডিউ ডিলিজেন্স রিপোর্ট তৈরি এবং প্রিন্ট করতে পারেন। অন্যদিকে টেক অ্যাডমিনরা অ্যাকুরেসি ল্যাবে রিয়েল-টাইমে ক্যারেক্টার এরর রেট (CER) এবং ফিল্ড এক্সট্রাকশন অ্যাকুরেসি (FEA) পর্যবেক্ষণ করতে পারেন।',
      descEn:
        'Citizens generate comprehensive 6-section buyer due diligence reports with print stylesheets. Technical administrators monitor CER, per-field FEA, confusion matrices, and quality gates in real-time.',
      highlightsBn: [
        'নিরপেক্ষ ও তথ্যনিষ্ঠ বায়ার রিপোর্ট (কোনো ঝুঁকিপূর্ণ রায় ব্যতিরেকে)।',
        'ব্রাউজার-নেটিভ প্রিন্ট স্টাইলশিট ও কিউআর যাচাই লিংক।',
        'অ্যাকুরেসি ল্যাব: CER < ৫% ও FEA >= ৯৫% রিলিজ গেট ড্যাশবোর্ড।',
      ],
      highlightsEn: [
        'Neutral, fact-based buyer due diligence reports with print preview.',
        'Browser-native print CSS and cryptographic verification links.',
        'Accuracy Lab: real-time monitoring of CER < 5% and per-field FEA gates.',
      ],
      actionTab: 'report',
      actionLabelBn: 'বায়ার রিপোর্ট দেখুন',
      actionLabelEn: 'Inspect Buyer Report',
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleJumpToModule = () => {
    onClose();
    onNavigateToTab(current.actionTab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1219] rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {isBn ? current.tagBn : current.tagEn}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {isBn ? current.titleBn : current.titleEn}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close Tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Description */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            {isBn ? current.descBn : current.descEn}
          </p>

          {/* Highlights Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isBn ? 'মূল প্রযুক্তিগত বৈশিষ্ট্যসমূহ:' : 'Key Technical Capabilities:'}
            </span>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {(isBn ? current.highlightsBn : current.highlightsEn).map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Direct Jump Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleJumpToModule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition-colors"
            >
              <span>{isBn ? current.actionLabelBn : current.actionLabelEn}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-emerald-500'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                currentStep === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{isBn ? 'পূর্ববর্তী' : 'Back'}</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/30 flex items-center gap-1 transition-all"
            >
              <span>
                {currentStep === steps.length - 1
                  ? isBn
                    ? 'ট্যুর সমাপ্ত'
                    : 'Finish'
                  : isBn
                  ? 'পরবর্তী'
                  : 'Next'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
