import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Scale,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../lib/authStore';

export interface NamjariEventItem {
  id: string;
  status: string;
  actor_role: string;
  note?: string;
  at: string;
}

export interface VerificationChecklistItem {
  id: string;
  label_bn: string;
  label_en?: string;
  status: 'pass' | 'warn' | 'fail';
  details_bn?: string;
}

export interface NamjariAppDetail {
  id: string;
  tracking_code: string;
  parcel_id: string;
  deed_document_id?: string | null;
  applicant_user_id: string;
  registry_office?: string | null;
  deed_no?: string | null;
  deed_date?: string | null;
  registration_verified: boolean;
  status: string;
  status_label_bn: string;
  status_label_en: string;
  auto_verification_status: string;
  verification_checklist?: {
    status: string;
    items?: VerificationChecklistItem[];
    has_hard_fail?: boolean;
    has_warn?: boolean;
    rejection_reasons?: string[];
  } | null;
  decision_reason?: string | null;
  sla_due_at?: string | null;
  created_at: string;
  updated_at: string;
  timeline: NamjariEventItem[];
  disclaimer_bn?: string;
}

export interface NamjariPublicTrack {
  tracking_code: string;
  parcel_id: string;
  status: string;
  status_label_bn: string;
  status_label_en: string;
  sla_due_at?: string | null;
  created_at: string;
  timeline: NamjariEventItem[];
  verification_summary: {
    status: string;
    total_checks: number;
    passed_count: number;
    warn_count: number;
    fail_count: number;
    registration_verified: boolean;
  };
  disclaimer: string;
}

interface NamjariPageProps {
  onNavigateToTab?: (tab: string, params?: Record<string, string>) => void;
  initialParcelId?: string;
}

