/**
 * Rasterising discs. Two compositing rules, both commutative — the image
 * does not depend on the order in which discs arrive, so nothing is sorted
 * and enumeration can be streamed or split freely:
 *
 *   opaque    each sample shows the SMALLEST disc covering it (a depth
 *             buffer whose depth is the radius);
 *   additive  each sample counts the discs covering it; a logarithmic tone
 *             curve develops the counts.
 *
 * Discs are sampled on a supersampled grid (ss × ss samples per pixel) and
 * averaged down, which antialiases their edges.
 *
 * A disc too small to be sampled reliably (radius under half a sample) is
 * not enlarged to a visible dot: it deposits its true AREA. In opaque mode
 * the area goes into a per-pixel "dust" layer, composited over the picture
 * with coverage 1 − exp(−area) — the expected coverage of many small discs
 * falling independently on a pixel. The image is therefore a rendering of
 * the measure Σ πr²·δ_z, and stays meaningful when the catalogue reaches
 * far below the pixel scale.
 *
 * Coordinates are output pixels, origin top-left, y down.
 */

export type Compositing = "opaque" | "additive";

/** Discs below this radius, in samples, are deposited by area. */
const MIN_SAMPLED_RADIUS = 0.5;
/** Additive develop: the tone curve saturates at this quantile of the nonzero counts. */
const TONE_QUANTILE = 0.999;
const TONE_BINS = 1024;

export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly ss: number;
  readonly mode: Compositing;
  /** Per sample: opaque [r, g, b, radius of the winning disc]; additive [Σr, Σg, Σb, count]. */
  readonly samples: Float32Array;
  /** Opaque only, per pixel: [Σ area·r, Σ area·g, Σ area·b, Σ area] of sub-sample discs. */
  readonly dust: Float32Array;
}

export function createRaster(width: number, height: number, mode: Compositing, ss = 2): Raster {
  const samples = new Float32Array(width * ss * height * ss * 4);
  if (mode === "opaque") {
    for (let i = 3; i < samples.length; i += 4) samples[i] = Infinity;
  }
  return { width, height, ss, mode, samples, dust: new Float32Array(mode === "opaque" ? width * height * 4 : 0) };
}

/** Deposit the disc of centre (cx, cy) and radius r, colour (red, green, blue) ∈ [0, 1]³. */
export function depositDisc(
  raster: Raster, cx: number, cy: number, r: number,
  red: number, green: number, blue: number,
): void {
  const { ss, samples } = raster;
  const W = raster.width * ss;
  const H = raster.height * ss;
  const rs = r * ss;

  if (rs < MIN_SAMPLED_RADIUS) {
    const area = Math.PI * r * r; // in pixels
    if (raster.mode === "additive") {
      const x = Math.floor(cx * ss);
      const y = Math.floor(cy * ss);
      if (x < 0 || x >= W || y < 0 || y >= H) return;
      const o = (y * W + x) * 4;
      const weight = area * ss * ss; // in samples
      samples[o] += red * weight;
      samples[o + 1] += green * weight;
      samples[o + 2] += blue * weight;
      samples[o + 3] += weight;
      return;
    }
    // Bilinear split among the four pixels whose centres surround (cx, cy).
    const { dust, width, height } = raster;
    const fx = cx - 0.5;
    const fy = cy - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    for (let j = 0; j < 2; j++) {
      const y = y0 + j;
      if (y < 0 || y >= height) continue;
      for (let i = 0; i < 2; i++) {
        const x = x0 + i;
        if (x < 0 || x >= width) continue;
        const weight = area * (i ? tx : 1 - tx) * (j ? ty : 1 - ty);
        const o = (y * width + x) * 4;
        dust[o] += red * weight;
        dust[o + 1] += green * weight;
        dust[o + 2] += blue * weight;
        dust[o + 3] += weight;
      }
    }
    return;
  }

  const sx = cx * ss;
  const sy = cy * ss;
  const x0 = Math.max(0, Math.ceil(sx - rs - 0.5));
  const x1 = Math.min(W - 1, Math.floor(sx + rs - 0.5));
  const y0 = Math.max(0, Math.ceil(sy - rs - 0.5));
  const y1 = Math.min(H - 1, Math.floor(sy + rs - 0.5));
  const r2 = rs * rs;
  const additive = raster.mode === "additive";
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - sy;
    const half2 = r2 - dy * dy;
    if (half2 < 0) continue;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - sx;
      if (dx * dx > half2) continue;
      const o = (y * W + x) * 4;
      if (additive) {
        samples[o] += red;
        samples[o + 1] += green;
        samples[o + 2] += blue;
        samples[o + 3] += 1;
      } else if (rs < samples[o + 3]) {
        samples[o] = red;
        samples[o + 1] = green;
        samples[o + 2] = blue;
        samples[o + 3] = rs;
      }
    }
  }
}

