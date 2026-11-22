/**
 * Rational factors of degree 1 and 2 of integer polynomials, from
 * approximate roots: the approximation nominates candidates, and each
 * candidate is tested exactly.
 *
 * DEGREE 1. A rational root of f = Σ a_k xᵏ is p/q in lowest terms with
 * q | a_d. So a real root r known to within 1/(2q) nominates one
 * candidate p = round(q·r) per divisor q of a_d, and
 *
 *     qᵈ·f(p/q) = Σ a_k pᵏ q^(d−k)   is an integer, zero iff p/q is a root.
 *
 * DEGREE 2. A complex root z = s + iy of f is a quadratic irrationality
 * iff x² − 2sx + |z|² is rational, and then by Gauss's lemma f = g·h in
 * ℤ[x] with g = α(x² − 2sx + |z|²) primitive, α | a_d. So each divisor α
 * of a_d nominates one g, and f is divided by it in integers.
 *
 * Together these decide irreducibility over ℚ up to degree 4: a cubic is
 * reducible iff it has a rational root; a quartic iff it has a rational
 * root or a rational quadratic factor, and a real quadratic factor
 * vanishing at z is α(x − z)(x − z̄).
 *
 * In float64 the tests are exact while the terms stay below 2⁵³; a
 * nonzero integer has absolute value ≥ 1, so |value| < 1/2 means zero.
 */
import { solve } from "../roots/solve.ts";
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

/** Whether the root s + iy (y > 0, approximate) of f (exact) is a quadratic irrationality. */
export function hasQuadraticFactor(f: Poly, s: number, y: number): boolean {
  return dividedBy(f, 2 * s, s * s + y * y);
}

/**
 * Whether f is divisible by α(x² − σx + π) in ℤ[x] for some α | a_d, where
 * σ and π approximate the sum and product of two of its roots.
 */
function dividedBy(f: Poly, sigma: number, pi: number): boolean {
  const d = f.length - 1;
  const lead = Math.abs(f[d]);
  const rest = new Float64Array(d + 1);
  candidates: for (let alpha = 1; alpha <= lead; alpha++) {
    if (lead % alpha !== 0) continue;
    const beta = Math.round(-sigma * alpha);
    const gamma = Math.round(pi * alpha);
    // Divide f by αx² + βx + γ, from the top; every quotient coefficient must be an integer.
    for (let k = 0; k <= d; k++) rest[k] = f[k];
    for (let k = d; k >= 2; k--) {
      if (rest[k] % alpha !== 0) continue candidates;
      const q = rest[k] / alpha;
      rest[k - 1] -= q * beta;
      rest[k - 2] -= q * gamma;
    }
    if (rest[1] === 0 && rest[0] === 0) return true;
  }
  return false;
}

/**
 * Whether f, of degree 2 to 5 with the root s + iy (y > 0), is irreducible
 * over ℚ. (Up to degree 5 a reducible polynomial has a factor of degree 1
 * or 2; up to degree 4 the root s + iy says where to look for one, and in
 * degree 5 all the roots are found.)
 */
export function isIrreducible(f: Poly, s: number, y: number): boolean {
  const d = f.length - 1;
  if (d === 2) return true; // a quadratic with a complex root
  if (d === 3) return !hasRationalRoot(f, -f[2] / f[3] - 2 * s); // the roots sum to −a₂/a₃
  if (d === 5) return quinticIsIrreducible(f);
  if (d !== 4) throw new Error("irreducibility is decided only up to degree 5");
  if (hasQuadraticFactor(f, s, y)) return false;
  // The other two roots: those of f/(x² − 2sx + |z|²) = q₂x² + q₁x + q₀.
  const q2 = f[4];
  const q1 = f[3] + 2 * s * q2;
  const q0 = f[2] + 2 * s * q1 - (s * s + y * y) * q2;
  // If they are not real the candidates below are not roots, and fail the exact test.
  const root = Math.sqrt(Math.max(0, q1 * q1 - 4 * q2 * q0));
  return !hasRationalRoot(f, (-q1 - root) / (2 * q2)) && !hasRationalRoot(f, (-q1 + root) / (2 * q2));
}

const quinticRe = new Float64Array(5);
const quinticIm = new Float64Array(5);

/**
 * A quintic is reducible iff it has a rational root or a quadratic factor;
 * the factor's roots are a conjugate pair or two real roots of f.
 */
function quinticIsIrreducible(f: Poly): boolean {
  solve(f, quinticRe, quinticIm);
  const real: number[] = [];
  for (let i = 0; i < 5; i++) {
    const [x, y] = [quinticRe[i], quinticIm[i]];
    if (Math.abs(y) <= 1e-7 * (1 + Math.abs(x))) {
      if (hasRationalRoot(f, x)) return false;
      real.push(x);
    } else if (y > 0 && dividedBy(f, 2 * x, x * x + y * y)) return false;
  }
  for (let i = 0; i < real.length; i++) {
    for (let j = i + 1; j < real.length; j++) if (dividedBy(f, real[i] + real[j], real[i] * real[j])) return false;
  }
  return true;
}

/** Irreducibility over ℚ of a quadratic: its discriminant is not a square. */
export function quadraticIsIrreducible(f: Poly): boolean {
  const disc = f[1] * f[1] - 4 * f[2] * f[0];
  if (disc < 0) return true;
  const root = Math.round(Math.sqrt(disc));
  return root * root !== disc;
}
