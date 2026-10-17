import React, { useState } from 'react';
import {
  Send,
  ExternalLink,
  AlertTriangle,
  Bot,
  User,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Search,
  Scale,
  FileText,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface CitationSource {
  title: string;
  act_or_rule: string;
  url?: string;
  last_verified?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  needsVerification?: boolean;
  citations?: CitationSource[];
  timestamp: string;
}

interface LegalArticle {
  id: string;
  category: 'mutation' | 'khatian' | 'tax' | 'deed' | 'dispute';
  titleBn: string;
  actBn: string;
  sourceUrl: string;
  verifiedAt: string;
  summaryBn: string;
  keySteps: string[];
}

const LEGAL_ARTICLES: LegalArticle[] = [
  {
    id: 'kb-001',
    category: 'mutation',
    titleBn: 'ই-নামজারি ও জমাভাগ আবেদন প্রক্রিয়া',
    actBn: 'রাষ্ট্রীয় অধিগ্রহণ ও প্রজাস্বত্ব আইন ১৯৫০ (ধারা ১১৬, ১১৭) ও ই-নামজারি সার্কুলার ২০২৩',
    sourceUrl: 'https://mutation.land.gov.bd',
    verifiedAt: '২০২৬-০৩-০১',
    summaryBn: 'জমি ক্রয়ের পর সহকারী কমিশনার (ভূমি) কার্যালয় থেকে রেকর্ড সংশোধন করে নিজ নামে খতিয়ান খোলার সরকারি পদ্ধতি।',
    keySteps: [
      'অনলাইনে mutation.land.gov.bd পোর্টালে জাতীয় পরিচয়পত্র ও মূল দলিল দিয়ে আবেদন',
      'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (তহশিলদার) কর্তৃক প্রস্তাবনা প্রতিবেদন প্রস্তুত',
      'এসিল্যান্ড কর্তৃক শুনানির নোটিশ ও পক্ষগণের উপস্থিতি',
      'চূড়ান্ত খতিয়ান অনুমোদন ও ডিসিআর (DCR) ফি পরিশোধ',
    ],
  },
  {
    id: 'kb-004',
    category: 'khatian',
    titleBn: 'ঐতিহাসিক জরিপ খতিয়ানের পরিচয়: সিএস, এসএ, আরএস ও বিএস',
    actBn: 'বেঙ্গল টেন্যান্সি অ্যাক্ট ১৮৮৫ এবং ভূমি রেকর্ড ও জরিপ অধিদপ্তর ম্যানুয়াল',
    sourceUrl: 'https://dlrs.gov.bd/site/page/survey-types',
    verifiedAt: '২০২৬-০২-১৫',
    summaryBn: 'সিএস জরিপ থেকে বর্তমান বিএস/সিটি জরিপ পর্যন্ত চার স্তরের জরিপ খতিয়ানের আইনি কার্যকারিতা ও গুরুত্ব।',
    keySteps: [
      'সিএস (CS): ১৮৮৮-১৯৪০ ব্রিটিশ আমলের প্রথম বৈজ্ঞানিক সীমানা ও মৌজা নকশা',
      'এসএ (SA): ১৯৫০ সালের জমিদারী অধিগ্রহণ পরবর্তী প্রজাস্বত্ব খতিয়ান',
      'আরএস (RS): এসএ-র ভুল সংশোধনমূলক রিভিশনাল সার্ভে বালাম',
      'বিএস/সিটি জরিপ (BS): স্বাধীন বাংলাদেশে প্রস্তুতকৃত আধুনিক ডিজিটাল জরিপ',
    ],
  },
  {
    id: 'kb-007',
    category: 'deed',
    titleBn: 'সাব-রেজিস্ট্রি অফিসে বায়া দলিল ও রেকর্ড তল্লাশি',
    actBn: 'রেজিস্ট্রেশন আইন ১৯০৮ (ধারা ৫৭) ও সম্পত্তি হস্তান্তর আইন ১৮৮২',
    sourceUrl: 'https://minland.gov.bd',
    verifiedAt: '২০২৬-০৩-১০',
    summaryBn: 'জমি ক্রয়ের পূর্বে বিগত ২৫ বছরের মালিকানা হস্তান্তরের ধারাবাহিকতা ও বালাম বই যাচাইয়ের নিয়মাবলী।',
    keySteps: [
      'দলিল গ্রহীতা ও দাতার নামের সঠিক বানান ও তফসিল বিবরণী মেলানো',
      'সাব-রেজিস্ট্রি অফিসের ইনডেক্স ও বালাম বহিতে দলিল নম্বরের রেকর্ড যাচাই',
      'বালামে কোনো প্রকার কাটাকাটি বা অস্পষ্টতা থাকলে সার্টিফাইড কপির আবেদন',
      'দাতা অন্য কারও কাছে পূর্বে বায়না বা বন্ধক রেখেছেন কিনা এনকামব্রেন্স সার্টিফিকেট নেওয়া',
    ],
  },
  {
    id: 'kb-005',
    category: 'tax',
    titleBn: 'ভূমি উন্নয়ন কর (খাজনা) পরিশোধ ও দাখিলা সংগ্রহ',
    actBn: 'ভূমি উন্নয়ন কর আইন ২০২৩',
    sourceUrl: 'https://ldtax.gov.bd',
    verifiedAt: '২০২৬-০২-২৮',
    summaryBn: 'অনলাইনে হোল্ডিং এন্ট্রি এবং প্রতি অর্থবছর হালনাগাদ খাজনা পরিশোধের ডিজিটাল দাখিলা যাচাই।',
    keySteps: [
      'ldtax.gov.bd তে নাগরিক অ্যাকাউন্ট তৈরি ও জাতীয় পরিচয়পত্র ভেরিফিকেশন',
      'খতিয়ান ও দাগ নম্বর দিয়ে হোল্ডিং সংযোজন',
      'বকেয়া কর হিসাব ও বিকাশ/নগদ/কার্ডের মাধ্যমে ই-পেমেন্ট',
      'কিউআর কোড সম্বলিত ডিজিটাল দাখিলা (Dakhila) প্রিন্ট ও সংরক্ষণ',
    ],
  },
  {
    id: 'kb-012',
    category: 'dispute',
    titleBn: 'ভূমি বিরোধ, স্বত্ব মামলা ও দেওয়ানি প্রতিকার',
    actBn: 'সুনির্দিষ্ট প্রতিকার আইন ১৮৭৭ (ধারা ৮, ৯, ৪২) ও দেওয়ানি কার্যবিধি ১৯০৮',
    sourceUrl: 'https://lawjusticediv.gov.bd',
    verifiedAt: '২০২৬-০১-২০',
    summaryBn: 'সীমানা দখল বেদখল, জাল দলিল বাতিল ও স্বত্ব ঘোষণার মোকদ্দমা পরিচালনার প্রাথমিক আইনি তথ্য।',
    keySteps: [
      'শান্তিশৃঙ্খলা ভঙ্গের আশঙ্কায় ফৌজদারি কার্যবিধির ১৪৪/১৪৫ ধারায় আবেদন',
      'সহকারী জজ আদালতে স্বত্ব ঘোষণা ও চিরস্থায়ী নিষেধাজ্ঞার মোকদ্দমা',
      'দলিল বাতিলের জন্য সুনির্দিষ্ট প্রতিকার আইনের ৩৯ ধারায় মামলা দায়ের',
      'মাঠপর্যায়ে দেওয়ানি আদালতের মাধ্যমে সরকারি সার্ভেয়ার নিয়োগ',
    ],
  },
  {
    id: 'kb-009',
    category: 'mutation',
    titleBn: 'ওয়ারিশান সূত্রে প্রাপ্ত সম্পত্তির নামজারি প্রক্রিয়া',
    actBn: 'মুসলিম পারিবারিক আইন ১৯৬১ / হিন্দু দায়ভাগ আইন ও ভূমি মন্ত্রণালয় বিধিমালা',
    sourceUrl: 'https://land.gov.bd',
    verifiedAt: '২০২৬-০৩-১২',
    summaryBn: 'মৃত ব্যক্তির ওয়ারিশদের নামে জমি বণ্টনের পর বণ্টননামা বা ফারায়েজ অনুযায়ী আলাদা খতিয়ান তৈরি।',
    keySteps: [
      'ইউনিয়ন পরিষদ / সিটি কর্পোরেশন থেকে ওয়ারিশান সনদপত্র সংগ্রহ',
      'সকল বৈধ ওয়ারিশের সম্মতিক্রমে রেজিস্ট্রিকৃত বণ্টননামা দলিল তৈরি',
      'ফারায়েজ ক্যালকুলেশন অনুযায়ী প্রত্যেক ওয়ারিশের অংশের হিসাব নির্ধারণ',
      'এসিল্যান্ড অফিসে জমাভাগ ও নতুন হোল্ডিং তৈরির আবেদন',
    ],
  },
];

const SAFETY_WIZARD_STEPS = [
  {
    step: 1,
    titleBn: 'খতিয়ান ও দাগ যাচাই',
    subtitleBn: 'বালাম বইয়ের সাথে মূল খতিয়ান মেলান',
    actionBn: 'উপজেলা ভূমি অফিসে মূল বালাম বহির সাথে দাগ, খতিয়ান ও মালিকের নাম ১০০% মিলিয়ে নিন।',
    icon: FileText,
  },
  {
    step: 2,
    titleBn: '২৫ বছরের বায়া দলিল',
    subtitleBn: 'মালিকানা হস্তান্তরের ধারাবাহিকতা',
    actionBn: 'বিক্রেতা যার কাছ থেকে জমি পেয়েছেন সেই বায়া দলিলের সত্যতা সাব-রেজিস্ট্রি অফিসে যাচাই করুন।',
    icon: Scale,
  },
  {
    step: 3,
    titleBn: 'হালনাগাদ ই-নামজারি',
    subtitleBn: 'এসিল্যান্ড অনুমোদিত মিউটেশন ও ডিসিআর',
    actionBn: 'বিক্রেতার নিজের নামে নামজারি পরচা ও ১,১৭০ টাকার সরকারি ডিসিআর রসিদ আছে কিনা নিশ্চিত হোন।',
    icon: ShieldCheck,
  },
  {
    step: 4,
    titleBn: '১৪৩১ সনের দাখিলা',
    subtitleBn: 'চলতি বছরের খাজনা পরিশোধ',
    actionBn: 'ldtax.gov.bd পোর্টালে বিক্রেতার হোল্ডিং চেক করে চলতি ১৪৩১ বঙ্গাব্দের দাখিলা যাচাই করুন।',
    icon: CheckCircle2,
  },
  {
    step: 5,
    titleBn: 'সরেজমিন দখল ও নকশা',
    subtitleBn: 'সরকারি আমিন দ্বারা পরিমাপ',
    actionBn: 'ডিজিটাল মৌজা ম্যাপ অনুযায়ী বাস্তব সীমানা ও দখলের সাথে দলিলের চৌহদ্দি মেপে বায়না করুন।',
    icon: Compass,
  },
];

export const GuidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'kb'>('assistant');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKbQuery, setSearchKbQuery] = useState('');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [activeWizardStep, setActiveWizardStep] = useState<number>(1);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'আসসালামু আলাইকুম! আমি বাংলাদেশ ল্যান্ডওএস আইনি সহায়ক। জমি জমা, নামজারি, পর্চা যাচাই, রেজিস্ট্রি বা ভূমি উন্নয়ন কর সংক্রান্ত যেকোনো বিষয়ে প্রশ্ন করতে পারেন।',
      citations: [
        {
          title: 'সিটিজেন চার্টার - ভূমি মন্ত্রণালয়',
          act_or_rule: 'ভূমি সংস্কার আইন ও নামজারি নীতিমালা ২০২৩',
          url: 'https://land.gov.bd',
          last_verified: '২০২৬-০৩-০১',
        },
      ],
      timestamp: '১০:০০ AM',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  const samplePrompts = [
    'নামজারি বা মিউটেশন করার নিয়ম কী?',
    'ই-পর্চা অনলাইনে কীভাবে যাচাই করব?',
    'জমির ভুয়া দলিল চেনার উপায় কী?',
    'ভূমি উন্নয়ন কর পরিশোধ না করলে কী হয়?',
    'বায়া দলিল না থাকলে কি জমি কেনা যাবে?',
  ];

  const handleSend = async (queryText = inputQuery) => {
    if (!queryText.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsSending(true);

    try {
      const res = await fetch('/api/v1/guide/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText.trim() }),
      });

      if (!res.ok) throw new Error('সহায়কের উত্তর প্রাপ্তিতে ত্রুটি হয়েছে');

      const data = await res.json();
      const needsVerification = data.status === 'needs_verification';

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || (needsVerification
          ? 'তথ্য যাচাই প্রয়োজন: এই বিষয়ে পর্যাপ্ত নির্ভরযোগ্য সরকারি আইন বা পরিপত্র ডাটাবেজে পাওয়া যায়নি। অনুগ্রহ করে সংশ্লিষ্ট সহকারী কমিশনার (ভূমি) অফিসে যোগাযোগ করুন।'
          : 'উত্তর প্রস্তুত করা সম্ভব হয়নি।'),
        needsVerification,
        citations: data.citations || (data.sources
          ? data.sources.map((s: { title?: string; act?: string; url?: string; verified_at?: string }) => ({
              title: s.title || 'ভূমি মন্ত্রণালয় পরিপত্র',
              act_or_rule: s.act || 'রাষ্ট্রীয় অধিগ্রহণ ও প্রজাস্বত্ব আইন ১৯৫০',
              url: s.url || 'https://minland.gov.bd',
              last_verified: s.verified_at || '২০২৬-০২-১৫',
            }))
          : undefined),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'তথ্য যাচাই প্রয়োজন: নেটওয়ার্ক সমস্যার কারণে আইনি ডাটাবেজ যাচাই করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
        needsVerification: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const filteredArticles = LEGAL_ARTICLES.filter((art) => {
    const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
    const matchesSearch =
      !searchKbQuery.trim() ||
      art.titleBn.includes(searchKbQuery) ||
      art.actBn.includes(searchKbQuery) ||
      art.summaryBn.includes(searchKbQuery);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors pb-32">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>ভূমি সহায়ক ও আইনি নির্দেশিকা</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                v3.0
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              বাংলাদেশ ভূমি আইন, নামজারি নীতিমালা ও নিরাপদ জমি ক্রয়ের প্রামাণ্য নলেজ বেস
            </p>
          </div>
        </div>

        {/* View Switcher Tabs on Mobile */}
        <div className="flex lg:hidden rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'assistant'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            এআই সহকারী
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'kb'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            আইন ও নির্দেশিকা ({LEGAL_ARTICLES.length})
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE 5-STEP LAND PURCHASE SAFETY WIZARD */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl mb-6 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              নিরাপদ জমি ক্রয়ের ৫-ধাপের গোল্ডেন রুলস (Buyer Safety Protocol)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            ধাপ {activeWizardStep}/৫
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          জমি কেনার পূর্বে প্রতিটি ধাপ যাচাই করে নেওয়া আইনগতভাবে আবশ্যক। যেকোনো ধাপে অসঙ্গতি থাকলে সংশ্লিষ্ট ভূমি অফিসে যোগাযোগ করুন।
        </p>

        {/* Wizard Step Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {SAFETY_WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            const isCurrent = activeWizardStep === step.step;
            return (
              <button
                key={step.step}
                onClick={() => setActiveWizardStep(step.step)}
                className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-black/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${isCurrent ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    ধাপ 0{step.step}
                  </span>
                  <Icon className="w-4 h-4 opacity-80" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs leading-tight mb-0.5">{step.titleBn}</h4>
                  <p className={`text-[10px] truncate ${isCurrent ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {step.subtitleBn}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Action Callout */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/70 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-extrabold text-sm">
            {activeWizardStep}
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs mb-1">
              করণীয় নির্দেশনা: {SAFETY_WIZARD_STEPS[activeWizardStep - 1].titleBn}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {SAFETY_WIZARD_STEPS[activeWizardStep - 1].actionBn}
            </p>
          </div>
          <button
            onClick={() => {
              const query = `${SAFETY_WIZARD_STEPS[activeWizardStep - 1].titleBn} করার নিয়ম কী?`;
              handleSend(query);
            }}
            className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-all shadow-sm"
          >
            <span>এআই থেকে জানুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2-COLUMN DESKTOP SPLIT: LEGAL KB + AI ASSISTANT CHAT */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Official Legal Articles (KB) */}
        <div className={`lg:col-span-5 flex flex-col gap-4 ${activeTab === 'assistant' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-5 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  আইনি বিধিমালা ও পরিপত্র সংগ্রহ
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-bold">
                {filteredArticles.length} টি নিবন্ধ
              </span>
            </div>

            {/* KB Search Bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchKbQuery}
                onChange={(e) => setSearchKbQuery(e.target.value)}
                placeholder="আইন, পরিপত্র বা ধারা খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-black/70 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
              {[
                { id: 'all', label: 'সব' },
                { id: 'mutation', label: 'নামজারি' },
                { id: 'khatian', label: 'খতিয়ান' },
                { id: 'tax', label: 'দাখিলা' },
                { id: 'deed', label: 'দলিল' },
                { id: 'dispute', label: 'বিরোধ' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                    selectedCategory === c.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Articles List */}
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredArticles.map((art) => {
                const isExpanded = expandedArticleId === art.id;
                return (
                  <div
                    key={art.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs transition-all hover:border-emerald-500/40"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs leading-snug">
                        {art.titleBn}
                      </h4>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        {art.id}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                      {art.summaryBn}
                    </p>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      আইনি ভিত্তি: <strong className="text-slate-700 dark:text-slate-200">{art.actBn}</strong>
                    </div>

                    {/* Expandable Steps */}
                    <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 flex items-center justify-between">
                      <button
                        onClick={() => setExpandedArticleId(isExpanded ? null : art.id)}
                        className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'সংক্ষিপ্ত করুন' : 'বিস্তারিত ধাপসমূহ'}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <a
                        href={art.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-400 hover:text-emerald-500 flex items-center gap-1"
                      >
                        <span>সরকারি পোর্টাল</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                          আইনসঙ্গত কার্যপদ্ধতি:
                        </span>
                        {art.keySteps.map((step, sIdx) => (
                          <div key={sIdx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Land Intelligence Legal Assistant Chat */}
        <div className={`lg:col-span-7 flex flex-col ${activeTab === 'kb' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl flex flex-col h-[700px] transition-all">
            {/* Assistant Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>এআই ভূমি আইনি পরামর্শক</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    রিয়েল-টাইম সার্কুলার ও আইন দ্বারা সমর্থিত
                  </span>
                </div>
              </div>

              <DisclaimerBanner type="badge" />
            </div>

            {/* Quick Inquiry Suggested Prompt Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shrink-0 active:scale-95 transition-all font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {/* Epistemic Needs Verification State */}
                    {m.needsVerification && (
                      <div className="mb-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-600/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">তথ্য যাচাই প্রয়োজন</strong>
                          <p className="text-[11px] leading-relaxed mt-0.5 opacity-90">
                            প্রদত্ত উত্তরের পূর্ণ আইনি প্রামাণ্যতা নিশ্চিত করতে এসিল্যান্ড অফিস বা রেজিস্ট্রি কার্যালয়ে যোগাযোগ করুন।
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Grounded Citation Links */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                          আইনি সূত্র ও সরকারি পরিপত্র:
                        </span>
                        {m.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <strong className="text-slate-900 dark:text-white font-bold block">{c.title}</strong>
                              <span className="text-slate-500 text-[10px]">{c.act_or_rule}</span>
                            </div>
                            {c.url && (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[10px] font-bold shrink-0 ml-2"
                              >
                                <span>দেখুন</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-right opacity-60">
                      {m.timestamp}
                    </div>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-500">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>আইনি পরিপত্র ও বালাম ডাটাবেজ যাচাই করা হচ্ছে...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="জমি, খতিয়ান বা নামজারি সংক্রান্ত প্রশ্ন লিখুন..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-black/70 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isSending}
                  className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-40 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
