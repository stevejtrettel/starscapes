/**
 * The tail scan: which constant terms put a root in a window?
 *
 * Let p be a real polynomial and W = [s₀, s₁] × [y₀, y₁] a rectangle in
 * the closed upper half plane. Consider the pencil p + t, t ∈ ℝ, and
 *
 *     T(p, W) = { t : p + t has a root in W } = −(p(W) ∩ ℝ).
 *
 * THEOREM. T(p, W) is a finite union of closed intervals. Its endpoints
 * are among the values t = −p(ζ) at the points ζ ∈ ∂W where p(ζ) is real,
 * and the number N(t) of roots of p + t in W changes by exactly ±1 as t
 * passes each such value transversally: a root of p + t moves with
 * velocity dz/dt = −1/p′(z), so it enters W at ζ iff −1/p′(ζ) points
 * inward. N(t) = 0 for |t| large.
 *
 * Proof. Roots move continuously in t and can only enter or leave W
 * through ∂W; z is a root of p + t iff p(z) = −t, which requires p(z)
 * real. ∎
 *
 * The points of ∂W where p is real are roots of four real polynomials in
 * one variable — on a horizontal edge Im p(s + iy)/y as a polynomial in s,
 * on a vertical edge the same as a polynomial in y² — so T(p, W) costs
 * four real-root computations, whatever the degree. Combined with a loop
 * over heads (and over a₁) this enumerates every integer polynomial with
 * a root in W; see catalogue/.
 *
 * The curve {Im p = 0} on which the roots travel is a "starscape curve"
 * in the sense of Harriss–Stange–Trettel §7.2: the image in root space of
 * the rational line {p + t} of coefficient space.
 */
import { evalJet, type Poly, shift } from "../poly/poly.ts";
import { realRoots } from "../poly/realRoots.ts";
import type { Window } from "./window.ts";

/**
 * The crossings of a pencil with ∂W, as parallel arrays:
 * t[i] = −p(ζᵢ) is the parameter at which a root sits on ∂W, and sign[i]
 * is +1 if that root enters W as t increases, −1 if it leaves.
 */
export interface Crossings {
  readonly t: Float64Array;
  readonly sign: Int8Array;
  count: number;
}

export function createCrossings(capacity: number): Crossings {
  return { t: new Float64Array(capacity), sign: new Int8Array(capacity), count: 0 };
}

/** |disc| or |f| below this relative size at an edge counts as a tangency. */
export const TANGENT = 1e-9;

const jet = new Float64Array(4);

/**
 * Relative slack. Edges are searched slightly beyond their ends, and
 * interval endpoints are widened before rounding, so a root within this
 * distance of ∂W may be reported although it lies outside; no root inside
 * is ever lost. (A curve through a corner is then found on both edges;
 * the sweep notices the inconsistent count and falls back to a superset.)
 *
 * It is 10⁻⁶ rather than a few ulps because of tangencies: where a curve
 * touches an edge, a rounding error ε in the edge polynomial moves its
 * double root apart by √ε, opening a spurious gap of that order in T.
 */
export const SLACK = 1e-6;
export const widen = (lo: number, hi: number): [number, number] => [
  lo - SLACK * (1 + Math.abs(lo)),
  hi + SLACK * (1 + Math.abs(hi)),
];

