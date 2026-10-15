import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  CheckCircle,
  QrCode,
  FileText,
} from 'lucide-react';
import {
  getQueuedUploads,
  deleteOfflineRecord,
  hasOfflineConsent,
  setOfflineConsent,
  purgeAllOfflineData,
  type OfflineUploadRecord,
} from '../lib/offlineQueue';
import { syncAllQueuedItems, uploadSingleRecord, subscribeSyncProgress } from '../lib/syncManager';

export const PendingUploadsPage: React.FC = () => {
  const [records, setRecords] = useState<OfflineUploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consent, setConsent] = useState(hasOfflineConsent());
  const [storageUsage, setStorageUsage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const list = await getQueuedUploads();
      setRecords(list);

      if (navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
          const quotaMb = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
          setStorageUsage(`${usedMb} MB / ${quotaMb} MB`);
        } catch (e) {
          console.debug('Storage estimate not available', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeSyncProgress(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleConsentToggle = (checked: boolean) => {
    setConsent(checked);
    setOfflineConsent(checked);
  };

  const handleUploadAll = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const { total, succeeded } = await syncAllQueuedItems(true);
      setSyncStatusMsg(`${total} টির মধ্যে ${succeeded} টি নথি সফলভাবে আপলোড হয়েছে।`);
    } finally {
      setIsSyncing(false);
      await loadData();
    }
  };

  const handleUploadSingle = async (rec: OfflineUploadRecord) => {
    setIsSyncing(true);
    try {
      await uploadSingleRecord(rec);
    } finally {
      setIsSyncing(false);
      await loadData();
    }
  };

  const handleDelete = async (uuid: string) => {
    await deleteOfflineRecord(uuid);
    await loadData();
  };

  const handlePurgeAll = async () => {
    if (confirm('আপনি কি নিশ্চিত যে সকল সংরক্ষিত অফলাইন নথি মুছে ফেলতে চান?')) {
      await purgeAllOfflineData();
      await loadData();
    }
  };

  return (
    <div className="flex flex-col min-h-screen-dvh max-w-lg mx-auto w-full px-4 pt-4 pb-28 text-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-white">সংরক্ষিত অফলাইন নথি</h1>
        </div>
        {records.length > 0 && (
          <button
            onClick={handlePurgeAll}
            className="text-xs text-danger-light hover:underline"
          >
            সব মুছুন
          </button>
        )}
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-slate-300 mb-4 leading-relaxed">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">গোপনীয়তা ও এনক্রিপশন নীতি:</span>{' '}
            নথিগুলো আপনার ডিভাইসে WebCrypto AES-GCM দিয়ে সুরক্ষিত রাখা হয়েছে। সার্ভারে আপলোড নিশ্চিত হওয়া মাত্রই ডিভাইসের স্টোরেজ থেকে তাৎক্ষণিকভাবে স্থায়ীভাবে মুছে ফেলা হয়। ৭ দিন পর অনিষ্পন্ন নথি স্বয়ংক্রিয়ভাবে বাতিল হয়।
          </div>
        </div>
      </div>

      {/* User Consent Toggle & Storage Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white">অফলাইন স্টোরেজ সম্মতি</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              দুর্বল নেটওয়ার্কে সাময়িক এনক্রিপ্ট সংরক্ষণ
            </p>
          </div>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => handleConsentToggle(e.target.checked)}
            className="w-5 h-5 accent-primary rounded cursor-pointer"
          />
        </div>

        {storageUsage && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" /> ব্রাউজার স্টোরেজ ব্যবহার
            </span>
            <span className="font-mono text-slate-300">{storageUsage}</span>
          </div>
        )}
      </div>

      {/* Sync Status Feedback */}
      {syncStatusMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Queue List */}
      <div className="flex-1 flex flex-col gap-3">
        {isLoading ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 my-auto">
            <RefreshCw className="w-8 h-8 mx-auto text-emerald-400 animate-spin mb-2" />
            <p className="text-sm font-medium">অফলাইন নথি লোড হচ্ছে...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 my-auto">
            <UploadCloud className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium">কোনো অপেক্ষমান অফলাইন নথি নেই</p>
            <p className="text-xs text-slate-500 mt-1">
              দুর্বল নেটওয়ার্কে দলিল স্ক্যান করলে তা এখানে সংরক্ষিত থাকবে।
            </p>
          </div>
        ) : (
          records.map((rec) => {
            const isAttention = rec.status === 'needs_attention';
            return (
              <div
                key={rec.uuid}
                className={`p-4 rounded-xl bg-slate-900 border transition-all ${
                  isAttention ? 'border-amber-600/70 bg-amber-950/20' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">{rec.file_name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAttention
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isAttention ? 'ম্যানুয়াল চেষ্টা প্রয়োজন' : 'সারিবদ্ধ (Queued)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 my-2">
                  <span>সাইজ: {(rec.file_size / 1024).toFixed(0)} KB</span>
                  <span>চেষ্টা সংখ্যা: {rec.attempts} / ৫</span>
                  <span>{new Date(rec.created_at).toLocaleTimeString()}</span>
                </div>

                {rec.qr_payload && (
                  <div className="p-2 rounded bg-slate-950 text-[10px] text-slate-300 flex items-center gap-1.5 mb-2 truncate">
                    <QrCode className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{rec.qr_payload}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleDelete(rec.uuid)}
                    className="p-2 rounded-lg text-slate-400 hover:text-danger-light hover:bg-slate-800"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleUploadSingle(rec)}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>আপলোড চেষ্টা</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Sync Action in Bottom Thumb Zone */}
      {records.length > 0 && (
        <div className="pt-6">
          <button
            onClick={handleUploadAll}
            disabled={isSyncing}
            className="touch-target w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-2xl shadow-xl shadow-primary/20 text-sm active:scale-98 transition-all disabled:opacity-50"
          >
            <UploadCloud className="w-5 h-5" />
            <span>{isSyncing ? 'সিঙ্ক করা হচ্ছে...' : 'সকল অপেক্ষমান নথি আপলোড করুন'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
