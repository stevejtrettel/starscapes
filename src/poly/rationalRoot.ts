/**
 * Rational roots of integer polynomials.
 *
 * A cubic over ℚ is reducible iff it has a rational root, and a rational
 * root of f = Σ a_k xᵏ is p/q in lowest terms with q | a_d. So a real
 * root r known to within 1/(2q) nominates one candidate p = round(q·r)
 * per divisor q of a_d, and the candidate is tested exactly:
 *
 *     qᵈ·f(p/q) = Σ a_k pᵏ q^(d−k)   is an integer, zero iff p/q is a root.
 *
 * In float64 the test is exact while the terms stay below 2⁵³; a nonzero
 * integer has absolute value ≥ 1, so |value| < 1/2 means zero.
 */
import type { Poly } from "./poly.ts";

/** Whether the real root r of f is rational (r approximate, f exact). */
export function hasRationalRoot(f: Poly, r: number): boolean {
  const d = f.length - 1;
  const lead = Math.abs(f[d]);
  for (let q = 1; q <= lead; q++) {
    if (lead % q !== 0) continue;
    const p = Math.round(q * r);
    // Horner in p with the powers of q folded in: Σ a_k pᵏ q^(d−k).
    let value = 0;
    let qPower = 1;
    for (let k = d; k >= 0; k--) {
      value = value * p + f[k] * qPower;
      qPower *= q;
    }
    if (Math.abs(value) < 0.5) return true;
  }
  return false;
}

/** Irreducibility over ℚ of a quadratic: its discriminant is not a square. */
export function quadraticIsIrreducible(f: Poly): boolean {
  const disc = f[1] * f[1] - 4 * f[2] * f[0];
  if (disc < 0) return true;
  const root = Math.round(Math.sqrt(disc));
  return root * root !== disc;
}
