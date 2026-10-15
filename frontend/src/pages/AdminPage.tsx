import React, { useState } from 'react';
import {
  Users,
  FileCheck,
  Activity,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Server,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit'>('overview');

  const stats = [
    { title: 'মোট নিবন্ধিত ব্যবহারকারী', value: '১,২৪৮', icon: Users, color: 'text-emerald-400' },
    { title: 'প্রক্রিয়াকৃত দলিল ও খতিয়ান', value: '১৫,৮৯২', icon: FileCheck, color: 'text-sky-400' },
    { title: 'অনিষ্পন্ন রিভিউ কেস', value: '৪৩', icon: AlertTriangle, color: 'text-amber-400' },
    { title: 'সিস্টেম আপটাইম', value: '৯৯.৯৮%', icon: Activity, color: 'text-emerald-400' },
  ];

  const sampleUsers = [
    { id: 'u1', name: 'মোঃ রফিকুল ইসলাম', email: 'reviewer.tejgaon@land.gov.bd', role: 'Reviewer', office: 'তেজগাঁও এসি ল্যান্ড', active: true },
    { id: 'u2', name: 'বেগম নাসরিন সুলতানা', email: 'supervisor.dhaka@land.gov.bd', role: 'Supervisor', office: 'ঢাকা জেলা কালেক্টরেট', active: true },
    { id: 'u3', name: 'আব্দুল্লাহ আল নোমান', email: 'techadmin@land.gov.bd', role: 'Tech Admin', office: 'কেন্দ্রীয় ডাটা সেন্টার', active: true },
    { id: 'u4', name: 'কামরুল হাসান', email: 'citizen.kamrul@gmail.com', role: 'Citizen', office: '-', active: true },
  ];

  const sampleAuditLogs = [
    {
      id: 'aud-891',
      actor: 'reviewer.tejgaon@land.gov.bd (Reviewer)',
      action: 'case:decision (Approve)',
      resource: 'Document #DOC-2026-081',
      timestamp: '২০২৬-০৩-১৫ ১২:১০:০৪ UTC',
      prev_hash: 'a3f89...b12',
      current_hash: 'c742e...9a4',
      verified: true,
    },
    {
      id: 'aud-890',
      actor: 'citizen.kamrul@gmail.com (Citizen)',
      action: 'document:verify',
      resource: 'Document #DOC-2026-081',
      timestamp: '২০২৬-০৩-১৫ ১১:৫৮:১২ UTC',
      prev_hash: '8f01b...7cd',
      current_hash: 'a3f89...b12',
      verified: true,
    },
    {
      id: 'aud-889',
      actor: 'system:cron_worker',
      action: 'parcel:run_risk_engine',
      resource: 'Parcel #P-4520',
      timestamp: '২০২৬-০৩-১৫ ১১:৩০:০০ UTC',
      prev_hash: '2e89d...1aa',
      current_hash: '8f01b...7cd',
      verified: true,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Lock className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-white">প্রশাসনিক প্যানেল ও অডিট ট্রেসার</h1>
            <p className="text-xs text-slate-400">নিরাপত্তা অখণ্ডতা ও ভূমিকা ব্যবস্থাপনা</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-primary text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            ওভারভিউ
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'users' ? 'bg-primary text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            ব্যবহারকারী (RBAC)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-primary text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            অডিট লগ
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
                <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">{st.title}</span>
                    <Icon className={`w-4 h-4 ${st.color}`} />
                  </div>
                  <span className="text-2xl font-bold text-white font-mono">{st.value}</span>
                </div>
              );
            })}
          </div>

          {/* System Health Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>অবকাঠামো ও সংযোগ স্ট্যাটাস</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">PostgreSQL (PostGIS + pgvector)</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> সংযুক্ত
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Redis (সেশন ও রেট লিমিট)</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> সংযুক্ত
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">MinIO S3 অবজেক্ট স্টোরেজ</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> সংযুক্ত
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users & RBAC Tab */}
      {activeTab === 'users' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">নাম</th>
                <th className="pb-3 font-semibold">ইমেইল</th>
                <th className="pb-3 font-semibold">ভূমিকা (Role)</th>
                <th className="pb-3 font-semibold">অফিস / অধিক্ষেত্র</th>
                <th className="pb-3 font-semibold text-right">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sampleUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-850">
                  <td className="py-3 font-medium text-white">{u.name}</td>
                  <td className="py-3 font-mono text-slate-400">{u.email}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-emerald-300 border border-primary/30">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3">{u.office}</td>
                  <td className="py-3 text-right">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />
                    সক্রিয়
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-emerald-400" />
              <span>ক্রিপ্টোগ্রাফিক হ্যাশ চেইন্ড অডিট লগ (SHA-256)</span>
            </h3>
            <span className="text-[11px] text-emerald-400 font-medium">অখণ্ডতা যাচাইকৃত (Tamper-evident)</span>
          </div>

          <div className="flex flex-col gap-3">
            {sampleAuditLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-white">{log.action}</span>
                  <span className="text-slate-500 font-mono text-[10px]">{log.timestamp}</span>
                </div>
                <p className="text-slate-300 text-[11px]">কর্তা: {log.actor}</p>
                <p className="text-slate-400 text-[11px]">রিসোর্স: {log.resource}</p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
                  <span>Prev: {log.prev_hash}</span>
                  <span className="text-emerald-400 font-bold">Curr: {log.current_hash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
