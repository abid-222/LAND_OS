import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  source?: string;
  lastVerified?: string;
  disclaimer?: string;
  timestamp: string;
}

export const ChatbotWidget: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: isBn
        ? 'আসসালামু আলাইকুম! আমি বাংলাদেশ ল্যান্ডওএস স্মার্ট ভূমি নির্দেশিকা সহকারী। ভূমি রেকর্ড, ই-নামজারি বা সরকারি পরিপত্র বিষয়ে যেকোনো প্রশ্ন করতে পারেন।'
        : 'Welcome! I am the LandOS Intelligent Assistant. Feel free to ask any question regarding land records, e-mutation, or official ministry guidelines.',
      source: 'ভূমি মন্ত্রণালয় অফিসিয়াল সার্কুলার নির্দেশিকা',
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

  const promptSuggestions = [
    { bn: 'কীভাবে ই-নামজারি আবেদন করব?', en: 'How to apply for e-mutation?' },
    { bn: 'খতিয়ান ও দাগ নম্বরের পার্থক্য কি?', en: 'Difference between Khatian & Dag?' },
    { bn: 'নামজারি আবেদনের সরকারি ফি কত?', en: 'Official fees for land mutation?' },
    { bn: 'অনলাইনে পর্চা যাচাইয়ের নিয়ম কি?', en: 'How to verify porcha records online?' },
  ];

  const handleSend = async (questionText?: string) => {
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

    try {
      const res = await fetch('/api/v1/guide/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        throw new Error(`Guide API error: ${res.status}`);
      }

      const data = await res.json();
      const botText = isBn ? data.answer_bn : data.answer_en || data.answer_bn;

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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: isBn
          ? 'নতুন কথোপকথন শুরু হয়েছে। আপনার ভূমি সংক্রান্ত প্রশ্ন লিখুন।'
          : 'New conversation started. Ask any land administration question.',
        source: 'ভূমি মন্ত্রণালয় অফিসিয়াল সার্কুলার',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 select-none">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-950/60 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all duration-300"
          aria-label="Open AI Land Guide"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wide pr-1">
            {isBn ? 'ভূমি এআই নির্দেশিকা' : 'AI Land Guide'}
          </span>
        </button>
      )}

      {/* Expanded Floating Chatbot Panel */}
      {isOpen && (
        <div className="w-[92vw] sm:w-96 md:w-[420px] h-[520px] max-h-[85vh] bg-white dark:bg-[#0c1219] rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <span>{isBn ? 'স্মার্ট ভূমি সহায়িকা' : 'LandOS AI Guide'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    Grounded
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  {isBn ? '১২টি সরকারি সার্কুলারে নির্দেশিত' : 'Backed by 12 Official Circulars'}
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
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-[#070b0e]">
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
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                  {/* Grounded Citation Footer */}
                  {msg.source && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                      <span className="truncate flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                        {msg.source}
                      </span>
                      <span className="text-[9px] shrink-0">{msg.timestamp}</span>
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

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white dark:bg-[#0c1219] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isBn ? 'ভূমি বা নামজারি সংক্রান্ত প্রশ্ন লিখুন...' : 'Ask a land administration question...'}
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
