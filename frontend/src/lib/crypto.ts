/**
 * WebCrypto AES-GCM Encryption / Decryption with Non-Extractable Key.
 * Protects offline document images saved in IndexedDB from unauthorized exfiltration.
 */

const KEY_DB_NAME = 'landos_keystore';
const KEY_STORE_NAME = 'keys';
const KEY_ID = 'offline_aes_key';

async function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEY_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(KEY_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns or generates a non-extractable CryptoKey for AES-GCM (256-bit).
 */
export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = tx.objectStore(KEY_STORE_NAME);
    const getReq = store.get(KEY_ID);

    getReq.onsuccess = async () => {
      if (getReq.result) {
        resolve(getReq.result as CryptoKey);
      } else {
        try {
          const newKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false, // non-extractable!
            ['encrypt', 'decrypt']
          );
          const putTx = db.transaction(KEY_STORE_NAME, 'readwrite');
          putTx.objectStore(KEY_STORE_NAME).put(newKey, KEY_ID);
          putTx.oncomplete = () => resolve(newKey);
          putTx.onerror = () => reject(putTx.error);
        } catch (err) {
          reject(err);
        }
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Encrypts an image Blob using AES-GCM with a fresh random 96-bit IV.
 */
export async function encryptBlob(blob: Blob): Promise<{ encryptedBuffer: ArrayBuffer; iv: Uint8Array }> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await blob.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    arrayBuffer
  );

  return { encryptedBuffer, iv };
}

/**
 * Decrypts an AES-GCM encrypted ArrayBuffer back into a Blob.
 */
export async function decryptBlob(encryptedBuffer: ArrayBuffer, iv: Uint8Array, mimeType = 'image/jpeg'): Promise<Blob> {
  const key = await getOrCreateEncryptionKey();
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encryptedBuffer
  );
  return new Blob([decryptedBuffer], { type: mimeType });
}
