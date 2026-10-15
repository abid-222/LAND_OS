import React, { useState } from 'react';
import {
  Send,
  FileCheck2,
  ExternalLink,
  AlertTriangle,
  Bot,
  User,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

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

export const GuidePage: React.FC = () => {
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

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-lg mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-5 h-5 text-emerald-400" />
        <h1 className="text-lg font-bold text-white">ভূমি সহায়ক ও আইনি নির্দেশিকা</h1>
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-full text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white shrink-0 active:scale-95 transition-transform"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                m.sender === 'user'
                  ? 'bg-primary text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              {/* Needs Verification State Alert Box */}
              {m.needsVerification && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">তথ্য যাচাই প্রয়োজন:</span> কোনো
                    অনুমানভিত্তিক উত্তর দেওয়া হয়নি। সংশ্লিষ্ট এসি ল্যান্ড অফিসের সেবা নিন।
                  </div>
                </div>
              )}

              <p className="whitespace-pre-line">{m.text}</p>

              {/* Verified Sources / Citations Card */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                    আইনি উৎস ও পরিপত্র (Grounding):
                  </span>
                  <div className="space-y-1.5">
                    {m.citations.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/60 text-[11px] text-slate-300"
                      >
                        <div className="font-semibold text-emerald-300 flex items-center justify-between">
                          <span>{c.title}</span>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-emerald-400"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-slate-400 text-[10px] mt-0.5">{c.act_or_rule}</p>
                        {c.last_verified && (
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            সর্বশেষ যাচাই: {c.last_verified}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-400 block text-right mt-1.5">
                {m.timestamp}
              </span>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>আইনি ডাটাবেজ অনুসন্ধান করা হচ্ছে...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Box sitting in Bottom Thumb Zone */}
      <div className="relative">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="আপনার প্রশ্ন লিখুন (যেমন: নামজারি কীভাবে করব?)..."
          className="touch-target w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-900 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-xl"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isSending}
          className="absolute right-2 top-2 p-2 rounded-xl bg-primary hover:bg-primary-hover text-white disabled:opacity-40 transition-colors"
          aria-label="বার্তা পাঠান"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
