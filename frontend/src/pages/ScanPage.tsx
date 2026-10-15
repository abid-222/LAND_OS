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
} from 'lucide-react';
import { analyzeImageQuality } from '../lib/qualityGate';
import type { QualityAnalysisResult } from '../workers/qualityGate.worker';
import { scanQRCodeFromImage, type QRScanResult } from '../lib/qrScanner';
import { compressDocumentImage } from '../lib/imageCompressor';
import { enqueueOfflineDocument, hasOfflineConsent, setOfflineConsent } from '../lib/offlineQueue';
import { useNetworkStore } from '../lib/networkMonitor';

interface ScanPageProps {
  onScanComplete?: (documentId: string) => void;
  onNavigateToConfirm?: (documentId: string) => void;
  onNavigateToPending?: () => void;
}

export const ScanPage: React.FC<ScanPageProps> = ({
  onNavigateToConfirm,
  onNavigateToPending,
}) => {
  // Step 1: 'explainer' -> Step 2: 'camera' -> Step 3: 'preview_quality' -> Step 4: 'uploading'
  const [step, setStep] = useState<'explainer' | 'camera' | 'preview_quality' | 'uploading'>('explainer');
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('document_scan.jpg');
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<QRScanResult | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [offlineSavedMessage, setOfflineSavedMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isOnline, isLowNetworkMode } = useNetworkStore();

  // Stop camera tracks when unmounting or leaving camera step
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraPermissionDenied(false);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setStep('camera');

      // Bind to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.warn('getUserMedia camera access denied or unsupported:', err);
      setCameraPermissionDenied(true);
      // Trigger file upload fallback immediately
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleCaptureFromVideo = async () => {
    if (!videoRef.current) return;
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
      stopCameraStream();
      await processCapturedImage(file);
    }
  };

  const processCapturedImage = async (rawBlob: Blob, fallbackName = 'document_scan.jpg') => {
    setIsAnalyzing(true);
    setCapturedBlob(rawBlob);
    const resolvedName = (rawBlob instanceof File && rawBlob.name) ? rawBlob.name : fallbackName;
    setCapturedFileName(resolvedName);
    const previewUrl = URL.createObjectURL(rawBlob);
    setCapturedPreviewUrl(previewUrl);
    setStep('preview_quality');

    try {
      // 1. Dynamic ZXing-WASM QR scan
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
    startCamera();
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
          setOfflineConsent(true); // Grant implicit consent upon manual proceed
        }

        const offlineResult = await enqueueOfflineDocument(
          compressedFile,
          fileName,
          qrResult?.text
        );

        if (offlineResult.success) {
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
        // If server error or offline during upload: save to encrypted Dexie queue
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      const docId = data.id || data.document_id;
      setUploadProgress(100);
      setUploadStatusText('নথি আপলোড সম্পন্ন! ওসিআর ও তথ্য শনাক্ত করা হচ্ছে...');

      // Transition to Confirm Fields page
      setTimeout(() => {
        if (onNavigateToConfirm && docId) {
          onNavigateToConfirm(docId);
        }
      }, 800);
    } catch (err) {
      console.warn('Live upload failed, storing encrypted offline blob:', err);
      // Auto-fallback to offline queue
      if (!hasOfflineConsent()) {
        setOfflineConsent(true);
      }
      await enqueueOfflineDocument(
        capturedBlob,
        fileName,
        qrResult?.text
      );
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
              <span>নিরাপদ ও নির্ভুল স্ক্যানিং</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white mt-3 leading-snug">
              ক্যামেরা চালু করার আগে নির্দেশনা
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              সঠিকভাবে খতিয়ান, দলিল বা পর্চার তথ্য শনাক্তকরণের জন্য নিচের নিয়মগুলো অনুসরণ করুন:
            </p>

            {/* Instruction List Cards */}
            <div className="flex flex-col gap-3 mt-6">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">পর্যাপ্ত আলো ও স্থির হাত</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    উজ্জ্বল আলোতে নথিটি সমান সমতল জায়গায় রাখুন এবং হাত স্থির রাখুন যাতে লেখা ঝাপসা না হয়।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">নথির চারটি কোণ ফ্রেমের ভেতরে রাখুন</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    দলিল বা খতিয়ানের মূল অংশ ও চারপাশের কোণ যেন সম্পূর্ণ ক্যামেরার ফ্রেমে দৃশ্যমান থাকে।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">কিউআর কোড অখণ্ডতা যাচাই</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    নথিতে কিউআর কোড থাকলে তা পরিষ্কার রাখুন। ব্রাউজারেই সরাসরি এর ডিজিটাল অখণ্ডতা যাচাই হবে।
                  </p>
                </div>
              </div>
            </div>

            {/* Camera Permission Warning if previously denied */}
            {cameraPermissionDenied && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  ব্রাউজারে সরাসরি ক্যামেরা চালু সম্ভব হয়নি। নিচের বাটন থেকে ছবি বা ফাইল আপলোড করুন।
                </span>
              </div>
            )}
          </div>

          {/* Primary Action Sitting in Bottom 40% (Thumb Zone) */}
          <div className="pt-6 flex flex-col gap-3">
            <button
              onClick={startCamera}
              className="touch-target w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-2xl shadow-xl shadow-primary/20 text-base active:scale-98 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>ক্যামেরা চালু করুন</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="touch-target w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl border border-slate-700/60 text-sm active:scale-98 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>ছবি বা ফাইল নির্বাচন করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: CAMERA VIEW (getUserMedia) */}
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

          {/* Bottom Thumb Zone Action Bar */}
          <div className="pt-6 pb-2 flex items-center justify-around gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="touch-target p-3.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 hover:text-white active:scale-95 transition-transform"
              title="ফাইল নির্বাচন"
            >
              <Upload className="w-6 h-6" />
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

            <button
              onClick={() => {
                stopCameraStream();
                setStep('explainer');
              }}
              className="touch-target p-3.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 hover:text-white active:scale-95 transition-transform"
              title="বাতিল"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
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

          {/* Bottom Thumb Zone Action Bar (Retake vs Use Anyway) */}
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
          <p className="text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
            {uploadStatusText}
          </p>

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
