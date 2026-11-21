/**
 * PSL₂(ℤ) acting on the upper half plane.
 *
 * A matrix γ = (a b; c d) of determinant 1 acts by z ↦ (az + b)/(cz + d);
 * γ and −γ act alike. The standard fundamental domain is
 *
 *     𝔉 = { |s| ≤ 1/2, |z| ≥ 1 },
 *
 * and its images γ𝔉 — the tiles — cover ℍ, overlapping only along edges.
 * The tiles adjacent to γ𝔉 are γT𝔉, γT⁻¹𝔉 and γS𝔉, with T: z ↦ z + 1 and
 * S: z ↦ −1/z.
 */
import type { Window } from "../fibre/window.ts";

/** (a b; c d), entries integers, ad − bc = 1; γ and −γ are the same element. */
export type Matrix = readonly [a: number, b: number, c: number, d: number];

export const IDENTITY: Matrix = [1, 0, 0, 1];
export const T: Matrix = [1, 1, 0, 1];
export const T_INVERSE: Matrix = [1, -1, 0, 1];
export const S: Matrix = [0, -1, 1, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  ];
}

export function inverse(m: Matrix): Matrix {
  return [m[3], -m[1], -m[2], m[0]];
}

/** The representative of ±γ with c > 0, or c = 0 and d > 0. */
export function normalise(m: Matrix): Matrix {
  return m[2] < 0 || (m[2] === 0 && m[3] < 0) ? [-m[0], -m[1], -m[2], -m[3]] : m;
}

/** A total order on PSL₂(ℤ), by the normalised entries (c, d, a, b). */
export function compare(m: Matrix, n: Matrix): number {
  const [p, q] = [normalise(m), normalise(n)];
  return p[2] - q[2] || p[3] - q[3] || p[0] - q[0] || p[1] - q[1];
}

/** γ(s + iy), written to out[0], out[1]. */
export function act(m: Matrix, s: number, y: number, out: Float64Array | number[]): void {
  const [a, b, c, d] = m;
  const denominator = (c * s + d) ** 2 + (c * y) ** 2;
  out[0] = ((a * s + b) * (c * s + d) + a * c * y * y) / denominator;
  out[1] = y / denominator;
}

/**
 * The smallest window containing γ(W), exactly. Requires W.y0 > 0.
 *
 * For c ≠ 0, γz = a/c − (1/c²)·1/(z + d/c): a translation, the inversion
 * u ↦ −1/u, a scaling and a translation. The inversion sends x + iv to
 * (−x + iv)/(x² + v²), whose two coordinates have no critical point inside
 * a rectangle, so their extremes are on its edges and can be listed.
 */
export function imageBox(m: Matrix, W: Window): Window {
  const [a, , c, d] = m;
  if (c === 0) {
    const shift = m[1] / d; // d = ±1
    return { s0: W.s0 + shift, s1: W.s1 + shift, y0: W.y0, y1: W.y1 };
  }
  const [u0, u1, v0, v1] = [W.s0 + d / c, W.s1 + d / c, W.y0, W.y1];
  const re = (x: number, v: number): number => -x / (x * x + v * v);
  const im = (x: number, v: number): number => v / (x * x + v * v);

  // Im is largest where |x| is least; in v it peaks at v = |x|.
  const nearest = Math.min(Math.max(0, u0), u1);
  const farthest = Math.abs(u0) > Math.abs(u1) ? u0 : u1;
  const imMax = im(nearest, Math.min(Math.max(Math.abs(nearest), v0), v1));
  const imMin = Math.min(im(farthest, v0), im(farthest, v1));

  // Re: at the corners, or on a horizontal edge at x = ∓v where it is ±1/(2v).
  let reMax = Math.max(re(u0, v0), re(u0, v1), re(u1, v0), re(u1, v1));
  let reMin = Math.min(re(u0, v0), re(u0, v1), re(u1, v0), re(u1, v1));
  for (const v of [v0, v1]) {
    if (-v >= u0 && -v <= u1) reMax = Math.max(reMax, 1 / (2 * v));
    if (v >= u0 && v <= u1) reMin = Math.min(reMin, -1 / (2 * v));
  }
  const scale = 1 / (c * c);
  return { s0: a / c + scale * reMin, s1: a / c + scale * reMax, y0: scale * imMin, y1: scale * imMax };
}

/**
 * The reduction algorithm: a γ with γ⁻¹(z) in (the closure of) 𝔉, i.e. the
 * tile γ𝔉 contains z. Translate into |s| ≤ 1/2, invert if |z| < 1, repeat.
 */
export function reduce(s: number, y: number): Matrix {
  let m: Matrix = IDENTITY;
  for (let step = 0; step < 10_000; step++) {
    const n = Math.round(s);
    if (n !== 0) {
      s -= n;
      m = multiply(m, [1, n, 0, 1]);
    }
    const norm = s * s + y * y;
    if (norm >= 1) return normalise(m);
    s = -s / norm;
    y = y / norm;
    m = multiply(m, S);
  }
  throw new Error("reduce: no convergence (is the point on the real axis?)");
}

/**
 * The action on binary forms: out(x) = (cx + d)ⁿ·f((ax + b)/(cx + d)) for
 * a form f of degree n = f.length − 1 (its leading coefficients may
 * vanish: a root at infinity). The roots of out are m⁻¹ of the roots of f.
 * Any integer matrix is allowed, not only determinant 1.
 */
export function substitute(f: ArrayLike<number>, m: Matrix, out: Float64Array | number[]): void {
  const n = f.length - 1;
  const [a, b, c, d] = m;
  for (let i = 0; i <= n; i++) out[i] = 0;
  for (let k = 0; k <= n; k++) {
    if (f[k] === 0) continue;
    // term = (ax + b)ᵏ (cx + d)ⁿ⁻ᵏ, built one linear factor at a time.
    term.fill(0, 0, n + 1);
    term[0] = 1;
    for (let j = 0; j < n; j++) {
      const lead = j < k ? a : c;
      const constant = j < k ? b : d;
      for (let i = j + 1; i >= 1; i--) term[i] = term[i] * constant + term[i - 1] * lead;
      term[0] *= constant;
    }
    for (let i = 0; i <= n; i++) out[i] += f[k] * term[i];
  }
}
const term = new Float64Array(16);
