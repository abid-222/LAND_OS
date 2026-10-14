import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Camera, Search, BookOpen, FileCheck } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  const tabs = [
    { id: 'home', label: t('navHome'), icon: Home },
    { id: 'scan', label: t('navScan'), icon: Camera, highlight: true },
    { id: 'search', label: t('navSearch'), icon: Search },
    { id: 'guide', label: t('navGuide'), icon: BookOpen },
    { id: 'cases', label: t('navCases'), icon: FileCheck },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.highlight) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center -mt-5 focus:outline-none"
                aria-label={tab.label}
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white p-3 shadow-lg shadow-emerald-950/80 ring-4 ring-slate-950 flex items-center justify-center transition-transform active:scale-95">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 mt-1">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`touch-target flex flex-col items-center justify-center transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
