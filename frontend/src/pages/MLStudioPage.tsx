import React from 'react';
import { useTranslation } from 'react-i18next';
import { MLPlayground } from '../components/MLPlayground';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface MLStudioPageProps {
  onNavigateToTab?: (tab: string) => void;
}

export const MLStudioPage: React.FC<MLStudioPageProps> = ({ onNavigateToTab }) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('home')}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              <span>{isBn ? 'মেশিন লার্নিং স্টুডিও ও প্লেগ্রাউন্ড' : 'Machine Learning Studio & Playground'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isBn
                ? 'কাস্টম নথির তথ্য ইনপুট করে রিয়েল-টাইম এমএল মডেল চালানো এবং ফলাফল যাচাই করার ইন্টারঅ্যাক্টিভ ল্যাব'
                : 'Interactive sandbox to apply custom document text, parameters, and run real-time ML inference'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Playground Component */}
      <MLPlayground />
    </div>
  );
};
