/**
 * The tail scan for a general pencil p + t·R.
 *
 * For real polynomials p, R and a window W in the open upper half plane,
 *
 *     T(p, R; W) = { t ∈ ℝ : p + tR has a root in W }.
 *
 * z is a root of p + tR iff p(z)/R(z) = −t, so roots travel on the curve
 * {Im(p·R̄) = 0} — the starscape curve of the rational line through p and
 * R — with velocity dz/dt = −R/(p + tR)′. As for R = 1 (tailScan.ts), the
 * number of roots in W changes only where the curve meets ∂W, by ±1
 * according to the direction of travel. The one new feature is the count
 * at infinity: as t → ±∞ the roots of p + tR tend to those of R, so the
 * count starts and ends at the number of roots of R in W instead of zero.
 *
 * On each edge of W the condition Im(p·R̄) = 0 is a real polynomial of
 * degree ≤ deg p + deg R in the edge's parameter.
 *
 * This is what enumerates PLANAR families aP + bQ + cR (catalogue/plane.ts):
 * for each (a, b) the admissible c are T(aP + bQ, R; W) ∩ ℤ.
 */
import { evalJet, type Poly } from "../poly/poly.ts";
import { realRoots } from "../poly/realRoots.ts";
import { type Crossings, createCrossings, sweep, widen } from "./tailScan.ts";
import type { Window } from "./window.ts";

/** f(x + w) for complex w = (wr, wi): complex coefficients, ascending. */
function shiftComplex(f: Poly, wr: number, wi: number): [re: number[], im: number[]] {
  const re = Array.from(f);
  const im = new Array<number>(f.length).fill(0);
  const n = f.length;
  for (let i = 0; i < n - 1; i++) {
    for (let k = n - 2; k >= i; k--) {
      re[k] += wr * re[k + 1] - wi * im[k + 1];
      im[k] += wr * im[k + 1] + wi * re[k + 1];
    }
  }
  return [re, im];
}

/** The real polynomial Im(A·conj(B)) for complex-coefficient A, B in a real variable. */
function imOfProductWithConjugate(A: [number[], number[]], B: [number[], number[]]): number[] {
  const out = new Array<number>(A[0].length + B[0].length - 1).fill(0);
  for (let j = 0; j < A[0].length; j++) {
    for (let k = 0; k < B[0].length; k++) {
      out[j + k] += A[1][j] * B[0][k] - A[0][j] * B[1][k];
    }
  }
  return out;
}

const jp = new Float64Array(4);
const jr = new Float64Array(4);

/** The crossings of the pencil p + tR with ∂W. Requires W.y0 > 0. */
export function findPencilCrossings(p: Poly, R: Poly, W: Window, out: Crossings): void {
  out.count = 0;
  const cross = (s: number, y: number, nx: number, ny: number): void => {
    evalJet(p, s, y, jp);
    evalJet(R, s, y, jr);
    const r2 = jr[0] * jr[0] + jr[1] * jr[1];
    if (r2 === 0) return; // a root of R on ∂W: it belongs to every member, not to a crossing
    const t = -(jp[0] * jr[0] + jp[1] * jr[1]) / r2; // −p/R, which is real here
    // dz/dt = −R/(p′ + tR′)
    const dr = jp[2] + t * jr[2];
    const di = jp[3] + t * jr[3];
    const d2 = dr * dr + di * di;
    const vr = -(jr[0] * dr + jr[1] * di) / d2;
    const vi = -(jr[1] * dr - jr[0] * di) / d2;
    if (out.count === out.t.length) return;
    out.t[out.count] = t;
    out.sign[out.count++] = vr * nx + vi * ny < 0 ? 1 : -1;
  };

  // Horizontal edges: ζ = s + i·y_e, a polynomial condition in s.
  for (const [ye, ny] of [[W.y0, -1], [W.y1, 1]] as const) {
    const edge = imOfProductWithConjugate(shiftComplex(p, 0, ye), shiftComplex(R, 0, ye));
    for (const s of realRoots(edge, ...widen(W.s0, W.s1))) cross(s, ye, 0, ny);
  }
  // Vertical edges: ζ = s_e + iy, and f(s_e + iy) = Σ q_m i^m y^m with q = f(x + s_e).
  const alongImaginary = (f: Poly, se: number): [number[], number[]] => {
    const [q] = shiftComplex(f, se, 0);
    const re = q.map((c, m) => (m % 4 === 0 ? c : m % 4 === 2 ? -c : 0));
    const im = q.map((c, m) => (m % 4 === 1 ? c : m % 4 === 3 ? -c : 0));
    return [re, im];
  };
  for (const [se, nx] of [[W.s0, -1], [W.s1, 1]] as const) {
    const edge = imOfProductWithConjugate(alongImaginary(p, se), alongImaginary(R, se));
    for (const y of realRoots(edge, ...widen(W.y0, W.y1))) cross(se, y, nx, 0);
  }
}

const scratch = createCrossings(256);

/**
 * Calls emit(t) once for every integer t ∈ [tLo, tHi] ∩ T(p, R; W), in
 * increasing order (with the endpoint slack of tailScan). `rootsOfRInW`
 * is the number of roots of R in W.
 */
export function pencilScan(
  p: Poly, R: Poly, W: Window, rootsOfRInW: number,
  tLo: number, tHi: number, emit: (t: number) => void,
): void {
  findPencilCrossings(p, R, W, scratch);
  sweep(scratch, emit, rootsOfRInW, tLo, tHi);
}
