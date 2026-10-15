import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';

interface DisclaimerBannerProps {
  type?: 'map' | 'synthetic' | 'badge';
  className?: string;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  type = 'map',
  className = '',
}) => {
  if (type === 'badge') {
    return (
      <span
        title="প্রোটোটাইপ প্রদর্শনীর সকল তথ্য কাল্পনিক সিনথেটিক ডেটা"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 ${className}`}
      >
        <Database className="w-3 h-3 text-amber-400" />
        <span>ডেমো ডেটা (Synthetic Demo Data)</span>
      </span>
    );
  }

  return (
    <div
      role="alert"
      className={`w-full bg-amber-500/10 border-y sm:border sm:rounded-xl border-amber-500/30 px-3.5 py-2.5 flex items-center gap-3 backdrop-blur-sm ${className}`}
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      <div className="flex flex-col text-xs leading-relaxed text-amber-200">
        <span className="font-semibold text-amber-300">
          {type === 'map'
            ? 'Illustrative / Not a legal boundary. উদাহরণ মাত্র, আইনি সীমানা নয়. Heights are illustrative.'
            : 'প্রোটোটাইপ প্রদর্শনীর সকল খতিয়ান ও নাগরিক তথ্য কাল্পনিক (Synthetic Demo Data)।'}
        </span>
        <span className="text-amber-400/80 text-[11px]">
          {type === 'map'
            ? 'উচ্চতা ও ত্রিমাত্রিক নকশা শুধুমাত্র দৃশ্যমানতার জন্য। আইনি সীমানা নির্ধারণে সরকারি মৌজা নকশা ও জরিপ প্রযোজ্য।'
            : 'For demonstration and testing only. Does not reflect live government registries.'}
        </span>
      </div>
    </div>
  );
};
