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
import { type Collection, DUST_FACTOR } from "../collection.ts";
import { integerPolynomials } from "../family/lattice.ts";
import { fattenWindow, type Window } from "../window.ts";

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
 * The visible depth for the classic law (γ, δ) = (1, 1), live-sampling.md
 * §2: a classic-law dot from leading coefficient a has world radius
 * c·y/|f′(z)| = c/2a independent of its height, so visibility means
 * a ≤ c/(2·worldPerPixel); dust factor ×3 (DUST_FACTOR), floored at
 * DEPTH_FLOOR so near-empty views keep their landmarks. The demo computes
 * this and hands viewConeQuadratics the resulting number — no law ever
 * enters search (design.md, "The collection model").
 */
export function visibleDepthQuadratics(c: number, worldPerPixel: number): number {
  return Math.max(DEPTH_FLOOR, Math.ceil((DUST_FACTOR * c) / (2 * worldPerPixel)));
}

/**
 * The backward collection for integer quadratics: Φ_cone(W, A) — every
 * integer quadratic with a root in the (pad-fattened) window and leading
 * coefficient ≤ aMax. The cutoffs are plain values the demo computes: aMax
 * from a depth law (visibleDepthQuadratics for visibility) and pad from the
 * largest escaping dot (c/2 at a = 1 for the classic law), both visible in
 * the sentence.
 */
export function viewConeQuadratics(opts: { window: Window; aMax: number; pad?: number }): Collection {
  const { aMax } = opts;
  const window = fattenWindow(opts.window, opts.pad ?? 0);
  return {
    family: integerPolynomials({ degree: 2 }),
    describe: () => `Φ_cone(W, A = ${aMax})`,
    coverage: "proved", // completeness by construction (live-sampling.md §1, E4/E5)
    collect: (onBatch) => coneQuadratics(window, 1, aMax, onBatch),
  };
}

