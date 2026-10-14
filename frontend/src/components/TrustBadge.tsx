import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrustStatus, TRUST_CONFIGS } from '../types/trust';

interface TrustBadgeProps {
  status: TrustStatus;
  showDescription?: boolean;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  status,
  showDescription = false,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  const config = TRUST_CONFIGS[status] || TRUST_CONFIGS.VERIFICATION_REQUIRED;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        data-testid={`trust-badge-${status}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${config.bgClass} ${config.borderClass} ${config.textClass} shadow-sm backdrop-blur-sm`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} animate-pulse`} />
        {isBn ? config.labelBn : config.labelEn}
      </span>
      {showDescription && (
        <span className="text-[11px] text-slate-400 pl-1 leading-tight">
          {isBn ? config.descriptionBn : config.descriptionEn}
        </span>
      )}
    </div>
  );
};
