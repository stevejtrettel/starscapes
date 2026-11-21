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
