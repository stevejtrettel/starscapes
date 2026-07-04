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
 * scanned ranges); enumeration may over-shoot by rounding slack at the
 * window edge, which exact post-solve membership (or GPU clipping) removes.
 * The window should be pre-fattened by the style's maximum dot radius so
 * dots centered just outside the view still get drawn.
 */
import type { Window } from "./inverse.ts";

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
    const bLo = Math.ceil(-2 * a * sHi);
    const bHi = Math.floor(-2 * a * sLo);
    for (let b = bLo; b <= bHi; b++) {
      const s = -b / (2 * a);
      const s2 = s * s;
      const cLo = Math.ceil(a * (s2 + yLo2));
      const cHi = Math.floor(a * (s2 + yHi2));
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
