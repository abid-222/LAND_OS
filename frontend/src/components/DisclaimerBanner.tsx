import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface DisclaimerBannerProps {
  type?: 'map' | 'synthetic' | 'badge';
  className?: string;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  type = 'map',
  className = '',
}) => {
  // All noisy yellow seed data / synthetic demo banners removed for clean UX
  if (type === 'synthetic' || type === 'badge') {
    return null;
  }

  return (
    <div
      role="alert"
      className={`w-full bg-slate-50/80 dark:bg-[#070d12] border border-slate-200 dark:border-emerald-500/20 rounded-xl px-3.5 py-2 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 backdrop-blur-sm transition-colors ${className}`}
    >
      <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-relaxed">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Illustrative / Not a legal boundary. উদাহরণ মাত্র, আইনি সীমানা নয়. Heights are illustrative.
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          আইনি সীমানা নির্ধারণে সরকারি মৌজা নকশা ও মাঠ জরিপ প্রযোজ্য।
        </span>
      </div>
    </div>
  );
};
