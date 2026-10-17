import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Scale,
  ShieldAlert,
  Flame,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  Info,
  Box,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';

export interface BoundingBox {
  id: string;
  field_name: string;
  label_bn: string;
  ocr_text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'verified' | 'tampered' | 'warning';
  confidence: number;
  official_record: string;
  evidence_bn: string;
}

export interface ForensicsData {
  document_template: string;
  deed_title_bn: string;
  deed_no: string;
  has_tampering: boolean;
  tamper_summary_bn: string;
  risk_score: number;
  boxes: BoundingBox[];
}

export const VisualDeedHeatmapScanner: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [activePreset, setActivePreset] = useState<'tampered' | 'clean' | 'porcha'>('tampered');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>('box-area');
  const [isLoading, setIsLoading] = useState(false);
  const [forensicsData, setForensicsData] = useState<ForensicsData | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [is3DMode, setIs3DMode] = useState<boolean>(false); // Default flat for 100% clarity
  const [isLaserScanning, setIsLaserScanning] = useState<boolean>(true);
  const [showHighlighters, setShowHighlighters] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<'document' | 'audit'>('document');
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>('box-area');

  const fetchForensics = async (preset: 'tampered' | 'clean' | 'porcha') => {
    setIsLoading(true);
    try {
      const res = await api.post<ForensicsData>('/api/v1/ml/visual-forensics', {
        preset: preset,
      });
      setForensicsData(res);
      const tampered = res.boxes.find((b) => b.status === 'tampered');
      const defaultId = tampered ? tampered.id : res.boxes[0]?.id || null;
      setSelectedBoxId(defaultId);
      setExpandedFieldId(defaultId);
    } catch {
      // Local fallback with authentic presets
      if (preset === 'tampered') {
        setForensicsData({
          document_template: 'deed_sale_54',
          deed_title_bn: 'সাফ-কবলা বিক্রয় দলিল (ঘষামাজা ও জাল জমি বিক্রয় টেস্ট)',
          deed_no: '৯৮৪২/২০২২',
          has_tampering: true,
          tamper_summary_bn:
            'উচ্চমাত্রার জালিয়াতি শনাক্ত! দলিলের ৩৪ শতাংশের স্থানে কলমের কালি দিয়ে ঘষামাজা করে ৮৪ করা হয়েছে। মূল খতিয়ানে জমি মাত্র ৩৪ শতাংশ (৫০ শতাংশ অতিরিক্ত জাল বিক্রয়)!',
          risk_score: 92.5,
          boxes: [
            {
              id: 'box-area',
              field_name: 'area',
              label_bn: 'জমির পরিমাণ (জালিয়াতি শনাক্ত)',
              ocr_text: 'জমির পরিমাণ: ৮৪ শতাংশ (ঘষামাজা চিহ্নিত)',
              x: 18,
              y: 42,
              width: 68,
              height: 7,
              status: 'tampered',
              confidence: 0.62,
              official_record: 'প্রকৃত সরকারি রেকর্ড: ৩৪.০০ শতাংশ',
              evidence_bn:
                'দলিলের ৩৪ শতাংশের স্থানে কলমের কালি দিয়ে ঘষামাজা করে ৮৪ করা হয়েছে! মূল রেকর্ডকৃত খতিয়ানে জমি মাত্র ৩৪ শতাংশ (৫০ শতাংশ অতিরিক্ত জাল বিক্রয়)!',
            },
            {
              id: 'box-dag',
              field_name: 'dag_no',
              label_bn: 'দাগ নম্বর',
              ocr_text: 'দাগ নং ১২০৫/১',
              x: 18,
              y: 33,
              width: 25,
              height: 5.5,
              status: 'verified',
              confidence: 0.99,
              official_record: 'দাগ নং ১২০৫/১ (খতিয়ান ৩৪০)',
              evidence_bn: 'ক্যাডাস্ট্রাল ম্যাপ ও আরএস নকশার দাগ পলিগনের সাথে মিলেছে।',
            },
            {
              id: 'box-khatian',
              field_name: 'khatian_no',
              label_bn: 'খতিয়ান নম্বর',
              ocr_text: 'খতিয়ান নং ৩৪০',
              x: 48,
              y: 33,
              width: 25,
              height: 5.5,
              status: 'verified',
              confidence: 0.98,
              official_record: 'খতিয়ান নং ৩৪০ (আরএস)',
              evidence_bn: 'জেলা রেকর্ড রুমের আরএস স্বত্বলিপি খতিয়ানের সাথে মিলেছে।',
            },
            {
              id: 'box-mouza',
              field_name: 'mouza',
              label_bn: 'মৌজা ও জেএল নং',
              ocr_text: 'মৌজা: তেজগাঁও, জেএল নং ২৯',
              x: 55,
              y: 24,
              width: 38,
              height: 5.2,
              status: 'verified',
              confidence: 0.98,
              official_record: 'মৌজা: তেজগাঁও (জেএল ২৯)',
              evidence_bn: 'উপজেলা ও সার্কেল মৌজা গেজেটের সাথে সম্পূর্ণ একরূপ।',
            },
            {
              id: 'box-buyer',
              field_name: 'buyer',
              label_bn: 'গ্রহীতা (ক্রেতা)',
              ocr_text: 'ক্রেতা: মোঃ রহিম মিয়া',
              x: 18,
              y: 53,
              width: 36,
              height: 5.5,
              status: 'verified',
              confidence: 0.97,
              official_record: 'মোঃ রহিম মিয়া (এনআইডি যাচাইকৃত)',
              evidence_bn: 'জাতীয় পরিচয়পত্র ও ভোটার তালিকার সাথে মিল পাওয়া গেছে।',
            },
            {
              id: 'box-seller',
              field_name: 'seller',
              label_bn: 'দাতা (বিক্রেতা)',
              ocr_text: 'বিক্রেতা: আবদুল করিম',
              x: 58,
              y: 53,
              width: 34,
              height: 5.5,
              status: 'verified',
              confidence: 0.96,
              official_record: 'আবদুল করিম (রেকর্ডকৃত মালিক)',
              evidence_bn: 'পূর্ববর্তী আরএস খতিয়ানের মূল মালিকের নামের সাথে শতভাগ মিল।',
            },
            {
              id: 'box-seal',
              field_name: 'registration_seal',
              label_bn: 'রেজিস্ট্রি সিল ও স্ট্যাম্প',
              ocr_text: 'রেজিস্ট্রি সিল: SUB-REGISTRY-TEJGAON',
              x: 22,
              y: 6,
              width: 56,
              height: 8.5,
              status: 'verified',
              confidence: 0.95,
              official_record: 'স্ট্যাম্প সিরিজ: খ-৭৮৯৪৫৬ (বৈধ)',
              evidence_bn: 'সরকারি ট্রেজারি ও সাব-রেজিস্ট্রি অফিস থেকে স্ট্যাম্প ভেন্ডর সিরিয়াল বৈধ।',
            },
          ],
        });
        setSelectedBoxId('box-area');
        setExpandedFieldId('box-area');
      } else if (preset === 'porcha') {
        setForensicsData({
          document_template: 'khatian_rs_porcha',
          deed_title_bn: 'আরএস খতিয়ান ও স্বত্বলিপি পরচা (জিনজিড়া)',
          deed_no: 'খতিয়ান নং ৮৮/২',
          has_tampering: false,
          tamper_summary_bn: 'পরচা সম্পূর্ণ ত্রুটিমুক্ত ও ১০০% সরকারি আরএস ভলিউমের সাথে সামঞ্জস্যপূর্ণ।',
          risk_score: 0.0,
          boxes: [
            {
              id: 'box-porcha-header',
              field_name: 'header',
              label_bn: 'পরচা ফরম কোড',
              ocr_text: 'বাংলাদেশ ফরম নং ৫৪৫৮ - আরএস খতিয়ান',
              x: 20,
              y: 8,
              width: 60,
              height: 6,
              status: 'verified',
              confidence: 0.98,
              official_record: 'বিজি প্রেস অনুমোদিত সরকারি ফরম',
              evidence_bn: 'বাংলাদেশ গভর্নমেন্ট প্রেস ফরম কোড সঠিক ও স্বীকৃত।',
            },
            {
              id: 'box-mouza-p',
              field_name: 'mouza',
              label_bn: 'মৌজা ও জেএল',
              ocr_text: 'মৌজা: জিনজিড়া (জেএল ১৫)',
              x: 15,
              y: 22,
              width: 35,
              height: 5.2,
              status: 'verified',
              confidence: 0.97,
              official_record: 'মৌজা: জিনজিরা (কেরানীগঞ্জ)',
              evidence_bn: 'উপজেলা ও সার্কেল মৌজা তালিকার সাথে একরূপ।',
            },
            {
              id: 'box-dag-p',
              field_name: 'dag_no',
              label_bn: 'দাগ নম্বর',
              ocr_text: 'দাগ নং ৪২০/৩',
              x: 15,
              y: 32,
              width: 25,
              height: 5.2,
              status: 'verified',
              confidence: 0.99,
              official_record: 'দাগ নং ৪২০/৩ (বাস্তু ও নাল)',
              evidence_bn: 'ক্যাডাস্ট্রাল নকশার সাথে দাগের অবস্থান সঠিক।',
            },
            {
              id: 'box-area-p',
              field_name: 'area',
              label_bn: 'মোট জমির পরিমাণ',
              ocr_text: 'মোট জমি: ৫০.০০ শতাংশ',
              x: 50,
              y: 32,
              width: 30,
              height: 5.2,
              status: 'verified',
              confidence: 0.98,
              official_record: '৫০.০০ শতাংশ (০.৫০ একর)',
              evidence_bn: 'খতিয়ান খতের মোট জমি ও দখল সম্পূর্ণ সামঞ্জস্যপূর্ণ।',
            },
            {
              id: 'box-owner-p',
              field_name: 'owner',
              label_bn: 'স্বত্বাধিকারী মালিক',
              ocr_text: 'মালিক: শ্রী সুবোধ চন্দ্র পাল',
              x: 15,
              y: 44,
              width: 45,
              height: 5.5,
              status: 'verified',
              confidence: 0.96,
              official_record: 'শ্রী সুবোধ চন্দ্র পাল (পিতা: রমেশ পাল)',
              evidence_bn: 'সিএস থেকে আরএস উত্তরাধিকার সূত্রে ধারাবাহিক স্বত্ব প্রমাণিত।',
            },
          ],
        });
        setSelectedBoxId('box-mouza-p');
        setExpandedFieldId('box-mouza-p');
      } else {
        // Clean deed
        setForensicsData({
          document_template: 'deed_sale_54',
          deed_title_bn: 'বৈধ সাফ-কবলা বিক্রয় দলিল (তেজগাঁও ১২০৫/১)',
          deed_no: '১২০৫/২০২২',
          has_tampering: false,
          tamper_summary_bn: 'দলিল সম্পূর্ণ বৈধ ও ১০০% জেলা রেকর্ড রুমের সরকারি খতিয়ানের সাথে মিল রয়েছে।',
          risk_score: 0.0,
          boxes: [
            {
              id: 'box-deed-no-c',
              field_name: 'deed_no',
              label_bn: 'দলিল নম্বর',
              ocr_text: 'দলিল নং ১২০৫/২০২২',
              x: 18,
              y: 17.5,
              width: 32,
              height: 5.2,
              status: 'verified',
              confidence: 0.99,
              official_record: 'দলিল নং ১২০৫ (বৈধ নিবন্ধিত)',
              evidence_bn: 'সাব-রেজিস্ট্রি ভলিউমে রেকর্ডকৃত দলিলের সাথে হুবহু মিল রয়েছে।',
            },
            {
              id: 'box-mouza-c',
              field_name: 'mouza',
              label_bn: 'মৌজা ও জেএল নং',
              ocr_text: 'মৌজা: তেজগাঁও, জেএল নং ২৯',
              x: 55,
              y: 17.5,
              width: 38,
              height: 5.2,
              status: 'verified',
              confidence: 0.99,
              official_record: 'মৌজা: তেজগাঁও (জেএল ২৯)',
              evidence_bn: 'উপজেলা ও সার্কেল গেজেটের সাথে শতভাগ একরূপ।',
            },
            {
              id: 'box-dag-c',
              field_name: 'dag_no',
              label_bn: 'দাগ নম্বর',
              ocr_text: 'দাগ নং ১২০৫/১',
              x: 18,
              y: 26,
              width: 24,
              height: 5.5,
              status: 'verified',
              confidence: 0.99,
              official_record: 'দাগ নং ১২০৫/১ (খতিয়ান ৩৪০)',
              evidence_bn: 'ক্যাডাস্ট্রাল ম্যাপ ও আরএস নকশার সাথে হুবহু মিল পাওয়া গেছে।',
            },
            {
              id: 'box-area-c',
              field_name: 'area',
              label_bn: 'বিক্রিত জমির পরিমাণ',
              ocr_text: 'জমির পরিমাণ: ৩৩ শতাংশ (০.৩৩ একর)',
              x: 18,
              y: 35,
              width: 70,
              height: 6.5,
              status: 'verified',
              confidence: 0.99,
              official_record: '৩৩.০০ শতাংশ (বৈধ মালিকানা অংশ)',
              evidence_bn: 'দাতার হিস্যা অনুসারে দখল ও মালিকানা স্বত্ব সম্পূর্ণ সঠিক ও অখণ্ড।',
            },
          ],
        });
        setSelectedBoxId('box-area-c');
        setExpandedFieldId('box-area-c');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForensics(activePreset);
  }, [activePreset]);

  const handleSelectField = (id: string) => {
    setSelectedBoxId(id);
    setExpandedFieldId(id);
  };

  const totalFields = forensicsData?.boxes.length || 0;
  const tamperedCount = forensicsData?.boxes.filter((b) => b.status === 'tampered').length || 0;
  const verifiedCount = totalFields - tamperedCount;

  return (
    <div className="w-full space-y-4">
      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROLS BAR: Minimalist & Clean                           */}
      {/* ------------------------------------------------------------- */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#070d14] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 hidden sm:inline">
            {isBn ? 'টেস্ট মোড:' : 'Mode:'}
          </span>

          <button
            type="button"
            onClick={() => setActivePreset('tampered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePreset === 'tampered'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-200" />
            <span>{isBn ? 'জাল দলিল (ঘষামাজা টেস্ট)' : 'Tampered Deed'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePreset('clean')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePreset === 'clean'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isBn ? 'বৈধ দলিল (তেজগাঁও)' : 'Authentic Deed'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePreset('porcha')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activePreset === 'porcha'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-2 ring-cyan-400'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isBn ? 'আরএস পরচা ও খতিয়ান' : 'RS Porcha'}</span>
          </button>
        </div>

        {/* Display Toggles */}
        <div className="flex items-center gap-2 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIs3DMode(!is3DMode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                is3DMode
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle Gentle 3D Depth"
            >
              <Box className="w-3.5 h-3.5" />
              <span>{is3DMode ? '৩ডি অন' : 'ফ্ল্যাট ভিউ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHighlighters(!showHighlighters)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
                showHighlighters
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle Field Highlights"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showHighlighters ? 'হাইলাইটার অন' : 'অফ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLaserScanning(!isLaserScanning)}
              className={`p-1.5 rounded-lg border transition-all ${
                isLaserScanning
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Toggle Laser Scan Line"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.3, z + 0.1))}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.1))}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE SEGMENTED TABS (Hidden on desktop)                     */}
      {/* ------------------------------------------------------------- */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setMobileTab('document')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'document'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>{isBn ? 'মূল দলিল ভিউ' : 'Document View'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('audit')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'audit'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Scale className="w-4 h-4 text-rose-500" />
          <span>
            {isBn ? 'অডিট লেজার' : 'Audit Ledger'}
            {tamperedCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                {tamperedCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN TWO-COLUMN SPLIT (Responsive)                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =========================================================== */}
        {/* LEFT COLUMN: Authentic Document Canvas (7 cols)            */}
        {/* =========================================================== */}
        <div
          className={`lg:col-span-7 flex flex-col space-y-3 ${
            mobileTab === 'audit' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {isBn ? 'মূল দলিলের ছবি ও স্বয়ংক্রিয় দাগ চিহ্নিতকরণ' : 'Original Deed with Field Tracing'}
              </h3>
              {isLoading && (
                <span className="text-[10px] text-emerald-500 font-mono animate-pulse">
                  {isBn ? 'বিশ্লেষণ চলছে...' : 'Analyzing...'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {forensicsData?.deed_no || 'REG: ৯৮৪২'}
            </span>
          </div>

          {/* Document Canvas Container */}
          <div
            style={{
              perspective: is3DMode ? '1400px' : 'none',
            }}
            className="w-full rounded-2xl bg-slate-200 dark:bg-[#04080c] border border-slate-300 dark:border-slate-800 p-2 sm:p-5 overflow-hidden transition-all shadow-inner"
          >
            <div
              style={{
                transform: is3DMode
                  ? `scale(${zoomLevel}) rotateX(5deg) rotateY(-2deg)`
                  : `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.3s ease-out',
              }}
              className="relative w-full rounded-xl bg-[#fffefb] dark:bg-[#070b10] border-2 border-amber-900/20 dark:border-emerald-500/30 shadow-xl p-4 sm:p-7 flex flex-col justify-between overflow-hidden text-slate-800 dark:text-slate-200"
            >
              {/* Subtle Archival Watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] flex items-center justify-center select-none">
                <span className="text-6xl sm:text-8xl font-black font-serif uppercase tracking-widest text-slate-900 dark:text-white -rotate-12">
                  BANGLADESH
                </span>
              </div>

              {/* Gentle Laser Scanning Beam */}
              {isLaserScanning && (
                <div
                  className="absolute left-0 right-0 h-1 pointer-events-none z-30 opacity-70"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, #10b981, #34d399, #10b981, transparent)',
                    boxShadow: '0 0 12px #10b981, 0 0 24px #34d399',
                    animation: 'lt-scan 4s ease-in-out infinite alternate',
                  }}
                />
              )}

              {/* ------------------------------------------------------- */}
              {/* DOCUMENT HEADER: Official Crest & Metadata              */}
              {/* ------------------------------------------------------- */}
              <div className="border-b-2 border-double border-amber-900/30 dark:border-slate-800 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-amber-800/30 dark:border-emerald-500/30 flex items-center justify-center p-1 bg-amber-500/10 shrink-0">
                    <img src="/logo.png" alt="Govt Crest" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-amber-900 dark:text-emerald-400 uppercase block">
                      গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-serif">
                      {forensicsData?.deed_title_bn || 'সাফ-কবলা বিক্রয় দলিল'}
                    </h4>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-800/10 dark:bg-slate-800 text-amber-900 dark:text-amber-400 border border-amber-800/20 block sm:inline-block">
                    {activePreset === 'porcha' ? 'FORM NO. 5458' : 'FORM NO. 54'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                    {forensicsData?.deed_no || 'REG: ৯৮৪২/২০২২'}
                  </span>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* DOCUMENT BODY: Clean, Integrated Interactive Inline Fields */}
              {/* ------------------------------------------------------- */}
              <div className="my-5 space-y-4 text-xs sm:text-[13px] leading-relaxed font-serif">
                {activePreset === 'porcha' ? (
                  /* PORCHA / KHATIAN TEMPLATE */
                  <>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 border-b border-amber-900/15 dark:border-slate-800 pb-2 font-sans">
                      <span>জেলা: ঢাকা • উপজেলা: কেরানীগঞ্জ</span>
                      <span>সার্কেল: জিনজিরা সার্কেল অফিস</span>
                    </div>

                    <p>
                      স্বত্বলিপি ও আরএস খতিয়ান রেজিস্টার হইতে উদ্ধৃত বিবরণ।{' '}
                      <span
                        onClick={() => handleSelectField('box-mouza-p')}
                        className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-sans font-semibold ${
                          selectedBoxId === 'box-mouza-p'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                            : showHighlighters
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : ''
                        }`}
                      >
                        মৌজা: জিনজিড়া (জেএল ১৫)
                      </span>
                    </p>

                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-black/30 border border-amber-200 dark:border-slate-800 grid grid-cols-2 gap-3 font-sans">
                      <div>
                        <span className="text-[10px] text-slate-400 block">দাগ বিবরণ:</span>
                        <span
                          onClick={() => handleSelectField('box-dag-p')}
                          className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-semibold ${
                            selectedBoxId === 'box-dag-p'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                              : showHighlighters
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          দাগ নং ৪২০/৩ (বাস্তু ও নাল)
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">মোট জমি:</span>
                        <span
                          onClick={() => handleSelectField('box-area-p')}
                          className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-semibold ${
                            selectedBoxId === 'box-area-p'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                              : showHighlighters
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          ৫০.০০ শতাংশ (০.৫০ একর)
                        </span>
                      </div>
                    </div>

                    <div className="font-sans text-[11px] pt-1">
                      <span className="text-slate-400 block text-[10px]">রেকর্ডীয় মালিক:</span>
                      <span
                        onClick={() => handleSelectField('box-owner-p')}
                        className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-semibold ${
                          selectedBoxId === 'box-owner-p'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                            : showHighlighters
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : ''
                        }`}
                      >
                        শ্রী সুবোধ চন্দ্র পাল, পিতা: রমেশ পাল
                      </span>
                    </div>
                  </>
                ) : (
                  /* DEED TEMPLATE (Tampered or Clean) */
                  <>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 border-b border-amber-900/15 dark:border-slate-800 pb-2 font-sans">
                      <span>সাব-রেজিস্ট্রি কার্যালয়: তেজগাঁও, ঢাকা</span>
                      <span>দলিল নিবন্ধনের তারিখ: ১২/০৫/২০২২ ইং</span>
                    </div>

                    {/* Paragraph 1: Opening & Mouza */}
                    <p>
                      মহা পরাক্রমশালী পরম করুণাময় আল্লাহতায়ালার নাম স্মরণে অত্র সাফ-কবলা দলিলের বয়ান আরম্ভ করিলাম।
                      জেলা: ঢাকা, থানা: তেজগাঁও,{' '}
                      <span
                        onClick={() => handleSelectField(activePreset === 'tampered' ? 'box-mouza' : 'box-mouza-c')}
                        className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-sans font-semibold ${
                          selectedBoxId === 'box-mouza' || selectedBoxId === 'box-mouza-c'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                            : showHighlighters
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : ''
                        }`}
                      >
                        মৌজা: তেজগাঁও (জেএল নং ২৯)
                      </span>
                      ।
                    </p>

                    {/* Paragraph 2: Dag & Khatian */}
                    <p>
                      নিম্ন তপশীলোক্ত জমি যাহার সাবেক খতিয়ান নং ৩৪০, এসএ খতিয়ান নং ১২৪, সিটি আরএস খতিয়ান নং{' '}
                      <span
                        onClick={() => handleSelectField('box-khatian')}
                        className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-sans font-semibold ${
                          selectedBoxId === 'box-khatian'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                            : showHighlighters
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : ''
                        }`}
                      >
                        ৩৪০
                      </span>
                      । রেকর্ডীয় ক্যাডাস্ট্রাল দাগ নং{' '}
                      <span
                        onClick={() => handleSelectField(activePreset === 'tampered' ? 'box-dag' : 'box-dag-c')}
                        className={`inline-block px-2 py-0.5 rounded cursor-pointer transition-all border font-sans font-semibold ${
                          selectedBoxId === 'box-dag' || selectedBoxId === 'box-dag-c'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400'
                            : showHighlighters
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                            : ''
                        }`}
                      >
                        ১২০৫/১
                      </span>
                      ।
                    </p>

                    {/* Paragraph 3: Area (Critical Spotlight) */}
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-black/40 border border-amber-200 dark:border-slate-800">
                      <p className="font-semibold">
                        বিক্রিত জমির পরিমাণ: অত্র দাগে মোট জমি{' '}
                        {activePreset === 'tampered' ? (
                          <span
                            onClick={() => handleSelectField('box-area')}
                            className={`inline-block px-2.5 py-1 rounded cursor-pointer transition-all border font-mono font-black ${
                              selectedBoxId === 'box-area'
                                ? 'bg-rose-500/30 border-rose-500 text-rose-800 dark:text-rose-300 ring-2 ring-rose-400 shadow-md animate-pulse'
                                : showHighlighters
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-400'
                                : ''
                            }`}
                          >
                            ৮৪ শতাংশ (ঘষামাজা চিহ্নিত) ⚠️
                          </span>
                        ) : (
                          <span
                            onClick={() => handleSelectField('box-area-c')}
                            className={`inline-block px-2.5 py-1 rounded cursor-pointer transition-all border font-mono font-black ${
                              selectedBoxId === 'box-area-c'
                                ? 'bg-emerald-500/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-400'
                                : showHighlighters
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-400'
                                : ''
                            }`}
                          >
                            ৩৩ শতাংশ (০.৩৩ একর) ✓
                          </span>
                        )}{' '}
                        যাহার দখলীয় অংশ নিরঙ্কুশভাবে দাতা কর্তৃক হস্তান্তর করিলাম।
                      </p>
                    </div>

                    {/* Paragraph 4: Parties */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1 font-sans">
                      <div>
                        <span className="text-slate-400 block text-[10px]">গ্রহীতা (১ম পক্ষ / ক্রেতা):</span>
                        <span
                          onClick={() => handleSelectField('box-buyer')}
                          className={`inline-block px-1.5 py-0.5 rounded cursor-pointer transition-all border font-semibold ${
                            selectedBoxId === 'box-buyer'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400'
                              : showHighlighters
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          মোঃ রহিম মিয়া (পিতা: মরহুম রহমান মিয়া)
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">দাতা (২য় পক্ষ / বিক্রেতা):</span>
                        <span
                          onClick={() => handleSelectField('box-seller')}
                          className={`inline-block px-1.5 py-0.5 rounded cursor-pointer transition-all border font-semibold ${
                            selectedBoxId === 'box-seller'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400'
                              : showHighlighters
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          আবদুল করিম (পিতা: ফজলুল হক)
                        </span>
                      </div>
                    </div>

                    {/* Paragraph 5: Chouhaddi */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-amber-900/10 dark:border-slate-800">
                      চৌহদ্দি: উত্তরে সরকারি ১২ ফুট রাস্তা, দক্ষিণে দাগ নং ১২০৬, পূর্বে দাগ ১২০৪, পশ্চিমে সরকারি ড্রেন।
                    </div>
                  </>
                )}
              </div>

              {/* ------------------------------------------------------- */}
              {/* DOCUMENT FOOTER: Official Registration Seal             */}
              {/* ------------------------------------------------------- */}
              <div className="pt-3 border-t-2 border-amber-900/20 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                <span
                  onClick={() => handleSelectField('box-seal')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all border ${
                    selectedBoxId === 'box-seal'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400'
                      : showHighlighters
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                      : ''
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono text-[10px]">SEAL: SUB-REGISTRY-TEJGAON</span>
                </span>

                <span className="font-bold text-amber-900 dark:text-amber-400 text-[10px]">
                  বাংলাদেশ রাজস্ব স্ট্যাম্প বৈধ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================== */}
        {/* RIGHT COLUMN: Minimalist & Clean Audit Ledger (5 cols)     */}
        {/* =========================================================== */}
        <div
          className={`lg:col-span-5 flex flex-col space-y-4 ${
            mobileTab === 'document' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Summary Card */}
          {forensicsData && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                forensicsData.has_tampering
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      forensicsData.has_tampering
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {forensicsData.has_tampering ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black tracking-tight">
                      {forensicsData.has_tampering
                        ? (isBn ? 'উচ্চমাত্রার জালিয়াতি শনাক্ত' : 'High Risk Forgery Detected')
                        : (isBn ? 'দলিল শতভাগ সঠিক ও রেকর্ডভুক্ত' : '100% Authentic Deed')}
                    </h4>
                    <span className="text-[11px] opacity-80 block">
                      {forensicsData.has_tampering
                        ? (isBn ? 'কলমের কালির ঘষামাজা ও জমি অসঙ্গতি' : 'Pen ink alteration detected')
                        : (isBn ? 'সকল কেন্দ্রীয় রেকর্ড মিলেছে' : 'All central records verified')}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-mono font-black px-2.5 py-1 rounded-full shrink-0 ${
                    forensicsData.has_tampering
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {forensicsData.has_tampering ? 'ঝুঁকি: ৯২.৫%' : 'ঝুঁকি: ০%'}
                </span>
              </div>

              {forensicsData.has_tampering && (
                <div className="mt-3 pt-3 border-t border-rose-500/20 text-xs leading-relaxed text-rose-900 dark:text-rose-300">
                  {forensicsData.tamper_summary_bn}
                </div>
              )}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#070d14] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">মোট ফিল্ড</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                {totalFields}টি
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#070d14] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">যাচাইকৃত</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {verifiedCount}টি
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#070d14] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold uppercase">অসঙ্গতি/জাল</span>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {tamperedCount}টি
              </span>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* UNIFIED AUDIT LEDGER (No duplicate lists/cards)           */}
          {/* --------------------------------------------------------- */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {isBn ? 'ফিল্ডভিত্তিক অডিট ফলাফল' : 'Field-by-Field Audit'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {isBn ? 'ক্লিক করে পরীক্ষা করুন' : 'Tap to inspect'}
              </span>
            </div>

            <div className="space-y-2">
              {forensicsData?.boxes.map((b) => {
                const isSelected = selectedBoxId === b.id;
                const isExpanded = expandedFieldId === b.id;
                const isTampered = b.status === 'tampered';

                return (
                  <div
                    key={b.id}
                    className={`rounded-xl border transition-all ${
                      isSelected
                        ? isTampered
                          ? 'border-rose-500 bg-rose-500/10 shadow-sm'
                          : 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070d14] hover:border-slate-300'
                    }`}
                  >
                    {/* Card Summary Header (Always visible) */}
                    <div
                      onClick={() => handleSelectField(b.id)}
                      className="p-3 cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isTampered ? (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white block truncate">
                            {b.label_bn}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                            {b.ocr_text}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isTampered
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {isTampered ? 'অসঙ্গতি' : 'সঠিক'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                        {/* Side-by-side comparison */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                              দলিল থেকে নিষ্কাশিত (OCR)
                            </span>
                            <span
                              className={`font-mono font-bold block ${
                                isTampered
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {b.ocr_text}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                              সরকারি রেকর্ড (Govt)
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                              {b.official_record}
                            </span>
                          </div>
                        </div>

                        {/* Evidence explanation */}
                        <div
                          className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                            isTampered
                              ? 'bg-rose-500/15 text-rose-900 dark:text-rose-200 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-[10px] uppercase mb-0.5">
                            <Info className="w-3 h-3 shrink-0" />
                            <span>ফরেনসিক বিশ্লেষণ:</span>
                          </div>
                          <p>{b.evidence_bn}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
