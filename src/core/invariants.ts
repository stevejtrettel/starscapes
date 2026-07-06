/**
 * Invariants: pure functions of a polynomial, computed once per polynomial
 * and visible to style and filter functions. Exact while inputs are exact
 * integers with intermediates below 2⁵³ (see conventions.md).
 */
import type { RootSlots } from "./solve/types.ts";

/** Discriminant, degrees 2 and 3 (higher degrees arrive with their solver). */
export function discriminant(coeffs: Float64Array, off: number, degree: number): number {
  if (degree === 2) {
    const c = coeffs[off];
    const b = coeffs[off + 1];
    const a = coeffs[off + 2];
    return b * b - 4 * a * c;
  }
  if (degree === 3) {
    const d = coeffs[off];
    const c = coeffs[off + 1];
    const b = coeffs[off + 2];
    const a = coeffs[off + 3];
    return (
      18 * a * b * c * d - 4 * b * b * b * d + b * b * c * c
      - 4 * a * c * c * c - 27 * a * a * d * d
    );
  }
  throw new Error(`discriminant: unsupported degree ${degree}`);
}

/** Naive height: max |coefficient|. */
export function height(coeffs: Float64Array, off: number, len: number): number {
  let h = 0;
  for (let k = 0; k < len; k++) {
    const a = Math.abs(coeffs[off + k]);
    if (a > h) h = a;
  }
  return h;
}

/**
 * Quadratic irreducibility over ℚ: reducible ⟺ the discriminant is a
 * perfect square ≥ 0 (exact: disc is an exact integer and √ of a perfect
 * square < 2⁵² is exact in float64).
 */
export function quadraticIrreducible(disc: number): boolean {
  if (disc < 0) return true;
  const s = Math.round(Math.sqrt(disc));
  return s * s !== disc;
}

/**
 * |f′(z)| at the k-th root of the i-th polynomial in a RootSlots, from the
 * factorization: f = a_d·∏(x − w_j)^{m_j} gives, at a SIMPLE root z,
 * f′(z) = a_d·∏_{w_j ≠ z}(z − w_j)^{m_j}; at a multiple root f′(z) = 0
 * exactly. Degree-generic — this is the power-law sizing coordinate
 * (sizing.ts), needing no per-family formula. For the quadratic complex
 * pair it equals √|disc| and for the monic-cubic pair √(2y·√|disc|), up to
 * the roots' own float error (~1 ulp relative).
 */
export function fprimeAt(
  slots: RootSlots,
  degree: number, i: number, k: number, leadAbs: number,
): number {
  const base = i * degree;
  if (slots.mult[base + k] > 1) return 0;
  const zr = slots.re[base + k];
  const zi = slots.im[base + k];
  let prod = leadAbs;
  for (let j = 0; j < slots.count[i]; j++) {
    if (j === k) continue;
    const dr = zr - slots.re[base + j];
    const di = zi - slots.im[base + j];
    const d2 = dr * dr + di * di;
    const m = slots.mult[base + j];
    prod *= m === 1 ? Math.sqrt(d2) : m === 2 ? d2 : d2 ** (m / 2);
  }
  return prod;
}

/**
 * Cubic irreducibility over ℚ. A cubic is reducible iff it has a rational
 * root (any factorization contains a linear factor), and by the rational
 * root theorem that root is p/q with q | a. We already solve every
 * polynomial, so each real root r nominates its own candidates: for each
 * divisor q of a, p = round(q·r), verified by EXACT homogeneous evaluation
 * a·p³ + b·p²q + c·pq² + d·q³ (an integer; |value| < 0.5 ⟺ zero).
 * This is the shaders.tex in-march check, CPU-side. Exact-safe while
 * max|coef|·(q·|r|+1)³ < 2⁵³ — comfortable for every box we enumerate;
 * see conventions.md on exactness ranges.
 */
export function cubicIrreducible(
  coeffs: Float64Array, off: number,
  realRoots: ArrayLike<number>, realRootCount: number,
): boolean {
  const d = coeffs[off];
  const c = coeffs[off + 1];
  const b = coeffs[off + 2];
  const a = coeffs[off + 3];
  const absA = Math.abs(a);
  for (let k = 0; k < realRootCount; k++) {
    const r = realRoots[k];
    for (let q = 1; q <= absA; q++) {
      if (absA % q !== 0) continue;
      const p = Math.round(q * r);
      const val = a * p * p * p + b * p * p * q + c * p * q * q + d * q * q * q;
      if (Math.abs(val) < 0.5) return false; // rational root ⇒ reducible
    }
  }
  return true;
}
