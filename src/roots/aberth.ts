/**
 * All roots of a real polynomial of any degree: the Aberth–Ehrlich
 * iteration. Each approximation zᵢ takes a Newton step for f deflated by
 * the other current approximations,
 *
 *     zᵢ ← zᵢ − wᵢ / (1 − wᵢ Σ_{j≠i} 1/(zᵢ − zⱼ)),     wᵢ = f(zᵢ)/f′(zᵢ),
 *
 * which converges cubically to simple roots, simultaneously for all i,
 * from generic starting points. No ordering of the output is promised.
 */
import { degree, evalJet, type Poly } from "../poly/poly.ts";

const MAX_ITER = 200;
const jet = new Float64Array(4);

/**
 * Writes the d roots of f to re[0..d), im[0..d). Returns the number of
 * iterations used, or −1 if the iteration did not settle (clustered or
 * multiple roots converge only linearly; the approximations are still the
 * best available).
 */
export function solveAberth(f: Poly, re: Float64Array, im: Float64Array): number {
  const d = degree(f);

  // Start on a circle of radius ρ = Cauchy's bound scaled to the geometric
  // mean modulus |a₀/a_d|^(1/d), at angles that avoid the real axis and
  // any symmetry of f.
  let rho = Math.abs(f[0] / f[d]) ** (1 / d);
  if (!(rho > 0)) rho = 1;
  for (let i = 0; i < d; i++) {
    const angle = (2 * Math.PI * i) / d + 0.7;
    re[i] = rho * Math.cos(angle);
    im[i] = rho * Math.sin(angle);
  }

  for (let iter = 1; iter <= MAX_ITER; iter++) {
    let moved = 0;
    for (let i = 0; i < d; i++) {
      const zr = re[i];
      const zi = im[i];
      evalJet(f, zr, zi, jet);
      const [pr, pi, dr, di] = jet;
      if (pr === 0 && pi === 0) continue;

      // w = f/f′
      const dm = dr * dr + di * di;
      const wr = (pr * dr + pi * di) / dm;
      const wi = (pi * dr - pr * di) / dm;

      // σ = Σ_{j≠i} 1/(zᵢ − zⱼ)
      let sr = 0;
      let si = 0;
      for (let j = 0; j < d; j++) {
        if (j === i) continue;
        const ur = zr - re[j];
        const ui = zi - im[j];
        const um = ur * ur + ui * ui;
        sr += ur / um;
        si -= ui / um;
      }

      // step = w / (1 − wσ)
      const er = 1 - (wr * sr - wi * si);
      const ei = -(wr * si + wi * sr);
      const em = er * er + ei * ei;
      const stepR = (wr * er + wi * ei) / em;
      const stepI = (wi * er - wr * ei) / em;
      re[i] = zr - stepR;
      im[i] = zi - stepI;
      moved = Math.max(moved, Math.hypot(stepR, stepI) / (1 + Math.hypot(zr, zi)));
    }
    if (moved <= 4e-16) return iter;
  }
  return -1;
}
