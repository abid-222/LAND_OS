import React, { useMemo, useState } from "react";
import "./landtech.css";

type Parcel = {
  id: string;
  label: string;
  area: string;
  status: "verified" | "review" | "pending";
  points: string;
  center: [number, number];
};

const demoParcels: Parcel[] = [
  { id: "DEMO-102", label: "Parcel A-102", area: "4.25 decimal", status: "verified", points: "80,42 190,24 228,92 116,111", center: [150, 68] },
  { id: "DEMO-103", label: "Parcel A-103", area: "3.80 decimal", status: "review", points: "190,24 294,42 328,106 228,92", center: [260, 66] },
  { id: "DEMO-104", label: "Parcel B-204", area: "5.10 decimal", status: "pending", points: "116,111 228,92 263,166 143,190", center: [190, 139] },
  { id: "DEMO-105", label: "Parcel B-205", area: "4.65 decimal", status: "verified", points: "228,92 328,106 355,172 263,166", center: [293, 133] },
];

const copy = {
  en: {
    eyebrow: "LAND INTELLIGENCE PLATFORM",
    title: "Every parcel. Clearly verified.",
    subtitle: "A smarter workspace for land documents, record matching and cadastral intelligence.",
    map: "Cadastral overview",
    live: "INTERACTIVE DEMO",
    selected: "Selected parcel",
    area: "Recorded area",
    status: "Review status",
    verified: "Verified",
    review: "Needs review",
    pending: "Pending",
    action: "Open verification workspace",
    note: "Illustrative geometry only · Connect your real GIS API for authoritative parcel boundaries.",
    documents: "Document intelligence",
    records: "Record matching",
    audit: "Tamper-evident audit",
    themeDark: "Dark",
    themeLight: "Light",
    language: "বাংলা",
  },
  bn: {
    eyebrow: "ল্যান্ড ইন্টেলিজেন্স প্ল্যাটফর্ম",
    title: "প্রতিটি জমির তথ্য, আরও স্পষ্টভাবে যাচাই করুন।",
    subtitle: "ভূমির দলিল, রেকর্ড মিল এবং ক্যাডাস্ট্রাল তথ্য ব্যবস্থাপনার স্মার্ট workspace।",
    map: "ক্যাডাস্ট্রাল মানচিত্র",
    live: "ইন্টারঅ্যাকটিভ ডেমো",
    selected: "নির্বাচিত প্লট",
    area: "রেকর্ডকৃত জমির পরিমাণ",
    status: "যাচাইয়ের অবস্থা",
    verified: "যাচাইকৃত",
    review: "পর্যালোচনা প্রয়োজন",
    pending: "অপেক্ষমাণ",
    action: "ভেরিফিকেশন workspace খুলুন",
    note: "এটি উদাহরণভিত্তিক জ্যামিতি। প্রকৃত সীমানার জন্য আপনার GIS API যুক্ত করুন।",
    documents: "দলিল ইন্টেলিজেন্স",
    records: "রেকর্ড মিল",
    audit: "ট্যাম্পার-এভিডেন্ট অডিট",
    themeDark: "ডার্ক",
    themeLight: "লাইট",
    language: "English",
  },
} as const;

