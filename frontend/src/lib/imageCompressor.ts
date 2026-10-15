import imageCompression from 'browser-image-compression';

/**
 * Compresses document image, normalizes EXIF orientation,
 * limits the long side to 1600px, and outputs high-quality JPEG (~0.8).
 */
export async function compressDocumentImage(fileOrBlob: File | Blob, fileName = 'scan.jpg'): Promise<File> {
  const file = fileOrBlob instanceof File
    ? fileOrBlob
    : new File([fileOrBlob], fileName, { type: 'image/jpeg' });

  const options = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
    alwaysKeepResolution: false,
  };

  try {
    const compressed = await imageCompression(file, options);
    return new File([compressed], fileName, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('browser-image-compression fallback to canvas resize:', err);
    return fallbackCanvasCompress(file, 1600, 0.8, fileName);
  }
}

async function fallbackCanvasCompress(file: File, maxDim: number, quality: number, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], fileName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for canvas compression'));
    };
    img.src = url;
  });
}
