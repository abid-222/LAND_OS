import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  ScanLine,
  Search,
  Map as MapIcon,
  FileCheck2,
  Bot,
  Clock,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Globe,
  UserCircle2,
  X,
  Compass,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { type UserRole, canAccessTab } from '../lib/authStore';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
  currentRole: UserRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAuthModal: () => void;
  onStartTour: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
  currentRole,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenAuthModal,
  onStartTour,
  isDarkMode,
  onToggleTheme,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'bn';

  const toggleLanguage = () => {
    const next = currentLang.startsWith('bn') ? 'en' : 'bn';
    i18n.changeLanguage(next);
  };

  const navCitizen = [
    { id: 'home', labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan', labelBn: 'ডিজিটাল স্ক্যান ও ওসিআর', labelEn: 'Scan & OCR', icon: ScanLine },
    { id: 'search', labelBn: 'খতিয়ান ও দাগ রেকর্ড', labelEn: 'Record Search', icon: Search },
    { id: 'map', labelBn: '৩ডি ক্যাডাস্ট্রাল ম্যাপ', labelEn: '3D Cadastral Map', icon: MapIcon },
    { id: 'report', labelBn: 'বায়ার ডিউ ডিলিজেন্স', labelEn: 'Buyer Report', icon: FileCheck2 },
    { id: 'namjari', labelBn: 'স্মার্ট ই-নামজারি', labelEn: 'Smart E-Namjari', icon: GitBranch },
    { id: 'guide', labelBn: 'এআই ভূমি নির্দেশিকা', labelEn: 'AI Land Guide', icon: Bot },
    { id: 'ml', labelBn: 'ইন্টারেক্টিভ এমএল স্টুডিও', labelEn: 'ML Studio', icon: Sparkles },
    { id: 'pending', labelBn: 'অফলাইন কিউ', labelEn: 'Offline Queue', icon: Clock, count: pendingCount },
  ];

  const navAdmin = [
    { id: 'staff', labelBn: 'রিভিউ কিউ (Staff)', labelEn: 'Review Queue', icon: ClipboardList, reqRole: ['Operator', 'Reviewer', 'Supervisor', 'Office Admin', 'Regional Manager', 'Tech Admin'] },
    { id: 'admin', labelBn: 'প্রশাসনিক ও অডিট প্যানেল', labelEn: 'Admin & Audit Panel', icon: ShieldCheck, reqRole: ['Office Admin', 'Regional Manager', 'Security Officer', 'Tech Admin', 'Supervisor'] },
    { id: 'quality', labelBn: 'এআই অ্যাকুরেসি ল্যাব', labelEn: 'Accuracy Lab', icon: BarChart3, reqRole: ['Tech Admin'] },
  ];

  const handleSelectTab = (id: string) => {
    onTabChange(id);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-[#070b0e]/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 select-none transition-all duration-300">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/70">
        <div
          onClick={() => handleSelectTab('home')}
          className="flex items-center gap-3 cursor-pointer group overflow-hidden"
        >
          <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-lg shadow-emerald-900/30 border border-emerald-500/30 group-hover:border-emerald-400 transition-all">
            <img
              src="/logo.png"
              alt="Bangladesh LandOS Logo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay" />
          </div>

          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 font-sans">
                Land<span className="text-emerald-500 dark:text-emerald-400">OS</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  v3.0
                </span>
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider truncate">
                {currentLang === 'bn' ? 'ডিজিটাল ভূমি গোয়েন্দা' : 'Land Intelligence'}
              </span>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar Collapse"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Citizen Services */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {currentLang === 'bn' ? 'নাগরিক সেবা ও তথ্য' : 'Citizen Portals'}
            </div>
          )}
          <div className="space-y-1">
            {navCitizen.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const label = currentLang === 'bn' ? item.labelBn : item.labelEn;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/40'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate flex-1 text-left">{label}</span>}
                  {item.count && item.count > 0 ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white text-emerald-700 dark:bg-emerald-400 dark:text-slate-950'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                  {isActive && !isCollapsed && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Administration & Governance Section */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>{currentLang === 'bn' ? 'প্রশাসন ও গভর্ন্যান্স' : 'Admin & Governance'}</span>
              <span className="text-[10px] text-amber-500 font-semibold px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                RBAC
              </span>
            </div>
          )}
          <div className="space-y-1">
            {navAdmin.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAllowed = canAccessTab(item.id, currentRole);
              const label = currentLang === 'bn' ? item.labelBn : item.labelEn;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/40'
                      : isAllowed
                      ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-emerald-600 dark:hover:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex items-center justify-between flex-1 truncate text-left">
                      <span className="truncate">{label}</span>
                      {!isAllowed && (
                        <span className="text-[9px] px-1 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          Lock
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guided Demo Tour Trigger Card */}
        {!isCollapsed && (
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/20 text-slate-700 dark:text-slate-200 relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-1.5">
              <Compass className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:rotate-45 transition-transform" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {currentLang === 'bn' ? 'ইন্টারেক্টিভ ডেমো ট্যুর' : 'Interactive Demo Tour'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
              {currentLang === 'bn'
                ? 'প্রেজেন্টেশনের জন্য প্ল্যাটফর্মের মূল ৫টি ফিচার এক নজরে ঘুরে দেখুন।'
                : 'Walkthrough of the 5 core AI land intelligence modules.'}
            </p>
            <button
              onClick={onStartTour}
              className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{currentLang === 'bn' ? 'ট্যুর শুরু করুন' : 'Start Walkthrough'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Profile & Authentication Portal Shortcut */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 space-y-2">
        {/* Role & Account Identity Card */}
        <div
          onClick={onOpenAuthModal}
          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-800 transition-all ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Sign In / Manage Account"
        >
          <div className="relative">
            <UserCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 truncate">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentRole === 'Citizen' ? (currentLang === 'bn' ? 'সাধারণ নাগরিক' : 'Citizen') : currentRole}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {currentLang === 'bn' ? 'লগইন ও একাউন্ট পোর্টাল' : 'Sign In & Account Portal'}
              </div>
            </div>
          )}
        </div>

        {/* Quick Toggles: Language & Theme */}
        <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
          <button
            onClick={toggleLanguage}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            title="Toggle English / বাংলা"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-500" />
            {!isCollapsed && <span>{currentLang === 'bn' ? 'English' : 'বাংলা'}</span>}
          </button>

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            aria-label="Toggle Dark/Light Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen z-40 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />
          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
