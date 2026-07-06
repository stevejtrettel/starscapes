/**
 * Sizing rules: the size half of a style, as a pillar (design.md, Level 3 —
 * "Sizing rules in code", settled 2026-07-06).
 *
 * A sizing rule maps a root's row to the EUCLIDEAN WORLD RADIUS of its dot —
 * the size we actually draw, cap applied. Rules are arbitrary functions;
 * the named constructors below all live in one documented coordinate
 * system, and its constants are ALSO what the demos feed the depth-law
 * functions (visibleDepthQuadratics, visibleReachMonicCubics) when a
 * backward collection's cutoff is visibility — the law never crosses into
 * search, only a number derived from it (design.md, "The collection
 * model").
 *
 * ── The power-law form ───────────────────────────────────────────────────
 *
 *     r = c · y^δ / |f′(z)|^γ
 *
 * where z is the plotted root, y = |Im z| its height above ℝ, and f′ its
 * polynomial's derivative. |f′(z)| = |a_d| · ∏_{w ≠ z} |z − w| over the
 * co-roots, so it is computable from the solved root slots at ANY degree —
 * no per-family formulas (invariants.ts `fprimeAt`).
 *
 * WHY exponents on |f′(z)| rather than on the discriminant: within one
 * degree the two parameterizations are the same 2-parameter family, related
 * linearly —
 *
 *     deg 2:  |f′(z)| = √|disc|            (z the complex root)
 *     deg 3:  |f′(z)|² = 2y·√|disc|        (z the complex root, real co-root r:
 *                                           √|disc| = 2y·|z−r|², |f′(z)| = 2y·|z−r|)
 *
 * so any disc-form law r = c·y^β/|disc|^α converts (see `discLaw`). But
 * ACROSS degrees only the f′ coordinates keep the same look at the same
 * exponents: the uniformity locus (ink evenly distributed) is
 * (γ, δ) = (1, ½) at degree 2 AND degree 3 (verified 2026-07-05,
 * experiments E8/E13 era), and the classic hyperbolic look is (1, 1) at
 * both. In disc coordinates those same laws land on different (α, β) per
 * degree. The named points:
 *
 *     classic(c) = (γ, δ) = (1, 1)   quadratic c/√|disc| hyperbolic;
 *                                    the cubic "fprime/vivid" law
 *     uniform(c) = (γ, δ) = (1, ½)   the uniformity locus; the cubic
 *                                    disc¼ law is uniform(c·√2)
 *
 * ── The cap ──────────────────────────────────────────────────────────────
 *
 * `cap` is declared in HYPERBOLIC units: no dot exceeds cap · y world
 * radius (the house 0.5 keeps landmark disks from swallowing their
 * neighborhoods near ℝ). It is removable — `cap: Infinity` draws the law
 * bare (E14: inert for quadratics at standard scales, a near-axis dust
 * band for cubics). Note a FINITE cap zeroes dots on the real axis itself
 * (y = 0 ⇒ radius 0); pictures of real roots want cap: Infinity plus a
 * δ = 0 law. The cap is applied INSIDE size() — a rule owns its cap fully —
 * NaN-safe for the Infinity·0 corner.
 */
import type { RootRow } from "./rows.ts";

export interface SizingRule {
  /** Euclidean world radius of the dot — FINAL, cap applied: a rule owns
   *  its cap fully (design.md, "sentences, not specs"); no pass caps
   *  behind the author's back. */
  size(row: RootRow): number;
  /** Hyperbolic-units cap: dot ≤ cap · y world radius. Infinity = uncapped. */
  readonly cap: number;
}

/** The house cap (hyperbolic units) — see file comment. */
export const DEFAULT_CAP = 0.5;

/** x^e specialized at construction for the lattice-point exponents —
 *  generic `**` with a non-literal exponent is a real Math.pow per dot. */
function powOf(e: number): (x: number) => number {
  if (e === 0) return () => 1;
  if (e === 0.5) return Math.sqrt;
  if (e === 1) return (x) => x;
  if (e === 2) return (x) => x * x;
  return (x) => x ** e;
}

/** The power law r = c·y^δ/|f′(z)|^γ, structure declared. */
export function powerLaw(opts: {
  c: number;
  gamma: number;
  delta: number;
  cap?: number | undefined;
}): SizingRule {
  const { c, gamma, delta } = opts;
  const cap = opts.cap ?? DEFAULT_CAP;
  const yPow = powOf(delta);
  const fpPow = powOf(gamma);
  return {
    cap,
    size: (row) => {
      let r = (c * yPow(Math.abs(row.im))) / fpPow(row.fprime);
      const capR = cap * Math.abs(row.im); // NaN when cap=∞, y=0 — comparison is then false
      if (capR < r) r = capR;
      return r;
    },
  };
}

/** The classic hyperbolic look, (γ, δ) = (1, 1): quadratic c/√|disc|
 *  hyperbolic radius; the cubic "fprime/vivid" law (same c). */
export function classic(c: number, opts: { cap?: number } = {}): SizingRule {
  return powerLaw({ c, gamma: 1, delta: 1, cap: opts.cap });
}

/** The uniformity locus, (γ, δ) = (1, ½): even ink at degrees 2 and 3.
 *  The cubic disc¼ law c′/|disc|^¼ is uniform(c′·√2). */
export function uniform(c: number, opts: { cap?: number } = {}): SizingRule {
  return powerLaw({ c, gamma: 1, delta: 0.5, cap: opts.cap });
}

/**
 * A disc-form law r = c · y^β / |disc|^α, converted into the declared f′
 * form (the file comment's per-degree identities):
 *
 *     deg 2:  |disc|^α = |f′(z)|^{2α}          ⇒ (γ, δ, c′) = (2α, β, c)
 *     deg 3:  |disc|^α = |f′(z)|^{4α}·(2y)^{−2α} ⇒ (γ, δ, c′) = (4α, β + 2α, c·4^α)
 *
 * Convenience only — think in discriminant terms, get the same declared
 * structure. Degrees beyond 3 need their own identity (arrives with the
 * degree's solver work).
 */
export function discLaw(opts: {
  alpha: number;
  beta: number;
  c: number;
  degree: 2 | 3;
  cap?: number | undefined;
}): SizingRule {
  const { alpha, beta, c, degree } = opts;
  if (degree === 2) {
    return powerLaw({ c, gamma: 2 * alpha, delta: beta, cap: opts.cap });
  }
  return powerLaw({
    c: c * 4 ** alpha,
    gamma: 4 * alpha,
    delta: beta + 2 * alpha,
    cap: opts.cap,
  });
}