/** Finds the crossings of the pencil p + t with ∂W (any degree). */
export function findCrossings(p: Poly, W: Window, out: Crossings): void {
  const n = p.length - 1;
  out.count = 0;

  /** Record the crossing at ζ = s + iy, where the outward normal is (nx, ny). */
  const cross = (s: number, y: number, nx: number, ny: number): void => {
    evalJet(p, s, y, jet);
    // dz/dt = −1/p′ = −conj(p′)/|p′|²; the root enters iff ⟨dz/dt, normal⟩ < 0.
    const outward = -(jet[2] * nx - jet[3] * ny);
    out.t[out.count] = -jet[0];
    out.sign[out.count++] = outward < 0 ? 1 : -1;
  };
  /**
   * A tangency at ζ: the curve touches ∂W there without crossing, so the
   * root is in W (which is closed) for that one value of t. Recorded as an
   * entry immediately followed by an exit.
   */
  const touch = (s: number, y: number): void => {
    evalJet(p, s, y, jet);
    out.t[out.count] = -jet[0];
    out.sign[out.count++] = 1;
    out.t[out.count] = -jet[0];
    out.sign[out.count++] = -1;
  };
  const touches: number[] = [];

  // Horizontal edges y = y_e. By Taylor expansion in the imaginary direction,
  //   Im p(s + iy)/y = Σ_{j odd} (−1)^((j−1)/2) y^(j−1) p⁽ʲ⁾(s)/j!,
  // and p⁽ʲ⁾/j! has coefficients C(k, j)·p_k on x^(k−j).
  for (const [ye, ny] of [[W.y0, -1], [W.y1, 1]] as const) {
    const edge = new Array<number>(n).fill(0);
    for (let j = 1; j <= n; j += 2) {
      const weight = (((j - 1) / 2) % 2 === 0 ? 1 : -1) * ye ** (j - 1);
      let binom = 1;
      for (let k = j; k <= n; k++) {
        if (k > j) binom = (binom * k) / (k - j);
        edge[k - j] += weight * binom * p[k];
      }
    }
    touches.length = 0;
    for (const s of realRoots(edge, ...widen(W.s0, W.s1), touches)) {
      if (ye > 0) cross(s, ye, 0, ny);
      else {
        // On the real axis the edge polynomial is p′: a conjugate pair is
        // born from a double real root, and rises into W iff p″ > 0 there.
        let second = 0;
        for (let k = n; k >= 2; k--) second = second * s + k * (k - 1) * p[k];
        evalJet(p, s, 0, jet);
        out.t[out.count] = -jet[0];
        out.sign[out.count++] = second > 0 ? 1 : -1;
      }
    }
    if (ye > 0) for (const s of touches) touch(s, ye);
  }

  // Vertical edges s = s_e. With q(x) = p(x + s_e),
  //   Im q(iy)/y = Σ_{m odd} (−1)^((m−1)/2) q_m (y²)^((m−1)/2).
  for (const [se, nx] of [[W.s0, -1], [W.s1, 1]] as const) {
    const q = shift(p, se);
    const edge: number[] = [];
    for (let m = 1; m <= n; m += 2) edge.push((((m - 1) / 2) % 2 === 0 ? 1 : -1) * q[m]);
    touches.length = 0;
    for (const y2 of realRoots(edge, ...widen(W.y0 * W.y0, W.y1 * W.y1), touches)) {
      if (y2 > 0) cross(se, Math.sqrt(y2), nx, 0);
    }
    for (const y2 of touches) if (y2 > 0) touch(se, Math.sqrt(y2));
  }
}

const lower = (t: number): number => Math.ceil(t - SLACK * (1 + Math.abs(t))) + 0; // + 0: no −0
const upper = (t: number): number => Math.floor(t + SLACK * (1 + Math.abs(t))) + 0;

/**
 * Given the crossings, calls emit(t) once for every integer t in [tLo, tHi]
 * at which the pencil has a root in W, in increasing order. (Sorts the
 * crossings in place.) `base` is the number of roots in W as t → −∞: zero
 * for a pencil p + t, the number of roots of R in W for a pencil p + tR.
 */
export function sweep(
  cs: Crossings, emit: (t: number) => void,
  base = 0, tLo = -Infinity, tHi = Infinity,
): void {
  const { t, sign, count } = cs;
  if (count === 0 && base === 0) return;
  for (let i = 1; i < count; i++) {
    // insertion sort: there are only a few crossings per degree
    const ti = t[i];
    const si = sign[i];
    let j = i - 1;
    for (; j >= 0 && t[j] > ti; j--) {
      t[j + 1] = t[j];
      sign[j + 1] = sign[j];
    }
    t[j + 1] = ti;
    sign[j + 1] = si;
  }

  // The root count must return to its base value and never go negative.
  // If it does not (a tangency or a corner hit counted once instead of
  // twice), fall back to a superset of T: the convex hull of the
  // crossings, or everything if roots persist at infinity.
  let roots = base;
  let consistent = true;
  for (let i = 0; i < count; i++) {
    roots += sign[i];
    if (roots < 0) consistent = false;
  }
  if (roots !== base) consistent = false;
  if (!consistent) {
    const from = base > 0 ? tLo : Math.max(tLo, lower(t[0]));
    const to = base > 0 ? tHi : Math.min(tHi, upper(t[count - 1]));
    for (let k = from; k <= to; k++) emit(k);
    return;
  }

  // Between consecutive crossings (and beyond the outermost) the count is constant.
  let last = -Infinity;
  for (let i = -1; i < count; i++) {
    if (i >= 0) roots += sign[i];
    if (roots <= 0) continue;
    const from = Math.max(i >= 0 ? lower(t[i]) : tLo, tLo, last + 1);
    const to = Math.min(i + 1 < count ? upper(t[i + 1]) : tHi, tHi);
    for (let k = from; k <= to; k++) emit(k);
    last = Math.max(last, to);
  }
}

const scratch = createCrossings(128);

/**
 * Calls emit(t) once for every integer t ∈ T(p, W), in increasing order.
 *
 * Endpoints are widened by SLACK, so an integer t whose root lies within
 * rounding distance outside ∂W may be emitted as well: callers that need
 * exact membership test the root they solve for. No member is ever lost.
 */
export function tailScan(p: Poly, W: Window, emit: (t: number) => void): void {
  const cs = p.length <= 21 ? scratch : createCrossings(6 * p.length);
  findCrossings(p, W, cs);
  sweep(cs, emit);
}
