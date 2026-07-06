/**
 * The monic cubic view-cone: enumerate
 *
 *   Φ₃ᵐᵒⁿ(W, ρ) = { x³ + bx² + cx + d : complex pair in W, |r − s| ≤ ρ }
 *
 * by the integer slicing derived in docs/monic-cubic-sampling.md §1
 * (b pins r along the slice; c(s,y) = y² − 3s² − 2bs; then d(s) =
 * (b + 2s)(4s² + 2bs + c), a cubic whose range over the valid s-intervals
 * has closed-form extremes). All interval bounds are conservative and
 * widened by EPS against float rounding: over-coverage is harmless (the
 * caller solves every candidate and applies exact membership), losing a
 * member is not. Completeness argument: doc §1. No duplicates: d-ranges
 * from the ≤ 2 valid s-intervals are merged before emission.
 */
import { monicPolynomials } from "../family/lattice.ts";
import { requirePower, type SizingRule } from "../sizing.ts";
import {
  DUST_FACTOR,
  fattenWindow,
  type Population,
  type SearchStrategy,
  type ViewContext,
  type Window,
} from "./types.ts";

const EPS = 1e-9;

/** Emits ascending coefficient batches [d, c, b, 1], stride 4.
 *  Returns the number of candidates emitted. */
export function coneMonicCubics(
  window: Window,
  rho: number,
  onBatch: (coeffs: Float64Array, count: number) => void,
  batchCapacity = 4096,
): number {
  const s0 = window.left;
  const s1 = window.left + window.worldW;
  const y1 = window.top;
  const y0 = Math.max(0, window.top - window.worldH);
  if (y1 <= 0) return 0;
  const y02 = y0 * y0;
  const y12 = y1 * y1;

  const coeffs = new Float64Array(batchCapacity * 4);
  let inBatch = 0;
  let total = 0;

  const emit = (d: number, c: number, b: number): void => {
    const o = inBatch * 4;
    coeffs[o] = d;
    coeffs[o + 1] = c;
    coeffs[o + 2] = b;
    coeffs[o + 3] = 1;
    inBatch++;
    total++;
    if (inBatch === batchCapacity) {
      onBatch(coeffs, inBatch);
      inBatch = 0;
    }
  };

  const bLo = Math.ceil(-(3 * s1 + rho) - EPS);
  const bHi = Math.floor(-(3 * s0 - rho) + EPS);

  for (let b = bLo; b <= bHi; b++) {
    // s-interval of the slice: s ∈ [s0, s1] ∩ {|b + 3s| ≤ ρ}.
    const ia = Math.max(s0, (-b - rho) / 3);
    const ib = Math.min(s1, (-b + rho) / 3);
    if (ia > ib) continue;

    // c-range from c(s, y) = y² + g(s), g(s) = −3s² − 2bs (concave).
    const g = (s: number): number => -3 * s * s - 2 * b * s;
    const sVertex = -b / 3;
    const gMax = sVertex >= ia && sVertex <= ib
      ? (b * b) / 3
      : Math.max(g(ia), g(ib));
    const gMin = Math.min(g(ia), g(ib));
    const cLo = Math.ceil(y02 + gMin - EPS);
    const cHi = Math.floor(y12 + gMax + EPS);

    for (let c = cLo; c <= cHi; c++) {
      // Valid s-set: y0² ≤ h(s) ≤ y1², h(s) = 3s² + 2bs + c (upward).
      // ≤ y1²: between the roots of 3s² + 2bs + (c − y1²).
      const disc1 = b * b - 3 * (c - y12);
      if (disc1 < 0) continue; // h > y1² everywhere
      const sq1 = Math.sqrt(disc1);
      const lo = Math.max(ia, (-b - sq1) / 3);
      const hi = Math.min(ib, (-b + sq1) / 3);
      if (lo > hi) continue;

      // ≥ y0²: outside the roots of 3s² + 2bs + (c − y0²) (if real).
      const disc0 = b * b - 3 * (c - y02);
      const intervals: Array<[number, number]> = [];
      if (disc0 < 0) {
        intervals.push([lo, hi]); // h ≥ y0² everywhere
      } else {
        const sq0 = Math.sqrt(disc0);
        const L0 = (-b - sq0) / 3;
        const R0 = (-b + sq0) / 3;
        if (lo < L0) intervals.push([lo, Math.min(hi, L0)]);
        if (hi > R0) intervals.push([Math.max(lo, R0), hi]);
      }
      if (intervals.length === 0) continue;

      // d-range per interval from the cubic d(s) = (b+2s)(4s² + 2bs + c);
      // extremes at endpoints and the closed-form critical points (1.3).
      const dOf = (s: number): number => (b + 2 * s) * (4 * s * s + 2 * b * s + c);
      const ranges: Array<[number, number]> = [];
      const critDisc = b * b - 3 * c;
      const crit1 = critDisc >= 0 ? (-2 * b - Math.sqrt(critDisc)) / 6 : NaN;
      const crit2 = critDisc >= 0 ? (-2 * b + Math.sqrt(critDisc)) / 6 : NaN;
      for (const [u, v] of intervals) {
        if (u > v) continue;
        let dMin = Math.min(dOf(u), dOf(v));
        let dMax = Math.max(dOf(u), dOf(v));
        for (const sc of [crit1, crit2]) {
          if (Number.isFinite(sc) && sc > u && sc < v) {
            const val = dOf(sc);
            if (val < dMin) dMin = val;
            if (val > dMax) dMax = val;
          }
        }
        ranges.push([Math.ceil(dMin - EPS), Math.floor(dMax + EPS)]);
      }

      // Merge integer d-ranges so no candidate is emitted twice.
      ranges.sort((p, q) => p[0] - q[0]);
      let curLo = Number.NaN;
      let curHi = Number.NaN;
      for (const [rl, rh] of ranges) {
        if (rh < rl) continue;
        if (Number.isNaN(curLo)) {
          curLo = rl;
          curHi = rh;
        } else if (rl <= curHi + 1) {
          curHi = Math.max(curHi, rh);
        } else {
          for (let d = curLo; d <= curHi; d++) emit(d, c, b);
          curLo = rl;
          curHi = rh;
        }
      }
      if (!Number.isNaN(curLo)) {
        for (let d = curLo; d <= curHi; d++) emit(d, c, b);
      }
    }
  }

  if (inBatch > 0) onBatch(coeffs, inBatch);
  return total;
}

