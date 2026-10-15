import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  ShieldCheck,
  Wifi,
  WifiOff,
  User,
  UserCheck,
  Lock,
  Gauge,
  ChevronDown,
  KeyRound,
  Bell,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { useNetworkStore } from '../lib/networkMonitor';
import { useAuthStore, type UserRole, ROLE_DEFAULT_TABS } from '../lib/authStore';
import { AuthModal } from './AuthModal';
import { NotificationsModal } from './NotificationsModal';
import { OnboardingModal } from './OnboardingModal';

interface HeaderProps {
  isHealthy: boolean;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isHealthy,
  currentRole,
  onRoleChange,
  onNavigateToTab,
}) => {
  const { i18n, t } = useTranslation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);

  const { isOnline, isLowNetworkMode, setManualLowNetwork } = useNetworkStore();
  const { user, isAuthenticated } = useAuthStore();

  const toggleLanguage = () => {
    const isBn = i18n.language?.startsWith('bn');
    i18n.changeLanguage(isBn ? 'en' : 'bn');
  };

  const roles: Array<{ id: UserRole; label: string; icon: React.ElementType }> = [
    { id: 'Citizen', label: 'নাগরিক (Citizen)', icon: User },
    { id: 'Operator', label: 'অপারেটর (Operator)', icon: UserCheck },
    { id: 'Reviewer', label: 'রিভিউয়ার (Reviewer)', icon: FileCheck2 },
    { id: 'Supervisor', label: 'সুপারভাইজার (Supervisor)', icon: ShieldCheck },
    { id: 'Office Admin', label: 'অফিস অ্যাডমিন (Office Admin)', icon: Lock },
    { id: 'Regional Manager', label: 'আঞ্চলিক পরিচালক (Reg. Manager)', icon: Lock },
    { id: 'Security Officer', label: 'নিরাপত্তা কর্মকর্তা (Security)', icon: Lock },
    { id: 'Tech Admin', label: 'টেক অ্যাডমিন (Tech Admin)', icon: Gauge },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between">
        {/* Brand & Connection Dot */}
        <div
          onClick={() => onNavigateToTab && onNavigateToTab(ROLE_DEFAULT_TABS[currentRole] || 'home')}
          className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer shrink min-w-0 mr-1"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="text-xs sm:text-base font-bold text-white tracking-tight truncate max-w-[105px] xs:max-w-[140px] sm:max-w-none">
                {t('appName')}
              </h1>
              <span
                title={isOnline && isHealthy ? 'অনলাইন / ব্যাকএন্ড সক্রিয়' : 'অফলাইন / লো-নেটওয়ার্ক মোড'}
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isOnline && isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
                } animate-pulse`}
              />
            </div>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              ডিজিটাল ভূমি সেবা ও দলিল গোয়েন্দা
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotifModal(true)}
            className="relative p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors shrink-0"
            title="বিজ্ঞপ্তি ও নোটিফিকেশন"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </button>

          {/* Onboarding Help Guide */}
          <button
            onClick={() => setShowOnboardModal(true)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors shrink-0"
            title="সহায়িকা ও টিপস"
            aria-label="Help Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Low-Network Mode Toggle Pill */}
          <button
            onClick={() => setManualLowNetwork(!isLowNetworkMode)}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors shrink-0 ${
              isLowNetworkMode
                ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="লো-নেটওয়ার্ক অফলাইন মোড টগল"
          >
            {isLowNetworkMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">অফলাইন</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">অনলাইন</span>
              </>
            )}
          </button>

          {/* Auth Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors shrink-0 ${
              isAuthenticated
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="অ্যাকাউন্ট ও লগইন"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">
              {isAuthenticated ? user?.full_name_bn || 'অ্যাকাউন্ট' : 'লগইন'}
            </span>
          </button>

          {/* Role Selector Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 hover:border-slate-600 transition-colors"
              aria-label="Role selector"
            >
              <span className="capitalize text-[11px] max-w-[55px] sm:max-w-none truncate">{currentRole}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 top-10 w-60 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl animate-in fade-in z-50 text-xs space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  ভূমিকা পরিবর্তন (Role Switcher)
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        onRoleChange(r.id);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        currentRole === r.id
                          ? 'bg-primary text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 sm:p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1 shrink-0"
            aria-label="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-semibold">{i18n.language?.startsWith('bn') ? 'EN' : 'বাং'}</span>
          </button>
        </div>
      </header>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onNavigateToTab={onNavigateToTab}
      />

      <NotificationsModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onNavigateToTab={onNavigateToTab}
      />

      <OnboardingModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
      />
    </>
  );
};
