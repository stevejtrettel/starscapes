/**
 * Whether a form's root lies in the fundamental domain — exactly.
 *
 * Stars on the boundary of 𝔉 are common (they lie on rational geodesics),
 * so membership cannot be left to floating point: a root within rounding
 * of the arc |z| = 1 would be claimed by both neighbouring tiles or by
 * neither. For forms of degree 2 and 3 the position of the complex root
 * z = s + iy is decided by the signs of integers.
 *
 * Each star must belong to exactly one tile, so 𝔉 is taken half-open:
 *
 *     −1/2 ≤ s < 1/2 and |z| > 1,     or     |z| = 1 and −1/2 ≤ s ≤ 0.
 *
 * Two points of it are fixed by elements of PSL₂(ℤ): i (by S) and
 * ρ = e^(2πi/3) (by ST, of order 3). A star there is found from each of
 * the 2 or 3 tiles around its image, and the caller must keep one.
 */
import { type Matrix, substitute } from "./mobius.ts";

export type Position = "outside" | "inside" | "i" | "rho";

function classify(normMinusOne: number, twoSMinusOne: number, twoSPlusOne: number, s: number): Position {
  if (twoSPlusOne < 0 || twoSMinusOne >= 0 || normMinusOne < 0) return "outside";
  if (normMinusOne > 0) return "inside";
  // On the arc |z| = 1: keep the half with s ≤ 0.
  if (s > 0) return "outside";
  return s === 0 ? "i" : twoSPlusOne === 0 ? "rho" : "inside";
}

/**
 * ax² + bx + c with a > 0 and negative discriminant: s = −b/2a, |z|² = c/a.
 * (The classical conditions for a reduced form.)
 */
export function positionOfQuadratic(f: ArrayLike<number>): Position {
  const [c, b, a] = [f[0], f[1], f[2]];
  return classify(c - a, -b - a, -b + a, -b);
}

/**
 * The binary cubic form ax³ + bx²y + cxy² + dy³ with one real root — a may
 * be 0, the form then being y·(bx² + cxy + dy²). Writing it as
 * (αx + βy)(x² − 2sxy + ny²), four integers carry the signs needed
 * (Mathews; Belabas, Lemma 4.2):
 *
 *     d(d − b) + a(c − a)        = (n − 1)·|α + βz|²,
 *     ad − (a + b)(a + b + c)    = (2s − 1)·|α(1 − z) + β|²,
 *     ad + (a − b)(a − b + c)    = (2s + 1)·|α(1 + z) − β|²,
 *     ad − bc                    = 2s·|αz − β|².
 */
export function positionOfCubic(f: ArrayLike<number>): Position {
  const [d, c, b, a] = [f[0], f[1], f[2], f[3]];
  return classify(
    d * (d - b) + a * (c - a),
    a * d - (a + b) * (a + b + c),
    a * d + (a - b) * (a - b + c),
    a * d - b * c,
  );
}

/**
 * Whether the integer polynomial g (degree ≤ 4, as a quartic form) has the
 * root i·v exactly, v > 0 known approximately.
 *
 * Split g into even and odd parts, g(x) = E(x²) + x·O(x²) with
 * E(t) = g₄t² + g₂t + g₀ and O(t) = g₃t + g₁. Then g(iv) = 0 iff
 * E(−v²) = O(−v²) = 0: either O ≠ 0, its root t₀ = −g₁/g₃ is −v² and
 * E(t₀) = 0, which is the integer condition g₄g₁² − g₂g₁g₃ + g₀g₃² = 0;
 * or O = 0 and E has the real root −v².
 */
function hasImaginaryRoot(g: ArrayLike<number>, v: number): boolean {
  const [g0, g1, g2, g3, g4] = [0, 1, 2, 3, 4].map((k) => BigInt(g[k]));
  const near = (t: number): boolean => Math.abs(t + v * v) <= 1e-5 * (1 + v * v);
  if (g3 !== 0n || g1 !== 0n) {
    if (g3 === 0n) return false;
    return g4 * g1 * g1 - g2 * g1 * g3 + g0 * g3 * g3 === 0n && near(-Number(g1) / Number(g3));
  }
  if (g4 === 0n) return g2 !== 0n && near(-Number(g0) / Number(g2));
  const disc = g2 * g2 - 4n * g4 * g0;
  if (disc < 0n) return false;
  const root = Math.sqrt(Number(disc));
  return near((-Number(g2) + root) / (2 * Number(g4))) || near((-Number(g2) - root) / (2 * Number(g4)));
}

/** Within this distance of a boundary curve of 𝔉, position is decided exactly. */
const NEAR = 1e-7;
const moved = new Float64Array(5);

/**
 * A quartic form (leading coefficients possibly 0) with the root s + iy.
 * A quartic can have two pairs of non-real roots, so the root must be
 * named. Away from ∂𝔉 floating point decides; within NEAR of one of its
 * curves, whether the root is ON the curve is decided exactly, by moving
 * the curve to the imaginary axis with an integer substitution:
 *
 *     s = 0          g = f
 *     s = ∓1/2       g(x) = 2⁴·f(x ∓ 1/2)
 *     |z| = 1        g(w) = (1 − w)⁴·f((1 + w)/(1 − w)),   w = (z − 1)/(z + 1).
 */
export function positionOfQuartic(f: ArrayLike<number>, s: number, y: number): Position {
  const norm = s * s + y * y;
  const exactly = (m: Matrix, v: number): boolean => {
    substitute(f, m, moved);
    return hasImaginaryRoot(moved, v);
  };
  const onAxis = Math.abs(s) <= NEAR && hasImaginaryRoot(f, y);
  const onLeft = Math.abs(s + 0.5) <= NEAR && exactly([2, -1, 0, 2], y); // roots moved by +1/2
  const onRight = Math.abs(s - 0.5) <= NEAR && exactly([2, 1, 0, 2], y); // roots moved by −1/2
  const onArc = Math.abs(norm - 1) <= NEAR && exactly([1, 1, -1, 1], (2 * y) / ((s + 1) ** 2 + y * y));
  return classify(onArc ? 0 : norm - 1, onRight ? 0 : s - 0.5, onLeft ? 0 : s + 0.5, onAxis ? 0 : s);
}
