import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  enqueueOfflineDocument,
  getQueuedUploads,
  updateUploadStatus,
  hasOfflineConsent,
  setOfflineConsent,
  getDecryptedBlob,
  offlineDB,
  type OfflineUploadRecord,
} from './offlineQueue';
import { encryptBlob, decryptBlob } from './crypto';

describe('Feature 6: Low-Network Smart Mode & Offline Queue', () => {
  let inMemoryRecords: OfflineUploadRecord[] = [];

  beforeEach(() => {
    setOfflineConsent(true);
    inMemoryRecords = [];

    // Mock Dexie offlineUploads table methods
    offlineDB.offlineUploads = {
      add: vi.fn(async (record: OfflineUploadRecord) => {
        const withId = { ...record, id: inMemoryRecords.length + 1 };
        inMemoryRecords.push(withId);
        return withId.id;
      }),
      where: vi.fn((field: string) => ({
        equals: (val: unknown) => ({
          first: async () => inMemoryRecords.find((r: OfflineUploadRecord) => (r as unknown as Record<string, unknown>)[field] === val),
          delete: async () => {
            const idx = inMemoryRecords.findIndex((r: OfflineUploadRecord) => (r as unknown as Record<string, unknown>)[field] === val);
            if (idx >= 0) inMemoryRecords.splice(idx, 1);
          },
        }),
        anyOf: (...statuses: string[]) => ({
          count: async () =>
            inMemoryRecords.filter((r) => statuses.includes(r.status)).length,
        }),
        below: (_val: number) => ({
          toArray: async () => [],
          delete: async () => {},
        }),
      })),
      orderBy: vi.fn(() => ({
        reverse: () => ({
          toArray: async () => [...inMemoryRecords].reverse(),
        }),
      })),
      update: vi.fn(async (id: number, changes: Partial<OfflineUploadRecord>) => {
        const item = inMemoryRecords.find((r) => r.id === id);
        if (item) Object.assign(item, changes);
      }),
    } as unknown as typeof offlineDB.offlineUploads;
  });

  it('user consent is recorded and respected', () => {
    setOfflineConsent(true);
    expect(hasOfflineConsent()).toBe(true);
    setOfflineConsent(false);
    expect(hasOfflineConsent()).toBe(false);
  });

  async function readBlobAsText(blob: Blob): Promise<string> {
    if (typeof blob.text === 'function') {
      return await blob.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
  }

  it('encrypts image blob with WebCrypto AES-GCM and decrypts back losslessly', async () => {
    const rawData = 'Land Document Confidential Record 2026';
    const blob = new Blob([rawData], { type: 'text/plain' });

    const { encryptedBuffer, iv } = await encryptBlob(blob);
    expect(encryptedBuffer.byteLength).toBeGreaterThan(0);
    expect(iv.length).toBe(12);

    const decryptedBlob = await decryptBlob(encryptedBuffer, iv, 'text/plain');
    const decryptedText = await readBlobAsText(decryptedBlob);
    expect(decryptedText).toBe(rawData);
  });

  it('enqueues encrypted document image blob into IndexedDB with idempotency UUID', async () => {
    setOfflineConsent(true);
    const blob = new Blob(['sample-deed-bytes'], { type: 'image/jpeg' });
    const res = await enqueueOfflineDocument(blob, 'deed_test.jpg', 'QR_LAND_123');

    expect(res.success).toBe(true);
    expect(res.uuid).toBeDefined();
    expect(res.uuid.length).toBeGreaterThan(10);

    const queued = await getQueuedUploads();
    expect(queued.length).toBe(1);
    expect(queued[0].file_name).toBe('deed_test.jpg');
    expect(queued[0].status).toBe('queued');
    expect(queued[0].qr_payload).toBe('QR_LAND_123');
    expect(queued[0].encrypted_data.byteLength).toBeGreaterThan(0);

    // Verify it can be decrypted
    const decrypted = await getDecryptedBlob(queued[0]);
    const text = await readBlobAsText(decrypted);
    expect(text).toBe('sample-deed-bytes');
  });

  it('uploads exactly once and purges encrypted local blob when marked synced', async () => {
    setOfflineConsent(true);
    const blob = new Blob(['image-to-upload-once'], { type: 'image/jpeg' });
    const { uuid } = await enqueueOfflineDocument(blob, 'khatian_scan.jpg');

    let items = await getQueuedUploads();
    expect(items.length).toBe(1);

    // Transition: queued -> uploading
    await updateUploadStatus(uuid, 'uploading');
    items = await getQueuedUploads();
    expect(items[0].status).toBe('uploading');

    // Transition: uploading -> synced (Must be deleted immediately for privacy)
    await updateUploadStatus(uuid, 'synced');
    items = await getQueuedUploads();
    expect(items.length).toBe(0); // Purged! Uploaded exactly once!
  });
});
