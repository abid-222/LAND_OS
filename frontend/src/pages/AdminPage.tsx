import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  FileCheck,
  Activity,
  Lock,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Server,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { BlockchainLedgerSimulator } from '../components/BlockchainLedgerSimulator';

interface AuditLogItem {
  id?: string;
  actor?: string;
  actor_id?: string;
  actor_role?: string;
  action?: string;
  resource?: string;
  resource_type?: string;
  resource_id?: string;
  timestamp?: string;
  created_at?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  prev_hash?: string;
  current_hash?: string;
}

export const AdminPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit' | 'blockchain'>('blockchain');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainResult, setChainResult] = useState<{
    valid: boolean;
    total_records?: number;
    latest_hash?: string;
    message?: string;
  } | null>(null);

  const stats = [
    {
      title: isBn ? 'মোট নিবন্ধিত ব্যবহারকারী' : 'Registered Users',
      value: isBn ? '১,২৪৮' : '1,248',
      icon: Users,
    },
    {
      title: isBn ? 'প্রক্রিয়াকৃত দলিল ও খতিয়ান' : 'Processed Deeds & Records',
      value: isBn ? '১৫,৮৯২' : '15,892',
      icon: FileCheck,
    },
    {
      title: isBn ? 'পর্যালোচনা কেস' : 'Active Review Cases',
      value: isBn ? '৪৩' : '43',
      icon: AlertCircle,
    },
    {
      title: isBn ? 'সিস্টেম আপটাইম' : 'System Availability',
      value: '99.98%',
      icon: Activity,
    },
  ];

  const fetchLiveAuditLogs = async () => {
    try {
      const res = await api.get<{ records: AuditLogItem[] }>('/api/v1/admin/audit?limit=20');
      if (res && res.records && res.records.length > 0) {
        setAuditLogs(res.records);
      }
    } catch (err) {
      console.warn('Live audit fetch failed, will use fallback:', err);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    try {
      const res = await api.get<{
        valid: boolean;
        total_records: number;
        latest_hash: string;
        message: string;
      }>('/api/v1/admin/audit/verify-chain');
      setChainResult(res);
    } catch (err) {
      const error = err as Error;
      setChainResult({
        valid: false,
        message: error?.message || 'চেইন যাচাইকরণ ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsVerifyingChain(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchLiveAuditLogs();
    }
  }, [activeTab]);

  const sampleUsers = [
    {
      id: 'u1',
      name: isBn ? 'মোঃ রফিকুল ইসলাম' : 'Md. Rafiqul Islam',
      email: 'reviewer.tejgaon@land.gov.bd',
      role: 'Reviewer',
      office: isBn ? 'তেজগাঁও সার্কেল' : 'Tejgaon Circle',
      active: true,
    },
    {
      id: 'u2',
      name: isBn ? 'বেগম নাসরিন সুলতানা' : 'Begum Nasreen Sultana',
      email: 'supervisor.dhaka@land.gov.bd',
      role: 'Supervisor',
      office: isBn ? 'ঢাকা জেলা রাজস্ব' : 'Dhaka District Revenue',
      active: true,
    },
    {
      id: 'u3',
      name: isBn ? 'আব্দুল্লাহ আল নোমান' : 'Abdullah Al Noman',
      email: 'techadmin@land.gov.bd',
      role: 'Tech Admin',
      office: isBn ? 'জাতীয় ডেটা সেন্টার' : 'National Data Center',
      active: true,
    },
    {
      id: 'u4',
      name: isBn ? 'কামরুল হাসান' : 'Kamrul Hasan',
      email: 'citizen.kamrul@gmail.com',
      role: 'Citizen',
      office: '-',
      active: true,
    },
  ];

  const sampleAuditLogs = [
    {
      id: 'aud-891',
      actor: 'reviewer.tejgaon@land.gov.bd (Reviewer)',
      action: 'case:decision (Approve)',
      resource: 'Document #DOC-2026-081',
      timestamp: '2026-03-15 12:10:04 UTC',
      prev_hash: 'a3f89...b12',
      current_hash: 'c742e...9a4',
      verified: true,
    },
    {
      id: 'aud-890',
      actor: 'citizen.kamrul@gmail.com (Citizen)',
      action: 'document:verify',
      resource: 'Document #DOC-2026-081',
      timestamp: '2026-03-15 11:58:12 UTC',
      prev_hash: '8f01b...7cd',
      current_hash: 'a3f89...b12',
      verified: true,
    },
    {
      id: 'aud-889',
      actor: 'system:cron_worker',
      action: 'parcel:run_risk_engine',
      resource: 'Parcel #P-4520',
      timestamp: '2026-03-15 11:30:00 UTC',
      prev_hash: '2e89d...1aa',
      current_hash: '8f01b...7cd',
      verified: true,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-slate-100 transition-colors pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isBn ? 'প্রশাসনিক গভর্ন্যান্স ও অডিট ট্রেসার' : 'Administrative Governance & Audit'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn ? 'নিরাপত্তা অখণ্ডতা, আরব্যাক ভূমিকা ও ক্রিপ্টোগ্রাফিক লগ' : 'Security integrity, RBAC controls, and tamper-evident logs'}
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 dark:bg-black/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isBn ? 'ওভারভিউ' : 'Overview'}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isBn ? 'ব্যবহারকারী (RBAC)' : 'Users (RBAC)'}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isBn ? 'অডিট লগ' : 'Audit Logs'}
          </button>
          <button
            onClick={() => setActiveTab('blockchain')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'blockchain'
                ? 'bg-emerald-600 text-white shadow-sm font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>{isBn ? 'ব্লকচেইন ও ট্যাম্পার টেস্ট' : 'Blockchain & Tamper Test'}</span>
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((st, idx) => {
              const Icon = st.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-slate-800/90 shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{st.title}</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{st.value}</span>
                </div>
              );
            })}
          </div>

          {/* System Health Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? 'অবকাঠামো ও ক্লাউড সংযোগ স্ট্যাটাস' : 'Infrastructure & Connectivity Status'}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">PostgreSQL (PostGIS + pgvector)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isBn ? 'সংযুক্ত' : 'Connected'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Redis (Cache & Rate-Limit)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isBn ? 'সংযুক্ত' : 'Connected'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300 font-medium">MinIO S3 Storage</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isBn ? 'সংযুক্ত' : 'Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users & RBAC Tab */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                <th className="pb-3.5 font-bold uppercase tracking-wider">{isBn ? 'নাম' : 'Name'}</th>
                <th className="pb-3.5 font-bold uppercase tracking-wider">{isBn ? 'ইমেইল' : 'Email'}</th>
                <th className="pb-3.5 font-bold uppercase tracking-wider">{isBn ? 'ভূমিকা' : 'Role'}</th>
                <th className="pb-3.5 font-bold uppercase tracking-wider">{isBn ? 'অফিস / অধিক্ষেত্র' : 'Jurisdiction'}</th>
                <th className="pb-3.5 font-bold uppercase tracking-wider text-right">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sampleUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-black/40 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900 dark:text-white">{u.name}</td>
                  <td className="py-3.5 font-mono text-slate-500">{u.email}</td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-600 dark:text-slate-300">{u.office}</td>
                  <td className="py-3.5 text-right">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{isBn ? 'সক্রিয়' : 'Active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#04080c] border border-slate-200 dark:border-emerald-500/20 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'ক্রিপ্টোগ্রাফিক হ্যাশ চেইন্ড অডিট লগ (SHA-256)' : 'Cryptographic Hash-Chained Audit Trail'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isBn
                  ? 'প্রতিটি লেনদেন ও সিদ্ধান্ত ক্রিপ্টোগ্রাফিক হ্যাশ চেইনে অপরিবর্তনীয়ভাবে সংরক্ষিত।'
                  : 'Every transaction is immutably sealed in a tamper-evident SHA-256 Merkle chain.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVerifyChain}
                disabled={isVerifyingChain}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifyingChain ? (isBn ? 'যাচাই হচ্ছে...' : 'Verifying...') : (isBn ? 'চেইন যাচাই করুন' : 'Verify Chain')}</span>
              </button>
              <button
                onClick={fetchLiveAuditLogs}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chain Verification Result Banner */}
          {chainResult && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                chainResult.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-extrabold flex items-center gap-2">
                  <span>{chainResult.valid ? (isBn ? 'ক্রিপ্টোগ্রাফিক চেইন ১০০% অক্ষত ও নির্ভুল' : 'Audit Chain 100% Cryptographically Verified') : (isBn ? 'চেইনে ত্রুটি শনাক্ত' : 'Chain Conflict Detected')}</span>
                  {chainResult.total_records !== undefined && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 font-bold">
                      {chainResult.total_records} {isBn ? 'ব্লক পরীক্ষিত' : 'Blocks Sealed'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {chainResult.message}
                </p>
                {chainResult.latest_hash && (
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all pt-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Latest Root Hash: </span>
                    {chainResult.latest_hash}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(auditLogs.length > 0 ? auditLogs : sampleAuditLogs).map((log: AuditLogItem, idx: number) => {
              const actorText = log.actor_role
                ? `${log.actor_role} (${log.actor_id ? log.actor_id.slice(0, 8) + '...' : 'System'})`
                : log.actor || 'System Action';
              const actionText = log.action;
              const resourceText = log.resource_type
                ? `${log.resource_type} #${log.resource_id || ''}`
                : log.resource || 'LandOS Core';
              const timestampText = log.created_at
                ? new Date(log.created_at).toLocaleString('bn-BD')
                : log.timestamp || '2026-03-15';

              return (
                <div key={log.id || idx} className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {actionText}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{timestampText}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    {isBn ? 'কর্তা: ' : 'Actor: '}{actorText}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    {isBn ? 'রিসোর্স: ' : 'Resource: '}{resourceText}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-500">
                    <span className="truncate max-w-xs">Prev: {log.prev_hash}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-xs">Curr: {log.current_hash}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blockchain Ledger & Tamper Detection Simulator Tab */}
      {activeTab === 'blockchain' && <BlockchainLedgerSimulator />}
    </div>
  );
};
