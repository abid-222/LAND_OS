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
} from 'lucide-react';
import { useNetworkStore } from '../lib/networkMonitor';

interface HeaderProps {
  isHealthy: boolean;
  currentRole: 'citizen' | 'staff' | 'admin' | 'quality';
  onRoleChange: (role: 'citizen' | 'staff' | 'admin' | 'quality') => void;
}

export const Header: React.FC<HeaderProps> = ({
  isHealthy,
  currentRole,
  onRoleChange,
}) => {
  const { i18n, t } = useTranslation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const { isOnline, isLowNetworkMode, setManualLowNetwork } = useNetworkStore();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(nextLang);
  };

  const roles = [
    { id: 'citizen', label: 'নাগরিক পোর্টাল (Citizen)', icon: User },
    { id: 'staff', label: 'কর্মকর্তা ওয়ার্কস্পেস (Staff)', icon: UserCheck },
    { id: 'admin', label: 'প্রশাসনিক প্যানেল (Admin)', icon: Lock },
    { id: 'quality', label: 'কোয়ালিটি ল্যাব (Quality Lab)', icon: Gauge },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between">
      {/* Brand & Connection Dot */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {t('appName')}
            </h1>
            <span
              title={isOnline ? 'Online / Backend Healthy' : 'Offline / Low-Network Active'}
              className={`w-2 h-2 rounded-full ${
                isOnline && isHealthy ? 'bg-emerald-400' : 'bg-amber-400'
              } animate-pulse`}
            />
          </div>
          <span className="text-[10px] text-slate-400 hidden xs:inline">
            ডিজিটাল ভূমি সেবা ও দলিল গোয়েন্দা
          </span>
        </div>
      </div>

      {/* Right Controls: Low-Network Toggle, Role Selector & Language */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Low-Network Mode Toggle Pill */}
        <button
          onClick={() => setManualLowNetwork(!isLowNetworkMode)}
          className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
            isLowNetworkMode
              ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title="লো-নেটওয়ার্ক অফলাইন মোড টগল"
        >
          {isLowNetworkMode ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">অফলাইন মোড</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">অনলাইন</span>
            </>
          )}
        </button>

        {/* Role Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 hover:border-slate-600 transition-colors"
          >
            <span className="capitalize">{currentRole}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-10 w-56 p-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl animate-in fade-in z-50 text-xs space-y-1">
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
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1"
          aria-label="Toggle Language"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold">{i18n.language === 'bn' ? 'EN' : 'বাং'}</span>
        </button>
      </div>
    </header>
  );
};
