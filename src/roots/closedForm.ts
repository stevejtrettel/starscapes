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

/**
 * Roots of ax⁴ + bx³ + cx² + dx + e, a ≠ 0, by Ferrari's method. With
 * x = t − b/4a the quartic becomes t⁴ + pt² + qt + r, and for any root
 * m > 0 of the resolvent cubic 8m³ + 8pm² + (2p² − 8r)m − q² it splits
 * into two real quadratics,
 *
 *     (t² + σt + p/2 + m − q/2σ)·(t² − σt + p/2 + m + q/2σ),      σ = √(2m).
 *
 * (For q = 0 it is a quadratic in t².) The closed form loses accuracy
 * when roots are close, and all of it when the two quadratics nearly
 * share a centre (m is then a tiny root of the cubic, known only to an
 * absolute error). So each root is polished by Newton's method on the
 * original polynomial, and the result is accepted only if it satisfies
 * Vieta's relations for the sum and the product of the roots — which
 * fail if two approximations have run to the same root. Returns false in
 * that case, leaving the caller to use a general method.
 *
 * Order: as the two quadratics come; a conjugate pair is adjacent,
 * upper-half-plane member first.
 */
export function solveQuartic(f: Poly, re: Float64Array, im: Float64Array): boolean {
  const [e, d, c, b, a] = [f[0], f[1], f[2], f[3], f[4]];
  const shift = -b / (4 * a);
  const [B, C, D, E] = [b / a, c / a, d / a, e / a];
  const p = C - (3 * B * B) / 8;
  const q = D - (B * C) / 2 + (B * B * B) / 8;
  const r = E - (B * D) / 4 + (B * B * C) / 16 - (3 * B ** 4) / 256;

  /** The roots of t² + ut + v, written at index k and k + 1. */
  const quadratic = (u: number, v: number, k: number): void => {
    const disc = u * u - 4 * v;
    if (disc >= 0) {
      const w = -0.5 * (u + (u >= 0 ? Math.sqrt(disc) : -Math.sqrt(disc)));
      re[k] = w;
      re[k + 1] = w === 0 ? 0 : v / w;
      im[k] = im[k + 1] = 0;
    } else {
      re[k] = re[k + 1] = -u / 2;
      im[k] = Math.sqrt(-disc) / 2;
      im[k + 1] = -im[k];
    }
  };

  const scale = Math.abs(p) + Math.sqrt(Math.abs(r)) + Math.cbrt(q * q);
  if (Math.abs(q) <= 1e-7 * scale ** 1.5) {
    // Biquadratic: t² is a root of w² + pw + r.
    const disc = p * p - 4 * r;
    if (disc >= 0) {
      const w1 = (-p + Math.sqrt(disc)) / 2;
      const w2 = (-p - Math.sqrt(disc)) / 2;
      quadratic(0, -w1, 0);
      quadratic(0, -w2, 2);
    } else {
      // t² = (−p ± i√(−disc))/2: t = ±(x + iy) with x² − y² = −p/2, 2xy = √(−disc)/2.
      const modulus = Math.sqrt(r); // |t|² = √r
      const x = Math.sqrt(Math.max(0, (modulus - p / 2) / 2));
      const y = Math.sqrt(Math.max(0, (modulus + p / 2) / 2));
      re[0] = re[1] = x;
      re[2] = re[3] = -x;
      im[0] = im[2] = y;
      im[1] = im[3] = -y;
    }
  } else {
    const resolvent = [-q * q, 2 * p * p - 8 * r, 8 * p, 8];
    const [mr, mi] = [new Float64Array(3), new Float64Array(3)];
    solveCubic(resolvent, mr, mi);
    let m = 0;
    for (let k = 0; k < 3; k++) if (mi[k] === 0 && mr[k] > m) m = mr[k];
    const sigma = Math.sqrt(2 * m);
    quadratic(sigma, p / 2 + m - q / (2 * sigma), 0);
    quadratic(-sigma, p / 2 + m + q / (2 * sigma), 2);
  }

  // Undo the shift and polish. A real root is polished along the real line
  // and a conjugate pair together, so the pairing survives.
  for (let k = 0; k < 4; k++) {
    let [x, y] = [re[k] + shift, im[k]];
    if (y < 0) {
      re[k] = re[k - 1]; // the conjugate of the root just polished
      im[k] = -im[k - 1];
      continue;
    }
    for (let iter = 0; iter < 3; iter++) {
      // f(z) and f′(z) by Horner.
      let [pr, pi, dr, di] = [0, 0, 0, 0];
      for (let j = 4; j >= 0; j--) {
        const tr = dr * x - di * y + pr;
        di = dr * y + di * x + pi;
        dr = tr;
        const ur = pr * x - pi * y + f[j];
        pi = pr * y + pi * x;
        pr = ur;
      }
      const dm = dr * dr + di * di;
      if (dm === 0) break;
      x -= (pr * dr + pi * di) / dm;
      if (y !== 0) y -= (pi * dr - pr * di) / dm;
    }
    re[k] = x + 0;
    im[k] = y;
  }

  // Vieta: Σ roots = −b/a and ∏ |roots| = |e/a|.
  const sum = re[0] + re[1] + re[2] + re[3];
  let product = 1;
  for (let k = 0; k < 4; k++) product *= Math.hypot(re[k], im[k]);
  const size = Math.abs(B) + Math.abs(re[0]) + Math.abs(re[1]) + Math.abs(re[2]) + Math.abs(re[3]);
  return Math.abs(sum + B) <= 1e-9 * (1 + size) && Math.abs(product - Math.abs(E)) <= 1e-8 * (1 + Math.abs(E));
}
