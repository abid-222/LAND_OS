import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  X,
  FileText,
  FileBarChart,
  ArrowRight,
  MapPin,
  RotateCcw,
  Box,
  List,
  WifiOff,
} from 'lucide-react';
import { useNetworkStore } from '../lib/networkMonitor';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface ParcelDetail {
  synthetic_id: string;
  land_class: string;
  area_acres: number;
  sample_documents: string[];
  alert_counts?: {
    high: number;
    warn: number;
    info: number;
    total: number;
  };
}

const demoParcels: ParcelDetail[] = [
  {
    synthetic_id: 'P-4520',
    land_class: 'নাল',
    area_acres: 0.155,
    sample_documents: ['খতিয়ান ১২০৫', 'বায়া দলিল ১৯৯৮'],
    alert_counts: { high: 1, warn: 1, info: 1, total: 3 },
  },
  {
    synthetic_id: 'P-3201',
    land_class: 'ভিটি',
    area_acres: 0.420,
    sample_documents: ['খতিয়ান ৭৮৯', 'নামজারি ২০০৫'],
    alert_counts: { high: 0, warn: 1, info: 2, total: 3 },
  },
  {
    synthetic_id: 'P-1108',
    land_class: 'বাড়ি',
    area_acres: 0.085,
    sample_documents: ['খতিয়ান ৪৫২', 'ডিসিআর ১৪৩০'],
    alert_counts: { high: 0, warn: 0, info: 1, total: 1 },
  },
  {
    synthetic_id: 'P-6704',
    land_class: 'পুকুর',
    area_acres: 0.650,
    sample_documents: ['সিএস খতিয়ান ১২', 'খাজনা দাখিলা'],
    alert_counts: { high: 0, warn: 0, info: 0, total: 0 },
  },
];

