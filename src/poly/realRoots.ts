/**
 * Real roots of a real polynomial in an interval.
 *
 * Between consecutive critical points a polynomial is monotone, so the
 * roots of f in [lo, hi] are found by recursion on the degree: locate the
 * roots of f′, then bracket one root in each monotone piece on which f
 * changes sign. Each bracket is refined by Newton's method safeguarded by
 * bisection, which cannot leave the bracket and converges quadratically.
 *
 * A root of even multiplicity is a critical point at which f vanishes
 * without changing sign. In floating point "vanishes" can only mean "is
 * zero to rounding", so these are reported separately, as TOUCHES: the
 * critical points where |f| is below a relative tolerance and f does not
 * change sign on either side. (Where it does change sign, however
 * slightly, there are two honest roots and they are found as such.)
 */
import { degree, evalReal, type Poly } from "./poly.ts";

/** |f(v)| ≤ TOUCH·Σ|f_k|·Rᵏ at a critical point v, R the interval's reach, counts as f(v) = 0. */
const TOUCH = 1e-9;

/**
 * The sign-changing real roots of f in [lo, hi], ascending. If `touches`
 * is given, the points of (lo, hi) where f touches zero are appended to it.
 */
export function realRoots(f: Poly, lo: number, hi: number, touches?: number[]): number[] {
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
    critical = realRoots(df, lo, hi).filter((v) => v > lo && v < hi);
  }

  // The size of f on the interval, against which "zero" is judged. (Not
  // its size at the point in question: at a double root at 0 every term
  // vanishes together, and a relative test there can never succeed.)
  const reach = Math.max(Math.abs(lo), Math.abs(hi));
  let size = 0;
  for (let k = n; k >= 0; k--) size = size * reach + Math.abs(f[k]);

  const points = [lo, ...critical, hi];
  const values = points.map((x) => evalReal(f, x));
  const last = points.length - 1;
  const roots: number[] = [];
  if (values[0] === 0) roots.push(lo);
  for (let i = 0; i < last; i++) {
    if (values[i] * values[i + 1] < 0) roots.push(refine(f, n, points[i], points[i + 1], values[i]));
    if (i + 1 === last) break;
    // The critical point between this piece and the next.
    const [before, at, after] = [values[i], values[i + 1], values[i + 2]];
    if (at === 0) {
      if (before * after < 0) roots.push(points[i + 1]); // odd multiplicity ≥ 3
      else touches?.push(points[i + 1]);
    } else if (touches && before * at >= 0 && at * after >= 0) {
      if (Math.abs(at) <= TOUCH * size) touches.push(points[i + 1]);
    }
  }
  if (values[last] === 0 && hi > lo) roots.push(hi);
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
