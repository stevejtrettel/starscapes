/**
 * The discriminant of an integer polynomial f = a_d ∏ (x − αᵢ):
 *
 *     disc f = a_d^(2d−2) ∏_{i<j} (αᵢ − αⱼ)²
 *            = (−1)^(d(d−1)/2) · Res(f, f′) / a_d.
 *
 * It is invariant under the SL₂(ℤ) action on binary forms, which is why it
 * (rather than any height) is the natural measure of size in a starscape.
 *
 * Two implementations: closed forms in float64 for degrees 2 and 3, exact
 * while the result and its intermediate terms stay below 2⁵³; and an exact
 * BigInt computation for any degree, by fraction-free elimination on the
 * Sylvester matrix.
 */
import { degree, type Poly } from "./poly.ts";

/**
 * disc f for deg f ∈ {2, 3}, in float64. Exact when every term is below
 * 2⁵³ in absolute sum: for coefficients bounded by H that is 5H² < 2⁵³,
 * i.e. H ≤ 4·10⁷ (quadratics), and 54H⁴ < 2⁵³, i.e. H ≤ 3500 (cubics).
 */
export function discriminant(f: Poly): number {
  if (f.length === 3) {
    const [c, b, a] = [f[0], f[1], f[2]];
    return b * b - 4 * a * c;
  }
  if (f.length === 4) {
    const [d, c, b, a] = [f[0], f[1], f[2], f[3]];
    return 18 * a * b * c * d - 4 * b * b * b * d + b * b * c * c - 4 * a * c * c * c - 27 * a * a * d * d;
  }
  throw new Error(`discriminant: closed form only for degrees 2 and 3; use discriminantExact`);
}

/** disc f for any degree ≥ 1, exactly. Coefficients must be integers. */
export function discriminantExact(f: Poly): bigint {
  const d = degree(f);
  if (d < 1) throw new Error("discriminant of a constant");
  if (d === 1) return 1n;
  const a = Array.from({ length: d + 1 }, (_, k) => BigInt(f[k]));
  const da = a.slice(1).map((c, k) => BigInt(k + 1) * c);
  const res = resultant(a, da);
  const sign = (d * (d - 1)) / 2 % 2 === 0 ? 1n : -1n;
  return (sign * res) / a[d];
}

/**
 * Res(f, g) = det of the Sylvester matrix, by Bareiss's fraction-free
 * elimination: every intermediate entry is a minor of the original matrix,
 * hence an integer, and every division is exact.
 */
export function resultant(f: bigint[], g: bigint[]): bigint {
  const m = f.length - 1;
  const n = g.length - 1;
  const N = m + n;
  const M: bigint[][] = Array.from({ length: N }, () => new Array<bigint>(N).fill(0n));
  // n shifted copies of f, then m shifted copies of g, coefficients descending.
  for (let i = 0; i < n; i++) for (let k = 0; k <= m; k++) M[i][i + k] = f[m - k];
  for (let i = 0; i < m; i++) for (let k = 0; k <= n; k++) M[n + i][i + k] = g[n - k];

  let sign = 1n;
  let prev = 1n;
  for (let k = 0; k < N - 1; k++) {
    if (M[k][k] === 0n) {
      const swap = M.findIndex((row, i) => i > k && row[k] !== 0n);
      if (swap < 0) return 0n;
      [M[k], M[swap]] = [M[swap], M[k]];
      sign = -sign;
    }
    for (let i = k + 1; i < N; i++) {
      for (let j = k + 1; j < N; j++) {
        M[i][j] = (M[i][j] * M[k][k] - M[i][k] * M[k][j]) / prev;
      }
    }
    prev = M[k][k];
  }
  return sign * M[N - 1][N - 1];
}
