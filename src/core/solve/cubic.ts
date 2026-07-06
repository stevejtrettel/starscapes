/**
 * All roots of integer cubics ax³ + bx² + cx + d (a ≠ 0), in closed form.
 *
 * The discriminant disc = 18abcd − 4b³d + b²c² − 4ac³ − 27a²d² is an exact
 * integer in float64 for the coefficient ranges we enumerate, so the branch
 * on its sign is a true branch:
 *   disc > 0 — three distinct real roots (trigonometric form);
 *   disc = 0 — repeated roots, all rational, from exact formulas;
 *   disc < 0 — one real root (stable Cardano) + a conjugate pair
 *              (deflate by the real root, then the quadratic formula).
 * Real roots get a Newton polish against the original cubic.
 */
import { discriminant } from "../invariants.ts";
import { evalDerivReal, evalReal } from "../polynomial.ts";
import { TOL } from "./tolerances.ts";
import type { RootSlots } from "./types.ts";

const TWO_PI_3 = (2 * Math.PI) / 3;

function polish(coeffs: Float64Array, off: number, x0: number): number {
  let x = x0;
  for (let iter = 0; iter < TOL.polishMaxIter; iter++) {
    const f = evalReal(coeffs, x, off, 4);
    const df = evalDerivReal(coeffs, x, off, 4);
    if (df === 0) break;
    const step = f / df;
    x -= step;
    if (Math.abs(step) <= TOL.polishRel * (1 + Math.abs(x))) break;
  }
  return x + 0; // "+ 0" normalizes -0 to +0
}

/** Coefficients ascending: [d, c, b, a] per polynomial, stride 4. */
export function solveCubicBatch(
  coeffs: Float64Array, polyCount: number, out: RootSlots,
): void {
  for (let i = 0; i < polyCount; i++) {
    const o = 4 * i;
    const d = coeffs[o];
    const c = coeffs[o + 1];
    const b = coeffs[o + 2];
    const a = coeffs[o + 3];
    const s = 3 * i; // slot base (degree 3)

    const disc = discriminant(coeffs, o, 3); // one transcription of the formula (invariants.ts)

    // Depressed cubic t³ + pt + q under x = t − b/(3a).
    const shift = -b / (3 * a);
    const p = (3 * a * c - b * b) / (3 * a * a);
    const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);

    if (disc > 0) {
      // Three distinct real roots: t_k = m·cos(θ − 2πk/3).
      const m = 2 * Math.sqrt(-p / 3);
      const arg = Math.max(-1, Math.min(1, (3 * q) / (p * m)));
      const theta = Math.acos(arg) / 3;
      let r0 = polish(coeffs, o, shift + m * Math.cos(theta));
      let r1 = polish(coeffs, o, shift + m * Math.cos(theta - TWO_PI_3));
      let r2 = polish(coeffs, o, shift + m * Math.cos(theta - 2 * TWO_PI_3));
      // Ascending order.
      let t: number;
      if (r0 > r1) { t = r0; r0 = r1; r1 = t; }
      if (r1 > r2) { t = r1; r1 = r2; r2 = t; }
      if (r0 > r1) { t = r0; r0 = r1; r1 = t; }
      out.re[s] = r0; out.im[s] = 0; out.mult[s] = 1;
      out.re[s + 1] = r1; out.im[s + 1] = 0; out.mult[s + 1] = 1;
      out.re[s + 2] = r2; out.im[s + 2] = 0; out.mult[s + 2] = 1;
      out.count[i] = 3;
    } else if (disc === 0) {
      // Repeated roots — rational, from exact formulas.
      const delta0 = b * b - 3 * a * c;
      if (delta0 === 0) {
        out.re[s] = shift + 0; out.im[s] = 0; out.mult[s] = 3;
        out.count[i] = 1;
      } else {
        const double = (9 * a * d - b * c) / (2 * delta0) + 0;
        const simple = (4 * a * b * c - 9 * a * a * d - b * b * b) / (a * delta0) + 0;
        const lo = Math.min(double, simple);
        const hi = Math.max(double, simple);
        out.re[s] = lo; out.im[s] = 0; out.mult[s] = lo === double ? 2 : 1;
        out.re[s + 1] = hi; out.im[s + 1] = 0; out.mult[s + 1] = hi === double ? 2 : 1;
        out.count[i] = 2;
      }
    } else {
      // One real root, stable Cardano branch (no cancellation in w).
      const sqrtD = Math.sqrt(q * q / 4 + p * p * p / 27);
      const w = q >= 0 ? -q / 2 - sqrtD : -q / 2 + sqrtD;
      const u = Math.cbrt(w);
      const t0 = u === 0 ? 0 : u - p / (3 * u);
      const r = polish(coeffs, o, shift + t0);
      // Deflate: quotient a·x² + q1·x + q0 with disc₂ < 0 by construction.
      const q1 = b + a * r;
      const q0 = c + q1 * r;
      const disc2 = q1 * q1 - 4 * a * q0;
      const re = -q1 / (2 * a) + 0;
      const im = Math.sqrt(Math.max(0, -disc2)) / (2 * Math.abs(a));
      out.re[s] = r; out.im[s] = 0; out.mult[s] = 1;
      out.re[s + 1] = re; out.im[s + 1] = im; out.mult[s + 1] = 1;
      out.re[s + 2] = re; out.im[s + 2] = -im; out.mult[s + 2] = 1;
      out.count[i] = 3;
    }
  }
}
