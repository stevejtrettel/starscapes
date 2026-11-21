/**
 * The box and ball catalogues: all stars (f, z) with deg f = d and
 *
 *     max |a_k| ≤ H   (box),      or      Σ a_k² ≤ R²   (ball),
 *
 * with a_d ≥ 1, or a_d = 1 for the monic ones. These are the classical
 * truncations ("all polynomials with coefficients in a box or ball"), in
 * any degree. They are enumerated through the window, by one of two
 * methods.
 *
 * BY HEADS. For each head (a₂, …, a_d) and each a₁, the tail scan lists
 * exactly the a₀ for which the polynomial has a root in the window, and
 * only those are solved. A head is skipped without any scan when the
 * window is too small for it to reach an integer tail: by the root-density
 * proposition (fibre/tail.ts), along any path in W
 *
 *     |da₁| ≤ |f′(z)|·|dz| / y,
 *
 * so a₁ varies over W by at most L·diam(W)/y₀ around its value at the
 * centre, where L bounds |f′| on W. For a wide window this prunes nothing
 * and the method is ordinary box enumeration. Its cost is at least one
 * evaluation per head, of which there are H^(d−1).
 *
 * BY LATTICE. The polynomials of the box with a root in a small window are
 * short vectors of a lattice (lattice/nearRoot.ts), found with work
 * proportional to their number and independent of H. Each is then
 * verified: solved, and kept if a root really lies in the window.
 *
 * The first suits wide views and small boxes, the second deep zooms into
 * large ones; `auto` estimates both costs and chooses — and refuses a
 * window neither could finish (a wide view of a large family in high
 * degree holds more stars than can be drawn).
 */
import { closeTail } from "../fibre/tail.ts";
import { tailScan } from "../fibre/tailScan.ts";
import { contains, type Window } from "../fibre/window.ts";
import { polynomialsNear } from "../lattice/nearRoot.ts";
import { discriminantExact } from "../poly/discriminant.ts";
import { evalJet } from "../poly/poly.ts";
import { solve } from "../roots/solve.ts";
import type { Catalogue, Star, Visit } from "./star.ts";

/** Below this |f′(z)| the polynomial is tested exactly for a repeated root. */
const SUSPICIOUS_SLOPE = 1e-3;
/** A computed root this close to the real axis (relative to its size) is real. */
const REAL_TOLERANCE = 1e-9;

export interface BoxOptions {
  readonly monic?: boolean;
  readonly method?: "auto" | "heads" | "lattice";
}

/** More work than this, by either method, and a catalogue refuses the window. */
const TOO_MUCH = 3e8;

/** deg f = d, max |a_k| ≤ H. */
export function box(degree: number, H: number, options: BoxOptions = {}): Catalogue {
  if (!Number.isInteger(H) || H < 1) throw new Error("box: height must be a positive integer");
  return bounded(degree, H, Infinity, H * Math.sqrt(degree + 1), options);
}

/**
 * deg f = d, Σ a_k² ≤ R²: the same catalogue for the Euclidean norm. A
 * ball is what the lattice method searches natively — a box must first be
 * put inside a ball (1/65 of it, in degree 7; 1/490 in degree 10) — so
 * this is the truncation to use for deep zooms in high degree.
 */
export function ball(degree: number, R: number, options: BoxOptions = {}): Catalogue {
  if (!(R >= 1)) throw new Error("ball: radius must be at least 1");
  return bounded(degree, Math.floor(R), R * R, R, options);
}

