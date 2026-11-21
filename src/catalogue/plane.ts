/**
 * Planar catalogues: the stars of an integer plane of polynomials
 *
 *     f = a·P + b·Q + c·R,      aLo ≤ a ≤ aHi,   |b|, |c| ≤ H,
 *
 * for fixed integer polynomials P, Q, R with deg P = d > deg Q, deg R.
 * These are the "planar starscapes" of Harriss–Stange–Trettel: the
 * quadratics (P, Q, R) = (x², x, 1) are one; others are the depressed
 * cubics x³ + bx + c, the family ax³ + cx² + bx + c of their Figure 1b,
 * reciprocal quartics a(x⁴ + 1) + b(x³ + x) + cx², and trinomials.
 *
 * Wherever Q(z) and R(z) are independent over ℝ, the root z determines
 * (b, c) from a — a planar family is a 2-parameter family of roots for
 * each a, just as the quadratics are. The enumeration is the same too:
 * for each (a, b), the pencil scan lists the c with a root in the window.
 */
import { pencilScan } from "../fibre/pencilScan.ts";
import { contains, type Window } from "../fibre/window.ts";
import { discriminantExact } from "../poly/discriminant.ts";
import { evalJet, type Poly } from "../poly/poly.ts";
import { solve } from "../roots/solve.ts";
import type { Catalogue, Star } from "./star.ts";

const SUSPICIOUS_SLOPE = 1e-3;
const REAL_TOLERANCE = 1e-9;

export interface Plane {
  /** [P, Q, R], coefficients ascending. */
  readonly basis: readonly [Poly, Poly, Poly];
  /** Range of a (≥ 1). Use [1, 1] for a family with fixed leading term. */
  readonly a: readonly [number, number];
  /** |b|, |c| ≤ H. */
  readonly H: number;
}

export function plane({ basis: [P, Q, R], a: [aLo, aHi], H }: Plane): Catalogue {
  const d = P.length - 1;
  if (Q.length > d || R.length > d) throw new Error("plane: P must have the highest degree");
  if (aLo < 1) throw new Error("plane: a must be positive");
  const coefficient = (f: Poly, k: number): number => (k < f.length ? f[k] : 0);

  // The non-real roots of R, to count those inside a window.
  const rootsOfR: Array<[number, number]> = [];
  if (R.length > 1) {
    const re = new Float64Array(R.length - 1);
    const im = new Float64Array(R.length - 1);
    solve(R, re, im);
    for (let i = 0; i < re.length; i++) if (im[i] > 0) rootsOfR.push([re[i], im[i]]);
  }

  return (W: Window, visit): void => {
    if (W.y0 <= 0) throw new Error("plane: the window must lie strictly above the real axis");
    const base = rootsOfR.filter(([s, y]) => contains(W, s, y)).length;
    const f = new Float64Array(d + 1);
    const pencil = new Array<number>(d + 1).fill(0);
    const re = new Float64Array(d);
    const im = new Float64Array(d);
    const jet = new Float64Array(4);
    const star: Star = { f, s: 0, y: 0, slope: 0 };

    for (let a = aLo; a <= aHi; a++) {
      for (let b = -H; b <= H; b++) {
        for (let k = 0; k <= d; k++) pencil[k] = a * P[k] + b * coefficient(Q, k);
        pencilScan(pencil, R, W, base, -H, H, (c) => {
          for (let k = 0; k <= d; k++) f[k] = pencil[k] + c * coefficient(R, k);
          solve(f, re, im);
          for (let i = 0; i < d; i++) {
            const s = re[i];
            const y = im[i];
            if (y <= REAL_TOLERANCE * (1 + Math.abs(s)) || !contains(W, s, y)) continue;
            evalJet(f, s, y, jet);
            const slope = Math.hypot(jet[2], jet[3]);
            if (slope < SUSPICIOUS_SLOPE && discriminantExact(f) === 0n) continue;
            star.s = s;
            star.y = y;
            star.slope = slope;
            visit(star);
          }
        });
      }
    }
  };
}
