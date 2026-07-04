/**
 * The two v1 rasterizers, each a commutative per-pixel merge (design.md):
 *
 *   additive — disks deposit color energy; overlaps add; a log tone map
 *              develops accumulated energy into ink on white.
 *   opaque   — size-ordered without sorting: per pixel, the smallest-radius
 *              covering disk wins (a z-buffer with depth = radius).
 *
 * Both render on a supersampled grid with hard-edged disks; the develop step
 * box-downsamples, which is where antialiasing comes from. Browser-safe
 * (no Node APIs); PNG encoding lives in src/offline/.
 */

export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly ss: number; // supersample factor
  readonly mode: "additive" | "opaque";
  /** additive: [r, g, b, weight] per subpixel. opaque: [r, g, b] per subpixel. */
  readonly data: Float64Array;
  /** opaque only: winning radius per subpixel, +Infinity when uncovered. */
  readonly depth: Float64Array | null;
}

export function createRaster(
  width: number, height: number, mode: "additive" | "opaque", ss = 2,
): Raster {
  const cells = width * ss * height * ss;
  if (mode === "additive") {
    return { width, height, ss, mode, data: new Float64Array(cells * 4), depth: null };
  }
  const depth = new Float64Array(cells);
  depth.fill(Infinity);
  return { width, height, ss, mode, data: new Float64Array(cells * 3), depth };
}

/**
 * Deposit a hard-edged disk at subpixel center (cx, cy) with subpixel radius
 * r. Sub-cell disks are clamped to a minimal radius so they never vanish
 * between sample points.
 */
export function depositDisk(
  raster: Raster, cx: number, cy: number, r: number,
  red: number, green: number, blue: number,
): void {
  const W = raster.width * raster.ss;
  const H = raster.height * raster.ss;
  const rr = Math.max(r, 0.75);
  const x0 = Math.max(0, Math.floor(cx - rr));
  const x1 = Math.min(W - 1, Math.ceil(cx + rr));
  const y0 = Math.max(0, Math.floor(cy - rr));
  const y1 = Math.min(H - 1, Math.ceil(cy + rr));
  if (x0 > x1 || y0 > y1) return;
  const r2 = rr * rr;
  const { data, depth } = raster;

  if (raster.mode === "additive") {
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = y * W;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy > r2) continue;
        const o = (row + x) * 4;
        data[o] += red;
        data[o + 1] += green;
        data[o + 2] += blue;
        data[o + 3] += 1;
      }
    }
  } else {
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = y * W;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy > r2) continue;
        const i = row + x;
        if (rr < depth![i]) {
          depth![i] = rr;
          const o = i * 3;
          data[o] = red;
          data[o + 1] = green;
          data[o + 2] = blue;
        }
      }
    }
  }
}

/**
 * Develop to 8-bit RGB (row-major, 3 bytes per pixel) on a white background,
 * box-downsampling the supersampled grid.
 */
export function develop(raster: Raster): Uint8ClampedArray {
  const { width, height, ss, data, depth } = raster;
  const W = width * ss;
  const out = new Uint8ClampedArray(width * height * 3);
  const inv = 1 / (ss * ss);

  // additive: log tone scale against a high percentile of subpixel weight.
  let logDenom = 1;
  if (raster.mode === "additive") {
    const weights: number[] = [];
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) weights.push(data[i]);
    weights.sort((p, q) => p - q);
    const clip = weights.length > 0 ? weights[Math.floor(weights.length * 0.999)] : 1;
    logDenom = Math.log1p(clip);
  }

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < ss; sy++) {
        const row = (py * ss + sy) * W;
        for (let sx = 0; sx < ss; sx++) {
          const i = row + px * ss + sx;
          if (raster.mode === "additive") {
            const o = i * 4;
            const w = data[o + 3];
            if (w > 0) {
              const t = Math.min(1, Math.log1p(w) / logDenom);
              // ink = mean deposited color; lerp white → ink by tone t
              r += 1 + (data[o] / w - 1) * t;
              g += 1 + (data[o + 1] / w - 1) * t;
              b += 1 + (data[o + 2] / w - 1) * t;
            } else {
              r += 1; g += 1; b += 1;
            }
          } else {
            if (depth![i] < Infinity) {
              const o = i * 3;
              r += data[o];
              g += data[o + 1];
              b += data[o + 2];
            } else {
              r += 1; g += 1; b += 1;
            }
          }
        }
      }
      const o = (py * width + px) * 3;
      out[o] = r * inv * 255;
      out[o + 1] = g * inv * 255;
      out[o + 2] = b * inv * 255;
    }
  }
  return out;
}
