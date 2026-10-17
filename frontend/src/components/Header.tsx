import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  ShieldCheck,
  User,
  UserCheck,
  Gauge,
  ChevronDown,
  Bell,
  FileCheck2,
  Menu,
  Sun,
  Moon,
  Compass,
  Search as SearchIcon,
  KeyRound,
} from 'lucide-react';
import { useNetworkStore } from '../lib/networkMonitor';
import { type UserRole, ROLE_DEFAULT_TABS } from '../lib/authStore';
import { AuthModal } from './AuthModal';
import { NotificationsModal } from './NotificationsModal';
import { OnboardingModal } from './OnboardingModal';

interface HeaderProps {
  isHealthy: boolean;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigateToTab?: (tab: string, params?: Record<string, string>) => void;
  onToggleMobileSidebar?: () => void;
  onStartTour?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isHealthy,
  currentRole,
  onRoleChange,
  onNavigateToTab,
  onToggleMobileSidebar,
  onStartTour,
  isDarkMode = true,
  onToggleTheme,
  onOpenLogin,
}) => {
  const { i18n, t } = useTranslation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const { isOnline } = useNetworkStore();

  const isBn = (i18n.language || 'bn').startsWith('bn');

  const toggleLanguage = () => {
    i18n.changeLanguage(isBn ? 'en' : 'bn');
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    if (onNavigateToTab) {
      onNavigateToTab('search', { query: quickSearch.trim() });
    }
    setQuickSearch('');
  };

  const publicRoles: Array<{ id: UserRole; labelBn: string; labelEn: string; icon: React.ElementType }> = [
    { id: 'Citizen', labelBn: 'সাধারণ নাগরিক সেবা', labelEn: 'Citizen (Public)', icon: User },
  ];

  const staffRoles: Array<{ id: UserRole; labelBn: string; labelEn: string; icon: React.ElementType }> = [
    { id: 'Operator', labelBn: 'ইউনিয়ন সহকারী কর্মকর্তা (তহশিলদার)', labelEn: 'Intake Officer (Tahsildar)', icon: UserCheck },
    { id: 'Reviewer', labelBn: 'কানুনগো ও সার্ভেয়ার (জরিপ)', labelEn: 'Kanungo & Surveyor Reviewer', icon: FileCheck2 },
    { id: 'Supervisor', labelBn: 'সহকারী কমিশনার (ভূমি) / এসি ল্যান্ড', labelEn: 'Assistant Commissioner (Land)', icon: ShieldCheck },
    { id: 'Tech Admin', labelBn: 'সিস্টেম অ্যাডমিন ও এমএল ল্যাব', labelEn: 'Technical Administrator', icon: Gauge },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#070b0e]/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-sm select-none transition-colors">
        {/* Left Section: Mobile Menu Hamburger + Logo Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              aria-label="Toggle Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Brand & Title (Clean and responsive) */}
          <div
            onClick={() => onNavigateToTab && onNavigateToTab(ROLE_DEFAULT_TABS[currentRole] || 'home')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* Show logo on mobile/tablet where sidebar is hidden */}
            <div className="lg:hidden w-8 h-8 rounded-xl overflow-hidden shadow-md shadow-emerald-950/20 border border-emerald-500/30 group-hover:border-emerald-400 transition-all shrink-0">
              <img src="/logo.png" alt="LandOS" className="w-full h-full object-cover" />
            </div>

            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate font-sans">
                {t('appName')}
              </h1>
              <span
                title={isOnline && isHealthy ? (isBn ? 'সিস্টেম সক্রিয় ও অনলাইন' : 'System Online') : (isBn ? 'অফলাইন মোড' : 'Offline Mode')}
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isOnline && isHealthy ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-amber-500'
                } animate-pulse`}
              />
            </div>
          </div>
        </div>

        {/* Center: Global Quick Search Box (Desktop / Tablet) */}
        <form
          onSubmit={handleQuickSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-md mx-2 relative"
        >
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder={isBn ? 'খতিয়ান বা দাগ নম্বর দিয়ে সরাসরি খুঁজুন...' : 'Search by Khatian, Dag or Mouza...'}
            className="w-full py-1.5 pl-9 pr-4 text-xs rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
          />
          <kbd className="absolute right-3 text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 pointer-events-none">
            ↵
          </kbd>
        </form>

        {/* Right Section Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Demo Tour Trigger Button */}
          {onStartTour && (
            <button
              onClick={onStartTour}
              className="hidden sm:inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
              title="Start Interactive Demo Tour"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isBn ? 'ট্যুর' : 'Tour'}</span>
            </button>
          )}

          {/* Language Toggle Button (tested in smoke test) */}
          <button
            onClick={toggleLanguage}
            aria-label="Toggle Language"
            className="py-1 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shrink-0"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isBn ? 'English' : 'বাংলা'}</span>
          </button>

          {/* Dark / Light Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
            </button>
          )}

          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotifModal(true)}
            className="relative p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            title="বিজ্ঞপ্তি ও নোটিফিকেশন"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {/* Role Selector Button (tested in Playwright) */}
          <div className="relative flex items-center gap-1.5">
            <button
              aria-label="Role selector"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="py-1 px-2 sm:px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate max-w-[85px] sm:max-w-none">{currentRole}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className="hidden sm:inline-flex items-center gap-1 py-1 px-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shrink-0"
                title="Authentication & Account Portal"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'একাউন্ট' : 'Account'}</span>
              </button>
            )}

            {/* Role Dropdown */}
            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#0c1219] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isBn ? 'পাবলিক সেবা' : 'Public Services'}
                </div>
                <div className="p-1 space-y-0.5">
                  {publicRoles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = r.id === currentRole;

                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          onRoleChange(r.id);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span className="truncate">{isBn ? r.labelBn : r.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {isBn ? 'সরকারি কর্মকর্তা পোর্টাল' : 'Official Staff Portal'}
                </div>
                <div className="p-1 space-y-0.5">
                  {staffRoles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = r.id === currentRole;

                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          onRoleChange(r.id);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{isBn ? r.labelBn : r.labelEn}</span>
                      </button>
                    );
                  })}
                </div>

                {onOpenLogin && (
                  <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onOpenLogin();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isBn ? 'লগইন ও একাউন্ট পোর্টাল' : 'Sign In & Account Portal'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auxiliary Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <NotificationsModal isOpen={showNotifModal} onClose={() => setShowNotifModal(false)} />
      <OnboardingModal isOpen={showOnboardModal} onClose={() => setShowOnboardModal(false)} />
    </>
  );
};
