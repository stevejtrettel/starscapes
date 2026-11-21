/**
 * LLL reduction of an integer lattice basis, in exact arithmetic.
 *
 * Given linearly independent b₁, …, b_n ∈ ℤᵐ, returns a basis of the same
 * lattice that is LLL-reduced (with the usual constant 3/4): its vectors
 * are nearly orthogonal, and in particular its Gram–Schmidt lengths do not
 * drop fast — which is what makes enumeration in an ellipsoid cheap.
 *
 * This is the all-integer form of the algorithm (de Weger; Cohen, A Course
 * in Computational Algebraic Number Theory, Algorithm 2.6.7): instead of
 * the Gram–Schmidt coefficients μ_ij and lengths, it carries the integers
 *
 *     d_k = det(b_i·b_j)_{i,j ≤ k},        λ_ij = d_j·μ_ij,
 *
 * so nothing is ever rounded. BigInt throughout: the lattices here have
 * entries near 2⁵² and their Gram determinants are far larger.
 */

/** ⌊a/b⌉ for b > 0. */
function roundDiv(a: bigint, b: bigint): bigint {
  const twice = 2n * a + b;
  const q = twice / (2n * b);
  return twice % (2n * b) < 0n ? q - 1n : q; // BigInt division truncates; this floors
}

export function lll(basis: readonly (readonly bigint[])[]): bigint[][] {
  const n = basis.length;
  // 1-indexed, as in the references.
  const b: bigint[][] = [[], ...basis.map((row) => [...row])];
  const d: bigint[] = new Array<bigint>(n + 1).fill(0n);
  const lam: bigint[][] = Array.from({ length: n + 1 }, () => new Array<bigint>(n + 1).fill(0n));
  const dot = (u: bigint[], v: bigint[]): bigint => u.reduce((sum, x, i) => sum + x * v[i], 0n);

  /** Make |μ_kl| ≤ 1/2 by subtracting a multiple of b_l from b_k. */
  const reduce = (k: number, l: number): void => {
    const twice = 2n * lam[k][l];
    if ((twice < 0n ? -twice : twice) <= d[l]) return;
    const q = roundDiv(lam[k][l], d[l]);
    for (let i = 0; i < b[k].length; i++) b[k][i] -= q * b[l][i];
    lam[k][l] -= q * d[l];
    for (let i = 1; i < l; i++) lam[k][i] -= q * lam[l][i];
  };

  /** Exchange b_k and b_{k−1}, updating d and λ. */
  const swap = (k: number, kmax: number): void => {
    [b[k], b[k - 1]] = [b[k - 1], b[k]];
    for (let j = 1; j <= k - 2; j++) [lam[k][j], lam[k - 1][j]] = [lam[k - 1][j], lam[k][j]];
    const l = lam[k][k - 1];
    const B = (d[k - 2] * d[k] + l * l) / d[k - 1];
    for (let i = k + 1; i <= kmax; i++) {
      const t = lam[i][k];
      lam[i][k] = (d[k] * lam[i][k - 1] - l * t) / d[k - 1];
      lam[i][k - 1] = (B * t + l * lam[i][k]) / d[k];
    }
    d[k - 1] = B;
  };

  d[0] = 1n;
  if (n === 0) return [];
  d[1] = dot(b[1], b[1]);
  let k = 2;
  let kmax = 1;
  while (k <= n) {
    if (k > kmax) {
      // Incremental Gram–Schmidt for the new vector.
      kmax = k;
      for (let j = 1; j <= k; j++) {
        let u = dot(b[k], b[j]);
        for (let i = 1; i < j; i++) u = (d[i] * u - lam[k][i] * lam[j][i]) / d[i - 1];
        if (j < k) lam[k][j] = u;
        else {
          if (u === 0n) throw new Error("lll: the vectors are linearly dependent");
          d[k] = u;
        }
      }
    }
    reduce(k, k - 1);
    // Lovász: |b*_k|² ≥ (3/4 − μ²)|b*_{k−1}|², cleared of denominators.
    const l = lam[k][k - 1];
    if (4n * d[k] * d[k - 2] < 3n * d[k - 1] * d[k - 1] - 4n * l * l) {
      swap(k, kmax);
      k = Math.max(2, k - 1);
    } else {
      for (let j = k - 2; j >= 1; j--) reduce(k, j);
      k++;
    }
  }
  return b.slice(1);
}
