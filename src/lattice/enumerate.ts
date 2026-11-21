/**
 * All lattice points in an ellipsoid (Fincke–Pohst).
 *
 * For a positive definite quadratic form with Gram matrix G, lists every
 * x ∈ ℤⁿ with xᵀGx ≤ C. Completing squares from the last variable,
 *
 *     Q(x) = Σ_i q_ii·(x_i + Σ_{j>i} q_ij·x_j)²,
 *
 * so once x_n, …, x_{i+1} are chosen, x_i is confined to an interval; the
 * search is a tree whose level-i nodes are the lattice points of the
 * ellipsoid's projection onto the last n − i coordinates. For an
 * LLL-reduced basis that tree is about as large as its set of leaves.
 *
 * Floating point: the Gram matrix of a reduced basis is well conditioned,
 * and the caller is expected to pass C slightly enlarged.
 */

/**
 * Calls visit(x) for every x ∈ ℤⁿ with xᵀGx ≤ C, including 0 and both
 * signs. x is reused between calls. Returns the number of points.
 */
export function pointsInEllipsoid(G: readonly (readonly number[])[], C: number, visit: (x: Float64Array) => void): number {
  const n = G.length;
  const q = G.map((row) => [...row]);
  for (let i = 0; i < n; i++) {
    if (!(q[i][i] > 0)) throw new Error("pointsInEllipsoid: the form is not positive definite");
    for (let j = i + 1; j < n; j++) {
      q[j][i] = q[i][j];
      q[i][j] /= q[i][i];
    }
    for (let k = i + 1; k < n; k++) {
      for (let l = k; l < n; l++) q[k][l] -= q[k][i] * q[i][l];
    }
  }

  const x = new Float64Array(n);
  let count = 0;
  const level = (i: number, remaining: number): void => {
    let offset = 0;
    for (let j = i + 1; j < n; j++) offset += q[i][j] * x[j];
    const reach = Math.sqrt(Math.max(0, remaining) / q[i][i]);
    for (let xi = Math.ceil(-reach - offset); xi <= Math.floor(reach - offset); xi++) {
      x[i] = xi;
      if (i === 0) {
        count++;
        visit(x);
      } else level(i - 1, remaining - q[i][i] * (xi + offset) ** 2);
    }
  };
  level(n - 1, C);
  return count;
}

/** The volume of the unit ball in ℝⁿ. */
export function ballVolume(n: number): number {
  let v = n % 2 === 0 ? 1 : 2;
  for (let k = n % 2 === 0 ? 2 : 3; k <= n; k += 2) v *= (2 * Math.PI) / k;
  return v;
}
