import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuthStore, ROLE_DEFAULT_TABS, type UserRole } from '../lib/authStore';

interface Forbidden403Props {
  onReturnToAllowed: (tab: string) => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({ onReturnToAllowed }) => {
  const { user } = useAuthStore();
  const currentRole: UserRole = user?.role || 'Citizen';
  const defaultTab = ROLE_DEFAULT_TABS[currentRole] || 'home';

  return (
    <div className="flex flex-col items-center justify-center min-h-[65dvh] max-w-md mx-auto p-6 text-center text-slate-100 animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-xl shadow-rose-950/40">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold text-white mb-2">
        অনুমোদন নেই (403 Forbidden)
      </h1>

      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        আপনার বর্তমান রোল <strong className="text-emerald-400 font-semibold">{currentRole}</strong> এই পৃষ্ঠা বা কর্মকাণ্ড দেখার জন্য অনুমোদিত নয়। নিরাপত্তা ও বিধিবিধান অনুযায়ী এই অংশে শুধুমাত্র নির্ধারিত ভূমিকাভিত্তিক ব্যবহারকারী প্রবেশ করতে পারেন।
      </p>

      <div className="p-3 w-full rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 mb-6 text-left">
        <div className="flex justify-between py-1 border-b border-slate-800">
          <span>আপনার অ্যাকাউন্ট:</span>
          <span className="font-mono text-slate-200">{user?.email || 'অতিথি (Unauthenticated)'}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>নির্ধারিত পোর্টাল:</span>
          <span className="text-emerald-400 font-medium capitalize">{defaultTab}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={() => onReturnToAllowed(defaultTab)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
        >
          <Home className="w-4 h-4" />
          <span>আপনার হোমপেজে যান</span>
        </button>

        <button
          onClick={() => onReturnToAllowed('home')}
          className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ফিরে যান</span>
        </button>
      </div>
    </div>
  );
};
