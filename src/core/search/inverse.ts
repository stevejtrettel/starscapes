/**
 * Inverse search (quadratics): for each trace point z = s + iy in the
 * window, every real quadratic with root z is a scalar multiple of
 * x² − 2sx + (s² + y²), i.e. the ray t · (1, −2s, n) in (a, b, c)-space.
 * We harvest every lattice point within ε (Euclidean) of the ray up to
 * leading coefficient aMax — all hits, not the first — dedupe across trace
 * points, and hand the survivors to the ordinary forward pipeline.
 *
 * Completeness per trace point: a lattice point within ε of the ray has
 * integer first coordinate a, and the ray's first coordinate is t itself,
 * so the closest approach happens at t within ε of a — we check candidate
 * (b, c) in a window around the ray at t = a wide enough to contain every
 * point passing the exact distance test. The criterion here is the
 * `fixed-ε` baseline (design.md: the nearness criterion is an experimental
 * surface).
 */
import type { Window } from "./types.ts";

// Window's home is now types.ts; re-exported here for older importers.
export type { Window } from "./types.ts";

export interface InverseSearch {
  readonly kind: "inverse";
  /** Hard cap on the leading coefficient. */
  readonly aMax: number;
  /** Tube radius: `fixed` uses epsilon directly; `visual` uses ε(z) = epsilon/‖(1, z, z²)‖. */
  readonly epsilon: number;
  readonly criterion: "fixed" | "visual";
  /**
   * When set, march depth adapts to the trace point's height:
   * aMaxEff = min(aMax, adaptiveDepth / y). Roots at height y require
   * a ≈ √|disc|/2y, so uniform ink near ℝ needs depth growing like 1/y.
   */
  readonly adaptiveDepth?: number;
}

export function inverse(opts: {
  aMax: number;
  epsilon: number;
  criterion?: "fixed" | "visual";
  adaptiveDepth?: number;
}): InverseSearch {
  return {
    kind: "inverse",
    aMax: opts.aMax,
    epsilon: opts.epsilon,
    criterion: opts.criterion ?? "fixed",
    ...(opts.adaptiveDepth !== undefined ? { adaptiveDepth: opts.adaptiveDepth } : {}),
  };
}


/**
 * Harvest over a seedsX × seedsY grid of trace points (one per output pixel
 * in the default pipeline). Emits deduped coefficient batches (ascending,
 * stride 3). Returns the number of distinct polynomials harvested.
 */
export function harvestQuadratics(
  search: InverseSearch,
  window: Window,
  seedsX: number,
  seedsY: number,
  onBatch: (coeffs: Float64Array, count: number) => void,
  batchCapacity = 4096,
  /**
   * Dedupe set. Passing one in lets a caller split a view into row-slices
   * (via window subdivision) while deduping across the whole view — the
   * streaming path. Sliced runs with a shared set emit exactly the whole
   * run's polynomials (equivalence-tested).
   */
  seen: Set<string> = new Set<string>(),
): number {
  const { aMax, epsilon, criterion, adaptiveDepth } = search;
  const dx = window.worldW / seedsX;
  const dy = window.worldH / seedsY;

  // String keys: (a, b, c) can exceed what packs into 53 bits, and we favor
  // correctness over the last bit of speed.
  const coeffs = new Float64Array(batchCapacity * 3);
  let inBatch = 0;
  let total = 0;

  for (let iy = 0; iy < seedsY; iy++) {
    const y = window.top - (iy + 0.5) * dy;
    if (y <= 0) continue; // trace points live in the upper half plane
    for (let ix = 0; ix < seedsX; ix++) {
      const s = window.left + (ix + 0.5) * dx;
      const n = s * s + y * y;
      // Ray direction d = (1, -2s, n); |d|².
      const m2s = -2 * s;
      const dd = 1 + m2s * m2s + n * n;

      // Effective tube radius at this trace point.
      // `visual`: ε(z) = ε₀/‖(1, z, z²)‖ — constant root-space catch scale.
      const zNorm2 = 1 + n + n * n; // ‖(1, z, z²)‖² = 1 + |z|² + |z|⁴
      const eps = criterion === "visual" ? epsilon / Math.sqrt(zNorm2) : epsilon;
      const eps2 = eps * eps;

      // Effective march depth: roots at height y need a ~ √|disc|/2y.
      const aEff = adaptiveDepth === undefined
        ? aMax
        : Math.min(aMax, Math.max(1, Math.ceil(adaptiveDepth / y)));

      // Candidate windows around the ray at t = a (see file comment).
      const wb = Math.ceil(eps * (1 + Math.abs(m2s)));
      const wc = Math.ceil(eps * (1 + n));

      for (let a = 1; a <= aEff; a++) {
        const rb = m2s * a;
        const rc = n * a;
        const b0 = Math.round(rb);
        const c0 = Math.round(rc);
        for (let b = b0 - wb; b <= b0 + wb; b++) {
          for (let c = c0 - wc; c <= c0 + wc; c++) {
            // Exact distance from (a, b, c) to the ray {t · d}.
            const dot = a + m2s * b + n * c;
            const t = dot / dd;
            if (t < 0.5) continue;
            const L2 = a * a + b * b + c * c;
            const dist2 = L2 - t * t * dd;
            if (dist2 > eps2) continue;

            const key = `${a},${b},${c}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const o = inBatch * 3;
            coeffs[o] = c;
            coeffs[o + 1] = b;
            coeffs[o + 2] = a;
            inBatch++;
            total++;
            if (inBatch === batchCapacity) {
              onBatch(coeffs, inBatch);
              inBatch = 0;
            }
          }
        }
      }
    }
  }

  if (inBatch > 0) onBatch(coeffs, inBatch);
  return total;
}
