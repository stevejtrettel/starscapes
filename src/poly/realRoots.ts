/**
 * Real roots of a real polynomial in an interval.
 *
 * Between consecutive critical points a polynomial is monotone, so the
 * roots of f in [lo, hi] are found by recursion on the degree: locate the
 * roots of f′, then bracket one root in each monotone piece on which f
 * changes sign. Each bracket is refined by Newton's method safeguarded by
 * bisection, which cannot leave the bracket and converges quadratically.
 *
 * Roots of even multiplicity (f touches zero without changing sign) are
 * in general not reported. That is the right behaviour for the one consumer, the
 * tail scan (fibre/tailScan.ts), where such a root is a curve tangent to
 * the window's edge rather than crossing it.
 */
import { degree, evalReal, type Poly } from "./poly.ts";

/** Sign-changing real roots of f in [lo, hi], ascending. */
export function realRoots(f: Poly, lo: number, hi: number): number[] {
  const n = degree(f);
  if (n <= 0 || !(lo <= hi)) return [];
  if (n === 1) {
    const r = -f[0] / f[1];
    return r >= lo && r <= hi ? [r] : [];
  }

  let critical: number[];
  if (n === 2) {
    const v = -f[1] / (2 * f[2]);
    critical = v > lo && v < hi ? [v] : [];
  } else {
    const df: number[] = [];
    for (let k = 1; k <= n; k++) df.push(k * f[k]);
    critical = realRoots(df, lo, hi);
  }

  const roots: number[] = [];
  let u = lo;
  let fu = evalReal(f, lo);
  for (let i = 0; i <= critical.length; i++) {
    const v = i < critical.length ? critical[i] : hi;
    const fv = evalReal(f, v);
    if (fu === 0) roots.push(u);
    else if (fu * fv < 0) roots.push(refine(f, n, u, v, fu));
    u = v;
    fu = fv;
  }
  if (fu === 0 && hi > lo) roots.push(hi);
  return roots;
}

/** The root of f in (a, b), given f monotone there with f(a)·f(b) < 0. */
function refine(f: Poly, n: number, a: number, b: number, fa: number): number {
  let x = 0.5 * (a + b);
  for (let iter = 0; iter < 200; iter++) {
    const fx = evalReal(f, x);
    if (fx === 0) return x;
    if (fa * fx < 0) b = x;
    else {
      a = x;
      fa = fx;
    }
    let dfx = 0;
    for (let k = n; k >= 1; k--) dfx = dfx * x + k * f[k];
    let next = x - fx / dfx;
    if (!(next > a && next < b)) next = 0.5 * (a + b); // Newton left the bracket
    if (Math.abs(next - x) <= 1e-15 * (1 + Math.abs(x))) return next;
    x = next;
  }
  return x;
}
