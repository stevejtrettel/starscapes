/**
 * Size laws: how large a star is drawn.
 *
 * Every law in use is a member of one two-parameter family in the
 * invariant δ (catalogue/star.ts) and the height y:
 *
 *     r(f, z) = c · y^β · δ(f, z)^(−κ)          (Euclidean radius),
 *
 * capped at cap·y so that no disc reaches the real axis.
 *
 *   β = 1  — "hyperbolic" laws: the disc has hyperbolic radius ≈ c·δ^(−κ),
 *            a function of the invariant alone, so the picture of an
 *            SL₂(ℤ)-invariant family is SL₂(ℤ)-invariant.
 *   β = 0  — "Euclidean" laws: equal δ means equal size on the page.
 *
 * In terms of the discriminant, δ = |disc|^(1/2) for quadratics and
 * (4|disc|)^(1/4) for cubics; so, for instance, the root-discriminant law
 * of Harriss–Stange–Trettel (hyperbolic radius ∝ |disc|^(−1/d)) is β = 1
 * with κ = 1 for quadratics and κ = 4/3 for cubics.
 *
 * INK. Suppose the family's population grows like
 *
 *     #{stars with δ ≤ Δ} ≈ const · Δ^D · y^(−w)      per unit Euclidean area
 *
 * (quadratics: D = 3, w = 2; all cubics: D = 4, w = 2; monic cubics:
 * D = 3, w = 1/2 — docs/mathematics.md §3). The fraction of the page
 * covered by the stars with δ ≤ Δ at height y is then
 *
 *     ink(y; Δ) ∝ c² · y^(2β−w) · ∫^Δ δ^(D−1−2κ) dδ.
 *
 *   κ > D/2   the ink converges: the picture has a limit as ever smaller
 *             stars are added, and zooming is magnification.
 *   κ = D/2   logarithmic growth, each octave of δ contributing equally
 *             (the exponent matched to Sprindžuk's theorem, HST Fig. 35).
 *   κ < D/2   ink ∝ c²·y^(2β−w)·Δ^(D−2κ) diverges. Drawing the stars whose
 *             radius is at least p (a pixel) means Δ = (c·y^β/p)^(1/κ), so
 *
 *                 ink ∝ c^(D/κ) · p^(2−D/κ) · y^(βD/κ − w).
 *
 *             Two consequences. Under zoom the picture saturates unless c
 *             shrinks with the pixel, c ∝ p^γ with γ = 1 − 2κ/D. And the
 *             ink is even down the page exactly when β = wκ/D.
 */
import { delta, type Shell, type Star } from "../catalogue/star.ts";

export interface SizeLaw {
  readonly c: number;
  readonly beta: number;
  readonly kappa: number;
  /** Radius ≤ cap·y; must be < 1. */
  readonly cap: number;
}

/** Hyperbolic radius c·δ^(−κ). */
export function hyperbolic(c: number, kappa = 1, cap = 0.5): SizeLaw {
  return { c, beta: 1, kappa, cap };
}

/** Euclidean radius c·δ^(−κ). */
export function euclidean(c: number, kappa = 1, cap = 0.5): SizeLaw {
  return { c, beta: 0, kappa, cap };
}

/** The law's radius before the cap: c·y^β·δ^(−κ). */
export function naturalRadius(law: SizeLaw, star: Star): number {
  const scale = law.beta === 0 ? 1 : law.beta === 1 ? star.y : star.y ** law.beta;
  return law.c * scale * delta(star) ** -law.kappa;
}

/** The radius at which the star is drawn. */
export function radius(law: SizeLaw, star: Star): number {
  return Math.min(law.cap * star.y, naturalRadius(law, star));
}

/**
 * The δ-shell of the stars with rMin ≤ naturalRadius < rMax:
 * c·y^β·δ^(−κ) ≥ rMin  ⟺  δ ≤ (c/rMin)^(1/κ)·y^(β/κ).
 */
export function shellOfRadii(law: SizeLaw, rMin: number, rMax = Infinity): Shell {
  return {
    lo: (law.c / rMax) ** (1 / law.kappa),
    hi: (law.c / rMin) ** (1 / law.kappa),
    exponent: law.beta / law.kappa,
  };
}

/** #{δ ≤ Δ} ≈ const·Δ^power·y^(−weight) per unit Euclidean area. */
export interface Population {
  readonly power: number;
  readonly weight: number;
}

/**
 * The exponent γ for which c ∝ (pixel size)^γ keeps the ink of a
 * magnitude-limited picture constant under zoom; 0 when the ink converges.
 */
export function zoomExponent(law: SizeLaw, population: Population): number {
  return Math.max(0, 1 - (2 * law.kappa) / population.power);
}

/** The β for which a magnitude-limited picture is evenly inked down the page: wκ/D. */
export function evenBeta(kappa: number, population: Population): number {
  return (population.weight * kappa) / population.power;
}
