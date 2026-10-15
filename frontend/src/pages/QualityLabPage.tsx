import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Gauge } from 'lucide-react';

export const QualityLabPage: React.FC = () => {
  const qrAccuracyData = [
    { day: 'রবি', rate: 94.2 },
    { day: 'সোম', rate: 95.1 },
    { day: 'মঙ্গল', rate: 96.4 },
    { day: 'বুধ', rate: 96.0 },
    { day: 'বৃহঃ', rate: 97.2 },
    { day: 'শুক্র', rate: 96.8 },
    { day: 'শনি', rate: 97.5 },
  ];

  const ocrBenchmarkData = [
    { model: 'PaddleOCR (bn)', charAcc: 95.2, wordAcc: 91.4 },
    { model: 'Tesseract (ben)', charAcc: 91.8, wordAcc: 86.2 },
    { model: 'Ensemble Gate', charAcc: 96.8, wordAcc: 93.5 },
  ];

  const latencyP95Data = [
    { time: '08:00', ms: 165 },
    { time: '10:00', ms: 182 },
    { time: '12:00', ms: 142 },
    { time: '14:00', ms: 155 },
    { time: '16:00', ms: 138 },
    { time: '18:00', ms: 145 },
  ];

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-6xl mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      <div className="flex items-center gap-2 mb-5">
        <Gauge className="w-6 h-6 text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-white">কোয়ালিটি ল্যাব ও মডেল পারফরম্যান্স</h1>
          <p className="text-xs text-slate-400">ওসিআর, কিউআর রিকগনিশন ও ল্যাটেন্সি মূল্যায়ন চার্ট</p>
        </div>
      </div>

      {/* Top Benchmark KPI Metric Badges */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">QR শনাক্তকরণ হার</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">৯৭.৫%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">OCR নির্ভুলতা (চরিত্র)</span>
          <span className="text-xl font-bold text-sky-400 font-mono">৯৬.৮%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">ম্যাচিং প্রিসিশন</span>
          <span className="text-xl font-bold text-indigo-400 font-mono">৯৭.২%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">P95 API ল্যাটেন্সি</span>
          <span className="text-xl font-bold text-amber-400 font-mono">১৪২ ms</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 md:col-span-1">
          <span className="text-[11px] text-slate-400 block mb-1">স্ক্যান-টু-রেজাল্ট সময়</span>
          <span className="text-xl font-bold text-emerald-400 font-mono">২.৩ সে.</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: QR Accuracy Over Time */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">
            কিউআর কোড ডিকোড সাফল্য হার (%)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qrAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[90, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#0B6B4A"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0B6B4A' }}
                  name="সাফল্য হার"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: OCR Accuracy Benchmark (Character vs Word) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">
            বাংলা ওসিআর ইঞ্জিন নির্ভুলতা তুলনা
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocrBenchmarkData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="model" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="charAcc" fill="#0B6B4A" radius={[4, 4, 0, 0]} name="অক্ষর নির্ভুলতা (%)" />
                <Bar dataKey="wordAcc" fill="#0284c7" radius={[4, 4, 0, 0]} name="শব্দ নির্ভুলতা (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: P95 Latency Trend */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4">
            P95 API এন্ডপয়েন্ট ল্যাটেন্সি ট্রেন্ড (মিলিসেকেন্ড)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyP95Data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[100, 200]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="ms"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#d97706' }}
                  name="P95 Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
