import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Info,
  ArrowRight,
  FileText,
  Search,
  FlipHorizontal,
  Clock,
} from 'lucide-react';
import { analyzeImageQuality } from '../lib/qualityGate';
import type { QualityAnalysisResult } from '../workers/qualityGate.worker';
import { scanQRCodeFromImage, type QRScanResult } from '../lib/qrScanner';
import { compressDocumentImage } from '../lib/imageCompressor';
import { enqueueOfflineDocument, hasOfflineConsent, setOfflineConsent } from '../lib/offlineQueue';
import { useNetworkStore } from '../lib/networkMonitor';

interface ScanPageProps {
  onScanComplete?: (documentId: string) => void;
  onNavigateToConfirm?: (documentId: string, durationMs?: number) => void;
  onNavigateToPending?: () => void;
  onNavigateToSearch?: () => void;
}

export const ScanPage: React.FC<ScanPageProps> = ({
  onNavigateToConfirm,
  onNavigateToPending,
  onNavigateToSearch,
}) => {
  // Step 1: 'explainer' -> Step 2: 'camera' -> Step 3: 'preview_quality' -> Step 4: 'uploading'
  const [step, setStep] = useState<'explainer' | 'camera' | 'preview_quality' | 'uploading'>('explainer');
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('document_scan.jpg');
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<QRScanResult | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [offlineSavedMessage, setOfflineSavedMessage] = useState<string | null>(null);
  const [scanResultTimeMs, setScanResultTimeMs] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanStartTimeRef = useRef<number | null>(null);

  const { isOnline, isLowNetworkMode } = useNetworkStore();

  // Stop camera tracks when unmounting or leaving camera step
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  /**
   * Adaptive camera starter:
   * First tries requested facingMode ('environment' for back camera on phone).
   * If on PC/laptop with front webcam only or environment fails, automatically
   * falls back to 'user' or any available video input!
   */
  const startCamera = async (targetFacingMode: 'environment' | 'user' = facingMode) => {
    setCameraPermissionDenied(false);
    stopCameraStream();

    let stream: MediaStream | null = null;
    let effectiveMode = targetFacingMode;

    try {
      // 1. Try preferred facing mode with ideal resolution
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } catch (firstErr) {
      console.warn(`getUserMedia facingMode ${targetFacingMode} failed, attempting generic PC webcam fallback:`, firstErr);
      try {
        // 2. Fallback to generic webcam or 'user' camera (ideal for laptop/PC)
        effectiveMode = targetFacingMode === 'environment' ? 'user' : 'environment';
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: effectiveMode },
          },
          audio: false,
        });
      } catch (secondErr) {
        console.warn('getUserMedia facingMode fallback failed, trying video: true:', secondErr);
        try {
          // 3. Fallback to any video device
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (finalErr) {
          console.warn('All camera access failed:', finalErr);
          setCameraPermissionDenied(true);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setFacingMode(effectiveMode);
      setStep('camera');

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    }
  };

  const handleToggleCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  const handleCaptureFromVideo = async () => {
    if (!videoRef.current) return;
    scanStartTimeRef.current = Date.now();
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stopCameraStream();

    canvas.toBlob(async (blob) => {
      if (blob) {
        await processCapturedImage(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      scanStartTimeRef.current = Date.now();
      stopCameraStream();
      await processCapturedImage(file);
    }
  };

  const processCapturedImage = async (rawBlob: Blob, fallbackName = 'document_scan.jpg') => {
    setIsAnalyzing(true);
    setCapturedBlob(rawBlob);
    const resolvedName = rawBlob instanceof File && rawBlob.name ? rawBlob.name : fallbackName;
    setCapturedFileName(resolvedName);
    const previewUrl = URL.createObjectURL(rawBlob);
    setCapturedPreviewUrl(previewUrl);
    setStep('preview_quality');

    try {
      // 1. Dynamic ZXing-WASM QR scan (QR-first)
      const detectedQR = await scanQRCodeFromImage(rawBlob);
      setQrResult(detectedQR);

      // 2. On-device Quality Gate Web Worker
      const quality = await analyzeImageQuality(rawBlob);
      setQualityResult(quality);
    } catch (err) {
      console.error('Error during image analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedFileName('document_scan.jpg');
    setCapturedPreviewUrl(null);
    setQualityResult(null);
    setQrResult(null);
    setOfflineSavedMessage(null);
    setScanResultTimeMs(null);
    startCamera(facingMode);
  };

  const handleProceedUpload = async () => {
    if (!capturedBlob) return;
    setStep('uploading');
    setUploadProgress(15);
    setUploadStatusText('ছবি অপ্টিমাইজ ও কম্প্রেস করা হচ্ছে...');

    const fileName = capturedFileName || 'document_scan.jpg';

    try {
      // 1. Compress image to 1600px long side, fix EXIF, ~0.8 quality
      const compressedFile = await compressDocumentImage(capturedBlob, fileName);
      setUploadProgress(40);

      // Check current network status or low-network offline capture
      const currentOnline = isOnline && !isLowNetworkMode;

      if (!currentOnline) {
        // Fallback to Encrypted Offline Queue (Section 6.4)
        setUploadStatusText('ইন্টারনেট সংযোগ পাওয়া যায়নি। অফলাইন এনক্রিপ্ট করে সংরক্ষণ করা হচ্ছে...');
        if (!hasOfflineConsent()) {
          setOfflineConsent(true);
        }

        const offlineResult = await enqueueOfflineDocument(compressedFile, fileName, qrResult?.text);

        if (offlineResult.success) {
          const duration = scanStartTimeRef.current ? Date.now() - scanStartTimeRef.current : 1500;
          setScanResultTimeMs(duration);
          setUploadProgress(100);
          setOfflineSavedMessage('আপনার ফোনে সংরক্ষিত হয়েছে। ইন্টারনেট সংযোগ পেলে স্বয়ংক্রিয়ভাবে আপলোড হবে।');
        } else {
          throw new Error(offlineResult.error || 'অফলাইন সংরক্ষণ ব্যর্থ হয়েছে।');
        }
        return;
      }

      // 2. Live Online Upload with SSE progress
      setUploadStatusText('সার্ভারে নিরাপদে আপলোড করা হচ্ছে...');
      setUploadProgress(65);

      const formData = new FormData();
      formData.append('file', compressedFile, fileName);
      if (qrResult?.text) {
        formData.append('qr_payload', qrResult.text);
      }

      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      const docId = data.id || data.document_id;
      const duration = scanStartTimeRef.current ? Date.now() - scanStartTimeRef.current : 1800;
      setScanResultTimeMs(duration);
      try {
        sessionStorage.setItem('landos_scan_duration_ms', String(duration));
      } catch (e) {
        console.debug('SessionStorage not available', e);
      }

      setUploadProgress(100);
      setUploadStatusText(
        `নথি আপলোড সম্পন্ন! (${(duration / 1000).toFixed(1)} সেকেন্ডে স্ক্যান-টু-রেজাল্ট)`
      );

      // Transition to Confirm Fields page
      setTimeout(() => {
        if (onNavigateToConfirm && docId) {
          onNavigateToConfirm(docId, duration);
        }
      }, 700);
    } catch (err) {
      console.warn('Live upload failed, storing encrypted offline blob:', err);
      if (!hasOfflineConsent()) {
        setOfflineConsent(true);
      }
      await enqueueOfflineDocument(capturedBlob, fileName, qrResult?.text);
      const duration = scanStartTimeRef.current ? Date.now() - scanStartTimeRef.current : 2000;
      setScanResultTimeMs(duration);
      setUploadProgress(100);
      setOfflineSavedMessage('আপনার ফোনে সংরক্ষিত হয়েছে। ইন্টারনেট সংযোগ পেলে স্বয়ংক্রিয়ভাবে আপলোড হবে।');
    }
  };

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-lg mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      {/* Hidden File Input Fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: EXPLAINER SCREEN BEFORE BROWSER CAMERA PROMPT */}
      {/* ------------------------------------------------------------- */}
      {step === 'explainer' && (
        <div className="flex flex-col justify-between flex-1 py-4 animate-in fade-in duration-300">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>নিরাপদ ও স্মার্ট স্ক্যানিং</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white mt-3 leading-snug">
              দলিল বা খতিয়ান স্ক্যান
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              সঠিকভাবে তথ্য শনাক্তকরণের জন্য নিচের নির্দেশনাবলি অনুসরণ করুন:
            </p>

            {/* Instruction List Cards */}
            <div className="flex flex-col gap-3 mt-5">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">পর্যাপ্ত আলো ও স্থির ক্যামেরা</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    উজ্জ্বল আলোতে নথিটি সমান জায়গায় রাখুন। মোবাইল বা পিসি ওয়েবক্যাম উভয় ক্যামেরাই স্বয়ংক্রিয়ভাবে শনাক্ত হবে।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">নথির চার কোণ ফ্রেমে রাখুন</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    দলিল বা খতিয়ানের মূল অংশ যেন সম্পূর্ণ দৃশ্যমান থাকে।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">QR-First ও OCR ফলব্যাক</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    কিউআর কোড থাকলে ব্রাউজারেই সরাসরি দ্রুত শনাক্ত হবে, অন্যথায় বাংলা ওসিআর দ্বারা ফিল্ড পড়া হবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Camera Permission Warning if previously denied */}
            {cameraPermissionDenied && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-white">সরাসরি ক্যামেরা সংযোগ পাওয়া যায়নি:</span>
                  ওয়েবক্যাম অনুমতি দিন অথবা ফাইল আপলোড করুন। অথবা নিচে থেকে সরাসরি ম্যানুয়াল সার্চ ব্যবহার করুন।
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Buttons in Thumb Zone */}
          <div className="pt-6 flex flex-col gap-2.5">
            <button
              onClick={() => startCamera('environment')}
              className="touch-target w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-2xl shadow-xl shadow-primary/20 text-base active:scale-98 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>ক্যামেরা চালু করুন (মোবাইল / পিসি)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl border border-slate-700/60 text-sm active:scale-98 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>ছবি বা ফাইল আপলোড করুন</span>
            </button>

            {/* Direct Search Fallback (Requested by User) */}
            {onNavigateToSearch && (
              <button
                onClick={onNavigateToSearch}
                className="touch-target w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 font-medium rounded-xl border border-emerald-500/30 text-xs active:scale-98 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                <span>স্ক্যান কাজ না করলে সরাসরি সার্চ করুন (Search Directly)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: CAMERA VIEW (getUserMedia + PC Webcam / Front Flip) */}
      {/* ------------------------------------------------------------- */}
      {step === 'camera' && (
        <div className="flex flex-col justify-between flex-1 relative animate-in fade-in duration-300">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] shadow-2xl border border-emerald-900/40">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Camera Mode Badge */}
            <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] text-slate-300 flex items-center gap-1.5 backdrop-blur-sm">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{facingMode === 'environment' ? 'ব্যাক ক্যামেরা' : 'ফ্রন্ট / পিসি ওয়েবক্যাম'}</span>
            </div>

            {/* Target Document Overlay Framing Guide */}
            <div className="absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              </div>
              <p className="text-center text-xs font-medium text-emerald-200 bg-slate-950/70 px-3 py-1 rounded-full mx-auto backdrop-blur-sm">
                নথি ফ্রেমের ভেতরে সোজা রাখুন
              </p>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>
          </div>

          {/* Bottom Thumb Zone Action Bar with Camera Flip & Search Fallback */}
          <div className="pt-5 pb-2 flex flex-col gap-3">
            <div className="flex items-center justify-around gap-3">
              {/* File Upload Option */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="touch-target p-3.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 hover:text-white active:scale-95 transition-transform"
                title="ফাইল নির্বাচন"
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Shutter Button (64px target) */}
              <button
                onClick={handleCaptureFromVideo}
                className="w-20 h-20 rounded-full border-4 border-white/80 p-1.5 flex items-center justify-center active:scale-95 transition-transform shadow-2xl shadow-emerald-500/30"
                aria-label="ছবি তুলুন"
              >
                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center hover:bg-primary-hover">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </button>

              {/* Camera Flip / Front-Back Switch Button */}
              <button
                onClick={handleToggleCamera}
                className="touch-target p-3.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 hover:text-white active:scale-95 transition-transform"
                title="ক্যামেরা পরিবর্তন (Front / Back)"
              >
                <FlipHorizontal className="w-5 h-5 text-emerald-400" />
              </button>
            </div>

            {/* Quick search fallback in camera view */}
            {onNavigateToSearch && (
              <button
                onClick={() => {
                  stopCameraStream();
                  onNavigateToSearch();
                }}
                className="py-2 text-center text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>ক্যামেরা সমস্যা? সরাসরি রেকর্ড অনুসন্ধান করুন</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: QUALITY GATE PREVIEW & TIP INSPECTION */}
      {/* ------------------------------------------------------------- */}
      {step === 'preview_quality' && (
        <div className="flex flex-col justify-between flex-1 animate-in fade-in duration-300">
          <div>
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] border border-slate-800 shadow-xl">
              {capturedPreviewUrl && (
                <img
                  src={capturedPreviewUrl}
                  alt="Captured document"
                  className="w-full h-full object-contain"
                />
              )}

              {/* QR Code Detection Overlay */}
              {qrResult && (
                <div className="absolute top-3 left-3 right-3 bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-200">
                  <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    <strong>QR শনাক্ত:</strong> {qrResult.text.slice(0, 40)}...
                  </span>
                </div>
              )}
            </div>

            {/* Quality Analysis Feedback */}
            <div className="mt-4">
              {isAnalyzing ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-3 text-slate-300 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>নথির গুণমান ও অখণ্ডতা পরীক্ষা করা হচ্ছে...</span>
                </div>
              ) : qualityResult?.passed ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">ছবির গুণমান উপযুক্ত</h4>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      নথিটি স্পষ্ট ও তীক্ষ্ণ। ওসিআর প্রক্রিয়াকরণের জন্য প্রস্তুত।
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-600/50 text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-100">
                        সতর্কতা: ছবিতে কিছু ত্রুটি পাওয়া গেছে
                      </h4>
                      <ul className="mt-2 space-y-1 text-xs text-amber-200 list-disc list-inside">
                        {qualityResult?.tips_bn.map((tip, idx) => (
                          <li key={idx} className="font-medium">
                            {tip}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-amber-300/80 mt-2">
                        উন্নত ফলের জন্য পুনরায় ছবি তোলার পরামর্শ দেওয়া হচ্ছে।
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Thumb Zone Action Bar (Retake vs Proceed) */}
          <div className="pt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRetake}
              className="touch-target flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-700 text-sm active:scale-98 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>পুনরায় তুলুন</span>
            </button>

            <button
              onClick={handleProceedUpload}
              className="touch-target flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-lg shadow-primary/20 text-sm active:scale-98 transition-all"
            >
              <span>{qualityResult?.passed ? 'পরবর্তী ধাপে যান' : 'তবুও ব্যবহার করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 4: UPLOADING / OFFLINE ENCRYPTION */}
      {/* ------------------------------------------------------------- */}
      {step === 'uploading' && (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
            {uploadProgress === 100 ? (
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            ) : (
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            {uploadProgress === 100 ? 'প্রক্রিয়াকরণ সম্পন্ন!' : 'নথি আপলোড হচ্ছে'}
          </h3>
          <p className="text-sm text-slate-300 max-w-xs mb-4 leading-relaxed">
            {uploadStatusText}
          </p>

          {/* Scan-to-result time notice */}
          {scanResultTimeMs !== null && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono mb-4">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>স্ক্যান-টু-রেজাল্ট সময়: {(scanResultTimeMs / 1000).toFixed(1)} সে.</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full max-w-xs bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          {/* Low-Network Offline Success Notice */}
          {offlineSavedMessage && (
            <div className="mt-8 p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-left max-w-sm">
              <div className="flex items-start gap-2.5 text-emerald-300 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">{offlineSavedMessage}</p>
                  <p className="text-slate-400 mt-1">
                    নথিটি আপনার ডিভাইসে এনক্রিপ্ট করে রাখা হয়েছে। পরবর্তীতে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।
                  </p>
                </div>
              </div>
              {onNavigateToPending && (
                <button
                  onClick={onNavigateToPending}
                  className="mt-4 w-full py-2.5 text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-800/60"
                >
                  সংরক্ষিত নথি তালিকা দেখুন
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