interface MapPageProps {
  onNavigateToReport?: (parcelId: string) => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onNavigateToReport }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const { isOnline, isLowNetworkMode } = useNetworkStore();

  const [is3DMode, setIs3DMode] = useState(false);
  const [showAccessibilityList, setShowAccessibilityList] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    boundary: true,
    landType: true,
    roads: true,
    water: true,
    alerts: true,
  });

  const [selectedParcel, setSelectedParcel] = useState<ParcelDetail | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // Check hardware constraints for 3D fallback
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebGlSupported(false);
    } catch {
      setWebGlSupported(false);
    }
  }, []);

  const handleSelectParcelById = useCallback((pId: string) => {
    const found = demoParcels.find((p) => p.synthetic_id === pId);
    if (found) {
      setSelectedParcel(found);
    } else {
      setSelectedParcel({
        synthetic_id: pId,
        land_class: 'নাল',
        area_acres: 0.33,
        sample_documents: ['খতিয়ান নং ৩৪০', 'দলিল নং ১০৮২/২০২৪'],
        alert_counts: { high: 0, warn: 1, info: 1, total: 2 },
      });
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    const tileUrl =
      (import.meta.env.VITE_MAP_TILE_URL as string) ||
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    // Dhaka Tejgaon coordinates: [90.3944, 23.7590]
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors / LandOS Illustrative Demo',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [90.3944, 23.759],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      dragRotate: true,
      touchPitch: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Add GeoJSON parcels layer
      map.addSource('parcels-source', {
        type: 'geojson',
        data: '/api/v1/map/parcels?bbox=90.38,23.74,90.41,23.77',
      });

      // Neutral parcel fill layer (Strictly no safe/unsafe colors)
      map.addLayer({
        id: 'parcels-fill',
        type: 'fill',
        source: 'parcels-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'land_class'],
            'নাল',
            '#334155', // Neutral slate-700
            'বাড়ি',
            '#475569', // Neutral slate-600
            'ভিটি',
            '#3b4252',
            '#334155',
          ],
          'fill-opacity': 0.45,
        },
      });

      // 3D fill extrusion layer with illustrative decoration heights
      map.addLayer({
        id: 'parcels-extrusion',
        type: 'fill-extrusion',
        source: 'parcels-source',
        layout: {
          visibility: 'none',
        },
        paint: {
          'fill-extrusion-color': '#334155',
          'fill-extrusion-height': [
            'match',
            ['get', 'land_class'],
            'বাড়ি',
            24,
            'ভিটি',
            16,
            'নাল',
            8,
            8,
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.75,
        },
      });

      // Boundary line layer
      map.addLayer({
        id: 'parcels-line',
        type: 'line',
        source: 'parcels-source',
        paint: {
          'line-color': '#10b981',
          'line-width': 2,
        },
      });

      // Click on 2D parcel
      map.on('click', 'parcels-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = (feat.properties || {}) as Record<string, unknown>;
        const pId = String(props.synthetic_id || props.parcel_id || 'P-4520');
        handleSelectParcelById(pId);
      });

      // Click on 3D extrusion
      map.on('click', 'parcels-extrusion', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = (feat.properties || {}) as Record<string, unknown>;
        const pId = String(props.synthetic_id || props.parcel_id || 'P-4520');
        handleSelectParcelById(pId);
      });

      map.on('mouseenter', 'parcels-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'parcels-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [handleSelectParcelById]);

  // 2D / 3D toggle
  const toggle3D = () => {
    if (!mapRef.current || !webGlSupported || isLowNetworkMode) return;
    const map = mapRef.current;
    const nextState = !is3DMode;
    setIs3DMode(nextState);

    if (nextState) {
      map.easeTo({ pitch: 55, bearing: -20, duration: 800 });
      if (map.getLayer('parcels-fill')) {
        map.setLayoutProperty('parcels-fill', 'visibility', 'none');
      }
      if (map.getLayer('parcels-extrusion')) {
        map.setLayoutProperty('parcels-extrusion', 'visibility', 'visible');
      }
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      if (map.getLayer('parcels-extrusion')) {
        map.setLayoutProperty('parcels-extrusion', 'visibility', 'none');
      }
      if (map.getLayer('parcels-fill')) {
        map.setLayoutProperty('parcels-fill', 'visibility', 'visible');
      }
    }
  };

  const resetView = () => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      center: [90.3944, 23.759],
      zoom: 15,
      pitch: is3DMode ? 55 : 0,
      bearing: is3DMode ? -20 : 0,
      duration: 600,
    });
  };

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    const updated = !activeLayers[layerKey];
    setActiveLayers((prev) => ({ ...prev, [layerKey]: updated }));

    if (!mapRef.current) return;
    const map = mapRef.current;

    if (layerKey === 'boundary' && map.getLayer('parcels-line')) {
      map.setLayoutProperty('parcels-line', 'visibility', updated ? 'visible' : 'none');
    }
    if (layerKey === 'landType' && map.getLayer('parcels-fill')) {
      map.setLayoutProperty('parcels-fill', 'visibility', updated ? 'visible' : 'none');
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-slate-950">
      {/* Permanent Non-Dismissible Legal Banner (Mandatory 3.1) */}
      <div className="absolute top-2 left-2 right-2 z-20">
        <DisclaimerBanner type="map" />
      </div>

      {/* Offline Alert Overlay if internet is down */}
      {!isOnline && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md text-center text-slate-200">
          <WifiOff className="w-12 h-12 text-amber-400 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            মানচিত্র সাময়িকভাবে অফলাইনে অনুপলব্ধ
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            টাইল লোড করার জন্য ইন্টারনেট সংযোগ প্রয়োজন। আপনি নিচের এক্সেসিবিলিটি তালিকা থেকে সংরক্ষিত পার্সেলসমূহ দেখতে পারেন।
          </p>
          <button
            onClick={() => setShowAccessibilityList(true)}
            className="py-2 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            পার্সেল তালিকা দেখুন
          </button>
        </div>
      )}

      {/* Demo Parcel Quick Selector Bar */}
      <div className="absolute top-24 left-2 z-10 flex items-center gap-1.5 overflow-x-auto max-w-[calc(100%-80px)] p-1 rounded-xl bg-slate-950/80 border border-slate-800 backdrop-blur-md text-[11px]">
        <span className="text-slate-400 pl-1 font-semibold flex items-center gap-0.5 shrink-0">
          <MapPin className="w-3 h-3 text-emerald-400" /> ডেমো:
        </span>
        {demoParcels.map((p) => (
          <button
            key={p.synthetic_id}
            onClick={() => handleSelectParcelById(p.synthetic_id)}
            className={`px-2 py-0.5 rounded-lg border font-mono shrink-0 transition-colors ${
              selectedParcel?.synthetic_id === p.synthetic_id
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold'
                : 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800'
            }`}
          >
            {p.synthetic_id}
          </button>
        ))}
      </div>

      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Controls (Right Side) */}
      <div className="absolute top-24 right-3 z-10 flex flex-col gap-2">
        {/* 2D / 3D Toggle */}
        <button
          onClick={toggle3D}
          disabled={!webGlSupported || isLowNetworkMode}
          className={`p-2.5 rounded-xl border shadow-xl backdrop-blur-md flex items-center justify-center transition-all ${
            is3DMode
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : 'bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800 disabled:opacity-40'
          }`}
          title="2D / 3D মোড পরিবর্তন"
          aria-label="2D/3D Toggle"
        >
          <Box className="w-5 h-5" />
          <span className="text-[10px] font-bold ml-1">{is3DMode ? '3D' : '2D'}</span>
        </button>

        {/* Reset View Button */}
        <button
          onClick={resetView}
          className="p-2.5 rounded-xl bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md hover:bg-slate-800"
          title="ভিউ রিসেট করুন"
          aria-label="Reset View"
        >
          <RotateCcw className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Layer Toggle Button */}
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="p-2.5 rounded-xl bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md hover:bg-slate-800"
          title="লেয়ার ও ফিল্টার"
          aria-label="Layer Menu"
        >
          <Layers className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Accessibility Parcel List Toggle */}
        <button
          onClick={() => setShowAccessibilityList(!showAccessibilityList)}
          className="p-2.5 rounded-xl bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md hover:bg-slate-800"
          title="পার্সেল তালিকা (এক্সেসিবিলিটি)"
          aria-label="Accessibility List"
        >
          <List className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Layer Menu Popover */}
        {showLayerMenu && (
          <div className="absolute right-0 top-36 w-52 p-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl animate-in fade-in text-xs space-y-2 z-20">
            <h4 className="font-bold text-white mb-2 pb-1 border-b border-slate-800">
              মানচিত্রের স্তরসমূহ
            </h4>
            <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
              <span>দাগ সীমানা</span>
              <input
                type="checkbox"
                checked={activeLayers.boundary}
                onChange={() => toggleLayer('boundary')}
                className="accent-primary rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
              <span>ভূমির শ্রেণি</span>
              <input
                type="checkbox"
                checked={activeLayers.landType}
                onChange={() => toggleLayer('landType')}
                className="accent-primary rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
              <span>সড়ক ও যোগাযোগ</span>
              <input
                type="checkbox"
                checked={activeLayers.roads}
                onChange={() => toggleLayer('roads')}
                className="accent-primary rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
              <span>নদী ও জলাশয়</span>
              <input
                type="checkbox"
                checked={activeLayers.water}
                onChange={() => toggleLayer('water')}
                className="accent-primary rounded"
              />
            </label>
          </div>
        )}
      </div>

      {/* Accessibility Text List Modal/Drawer (3.4) */}
      {showAccessibilityList && (
        <div className="absolute inset-x-2 top-24 bottom-20 z-30 max-w-lg mx-auto bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">পার্সেল তালিকা (Screen Reader & Accessibility)</h3>
            <button
              onClick={() => setShowAccessibilityList(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-2">
            {demoParcels.map((p) => (
              <div
                key={p.synthetic_id}
                onClick={() => {
                  setSelectedParcel(p);
                  setShowAccessibilityList(false);
                }}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-bold text-emerald-400">{p.synthetic_id}</span>
                  <span className="text-slate-400">শ্রেণি: {p.land_class}</span>
                </div>
                <div className="text-slate-300">ক্ষেত্রফল: {p.area_acres} একর</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Sheet for Selected Parcel (Mandatory 3.2) */}
      {selectedParcel && (
        <div className="absolute bottom-16 left-2 right-2 z-40 max-w-lg mx-auto p-4 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                সিনথেটিক আইডি: {selectedParcel.synthetic_id}
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                শ্রেণি: {selectedParcel.land_class} • পরিমাণ: {selectedParcel.area_acres} একর
              </h3>
            </div>
            <button
              onClick={() => setSelectedParcel(null)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alert Counts by Severity (Strictly no safe/unsafe colors on parcels) */}
          {selectedParcel.alert_counts && (
            <div className="flex flex-wrap items-center gap-1.5 my-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">অসঙ্গতি নির্দেশক:</span>
              {selectedParcel.alert_counts.high > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  উচ্চ গুরুত্ব: {selectedParcel.alert_counts.high}
                </span>
              )}
              {selectedParcel.alert_counts.warn > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  সতর্কতা: {selectedParcel.alert_counts.warn}
                </span>
              )}
              {selectedParcel.alert_counts.info > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  তথ্যগত: {selectedParcel.alert_counts.info}
                </span>
              )}
              {selectedParcel.alert_counts.total === 0 && (
                <span className="text-emerald-400 text-[11px]">কোনো অসঙ্গতি পাওয়া যায়নি</span>
              )}
            </div>
          )}

          {/* Sample Documents List */}
          <div className="mt-2 text-xs text-slate-300">
            <span className="text-slate-400 font-semibold block mb-1">নমুনা নথিপত্র:</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedParcel.sample_documents.map((doc, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/60 flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  {doc}
                </span>
              ))}
            </div>
          </div>

          {/* "ক্রেতা রিপোর্ট দেখুন" (View Buyer Report) Action Button */}
          <div className="pt-3">
            <button
              onClick={() => onNavigateToReport && onNavigateToReport(selectedParcel.synthetic_id)}
              className="touch-target w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-emerald-600 text-white font-semibold text-xs shadow-lg shadow-emerald-950/50 active:scale-98 transition-all"
            >
              <FileBarChart className="w-4 h-4" />
              <span>ক্রেতা রিপোর্ট দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