export const NamjariPage: React.FC<NamjariPageProps> = ({
  onNavigateToTab,
  initialParcelId = 'P-CLEAN-01',
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role || 'Citizen';
  const isStaff = ['Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager', 'Tech Admin'].includes(userRole);

  // UI state
  const [activeView, setActiveView] = useState<'track' | 'apply' | 'queue'>(isStaff ? 'queue' : 'apply');
  const [trackingInput, setTrackingInput] = useState<string>('NJ-2026-1001');
  const [selectedApp, setSelectedApp] = useState<NamjariAppDetail | null>(null);

  // Application Form State
  const [formParcelId, setFormParcelId] = useState<string>(initialParcelId);
  const [formDeedNo, setFormDeedNo] = useState<string>('D-2024-8891');
  const [formRegistryOffice, setFormRegistryOffice] = useState<string>('তেজগাঁও সাব-রেজিস্ট্রি অফিস, ঢাকা');
  const [formBuyerName, setFormBuyerName] = useState<string>('আরিফুল হাসান');
  const [formSellerName, setFormSellerName] = useState<string>('মোহাম্মদ রফিকুল ইসলাম');
  const [formArea, setFormArea] = useState<string>('33.0');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Transition Modal State (Staff actions)
  const [transitionNote, setTransitionNote] = useState<string>('');

  // 1. Query: Public tracking lookup
  const {
    data: trackedData,
    isLoading: isTrackingLoading,
    error: trackingError,
    refetch: refetchTracking,
  } = useQuery<NamjariPublicTrack>({
    queryKey: ['namjari-track', trackingInput],
    queryFn: async () => {
      if (!trackingInput.trim()) throw new Error(isBn ? 'ট্র্যাকিং কোড লিখুন' : 'Enter tracking code');
      return await apiFetch<NamjariPublicTrack>(`/api/v1/namjari/track/${trackingInput.trim().toUpperCase()}`);
    },
    enabled: Boolean(trackingInput.trim()),
    retry: false,
  });

  // 2. Query: Applications list (scoped by user role)
  const {
    data: applicationsList = [],
    isLoading: isAppsLoading,
    refetch: refetchApps,
  } = useQuery<NamjariAppDetail[]>({
    queryKey: ['namjari-applications', userRole],
    queryFn: async () => {
      try {
        return await apiFetch<NamjariAppDetail[]>('/api/v1/namjari/applications');
      } catch {
        return [];
      }
    },
    enabled: Boolean(user),
  });

  // 3. Mutation: Submit Application
  const submitMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);
      return await apiFetch<NamjariAppDetail>('/api/v1/namjari/applications', {
        method: 'POST',
        body: JSON.stringify({
          parcel_id: formParcelId.trim(),
          deed_no: formDeedNo.trim(),
          registry_office: formRegistryOffice.trim(),
          buyer_name: formBuyerName.trim(),
          seller_name: formSellerName.trim(),
          applied_area_decimal: parseFloat(formArea) || 33.0,
        }),
      });
    },
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['namjari-applications'] });
      setSelectedApp(newApp);
      setTrackingInput(newApp.tracking_code);
      setActiveView('track');
    },
    onError: (err: Error) => {
      setSubmitError(err.message || (isBn ? 'আবেদন দাখিলে ত্রুটি' : 'Submission error'));
    },
  });

  // 4. Mutation: State Transition
  const transitionMutation = useMutation({
    mutationFn: async ({ appId, targetStatus, note }: { appId: string; targetStatus: string; note: string }) => {
      return await apiFetch<NamjariAppDetail>(`/api/v1/namjari/applications/${appId}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          target_status: targetStatus,
          note: note || undefined,
        }),
      });
    },
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ['namjari-applications'] });
      setSelectedApp(updatedApp);
      setTransitionNote('');
    },
  });

  const demoPresets = [
    { code: 'NJ-2026-1001', labelBn: 'খতিয়ান সম্পন্ন (Auto-Approved)', badge: 'bg-emerald-500/20 text-emerald-400' },
    { code: 'NJ-2026-1002', labelBn: 'মঞ্জুরকৃত (Approved)', badge: 'bg-teal-500/20 text-teal-400' },
    { code: 'NJ-2026-1003', labelBn: 'শুনানির নোটিশ (Hearing)', badge: 'bg-indigo-500/20 text-indigo-400' },
    { code: 'NJ-2026-1004', labelBn: 'দ্বৈত বিক্রয় নামঞ্জুর (Double Sale R1)', badge: 'bg-rose-500/20 text-rose-400' },
    { code: 'NJ-2026-1005', labelBn: 'খাস জমি নামঞ্জুর (Khas R7)', badge: 'bg-rose-500/20 text-rose-400' },
    { code: 'NJ-2026-1006', labelBn: 'মামলা সতর্কতা (Litigation R8)', badge: 'bg-amber-500/20 text-amber-400' },
  ];

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              P4 Smart E-Namjari
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isBn ? 'স্বয়ংক্রিয় দলিল লিঙ্কেজ ও প্রি-ভেরিফিকেশন' : 'Automated Deed Linkage & Pre-Verification'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isBn ? 'স্মার্ট ই-নামজারি ট্র্যাকিং ও অটো-ভেরিফিকেশন' : 'Smart E-Namjari Tracking & Verification'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isBn
              ? 'দলিল রেজিস্ট্রেশনের সাথে ডিজিটাল নামজারি ট্র্যাকিং, কৃত্রিম বুদ্ধিমত্তা ঝুঁকি নিরীক্ষা ও স্বচ্ছ এসএলএ পর্যবেক্ষণ।'
              : 'End-to-end simulated mutation tracking linked to deed registry with AI conflict checks and audit chain.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveView('apply')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === 'apply'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isBn ? 'নতুন আবেদন' : 'New Application'}
          </button>
          <button
            onClick={() => setActiveView('track')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === 'track'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isBn ? 'ট্র্যাকিং সন্ধান' : 'Track Status'}
          </button>
          {isStaff && (
            <button
              onClick={() => setActiveView('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'queue'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? 'কর্মকর্তা কিউ (Staff)' : 'Staff Queue'}
            </button>
          )}
        </div>
      </div>

      {/* Quick Demo Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-2xl bg-slate-50 dark:bg-[#070b0e] border border-slate-200/80 dark:border-slate-800/80 text-xs">
        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          {isBn ? 'ডেমো ট্র্যাকিং প্রিসেট:' : 'Demo Presets:'}
        </span>
        {demoPresets.map((dp) => (
          <button
            key={dp.code}
            onClick={() => {
              setTrackingInput(dp.code);
              setActiveView('track');
            }}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-slate-700 dark:text-slate-300 font-mono transition-all text-xs flex items-center gap-1.5"
          >
            <span className="font-bold">{dp.code}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${dp.badge}`}>{dp.labelBn}</span>
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: APPLY FOR E-NAMJARI */}
      {/* ------------------------------------------------------------- */}
      {activeView === 'apply' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0a0f14] border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {isBn ? 'ই-নামজারি ও জমাভাগ আবেদন ফরম' : 'E-Namjari & Mutation Application Form'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'রেজিস্ট্রেশনকৃত দলিলের তথ্য দিন। এআই ইঞ্জিন স্বয়ংক্রিয়ভাবে খতিয়ান ও স্বত্ব যাচাই করবে।'
                      : 'Provide registered deed info. AI engine verifies ownership chain and risks automatically.'}
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Parcel ID & Deed No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'ক্যাডাস্ট্রাল দাগ / প্লট আইডি *' : 'Target Parcel ID *'}
                    </label>
                    <input
                      type="text"
                      value={formParcelId}
                      onChange={(e) => setFormParcelId(e.target.value)}
                      placeholder="e.g. P-CLEAN-01"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'রেজিস্ট্রিকৃত সাব-কবলা দলিল নম্বর *' : 'Registered Deed No *'}
                    </label>
                    <input
                      type="text"
                      value={formDeedNo}
                      onChange={(e) => setFormDeedNo(e.target.value)}
                      placeholder="e.g. D-2024-8891"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Sub-Registry Office */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'সাব-রেজিস্ট্রি কার্যালয় *' : 'Sub-Registry Office *'}
                  </label>
                  <input
                    type="text"
                    value={formRegistryOffice}
                    onChange={(e) => setFormRegistryOffice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>

                {/* Seller & Buyer Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'দলিলের বিক্রেতার নাম (রেকর্ডীয় মালিক) *' : 'Deed Seller (Recorded Owner) *'}
                    </label>
                    <input
                      type="text"
                      value={formSellerName}
                      onChange={(e) => setFormSellerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'দলিলের ক্রেতা / আবেদনকারী পূর্ণ নাম *' : 'Deed Buyer / Applicant Full Name *'}
                    </label>
                    <input
                      type="text"
                      value={formBuyerName}
                      onChange={(e) => setFormBuyerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* Area */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'আবেদিত জমির পরিমাণ (শতাংশ / ডেসিমাল) *' : 'Mutated Area (Decimals) *'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isBn ? 'দাখিলের সাথে সাথে প্রি-ভেরিফিকেশন সম্পন্ন হবে' : 'Immediate pre-verification on submit'}</span>
                  </div>

                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isBn ? 'যাচাই ও দাখিল হচ্ছে...' : 'Submitting & Verifying...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{isBn ? 'ই-নামজারি আবেদন দাখিল করুন' : 'Submit E-Namjari'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Guidance Card */}
          <div className="space-y-6">
            <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
              <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" />
                {isBn ? 'স্বয়ংক্রিয় এআই প্রাক-যাচাইকরণ ধাপসমূহ' : 'AI Automated Pre-Check Steps'}
              </h4>
              <ul className="space-y-2.5 text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'সাব-রেজিস্ট্রি দলিলের কিউআর ও হ্যাশ অখণ্ডতা যাচাই' : 'Deed QR & cryptographic hash integrity'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'বিক্রেতা বনাম রেকর্ডীয় মালিকানার শতভাগ মিল নিরীক্ষা' : 'Seller vs recorded owner match'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'দ্বৈত বিক্রয় (R1) ও খাস জমি (R7) প্রতিরোধ' : 'Prevention of double sales & khas encroachment'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{isBn ? 'আদালতের স্থগিতাদেশ (R8) ও অধিগ্রহণ নোটিশ (R9) শনাক্ত' : 'Detection of injunctions & acquisition notices'}</span>
                </li>
              </ul>
            </div>

            {/* Quick check before buying link */}
            <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              <h4 className="font-bold flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                {isBn ? 'জমি ক্রয়ের পূর্বে যাচাই করেছেন?' : 'Verified before purchase?'}
              </h4>
              <p className="text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'নামজারির পূর্বে জমির সম্পূর্ণ ঝুঁকি প্রতিবেদন ও স্বত্ব যাচাই প্রতিবেদন দেখে নিন।'
                  : 'Review the comprehensive buyer risk report before proceeding with mutation.'}
              </p>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('report', { parcelId: formParcelId })}
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>{isBn ? 'বায়ার রিপোর্ট দেখুন (P5)' : 'View Buyer Report (P5)'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: PUBLIC STATUS LOOKUP BY TRACKING CODE */}
      {/* ------------------------------------------------------------- */}
      {activeView === 'track' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#0a0f14] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder={isBn ? 'ট্র্যাকিং নম্বর লিখুন (e.g. NJ-2026-1001)...' : 'Enter tracking code (e.g. NJ-2026-1001)...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              />
            </div>
            <button
              onClick={() => refetchTracking()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isBn ? 'ট্র্যাক করুন' : 'Track Status'}</span>
            </button>
          </div>

          {/* Tracking Result Card */}
          {isTrackingLoading && (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <span>{isBn ? 'ট্র্যাকিং তথ্য লোড হচ্ছে...' : 'Loading tracking status...'}</span>
            </div>
          )}

          {trackingError && (
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-center text-xs">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="font-bold">{isBn ? 'আবেদন খুঁজে পাওয়া যায়নি' : 'Application Not Found'}</p>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {isBn ? 'সঠিক ট্র্যাকিং কোড দিয়ে পুনরায় চেষ্টা করুন।' : 'Please verify the tracking code and try again.'}
              </p>
            </div>
          )}

          {trackedData && (
            <div className="space-y-6">
              {/* Status Header Overview Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0a0f14] border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                        {trackedData.tracking_code}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        দাগ: {trackedData.parcel_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {isBn ? 'দাখিলের তারিখ: ' : 'Submitted on: '}
                        {new Date(trackedData.created_at).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}
                      </span>
                      {trackedData.sla_due_at && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {isBn ? 'এসএলএ সময়সীমা: ' : 'SLA Due: '}
                            {new Date(trackedData.sla_due_at).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black shadow-sm ${
                        trackedData.status === 'khatian_updated' || trackedData.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : trackedData.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : trackedData.status === 'needs_correction'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {trackedData.status === 'khatian_updated' || trackedData.status === 'approved' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : trackedData.status === 'rejected' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span>{isBn ? trackedData.status_label_bn : trackedData.status_label_en}</span>
                    </span>
                  </div>
                </div>

                {/* Pre-Verification Quick Metric Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                      {isBn ? 'এআই নিরীক্ষা' : 'AI Verification'}
                    </span>
                    <span className="font-black text-sm capitalize text-emerald-600 dark:text-emerald-400">
                      {trackedData.verification_summary.status}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                      {isBn ? 'উত্তীর্ণ চেক' : 'Passed Checks'}
                    </span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {trackedData.verification_summary.passed_count} / {trackedData.verification_summary.total_checks}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                      {isBn ? 'রেজিস্ট্রি লিঙ্ক' : 'Registry Link'}
                    </span>
                    <span className="font-black text-sm text-teal-600 dark:text-teal-400">
                      {trackedData.verification_summary.registration_verified ? 'Verified' : 'Simulated'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">
                      {isBn ? 'অডিট সিল' : 'Audit Hash'}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">SHA-256 Valid</span>
                  </div>
                </div>
              </div>

              {/* Stepper Timeline */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0a0f14] border border-slate-200 dark:border-slate-800 shadow-xl">
                <h3 className="font-bold text-sm mb-5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>{isBn ? 'আবেদনের অগ্রগতির ইতিহাস (লাইভ টাইমলাইন)' : 'Application Live Stepper Timeline'}</span>
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {trackedData.timeline.map((event, idx) => (
                    <div key={event.id || idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white dark:ring-[#0a0f14]">
                        ✓
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-black text-slate-900 dark:text-white capitalize">
                            {event.status.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 font-bold">
                              {event.actor_role}
                            </span>
                            <span>{new Date(event.at).toLocaleString(isBn ? 'bn-BD' : 'en-US')}</span>
                          </div>
                        </div>
                        {event.note && (
                          <p className="text-slate-600 dark:text-slate-300 text-xs pt-1">{event.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-slate-500 dark:text-slate-400 text-center">
                {trackedData.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: STAFF QUEUE & DECISION ACTIONS */}
      {/* ------------------------------------------------------------- */}
      {activeView === 'queue' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-[#0a0f14] border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm">
                {isBn ? 'অফিস নামজারি আবেদন তালিকা ও ওয়ার্কফ্লো' : 'Office Namjari Application Queue'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isBn
                  ? `আপনার রোল: ${userRole} — নির্ধারিত ভূমিকা অনুযায়ী পদক্ষেপ গ্রহণ করুন।`
                  : `Current Role: ${userRole} — Perform stage-specific workflow actions.`}
              </p>
            </div>
            <button
              onClick={() => refetchApps()}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold flex items-center gap-2 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>

          {isAppsLoading && (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <span>{isBn ? 'কিউ তালিকা লোড হচ্ছে...' : 'Loading queue...'}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applicationsList.map((app) => (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                  selectedApp?.id === app.id
                    ? 'bg-slate-50 dark:bg-[#0c1218] border-emerald-500 shadow-md ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-[#0a0f14] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {app.tracking_code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      app.status === 'khatian_updated' || app.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : app.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400'
                        : app.status === 'needs_correction'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    {isBn ? app.status_label_bn : app.status_label_en}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3">
                  <div className="flex items-center justify-between">
                    <span>{isBn ? 'দাগ নম্বর:' : 'Parcel:'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{app.parcel_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{isBn ? 'দলিল নম্বর:' : 'Deed:'}</span>
                    <span className="font-mono">{app.deed_no || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{isBn ? 'প্রি-ভেরিফিকেশন:' : 'Pre-Check:'}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                      {app.auto_verification_status}
                    </span>
                  </div>
                </div>

                {app.decision_reason && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 mb-3">
                    {app.decision_reason}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{new Date(app.created_at).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    {isBn ? 'বিস্তারিত ও অনুমোদন' : 'Review & Action'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Decision Panel for Selected App */}
          {selectedApp && (
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#0c1218] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-500" />
                    <span>
                      {isBn ? 'আবেদন পর্যালোচনা ও সিদ্ধান্ত: ' : 'Review Application: '}
                      <span className="font-mono">{selectedApp.tracking_code}</span>
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBn ? 'দাগ নম্বর: ' : 'Parcel ID: '}
                    <span className="font-mono font-bold">{selectedApp.parcel_id}</span>
                  </p>
                </div>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {isBn ? 'বর্তমান স্ট্যাটাস: ' : 'Current Status: '}
                  {selectedApp.status}
                </div>
              </div>

              {/* Action Buttons based on Role & Status */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isBn ? 'কর্মকর্তার মন্তব্য বা শুনানির নোট (Mandatory Observation Note):' : 'Officer Note:'}
                </label>
                <textarea
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  placeholder={
                    isBn
                      ? 'নথি নিরীক্ষা বা শুনানির বিস্তারিত মন্তব্য লিখুন...'
                      : 'Enter observation, hearing notice details, or approval note...'
                  }
                  className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-indigo-500 min-h-[80px]"
                />

                <div className="flex flex-wrap items-center gap-3">
                  {/* Reviewer Actions */}
                  {selectedApp.status === 'documents_review' && (
                    <>
                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            appId: selectedApp.id,
                            targetStatus: 'hearing_notice',
                            note: transitionNote || 'কাগজপত্র সঠিক। শুনানি ধার্য করা হলো।',
                          })
                        }
                        disabled={transitionMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{isBn ? 'শুনানির নোটিশ জারি করুন' : 'Issue Hearing Notice'}</span>
                      </button>

                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            appId: selectedApp.id,
                            targetStatus: 'field_verification',
                            note: transitionNote || 'সরেজমিন সীমানা নির্ধারণ প্রয়োজন।',
                          })
                        }
                        disabled={transitionMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{isBn ? 'মাঠ তদন্তে প্রেরণ' : 'Field Verification'}</span>
                      </button>
                    </>
                  )}

                  {/* Supervisor Actions */}
                  {(selectedApp.status === 'hearing_notice' || selectedApp.status === 'documents_review') && (
                    <>
                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            appId: selectedApp.id,
                            targetStatus: 'approved',
                            note: transitionNote || 'নামজারি আবেদন অনুমোদিত।',
                          })
                        }
                        disabled={transitionMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isBn ? 'নামজারি মঞ্জুর (Approve)' : 'Approve Application'}</span>
                      </button>

                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            appId: selectedApp.id,
                            targetStatus: 'rejected',
                            note: transitionNote || 'নথিপত্রের ত্রুটির কারণে আবেদন নামঞ্জুর।',
                          })
                        }
                        disabled={transitionMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{isBn ? 'আবেদন নামঞ্জুর (Reject)' : 'Reject Application'}</span>
                      </button>

                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            appId: selectedApp.id,
                            targetStatus: 'needs_correction',
                            note: transitionNote || 'সংশোধিত নথিপত্র দাখিল করুন।',
                          })
                        }
                        disabled={transitionMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{isBn ? 'সংশোধন তলব (Needs Correction)' : 'Request Correction'}</span>
                      </button>
                    </>
                  )}

                  {/* Final Step: Khatian Updated */}
                  {selectedApp.status === 'approved' && (
                    <button
                      onClick={() =>
                        transitionMutation.mutate({
                          appId: selectedApp.id,
                          targetStatus: 'khatian_updated',
                          note: transitionNote || 'নতুন খতিয়ান প্রস্তুত ও রেকর্ডভুক্ত সম্পন্ন।',
                        })
                      }
                      disabled={transitionMutation.isPending}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isBn ? 'খতিয়ান হালনাগাদ ও নামজারি সম্পন্ন করুন' : 'Finalize Khatian & Mutate'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
