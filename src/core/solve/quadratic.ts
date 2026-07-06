/**
 * All roots of integer quadratics ax² + bx + c (a ≠ 0), in closed form.
 *
 * Exact inputs make the discriminant an exact integer in float64 (inputs
 * bounded well below 2²⁶), so the three-way branch on its sign is a true
 * branch, not a numerical guess:
 *   disc > 0 — two real roots (citardauq pairing avoids cancellation);
 *   disc = 0 — one rational root −b/2a of multiplicity 2, exactly;
 *   disc < 0 — a conjugate pair, upper-half-plane member first.
 */
import { discriminant } from "../invariants.ts";
import type { RootSlots } from "./types.ts";

/** Coefficients ascending: [c, b, a] per polynomial, stride 3. */
export function solveQuadraticBatch(
  coeffs: Float64Array, polyCount: number, out: RootSlots,
): void {
  for (let i = 0; i < polyCount; i++) {
    const o = 3 * i;
    const c = coeffs[o];
    const b = coeffs[o + 1];
    const a = coeffs[o + 2];
    const s = 2 * i; // slot base (degree 2)

    const disc = discriminant(coeffs, o, 2); // one transcription of the formula (invariants.ts)

    if (disc > 0) {
      const sq = Math.sqrt(disc);
      const q = -0.5 * (b + (b >= 0 ? sq : -sq));
      const r1 = q / a + 0; // "+ 0" normalizes -0 to +0
      const r2 = c / q + 0;
      const lo = Math.min(r1, r2);
      const hi = Math.max(r1, r2);
      out.re[s] = lo;
      out.im[s] = 0;
      out.mult[s] = 1;
      out.re[s + 1] = hi;
      out.im[s + 1] = 0;
      out.mult[s + 1] = 1;
      out.count[i] = 2;
    } else if (disc === 0) {
      out.re[s] = -b / (2 * a) + 0;
      out.im[s] = 0;
      out.mult[s] = 2;
      out.count[i] = 1;
    } else {
      const re = -b / (2 * a) + 0;
      const im = Math.sqrt(-disc) / (2 * Math.abs(a));
      out.re[s] = re;
      out.im[s] = im;
      out.mult[s] = 1;
      out.re[s + 1] = re;
      out.im[s + 1] = -im;
      out.mult[s + 1] = 1;
      out.count[i] = 2;
    }
  }
}
