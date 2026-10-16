import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScanLine,
  Search,
  Map as MapIcon,
  FileCheck2,
  ShieldCheck,
  Building2,
  ArrowRight,
  Compass,
  Flame,
  HelpCircle,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { TrustStatus } from '../types/trust';
import { useNetworkStore } from '../lib/networkMonitor';
import { AiPipelineVisualizer } from '../components/AiPipelineVisualizer';
import { type UserRole } from '../lib/authStore';
import { CadastralScene, defaultDemoParcels } from '../components/landtech/CadastralScene';
import { LandTechShowcase } from '../components/landtech/LandTechShowcase';

interface HomePageProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
  onStartTour?: () => void;
  currentRole?: UserRole;
  onOpenLogin?: () => void;
  isDarkMode?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onStartTour,
  currentRole = 'Citizen',
  onOpenLogin,
  isDarkMode = true,
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');
  const { isLowNetworkMode } = useNetworkStore();

  const [selectedParcelId, setSelectedParcelId] = React.useState<string>('P-4520');
  const [isScanning, setIsScanning] = React.useState<boolean>(true);

  const isRbacUser = currentRole !== 'Citizen';

  const trustStatuses: TrustStatus[] = [
    'OCR_EXTRACTED',
    'POSSIBLE_MATCH',
    'USER_CORRECTED',
    'VERIFIED_AUTHORIZED_SOURCE',
    'VERIFICATION_REQUIRED',
  ];

  const quickParcels = [
    {
      id: 'P-4520',
      mouza: isBn ? 'তেজগাঁও সার্কেল' : 'Tejgaon Circle',
      dag: '১২০৫',
      type: isBn ? 'বাণিজ্যিক / নাল' : 'Commercial / Nal',
      status: isBn ? 'সক্রিয় বিরোধ' : 'Active Conflict',
    },
    {
      id: 'P-SMOKE-CONFLICT',
      mouza: isBn ? 'তেজগাঁও সার্কেল' : 'Tejgaon Circle',
      dag: '১২৩৪',
      type: isBn ? 'নাল জমি' : 'Nal Farmland',
      status: isBn ? 'দ্বৈত দলিল সতর্কতা' : 'Duplicate Deed Alert',
    },
    {
      id: 'LR-1205',
      mouza: isBn ? 'গুলশান সার্কেল' : 'Gulshan Circle',
      dag: '৩৪০',
      type: isBn ? 'আবাসিক ভিটি' : 'Residential Viti',
      status: isBn ? 'যাচাইকৃত রেকর্ড' : 'Clean Title Verified',
    },
  ];

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Legal Disclaimer */}
      <DisclaimerBanner type="map" />

      {/* Low-Network Alert Pill if active */}
      {isLowNetworkMode && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              {isBn
                ? 'দুর্বল নেটওয়ার্ক মোড সক্রিয় (অফলাইন এনক্রিপ্ট ব্যাকআপ ও কিউ সচল)'
                : 'Low Network Mode Active (Offline Encrypted Queue Engaged)'}
            </span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('pending')}
              className="text-amber-600 dark:text-amber-400 font-bold underline text-[11px]"
            >
              {isBn ? 'সংরক্ষিত নথি দেখুন' : 'View Offline Queue'}
            </button>
          )}
        </div>
      )}

      {/* Hero Banner with Official Bangladesh LandOS Holographic Branding */}
      <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 dark:from-black dark:via-[#05080c] dark:to-[#04080b] border border-emerald-500/30 p-6 sm:p-8 lg:p-10 shadow-xl text-slate-900 dark:text-white overflow-hidden group transition-all">
        {/* Subtle Cyber Radar Backdrop Effect */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>
                {isBn
                  ? 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত ডিজিটাল ভূমি প্ল্যাটফর্ম'
                  : 'Sovereign Digital Land Intelligence Platform'}
              </span>
            </div>

            {/* Title & Tagline */}
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-3">
                <span>{isBn ? 'বাংলাদেশ ল্যান্ডওএস' : 'Bangladesh LandOS'}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  v2.0
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                {isBn
                  ? 'কাগজের দলিল স্ক্যান, অনলাইনে খতিয়ান-দাগ অনুসন্ধান এবং ৩ডি স্যাটেলাইট মানচিত্রে জমির সীমানা ও বিরোধ যাচাইয়ের একক প্ল্যাটফর্ম।'
                  : 'Single platform for deed OCR scanning, online khatian record search, 3D cadastral GIS mapping, and ownership due diligence.'}
              </p>
            </div>

            {/* Quick Hero Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate && onNavigate('scan')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-700/20 dark:shadow-emerald-950/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <ScanLine className="w-4 h-4" />
                <span>{isBn ? 'দলিল স্ক্যান করুন' : 'Scan Porcha Scan'}</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('search')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'খতিয়ান খুঁজুন' : 'Search Records'}</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('map')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <MapIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'মানচিত্র দেখুন' : '3D Cadastral Map'}</span>
              </button>

              {onStartTour && (
                <button
                  onClick={onStartTour}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                >
                  <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'ডেমো ট্যুর' : 'Demo Tour'}</span>
                </button>
              )}

              {onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all"
                  title="Sign In / Portal"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'লগইন / একাউন্ট' : 'Sign In / Account'}</span>
                </button>
              )}
            </div>
          </div>

          {/* LandTech 3D Cadastral Radar Card */}
          <div className="w-full lg:w-[440px] shrink-0 lt-map-card p-4 rounded-2xl bg-white/90 dark:bg-[#070d12]/90 border border-slate-200 dark:border-emerald-500/30 shadow-2xl backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between pb-3 mb-1 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isBn ? 'ক্যাডাস্ট্রাল থ্রিডি রাডার' : 'Cadastral 3D Radar'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  LIVE 3D
                </span>
                <button
                  type="button"
                  onClick={() => setIsScanning(!isScanning)}
                  className="text-[10px] font-semibold text-slate-500 hover:text-emerald-500 transition-colors"
                >
                  {isScanning ? (isBn ? 'স্ক্যান থামান' : 'Pause') : (isBn ? 'স্ক্যান চালু' : 'Scan')}
                </button>
              </div>
            </div>

            <CadastralScene
              parcels={defaultDemoParcels}
              selectedId={selectedParcelId}
              onSelect={setSelectedParcelId}
              scanning={isScanning}
              className="h-[210px] sm:h-[225px]"
            />

            {/* Selected Parcel Inspector Quick Action */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {isBn ? 'নির্বাচিত প্লট' : 'Selected Plot'}
                </div>
                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                  {selectedParcelId} • {defaultDemoParcels.find((p) => p.id === selectedParcelId)?.area || '4.25 decimal'}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('map')}
                  className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                >
                  <span>{isBn ? '৩ডি ম্যাপ' : '3D GIS'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('report', { parcelId: selectedParcelId })}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all"
                >
                  <span>{isBn ? 'রিপোর্ট' : 'Report'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live System Counter Ribbon */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {isBn ? 'ভূমি রেকর্ড ভাণ্ডার' : 'Land Records'}
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <span>৫,২৫০+</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold">
                {isBn ? 'রেকর্ড' : 'Records'}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {isBn ? 'জরিপকৃত মৌজা' : 'Surveyed Mouzas'}
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <span>৪০টি</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-sans font-bold">
                {isBn ? 'সার্কেল' : 'Circles'}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {isBn ? 'ওসিআর ভেরিফিকেশন' : 'OCR Verification'}
            </span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <span>৯৮.৫%</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-sans font-bold">
                {isBn ? 'নির্ভুল' : 'Accuracy'}
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {isBn ? 'রিস্ক রুলস গেট' : 'R1-R6 Risk Gates'}
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
              <span>১০০%</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold">
                {isBn ? 'পাস' : 'Pass'}
              </span>
            </div>
          </div>

          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              {isBn ? 'অডিট লেজার চেইন' : 'Audit Chain'}
            </span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <span>১৩ ব্লক</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-sans font-bold">
                SHA-256
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary Executive Action Cards (preserves all test buttons) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <span>{isBn ? 'প্রধান নাগরিক ডিজিটাল সেবাসমূহ' : 'Core Digital Land Services'}</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isBn ? 'যেকোনো একটি সেবা নির্বাচন করুন' : 'Select a service module'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: দলিল স্ক্যান */}
          <button
            onClick={() => onNavigate && onNavigate('scan')}
            className="p-5 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-xl hover:shadow-emerald-950/20 text-left transition-all duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ScanLine className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                {isBn ? 'স্মার্ট সেবা ০১ • Service 01' : 'Service 01'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-0.5">
                {isBn ? 'দলিল স্ক্যান' : 'Deed Scanner'}
              </h3>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-2">
                {isBn ? 'Deed & Khatian Scanner' : 'দলিল স্ক্যান'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {isBn
                  ? 'মোবাইল ক্যামেরা বা স্ক্যানার দিয়ে খতিয়ানের ছবি তুলে কিউআর ও বাংলা তথ্য এক্সট্র্যাক্ট করুন।'
                  : 'Capture or upload deeds for on-device quality verification and automated Bengali OCR.'}
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>{isBn ? 'স্ক্যান শুরু করুন' : 'Launch Scanner'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>

          {/* Card 2: রেকর্ড অনুসন্ধান */}
          <button
            onClick={() => onNavigate && onNavigate('search')}
            className="p-5 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-xl hover:shadow-emerald-950/20 text-left transition-all duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                {isBn ? 'স্মার্ট সেবা ০২ • Service 02' : 'Service 02'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-0.5">
                {isBn ? 'রেকর্ড অনুসন্ধান' : 'Record Search'}
              </h3>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-2">
                {isBn ? 'Khatian & Plot Record Search' : 'রেকর্ড অনুসন্ধান'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {isBn
                  ? 'দাগ নম্বর, খতিয়ান নম্বর ও মৌজা নাম দিয়ে সেকেন্ডের মধ্যে মালিকানার রেকর্ড বের করুন।'
                  : 'Multi-identifier candidate matching across 5,250 records with transparent scoring.'}
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>{isBn ? 'অনুসন্ধান করুন' : 'Search Now'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>

          {/* Card 3: ভূমি সেবা (3D Cadastral Map) */}
          <button
            onClick={() => onNavigate && onNavigate('map')}
            className="p-5 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-xl hover:shadow-emerald-950/20 text-left transition-all duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MapIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-1">
                {isBn ? 'স্মার্ট সেবা ০৩ • Service 03' : 'Service 03'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-0.5">
                {isBn ? 'ভূমি সেবা' : 'Land Services'}
              </h3>
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 block mb-2">
                {isBn ? '3D Cadastral Map' : 'ভূমি সেবা'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {isBn
                  ? 'ত্রিমাত্রিক (3D) ক্যাডাস্ট্রাল মানচিত্রে প্লটের সীমানা, রাস্তার নেটওয়ার্ক ও জলাশয় পরিদর্শন করুন।'
                  : 'Interactive 3D Cadastral Map rendering parcel polygons, road networks, and layers.'}
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>{isBn ? 'মানচিত্র খুলুন' : 'Open 3D Map'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>

          {/* Card 4: আমার আবেদন (Buyer Due Diligence Report) */}
          <button
            onClick={() => onNavigate && onNavigate('report')}
            className="p-5 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 shadow-sm hover:shadow-xl hover:shadow-emerald-950/20 text-left transition-all duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                {isBn ? 'স্মার্ট সেবা ০৪ • Service 04' : 'Service 04'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-0.5">
                {isBn ? 'আমার আবেদন' : 'Buyer Due Diligence'}
              </h3>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 block mb-2">
                {isBn ? 'Buyer Due Diligence Report' : 'আমার আবেদন'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {isBn
                  ? 'জমি কেনার পূর্বে ৬টি অংশে বিভক্ত ক্রেতার ঝুঁকি মূল্যায়ন রিপোর্ট ও আবেদনপত্র পর্যালোচনা।'
                  : 'Generate complete 6-section buyer due diligence reports with chain-of-title verification.'}
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>{isBn ? 'রিপোর্ট দেখুন' : 'View Reports'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>
        </div>
      </div>

      {/* Citizen Plain-Language Guide: কোন সেবা কী কাজে ব্যবহার করবেন */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {isBn ? 'সহজ গাইড: কোন সেবা কী কাজে লাগে?' : 'Citizen Plain-Language Service Guide'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'সাধারণ নাগরিকরা খুব সহজে কীভাবে তাদের জমির কাজ করবেন তার বিবরণ।'
                  : 'Clear explanation of what each module does and when to use it.'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {isBn ? 'নাগরিক সহায়ক' : 'Citizen Friendly'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">১</span>
              <span>{isBn ? '১. দলিল ও পর্চা স্ক্যান (Deed OCR)' : '1. Deed & Porcha OCR (দলিল স্ক্যান)'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isBn
                ? 'কাগজের দলিল বা খতিয়ানের ছবি তুলুন। এআই নিজে থেকেই লেখা পড়ে দাগ ও খতিয়ান নম্বর বের করে দেবে।'
                : 'Upload photo of paper deed or khatian. AI reads Bengali text and extracts plot details automatically.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px]">২</span>
              <span>{isBn ? '২. খতিয়ান ও দাগ অনুসন্ধান (Record Search)' : '2. Khatian & Plot Search (রেকর্ড অনুসন্ধান)'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isBn
                ? 'খতিয়ান বা দাগ নম্বর লিখে সার্চ দিন। সরকারি ডাটাবেজ থেকে মালিকানার নাম ও অংশ সাথে সাথে পেয়ে যাবেন।'
                : 'Search by Khatian or Dag number to retrieve verified government land ownership records instantly.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[11px]">৩</span>
              <span>{isBn ? '৩. ৩ডি ডিজিটাল মানচিত্র (3D GIS Map)' : '3. 3D Cadastral Map (ডিজিটাল মানচিত্র)'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isBn
                ? 'জমিটি বাস্তবে কোথায় এবং চারপাশের রাস্তা কেমন তা দেখতে ৩ডি স্যাটেলাইট ম্যাপে দাগের সীমানা দেখুন।'
                : 'View parcel boundaries, road connectivity, and surroundings in realistic 3D satellite cadastral GIS.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[11px]">৪</span>
              <span>{isBn ? '৪. বায়ার ডিউ ডিলিজেন্স (Due Diligence)' : '4. Buyer Due Diligence (ঝুঁকি যাচাই)'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isBn
                ? 'জমি কেনার আগে কোনো মামলা, ভুয়া দলিল বা ওভারল্যাপ সমস্যা আছে কিনা জানতে পূর্ণাঙ্গ রিপোর্ট নিন।'
                : 'Get complete verification before buying land to detect boundary disputes, overlaps, or encumbrances.'}
            </p>
          </div>
        </div>
      </div>

      {/* LandTech 3D Cadastral Intelligence & Verification Showcase */}
      <LandTechShowcase onNavigateToTab={onNavigate} isDarkMode={isDarkMode} />

      {/* AI Pipeline Architecture Visualizer Component (Only rendered for RBAC Admin/Staff Roles) */}
      {isRbacUser && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isBn
                  ? 'এআই ভেরিফিকেশন ও অডিট ইঞ্জিন (RBAC এক্সেস কন্ট্রোল)'
                  : 'AI Verification & Deterministic Rules Engine (RBAC Staff View)'}
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {currentRole} Role Active
            </span>
          </div>
          <AiPipelineVisualizer />
        </div>
      )}

      {/* Epistemic Trust Badges Demonstration Section (tested in App.test.tsx) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>
                {isBn
                  ? 'তথ্য বিশ্বস্ততা লেবেল (Epistemic Trust Status Labels)'
                  : 'Epistemic Trust Status Labels'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? 'প্ল্যাটফর্মে প্রদর্শিত প্রতিটি তথ্যের সত্যতা লেভেল স্বচ্ছভাবে চিহ্নিত করা হয়।'
                : 'Every land data point is labeled with verifiable authenticity and provenance levels.'}
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 self-start sm:self-auto">
            Zero False Claims Policy
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {trustStatuses.map((status) => (
            <div
              key={status}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <TrustBadge status={status} />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Demo Parcel Shortcuts */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#080e14] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isBn ? 'লাইভ ডেমো শর্টকাট প্লটসমূহ' : 'Live Presentation Demo Shortcuts'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Pre-seeded Evaluation Parcels
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickParcels.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {p.id}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 font-medium">
                    {p.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.mouza}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBn ? 'দাগ নং:' : 'Dag No:'}{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-300">{p.dag}</span> •{' '}
                  {p.type}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  onClick={() => onNavigate && onNavigate('report', { parcelId: p.id })}
                  className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors"
                >
                  {isBn ? 'বায়ার রিপোর্ট' : 'Buyer Report'}
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('alerts', { parcelId: p.id })}
                  className="py-1 px-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                >
                  {isBn ? 'অ্যালার্ট' : 'Alerts'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
