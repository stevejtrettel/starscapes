/**
 * Roots of real quadratics and cubics in closed form.
 *
 * For integer coefficients in the exact range of poly/discriminant.ts the
 * discriminant is an exact integer, so its sign — which decides how many
 * roots are real — is decided exactly, not numerically.
 *
 * Output convention (all solvers): the d roots with multiplicity, written
 * to re[0..d), im[0..d). Closed forms order them real roots ascending,
 * then the conjugate pair with the upper-half-plane member first. Real
 * roots have im exactly 0, and no −0 is ever written.
 */
import { discriminant } from "../poly/discriminant.ts";
import type { Poly } from "../poly/poly.ts";

/** Roots of ax² + bx + c, a ≠ 0. */
export function solveQuadratic(f: Poly, re: Float64Array, im: Float64Array): void {
  const [c, b, a] = [f[0], f[1], f[2]];
  const disc = b * b - 4 * a * c;
  if (disc >= 0) {
    // q = −(b + sgn(b)√disc)/2 has no cancellation; the roots are q/a and c/q.
    const q = -0.5 * (b + (b >= 0 ? Math.sqrt(disc) : -Math.sqrt(disc)));
    const r1 = q / a + 0;
    const r2 = (q === 0 ? 0 : c / q) + 0;
    re[0] = Math.min(r1, r2);
    re[1] = Math.max(r1, r2);
    im[0] = im[1] = 0;
  } else {
    re[0] = re[1] = -b / (2 * a) + 0;
    im[0] = Math.sqrt(-disc) / (2 * Math.abs(a));
    im[1] = -im[0];
  }
}

/** One Newton correction loop for a real root of the cubic f. */
function polish(f: Poly, x: number): number {
  for (let iter = 0; iter < 4; iter++) {
    const fx = ((f[3] * x + f[2]) * x + f[1]) * x + f[0];
    const dfx = (3 * f[3] * x + 2 * f[2]) * x + f[1];
    if (dfx === 0) break;
    const step = fx / dfx;
    x -= step;
    if (Math.abs(step) <= 1e-15 * (1 + Math.abs(x))) break;
  }
  return x + 0;
}

/**
 * Roots of ax³ + bx² + cx + d, a ≠ 0. With x = t − b/3a the cubic becomes
 * t³ + pt + q, and by the sign of the discriminant:
 *
 *   disc > 0   three real roots, t_k = 2√(−p/3)·cos(θ − 2πk/3);
 *   disc = 0   a repeated root, rational in the coefficients;
 *   disc < 0   one real root by Cardano (the branch without cancellation),
 *              then the conjugate pair from the deflated quadratic.
 */
export function solveCubic(f: Poly, re: Float64Array, im: Float64Array): void {
  const [d, c, b, a] = [f[0], f[1], f[2], f[3]];
  const disc = discriminant(f);
  const shift = -b / (3 * a);
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);

  if (disc > 0) {
    const m = 2 * Math.sqrt(-p / 3);
    const theta = Math.acos(Math.max(-1, Math.min(1, (3 * q) / (p * m)))) / 3;
    const r = [0, 1, 2].map((k) => polish(f, shift + m * Math.cos(theta - (2 * Math.PI * k) / 3)));
    r.sort((x, y) => x - y);
    re.set(r);
    im[0] = im[1] = im[2] = 0;
  } else if (disc === 0) {
    const delta0 = b * b - 3 * a * c;
    if (delta0 === 0) {
      re[0] = re[1] = re[2] = shift + 0; // triple root
    } else {
      const double = (9 * a * d - b * c) / (2 * delta0) + 0;
      const simple = (4 * a * b * c - 9 * a * a * d - b * b * b) / (a * delta0) + 0;
      const r = [double, double, simple].sort((x, y) => x - y);
      re.set(r);
    }
    im[0] = im[1] = im[2] = 0;
  } else {
    const root = Math.sqrt((q * q) / 4 + (p * p * p) / 27);
    const u = Math.cbrt(q >= 0 ? -q / 2 - root : -q / 2 + root);
    const r = polish(f, shift + (u === 0 ? 0 : u - p / (3 * u)));
    // f = (x − r)(ax² + q₁x + q₀)
    const q1 = b + a * r;
    const q0 = c + q1 * r;
    re[0] = r;
    im[0] = 0;
    re[1] = re[2] = -q1 / (2 * a) + 0;
    im[1] = Math.sqrt(Math.max(0, 4 * a * q0 - q1 * q1)) / (2 * Math.abs(a));
    im[2] = -im[1];
  }
}