/** Default print-texture depth multiplier on ρ (labeled aesthetic dial:
 *  population ∝ ρ³ makes dust cheap — docs/monic-cubic-sampling.md §4). */
const DEFAULT_DUST_R = 4;

/**
 * Constant-ink zoom law for the monic cubic disc¼ size law: ink ∝
 * c^{5/2}·(H/h)^{1/2} with ρ ∝ √(c/p), so constant perceived weight needs
 * c(h) = c₀·(h/h₀)^{1/5} — the fifth-root analogue of the quadratics' cube
 * root (docs/monic-cubic-sampling.md §7.3).
 */
export function constantInkScaleMonicCubic(c0: number, h: number, homeH: number): number {
  return c0 * (h / homeH) ** (1 / 5);
}

/**
 * The backward strategy for monic integer cubics: Φ₃ᵐᵒⁿ(W, ρ) with the
 * real-root reach ρ derived from visibility (docs/monic-cubic-sampling.md
 * §3). The derivation holds for the uniformity law (γ, δ) = (1, ½) —
 * pulled from the bound sizing rule per Option A (sizing.ts). The §3
 * formula ρ = R·√(3c/(2·worldPerPixel)) is stated in the disc¼-form
 * constant c_disc = c_f′/√2 (sizing.ts conversion identities), so the
 * pulled f′-form c converts before entering it; R is the dust dial. The
 * window is fattened by c_disc — generous vs the largest escaping dot
 * (labeled heuristic, matching the live worker's validated look).
 *
 * `deriveFrom` binds the cutoffs to a REFERENCE rule instead of the drawn
 * one — the explicit escape hatch for comparison prints.
 */
export function viewConeMonicCubics(
  opts: { dustR?: number; deriveFrom?: SizingRule } = {},
): SearchStrategy {
  const dustR = opts.dustR ?? DEFAULT_DUST_R;
  const family = monicPolynomials({ degree: 3 });
  return {
    mode: "backward",
    family,
    populationFor(view: ViewContext): Population {
      const sizing = opts.deriveFrom ?? view.sizing;
      const c = requirePower(sizing, 1, 0.5, "viewConeMonicCubics").c / Math.SQRT2;
      const rho = dustR * Math.sqrt((DUST_FACTOR * c) / (2 * view.worldPerPixel));
      const window = fattenWindow(view.window, c);
      return {
        describe: () => `Φ₃ᵐᵒⁿ(W, ρ = ${rho.toFixed(1)})`,
        coverage: "proved", // completeness by the §1 slicing argument (E13)
        enumerate: (onBatch) => coneMonicCubics(window, rho, onBatch),
      };
    },
  };
}
