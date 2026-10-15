/**
 * Web Worker for On-Device Document Quality Gate Analysis.
 * Runs in a background thread to prevent UI freezing on mobile browsers.
 * Analyzes:
 * - Resolution (target >= 1600px long side)
 * - Brightness / Dark condition
 * - Glare / Overexposure
 * - Blur detection (Laplacian variance approximation)
 * Produces user-friendly Bangla guidance tips.
 */

export interface QualityAnalysisResult {
  passed: boolean;
  blur: boolean;
  dark: boolean;
  glare: boolean;
  lowResolution: boolean;
  metrics: {
    laplacianVariance: number;
    avgLuminance: number;
    glareRatio: number;
    width: number;
    height: number;
  };
  tips_bn: string[];
}

self.onmessage = (event: MessageEvent<{ imageData: ImageData }>) => {
  const { imageData } = event.data;
  const { data, width, height } = imageData;

  const longSide = Math.max(width, height);
  const lowResolution = longSide < 1200;

  let totalLuminance = 0;
  let glarePixels = 0;
  const totalPixels = width * height;

  // 1. Grayscale luminance calculation
  const gray = new Uint8Array(totalPixels);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[j] = lum;
    totalLuminance += lum;
    if (lum > 245) {
      glarePixels++;
    }
  }

  const avgLuminance = totalLuminance / totalPixels;
  const glareRatio = glarePixels / totalPixels;
  const dark = avgLuminance < 45;
  const glare = glareRatio > 0.12;

  // 2. Blur analysis: Discrete Laplacian variance on sampled grid
  // Kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
  let laplacianSum = 0;
  let laplacianSumSq = 0;
  let sampleCount = 0;

  const step = Math.max(1, Math.floor(Math.min(width, height) / 300)); // Adaptive sample step for fast processing

  for (let y = 1; y < height - 1; y += step) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x += step) {
      const idx = rowOffset + x;
      const val =
        gray[idx - width] +
        gray[idx + width] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];

      laplacianSum += val;
      laplacianSumSq += val * val;
      sampleCount++;
    }
  }

  const mean = sampleCount > 0 ? laplacianSum / sampleCount : 0;
  const variance = sampleCount > 0 ? laplacianSumSq / sampleCount - mean * mean : 0;

  // Variance threshold for blur: low variance signifies lack of high-frequency sharp text edges
  const blur = variance < 65;

  const tips_bn: string[] = [];
  if (blur) {
    tips_bn.push("ঝাপসা, ফোন স্থির রাখুন");
  }
  if (dark) {
    tips_bn.push("আলো কম, উজ্জ্বল স্থানে যান");
  }
  if (glare) {
    tips_bn.push("খুব উজ্জ্বল অথবা ক্যামেরার ফ্ল্যাশ বন্ধ করুন");
  }
  if (lowResolution) {
    tips_bn.push("রেজোলিউশন কম, ক্যামেরা আরও কাছে আনুন");
  }

  const passed = !blur && !dark && !glare && !lowResolution;

  const result: QualityAnalysisResult = {
    passed,
    blur,
    dark,
    glare,
    lowResolution,
    metrics: {
      laplacianVariance: Math.round(variance),
      avgLuminance: Math.round(avgLuminance),
      glareRatio: Math.round(glareRatio * 100) / 100,
      width,
      height,
    },
    tips_bn,
  };

  self.postMessage(result);
};
