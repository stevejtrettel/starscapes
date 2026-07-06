/**
 * View-cone enumeration (quadratics): the exact population
 *
 *   Φ_cone(aMax, W) = { ax² + bx + c : 1 ≤ a ≤ aMax, some root in window W }
 *
 * enumerated directly, with no rays, seeds, or tubes. A quadratic with UHP
 * root s + iy has coefficients exactly a·(1, −2s, s² + y²), so for each
 * integer a the real part pins b (s = −b/2a) and the height range then pins
 * c (c = a(s² + y²)). Work scales with the population found plus rounding
 * slack — this is what removes the zoom depth wall (experiment E4/E5).
 *
 * Coverage is complete by construction (every member's (b, c) lies in the
 * scanned ranges); all bounds are widened by EPS before ceil/floor so float
 * rounding can never drop a member on an interval edge (conventions.md).
 * Enumeration may over-shoot by that slack, which exact post-solve
 * membership (or GPU clipping) removes. The window should be pre-fattened
 * by the style's maximum dot radius so dots centered just outside the view
 * still get drawn.
 */
import { integerPolynomials } from "../family/lattice.ts";
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

/**
 * Enumerate Φ_cone members for a ∈ [aFrom, aTo] (inclusive) — a range so
 * callers can stream in depth blocks (small a = big dots arrive first).
 * Emits reused coefficient batches (ascending [c, b, a], stride 3).
 * Returns the number of polynomials emitted.
 */
export function coneQuadratics(
  window: Window,
  aFrom: number,
  aTo: number,
  onBatch: (coeffs: Float64Array, count: number) => void,
  batchCapacity = 4096,
): number {
  const sLo = window.left;
  const sHi = window.left + window.worldW;
  const yHi = window.top;
  const yLo = Math.max(0, window.top - window.worldH);
  if (yHi <= 0) return 0; // window entirely below the real axis
  const yLo2 = yLo * yLo;
  const yHi2 = yHi * yHi;

  const coeffs = new Float64Array(batchCapacity * 3);
  let inBatch = 0;
  let total = 0;

  for (let a = Math.max(1, aFrom); a <= aTo; a++) {
    const bLo = Math.ceil(-2 * a * sHi - EPS);
    const bHi = Math.floor(-2 * a * sLo + EPS);
    for (let b = bLo; b <= bHi; b++) {
      const s = -b / (2 * a);
      const s2 = s * s;
      const cLo = Math.ceil(a * (s2 + yLo2) - EPS);
      const cHi = Math.floor(a * (s2 + yHi2) + EPS);
      for (let c = cLo; c <= cHi; c++) {
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

  if (inBatch > 0) onBatch(coeffs, inBatch);
  return total;
}

/** Never march shallower than this, so near-empty views keep their landmarks. */
const DEPTH_FLOOR = 5;

/**
 * E9's constant-ink zoom law for the quadratic hyperbolic size law:
 * ink ∝ c³/h, so c(h) = c₀·(h/h₀)^⅓ holds perceived weight constant at
 * every depth (live-sampling.md §3). h₀ is the home view, which is
 * unchanged; a zoomed view is the same visual budget spent on deeper
 * polynomials.
 */
export function constantInkScaleQuadratic(c0: number, h: number, homeH: number): number {
  return c0 * Math.cbrt(h / homeH);
}

/**
 * The backward strategy for integer quadratics: Φ_cone(W, A) at the derived
 * visibility depth (live-sampling.md §2). The derivation holds for the
 * classic law (γ, δ) = (1, 1) — pulled from the bound sizing rule per
 * Option A (sizing.ts): a classic-law dot from leading coefficient a has
 * world radius c·y/|f′(z)| = c/2a independent of its height, so visibility
 * means a ≤ c/(2·worldPerPixel); dust factor ×3, floored at DEPTH_FLOOR.
 * The window is fattened by the largest dot radius (c/2 at a = 1) so dots
 * centered just outside the view still get drawn.
 *
 * `deriveFrom` binds the cutoffs to a REFERENCE rule instead of the drawn
 * one — the explicit escape hatch for comparison prints (draw law X over
 * the classic-law population).
 */
export function viewConeQuadratics(opts: { deriveFrom?: SizingRule } = {}): SearchStrategy {
  const family = integerPolynomials({ degree: 2 });
  return {
    mode: "backward",
    family,
    populationFor(view: ViewContext): Population {
      const sizing = opts.deriveFrom ?? view.sizing;
      const c = requirePower(sizing, 1, 1, "viewConeQuadratics").c;
      const aMax = Math.max(
        DEPTH_FLOOR,
        Math.ceil((DUST_FACTOR * c) / (2 * view.worldPerPixel)),
      );
      const window = fattenWindow(view.window, c / 2);
      return {
        describe: () => `Φ_cone(W, A = ${aMax})`,
        coverage: "proved", // completeness by construction (live-sampling.md §1, E4/E5)
        enumerate: (onBatch) => coneQuadratics(window, 1, aMax, onBatch),
      };
    },
  };
}
