import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './landtech.css';
import { CadastralScene, defaultDemoParcels } from './CadastralScene';
import { MapPin, FileCheck2 } from 'lucide-react';

interface LandTechShowcaseProps {
  onNavigateToTab?: (tab: string, params?: Record<string, string>) => void;
  isDarkMode?: boolean;
}

const copy = {
  en: {
    eyebrow: 'LANDTECH INTELLIGENCE PLATFORM',
    title: 'Every parcel. Clearly verified.',
    subtitle: 'A smarter workspace for land documents, record matching and cadastral intelligence.',
    map: 'Cadastral 3D overview',
    live: 'INTERACTIVE 3D GIS',
    selected: 'Selected parcel details',
    area: 'Recorded area',
    status: 'Verification status',
    verified: 'Verified Authentic',
    review: 'Needs Staff Review',
    pending: 'Pending Ingestion',
    action: 'Open Verification Workspace',
    openMap: 'Open Full 3D Map',
    openReport: 'View Buyer Due Diligence',
    note: 'Illustrative geometry only · Connect your real PostGIS API for authoritative cadastral parcel boundaries.',
    documents: 'Document OCR Scanner',
    records: 'Khatian Record Matching',
    audit: 'SHA-256 Tamper-Evident Audit',
    themeDark: 'Dark',
    themeLight: 'Light',
    language: 'বাংলা',
  },
  bn: {
    eyebrow: 'ল্যান্ডটেক ইন্টেলিজেন্স প্ল্যাটফর্ম',
    title: 'প্রতিটি জমির তথ্য, আরও স্পষ্টভাবে যাচাই করুন।',
    subtitle: 'ভূমির দলিল, রেকর্ড মিল এবং ক্যাডাস্ট্রাল তথ্য ব্যবস্থাপনার স্মার্ট ওয়ার্কস্পেস।',
    map: 'ক্যাডাস্ট্রাল ৩ডি মানচিত্র',
    live: 'ইন্টারঅ্যাকটিভ ৩ডি জিআইএস',
    selected: 'নির্বাচিত প্লটের বিবরণ',
    area: 'রেকর্ডকৃত জমির পরিমাণ',
    status: 'যাচাইয়ের অবস্থা',
    verified: 'যাচাইকৃত রেকর্ড',
    review: 'পর্যালোচনা প্রয়োজন',
    pending: 'অপেক্ষমাণ',
    action: 'ভেরিফিকেশন ওয়ার্কস্পেস খুলুন',
    openMap: 'পূর্ণাঙ্গ ৩ডি মানচিত্র',
    openReport: 'বায়ার ডিউ ডিলিজেন্স রিপোর্ট',
    note: 'এটি উদাহরণভিত্তিক জ্যামিতি। প্রকৃত সীমানার জন্য আপনার GIS API যুক্ত করুন।',
    documents: 'দলিল ওসিআর স্ক্যানার',
    records: 'খতিয়ান রেকর্ড মিল',
    audit: 'SHA-256 ট্যাম্পার-এভিডেন্ট অডিট',
    themeDark: 'ডার্ক',
    themeLight: 'লাইট',
    language: 'English',
  },
} as const;

