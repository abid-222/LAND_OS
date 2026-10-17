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
import { useAuthStore, type UserRole } from '../lib/authStore';
import { CadastralPlotViewer } from '../components/CadastralPlotViewer';
import { LandTechShowcase } from '../components/landtech/LandTechShowcase';
import { api } from '../api/client';
import {
  FilePlus,
  CheckCircle2,
  FileText,
  Send,
  X,
} from 'lucide-react';

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
  const { user, isAuthenticated } = useAuthStore();

  const [selectedParcelId, setSelectedParcelId] = React.useState<string>('P-4520');
  const [myCases, setMyCases] = React.useState<any[]>([]);
  const [isApplyModalOpen, setIsApplyModalOpen] = React.useState(false);
  const [applyForm, setApplyForm] = React.useState({
    mouza: 'তেজগাঁও',
    dag_no: '১২০৫',
    khatian_no: '৪৫২০',
    area_decimal: '১৫.৫',
    applicant_name: user?.full_name_bn || 'মোঃ কামাল হোসেন',
    notes: 'পৈতৃক সূত্রে প্রাপ্ত জমি নামজারি ও জমাভাগ আবেদন।',
  });
  const [isSubmittingCase, setIsSubmittingCase] = React.useState(false);
  const [caseSubmitSuccess, setCaseSubmitSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated && currentRole === 'Citizen') {
      api.get<any[]>('/api/v1/review/cases/my')
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setMyCases(res);
          }
        })
        .catch((err) => console.warn('Could not fetch citizen cases:', err));
    }
  }, [isAuthenticated, currentRole]);

  const handleApplyCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCase(true);
    try {
      const res = await api.post<any>('/api/v1/review/cases/apply', {
        case_type: 'MUTATION',
        mouza: applyForm.mouza,
        dag_no: applyForm.dag_no,
        khatian_no: applyForm.khatian_no,
        area_decimal: parseFloat(applyForm.area_decimal) || undefined,
        applicant_name: applyForm.applicant_name,
        notes: applyForm.notes,
      });
      setCaseSubmitSuccess(res.case_number);
      setMyCases((prev) => [
        {
          id: res.id,
          case_number: res.case_number,
          case_type: res.case_type,
          status: res.status,
          notes: res.notes,
          created_at: res.created_at,
        },
        ...prev,
      ]);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setCaseSubmitSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.warn('Apply case failed:', err);
    } finally {
      setIsSubmittingCase(false);
    }
  };

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
                  v3.0
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
                <span>{isBn ? 'দলিল স্ক্যান' : 'Scan Porcha Scan'}</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('search')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'রেকর্ড অনুসন্ধান' : 'Search Records'}</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('map')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <MapIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'মানচিত্র দেখুন' : '3D Cadastral Map'}</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('ml')}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'এমএল স্টুডিও (তথ্য নিষ্কাশন)' : 'ML Studio'}</span>
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

          {/* Digital Cadastral Plot & Mouza Naksha System Card */}
          <div className="w-full lg:w-[460px] shrink-0 p-4 rounded-2xl bg-white/95 dark:bg-[#070d12]/95 border border-slate-200 dark:border-emerald-500/30 shadow-2xl backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isBn ? 'ডিজিটাল মৌজা প্লট নকশা' : 'Cadastral Mouza Plot Map'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  CADASTRAL 2D
                </span>
                {['P-4520', 'P-3201', 'P-1108'].map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setSelectedParcelId(pid)}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                      selectedParcelId === pid
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {pid}
                  </button>
                ))}
              </div>
            </div>

            <CadastralPlotViewer
              parcelId={selectedParcelId}
              isDark={isDarkMode}
              onNavigateToMap={() => onNavigate && onNavigate('map')}
            />

            {/* Quick Actions Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {isBn ? 'নির্বাচিত প্লট' : 'Selected Plot'}
                </div>
                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                  {selectedParcelId} • {selectedParcelId === 'P-3201' ? '৪২.০ শতক (মিরপুর)' : selectedParcelId === 'P-1108' ? '৮.৫ শতক (গুলশান)' : '১৫.৫ শতক (তেজগাঁও)'}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('map')}
                  className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                >
                  <span>{isBn ? 'মৌজা ম্যাপ' : 'GIS Map'}</span>
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

      {/* Citizen Personal Land Records & Mutation Applications Hub */}
      {currentRole === 'Citizen' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/30 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'আমার ভূমি রেকর্ড ও ই-নামজারি ট্র্যাকার' : 'My Land Holdings & E-Namjari Tracker'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {isAuthenticated ? (isBn ? 'যাচাইকৃত নাগরিক' : 'Verified Citizen') : (isBn ? 'ডেমো পোর্টাল' : 'Demo Portal')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isBn
                    ? 'আপনার মালিকানাধীন খতিয়ান, দাগ এবং সহকারী কমিশনার (ভূমি) দপ্তরে দাখিলকৃত নামজারি আবেদনের লাইভ স্ট্যাটাস।'
                    : 'Track your owned parcels, verified khatians, and live mutation applications submitted to AC Land.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all self-start sm:self-auto shrink-0"
            >
              <FilePlus className="w-4 h-4" />
              <span>{isBn ? 'নতুন নামজারি আবেদন করুন' : 'Apply for E-Namjari'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Registered Holdings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{isBn ? 'আমার নিবন্ধিত খতিয়ান ও জোত' : 'Registered Holdings & Records'}</span>
              </h4>

              <div className="space-y-2.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>মৌজা: তেজগাঁও • দাগ নং ১২০৫</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                        খতিয়ান ৪৫২০
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      জমির পরিমাণ: ১৫.৫ শতক | শ্রেণি: বাণিজ্যিক / নাল
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onNavigate && onNavigate('map')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/30 transition-colors"
                    >
                      {isBn ? 'ম্যাপ' : 'Map'}
                    </button>
                    <button
                      onClick={() => onNavigate && onNavigate('report', { parcelId: 'P-4520' })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      {isBn ? 'রিপোর্ট' : 'Report'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>মৌজা: গুলশান • দাগ নং ৩৪০</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                        খতিয়ান ১১০৮
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      জমির পরিমাণ: ৮.৫ শতক | শ্রেণি: আবাসিক ভিটি
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onNavigate && onNavigate('map')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/30 transition-colors"
                    >
                      {isBn ? 'ম্যাপ' : 'Map'}
                    </button>
                    <button
                      onClick={() => onNavigate && onNavigate('report', { parcelId: 'P-1108' })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      {isBn ? 'রিপোর্ট' : 'Report'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Mutation & Review Applications */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>{isBn ? 'নামজারি ও পর্যালোচনা আবেদনের তালিকা' : 'Active Mutation & Review Applications'}</span>
              </h4>

              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {(myCases.length > 0 ? myCases : [
                  {
                    case_number: 'MUT-2026-901',
                    notes: 'মৌজা: তেজগাঁও | দাগ নং: ১২০৫ | খতিয়ান: ৪৫২০ | জমি: ১৫.৫ শতক',
                    status: 'needs_human_review',
                    created_at: new Date().toISOString(),
                  },
                  {
                    case_number: 'REV-2026-083',
                    notes: 'পর্চা নং ৩৪০ (গুলশান সার্কেল) - ই-নামজারি ও ওয়ারিশান খতিয়ান',
                    status: 'APPROVED',
                    created_at: new Date().toISOString(),
                  }
                ]).map((c: any, idx: number) => {
                  const isApproved = c.status === 'APPROVED';
                  const isReturned = c.status === 'REJECTED';

                  return (
                    <div
                      key={c.case_number || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white font-mono">
                          #{c.case_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isApproved
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : isReturned
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isApproved
                            ? (isBn ? 'অনুমোদিত ও রেকর্ড সৃজিত' : 'Approved')
                            : isReturned
                            ? (isBn ? 'সংশোধনের জন্য ফেরত' : 'Returned')
                            : (isBn ? 'এসিল্যান্ড পর্যালোচনাধীন' : 'Under AC Land Review')}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                        {c.notes}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive E-Namjari Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#070d12] rounded-3xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 p-6 text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <FilePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'অনলাইন ই-নামজারি আবেদন' : 'Online E-Namjari Application'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn ? 'সহকারী কমিশনার (ভূমি) কার্যালয়' : 'AC Land Circle Office Intake'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {caseSubmitSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'নামজারি আবেদন সফলভাবে দাখিল হয়েছে!' : 'Mutation Application Submitted!'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Case ID: #{caseSubmitSuccess}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {isBn ? 'আবেদনটি সহকারী কমিশনার (ভূমি) পর্যালোচনা তালিকায় যুক্ত হয়েছে।' : 'Assigned to AC Land review queue.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplyCase} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'মৌজা' : 'Mouza'}
                    </label>
                    <input
                      type="text"
                      value={applyForm.mouza}
                      onChange={(e) => setApplyForm({ ...applyForm, mouza: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'দাগ নম্বর' : 'Plot / Dag No.'}
                    </label>
                    <input
                      type="text"
                      value={applyForm.dag_no}
                      onChange={(e) => setApplyForm({ ...applyForm, dag_no: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'খতিয়ান নম্বর' : 'Khatian No.'}
                    </label>
                    <input
                      type="text"
                      value={applyForm.khatian_no}
                      onChange={(e) => setApplyForm({ ...applyForm, khatian_no: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'জমির পরিমাণ (শতক)' : 'Area (Decimal)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={applyForm.area_decimal}
                      onChange={(e) => setApplyForm({ ...applyForm, area_decimal: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'আবেদনকারীর নাম' : 'Applicant Full Name'}
                  </label>
                  <input
                    type="text"
                    value={applyForm.applicant_name}
                    onChange={(e) => setApplyForm({ ...applyForm, applicant_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'আবেদনের কারণ ও বিবরণ' : 'Details & Reason for Mutation'}
                  </label>
                  <textarea
                    rows={3}
                    value={applyForm.notes}
                    onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCase}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingCase ? (isBn ? 'দাখিল হচ্ছে...' : 'Submitting...') : (isBn ? 'আবেদন দাখিল করুন' : 'Submit Application')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
          {/* Card 1: দলিল স্ক্যানিং */}
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
                {isBn ? 'কাগজের পরচা ও নথি ডিজিটালাইজার' : 'Porcha Digitalizer'}
              </h3>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-2">
                {isBn ? 'Smart AI OCR Scanner' : 'পরচা ডিজিটালাইজার'}
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

          {/* Card 2: খতিয়ান বালাম ডাটাবেজ */}
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
                {isBn ? 'খতিয়ান বালাম ডাটাবেজ' : 'Record Search'}
              </h3>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-2">
                {isBn ? 'Khatian & Plot Record Search' : 'রেকর্ড ডাটাবেজ'}
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

          {/* Card 4: আমার আবেদন (Pending Offline Uploads & Applications) */}
          <button
            aria-label="আমার আবেদন"
            onClick={() => onNavigate && onNavigate('pending')}
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
                {isBn ? 'আমার আবেদন' : 'My Applications'}
              </h3>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 block mb-2">
                {isBn ? 'My Applications & Offline Records' : 'আমার আবেদন'}
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                {isBn
                  ? 'আপনার জমা দেওয়া আবেদনসমূহ এবং অফলাইনে সংরক্ষিত নথিগুলোর হালনাগাদ অগ্রগতি দেখুন।'
                  : 'View submitted applications and local encrypted records queued for sync.'}
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>{isBn ? 'আবেদন তালিকা' : 'View Applications'}</span>
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
