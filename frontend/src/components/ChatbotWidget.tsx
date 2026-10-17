import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ExternalLink,
  Shield,
  FileSearch,
  CheckCircle2,
} from 'lucide-react';
import { parseVoiceCommand, type VoiceCommandIntent } from '../lib/normalize';
import { apiFetch } from '../api/client';

interface ActionCard {
  type: 'buyer_report' | 'namjari_track' | 'parcel_watch' | 'search_record';
  title: string;
  subtitle: string;
  targetTab: string;
  params?: Record<string, string>;
  btnLabel: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  source?: string;
  lastVerified?: string;
  disclaimer?: string;
  actionCard?: ActionCard;
  timestamp: string;
}

interface ChatbotWidgetProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface IWindowSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface WindowWithSpeech {
  SpeechRecognition?: new () => IWindowSpeechRecognition;
  webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ onNavigate }) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: isBn
        ? 'আসসালামু আলাইকুম! আমি বাংলাদেশ ল্যান্ডওএস গার্ডিয়ান ও স্মার্ট ভূমি সহকারী। আপনি বাংলায় কথা বলতে পারেন বা টাইপ করতে পারেন — যেমন "জমি কেনার আগে P-4520 যাচাই", "নামজারি NJ-2026-1001 ট্র্যাক" অথবা যেকোনো সরকারি পরিপত্রের প্রশ্ন।'
        : 'Welcome! I am Bangladesh LandOS Parcel Guardian & AI Guide. You can speak or type in Bengali or English — try "Check parcel P-4520 before buying", "Track namjari NJ-2026-1001" or ask official circular questions.',
      source: 'ভূমি মন্ত্রণালয় ও ভূমি সংস্কার বোর্ড পরিপত্র',
      disclaimer: isBn
        ? 'এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি বিধিমালা অনুযায়ী যাচাই করুন।'
        : 'This is not legal advice or ownership determination. Verify with AC Land Office.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = isBn ? 'bn-BD' : 'en-US';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition error on start:', err);
        setIsListening(false);
      }
    }
  };

  // Text to Speech playback
  const handleSpeakText = (messageId: string, textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip disclaimers from voice playback for cleaner voice experience
    const cleanText = textToSpeak.replace(/\[সিমুলেটেড.*?\]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isBn ? 'bn-BD' : 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find((v) => v.lang.startsWith('bn'));
    if (bnVoice) {
      utterance.voice = bnVoice;
    }

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const promptSuggestions = [
    { bn: 'জমি কেনার আগে P-4520 যাচাই', en: 'Pre-purchase check on P-4520' },
    { bn: 'নামজারি NJ-2026-1001 ট্র্যাক', en: 'Track namjari NJ-2026-1001' },
    { bn: 'P-CLEAN-01 গার্ডিয়ান ওয়াচ', en: 'Watch parcel P-CLEAN-01' },
    { bn: 'নামজারি আবেদনের সরকারি ফি কত?', en: 'Official fees for mutation?' },
  ];

  const handleSend = useCallback(async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 1. Check Voice Command Intent (P6 Parcel Guardian features)
    const cmd: VoiceCommandIntent = parseVoiceCommand(q);

    if (cmd.intent === 'buyer_report') {
      const pid = cmd.parcelId || 'P-4520';
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: isBn
          ? `পার্সেল ${pid}-এর ক্রেতার পূর্ব-যাচাই ও ঝুঁকি প্রতিবেদন প্রস্তুত রয়েছে। খাস/অধিগ্রহণ অবস্থা, আদালতের মামলা ও মালিকানার ধারাবাহিকতা পর্যালোচনা করতে নিচে ক্লিক করুন।`
          : `Pre-purchase verification report ready for parcel ${pid}. Review khas land, acquisition, legal litigation, and ownership history below.`,
        source: 'বাংলাদেশ ল্যান্ডওএস ক্রেতা সুরক্ষা যাচাই ইঞ্জিন',
        disclaimer: isBn
          ? 'এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি পরিপত্র অনুযায়ী এসিল্যান্ড অফিস থেকে যাচাই করুন।'
          : 'This is not legal advice or ownership determination. Verify with the AC Land Office.',
        actionCard: {
          type: 'buyer_report',
          title: isBn ? `ক্রেতার পূর্ব-যাচাই প্রতিবেদন (${pid})` : `Buyer Pre-Purchase Report (${pid})`,
          subtitle: isBn ? 'খাস, অধিগ্রহণ, মামলা ও ৬-স্তরের ঝুঁকি বিশ্লেষণ' : 'Khas, acquisition, litigation & 6-level risk checks',
          targetTab: 'buyer-report',
          params: { parcelId: pid },
          btnLabel: isBn ? 'প্রতিবেদন দেখুন' : 'View Report',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
      return;
    }

    if (cmd.intent === 'namjari_track') {
      const trackCode = cmd.trackingCode || 'NJ-2026-1001';
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: isBn
          ? `ই-নামজারি ট্র্যাকিং নম্বর ${trackCode}-এর স্ট্যাটাস অনুসন্ধান প্রস্তুত। সহকারী কমিশনার (ভূমি) কার্যালয়ের স্বয়ংক্রিয় যাচাই ও শুনানি অগ্রগতি দেখতে নিচের বোতাম চাপুন।`
          : `E-Namjari tracking ready for ${trackCode}. View automated pre-verification milestones and hearing notices below.`,
        source: 'ই-নামজারি স্বয়ংক্রিয় ট্র্যাকিং সিস্টেম',
        disclaimer: isBn
          ? 'এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি পরিপত্র অনুযায়ী যাচাই করুন।'
          : 'This is not legal advice. Verify with the AC Land Office.',
        actionCard: {
          type: 'namjari_track',
          title: isBn ? `নামজারি ট্র্যাকিং: ${trackCode}` : `Namjari Tracking: ${trackCode}`,
          subtitle: isBn ? 'দলিল যাচাই, মাঠ তদন্ত ও খতিয়ান হালনাগাদ পর্যায়' : 'Deed verification, field inquiry & khatian update',
          targetTab: 'namjari',
          params: { trackCode },
          btnLabel: isBn ? 'অগ্রগতি ট্র্যাক করুন' : 'Track Status',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
      return;
    }

    if (cmd.intent === 'parcel_watch') {
      const pid = cmd.parcelId || 'P-4520';
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: isBn
          ? `গার্ডিয়ান ওয়াচ (Parcel Guardian Watch): পার্সেল ${pid}-এর জন্য রিয়েল-টাইম পর্যবেক্ষণ সক্রিয় করা সম্ভব। কোনো নতুন নামজারি আবেদন, দলিল হস্তান্তর বা বিরোধ দেখা দিলে তাৎক্ষণিক সতর্কবার্তা তৈরি হবে।`
          : `Parcel Guardian Watch: Enable 24/7 parcel monitoring for ${pid}. Receive instant simulated SMS alerts if new mutations, deeds, or conflict notices appear.`,
        source: 'গার্ডিয়ান ওয়াচ প্রোটেকশন ইঞ্জিন',
        disclaimer: isBn
          ? 'সিমুলেটেড অ্যালার্ট সার্ভিস। এটি আদালত বা এসিল্যান্ডের আনুষ্ঠানিক নোটিশের বিকল্প নয়।'
          : 'Simulated alert service. Not a substitute for official court or AC Land notices.',
        actionCard: {
          type: 'parcel_watch',
          title: isBn ? `পার্সেল গার্ডিয়ান ওয়াচ (${pid})` : `Parcel Guardian Watch (${pid})`,
          subtitle: isBn ? 'নতুন বিরোধ ও দলিলের জন্য সিমুলেটেড এসএমএস সতর্কতা' : 'Simulated SMS alerts for new disputes & deeds',
          targetTab: 'alerts',
          params: { parcelId: pid },
          btnLabel: isBn ? 'অ্যালার্ট ও ওয়াচ দেখুন' : 'View Watch & Alerts',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
      return;
    }

    if (cmd.intent === 'search_record' && (cmd.dagNo || cmd.khatianNo)) {
      const dag = cmd.dagNo || '';
      const khatian = cmd.khatianNo || '';
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: isBn
          ? `দাগ নং ${dag || '–'} এবং খতিয়ান নং ${khatian || '–'} সংক্রান্ত ভূমি রেকর্ড অনুসন্ধান প্রস্তুত।`
          : `Search ready for Dag No: ${dag || '–'} and Khatian No: ${khatian || '–'}.`,
        source: 'ডিজিটাল ভূমি রেকর্ড ডেটাবেস',
        disclaimer: isBn
          ? 'এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি খতিয়ান অনুযায়ী যাচাই করুন।'
          : 'This is not legal advice. Verify official records.',
        actionCard: {
          type: 'search_record',
          title: isBn ? `রেকর্ড অনুসন্ধান: দাগ ${dag || '–'}, খতিয়ান ${khatian || '–'}` : `Record Search: Dag ${dag || '–'}, Khatian ${khatian || '–'}`,
          subtitle: isBn ? 'খতিয়ান মালিকানা, জরিপ ও জমির শ্রেণীবিভাগ' : 'Ownership, survey & land classification',
          targetTab: 'search',
          params: { dag_no: dag, khatian_no: khatian },
          btnLabel: isBn ? 'রেকর্ড দেখুন' : 'View Record',
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
      return;
    }

    // 2. Query grounded AI Land Guide API
    try {
      const data = await apiFetch<{
        answer_bn?: string;
        answer_en?: string;
        source?: string;
        last_verified_at?: string;
        disclaimer_bn?: string;
        disclaimer_en?: string;
      }>('/api/v1/guide/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q }),
      });

      const botText =
        (isBn ? data.answer_bn : data.answer_en || data.answer_bn) ||
        (isBn
          ? 'তথ্য যাচাই প্রয়োজন: সরকারি বিধিমালা অনুযায়ী উপজেলা সহকারী কমিশনার (ভূমি) কার্যালয়ে যোগাযোগ করুন।'
          : 'Verification required: Please consult the Upazila AC Land Office.');

      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: botText,
        source: data.source,
        lastVerified: data.last_verified_at,
        disclaimer: isBn ? data.disclaimer_bn : data.disclaimer_en,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: isBn
          ? 'দুঃখিত, সংযোগে বিলম্ব হচ্ছে। তবে সরকারি নির্দেশনানুযায়ী নামজারি ও খতিয়ান সংক্রান্ত যেকোনো সেবার জন্য আপনার সংশ্লিষ্ট উপজেলা সহকারী কমিশনার (ভূমি) কার্যালয় অথবা land.gov.bd পোর্টালে যোগাযোগ করুন।'
          : 'Unable to retrieve answer right now. For official mutation and khatian inquiries, please consult your Upazila AC Land Office or visit land.gov.bd.',
        source: 'ভূমি মন্ত্রণালয় নির্দেশিকা',
        disclaimer: isBn
          ? 'এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি পরিপত্র অনুযায়ী যাচাই করুন।'
          : 'This is not legal advice. Verify with the AC Land Office.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isBn]);

  // Initialize Speech Recognition once handleSend is declared
  useEffect(() => {
    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      setSpeechSupported(true);
      const recognition: IWindowSpeechRecognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = isBn ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setInput(transcript);
          // Auto submit spoken voice query
          void handleSend(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [isBn, handleSend]);

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: isBn
          ? 'নতুন কথোপকথন শুরু হয়েছে। ভয়েস বা লিখে আপনার প্রশ্ন করুন।'
          : 'New conversation started. Ask via voice or text.',
        source: 'ভূমি মন্ত্রণালয় সার্কুলার',
        disclaimer: isBn
          ? 'এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়।'
          : 'This is not legal advice.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCardClick = (card: ActionCard) => {
    if (onNavigate) {
      onNavigate(card.targetTab, card.params);
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 select-none">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-950/60 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all duration-300"
          aria-label="Open AI Land Guide & Voice Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wide pr-1">
            {isBn ? 'গার্ডিয়ান এআই সহকারী' : 'Parcel Guardian AI'}
          </span>
        </button>
      )}

      {/* Expanded Floating Chatbot Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-96 md:w-[440px] h-[550px] max-h-[85vh] bg-white dark:bg-[#0c1219] rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <span>{isBn ? 'পার্সেল গার্ডিয়ান ভয়েস সহকারী' : 'Parcel Guardian AI'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    Voice-First
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  {isBn ? '১২টি সার্কুলার ও রিয়েল-টাইম সুরক্ষা' : 'Backed by 12 Circulars & Live Engine'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-[#070b0e]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                  {/* Interactive Action Card */}
                  {msg.actionCard && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-emerald-500/30 text-slate-800 dark:text-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          {msg.actionCard.type === 'buyer_report' && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                          {msg.actionCard.type === 'namjari_track' && <FileSearch className="w-3.5 h-3.5 text-blue-500" />}
                          {msg.actionCard.type === 'parcel_watch' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />}
                          {msg.actionCard.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {msg.actionCard.subtitle}
                      </p>
                      <button
                        onClick={() => handleCardClick(msg.actionCard!)}
                        className="w-full mt-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>{msg.actionCard.btnLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Grounded Citation & Disclaimer */}
                  {msg.source && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate flex items-center gap-1 font-medium">
                          <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                          {msg.source}
                        </span>
                        {/* Audio Read-Aloud Button */}
                        <button
                          onClick={() => handleSpeakText(msg.id, msg.text)}
                          className="p-1 rounded text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                          title={speakingMessageId === msg.id ? 'Stop audio' : 'Read aloud in Bengali'}
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {msg.disclaimer && (
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 italic">
                          {msg.disclaimer}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Listening Live Status Banner */}
          {isListening && (
            <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/30 text-rose-500 flex items-center justify-between text-xs font-medium animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>{isBn ? 'বাংলায় কথা বলুন... শুনছি...' : 'Listening in Bengali / English...'}</span>
              </div>
              <button
                onClick={toggleListening}
                className="text-[10px] underline hover:text-rose-600 font-bold"
              >
                {isBn ? 'বাতিল' : 'Stop'}
              </button>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            {promptSuggestions.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(isBn ? p.bn : p.en)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              >
                {isBn ? p.bn : p.en}
              </button>
            ))}
          </div>

          {/* Input Form with Microphone Toggle */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-[#0c1219] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            {/* Microphone Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-all shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-950/40'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
                title={isListening ? 'Stop recording' : 'Speak in Bengali'}
                aria-label="Voice input"
              >
                {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-emerald-500" />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isBn ? 'বাংলায় বলুন বা লিখুন ("P-4520 যাচাই")...' : 'Speak or type ("Check P-4520")...'}
              className="flex-1 py-2 px-3.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all shrink-0"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
