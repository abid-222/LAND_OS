import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronRight,
  ChevronLeft,
  ScanLine,
  QrCode,
  ShieldAlert,
  FileCheck2,
  ExternalLink,
  CheckCircle2,
  GitBranch,
  Bot,
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
      titleBn: 'P1: বাংলা দলিল স্ক্যান ও ফিল্ড এক্সট্রাকশন',
      titleEn: 'P1: Bengali Document Scan & Field Extraction',
      tagBn: '০১ / বাংলা ওসিআর ও ইনজেস্ট',
      tagEn: '01 / OCR & Ingestion Gate',
      icon: ScanLine,
      descBn:
        'মোবাইল ক্যামেরা বা স্ক্যানার থেকে সরাসরি দলিল ক্যাপচার। অন-ডিভাইস কোয়ালিটি গেট ব্লার, আলো ও রেজোলিউশন যাচাই করে। অপটিমাইজড বাংলা ওসিআর দিয়ে দাগ নম্বর, খতিয়ান, মৌজা ও মালিকের নাম তাৎক্ষণিক নিষ্কাশন হয়।',
      descEn:
        'Direct document capture with on-device image quality gates (blur, glare, resolution). Extracts Dag numbers, Khatian IDs, Mouza names, and ownership fields with specialized Bengali OCR and normalization.',
      highlightsBn: [
        'বাংলা সংখ্যা ও দাগের উপ-নম্বর (যেমন: ১২০৫/১) স্বয়ংক্রিয় প্রমিতকরণ।',
        'এপিস্টেমিক ট্রাস্ট লেবেলিং: OCR_EXTRACTED ও USER_CORRECTED অডিট লগ।',
        'অফলাইন-ফার্স্ট ক্যাপচার ও ব্রাউজার IndexedDB কিউ সিনক্রোনাইজেশন।',
      ],
      highlightsEn: [
        'Automated normalization of Bengali numerals and sub-numbers (e.g. 1205/1).',
        'Epistemic trust labeling: explicit OCR_EXTRACTED vs USER_CORRECTED audit trail.',
        'Offline-first document capture with IndexedDB queue sync.',
      ],
      actionTab: 'scan',
      actionLabelBn: 'স্ক্যান মডিউলে যান',
      actionLabelEn: 'Open Scan Portal',
    },
    {
      stepNumber: 2,
      titleBn: 'P2: ক্রিপ্টোগ্রাফিক কিউআর ও ডিজিটাল সিল যাচাই',
      titleEn: 'P2: Cryptographic QR & Digital Tamper Detection',
      tagBn: '০২ / ডিজিটাল স্বাক্ষর ও কিউআর',
      tagEn: '02 / QR & Cryptographic Seal',
      icon: QrCode,
      descBn:
        'রেজিস্ট্রেশন দলিলের কিউআর কোড স্ক্যান করে সরকারি সাব-রেজিস্ট্রি অফিসের ক্রিপ্টোগ্রাফিক SHA-256 হ্যাশ এবং ডিজিটাল স্বাক্ষর মিলিয়ে দেখা হয়। কাগজের দলিলের কোনো টেক্সট বিকৃত করা হলে তা তৎক্ষণাৎ ধরা পড়ে।',
      descEn:
        'Scans deed QR codes and verifies the cryptographic SHA-256 hash and digital signature against registered registry office seals. Detects physical document tampering and unauthorized alterations.',
      highlightsBn: [
        'ডিজিটাল সই ও হ্যাশ সমন্বয় যাচাই (QR_VERIFIED বনাম TAMPER_DETECTED)।',
        'সাব-রেজিস্ট্রি অফিসের ভলিউম ও পেজ রেফারেন্স ক্রস-চেক।',
        'অনলাইন ও অফলাইন উভয় মাধ্যমে কিউআর ডিকোড ক্ষমতা।',
      ],
      highlightsEn: [
        'Digital signature and hash match verification (QR_VERIFIED vs TAMPER_DETECTED).',
        'Sub-registry volume and page cross-referencing.',
        'Online and offline QR decoding capability.',
      ],
      actionTab: 'scan',
      actionLabelBn: 'দলিল যাচাই করুন',
      actionLabelEn: 'Verify Deed QR',
    },
    {
      stepNumber: 3,
      titleBn: 'P3: দ্বৈত-বিক্রয় ও খতিয়ান বিরোধ শনাক্তকরণ',
      titleEn: 'P3: Double-Sale & Deed Conflict Engine',
      tagBn: '০৩ / ঝুঁকি ও বিরোধ ইঞ্জিন',
      tagEn: '03 / Conflict & Risk Rules',
      icon: ShieldAlert,
      descBn:
        'ভূমি হস্তান্তরের সবচেয়ে বড় ঝুঁকি হলো একই জমি একাধিক ব্যক্তির কাছে বিক্রি। ল্যান্ডওএস ৬টি ডিটারমিনিস্টিক নিয়মে খতিয়ান ও দলিলের অসঙ্গতি (R1-R6) বের করে। ডেমো দাগ P-4520-তে যুগপৎ দ্বৈত বিক্রয়ের স্পষ্ট প্রমাণ দেখুন।',
      descEn:
        'Identifies the primary cause of land disputes: concurrent double sales and title discontinuities. Runs 6 deterministic conflict rules (R1-R6) with registered volume, page numbers, and circular citations.',
      highlightsBn: [
        'রুল R1: ডাবল সেল ও সমকালীন হস্তান্তর বিরোধ শনাক্তকরণ।',
        'রুল R2-R6: ডুপ্লিকেট রেফারেন্স, অসম্ভাব্য রেজিস্ট্রেশন তারিখ ও নামজারি বিচ্ছিন্নতা।',
        'ভূমি মন্ত্রণালয়ের সার্কুলার রেফারেন্স ও দাগের ইতিহাস টাইমলাইন।',
      ],
      highlightsEn: [
        'Rule R1: Double sale and concurrent transfer conflict detection.',
        'Rules R2-R6: Duplicate deed references, chronological date anomalies, title gaps.',
        'Ministry of Land circular citations with complete parcel timeline.',
      ],
      actionTab: 'alerts',
      actionLabelBn: 'দাগ P-4520 বিরোধ দেখুন',
      actionLabelEn: 'Inspect P-4520 Alerts',
    },
    {
      stepNumber: 4,
      titleBn: 'P5: ক্রেতার প্রাক-ক্রয় ডিউ ডিলিজেন্স',
      titleEn: 'P5: Citizen Pre-Purchase Due Diligence Check',
      tagBn: '০৪ / ক্রেতা রিপোর্ট ও প্রাক-ক্রয় যাচাই',
      tagEn: '04 / Pre-Purchase Verification',
      icon: FileCheck2,
      descBn:
        'জমি কেনার আগেই সাধারণ নাগরিকরা ৬টি সুনির্দিষ্ট ট্রাফিক লাইট ইন্ডিকেটরে যাচাই করতে পারেন জমিটি খাস জমি (R7), অধিগ্রহণকৃত জমি (R8) বা আদালতের নিষেধাজ্ঞাধীন (R9) কিনা। পুরো রিপোর্টটি প্রিন্ট বা সংরক্ষণযোগ্য।',
      descEn:
        'Before committing funds, citizens check parcels against 6 objective traffic-light indicators: government khas land (R7), gazetted acquisition (R8), and active court injunctions (R9). Neutral and exportable.',
      highlightsBn: [
        '৬টি ট্রাফিক লাইট: মালিকানা, দ্বৈত বিক্রয়, খাস জমি, অধিগ্রহণ, মামলা ও রেকর্ড সামঞ্জস্য।',
        'পরিষ্কার ও নিরপেক্ষ ফলাফল (P-CLEAN-01 সম্পূর্ণ অনুমোদিত, P-KHAS-01 খাস)।',
        'ব্রাউজার-নেটিভ প্রিন্ট ও অফিসিয়াল আইনি দাবিত্যাগ সমন্বয়।',
      ],
      highlightsEn: [
        '6 traffic lights: Ownership, double sales, khas land, acquisition, litigation, record sync.',
        'Clear test parcels (P-CLEAN-01 verified vs P-KHAS-01 govt khas).',
        'Browser-native print formatting with strict non-legal advice disclaimers.',
      ],
      actionTab: 'report',
      actionLabelBn: 'বায়ার রিপোর্ট তৈরি করুন',
      actionLabelEn: 'Generate Buyer Report',
    },
    {
      stepNumber: 5,
      titleBn: 'P4: স্মার্ট ই-নামজারি ও অটো-ভেরিফিকেশন',
      titleEn: 'P4: Smart E-Namjari Workflow & Tracking',
      tagBn: '০৫ / ই-নামজারি ও ওয়ার্কফ্লো',
      tagEn: '05 / Mutation State Machine',
      icon: GitBranch,
      descBn:
        'স্বয়ংক্রিয় এআই প্রি-ভেরিফিকেশনসহ পূর্ণাঙ্গ ই-নামজারি স্টেট মেশিন। নাগরিক আবেদন দাখিলের পর সিস্টেম কিউআর, বিক্রেতা ও খাস জমি যাচাই করে। রিভিউয়ার ও এসিল্যান্ডের অনুমোদন শেষে তৈরি হয় ট্র্যাকিং কোড NJ-2026-1001।',
      descEn:
        'Complete mutation state machine with automated AI pre-verification. Validates deed authenticity, seller matching, and khas restrictions before reviewer hearing and AC Land supervisor sign-off.',
      highlightsBn: [
        'স্বয়ংক্রিয় ৪-দফা প্রি-ভেরিফিকেশন চেকলিস্ট ও এসএলএ কাউন্টডাউন।',
        'ভূমিকাভিত্তিক অনুমোদন ওয়ার্কফ্লো (Operator -> Reviewer -> Supervisor)।',
        'নাগরিকদের জন্য সার্বজনীন ট্র্যাকিং কোড অনুসন্ধান (যেমন: NJ-2026-1001)।',
      ],
      highlightsEn: [
        'Automated 4-point pre-verification checklist and SLA countdown.',
        'Role-segregated workflow (Operator -> Reviewer -> Supervisor sign-off).',
        'Public tracking code lookup (e.g. NJ-2026-1001) with live milestone stepper.',
      ],
      actionTab: 'namjari',
      actionLabelBn: 'ই-নামজারি পোর্টালে যান',
      actionLabelEn: 'Open E-Namjari Portal',
    },
    {
      stepNumber: 6,
      titleBn: 'P6: পার্সেল গার্ডিয়ান ও বাংলা ভয়েস সহকারী',
      titleEn: 'P6: Parcel Guardian & Bengali Voice Assistant',
      tagBn: '০৬ / ভয়েস এআই ও গার্ডিয়ান অ্যালার্ট',
      tagEn: '06 / Voice AI & Watch Alerts',
      icon: Bot,
      descBn:
        'প্রাকৃতিক বাংলায় মুখে কথা বলে জমি যাচাই ("জমি কেনার আগে P-4520 যাচাই করুন")। পার্সেল গার্ডিয়ানের মাধ্যমে আপনার পছন্দের দাগ সাবস্ক্রাইব করে রাখুন—যেকোনো অনাকাঙ্ক্ষিত আবেদন বা বিক্রয় চেষ্টার সাথে সাথে পাবেন সিমুলেটেড এসএমএস।',
      descEn:
        'Natural Bengali voice commands for instant verification. Parcel Guardian allows citizens to watch critical land parcels and receive simulated SMS alerts whenever unauthorized deed transactions occur.',
      highlightsBn: [
        'বাংলা কথ্য সংখ্যা ও দাগ নম্বরের স্বাভাবিক রূপান্তর (ওয়েব স্পিচ এআই)।',
        'পার্সেল ওয়াচ সাবস্ক্রিপশন ও সিমুলেটেড এসএমএস নোটিফিকেশন আউটবক্স।',
        'দাবিত্যাগ ও রেফারেন্সসহ কথ্য অডিও উত্তর প্রদান।',
      ],
      highlightsEn: [
        'Spoken Bengali numeral and query intent parsing with voice audio synthesis.',
        'Parcel watch subscriptions with simulated SMS outbox view.',
        'Grounded audio guidance with circular citations and disclaimers.',
      ],
      actionTab: 'report',
      actionLabelBn: 'গার্ডিয়ান ওয়াচ দেখুন',
      actionLabelEn: 'Explore Parcel Guardian',
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
