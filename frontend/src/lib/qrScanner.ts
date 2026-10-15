/**
 * Dynamic import wrapper for zxing-wasm.
 * Decodes QR codes entirely client-side without holding WASM in the initial page bundle.
 */

export interface QRScanResult {
  text: string;
  format?: string;
}

export async function scanQRCodeFromImage(
  input: Blob | ImageData | HTMLCanvasElement
): Promise<QRScanResult | null> {
  try {
    const { readBarcodes } = await import('zxing-wasm/reader');

    let targetInput: Blob | ImageData;
    if (input instanceof HTMLCanvasElement) {
      const ctx = input.getContext('2d');
      if (!ctx) return null;
      targetInput = ctx.getImageData(0, 0, input.width, input.height);
    } else {
      targetInput = input;
    }

    const results = await readBarcodes(targetInput, {
      formats: ['QRCode'],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    });

    if (results && results.length > 0) {
      return {
        text: results[0].text,
        format: results[0].format,
      };
    }
    return null;
  } catch (err) {
    console.warn('Client-side QR decode error:', err);
    return null;
  }
}
