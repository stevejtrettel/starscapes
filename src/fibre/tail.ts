/**
 * Tail coordinates on the incidence variety.
 *
 * Fix a degree d and write a real polynomial as head plus tail,
 *
 *     f = x²·h(x) + a₁x + a₀,        h = (a₂, …, a_d) ∈ ℝ^(d−1).
 *
 * For z = s + iy with y > 0 the numbers 1 and z are independent over ℝ, so
 * for every head h there is exactly one tail making z a root:
 *
 *     Ψ_h(z) = (a₁, a₀),    a₁ = −Im(z²h(z))/y,    a₀ = −Re(z²h(z)) − a₁s.
 *
 * So (h, z) are global coordinates on {(f, z) : f(z) = 0}, and the integer
 * polynomials with head h are exactly the points of Ψ_h⁻¹(ℤ²).
 *
 * PROPOSITION (root density). Differentiating f(z) = 0 at fixed head gives
 * f′(z)dz + z·da₁ + da₀ = 0, and (da₁, da₀) ↦ z·da₁ + da₀ has determinant
 * −y as a real-linear map ℝ² → ℂ. Hence
 *
 *     |det DΨ_h(z)| = |f′(z)|² / y :
 *
 * the roots of the integer polynomials with head h have density |f′(z)|²/y
 * per unit Euclidean area. (Integrated over heads in a box this is the
 * density of Götze–Kaliada–Zaporozhets; see docs/mathematics.md §2.)
 */

/**
 * Completes f to a polynomial with root s + iy: reads the head f[2..d],
 * writes the tail f[1], f[0].
 */
export function closeTail(f: Float64Array | number[], s: number, y: number): void {
  // w = z²·h(z) by Horner on the head, then two more multiplications by z.
  let wr = 0;
  let wi = 0;
  for (let k = f.length - 1; k >= 2; k--) {
    const t = wr * s - wi * y + f[k];
    wi = wr * y + wi * s;
    wr = t;
  }
  for (let twice = 0; twice < 2; twice++) {
    const t = wr * s - wi * y;
    wi = wr * y + wi * s;
    wr = t;
  }
  f[1] = -wi / y;
  f[0] = -wr - f[1] * s;
}
