import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  RotateCcw,
  UserCheck,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Users,
  Scale,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Key,
  Shield,
  Sparkles,
} from 'lucide-react';
import { RoleSwitchTerminal } from '../components/RoleSwitchTerminal';
import { api } from '../api/client';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_PWD = isDemoMode ? 'Password123!' : '';

export interface GovRoleInfo {
  roleId: string;
  nameBn: string;
  nameEn: string;
  email: string;
  password: string;
  badgeColor: string;
  phase: string;
  responsibilitiesBn: string[];
  sampleAction: string;
  actionNoteBn: string;
}

export const GOV_WORKER_ROLES: GovRoleInfo[] = [
  {
    roleId: 'Operator',
    nameBn: 'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (তহশিলদার)',
    nameEn: 'Union Land Assistant Officer (Tahsildar)',
    email: 'operator@landos.gov.bd',
    password: DEMO_PWD,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    phase: 'ধাপ ১: প্রাথমিক সরজমিন তদন্ত ও ফরম ৯ক',
    responsibilitiesBn: [
      'নাগরিকের দাখিলকৃত নামজারি আবেদন ও দলিলের প্রাথমিক যাচাই',
      'জমির সরজমিন দখল ও প্রকৃত চৌহদ্দি পরিদর্শন',
      'সরকারি খাস, অর্পিত বা পরিত্যক্ত সম্পত্তি নয় মর্মে নিশ্চিতকরণ',
      'তদন্ত প্রতিবেদন (ফরম ৯ক) প্রস্তুত ও সহকারী কমিশনার (ভূমি) বরাবরে প্রেরণ',
    ],
    sampleAction: 'তদন্ত প্রতিবেদন (ফরম ৯ক) দাখিল',
    actionNoteBn:
      'জমির দখলদার মোঃ রহিম মিয়াকে সরজমিনে পাওয়া গিয়েছে। চৌহদ্দি ও খতিয়ান মিল রয়েছে। কোনো সরকারি স্বার্থ বা অর্পিত খাস জমি ক্ষুণ্ণ হয়নি।',
  },
  {
    roleId: 'Reviewer',
    nameBn: 'কানুনগো ও সার্ভেয়ার (জরিপ ও দাগ পরীক্ষক)',
    nameEn: 'Kanungo & Surveyor (Cadastral Reviewer)',
    email: 'reviewer@landos.gov.bd',
    password: DEMO_PWD,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    phase: 'ধাপ ২: মৌজা নকশা, দাগ পরিমাপ ও এআই অডিট',
    responsibilitiesBn: [
      'মৌজা নকশায় সিএস/আরএস/বিএস দাগের অবস্থান ও জ্যামিতিক সীমানা যাচাই',
      'রেলওয়ে, সড়ক ও জনপথ বা খালের বাফার জোনে কোনো অনুপ্রবেশ হয়েছে কি না পরীক্ষণ',
      'R1-R6 এআই কনফ্লিক্ট ইঞ্জিনে কোনো দ্বৈত বিক্রি বা খতিয়ান জালিয়াতি শনাক্ত হয়েছে কি না পরীক্ষণ',
      'কানুনগো যাচাই প্রতিবেদন প্রণয়ন ও শুনানির সুপারিশ',
    ],
    sampleAction: 'কানুনগো ও নকশা যাচাই প্রতিবেদন',
    actionNoteBn:
      'মৌজা নকশার দাগ নং ১২০৫ এর সীমানা পরিমাপ করা হয়েছে। পার্শ্ববর্তী দাগের সাথে কোনো সীমানা ওভারল্যাপ বা বিরোধ নেই। নামজারি অনুমোদনের সুপারিশ করা হলো।',
  },
  {
    roleId: 'Supervisor',
    nameBn: 'সহকারী কমিশনার (ভূমি) / এসি ল্যান্ড',
    nameEn: 'Assistant Commissioner (Land) - AC Land',
    email: 'supervisor@landos.gov.bd',
    password: DEMO_PWD,
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    phase: 'ধাপ ৩: আধা-বিচারিক শুনানি ও খতিয়ান স্বাক্ষর',
    responsibilitiesBn: [
      'উভয় পক্ষের শুনানির নোটিশ জারি ও আধা-বিচারিক শুনানি গ্রহণ',
      'রেকর্ডীয় স্বত্ব ও উত্তরাধিকার সনদ অনুযায়ী চূড়ান্ত নামজারি আদেশ প্রদান',
      'ডি-নথিতে ডিজিটাল স্বাক্ষর এবং নতুন নামজারি খতিয়ান (Khatian) অনুমোদন',
      'সরকারি ডিসিআর ফি (DCR Fee) এবং কর নির্ধারণ নিশ্চিতকরণ',
    ],
    sampleAction: 'চূড়ান্ত খতিয়ান অনুমোদন ও স্বাক্ষর',
    actionNoteBn:
      'উভয় পক্ষের কাগজপত্র ও কানুনগো প্রতিবেদন পর্যালোচনায় স্বত্ব প্রমাণিত হওয়ায় নামজারি প্রস্তাব মঞ্জুর করা হলো। নতুন খতিয়ান প্রস্তুতের নির্দেশ দেওয়া হলো।',
  },
  {
    roleId: 'OfficeAdmin',
    nameBn: 'উপজেলা রেকর্ড কিপার ও প্রশাসনিক কর্মকর্তা',
    nameEn: 'Upazila Land Office Administrator',
    email: 'officeadmin@landos.gov.bd',
    password: DEMO_PWD,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    phase: 'ধাপ ৪: রেজিস্টার-৯ ভলিউম ও নাগরিক ডেলিভারি',
    responsibilitiesBn: [
      'রেজিস্টার-৯ (Register-IX) এ নতুন নামজারি ভলিউম লিপিবদ্ধকরণ',
      'সার্কেল কর্মকর্তা ও কর্মচারীদের কেস অ্যাসাইনমেন্ট ব্যবস্থাপনা',
      'অনুমোদিত খতিয়ান ও ডিসিআর কপি নাগরিককে ডিজিটাল পোর্টাল বা কাউন্টারে হস্তান্তর',
    ],
    sampleAction: 'রেজিস্টার-৯ ভলিউম এন্ট্রি সম্পন্ন',
    actionNoteBn:
      'অনুমোদিত নামজারি কেস রেজিস্টার-৯ এর পৃষ্ঠা নং ১২৪-এ অন্তর্ভুক্ত হয়েছে। কিউআর কোডযুক্ত খতিয়ান নাগরিককে ডেলিভারির জন্য প্রস্তুত।',
  },
  {
    roleId: 'RegionalManager',
    nameBn: 'অতিরিক্ত জেলা প্রশাসক (রাজস্ব) / এডিসি রাজস্ব',
    nameEn: 'Additional Deputy Commissioner (Revenue)',
    email: 'regionalmanager@landos.gov.bd',
    password: DEMO_PWD,
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    phase: 'আপিল ধাপ: নামজারি মিস কেস ও রাজস্ব অডিট',
    responsibilitiesBn: [
      'সহকারী কমিশনার (ভূমি)-এর আদেশের বিরুদ্ধে দাখিলকৃত নামজারি আপিল ও মিস কেসের শুনানি গ্রহণ',
      'আন্তঃউপজেলা সীমানা সংক্রান্ত বিতর্ক ও নদীভাঙ্গা জমির পুনর্বন্টন নিষ্পত্তি',
      'জেলা পর্যায়ে রাজস্ব আদায় ও ডিজিটাল ভূমি সেবা তদারকি',
    ],
    sampleAction: 'আপিল শুনানি ও মিস কেস নিষ্পত্তি',
    actionNoteBn:
      'দাখিলকৃত আপিল পিটিশন পর্যালোচনা করা হলো। সহকারী কমিশনার (ভূমি)-এর আদেশে কোনো পদ্ধতিগত ত্রুটি না থাকায় আদেশ বহাল রাখা হলো।',
  },
  {
    roleId: 'SecurityOfficer',
    nameBn: 'সাইবার ও অডিট নিরাপত্তা কর্মকর্তা',
    nameEn: 'Cyber & Audit Security Officer',
    email: 'securityofficer@landos.gov.bd',
    password: DEMO_PWD,
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    phase: 'নিরাপত্তা অডিট: ব্লকচেইন হ্যাশ চেইন ও ট্যাম্পার যাচাই',
    responsibilitiesBn: [
      'SHA-256 ক্রিপ্টোগ্রাফিক হ্যাশ চেইন দিয়ে রেকর্ড অপরিবর্তনযোগ্যতা যাচাই',
      'অননুমোদিত ডেটাবেজ পরিবর্তন ও জালিয়াতি অ্যালার্ট ইনভেস্টিগেশন',
      'জিরো-ট্রাস্ট অ্যাক্সেস লগ ও সাইবার অডিট রিপোর্ট প্রস্তুত',
    ],
    sampleAction: 'ক্রিপ্টোগ্রাফিক হ্যাশ অখণ্ডতা যাচাই',
    actionNoteBn:
      'রেকর্ডটির বর্তমান হ্যাশ পূর্ববর্তী ব্লক হ্যাশের সাথে শতভাগ মিলেছে। কোনো অননুমোদিত ট্যাম্পারিং বা পরিবর্তন পাওয়া যায়নি।',
  },
];

