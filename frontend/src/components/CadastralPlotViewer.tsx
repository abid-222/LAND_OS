import React, { useState } from 'react';
import {
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Ruler,
  Navigation,
} from 'lucide-react';

interface CadastralPlotViewerProps {
  parcelId: string;
  isDark?: boolean;
  onNavigateToMap?: () => void;
}

interface PlotInfo {
  dagNo: string;
  khatianNo: string;
  mouza: string;
  sheetNo: string;
  landClass: string;
  areaDecimal: number;
  areaKatha: number;
  areaAcres: number;
  areaSqFt: number;
  roadAccess: string;
  dimensions: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  chouhaddi: {
    north: { dag: string; owner: string };
    south: { dag: string; owner: string };
    east: { label: string; width: string };
    west: { dag: string; owner: string };
  };
  adjacentPlots: Array<{
    dag: string;
    label: string;
    class: string;
    x: number;
    y: number;
    width: number;
    height: number;
    points?: string;
  }>;
}

const PLOT_DATA: Record<string, PlotInfo> = {
  'P-4520': {
    dagNo: '৪৫২০',
    khatianNo: '১২০৫',
    mouza: 'তেজগাঁও (জেএল নং ৮৫)',
    sheetNo: '০৩',
    landClass: 'নাল (কৃষি/সমতল)',
    areaDecimal: 15.5,
    areaKatha: 9.38,
    areaAcres: 0.155,
    areaSqFt: 6751.8,
    roadAccess: '২০ ফুট আরসিসি সংযোগ সড়ক',
    dimensions: {
      north: '৬৫ ফুট',
      south: '৬৬ ফুট',
      east: '৮৮ ফুট',
      west: '৮৫ ফুট',
    },
    chouhaddi: {
      north: { dag: 'দাগ ৪৫১৯', owner: 'আকরাম হোসেন ও ওয়ারিশগণ' },
      south: { dag: 'দাগ ৪৫২১', owner: 'সরকারি খাস খতিয়ান ১' },
      east: { label: '২০ ফুট আরসিসি পাকা সড়ক', width: '২০ ফুট' },
      west: { dag: 'দাগ ৪৫১৮', owner: 'করিম বকশ' },
    },
    adjacentPlots: [
      { dag: '৪৫১৯', label: 'দাগ ৪৫১৯ (উত্তর)', class: 'ভিটি', x: 120, y: 30, width: 220, height: 90 },
      { dag: '৪৫১৮', label: 'দাগ ৪৫১৮ (পশ্চিম)', class: 'নাল', x: 20, y: 130, width: 90, height: 160 },
      { dag: '৪৫২১', label: 'দাগ ৪৫২১ (দক্ষিণ)', class: 'খাস', x: 120, y: 300, width: 220, height: 90 },
      { dag: '৪৫২২', label: 'দাগ ৪৫২২', class: 'বাস্তু', x: 20, y: 30, width: 90, height: 90 },
      { dag: '৪৫২৩', label: 'দাগ ৪৫২৩', class: 'পুকুর', x: 20, y: 300, width: 90, height: 90 },
    ],
  },
  'P-3201': {
    dagNo: '৩২০১',
    khatianNo: '৭৮৯',
    mouza: 'মিরপুর (জেএল নং ১২)',
    sheetNo: '০১',
    landClass: 'ভিটি (উঁচু জমি)',
    areaDecimal: 42.0,
    areaKatha: 25.41,
    areaAcres: 0.42,
    areaSqFt: 18295.2,
    roadAccess: '২৫ ফুট প্রধান সড়ক',
    dimensions: {
      north: '১২০ ফুট',
      south: '১২৪ ফুট',
      east: '১৪২ ফুট',
      west: '১৪০ ফুট',
    },
    chouhaddi: {
      north: { dag: 'দাগ ৩২০০', owner: 'মো: রফিকুল ইসলাম' },
      south: { dag: 'দাগ ৩২০২', owner: 'নুরজাহান বেগম' },
      east: { label: '২৫ ফুট সিটি কর্পোরেশন সড়ক', width: '২৫ ফুট' },
      west: { dag: 'দাগ ৩১৯৯', owner: 'আব্দুস সাত্তার' },
    },
    adjacentPlots: [
      { dag: '৩২০০', label: 'দাগ ৩২০০ (উত্তর)', class: 'ভিটি', x: 120, y: 30, width: 220, height: 90 },
      { dag: '৩১৯৯', label: 'দাগ ৩১৯৯ (পশ্চিম)', class: 'নাল', x: 20, y: 130, width: 90, height: 160 },
      { dag: '৩২০২', label: 'দাগ ৩২০২ (দক্ষিণ)', class: 'বাস্তু', x: 120, y: 300, width: 220, height: 90 },
      { dag: '৩১৯৮', label: 'দাগ ৩১৯৮', class: 'বাস্তু', x: 20, y: 30, width: 90, height: 90 },
      { dag: '৩২০৩', label: 'দাগ ৩২০৩', class: 'নাল', x: 20, y: 300, width: 90, height: 90 },
    ],
  },
  'P-1108': {
    dagNo: '১১০৮',
    khatianNo: '৪৫২',
    mouza: 'গুলশান (জেএল নং ৪৪)',
    sheetNo: '০২',
    landClass: 'বাড়ি (আবাসিক)',
    areaDecimal: 8.5,
    areaKatha: 5.14,
    areaAcres: 0.085,
    areaSqFt: 3702.6,
    roadAccess: '৩০ ফুট এভিনিউ সড়ক',
    dimensions: {
      north: '৪৮ ফুট',
      south: '৫০ ফুট',
      east: '৭২ ফুট',
      west: '৭০ ফুট',
    },
    chouhaddi: {
      north: { dag: 'দাগ ১১০৭', owner: 'তাহমিনা চৌধুরী' },
      south: { dag: 'দাগ ১১০৯', owner: 'সুলতান মাহমুদ' },
      east: { label: '৩০ ফুট গুলশান এভিনিউ রোড', width: '৩০ ফুট' },
      west: { dag: 'দাগ ১১০৬', owner: 'আহমেদ উল্লাহ' },
    },
    adjacentPlots: [
      { dag: '১১০৭', label: 'দাগ ১১০৭ (উত্তর)', class: 'বাড়ি', x: 120, y: 30, width: 220, height: 90 },
      { dag: '১১০৬', label: 'দাগ ১১০৬ (পশ্চিম)', class: 'বাড়ি', x: 20, y: 130, width: 90, height: 160 },
      { dag: '১১০৯', label: 'দাগ ১১০৯ (দক্ষিণ)', class: 'বাড়ি', x: 120, y: 300, width: 220, height: 90 },
      { dag: '১১০৫', label: 'দাগ ১১০৫', class: 'বাড়ি', x: 20, y: 30, width: 90, height: 90 },
      { dag: '১১১০', label: 'দাগ ১১১০', class: 'বাড়ি', x: 20, y: 300, width: 90, height: 90 },
    ],
  },
};

