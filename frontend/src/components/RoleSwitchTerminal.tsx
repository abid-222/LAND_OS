import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  X,
  CheckCircle2,
  Lock,
  ArrowRight,
  LogOut,
  User,
  Building,
  KeyRound,
  FileCheck2,
  ScanLine,
  MapPin,
} from 'lucide-react';
import { useAuthStore, type UserRole } from '../lib/authStore';

interface RoleSwitchTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleChanged: (role: UserRole) => void;
}

export const RoleSwitchTerminal: React.FC<RoleSwitchTerminalProps> = ({
  isOpen,
  onClose,
  onRoleChanged,
}) => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const { user, login, logout, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'citizen' | 'official'>(
    user?.role && user.role !== 'Citizen' ? 'official' : 'citizen'
  );
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const currentRole = user?.role || 'Citizen';
  const isCitizen = currentRole === 'Citizen';

  const officialRoles = [
    {
      role: 'Operator' as UserRole,
      email: 'operator@landos.gov.bd',
      titleBn: 'ইউনিয়ন ভূমি সহকারী কর্মকর্তা',
      titleEn: 'Union Land Assistant Officer',
      officeBn: 'তেজগাঁও সার্কেল অফিস',
      officeEn: 'Tejgaon Circle Office',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      reqMfa: false,
    },
    {
      role: 'Reviewer' as UserRole,
      email: 'reviewer@landos.gov.bd',
      titleBn: 'কানুনগো ও সার্ভেয়ার যাচাইকারী',
      titleEn: 'Kanungo & Surveyor Reviewer',
      officeBn: 'উপজেলা ভূমি অফিস',
      officeEn: 'Upazila Land Office',
      badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      reqMfa: false,
    },
    {
      role: 'Supervisor' as UserRole,
      email: 'supervisor@landos.gov.bd',
      titleBn: 'সহকারী কমিশনার (ভূমি)',
      titleEn: 'Assistant Commissioner (Land)',
      officeBn: 'সার্কেল এসিল্যান্ড কার্যালয়',
      officeEn: 'AC Land Circle Office',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      reqMfa: false,
    },
    {
      role: 'Office Admin' as UserRole,
      email: 'officeadmin@landos.gov.bd',
      titleBn: 'উপজেলা ভূমি রেকর্ড ও প্রশাসনিক কর্মকর্তা',
      titleEn: 'Upazila Land Administrator',
      officeBn: 'রেকর্ড ও প্রশাসন শাখা',
      officeEn: 'Records & Administration Wing',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      reqMfa: false,
    },
    {
      role: 'Regional Manager' as UserRole,
      email: 'regionalmanager@landos.gov.bd',
      titleBn: 'অতিরিক্ত জেলা প্রশাসক (রাজস্ব)',
      titleEn: 'Additional Deputy Commissioner (Revenue)',
      officeBn: 'ঢাকা জেলা রাজস্ব শাখা',
      officeEn: 'Dhaka District Revenue Wing',
      badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
      reqMfa: false,
    },
    {
      role: 'Security Officer' as UserRole,
      email: 'securityofficer@landos.gov.bd',
      titleBn: 'সাইবার ও অডিট নিরাপত্তা কর্মকর্তা',
      titleEn: 'Cyber & Audit Security Officer',
      officeBn: 'জাতীয় নিরাপত্তা কমান্ড',
      officeEn: 'National Security Command',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      reqMfa: true,
    },
    {
      role: 'Tech Admin' as UserRole,
      email: 'techadmin@landos.gov.bd',
      titleBn: 'সিস্টেম টেকনিক্যাল অ্যাডমিন',
      titleEn: 'System Technical Administrator',
      officeBn: 'ল্যান্ডওএস গভর্ন্যান্স কোর',
      officeEn: 'LandOS Governance Core',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      reqMfa: true,
    },
  ];

  const handleInstantSwitch = async (roleItem: { role: UserRole; email: string; titleBn: string; titleEn: string; reqMfa?: boolean }) => {
    setStatusMsg(null);
    try {
      await login(roleItem.email, 'Password123!', roleItem.reqMfa ? '123456' : undefined);
      setStatusMsg({
        type: 'success',
        text: isBn
          ? `সফলভাবে ${roleItem.titleBn} হিসেবে লগইন সম্পন্ন হয়েছে!`
          : `Signed in as ${roleItem.titleEn}!`,
      });
      onRoleChanged(roleItem.role);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      onRoleChanged(roleItem.role);
      setStatusMsg({
        type: 'success',
        text: isBn ? `${roleItem.titleBn} সেশন সক্রিয় করা হয়েছে।` : `${roleItem.titleEn} session active.`,
      });
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const handleLogout = async () => {
    await logout();
    onRoleChanged('Citizen');
    setStatusMsg({
      type: 'success',
      text: isBn ? 'সফলভাবে লগআউট সম্পন্ন হয়েছে।' : 'Signed out successfully.',
    });
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const currentOfficial = officialRoles.find((r) => r.role === currentRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#04080c] rounded-3xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Authentication & Account Portal / একাউন্ট ও সাইন-ইন
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn ? 'নাগরিক সেবা ও অফিসিয়াল কর্মকর্তা প্রবেশাধিকার' : 'Citizen Access & Government Official Clearance'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close Authentication Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Citizen vs Government Officials */}
        <div className="px-6 pt-3 pb-2 bg-slate-100/70 dark:bg-black/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'citizen'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen Portal / সাধারণ নাগরিক</span>
          </button>

          <button
            onClick={() => setActiveTab('official')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'official'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Government Officials / কর্মকর্তা ও প্রশাসন</span>
          </button>
        </div>

        {/* Feedback message banner */}
        {statusMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: Citizen View */}
        {activeTab === 'citizen' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white dark:bg-[#000000]">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#070d12] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Public Citizen Account / সাধারণ নাগরিক একাউন্ট
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {isCitizen ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'অতিথি মোড' : 'Guest Mode')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'সারাদেশের সকল নাগরিকের জন্য উন্মুক্ত ডিজিটাল ভূমি সেবা প্ল্যাটফর্ম।'
                      : 'Open sovereign land registry and intelligence portal for all citizens.'}
                  </p>
                </div>
              </div>

              {isCitizen ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {isBn ? 'নাগরিক হিসেবে লগইন আছেন' : 'Logged In as Citizen'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-white font-bold px-3 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-600 transition-all shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isBn ? 'লগআউট' : 'Sign Out'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    handleInstantSwitch({
                      role: 'Citizen',
                      email: 'citizen@landos.gov.bd',
                      titleBn: 'সাধারণ নাগরিক',
                      titleEn: 'Citizen',
                    })
                  }
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>{isBn ? 'নাগরিক মোডে ফিরুন' : 'Switch to Citizen View'}</span>
                </button>
              )}
            </div>

            {/* Citizen Enabled Features Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                <ScanLine className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Deed OCR Scanner / দলিল স্ক্যান
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn ? 'মোবাইল দিয়ে খতিয়ান স্ক্যান ও টেক্সট নিষ্কাশন' : 'On-device camera scanning and extraction'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                <FileCheck2 className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Record Search / খতিয়ান অনুসন্ধান
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn ? 'দাগ ও খতিয়ান নম্বর দিয়ে দ্রুত মালিকানা যাচাই' : 'Instant multi-identifier parcel lookup'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-cyan-500 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    3D Cadastral Map / স্যাটেলাইট মানচিত্র
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn ? 'জমির সীমানা ও রাস্তার নেটওয়ার্ক পর্যবেক্ষণ' : 'Interactive parcel polygon exploration'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-black/60 border border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    Buyer Due Diligence / ক্রেতার ঝুঁকি যাচাই
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn ? 'জমি ক্রয়ের পূর্বে ৬-দফা আইনি ঝুঁকি রিপোর্ট' : 'Pre-purchase conflict analysis report'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Government Officials View */}
        {activeTab === 'official' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#000000]">
            {/* Active Official Banner if logged in */}
            {currentOfficial && (
              <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {isBn ? 'সক্রিয় কর্মকর্তা সেশন' : 'Active Officer Session'}
                    </span>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {isBn ? currentOfficial.titleBn : currentOfficial.titleEn}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isBn ? currentOfficial.officeBn : currentOfficial.officeEn} • {currentOfficial.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-white font-bold px-3 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-600 transition-all shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isBn ? 'লগআউট' : 'Sign Out'}</span>
                </button>
              </div>
            )}

            {/* Official Roles Grid */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {officialRoles.map((item) => {
                const isCurrent = currentRole === item.role;

                return (
                  <div
                    key={item.role}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-50/60 dark:bg-[#070d12] border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                        >
                          {item.role}
                        </span>
                        {item.reqMfa && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {isBn ? 'এমএফএ ভেরিফাইড' : 'MFA Verified'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {isBn ? item.titleBn : item.titleEn}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {isBn ? item.officeBn : item.officeEn}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                        {item.email}
                      </p>
                    </div>

                    <button
                      onClick={() => handleInstantSwitch(item)}
                      disabled={isLoading}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white cursor-default shadow-sm'
                          : 'bg-slate-200/70 dark:bg-[#0e1720] hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBn ? 'সক্রিয় কর্মকর্তা সেশন' : 'Active Officer'}</span>
                        </>
                      ) : (
                        <>
                          <span>{isBn ? 'কর্মকর্তা হিসেবে লগইন' : 'Official Sign In'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 bg-slate-50/70 dark:bg-black/60 flex items-center justify-between">
          <span>{isBn ? 'নিরাপদ এনক্রিপ্ট লগইন সেশন' : 'Secure Encrypted Session'}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {isBn ? 'ল্যান্ডওএস প্রশাসনিক নিরাপত্তা' : 'LandOS Governance Security'}
          </span>
        </div>
      </div>
    </div>
  );
};