/** The stars with max |a_k| ≤ H and Σ a_k² ≤ norm2; `radius` is a Euclidean bound for both. */
function bounded(d: number, H: number, norm2: number, radius: number, options: BoxOptions): Catalogue {
  if (!Number.isInteger(d) || d < 2) throw new Error("degree must be an integer ≥ 2");
  const monic = options.monic === true;
  const method = options.method ?? "auto";
  const heads = (monic ? 1 : H) * (2 * H + 1) ** (d - 2);

  /** Whether f lies in the region; normalises its sign to a_d > 0. */
  const admit = (f: Float64Array): boolean => {
    const lead = f[d];
    if (lead === 0 || (monic && Math.abs(lead) !== 1)) return false;
    let sum = 0;
    for (let k = 0; k <= d; k++) {
      if (Math.abs(f[k]) > H) return false;
      sum += f[k] * f[k];
    }
    if (sum > norm2) return false;
    if (lead < 0) for (let k = 0; k <= d; k++) f[k] = -f[k];
    return true;
  };

  return (W: Window, visit): void => {
    if (W.y1 <= 0) return;
    const centre: [number, number] = [(W.s0 + W.s1) / 2, (W.y0 + W.y1) / 2];
    const reach = Math.hypot(W.s1 - W.s0, W.y1 - W.y0) / 2;
    const stars = starsOf(d, W, visit);

    // The lattice needs the window clear of the real axis, and pays only
    // when the window holds fewer polynomials than there are heads: about
    // H^(d+1)·reach² against H^(d−1).
    let latticeWork = Infinity;
    if (method !== "heads" && W.y0 > 0 && (method === "lattice" || reach * H < 0.5)) {
      const search = polynomialsNear(d, radius, centre[0], centre[1], reach);
      latticeWork = search.expected;
      // A lattice point costs about a fifth of what a head does.
      if (method === "lattice" || (latticeWork < 5 * heads && latticeWork < TOO_MUCH)) {
        search.run((f) => {
          if (admit(f)) stars(f);
        });
        return;
      }
    }
    if (heads > TOO_MUCH) {
      throw new Error(
        `this window would take about ${Math.min(heads, latticeWork).toExponential(0)} steps to enumerate; zoom in`,
      );
    }
    byHeads(d, H, monic, W, centre, reach, (f) => {
      if (norm2 === Infinity || admit(f)) stars(f);
    });
  };
}

/** The stars of one polynomial in W: solve, and report each root found there. */
function starsOf(d: number, W: Window, visit: Visit): (f: Float64Array) => void {
  const re = new Float64Array(d);
  const im = new Float64Array(d);
  const jet = new Float64Array(4);
  const star: Star = { f: new Float64Array(d + 1), s: 0, y: 0, slope: 0 };
  return (f) => {
    solve(f, re, im);
    for (let i = 0; i < d; i++) {
      const s = re[i];
      const y = im[i];
      if (y <= REAL_TOLERANCE * (1 + Math.abs(s)) || !contains(W, s, y)) continue;
      evalJet(f, s, y, jet);
      const slope = Math.hypot(jet[2], jet[3]);
      // A repeated root is not a star, but in floating point its slope
      // is merely tiny; decide exactly when it is suspicious.
      if (slope < SUSPICIOUS_SLOPE && discriminantExact(f) === 0n) continue;
      star.f.set(f);
      star.s = s;
      star.y = y;
      star.slope = slope;
      visit(star);
    }
  };
}

function byHeads(
  d: number, H: number, monic: boolean, W: Window,
  centre: readonly [number, number], radius: number, stars: (f: Float64Array) => void,
): void {
  const f = new Float64Array(d + 1);
  const pencil = new Array<number>(d + 1).fill(0);
  const probe = new Float64Array(d + 1);
  const R = Math.hypot(Math.max(Math.abs(W.s0), Math.abs(W.s1)), W.y1);

  // Odometer over the head (a₂, …, a_d): a₂ fastest.
  const lo = (k: number): number => (k === d ? 1 : -H);
  const hi = (k: number): number => (k === d ? (monic ? 1 : H) : H);
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
      closeTail(probe, centre[0], centre[1]);
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
        stars(f);
      });
    }

    // Advance the odometer.
    let k = 2;
    while (k <= d && f[k] === hi(k)) f[k] = lo(k++);
    if (k > d) break;
    f[k]++;
  }
}