export function LandTechShowcase() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [selectedId, setSelectedId] = useState(demoParcels[0].id);
  const [scanning, setScanning] = useState(true);
  const t = copy[language];
  const selected = useMemo(
    () => demoParcels.find((parcel) => parcel.id === selectedId) ?? demoParcels[0],
    [selectedId],
  );

  const statusLabel = selected.status === "verified"
    ? t.verified
    : selected.status === "review" ? t.review : t.pending;

  return (
    <main className={`landtech-shell theme-${theme}`} lang={language === "bn" ? "bn" : "en"}>
      <div className="lt-noise" aria-hidden="true" />
      <header className="lt-nav">
        <a className="lt-brand" href="#landtech-home" aria-label="LandTech home">
          <span className="lt-brand-mark"><span /></span>
          <span>land<span className="lt-brand-accent">tech</span></span>
        </a>
        <div className="lt-nav-actions">
          <button className="lt-quiet-button" onClick={() => setLanguage(language === "en" ? "bn" : "en")}>
            {t.language}
          </button>
          <button className="lt-theme-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle color theme">
            <span className="lt-theme-dot" />
            {theme === "dark" ? t.themeDark : t.themeLight}
          </button>
        </div>
      </header>

      <section className="lt-hero" id="landtech-home">
        <div className="lt-hero-copy">
          <div className="lt-eyebrow"><span className="lt-pulse-dot" />{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p className="lt-subtitle">{t.subtitle}</p>
          <div className="lt-hero-actions">
            <button className="lt-primary-button" onClick={() => document.getElementById("lt-workspace")?.scrollIntoView({ behavior: "smooth" })}>
              {t.action}<span aria-hidden="true">↗</span>
            </button>
            <span className="lt-trust-note"><span className="lt-shield">✓</span> Secure-by-design workflow</span>
          </div>
          <div className="lt-feature-row">
            <div><span className="lt-feature-icon">⌘</span><span>{t.documents}</span></div>
            <div><span className="lt-feature-icon">⌕</span><span>{t.records}</span></div>
            <div><span className="lt-feature-icon">◈</span><span>{t.audit}</span></div>
          </div>
        </div>

        <div className="lt-map-card">
          <div className="lt-card-topline">
            <div><span className="lt-live-dot" />{t.map}</div>
            <span className="lt-demo-pill">{t.live}</span>
          </div>
          <CadastralScene parcels={demoParcels} selectedId={selectedId} onSelect={setSelectedId} scanning={scanning} />
          <div className="lt-map-footer">
            <span><i className="lt-legend lt-legend-verified" />{t.verified}</span>
            <span><i className="lt-legend lt-legend-review" />{t.review}</span>
            <button className="lt-scan-toggle" onClick={() => setScanning(!scanning)}>{scanning ? "Pause scan" : "Resume scan"}</button>
          </div>
        </div>
      </section>

      <section className="lt-workspace" id="lt-workspace">
        <div className="lt-section-heading">
          <div><span className="lt-section-kicker">PARCEL INSPECTOR</span><h2>{t.selected}</h2></div>
          <span className={`lt-status status-${selected.status}`}><i />{statusLabel}</span>
        </div>
        <div className="lt-detail-grid">
          <article className="lt-detail-card lt-detail-main">
            <div className="lt-detail-label">PARCEL IDENTIFIER</div>
            <div className="lt-parcel-id">{selected.id}</div>
            <div className="lt-detail-divider" />
            <div className="lt-detail-label">{t.area}</div>
            <div className="lt-area-value">{selected.area}</div>
            <p className="lt-muted">Demo data only. Connect this panel to your authenticated parcel detail endpoint.</p>
          </article>
          <article className="lt-detail-card">
            <div className="lt-detail-label">VERIFICATION FLOW</div>
            <div className="lt-step"><span className="lt-step-number done">✓</span><div><strong>Document received</strong><small>Input validation</small></div></div>
            <div className="lt-step"><span className={`lt-step-number ${selected.status === "pending" ? "" : "done"}`}>{selected.status === "pending" ? "2" : "✓"}</span><div><strong>Record comparison</strong><small>Match identifiers and fields</small></div></div>
            <div className="lt-step"><span className="lt-step-number">3</span><div><strong>Human review</strong><small>Required when conflicts exist</small></div></div>
          </article>
          <article className="lt-detail-card lt-integrity-card">
            <div className="lt-integrity-symbol">⌁</div>
            <div className="lt-detail-label">INTEGRITY LAYER</div>
            <h3>Evidence before conclusions.</h3>
            <p className="lt-muted">Present source records, mismatches and audit integrity separately. A QR code or similarity score alone does not establish legal ownership.</p>
            <span className="lt-integrity-link">Audit-ready workflow <span>↗</span></span>
          </article>
        </div>
        <p className="lt-disclaimer">{t.note}</p>
      </section>
      <footer className="lt-footer"><span className="lt-footer-mark">L</span><span>LandTech · Land document intelligence</span><span className="lt-footer-right">Built for clarity, trust and access.</span></footer>
    </main>
  );
}

function CadastralScene({
  parcels, selectedId, onSelect, scanning,
}: {
  parcels: Parcel[];
  selectedId: string;
  onSelect: (id: string) => void;
  scanning: boolean;
}) {
  return (
    <div className="lt-scene" aria-label="Interactive illustrative parcel visualization">
      <div className="lt-scene-grid" aria-hidden="true" />
      <div className="lt-scene-orbit lt-orbit-one" aria-hidden="true" />
      <div className="lt-scene-orbit lt-orbit-two" aria-hidden="true" />
      <div className="lt-map-float-label lt-label-north"><span>↑</span> NORTH GRID</div>
      <div className="lt-map-float-label lt-label-scale">GIS / 3D VIEW</div>
      <svg className="lt-parcel-svg" viewBox="0 0 400 225" role="group" aria-label="Select a demo parcel">
        <defs>
          <linearGradient id="ltParcelTop" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="var(--parcel-top)" />
            <stop offset="100%" stopColor="var(--parcel-bottom)" />
          </linearGradient>
          <filter id="ltGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {parcels.map((parcel, index) => {
          const selected = parcel.id === selectedId;
          const [cx, cy] = parcel.center;
          const statusColor = parcel.status === "verified" ? "var(--green)" : parcel.status === "review" ? "var(--amber)" : "var(--muted-green)";
          return (
            <g key={parcel.id} className={`lt-parcel ${selected ? "is-selected" : ""}`} onClick={() => onSelect(parcel.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(parcel.id); }} role="button" tabIndex={0} aria-label={`Select ${parcel.label}`}>
              <polygon points={parcel.points} transform="translate(0 12)" className="lt-parcel-side" />
              <polygon points={parcel.points} fill="url(#ltParcelTop)" className="lt-parcel-top" stroke={statusColor} strokeWidth={selected ? 2.2 : 1.1} />
              <polygon points={parcel.points} className="lt-parcel-shine" />
              {selected && <polygon points={parcel.points} className="lt-parcel-highlight" filter="url(#ltGlow)" />}
              <circle cx={cx} cy={cy} r={selected ? 4 : 2.5} fill={statusColor} className="lt-parcel-point" />
              {selected && <text x={cx} y={cy - 13} className="lt-parcel-tag">{parcel.id}</text>}
              {index === 0 && <path d="M95 50 L164 39" className="lt-survey-line" />}
            </g>
          );
        })}
      </svg>
      {scanning && <div className="lt-scan-line" aria-hidden="true" />}
      <div className="lt-map-coordinates"><span>23° 48' N</span><span>90° 22' E</span></div>
      <div className="lt-map-side-chip"><span className="lt-pulse-dot" />PARCEL LAYERS <b>04</b></div>
    </div>
  );
}
