import React from 'react';
import { Home, Camera, Search, Map, BookOpen, UploadCloud } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
}) => {
  const tabs = [
    { id: 'home', label: 'হোম', icon: Home },
    { id: 'search', label: 'অনুসন্ধান', icon: Search },
    { id: 'scan', label: 'স্ক্যান', icon: Camera, highlight: true },
    { id: 'map', label: 'মানচিত্র', icon: Map },
    { id: 'guide', label: 'সহায়ক', icon: BookOpen },
    { id: 'pending', label: 'সংরক্ষিত', icon: UploadCloud, badge: pendingCount },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-lg mx-auto grid grid-cols-6 h-16 items-center px-1">
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
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-primary to-emerald-400 text-white p-3 shadow-lg shadow-emerald-950/80 ring-4 ring-slate-950 flex items-center justify-center transition-transform active:scale-95">
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
              className={`touch-target relative flex flex-col items-center justify-center transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold rounded-full bg-amber-500 text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