export const CadastralPlotViewer: React.FC<CadastralPlotViewerProps> = ({
  parcelId,
  isDark = true,
  onNavigateToMap,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showChouhaddi, setShowChouhaddi] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'naksha' | 'hybrid'>('naksha');
  const [hoveredPlot, setHoveredPlot] = useState<string | null>(null);

  const plot = PLOT_DATA[parcelId] || PLOT_DATA['P-4520'];

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-300 shadow-xl ${
        isDark
          ? 'bg-[#080e14] border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Top Header & View Controls Bar */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                মৌজা ক্যাডাস্ট্রাল প্লট নকশা (Cadastral Sheet)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                দাগ নং {plot.dagNo}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {plot.mouza} • সিট নং: {plot.sheetNo} • আরএস জরিপ
            </p>
          </div>
        </div>

        {/* View Mode & Overlay Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'naksha' ? 'hybrid' : 'naksha')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              viewMode === 'hybrid'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            {viewMode === 'hybrid' ? 'স্যাটেলাইট হাইব্রিড' : 'নকশা ভিউ'}
          </button>

          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
              showDimensions
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            <Ruler className="w-3 h-3" />
            <span>পরিমাপ</span>
          </button>

          <button
            onClick={() => setShowChouhaddi(!showChouhaddi)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
              showChouhaddi
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            <Navigation className="w-3 h-3" />
            <span>চৌহদ্দি</span>
          </button>

          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/20 border border-primary/40 text-emerald-300 hover:bg-primary/30 flex items-center gap-1 transition-all"
              title="পূর্ণ জিআইএস ম্যাপে খুলুন"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">জিআইএস ম্যাপ</span>
            </button>
          )}
        </div>
      </div>

      {/* Main SVG Cadastral Plot Canvas Area */}
      <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden select-none bg-[#050b11]">
        {/* Subtle grid background simulating survey graph paper */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Hybrid Satellite Texture Simulation */}
        {viewMode === 'hybrid' && (
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/40 via-slate-900/60 to-cyan-950/40 opacity-70 pointer-events-none" />
        )}

        {/* Floating Zoom & Compass HUD Controls */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
          <div className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg backdrop-blur-md flex flex-col gap-1">
            <button
              onClick={handleZoomIn}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-all text-xs"
              title="জুম ইন"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-all text-xs"
              title="জুম আউট"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-all text-xs"
              title="রিসেট ভিউ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* North Arrow / Compass Indicator */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg backdrop-blur-md text-[10px] text-slate-300 font-mono">
          <Compass className="w-4 h-4 text-rose-400 animate-pulse" />
          <span className="font-bold text-white">উত্তর (N)</span>
        </div>

        {/* Hovered Plot Info Badge */}
        {hoveredPlot && (
          <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-xl backdrop-blur-md text-xs">
            <span className="text-cyan-300 font-bold">{hoveredPlot}</span>
          </div>
        )}

        {/* SVG Vector Cadastral Naksha */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 460 410"
            className="w-full h-full max-w-[500px] max-h-[420px] drop-shadow-2xl"
          >
            <defs>
              {/* Pattern for Roads */}
              <pattern
                id="roadStripe"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="20" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.4" />
              </pattern>

              {/* Gradient for Selected Target Parcel */}
              <linearGradient id="selectedParcelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
              </linearGradient>

              {/* Gradient for Adjacent Plots */}
              <linearGradient id="adjacentParcelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Access Road (East Side) */}
            <g>
              <rect
                x="350"
                y="15"
                width="90"
                height="380"
                rx="6"
                fill="#1e2430"
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <rect x="350" y="15" width="90" height="380" fill="url(#roadStripe)" />
              {/* Road Center Dotted Line */}
              <line x1="395" y1="20" x2="395" y2="390" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8 6" />
              <text
                x="395"
                y="210"
                fill="#fbbf24"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                transform="rotate(90 395 210)"
                letterSpacing="1"
              >
                {plot.roadAccess}
              </text>
            </g>

            {/* Adjacent Surrounding Plots */}
            {plot.adjacentPlots.map((adj) => (
              <g
                key={adj.dag}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredPlot(`${adj.label} • শ্রেণি: ${adj.class}`)}
                onMouseLeave={() => setHoveredPlot(null)}
              >
                <rect
                  x={adj.x}
                  y={adj.y}
                  width={adj.width}
                  height={adj.height}
                  rx="4"
                  fill="url(#adjacentParcelGrad)"
                  stroke="#334155"
                  strokeWidth="1.5"
                  className="hover:stroke-cyan-400 hover:fill-slate-800 transition-colors"
                />
                {/* Adjacent Dag Number Label */}
                <text
                  x={adj.x + adj.width / 2}
                  y={adj.y + adj.height / 2 + 4}
                  fill="#94a3b8"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  দাগ {adj.dag}
                </text>
                <text
                  x={adj.x + adj.width / 2}
                  y={adj.y + adj.height / 2 + 18}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                >
                  ({adj.class})
                </text>
              </g>
            ))}

            {/* TARGET SELECTED PARCEL (দাগ নং ৪৫২০ / নির্বাচিত প্লট) */}
            <g
              className="cursor-pointer"
              onMouseEnter={() =>
                setHoveredPlot(
                  `দাগ নং ${plot.dagNo} (নির্বাচিত) • পরিমাণ: ${plot.areaDecimal} শতক (${plot.areaAcres} একর)`
                )
              }
              onMouseLeave={() => setHoveredPlot(null)}
            >
              {/* Outer Glow */}
              <polygon
                points="120,130 340,130 340,290 120,290"
                fill="none"
                stroke="#10b981"
                strokeWidth="8"
                strokeOpacity="0.25"
              />

              {/* Main Polygon Plot Body */}
              <polygon
                points="120,130 340,130 340,290 120,290"
                fill="url(#selectedParcelGrad)"
                stroke="#10b981"
                strokeWidth="2.5"
              />

              {/* Corner Boundary Pillars (সীমানা পিলার) */}
              <circle cx="120" cy="130" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="340" cy="130" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="340" cy="290" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="120" cy="290" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />

              {/* Central Target Badge */}
              <rect
                x="170"
                y="180"
                width="120"
                height="56"
                rx="8"
                fill="#022c22"
                stroke="#10b981"
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x="230"
                y="202"
                fill="#34d399"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
              >
                দাগ নং {plot.dagNo}
              </text>
              <text
                x="230"
                y="222"
                fill="#a7f3d0"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {plot.areaDecimal} শতক • {plot.areaKatha} কাঠা
              </text>
            </g>

            {/* Dimension Lines & Labels along Boundary Edges */}
            {showDimensions && (
              <g className="text-[10px] font-mono font-bold">
                {/* North Edge Dimension */}
                <line x1="125" y1="123" x2="335" y2="123" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
                <rect x="205" y="112" width="50" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <text x="230" y="124" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {plot.dimensions.north}
                </text>

                {/* South Edge Dimension */}
                <line x1="125" y1="297" x2="335" y2="297" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
                <rect x="205" y="291" width="50" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <text x="230" y="303" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {plot.dimensions.south}
                </text>

                {/* East Edge Dimension */}
                <line x1="347" y1="135" x2="347" y2="285" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
                <rect x="335" y="200" width="46" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <text x="358" y="212" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {plot.dimensions.east}
                </text>

                {/* West Edge Dimension */}
                <line x1="113" y1="135" x2="113" y2="285" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
                <rect x="75" y="200" width="46" height="16" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <text x="98" y="212" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {plot.dimensions.west}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Chouhaddi (চৌহদ্দি) & Spec Grid Section */}
      <div className="p-4 space-y-3">
        {/* Unit Breakdown Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">শতাংশ / শতক</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
              {plot.areaDecimal} শতক
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">কাঠা</span>
            <span className="text-sm sm:text-base font-bold text-cyan-400 font-mono">
              {plot.areaKatha} কাঠা
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">মোট একর</span>
            <span className="text-sm sm:text-base font-bold text-amber-400 font-mono">
              {plot.areaAcres} একর
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block">বর্গফুট</span>
            <span className="text-sm sm:text-base font-bold text-purple-400 font-mono">
              {plot.areaSqFt.toLocaleString('bn-BD')} বর্গফুট
            </span>
          </div>
        </div>

        {/* 4-Sided Chouhaddi (চৌহদ্দি বিবরণী) */}
        {showChouhaddi && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                জমির চৌহদ্দি বিবরণী (Boundary & Neighbors)
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                বালাম ও সরজমিন যাচাইকৃত
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-400 shrink-0">
                  উত্তর
                </span>
                <div>
                  <strong className="text-white block">{plot.chouhaddi.north.dag}</strong>
                  <span className="text-[11px] text-slate-400">{plot.chouhaddi.north.owner} ({plot.dimensions.north})</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-400 shrink-0">
                  দক্ষিণ
                </span>
                <div>
                  <strong className="text-white block">{plot.chouhaddi.south.dag}</strong>
                  <span className="text-[11px] text-slate-400">{plot.chouhaddi.south.owner} ({plot.dimensions.south})</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-400 shrink-0">
                  পূর্ব
                </span>
                <div>
                  <strong className="text-white block">{plot.chouhaddi.east.label}</strong>
                  <span className="text-[11px] text-slate-400">সীমানা দৈর্ঘ্য: {plot.dimensions.east}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/70 border border-slate-800/80">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-400 shrink-0">
                  পশ্চিম
                </span>
                <div>
                  <strong className="text-white block">{plot.chouhaddi.west.dag}</strong>
                  <span className="text-[11px] text-slate-400">{plot.chouhaddi.west.owner} ({plot.dimensions.west})</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
