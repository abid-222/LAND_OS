import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isHealthy }) => {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t('appName')}
            </h1>
            <span
              title={isHealthy ? 'Backend API Active' : 'Connecting to API'}
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-400 ring-4 ring-emerald-950' : 'bg-amber-400 ring-4 ring-amber-950'
              } animate-pulse`}
            />
          </div>
          <p className="text-[11px] text-slate-400 hidden xs:block">{t('tagline')}</p>
        </div>
      </div>

      <button
        onClick={toggleLanguage}
        className="touch-target px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
        aria-label="Toggle Language"
      >
        <Globe className="w-4 h-4 text-emerald-400" />
        <span>{i18n.language === 'bn' ? 'English' : 'বাংলা'}</span>
      </button>
    </header>
  );
};
