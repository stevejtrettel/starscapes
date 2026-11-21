/**
 * All integer polynomials of bounded norm with a root near a given point.
 *
 * For z₀ ∈ ℍ the polynomials vanishing at z₀ form the subspace
 * Re f(z₀) = Im f(z₀) = 0 of coefficient space, and one with a root NEAR
 * z₀ lies near that subspace:
 *
 * LEMMA. Let ‖f‖₂ ≤ R and let f have a root α within ρ of z₀. Then
 *
 *     |f(z₀)| ≤ ρ·|f′(z₀)| + ρ²·R·L₂/2,                           (Taylor)
 *
 * with L₂ = ‖(k(k−1)mᵏ⁻²)_k‖ and m = |z₀| + ρ; and consequently
 *
 *     |f(z₀)| ≤ ε := R·ρ·(L⊥ + ρL₂/2)/(1 − ρκ)       whenever ρκ < 1,
 *
 * where, with M and N the 2 × n real matrices of f ↦ f(z₀) and
 * f ↦ f′(z₀), L⊥ = σ_max(N restricted to ker M) and κ = σ_max(N)/σ_min(M).
 *
 * Proof. 0 = f(α) = f(z₀) + f′(z₀)(α − z₀) + r with |r| ≤ ρ²·sup|f″|/2,
 * and |f″| ≤ R·L₂ on the disc. Split f = f∥ + f⊥ along ker M and its
 * orthogonal complement: ‖f⊥‖ ≤ |f(z₀)|/σ_min(M), so
 * |f′(z₀)| ≤ L⊥·R + κ·|f(z₀)|; substitute and solve for |f(z₀)|. ∎
 *
 * L⊥ is the largest derivative at z₀ of a unit polynomial VANISHING at
 * z₀, which is several times smaller than that of an arbitrary one; since
 * the number of candidates grows like ε², that is worth an order of
 * magnitude. (When ρκ ≥ 1 — windows close to the real axis — the cruder
 * |f(z₀)| ≤ R·ρ·‖(k·mᵏ⁻¹)_k‖ is used.)
 *
 * So the polynomials sought are among the integer points of the cylinder
 * {‖f‖ ≤ R, |f(z₀)| ≤ ε}, which lies in the ellipsoid
 *
 *     λ·‖f‖²/R² + (1 − λ)·|f(z₀)|²/ε² ≤ 1,        λ = (n − 2)/n
 *
 * (n = d + 1 coefficients; this λ minimises its volume). Its integer
 * points are the short vectors of the lattice spanned by
 *
 *     b_k = (S₁·e_k, ⌊S₂·Re z₀ᵏ⌉, ⌊S₂·Im z₀ᵏ⌉) ∈ ℤ^(n+2),   k = 0, …, d,
 *
 * the lattice of Kannan–Lenstra–Lovász for recognising an algebraic number
 * from an approximation; here every short vector is wanted, not the
 * shortest. The lattice is very eccentric — S₂/S₁ ≈ R/ε — so it is
 * LLL-reduced exactly before the ellipsoid is searched (Fincke–Pohst).
 * Work is then proportional to the number of points found, whatever the
 * size of the box of coefficients: this is what makes deep zooms of high
 * degree possible.
 */
import { evalJet } from "../poly/poly.ts";
import { ballVolume, pointsInEllipsoid } from "./enumerate.ts";
import { lll } from "./lll.ts";

/** The scale of the coefficient coordinates; large enough that rounding the others is negligible. */
const S1 = 4096;

/** Largest and smallest eigenvalue of the symmetric matrix (a b; b c). */
function eigenvalues(a: number, b: number, c: number): [max: number, min: number] {
  const mean = (a + c) / 2;
  const spread = Math.hypot((a - c) / 2, b);
  return [mean + spread, mean - spread];
}

/** The bounds of the lemma: ε, the Taylor remainder ρ²RL₂/2, and m = |z₀| + ρ. */
function slab(d: number, R: number, s: number, y: number, rho: number): { epsilon: number; remainder: number; modulus: number } {
  const modulus = Math.hypot(s, y) + rho;
  let [l1, l2] = [0, 0];
  for (let k = 1; k <= d; k++) {
    l1 += k * k * modulus ** (2 * k - 2);
    if (k >= 2) l2 += (k * (k - 1)) ** 2 * modulus ** (2 * k - 4);
  }
  const remainder = 0.5 * rho * rho * R * Math.sqrt(l2);
  let epsilon = R * rho * Math.sqrt(l1);

  // Gram matrices of M = (Re v; Im v), N = (Re v′; Im v′), v_k = z₀ᵏ, v′_k = k·z₀ᵏ⁻¹.
  let [mm0, mm1, mm2, nn0, nn1, nn2, nm00, nm01, nm10, nm11] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let [pr, pi, qr, qi] = [1, 0, 0, 0]; // z₀ᵏ and k·z₀ᵏ⁻¹
  for (let k = 0; k <= d; k++) {
    mm0 += pr * pr;
    mm1 += pr * pi;
    mm2 += pi * pi;
    nn0 += qr * qr;
    nn1 += qr * qi;
    nn2 += qi * qi;
    nm00 += qr * pr;
    nm01 += qr * pi;
    nm10 += qi * pr;
    nm11 += qi * pi;
    [qr, qi] = [(k + 1) * pr, (k + 1) * pi];
    [pr, pi] = [pr * s - pi * y, pr * y + pi * s];
  }
  const det = mm0 * mm2 - mm1 * mm1;
  const sigmaMin2 = eigenvalues(mm0, mm1, mm2)[1];
  const kappa = Math.sqrt(eigenvalues(nn0, nn1, nn2)[0] / sigmaMin2);
  if (rho * kappa < 1 && det > 0) {
    // N·P·Nᵀ = NNᵀ − (NMᵀ)(MMᵀ)⁻¹(NMᵀ)ᵀ, with (MMᵀ)⁻¹ = (mm2 −mm1; −mm1 mm0)/det.
    const x00 = (nm00 * mm2 - nm01 * mm1) / det;
    const x01 = (-nm00 * mm1 + nm01 * mm0) / det;
    const x10 = (nm10 * mm2 - nm11 * mm1) / det;
    const x11 = (-nm10 * mm1 + nm11 * mm0) / det;
    const perp = eigenvalues(
      nn0 - (x00 * nm00 + x01 * nm01),
      nn1 - (x00 * nm10 + x01 * nm11),
      nn2 - (x10 * nm10 + x11 * nm11),
    )[0];
    epsilon = Math.min(epsilon, (R * rho * (Math.sqrt(Math.max(0, perp)) + remainder / (R * rho))) / (1 - rho * kappa));
  }
  return { epsilon, remainder, modulus };
}