interface ReviewCase {
  id: string;
  case_number: string;
  document_name: string;
  doc_type: string;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'returned';
  flagged_fields: string[];
  assigned_to: string;
}

interface StaffPageProps {
  onNavigateToTab?: (tab: string, params?: Record<string, string>) => void;
}

export const StaffPage: React.FC<StaffPageProps> = ({ onNavigateToTab }) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [cases, setCases] = useState<ReviewCase[]>([
    {
      id: 'c-101',
      case_number: 'REV-2026-081',
      document_name: 'verified_khatian_scan.jpg',
      doc_type: isBn ? 'খতিয়ান' : 'Khatian Record',
      created_at: '2026-03-15 10:30',
      priority: 'high',
      status: 'pending',
      flagged_fields: [isBn ? 'দাগ নং ১২০৫ (তেজগাঁও শিল্প এলাকা)' : 'Plot No. 1205 (Tejgaon Circle)'],
      assigned_to: isBn ? 'সহকারী কমিশনার (ভূমি) / রিভিউয়ার' : 'AC Land Reviewer',
    },
    {
      id: 'c-102',
      case_number: 'REV-2026-082',
      document_name: 'deed_tejgaon_4520.pdf',
      doc_type: isBn ? 'বিক্রয় কবলা দলিল' : 'Deed of Sale',
      created_at: '2026-03-15 11:15',
      priority: 'medium',
      status: 'pending',
      flagged_fields: [isBn ? 'দলিলের তারিখ ও নামজারি' : 'Registration Date & Mutation'],
      assigned_to: isBn ? 'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (তহশিলদার)' : 'Union Land Assistant Officer',
    },
    {
      id: 'c-103',
      case_number: 'REV-2026-083',
      document_name: 'porcha_gulshan_340.jpg',
      doc_type: isBn ? 'পর্চা' : 'Porcha Record',
      created_at: '2026-03-15 11:45',
      priority: 'low',
      status: 'approved',
      flagged_fields: [],
      assigned_to: isBn ? 'কানুনগো ও সার্ভেয়ার' : 'Kanungo & Surveyor',
    },
    {
      id: 'c-104',
      case_number: 'REV-2026-084',
      document_name: 'purbachal_sector17_dag7801.pdf',
      doc_type: isBn ? 'ই-নামজারি ও জমাভাগ আবেদন' : 'e-Mutation Application',
      created_at: '2026-03-16 09:20',
      priority: 'high',
      status: 'pending',
      flagged_fields: [isBn ? 'দাগ নং ৭৮০১ (পূর্বাচল স্মার্ট সিটি)' : 'Plot No. 7801 (Purbachal Smart City)'],
      assigned_to: isBn ? 'সহকারী কমিশনার (ভূমি) / এসি ল্যান্ড' : 'Assistant Commissioner (Land)',
    },
  ]);

  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(cases[0]);
  const [actionModal, setActionModal] = useState<'approve' | 'return' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [showGovGuide, setShowGovGuide] = useState<boolean>(true);
  const [activeGovRole, setActiveGovRole] = useState<string>('Supervisor');
  const [isRoleTerminalOpen, setIsRoleTerminalOpen] = useState(false);

  interface QueueCaseItem {
    id: string;
    case_number: string;
    case_type?: string;
    created_at?: string;
    priority?: string;
    status?: string;
    notes?: string;
  }

  const fetchLiveQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await api.get<{ total_pending: number; cases: QueueCaseItem[] }>('/api/v1/review/queue');
      if (res && res.cases && res.cases.length > 0) {
        const mapped: ReviewCase[] = res.cases.map((c) => ({
          id: c.id,
          case_number: c.case_number,
          document_name: c.case_type === 'MUTATION' ? 'e_namjari_application.pdf' : 'deed_record_scan.jpg',
          doc_type: c.case_type === 'MUTATION' ? (isBn ? 'নামজারি আবেদন' : 'Mutation Application') : (isBn ? 'দলিল যাচাই' : 'Deed Review'),
          created_at: c.created_at ? new Date(c.created_at).toLocaleDateString('bn-BD') : 'সাম্প্রতিক',
          priority: (c.priority?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
          status: (c.status === 'APPROVED' ? 'approved' : c.status === 'REJECTED' ? 'returned' : 'pending') as 'pending' | 'approved' | 'returned',
          flagged_fields: c.notes ? [c.notes.split('\n')[0]] : [],
          assigned_to: isBn ? 'সহকারী কমিশনার (ভূমি)' : 'Assistant Commissioner (Land)',
        }));
        setCases(mapped);
        setSelectedCase(mapped[0]);
      }
    } catch (err) {
      console.warn('Review queue API unavailable, using initialized cases:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCases = cases.filter((c) => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const handleDecision = async (decision: 'approved' | 'returned') => {
    if (!selectedCase) return;
    try {
      await api.post(`/api/v1/review/${selectedCase.case_number}/decision`, {
        decision: decision === 'approved' ? 'APPROVED' : 'REJECTED',
        notes: actionReason || (decision === 'approved' ? 'সহকারী কমিশনার (ভূমি) কর্তৃক অনুমোদন প্রদান করা হলো।' : 'পর্যালোচনা শেষে ফেরত পাঠানো হলো।'),
      });
    } catch (err) {
      console.warn('Decision endpoint call logged locally:', err);
    }
    setCases((prev) =>
      prev.map((c) =>
        c.id === selectedCase.id ? { ...c, status: decision } : c
      )
    );
    setSelectedCase((prev) => (prev ? { ...prev, status: decision } : null));
    setActionModal(null);
    setActionReason('');
  };

  const applyTemplateNote = (noteText: string, isApproval: boolean = true) => {
    setActionReason(noteText);
    setActionModal(isApproval ? 'approve' : 'return');
  };

  const currentRoleDetails = GOV_WORKER_ROLES.find((r) => r.roleId === activeGovRole) || GOV_WORKER_ROLES[2];

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors pb-28 space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isBn ? 'ভূমি প্রশাসন ও কর্মকর্তা ওয়ার্কস্পেস' : 'Land Administration Officer Workspace'}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                E-NAMJARI V4
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ইউনিয়ন তহশিলদার, কানুনগো, সার্ভেয়ার, এসি ল্যান্ড ও এডিসি রাজস্ব কর্মকর্তাদের সমন্বিত ওয়ার্কস্পেস'
                : 'Unified portal for Tahsildar, Kanungo, Surveyor, AC Land and ADC Revenue'}
            </p>
          </div>
        </div>

        {/* Filter Pills & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowGovGuide(!showGovGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isBn ? 'কর্মকর্তাদের ভূমিকা ও দায়িত্ব' : 'Gov Worker Roles'}</span>
            {showGovGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {['all', 'pending', 'approved', 'returned'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterStatus === status
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status === 'all'
                  ? (isBn ? 'সকল' : 'All')
                  : status === 'pending'
                  ? (isBn ? 'অপেক্ষমান' : 'Pending')
                  : status === 'approved'
                  ? (isBn ? 'অনুমোদিত' : 'Approved')
                  : (isBn ? 'ফেরত' : 'Returned')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLiveQueue}
            disabled={isLoadingQueue}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1219] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh review queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Government Worker Roles & Responsibilities Matrix */}
      {showGovGuide && (
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 text-white shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-300">
                {isBn
                  ? 'বাংলাদেশ ডিজিটাল ভূমি সেবা — কর্মকর্তা পদবি, দায়িত্ব ও টেস্ট একাউন্ট তালিকা'
                  : 'Bangladesh Land Administration — Hierarchy & Demo Role Accounts'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isDemoMode && (
                <button
                  onClick={() => setIsRoleTerminalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isBn ? 'রোল পরিবর্তন টার্মিনাল' : 'One-Click Role Switcher'}</span>
                </button>
              )}
              {isDemoMode && (
                <span className="text-[11px] font-mono text-slate-400">
                  {isBn ? 'ডিফল্ট পাসওয়ার্ড:' : 'Demo Password:'} <b className="text-white font-mono bg-black/60 px-2 py-0.5 rounded border border-slate-700">{DEMO_PWD}</b>
                </span>
              )}
            </div>
          </div>

          {/* Role Pill Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
            {GOV_WORKER_ROLES.map((role) => {
              const isCurrent = role.roleId === activeGovRole;
              return (
                <button
                  key={role.roleId}
                  onClick={() => setActiveGovRole(role.roleId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isCurrent
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md font-black'
                      : 'bg-black/40 text-slate-300 hover:bg-slate-800 border-slate-700'
                  }`}
                >
                  {role.nameBn.split(' ')[0]} ({role.nameEn.split(' ')[0]})
                </button>
              );
            })}
          </div>

          {/* Active Role Card Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl bg-black/50 border border-slate-800">
            <div className="md:col-span-5 space-y-2 border-r border-slate-800/80 pr-4">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${currentRoleDetails.badgeColor}`}>
                {currentRoleDetails.phase}
              </span>
              <h4 className="text-base font-black text-white mt-1">{currentRoleDetails.nameBn}</h4>
              <p className="text-xs text-slate-400 font-mono">{currentRoleDetails.nameEn}</p>

              <div className="pt-2 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ইমেইল: <b className="text-emerald-300">{currentRoleDetails.email}</b></span>
                </div>
                {isDemoMode && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBn ? 'পাসওয়ার্ড:' : 'Password:'} <b className="text-slate-200">{DEMO_PWD}</b></span>
                  </div>
                )}
              </div>

              {/* Template Action Button */}
              <div className="pt-3">
                <button
                  onClick={() => applyTemplateNote(currentRoleDetails.actionNoteBn, true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentRoleDetails.sampleAction} প্রয়োগ করুন</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-7 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                {isBn ? 'এই কর্মকর্তার মূল দায়িত্ব ও কার্যাবলী:' : 'Core Responsibilities:'}
              </span>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {currentRoleDetails.responsibilitiesBn.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Review Queue Table / Cards, Right Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Queue Table */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            {isBn ? `কেস তালিকা (${filteredCases.length})` : `Case Queue (${filteredCases.length})`}
          </span>

          <div className="flex flex-col gap-3">
            {filteredCases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-white dark:bg-[#04080c] border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.case_number}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{c.doc_type}</h4>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.status === 'pending'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          : c.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {c.status === 'pending'
                        ? (isBn ? 'অপেক্ষমান' : 'Pending')
                        : c.status === 'approved'
                        ? (isBn ? 'অনুমোদিত' : 'Approved')
                        : (isBn ? 'ফেরত' : 'Returned')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="truncate">{c.assigned_to}</span>
                    <span className="font-mono text-[11px]">{c.created_at.split(' ')[1]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Document Viewer & Decision Panel */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedCase ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isBn ? `নথি নিরীক্ষণ: ${selectedCase.document_name}` : `Inspection: ${selectedCase.document_name}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    ID: {selectedCase.case_number} • {selectedCase.doc_type}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onNavigateToTab && (
                    <>
                      <button
                        onClick={() => onNavigateToTab('verify', { recordId: selectedCase.case_number })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                        title="Open in Verification Workspace"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isBn ? 'ভেরিফিকেশন' : 'Verify'}</span>
                      </button>
                      <button
                        onClick={() => onNavigateToTab('map', { parcelId: 'P-4520' })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                        title="View Plot on 3D Cadastral Map"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isBn ? 'ম্যাপ' : 'Map'}</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setActionModal('approve')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                  </button>

                  <button
                    onClick={() => setActionModal('return')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ফেরত পাঠান' : 'Return'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Official Report Action Bar */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#070d12] border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  {isBn ? 'অফিসিয়াল অ্যাকশন:' : 'Actions:'}
                </span>
                <button
                  onClick={() => applyTemplateNote('তদন্ত প্রতিবেদন (ফরম ৯ক): সরজমিনে দখলদার যাচাই সম্পন্ন। খাস বা অর্পিত জমি নয়।', true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold transition-colors text-[11px]"
                >
                  তহশিলদার ফরম ৯ক
                </button>
                <button
                  onClick={() => applyTemplateNote('কানুনগো যাচাই প্রতিবেদন: মৌজা নকশার দাগ ও সিএস/আরএস খতিয়ান মিল রয়েছে।', true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold transition-colors text-[11px]"
                >
                  কানুনগো নকশা রিপোর্ট
                </button>
                <button
                  onClick={() => applyTemplateNote('সহকারী কমিশনার (ভূমি): শুনানির তারিখ আগামী ১৫ কার্যদিবসের মধ্যে নির্ধারণ করা হলো।', true)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold transition-colors text-[11px]"
                >
                  শুনানি নোটিশ
                </button>
                <button
                  onClick={() => applyTemplateNote('সহকারী কমিশনার (ভূমি): নামজারি প্রস্তাব চূড়ান্ত অনুমোদন ও খতিয়ান স্বাক্ষর প্রদান করা হলো।', true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold transition-colors text-[11px]"
                >
                  খতিয়ান অনুমোদন
                </button>
              </div>

              {/* Document Simulator */}
              <div className="relative rounded-2xl bg-slate-100 dark:bg-black/90 aspect-[4/3] border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-5 shadow-inner">
                <div className="w-full h-full bg-white dark:bg-[#070d12] rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between font-serif relative shadow-md">
                  <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isBn ? 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার' : 'Government of the People\'s Republic of Bangladesh'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {isBn ? 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর — খতিয়ান' : 'Directorate of Land Records and Surveys'}
                    </p>
                  </div>

                  {/* Bounding Box Overlay 1 (khatian_no) */}
                  <div className="absolute top-20 left-8 p-1.5 border border-emerald-500 rounded-lg bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-300 font-sans font-bold">
                    {isBn ? 'খতিয়ান নং: ৩৪০ [0.99]' : 'Khatian No: 340 [0.99]'}
                  </div>

                  {/* Bounding Box Overlay 2 (dag_no) */}
                  <div className="absolute top-32 right-8 p-1.5 border border-emerald-600/50 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-200 font-sans font-bold">
                    {isBn ? 'দাগ নং: ১২০৫ [যাচাই সম্পন্ন]' : 'Plot No: 1205 [Verified]'}
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-sans">
                    <p>{isBn ? 'মৌজা: তেজগাঁও শিল্প এলাকা, জেএল নং: ০১৪' : 'Mouza: Tejgaon Industrial, JL No: 014'}</p>
                    <p>{isBn ? 'মালিকের নাম: মোঃ আব্দুল করিম' : 'Owner: Md. Abdul Karim'}</p>
                    <p>{isBn ? 'অংশের পরিমাণ: ০.৩৩ একর (নাল জমি)' : 'Area: 0.33 Acres'}</p>
                  </div>

                  <div className="text-right text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 font-sans">
                    {isBn
                      ? 'ডিজিটাল অখণ্ডতা: হ্যাশ মিল (SHA-256 অখণ্ডতা যাচাই)'
                      : 'Digital Integrity: Verified SHA-256 Hash Match'}
                  </div>
                </div>
              </div>

              {selectedCase.flagged_fields.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070d12] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {isBn ? 'পর্যালোচনার কারণ: ' : 'Flagged Reason: '}
                  </span>
                  <span>{selectedCase.flagged_fields.join(', ')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800 text-slate-400">
              {isBn ? 'বাম পাশ থেকে একটি কেস নির্বাচন করুন।' : 'Select a review case from the queue.'}
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/30 shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {actionModal === 'approve'
                ? (isBn ? 'কেস অনুমোদন নিশ্চিতকরণ' : 'Confirm Case Approval')
                : (isBn ? 'কেস ফেরত পাঠানোর কারণ' : 'Specify Return Reason')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {actionModal === 'approve'
                ? (isBn
                    ? 'অনুমোদনের পর নথির স্ট্যাটাস VERIFIED_AUTHORIZED_SOURCE এ রূপান্তরিত হবে।'
                    : 'Upon approval, document status transitions to VERIFIED_AUTHORIZED_SOURCE.')
                : (isBn
                    ? 'ফেরতের কারণ উল্লেখ করুন যাতে আবেদনকারী প্রয়োজনীয় সংশোধন করতে পারেন।'
                    : 'Detail the issues so the applicant can submit the required corrections.')}
            </p>

            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={isBn ? 'মন্তব্য বা কারণ লিখুন...' : 'Enter inspection remarks...'}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-black/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-500 mb-4 transition-colors"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDecision(actionModal === 'approve' ? 'approved' : 'returned')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                  actionModal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {isBn ? 'নিশ্চিত করুন' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant RBAC Role Switch Terminal */}
      {isDemoMode && (
        <RoleSwitchTerminal
          isOpen={isRoleTerminalOpen}
          onClose={() => setIsRoleTerminalOpen(false)}
          onRoleChanged={() => {
            fetchLiveQueue();
          }}
        />
      )}
    </div>
  );
};
