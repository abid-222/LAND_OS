import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  CheckCircle2,
  Database,
  Search,
  ScanLine,
  Layers,
  ArrowRight,
  Server,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { TrustBadge } from '../components/TrustBadge';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { TrustStatus } from '../types/trust';

interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  version: string;
  timestamp: string;
  checks?: {
    status: string;
    database_connected: boolean;
    redis_connected: boolean;
    details: Record<string, string>;
  };
}

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch /api/v1/health
  const { data: health, isLoading, isError, refetch } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await fetch('/api/v1/health');
      if (!res.ok) {
        throw new Error(`Health check returned status ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 10000,
  });

  const trustStatuses: TrustStatus[] = [
    'OCR_EXTRACTED',
    'POSSIBLE_MATCH',
    'USER_CORRECTED',
    'VERIFIED_AUTHORIZED_SOURCE',
    'VERIFICATION_REQUIRED',
  ];

  return (
    <div className="flex flex-col gap-5 pb-24 max-w-lg mx-auto w-full px-4 pt-4">
      {/* Disclaimer Banners */}
      <DisclaimerBanner type="synthetic" />
      <DisclaimerBanner type="map" />

      {/* Hero Scan-to-Search Card */}
      <section className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden border border-emerald-900/40 bg-gradient-to-b from-emerald-950/30 to-slate-900/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ScanLine className="w-3.5 h-3.5" />
              {isBn ? 'মোবাইল ক্যামেরা স্ক্যানার' : 'Mobile Camera Scanner'}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-2">
              {t('scanToSearch')}
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isBn
                ? 'সিএস, এসএ, আরএস বা বিএস পরচা/দলিল স্ক্যান করে সরাসরি রেকর্ড সন্ধান করুন।'
                : 'Instantly point camera at physical CS, SA, RS, BS khatians or deeds.'}
            </p>
          </div>
        </div>

        {/* Action Button & Hidden Camera Fallback */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <label className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/60 cursor-pointer active:scale-98 transition-transform text-sm">
            <ScanLine className="w-5 h-5" />
            <span>{isBn ? 'ক্যামেরা চালু করুন' : 'Open Camera'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  alert(isBn ? 'দলিল সফলভাবে নির্বাচন করা হয়েছে!' : 'Document selected for OCR analysis!');
                }
              }}
            />
          </label>
        </div>
      </section>

      {/* Quick Search with Numeric Keypad */}
      <section className="glass-panel rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
          {isBn ? 'দ্রুত খতিয়ান অনুসন্ধান' : 'Direct Khatian Search'}
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('quickSearchPlaceholder')}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            className="touch-target px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-xl text-sm flex items-center gap-1.5 border border-slate-700 transition-colors"
            onClick={() => {
              if (searchQuery) alert(`Searching for: ${searchQuery}`);
            }}
          >
            <Search className="w-4 h-4" />
            <span>{t('searchBtn')}</span>
          </button>
        </div>
      </section>

      {/* Live System Health & Telemetry Status Card */}
      <section
        data-testid="health-status-card"
        className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t('systemStatus')}
            </h3>
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh status"
            aria-label="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-xs text-slate-400 animate-pulse">
            {isBn ? 'সিস্টেম স্ট্যাটাস লোড হচ্ছে...' : 'Querying health telemetry...'}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 py-3 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{isBn ? 'ব্যাকএন্ড সংযোগ বিচ্ছিন্ন।' : 'Backend unreachable or starting up.'}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                  <Server className="w-3 h-3 text-emerald-400" />
                  {t('liveness')}
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {health?.status === 'healthy' ? t('statusOnline') : t('statusDegraded')}
                </span>
              </div>

              <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  {t('database')}
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PostgreSQL 16
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800/50">
              <span>সার্ভিস: {health?.service}</span>
              <span className="font-mono text-[10px] text-slate-500">v{health?.version}</span>
            </div>
          </div>
        )}
      </section>

      {/* Epistemic Trust Badges System Showcase */}
      <section className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            {t('trustBadgesTitle')}
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          {isBn
            ? 'ল্যান্ডওএস কোনো সম্ভাব্য তথ্যকে আইনগত সত্য হিসেবে দাবি করে না। প্রতিটি তথ্য নির্দিষ্ট ৫-ধাপীয় বিশ্বস্ততা নির্দেশক ধারণ করে।'
            : 'LandOS strictly categorizes all extracted and matched data into immutable epistemic trust states.'}
        </p>
        <div className="flex flex-col gap-2.5">
          {trustStatuses.map((st) => (
            <div
              key={st}
              className="bg-slate-900/40 rounded-xl p-2.5 border border-slate-800/60 flex flex-col gap-1"
            >
              <TrustBadge status={st} showDescription />
            </div>
          ))}
        </div>
      </section>

      {/* Chain of Title & Audit Chain Integrity Notice */}
      <section className="rounded-2xl p-4 bg-emerald-950/20 border border-emerald-800/30 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন্ড অডিট লগ সক্রিয়</span>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-400" />
      </section>
    </div>
  );
};
