/**
 * The box catalogue: all stars (f, z) with deg f = d and height ≤ H, i.e.
 *
 *     1 ≤ a_d ≤ H   (or a_d = 1, monic),      |a_k| ≤ H for k < d.
 *
 * This is the classical truncation ("all polynomials with coefficients in
 * a box"), in any degree. It is enumerated through the fibre coordinates
 * rather than by solving every polynomial in the box: for each head
 * (a₂, …, a_d) and each a₁, the tail scan lists exactly the a₀ for which
 * the polynomial has a root in the window, and only those are solved.
 *
 * A head is skipped without any scan when the window is too small for it
 * to reach an integer tail. By the root-density proposition
 * (fibre/tail.ts), along any path in W
 *
 *     |da₁| ≤ |f′(z)|·|dz| / y,
 *
 * so a₁ varies over W by at most L·diam(W)/y₀ around its value at the
 * centre, where L bounds |f′| on W. For a wide window this prunes nothing
 * and the method is ordinary box enumeration; for a small one almost every
 * head is rejected at the cost of one evaluation, which is what makes deep
 * zooms of high-degree boxes affordable.
 */
import { closeTail } from "../fibre/tail.ts";
import { tailScan } from "../fibre/tailScan.ts";
import { contains, type Window } from "../fibre/window.ts";
import { discriminantExact } from "../poly/discriminant.ts";
import { evalJet } from "../poly/poly.ts";
import { solve } from "../roots/solve.ts";
import type { Catalogue, Star } from "./star.ts";

/** Below this |f′(z)| the polynomial is tested exactly for a repeated root. */
const SUSPICIOUS_SLOPE = 1e-3;
/** A computed root this close to the real axis (relative to its size) is real. */
const REAL_TOLERANCE = 1e-9;

export function box(degree: number, H: number, options: { monic?: boolean } = {}): Catalogue {
  if (!Number.isInteger(degree) || degree < 2) throw new Error("box: degree must be an integer ≥ 2");
  if (!Number.isInteger(H) || H < 1) throw new Error("box: height must be a positive integer");
  const d = degree;

  return (W: Window, visit): void => {
    if (W.y1 <= 0) return;
    const f = new Float64Array(d + 1);
    const pencil = new Array<number>(d + 1).fill(0);
    const probe = new Float64Array(d + 1);
    const re = new Float64Array(d);
    const im = new Float64Array(d);
    const jet = new Float64Array(4);
    const star: Star = { f, s: 0, y: 0, slope: 0 };

    const centreS = (W.s0 + W.s1) / 2;
    const centreY = (W.y0 + W.y1) / 2;
    const radius = Math.hypot(W.s1 - W.s0, W.y1 - W.y0) / 2;
    const R = Math.hypot(Math.max(Math.abs(W.s0), Math.abs(W.s1)), W.y1);

    // Odometer over the head (a₂, …, a_d): a₂ fastest.
    const lo = (k: number): number => (k === d ? 1 : -H);
    const hi = (k: number): number => (k === d ? (options.monic ? 1 : H) : H);
    for (let k = 2; k <= d; k++) f[k] = lo(k);

    for (;;) {
      // Range of a₁ over the window for this head.
      let a1Lo = -H;
      let a1Hi = H;
      if (W.y0 > 0) {
        // |f′(z)| ≤ Σ_{k≥2} k|a_k|R^(k−1) + |a₁(z)|, and |a₁(z)| obeys the same bound.
        let L = 0;
        for (let k = d; k >= 2; k--) L = L * R + k * Math.abs(f[k]);
        L *= 2 * R;
        for (let k = 2; k <= d; k++) probe[k] = f[k];
        closeTail(probe, centreS, centreY);
        const spread = (L * radius) / W.y0;
        a1Lo = Math.max(a1Lo, Math.ceil(probe[1] - spread));
        a1Hi = Math.min(a1Hi, Math.floor(probe[1] + spread));
      }

      for (let k = 2; k <= d; k++) pencil[k] = f[k];
      for (let a1 = a1Lo; a1 <= a1Hi; a1++) {
        pencil[1] = f[1] = a1;
        tailScan(pencil, W, (a0) => {
          if (a0 < -H || a0 > H) return;
          f[0] = a0;
          solve(f, re, im);
          for (let i = 0; i < d; i++) {
            const s = re[i];
            const y = im[i];
            if (y <= REAL_TOLERANCE * (1 + Math.abs(s)) || !contains(W, s, y)) continue;
            evalJet(f, s, y, jet);
            const slope = Math.hypot(jet[2], jet[3]);
            // A repeated root is not a star, but in floating point its
            // slope is merely tiny; decide exactly when it is suspicious.
            if (slope < SUSPICIOUS_SLOPE && discriminantExact(f) === 0n) continue;
            star.s = s;
            star.y = y;
            star.slope = slope;
            visit(star);
          }
        });
      }

      // Advance the odometer.
      let k = 2;
      while (k <= d && f[k] === hi(k)) f[k] = lo(k++);
      if (k > d) break;
      f[k]++;
    }
  };
}
