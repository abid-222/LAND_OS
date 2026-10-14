import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DisclaimerBannerProps {
  type?: 'map' | 'synthetic';
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ type = 'map' }) => {
  return (
    <div
      role="alert"
      className="w-full bg-amber-500/10 border-y sm:border sm:rounded-xl border-amber-500/30 px-3.5 py-2.5 flex items-center gap-3 backdrop-blur-sm"
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      <div className="flex flex-col text-xs leading-relaxed text-amber-200">
        <span className="font-semibold text-amber-300">
          {type === 'map'
            ? 'প্রদর্শিত নকশা ও সীমানা শুধুমাত্র উদাহরণের জন্য / এটি কোনো আইনি সীমানা নয়।'
            : 'প্রোটোটাইপ প্রদর্শনীর সকল খতিয়ান ও নাগরিক তথ্য কাল্পনিক (Synthetic Demo Data)।'}
        </span>
        <span className="text-amber-400/80 text-[11px]">
          {type === 'map'
            ? 'Illustrative / Not a legal boundary. Land demarcations require official cadastral ground survey.'
            : 'For demonstration and testing only. Does not reflect live government registries.'}
        </span>
      </div>
    </div>
  );
};
