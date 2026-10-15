import Dexie, { type Table } from 'dexie';
import { encryptBlob, decryptBlob } from './crypto';

export interface OfflineUploadRecord {
  id?: number;
  uuid: string; // idempotency_key
  file_name: string;
  created_at: number; // timestamp
  status: 'queued' | 'uploading' | 'synced' | 'needs_attention';
  attempts: number;
  qr_payload?: string;
  iv: Uint8Array;
  encrypted_data: ArrayBuffer;
  file_size: number;
  mime_type: string;
}

const CONSENT_STORAGE_KEY = 'landos_offline_capture_consent';
const MAX_QUEUE_ITEMS = 10;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class LandOSOfflineDB extends Dexie {
  offlineUploads!: Table<OfflineUploadRecord, number>;

  constructor() {
    super('LandOSOfflineDB');
    this.version(1).stores({
      offlineUploads: '++id, &uuid, status, created_at',
    });
  }
}

export const offlineDB = new LandOSOfflineDB();

export function hasOfflineConsent(): boolean {
  return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
}

export function setOfflineConsent(consent: boolean): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, consent ? 'true' : 'false');
}

/**
 * Enqueues an encrypted document image blob into IndexedDB.
 * Enforces:
 * - User consent
 * - Max 10 items cap
 * - Storage quota safety
 * - 7-day auto purge
 */
export async function enqueueOfflineDocument(
  fileOrBlob: Blob,
  fileName: string,
  qrPayload?: string,
  idempotencyKey?: string
): Promise<{ success: boolean; uuid: string; error?: string }> {
  // 1. Consent check
  if (!hasOfflineConsent()) {
    return {
      success: false,
      uuid: '',
      error: 'অফলাইন সংরক্ষণের জন্য ব্যবহারকারীর সম্মতি প্রয়োজন।',
    };
  }

  // 2. Auto-purge older than 7 days
  await purgeOldItems();

  // 3. Queue cap check
  const count = await offlineDB.offlineUploads.where('status').anyOf('queued', 'uploading', 'needs_attention').count();
  if (count >= MAX_QUEUE_ITEMS) {
    return {
      success: false,
      uuid: '',
      error: 'অফলাইন সারির সীমা (সর্বোচ্চ ১০টি নথি) পূর্ণ হয়েছে। অনুগ্রহ করে পূর্বের নথিগুলো আপলোড বা মুছে ফেলুন।',
    };
  }

  // 4. Storage quota check
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    if (estimate.quota && estimate.usage && estimate.usage / estimate.quota > 0.9) {
      return {
        success: false,
        uuid: '',
        error: 'ফোনের স্টোরেজ পূর্ণপ্রায়। অফলাইনে নথি সংরক্ষণ করা সম্ভব নয়।',
      };
    }
  }

  const uuid = idempotencyKey || crypto.randomUUID();
  const { encryptedBuffer, iv } = await encryptBlob(fileOrBlob);

  const record: OfflineUploadRecord = {
    uuid,
    file_name: fileName,
    created_at: Date.now(),
    status: 'queued',
    attempts: 0,
    qr_payload: qrPayload,
    iv,
    encrypted_data: encryptedBuffer,
    file_size: fileOrBlob.size,
    mime_type: fileOrBlob.type || 'image/jpeg',
  };

  await offlineDB.offlineUploads.add(record);

  return { success: true, uuid };
}

export async function getQueuedUploads(): Promise<OfflineUploadRecord[]> {
  await purgeOldItems();
  return offlineDB.offlineUploads.orderBy('created_at').reverse().toArray();
}

export async function getDecryptedBlob(record: OfflineUploadRecord): Promise<Blob> {
  return decryptBlob(record.encrypted_data, record.iv, record.mime_type);
}

export async function updateUploadStatus(
  uuid: string,
  status: 'queued' | 'uploading' | 'synced' | 'needs_attention',
  attemptsIncrement = 0
): Promise<void> {
  const item = await offlineDB.offlineUploads.where('uuid').equals(uuid).first();
  if (!item) return;

  const newAttempts = item.attempts + attemptsIncrement;
  // If sync succeeded: immediately purge encrypted blob to protect privacy!
  if (status === 'synced') {
    await offlineDB.offlineUploads.where('uuid').equals(uuid).delete();
  } else {
    await offlineDB.offlineUploads.update(item.id!, {
      status,
      attempts: newAttempts,
    });
  }
}

export async function deleteOfflineRecord(uuid: string): Promise<void> {
  await offlineDB.offlineUploads.where('uuid').equals(uuid).delete();
}

/**
 * Automatically purges offline records older than 7 days.
 */
export async function purgeOldItems(): Promise<number> {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const oldItems = await offlineDB.offlineUploads.where('created_at').below(cutoff).toArray();
  for (const item of oldItems) {
    if (item.id) {
      await offlineDB.offlineUploads.delete(item.id);
    }
  }
  return oldItems.length;
}

/**
 * Complete purge (called on user logout or privacy clear).
 */
export async function purgeAllOfflineData(): Promise<void> {
  await offlineDB.offlineUploads.clear();
}