export interface NearRootSearch {
  /** An estimate of the number of lattice points the search will examine. */
  readonly expected: number;
  /**
   * Visits the integer polynomials f ≠ 0 of degree ≤ d in the ellipsoid
   * that pass the Taylor inequality of the lemma — each of ±f once, sign
   * unspecified. Returns the number of lattice points examined.
   */
  run(visit: (f: Float64Array) => void): number;
}

/**
 * Prepares the search for the integer polynomials of degree ≤ d with
 * ‖f‖₂ ≤ R that have a root within ρ of z₀ = s + iy. Every such polynomial
 * is visited; so are some others, which the caller must discard.
 */
export function polynomialsNear(d: number, R: number, s: number, y: number, rho: number): NearRootSearch {
  const n = d + 1;
  const { epsilon, remainder, modulus } = slab(d, R, s, y, rho);

  const lambda = (n - 2) / n;
  const S2 = S1 * (R / epsilon) * Math.sqrt((1 - lambda) / lambda);
  if (!(S2 * modulus ** d < 2 ** 52)) {
    throw new Error("polynomialsNear: this window is too small for float64 coordinates");
  }

  // Powers of z₀, scaled and rounded: the last two coordinates of the basis.
  const basis: bigint[][] = [];
  let [pr, pi] = [1, 0];
  for (let k = 0; k <= d; k++) {
    const row = new Array<bigint>(n + 2).fill(0n);
    row[k] = BigInt(S1);
    row[n] = BigInt(Math.round(S2 * pr));
    row[n + 1] = BigInt(Math.round(S2 * pi));
    basis.push(row);
    [pr, pi] = [pr * s - pi * y, pr * y + pi * s];
  }
  // ‖v‖² ≤ (S₁R)² + (S₂ε + rounding)², rounding ≤ ‖f‖₁/√2 ≤ R·√(n/2).
  const radius2 = ((S1 * R) ** 2 + (S2 * epsilon + R * Math.sqrt(n / 2)) ** 2) * (1 + 1e-9);

  const reduced = lll(basis);
  const gram = reduced.map((u) => reduced.map((v) => Number(u.reduce((acc, x, i) => acc + x * v[i], 0n))));
  // The polynomial of each reduced vector: its first n coordinates over S₁.
  const polynomials = reduced.map((u) => u.slice(0, n).map((x) => Number(x / BigInt(S1))));

  // Gaussian heuristic: points ≈ volume / covolume. The covolume is √det G.
  let logDet = 0;
  {
    const q = gram.map((row) => [...row]);
    for (let i = 0; i < n; i++) {
      logDet += Math.log(q[i][i]);
      for (let k = i + 1; k < n; k++) {
        const ratio = q[k][i] / q[i][i];
        for (let l = i; l < n; l++) q[k][l] -= ratio * q[i][l];
      }
    }
  }
  const expected = Math.exp(Math.log(ballVolume(n)) + (n / 2) * Math.log(radius2) - logDet / 2) / 2;

  // f(z₀) and f′(z₀) are linear in the lattice coordinates x: tabulating
  // them for the reduced basis lets the Taylor inequality be tested in 4n
  // operations, before the candidate's coefficients are even formed.
  const jet = new Float64Array(4);
  const values = polynomials.map((u) => {
    evalJet(u, s, y, jet);
    return [...jet];
  });
  const tolerance = 1e-9 * epsilon;

  return {
    expected,
    run(visit) {
      const f = new Float64Array(n);
      return pointsInEllipsoid(gram, radius2, (x) => {
        // One of each pair ±x: the first nonzero coordinate positive.
        let first = 0;
        while (first < n && x[first] === 0) first++;
        if (first === n || x[first] < 0) return;

        let [vr, vi, dr, di] = [0, 0, 0, 0];
        for (let i = first; i < n; i++) {
          const xi = x[i];
          if (xi === 0) continue;
          const value = values[i];
          vr += xi * value[0];
          vi += xi * value[1];
          dr += xi * value[2];
          di += xi * value[3];
        }
        if (Math.hypot(vr, vi) > rho * Math.hypot(dr, di) + remainder + tolerance) return;

        f.fill(0);
        for (let i = first; i < n; i++) {
          if (x[i] !== 0) for (let k = 0; k < n; k++) f[k] += x[i] * polynomials[i][k];
        }
        visit(f);
      });
    },
  };
}
