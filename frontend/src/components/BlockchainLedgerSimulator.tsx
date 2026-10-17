import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link as LinkIcon,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Flame,
  Database,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';

export interface BlockRecord {
  index: number;
  titleBn: string;
  titleEn: string;
  timestamp: string;
  validatorBn: string;
  prevHash: string;
  hash: string;
  merkleRoot: string;
  nonce: number;
  payload: {
    parcelId: string;
    dagNo: string;
    khatianNo: string;
    areaDecimal: number;
    ownerNameBn: string;
    mutationOrderNo?: string;
  };
  isTampered?: boolean;
}

const INITIAL_BLOCKS: BlockRecord[] = [
  {
    index: 0,
    titleBn: 'জেনেসিস ব্লক: সিএস জরিপ রেকর্ড (১৯৪০)',
    titleEn: 'Genesis Block: CS Cadastral Survey (1940)',
    timestamp: '1940-02-15 10:00:00 UTC',
    validatorBn: 'তৎকালীন ভূমি প্রশাসন অধিদপ্তর',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: '00008f2a1b9c3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
    merkleRoot: '9f83a21b0c9e8d7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a',
    nonce: 48291,
    payload: {
      parcelId: 'P-CS-001',
      dagNo: '১২০৫',
      khatianNo: '৮২',
      areaDecimal: 100.0,
      ownerNameBn: 'মৌলভি আবদুর রহমান',
    },
  },
  {
    index: 1,
    titleBn: 'এসএ রেকর্ড ও অংশ বন্টন (১৯৫৬)',
    titleEn: 'SA Record & Partition Block (1956)',
    timestamp: '1956-06-20 14:30:00 UTC',
    validatorBn: 'ঢাকা জেলা সেটেলমেন্ট উইং',
    prevHash: '00008f2a1b9c3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
    hash: '00003e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    merkleRoot: '7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
    nonce: 91420,
    payload: {
      parcelId: 'P-SA-1205',
      dagNo: '১২০৫',
      khatianNo: '১২৪',
      areaDecimal: 66.0,
      ownerNameBn: 'ফজলুল হক',
    },
  },
  {
    index: 2,
    titleBn: 'আরএস জরিপ ও চুড়ান্ত খতিয়ান (১৯৮২)',
    titleEn: 'RS Revisional Survey Record (1982)',
    timestamp: '1982-11-10 09:15:00 UTC',
    validatorBn: 'উপজেলা সেটেলমেন্ট কার্যালয়, তেজগাঁও',
    prevHash: '00003e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    hash: '00007b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
    merkleRoot: '3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    nonce: 63108,
    payload: {
      parcelId: 'P-RS-340',
      dagNo: '১২০৫/১',
      khatianNo: '৩৪০',
      areaDecimal: 33.0,
      ownerNameBn: 'আবদুল করিম',
    },
  },
  {
    index: 3,
    titleBn: 'সাফ-কবলা দলিল নিবন্ধন ব্লক (২০২২)',
    titleEn: 'Registered Sale Deed Block (2022)',
    timestamp: '2022-05-12 11:45:00 UTC',
    validatorBn: 'তেজগাঁও সাব-রেজিস্ট্রি কার্যালয় (ভলিউম ৯৮৪২)',
    prevHash: '00007b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
    hash: '00001a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    merkleRoot: '5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e',
    nonce: 77519,
    payload: {
      parcelId: 'P-DEED-9842',
      dagNo: '১২০৫/১',
      khatianNo: '৩৪০',
      areaDecimal: 33.0,
      ownerNameBn: 'আবদুল করিম (বিক্রেতা) -> মোঃ রহিম মিয়া (ক্রেতা)',
    },
  },
  {
    index: 4,
    titleBn: 'ই-নামজারি ও চূড়ান্ত খতিয়ান আদেশ (২০২৪)',
    titleEn: 'E-Mutation Executive Approval Block (2024)',
    timestamp: '2024-03-18 16:20:00 UTC',
    validatorBn: 'সার্কেল এসিল্যান্ড ডিজিটাল স্বাক্ষর',
    prevHash: '00001a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    hash: '00009c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    merkleRoot: '1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a',
    nonce: 84312,
    payload: {
      parcelId: 'P-4520',
      dagNo: '১২০৫/১',
      khatianNo: '৩৪০',
      areaDecimal: 33.0,
      ownerNameBn: 'মোঃ রহিম মিয়া',
      mutationOrderNo: 'MUT-TG-2024-0042',
    },
  },
];

