import type { QualityAnalysisResult } from '../workers/qualityGate.worker';

/**
 * Runs image quality analysis using the on-device Web Worker.
 * Downscales input to ~800px on the longest side for quick worker analysis.
 */
export async function analyzeImageQuality(imageSource: HTMLImageElement | HTMLCanvasElement | Blob): Promise<QualityAnalysisResult> {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  if (imageSource instanceof HTMLCanvasElement) {
    canvas = imageSource;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d context');
    ctx = context;
  } else {
    canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d context');
    ctx = context;

    let img: HTMLImageElement;
    if (imageSource instanceof Blob) {
      img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(imageSource);
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };
        image.src = url;
      });
    } else {
      img = imageSource;
    }

    // Scale to max 800px dimension for fast quality assessment
    const maxDim = 800;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return new Promise<QualityAnalysisResult>((resolve) => {
    try {
      const worker = new Worker(
        new URL('../workers/qualityGate.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent<QualityAnalysisResult>) => {
        worker.terminate();
        resolve(e.data);
      };

      worker.onerror = () => {
        worker.terminate();
        // Fallback gracefully if worker fails
        resolve({
          passed: true,
          blur: false,
          dark: false,
          glare: false,
          lowResolution: false,
          metrics: { laplacianVariance: 100, avgLuminance: 128, glareRatio: 0, width: canvas.width, height: canvas.height },
          tips_bn: [],
        });
      };

      worker.postMessage({ imageData });
    } catch {
      // Fallback if workers unsupported
      resolve({
        passed: true,
        blur: false,
        dark: false,
        glare: false,
        lowResolution: false,
        metrics: { laplacianVariance: 100, avgLuminance: 128, glareRatio: 0, width: canvas.width, height: canvas.height },
        tips_bn: [],
      });
    }
  });
}
