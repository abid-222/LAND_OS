import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  X,
  FileText,
  AlertTriangle,
  FileBarChart,
  ArrowRight,
  MapPin,
} from 'lucide-react';

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

interface MapPageProps {
  onNavigateToReport?: (parcelId: string) => void;
}

export const MapPage: React.FC<MapPageProps> = ({ onNavigateToReport }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [activeLayers, setActiveLayers] = useState({
    parcels: true,
    landType: true,
    roads: true,
    water: true,
  });

  const [selectedParcel, setSelectedParcel] = useState<ParcelDetail | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Dhaka Tejgaon coordinates: [90.3944, 23.7590]
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
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
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Add GeoJSON parcels layer
      map.addSource('parcels-source', {
        type: 'geojson',
        data: '/api/v1/map/parcels?bbox=90.38,23.74,90.41,23.77',
      });

      // Polygon fill layer
      map.addLayer({
        id: 'parcels-fill',
        type: 'fill',
        source: 'parcels-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'land_class'],
            'নাল',
            '#0B6B4A',
            'বাড়ি',
            '#d97706',
            'ভিটি',
            '#0284c7',
            '#0B6B4A',
          ],
          'fill-opacity': 0.35,
        },
      });

      // Polygon boundary stroke
      map.addLayer({
        id: 'parcels-line',
        type: 'line',
        source: 'parcels-source',
        paint: {
          'line-color': '#0B6B4A',
          'line-width': 2,
        },
      });

      // Interactive Click on parcel
      map.on('click', 'parcels-fill', async (e: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = (feat.properties || {}) as Record<string, unknown>;
        const pId = String(props.synthetic_id || props.parcel_id || 'P-4520');

        // Fetch detailed parcel summary
        let summaryData = null;
        try {
          const res = await fetch(`/api/v1/map/parcels/${pId}/summary`);
          if (res.ok) {
            summaryData = await res.json();
          }
        } catch {}

        setSelectedParcel({
          synthetic_id: pId,
          land_class: String(props.land_class || 'নাল'),
          area_acres: Number(props.area_acres) || 0.33,
          sample_documents: ['খতিয়ান নং ৩৪০', 'দলিল নং ১০৮২/২০২৪', 'নামজারি ডিসিআর'],
          alert_counts: summaryData?.alert_counts || { high: 0, warn: 1, info: 1, total: 2 },
        });
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
  }, []);

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    const updated = !activeLayers[layerKey];
    setActiveLayers((prev) => ({ ...prev, [layerKey]: updated }));

    if (!mapRef.current) return;
    const map = mapRef.current;

    if (layerKey === 'parcels' && map.getLayer('parcels-line')) {
      map.setLayoutProperty('parcels-line', 'visibility', updated ? 'visible' : 'none');
    }
    if (layerKey === 'landType' && map.getLayer('parcels-fill')) {
      map.setLayoutProperty('parcels-fill', 'visibility', updated ? 'visible' : 'none');
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-slate-950">
      {/* Persistent Legal Disclaimer Banner */}
      <div className="absolute top-2 left-2 right-2 z-10 p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/50 text-amber-200 text-xs shadow-xl backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-[11px] leading-tight">
            মানচিত্রটি শুধুমাত্র ধারণাগত / কোনো আইনি সীমানা নির্দেশ করে না (Illustrative / Not a legal boundary)
          </span>
        </div>
      </div>

      {/* Demo Parcel Quick Selector Bar */}
      <div className="absolute top-14 left-2 z-10 flex items-center gap-1.5 overflow-x-auto max-w-[calc(100%-80px)] p-1 rounded-xl bg-slate-950/80 border border-slate-800 backdrop-blur-md text-[11px]">
        <span className="text-slate-400 pl-1 font-semibold flex items-center gap-0.5 shrink-0">
          <MapPin className="w-3 h-3 text-emerald-400" /> ডেমো:
        </span>
        <button
          onClick={() => {
            setSelectedParcel({
              synthetic_id: 'P-4520',
              land_class: 'নাল',
              area_acres: 0.155,
              sample_documents: ['খতিয়ান ১২০৫', 'বায়া দলিল ১৯৯৮'],
              alert_counts: { high: 1, warn: 1, info: 1, total: 3 },
            });
          }}
          className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono hover:bg-slate-800 shrink-0 active:scale-95"
        >
          P-4520 (তেজগাঁও)
        </button>
        <button
          onClick={() => {
            setSelectedParcel({
              synthetic_id: 'P-3201',
              land_class: 'নাল',
              area_acres: 0.420,
              sample_documents: ['খতিয়ান ৭৮৯', 'নামজারি ২০০৫'],
              alert_counts: { high: 0, warn: 1, info: 2, total: 3 },
            });
          }}
          className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono hover:bg-slate-800 shrink-0 active:scale-95"
        >
          P-3201 (মিরপুর)
        </button>
      </div>

      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Layer Toggle Button (Right Side) */}
      <div className="absolute top-16 right-3 z-10">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="touch-target p-3 rounded-xl bg-slate-900/90 text-white border border-slate-700 shadow-xl backdrop-blur-md active:scale-95 transition-transform flex items-center gap-1.5"
          aria-label="মানচিত্রের স্তর পরিবর্তন"
        >
          <Layers className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold hidden sm:inline">লেয়ার</span>
        </button>

        {showLayerMenu && (
          <div className="absolute right-0 top-12 w-48 p-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl animate-in fade-in text-xs space-y-2">
            <h4 className="font-bold text-white mb-2">মানচিত্রের স্তরসমূহ</h4>
            <label className="flex items-center justify-between cursor-pointer text-slate-200 hover:text-white">
              <span>দাগ সীমানা</span>
              <input
                type="checkbox"
                checked={activeLayers.parcels}
                onChange={() => toggleLayer('parcels')}
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
              <span>সড়ক যোগাযোগ</span>
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

      {/* Bottom Sheet for Selected Parcel */}
      {selectedParcel && (
        <div className="absolute bottom-16 left-2 right-2 z-40 max-w-lg mx-auto p-4 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                আইডি: {selectedParcel.synthetic_id}
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

          {/* Alert Counts by Severity (Strictly no safety score or verdict) */}
          {selectedParcel.alert_counts && (
            <div className="flex flex-wrap items-center gap-1.5 my-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">যাচাই প্রয়োজন:</span>
              {selectedParcel.alert_counts.high > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/20 text-danger-light border border-danger/40">
                  উচ্চ মনোযোগ: {selectedParcel.alert_counts.high}
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
            <span className="text-slate-400 font-semibold block mb-1">সম্পর্কিত নথি:</span>
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
              className="touch-target w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-lg shadow-primary/20 active:scale-98 transition-all"
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