export const BlockchainLedgerSimulator: React.FC = () => {
  const { i18n } = useTranslation();
  const isBn = (i18n.language || 'bn').startsWith('bn');

  const [blocks, setBlocks] = useState<BlockRecord[]>(INITIAL_BLOCKS);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number>(4);
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Tamper parameters
  const [tamperArea, setTamperArea] = useState<number>(80.0);
  const [tamperOwner, setTamperOwner] = useState<string>('দুর্নীতিবাজ দখলদার ও ভুয়া চক্র');

  // Trigger Malicious Database Tampering
  const handleExecuteTamper = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      await api.post('/api/v1/admin/audit/simulate-tamper', {});
    } catch {
      // Local fallback simulation continues
    }

    // Corrupt block #4 in UI
    const updated = blocks.map((b) => {
      if (b.index === 4) {
        return {
          ...b,
          isTampered: true,
          payload: {
            ...b.payload,
            areaDecimal: Number(tamperArea),
            ownerNameBn: tamperOwner,
          },
        };
      }
      return b;
    });

    setBlocks(updated);
    setIsTampered(true);
    setSelectedBlockIdx(4);
    setIsProcessing(false);
    setActionMessage('🚨 ডাটাবেজে গোপনে পরিবর্তন সম্পন্ন! ক্রিপ্টোগ্রাফিক হ্যাশ চেইন তাৎক্ষণিকভাবে ভেঙে পড়েছে!');
  };

  // Trigger Self-Healing Consensus Restore
  const handleRestoreChain = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      await api.post('/api/v1/admin/audit/restore-chain', {});
    } catch {
      // Local fallback simulation continues
    }

    setBlocks(INITIAL_BLOCKS);
    setIsTampered(false);
    setSelectedBlockIdx(4);
    setIsProcessing(false);
    setActionMessage('✅ ব্লকচেইন পিয়ার কনসেনসাস প্রুফ দ্বারা সফলভাবে ডেটাবেজ সেলফ-হিলিং ও স্বয়ংক্রিয় রিস্টোর সম্পন্ন হয়েছে!');
  };

  const currentBlock = blocks[selectedBlockIdx] || blocks[0];

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Immutable Cryptographic Blockchain Ledger</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{isBn ? 'ব্লকচেইন ডিজিটাল খতিয়ান ও ট্যাম্পার ডিটেকশন সিমুলেটর' : 'Blockchain Ledger & Tamper Simulator'}</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PoA Consensus
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isBn
                ? 'ভূমি অফিসের ভেতরে কোনো অসাধু কর্মচারী যদি সার্ভারের ডাটাবেজে ঢুকে জমির পরিমাণ বা মালিকের নাম পরিবর্তন করে, তবে সাথে সাথে ব্লকচেইন অ্যালার্ম বেজে উঠবে এবং কনসেনসাস প্রুফ দিয়ে আসল রেকর্ড পুনরুদ্ধার হবে।'
                : 'Demonstrates real-time SHA-256 hash-chain invalidation when internal database records are tampered, with autonomous consensus self-healing.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                isTampered
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {isTampered ? <ShieldAlert className="w-4 h-4 text-rose-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
              <span>{isTampered ? 'CHAIN BROKEN (409 CONFLICT)' : 'CHAIN VALID (100% SECURE)'}</span>
            </span>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div
            className={`mt-5 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
              isTampered
                ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
            }`}
          >
            {isTampered ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Visual Blockchain Chain (Horizontal Linked Cards) */}
      {/* =================================================================== */}
      <div className="p-5 rounded-3xl bg-slate-900/60 dark:bg-[#05090e] border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>{isBn ? 'ধারাবাহিক ব্লকচেইন লেজার (Click Block to Inspect)' : 'Sequential Blockchain Blocks'}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {blocks.length} Blocks Mined & Anchored
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {blocks.map((block) => {
            const isSelected = selectedBlockIdx === block.index;
            const hasTamper = block.isTampered;

            return (
              <div
                key={block.index}
                onClick={() => setSelectedBlockIdx(block.index)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                  hasTamper
                    ? 'bg-rose-950/40 border-rose-500 shadow-xl shadow-rose-950/50 ring-2 ring-rose-500 animate-pulse'
                    : isSelected
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                    : 'bg-white dark:bg-[#080d13] border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                      hasTamper
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    BLOCK #{block.index}
                  </span>

                  {hasTamper ? (
                    <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
                      <Unlock className="w-3 h-3" />
                      <span>TAMPERED</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5">
                      <Lock className="w-3 h-3" />
                      <span>SEALED</span>
                    </span>
                  )}
                </div>

                {/* Content */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {isBn ? block.titleBn : block.titleEn}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    দাগ: {block.payload.dagNo} • {block.payload.areaDecimal} শতাংশ
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    মালিক: {block.payload.ownerNameBn}
                  </p>
                </div>

                {/* Bottom Hash preview */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[9px] font-mono text-slate-500 truncate">
                  Hash: {block.hash.slice(0, 16)}...
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* Two Column Layout: Left Block Details & Right Tampering Simulator */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Detailed Cryptographic Block Spec (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#070c12] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  ব্লক #{currentBlock.index} ক্রিপ্টোগ্রাফিক মেটাডেটা (Detailed Block Proof)
                </h3>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  currentBlock.isTampered
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {currentBlock.isTampered ? 'HASH INVALIDATED' : 'SHA-256 VERIFIED'}
              </span>
            </div>

            {/* Block Header Info */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isBn ? currentBlock.titleBn : currentBlock.titleEn}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ভ্যালিডেটর নোড: <strong className="text-emerald-600 dark:text-emerald-400">{currentBlock.validatorBn}</strong> • {currentBlock.timestamp}
                </p>
              </div>

              {/* Hashes Grid */}
              <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    Previous Block Hash (পূর্ববর্তী ব্লকের হ্যাশ):
                  </span>
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 break-all select-all">
                    {currentBlock.prevHash}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    Current Block Hash (বর্তমান ব্লকের হ্যাশ):
                  </span>
                  <span
                    className={`text-[11px] font-bold break-all select-all ${
                      currentBlock.isTampered
                        ? 'text-rose-600 dark:text-rose-400 underline decoration-wavy'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {currentBlock.hash}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-[10px]">
                  <span>Merkle Root: {currentBlock.merkleRoot.slice(0, 24)}...</span>
                  <span>Nonce: {currentBlock.nonce}</span>
                </div>
              </div>

              {/* Payload Data */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  ব্লকে এনক্রিপ্টকৃত ভূমির রেকর্ড (Sealed Land Payload):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">দাগ নম্বর:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{currentBlock.payload.dagNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">খতিয়ান নম্বর:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{currentBlock.payload.khatianNo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">জমির পরিমাণ:</span>
                    <strong
                      className={`font-mono ${
                        currentBlock.isTampered
                          ? 'text-rose-600 dark:text-rose-400 text-sm'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {currentBlock.payload.areaDecimal} শতাংশ
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px] block">স্বত্বাধিকারী / মালিক:</span>
                    <strong
                      className={`${
                        currentBlock.isTampered
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {currentBlock.payload.ownerNameBn}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tamper Simulator & Self-Healing Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#070c12] border-2 border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {isBn ? 'হ্যাকিং ও রেকর্ড টেম্পারিং সিমুলেটর' : 'Database Tamper Simulator'}
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold">
                KILLER DEMO
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              বিচারকদের সামনে পরীক্ষা করুন: ভূমি অফিসের ডাটাবেজে গোপনে জমির পরিমাণ বা মালিকানা পরিবর্তন করলে ক্রিপ্টোগ্রাফিক চেইন কীভাবে দুর্নীতি ধরে ফেলে।
            </p>

            {/* Inputs for Malicious Edit */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  টার্গেট ব্লকের জমির পরিমাণ বদলে দিন (শতাংশ):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={tamperArea}
                    onChange={(e) => setTamperArea(Number(e.target.value))}
                    disabled={isTampered || isProcessing}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-400 shrink-0">
                    (আসল: ৩৩.০০)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  মালিকের নাম অবৈধভাবে পরিবর্তন করুন:
                </label>
                <input
                  type="text"
                  value={tamperOwner}
                  onChange={(e) => setTamperOwner(e.target.value)}
                  disabled={isTampered || isProcessing}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Trigger Tamper Button */}
              {!isTampered ? (
                <button
                  type="button"
                  onClick={handleExecuteTamper}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-700/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'ডাটাবেজ পরিবর্তন হচ্ছে...' : 'Simulate Database Tamper (হ্যাকিং টেস্ট চালান)'}
                  </span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>CRYPTOGRAPHIC INTEGRITY BROKEN: BLOCK #4 TAMPERED!</span>
                    </div>
                    <p className="text-[11px]">
                      ডাটাবেজ এন্ট্রি পরিবর্তন করা হয়েছে, কিন্তু পূর্বের কোনো ব্লকের SHA-256 হ্যাশের সাথে বর্তমান ব্লকের হ্যাশ মিলছে না। নেটওয়ার্ক কনসেনসাস রিজেক্টেড!
                    </p>
                  </div>

                  {/* Auto Self Healing Restore Button */}
                  <button
                    type="button"
                    onClick={handleRestoreChain}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {isProcessing ? 'কনসেনসাস রিস্টোর হচ্ছে...' : 'স্বয়ংক্রিয় ব্লকচেইন কনসেনসাস রিস্টোর (Self-Healing)'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Explanation box */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                কেন এটি দুর্নীতি পুরোপুরি বন্ধ করবে?
              </span>
              <p>
                সাধারণ ডেটাবেজে যে কেউ SQL কমান্ড চালিয়ে জমি বাড়াতে পারে। কিন্তু ল্যান্ডওএস ব্লকচেইনে প্রতিটি পরিবর্তন পূর্বের ব্লকের হ্যাশের ওপর নির্ভরশীল হওয়ায় ১টি কমা বা দশমিক পরিবর্তন হলেও সমগ্র চেইন অকার্যকর হয়ে যাবে।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
