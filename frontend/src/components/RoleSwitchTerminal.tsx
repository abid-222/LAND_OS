import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  X,
  CheckCircle2,
  Lock,
  LogOut,
  User,
  Building,
  KeyRound,
  FileCheck2,
  ScanLine,
  ClipboardList,
  Eye,
  EyeOff,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuthStore, type UserRole } from '../lib/authStore';

interface RoleSwitchTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleChanged: (role: UserRole) => void;
}

interface RoleConfig {
  role: UserRole;
  category: 'citizen' | 'official';
  email: string;
  defaultPass: string;
  defaultMfa?: string;
  titleBn: string;
  titleEn: string;
  officeBn: string;
  officeEn: string;
  descBn: string;
  descEn: string;
  badgeColor: string;
  reqMfa: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export const RoleSwitchTerminal: React.FC<RoleSwitchTerminalProps> = ({
  isOpen,
  onClose,
  onRoleChanged,
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const { user, login, logout, isLoading, isAuthenticated } = useAuthStore();
  const currentRole = user?.role || 'Citizen';

  const allRoles: RoleConfig[] = [
    {
      role: 'Citizen',
      category: 'citizen',
      email: 'citizen@landos.gov.bd',
      defaultPass: 'Password123!',
      titleBn: 'সাধারণ নাগরিক (Citizen)',
      titleEn: 'General Citizen / Public User',
      officeBn: 'সর্বসাধারণ নাগরিক পোর্টাল',
      officeEn: 'Citizen Public Portal',
      descBn: 'খতিয়ান অনুসন্ধান, ই-নামজারি আবেদন, ৩ডি স্যাটেলাইট ম্যাপ ও বায়ার ডিউ ডিলিজেন্স রিপোর্ট।',
      descEn: 'Public record search, mutation petitions, 3D cadastral maps, and buyer due diligence.',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      reqMfa: false,
      icon: User,
    },
    {
      role: 'Operator',
      category: 'official',
      email: 'operator@landos.gov.bd',
      defaultPass: 'Password123!',
      titleBn: 'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (Operator)',
      titleEn: 'Union Land Assistant Officer (Operator)',
      officeBn: 'তেজগাঁও সার্কেল ইউনিয়ন ভূমি অফিস',
      officeEn: 'Tejgaon Circle Union Land Office',
      descBn: 'নাগরিকের দলিল স্ক্যান, নামজারি আবেদন গ্রহণ ও ইউনিয়ন পর্যায়ের প্রাথমিক প্রস্তাব প্রণয়ন।',
      descEn: 'Document scanning, mutation intake, and primary union parcel proposals.',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      reqMfa: false,
      icon: ScanLine,
    },
    {
      role: 'Reviewer',
      category: 'official',
      email: 'reviewer@landos.gov.bd',
      defaultPass: 'Password123!',
      titleBn: 'কানুনগো ও সার্ভেয়ার যাচাইকারী (Reviewer)',
      titleEn: 'Kanungo & Surveyor Reviewer',
      officeBn: 'উপজেলা ভূমি অফিস ও সার্ভে শাখা',
      officeEn: 'Upazila Land Office & Survey Wing',
      descBn: 'দলিল স্বত্ব ও সীমানা বিরোধ যাচাই, খতিয়ান চেইন পরীক্ষা ও সরেজমিন সার্ভে রিপোর্ট।',
      descEn: 'Title verification, boundary dispute inspection, and surveyor field reports.',
      badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      reqMfa: false,
      icon: ClipboardList,
    },
    {
      role: 'Supervisor',
      category: 'official',
      email: 'supervisor@landos.gov.bd',
      defaultPass: 'Password123!',
      titleBn: 'সহকারী কমিশনার - ভূমি / এসিল্যান্ড (Supervisor)',
      titleEn: 'Assistant Commissioner - Land / AC Land',
      officeBn: 'সার্কেল এসিল্যান্ড কার্যালয়',
      officeEn: 'AC Land Circle Office',
      descBn: 'চূড়ান্ত নামজারি ও জমাভাগ অনুমোদন, রিভিউ কেস নিষ্পত্তি ও আনুষ্ঠানিক খতিয়ান আদেশ জারি।',
      descEn: 'Final mutation and subdivision approvals, review case disposal, and executive orders.',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      reqMfa: false,
      icon: Shield,
    },
    {
      role: 'Office Admin',
      category: 'official',
      email: 'officeadmin@landos.gov.bd',
      defaultPass: 'Password123!',
      titleBn: 'উপজেলা ভূমি রেকর্ড ও প্রশাসনিক কর্মকর্তা (Office Admin)',
      titleEn: 'Upazila Land Records & Administration Wing',
      officeBn: 'উপজেলা প্রশাসন ও রেকর্ড উইং',
      officeEn: 'Upazila Administration & Records Wing',
      descBn: 'খতিয়ান রেকর্ড ও গেজেট হালনাগাদ, কর্মকর্তা অ্যাসাইনমেন্ট ও জেলা সমন্বয়।',
      descEn: 'Record & gazette updates, official workload assignment, and administrative audit.',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      reqMfa: false,
      icon: Building,
    },
    {
      role: 'Regional Manager',
      category: 'official',
      email: 'regionalmanager@landos.gov.bd',
      defaultPass: 'Password123!',
      titleBn: 'অতিরিক্ত জেলা প্রশাসক - রাজস্ব / এডিসি (Regional Manager)',
      titleEn: 'Additional Deputy Commissioner - Revenue / ADC',
      officeBn: 'ঢাকা জেলা প্রশাসকের কার্যালয় (রাজস্ব শাখা)',
      officeEn: 'Dhaka DC Office (Revenue Division)',
      descBn: 'জেলা ভিত্তিক রাজস্ব ও খাসজমি তদারকি, আপিল রিভিউ ও ভূমি নীতিমালা বাস্তবায়ন।',
      descEn: 'District-wide land revenue oversight, appeal reviews, and governance enforcement.',
      badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
      reqMfa: false,
      icon: FileCheck2,
    },
    {
      role: 'Security Officer',
      category: 'official',
      email: 'securityofficer@landos.gov.bd',
      defaultPass: 'Password123!',
      defaultMfa: '123456',
      titleBn: 'সাইবার ও অডিট নিরাপত্তা কর্মকর্তা (Security Officer)',
      titleEn: 'Cyber & Audit Security Officer',
      officeBn: 'জাতীয় ভূমি তথ্য নিরাপত্তা কমান্ড',
      officeEn: 'National Land Security Command',
      descBn: 'SHA-256 অডিট লগ চেইন ক্রিপ্টোগ্রাফিক যাচাই, ফিশিং প্রতিরোধ ও অ্যাক্সেস কন্ট্রোল।',
      descEn: 'Cryptographic SHA-256 audit chain verification, unauthorized tamper monitoring, and MFA security.',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      reqMfa: true,
      icon: Lock,
    },
    {
      role: 'Tech Admin',
      category: 'official',
      email: 'techadmin@landos.gov.bd',
      defaultPass: 'Password123!',
      defaultMfa: '123456',
      titleBn: 'সিস্টেম টেকনিক্যাল অ্যাডমিন (Tech Admin)',
      titleEn: 'System Technical Administrator',
      officeBn: 'ল্যান্ডওএস গভর্ন্যান্স কোর ও এআই ল্যাব',
      officeEn: 'LandOS Governance Core & AI Lab',
      descBn: 'মেশিন লার্নিং ইভ্যালুয়েশন ল্যাব, এআই পাইপলাইন রিলিজ গেট ও সার্ভার কনফিগারেশন।',
      descEn: 'ML benchmark evaluation lab, AI release gates, and platform infrastructure orchestration.',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      reqMfa: true,
      icon: KeyRound,
    },
  ];

  // Selected role tab for login
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);

  // Form states per role
  const activeRoleConfig = allRoles.find((r) => r.role === selectedRole) || allRoles[0];
  const [formEmail, setFormEmail] = useState(activeRoleConfig.email);
  const [formPassword, setFormPassword] = useState(activeRoleConfig.defaultPass);
  const [formMfa, setFormMfa] = useState(activeRoleConfig.defaultMfa || '');
  const [showPassword, setShowPassword] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When switching selected role tab, update form prefill
  const handleSelectRoleTab = (roleCfg: RoleConfig) => {
    setSelectedRole(roleCfg.role);
    setFormEmail(roleCfg.email);
    setFormPassword(roleCfg.defaultPass);
    setFormMfa(roleCfg.defaultMfa || '');
    setStatusMsg(null);
  };

  if (!isOpen) return null;

  const isCurrentActive = isAuthenticated && user?.role === selectedRole;

  // Manual form submit
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setIsSubmitting(true);
    try {
      const res = await login(formEmail, formPassword, activeRoleConfig.reqMfa ? formMfa : undefined);
      setIsSubmitting(false);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: isBn
            ? `সফলভাবে ${activeRoleConfig.titleBn} হিসেবে সাইন-ইন সম্পন্ন হয়েছে!`
            : `Signed in as ${activeRoleConfig.titleEn} successfully!`,
        });
        onRoleChanged(activeRoleConfig.role);
        setTimeout(() => onClose(), 700);
      } else {
        setStatusMsg({
          type: 'error',
          text: res.error || (isBn ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' : 'Invalid credentials provided.'),
        });
      }
    } catch {
      setIsSubmitting(false);
      onRoleChanged(activeRoleConfig.role);
      setTimeout(() => onClose(), 700);
    }
  };

  // 1-Click Demo Login / Easy Access
  const handleEasyAccessLogin = async (roleCfg: RoleConfig) => {
    setStatusMsg(null);
    setIsSubmitting(true);
    try {
      const res = await login(
        roleCfg.email,
        roleCfg.defaultPass,
        roleCfg.reqMfa ? roleCfg.defaultMfa || '123456' : undefined
      );
      setIsSubmitting(false);
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: isBn
            ? `১-ক্লিকে সংরক্ষিত ডেমো একাউন্ট (${roleCfg.titleBn}) সক্রিয় করা হয়েছে!`
            : `1-Click Demo Account (${roleCfg.titleEn}) active!`,
        });
        onRoleChanged(roleCfg.role);
        setTimeout(() => onClose(), 650);
      } else {
        setStatusMsg({
          type: 'error',
          text: res.error || (isBn ? 'ডেমো লগইন ব্যর্থ হয়েছে।' : 'Demo login failed.'),
        });
      }
    } catch {
      setIsSubmitting(false);
      onRoleChanged(roleCfg.role);
      setTimeout(() => onClose(), 650);
    }
  };

  const handleLogout = async () => {
    await logout();
    onRoleChanged('Citizen');
    setStatusMsg({
      type: 'success',
      text: isBn ? 'সফলভাবে লগআউট সম্পন্ন হয়েছে।' : 'Signed out successfully.',
    });
    setTimeout(() => onClose(), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#060a0f] rounded-3xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/90 dark:bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                <span>Multi-Role Authentication Portal</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  8-Role RBAC
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'প্রত্যেকটি ভূমিকার জন্য আলাদা লগইন অপশন এবং সংরক্ষিত ডেমো একাউন্ট'
                  : 'Dedicated credential login & instant 1-click access for every official role'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {statusMsg && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Role Tabs Strip (Scrollable horizontally) */}
        <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-black/50 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 px-1">
            {isBn ? 'ভূমিকা নির্বাচন:' : 'Select Role:'}
          </span>
          {allRoles.map((r) => {
            const isTabActive = selectedRole === r.role;
            const Icon = r.icon;
            const isCurrentlyUser = user?.role === r.role;

            return (
              <button
                key={r.role}
                onClick={() => handleSelectRoleTab(r)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 relative ${
                  isTabActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white dark:bg-[#0c1218] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isTabActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{r.role}</span>
                {isCurrentlyUser && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Body: Two Columns on large screens */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-5 bg-white dark:bg-[#000000]">
          {/* Left Column: Role Details & Scope (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-slate-50 dark:bg-[#070d13] border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${activeRoleConfig.badgeColor}`}
                >
                  {activeRoleConfig.role}
                </span>
                {activeRoleConfig.reqMfa ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {isBn ? 'TOTP MFA আবশ্যক' : 'MFA Required'}
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {isBn ? 'স্ট্যান্ডার্ড অথেনটিকেশন' : 'Standard Auth'}
                  </span>
                )}
              </div>

              <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {isBn ? activeRoleConfig.titleBn : activeRoleConfig.titleEn}
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                {isBn ? activeRoleConfig.officeBn : activeRoleConfig.officeEn}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                {isBn ? activeRoleConfig.descBn : activeRoleConfig.descEn}
              </p>
            </div>

            {/* Current Session Indicator */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrentActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {isBn ? 'সেশন স্ট্যাটাস' : 'Session Status'}
                  </span>
                  <span
                    className={`text-xs font-extrabold ${
                      isCurrentActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {isCurrentActive
                      ? (isBn ? 'বর্তমানে সক্রিয় একাউন্ট' : 'Currently Active')
                      : (isBn ? 'সাইন-ইন প্রয়োজন' : 'Inactive')}
                  </span>
                </div>
              </div>

              {isCurrentActive && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-white font-bold px-2.5 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-600 transition-all shadow-sm"
                >
                  <LogOut className="w-3 h-3" />
                  <span>{isBn ? 'লগআউট' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Dedicated Login Form + Easy Access Button (7 cols) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            {/* Form Section */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#070d13] border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-3.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-500" />
                  <span>
                    {isBn
                      ? `${activeRoleConfig.role} লগইন অপশন (Manual Credentials)`
                      : `${activeRoleConfig.role} Credential Login`}
                  </span>
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">POST /api/v1/auth/login</span>
              </div>

              <form onSubmit={handleManualLogin} className="space-y-3">
                {/* Email Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isBn ? 'অফিসিয়াল ইমেইল / ইউজার আইডি' : 'Official Email / User Identifier'}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isBn ? 'গোপন পাসওয়ার্ড' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* TOTP MFA Field (If required) */}
                {activeRoleConfig.reqMfa && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center justify-between">
                      <span>{isBn ? 'নিরাপত্তা TOTP কোড (MFA Token)' : 'Security TOTP Code (MFA)'}</span>
                      <span className="text-[10px] font-normal font-mono">Demo: 123456</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formMfa}
                      onChange={(e) => setFormMfa(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-amber-400/40 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
                    />
                  </div>
                )}

                {/* Submit Manual Login Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? (isBn ? 'যাচাই ও সাইন-ইন হচ্ছে...' : 'Verifying & Signing In...')
                      : (isBn ? `${activeRoleConfig.role} হিসেবে সাইন-ইন করুন` : `Sign In as ${activeRoleConfig.role}`)}
                  </span>
                </button>
              </form>
            </div>

            {/* Easy Access / 1-Click Saved Demo Login Card */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md shadow-emerald-500/5">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <h6 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    {isBn ? 'সংরক্ষিত ডেমো একাউন্ট (Easy Access)' : 'Saved Demo Credentials (Easy Access)'}
                  </h6>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 font-mono">
                  {activeRoleConfig.email} • {activeRoleConfig.defaultPass}
                  {activeRoleConfig.reqMfa ? ' • MFA: 123456' : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEasyAccessLogin(activeRoleConfig)}
                disabled={isSubmitting || isLoading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>{isBn ? '১-ক্লিকে ডেমো লগইন' : '1-Click Demo Login'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer with security disclaimer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 bg-slate-50/80 dark:bg-black/60 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isBn ? 'নিরাপদ এনক্রিপ্টেড সেশন ও CSRF গার্ড' : 'Double-Submit CSRF Guard Active'}</span>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {isBn ? 'জাতীয় ভূমি সেবা গভর্ন্যান্স' : 'Bangladesh LandOS v3.2'}
          </span>
        </div>
      </div>
    </div>
  );
};
