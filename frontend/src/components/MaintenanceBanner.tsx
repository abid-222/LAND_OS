import React from 'react';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

interface MaintenanceBannerProps {
  isHealthy: boolean;
  isOnline: boolean;
  onRetry?: () => void;
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({
  isHealthy,
  isOnline,
  onRetry,
}) => {
  // Only show banner if disconnected or API health fails
  if (isHealthy && isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-12 z-30 w-full bg-amber-500/15 border-b border-amber-500/40 px-3.5 py-2 flex items-center justify-between text-xs backdrop-blur-md animate-in slide-in-from-top text-amber-200"
    >
      <div className="flex items-center gap-2.5">
        {!isOnline ? (
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <div>
          <span className="font-bold text-amber-300">
            {!isOnline ? 'ইন্টারনেট বিচ্ছিন্ন (Offline)' : 'সার্ভার রক্ষণাবেক্ষণ / সংযোগ বিচ্ছিন্ন'}
          </span>
          <span className="hidden sm:inline text-amber-300/80 ml-1.5 text-[11px]">
            — অফলাইন এনক্রিপ্টেড মোডে সংরক্ষিত কাজ চালিয়ে যেতে পারেন। সংযোগ ফিরে এলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।
          </span>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] border border-amber-500/40 flex items-center gap-1 transition-colors shrink-0 ml-2"
        >
          <RefreshCw className="w-3 h-3" />
          <span>পুনরায় চেষ্টা</span>
        </button>
      )}
    </div>
  );
};