/** The finished image: 8-bit RGB, row-major, on a white ground. */
export function develop(raster: Raster): Uint8ClampedArray {
  const { width, height, ss, samples, dust } = raster;
  const W = width * ss;
  const out = new Uint8ClampedArray(width * height * 3);
  const perPixel = 1 / (ss * ss);
  const additive = raster.mode === "additive";
  const toneScale = additive ? 1 / Math.log1p(countQuantile(samples)) : 0;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < ss; j++) {
        for (let i = 0; i < ss; i++) {
          const o = ((py * ss + j) * W + px * ss + i) * 4;
          const w = samples[o + 3];
          if (additive) {
            // White → mean deposited colour, by the tone t ∈ [0, 1] of the count.
            const t = w > 0 ? Math.min(1, Math.log1p(w) * toneScale) : 0;
            r += 1 + (w > 0 ? samples[o] / w - 1 : 0) * t;
            g += 1 + (w > 0 ? samples[o + 1] / w - 1 : 0) * t;
            b += 1 + (w > 0 ? samples[o + 2] / w - 1 : 0) * t;
          } else if (w < Infinity) {
            r += samples[o];
            g += samples[o + 1];
            b += samples[o + 2];
          } else {
            r += 1;
            g += 1;
            b += 1;
          }
        }
      }
      r *= perPixel;
      g *= perPixel;
      b *= perPixel;

      if (!additive) {
        const o = (py * width + px) * 4;
        const area = dust[o + 3];
        if (area > 0) {
          const cover = -Math.expm1(-area); // 1 − e^(−area)
          r += (dust[o] / area - r) * cover;
          g += (dust[o + 1] / area - g) * cover;
          b += (dust[o + 2] / area - b) * cover;
        }
      }
      const o = (py * width + px) * 3;
      out[o] = r * 255;
      out[o + 1] = g * 255;
      out[o + 2] = b * 255;
    }
  }
  return out;
}

/**
 * The TONE_QUANTILE quantile of the nonzero counts, from a log-spaced
 * histogram: constant memory, and the tone curve only needs it roughly.
 */
function countQuantile(samples: Float32Array): number {
  let covered = 0;
  let max = 0;
  for (let i = 3; i < samples.length; i += 4) {
    if (samples[i] > 0) {
      covered++;
      max = Math.max(max, samples[i]);
    }
  }
  if (covered === 0) return 1;
  const bins = new Uint32Array(TONE_BINS);
  const scale = (TONE_BINS - 1) / Math.log1p(max);
  for (let i = 3; i < samples.length; i += 4) {
    if (samples[i] > 0) bins[Math.floor(Math.log1p(samples[i]) * scale)]++;
  }
  const target = Math.floor(covered * TONE_QUANTILE);
  let below = 0;
  let bin = 0;
  while (bin < TONE_BINS - 1 && below + bins[bin] <= target) below += bins[bin++];
  return Math.expm1((bin + 1) / scale);
}
