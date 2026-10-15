import React, { useState } from 'react';
import {
  ScanLine,
  Search,
  FolderOpen,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { TrustStatus } from '../types/trust';
import { useNetworkStore } from '../lib/networkMonitor';

interface HomePageProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const { isLowNetworkMode } = useNetworkStore();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onNavigate) {
      onNavigate('search', { query: searchQuery.trim() });
    }
  };

  const trustStatuses: TrustStatus[] = [
    'OCR_EXTRACTED',
    'POSSIBLE_MATCH',
    'USER_CORRECTED',
    'VERIFIED_AUTHORIZED_SOURCE',
    'VERIFICATION_REQUIRED',
  ];

  return (
    <div className="flex flex-col gap-5 pb-28 max-w-lg mx-auto w-full px-4 pt-4 text-slate-100">
      {/* Disclaimer Banners */}
      <DisclaimerBanner type="synthetic" />
      <DisclaimerBanner type="map" />

      {/* Low-Network Alert Pill if active */}
      {isLowNetworkMode && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>দুর্বল নেটওয়ার্ক মোড সক্রিয় (অফলাইন এনক্রিপ্ট ব্যাকআপ)</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('pending')}
              className="text-amber-300 font-semibold underline text-[11px]"
            >
              সংরক্ষিত নথি দেখুন
            </button>
          )}
        </div>
      )}

      {/* Bangla Search Box */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="দলিল নম্বর, খতিয়ান বা দাগ নম্বর দিয়ে সরাসরি অনুসন্ধান..."
          className="touch-target w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-900 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-xl"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 p-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors"
          aria-label="অনুসন্ধান করুন"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* 4 Large Actions (Citizen Portal) */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Action 1: Scan Document (দলিল স্ক্যান) */}
        <button
          onClick={() => onNavigate && onNavigate('scan')}
          className="touch-target p-4 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-left shadow-xl active:scale-98 transition-all flex flex-col justify-between min-h-[140px] group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">দলিল স্ক্যান</h3>
            <p className="text-xs text-slate-300 mt-1">ক্যামেরা দিয়ে সরাসরি খতিয়ান বা দলিল যাচাই</p>
          </div>
        </button>

        {/* Action 2: Search Records (খতিয়ান ও রেকর্ড অনুসন্ধান) */}
        <button
          onClick={() => onNavigate && onNavigate('search')}
          className="touch-target p-4 rounded-2xl bg-gradient-to-br from-sky-950/70 to-slate-900 border border-sky-500/40 hover:border-sky-400 text-left shadow-xl active:scale-98 transition-all flex flex-col justify-between min-h-[140px] group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">রেকর্ড অনুসন্ধান</h3>
            <p className="text-xs text-slate-300 mt-1">দাগ ও খতিয়ান মিলিয়ে বালাম বইয়ের সাথে মেলানো</p>
          </div>
        </button>

        {/* Action 3: Land Services (ভূমি সেবা) */}
        <button
          onClick={() => setSelectedService(selectedService ? null : 'services')}
          className="touch-target p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left shadow-xl active:scale-98 transition-all flex flex-col justify-between min-h-[140px] group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">ভূমি সেবা</h3>
            <p className="text-xs text-slate-300 mt-1">ই-নামজারি, কর পরিশোধ ও পর্চা আবেদন</p>
          </div>
        </button>

        {/* Action 4: My Requests / Saved Docs (আমার আবেদন ও সংরক্ষিত নথি) */}
        <button
          onClick={() => onNavigate && onNavigate('pending')}
          className="touch-target p-4 rounded-2xl bg-gradient-to-br from-amber-950/70 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-left shadow-xl active:scale-98 transition-all flex flex-col justify-between min-h-[140px] group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">আমার আবেদন</h3>
            <p className="text-xs text-slate-300 mt-1">অফলাইন ও অনলাইনে সংরক্ষিত নথিসমূহ</p>
          </div>
        </button>
      </div>

      {/* Expanded Land Services Drawer if selected */}
      {selectedService === 'services' && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-xl animate-in fade-in space-y-2.5">
          <h4 className="text-sm font-bold text-white mb-2">ভূমি সেবা ও অনুসন্ধান টুলস</h4>
          {onNavigate && (
            <button
              onClick={() => onNavigate('report')}
              className="touch-target w-full p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-white hover:border-emerald-500/50"
            >
              <span className="font-semibold text-emerald-300">ক্রেতা ঝুঁকি অনুসন্ধান প্রতিবেদন (Buyer Risk Report)</span>
              <ExternalLink className="w-4 h-4 text-emerald-400" />
            </button>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('map')}
              className="touch-target w-full p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-white hover:border-emerald-500/50"
            >
              <span>ডিজিটাল ক্যাডাস্ট্রাল মানচিত্র (Cadastral Map)</span>
              <ExternalLink className="w-4 h-4 text-emerald-400" />
            </button>
          )}
          <a
            href="https://mutation.land.gov.bd"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-200 hover:text-white"
          >
            <span>ই-নামজারি (e-Mutation) অনলাইন আবেদন</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://ldtax.gov.bd"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-200 hover:text-white"
          >
            <span>ভূমি উন্নয়ন কর (LD Tax) পরিশোধ</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
          <a
            href="https://eporcha.gov.bd"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-200 hover:text-white"
          >
            <span>ডিজিটাল পর্চা বা খতিয়ানের সার্টিফাইড কপি</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        </div>
      )}

      {/* Epistemic Trust States Legend */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>নথির বিশ্বাসযোগ্যতা পর্যায় (Epistemic Trust States)</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {trustStatuses.map((st) => (
            <TrustBadge key={st} status={st} />
          ))}
        </div>
      </div>
    </div>
  );
};
