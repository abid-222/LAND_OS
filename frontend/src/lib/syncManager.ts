import {
  getQueuedUploads,
  getDecryptedBlob,
  updateUploadStatus,
  type OfflineUploadRecord,
} from './offlineQueue';
import { useNetworkStore } from './networkMonitor';

const MAX_ATTEMPTS = 5;

export interface SyncProgressEvent {
  uuid: string;
  status: 'uploading' | 'synced' | 'failed' | 'needs_attention';
  progress?: number;
  documentId?: string;
  error?: string;
}

type SyncListener = (event: SyncProgressEvent) => void;
const listeners: Set<SyncListener> = new Set();

export function subscribeSyncProgress(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifySync(event: SyncProgressEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.error('Sync listener error:', err);
    }
  });
}

let isSyncing = false;

/**
 * Calculates exponential backoff with random jitter: (2^attempts * 1000) + random(0, 1000) ms
 */
function getBackoffDelay(attempts: number): number {
  const base = Math.pow(2, attempts) * 1000;
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(base + jitter, 30000); // capped at 30s
}

/**
 * Uploads a single offline record to the backend server idempotently.
 */
export async function uploadSingleRecord(record: OfflineUploadRecord): Promise<boolean> {
  if (record.attempts >= MAX_ATTEMPTS) {
    await updateUploadStatus(record.uuid, 'needs_attention');
    notifySync({
      uuid: record.uuid,
      status: 'needs_attention',
      error: `সর্বোচ্চ ${MAX_ATTEMPTS} বার চেষ্টার পরেও আপলোড ব্যর্থ হয়েছে।`,
    });
    return false;
  }

  await updateUploadStatus(record.uuid, 'uploading');
  notifySync({ uuid: record.uuid, status: 'uploading' });

  try {
    const blob = await getDecryptedBlob(record);
    const formData = new FormData();
    formData.append('file', blob, record.file_name);
    if (record.qr_payload) {
      formData.append('qr_payload', record.qr_payload);
    }

    const res = await fetch('/api/v1/documents', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': record.uuid,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const result = await res.json();
    const docId = result.id || result.document_id;

    // Success! Immediately mark as synced (which deletes encrypted blob locally)
    await updateUploadStatus(record.uuid, 'synced');
    useNetworkStore.getState().recordSuccessfulRequest();

    notifySync({
      uuid: record.uuid,
      status: 'synced',
      documentId: docId,
    });
    return true;
  } catch (err) {
    console.warn(`Sync failed for item ${record.uuid}:`, err);
    useNetworkStore.getState().recordFailedRequest();

    const nextAttempts = record.attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await updateUploadStatus(record.uuid, 'needs_attention', 1);
      notifySync({
        uuid: record.uuid,
        status: 'needs_attention',
        error: 'বারবার ব্যর্থতার কারণে ম্যানুয়াল চেষ্টার জন্য স্থগিত রাখা হয়েছে।',
      });
    } else {
      await updateUploadStatus(record.uuid, 'queued', 1);
      notifySync({
        uuid: record.uuid,
        status: 'failed',
        error: (err as Error).message,
      });
    }
    return false;
  }
}

/**
 * Triggers batch synchronization of all queued items.
 */
export async function syncAllQueuedItems(): Promise<{ total: number; succeeded: number }> {
  if (isSyncing) return { total: 0, succeeded: 0 };
  isSyncing = true;

  try {
    const isOnline = await useNetworkStore.getState().checkHeartbeat();
    if (!isOnline) {
      return { total: 0, succeeded: 0 };
    }

    const queued = await getQueuedUploads();
    const actionable = queued.filter((q) => q.status === 'queued');

    let succeeded = 0;
    for (const item of actionable) {
      if (item.attempts > 0) {
        const delay = getBackoffDelay(item.attempts);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const ok = await uploadSingleRecord(item);
      if (ok) succeeded++;
    }

    return { total: actionable.length, succeeded };
  } finally {
    isSyncing = false;
  }
}

// Global synchronization event hooks
if (typeof window !== 'undefined') {
  // 1. Online event
  window.addEventListener('online', () => {
    syncAllQueuedItems();
  });

  // 2. Visibility change (user reopens app / browser tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncAllQueuedItems();
    }
  });

  // 3. Register ServiceWorker Background Sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => {
      // BackgroundSync registration handler
      (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync
        ?.register('landos-sync-queue')
        .catch(() => {});
    }).catch(() => {});
  }
}