export const LandTechShowcase: React.FC<LandTechShowcaseProps> = ({
  onNavigateToTab,
  isDarkMode = true,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'bn').startsWith('bn') ? 'bn' : 'en';
  const t = copy[currentLang];

  const [selectedId, setSelectedId] = useState<string>(defaultDemoParcels[0].id);
  const [scanning, setScanning] = useState<boolean>(true);

  const selected = useMemo(
    () => defaultDemoParcels.find((parcel) => parcel.id === selectedId) ?? defaultDemoParcels[0],
    [selectedId]
  );

  const statusLabel =
    selected.status === 'verified'
      ? t.verified
      : selected.status === 'review'
      ? t.review
      : t.pending;

  return (
    <div
      className={`landtech-shell rounded-3xl border border-slate-200 dark:border-emerald-500/30 ${
        isDarkMode ? 'theme-dark' : 'theme-light'
      }`}
      lang={currentLang}
    >
      <div className="lt-noise" aria-hidden="true" />

      <section className="lt-hero" id="landtech-home">
        <div className="lt-hero-copy">
          <div className="lt-eyebrow">
            <span className="lt-pulse-dot" />
            {t.eyebrow}
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight my-4">
            {t.title}
          </h2>
          <p className="lt-subtitle">{t.subtitle}</p>

          <div className="lt-hero-actions">
            <button
              type="button"
              className="lt-primary-button"
              onClick={() => onNavigateToTab && onNavigateToTab('verify', { recordId: selected.id })}
            >
              <span>{t.action}</span>
              <span aria-hidden="true">↗</span>
            </button>
            <span className="lt-trust-note">
              <span className="lt-shield">✓</span>
              <span>Secure-by-design SHA-256</span>
            </span>
          </div>

          <div className="lt-feature-row">
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('scan')}
              className="hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-xs text-left"
            >
              <span className="lt-feature-icon">⌘</span>
              <span>{t.documents}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('search')}
              className="hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-xs text-left"
            >
              <span className="lt-feature-icon">⌕</span>
              <span>{t.records}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('admin')}
              className="hover:text-emerald-500 transition-colors flex items-center gap-1.5 text-xs text-left"
            >
              <span className="lt-feature-icon">◈</span>
              <span>{t.audit}</span>
            </button>
          </div>
        </div>

        <div className="lt-map-card">
          <div className="lt-card-topline">
            <div>
              <span className="lt-live-dot" />
              {t.map}
            </div>
            <span className="lt-demo-pill">{t.live}</span>
          </div>

          <CadastralScene
            parcels={defaultDemoParcels}
            selectedId={selectedId}
            onSelect={setSelectedId}
            scanning={scanning}
          />

          <div className="lt-map-footer">
            <span>
              <i className="lt-legend lt-legend-verified" />
              {t.verified}
            </span>
            <span>
              <i className="lt-legend lt-legend-review" />
              {t.review}
            </span>
            <button
              type="button"
              className="lt-scan-toggle"
              onClick={() => setScanning(!scanning)}
            >
              {scanning ? (currentLang === 'bn' ? 'স্ক্যান থামান' : 'Pause scan') : (currentLang === 'bn' ? 'স্ক্যান চালু' : 'Resume scan')}
            </button>
          </div>
        </div>
      </section>

      <section className="lt-workspace" id="lt-workspace">
        <div className="lt-section-heading">
          <div>
            <span className="lt-section-kicker">CADASTRAL INSPECTOR</span>
            <h2>{t.selected}</h2>
          </div>
          <span className={`lt-status status-${selected.status}`}>
            <i />
            {statusLabel}
          </span>
        </div>

        <div className="lt-detail-grid">
          <article className="lt-detail-card lt-detail-main">
            <div className="lt-detail-label">PARCEL IDENTIFIER</div>
            <div className="lt-parcel-id">{selected.id}</div>
            <div className="lt-detail-divider" />
            <div className="lt-detail-label">{t.area}</div>
            <div className="lt-area-value">{selected.area}</div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab && onNavigateToTab('map')}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t.openMap}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToTab && onNavigateToTab('report', { parcelId: selected.id })}
                className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{t.openReport}</span>
              </button>
            </div>
          </article>

          <article className="lt-detail-card">
            <div className="lt-detail-label">VERIFICATION PIPELINE FLOW</div>
            <div className="lt-step">
              <span className="lt-step-number done">✓</span>
              <div>
                <strong>Document Ingestion & OCR</strong>
                <small>Quality analysis & Bengali extraction</small>
              </div>
            </div>
            <div className="lt-step">
              <span className={`lt-step-number ${selected.status === 'pending' ? '' : 'done'}`}>
                {selected.status === 'pending' ? '2' : '✓'}
              </span>
              <div>
                <strong>Cadastral Record Matching</strong>
                <small>Multi-identifier scoring across 5,250 records</small>
              </div>
            </div>
            <div className="lt-step">
              <span className="lt-step-number">3</span>
              <div>
                <strong>Deterministic Rules Gate (R1–R6)</strong>
                <small>Required human review when conflicts exist</small>
              </div>
            </div>
          </article>

          <article className="lt-detail-card lt-integrity-card">
            <div className="lt-integrity-symbol">⌁</div>
            <div className="lt-detail-label">INTEGRITY & PROVENANCE LAYER</div>
            <h3>Evidence before conclusions.</h3>
            <p className="lt-muted">
              Present source records, mismatches and audit integrity separately. A QR code or similarity score alone does not establish legal ownership.
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('admin')}
              className="lt-integrity-link text-left"
            >
              <span>Audit-ready SHA-256 workflow</span>
              <span>↗</span>
            </button>
          </article>
        </div>

        <p className="lt-disclaimer">{t.note}</p>
      </section>
    </div>
  );
};

