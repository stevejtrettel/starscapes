/**
 * Sizing rules: the size half of a style, as a pillar (design.md, Level 3 —
 * "Sizing rules in code", settled 2026-07-06).
 *
 * A sizing rule maps a root's row to the EUCLIDEAN WORLD RADIUS of its dot —
 * the size we actually draw. Rules are arbitrary functions; a rule MAY
 * additionally declare that it is a power law, and that declaration is what
 * backward search strategies derive their cutoffs from (Option A: the
 * strategy pulls; an opaque rule bound to a structure-needing strategy
 * fails loudly at bind time).
 *
 * ── The declared power-law form ──────────────────────────────────────────
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
 * δ = 0 law. The cap is applied by the style pass (stylePass.ts), NaN-safe
 * for the Infinity·0 corner.
 */
import type { RootRow } from "./style.ts";

/** The declared structure: r = c · y^δ / |f′(z)|^γ. */
export interface PowerLaw {
  readonly c: number;
  readonly gamma: number;
  readonly delta: number;
}

export interface SizingRule {
  /** Euclidean world radius of the dot, pre-cap. */
  size(row: RootRow): number;
  /** Hyperbolic-units cap: dot ≤ cap · y world radius. Infinity = uncapped. */
  readonly cap: number;
  /** Present iff the rule is the declared power law (docs above). */
  readonly power?: PowerLaw;
}

/** What a backward strategy sees of the style when binding (search/types). */
export type SizingStructure = Pick<SizingRule, "cap" | "power">;

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
    power: { c, gamma, delta },
    size: (row) => (c * yPow(Math.abs(row.im))) / fpPow(row.fprime),
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

/**
 * Option A's loud failure: a backward strategy whose cutoff derivation
 * holds for one specific law point demands exactly that point. Returns the
 * declared power law or throws with the pairing spelled out.
 */
export function requirePower(
  sizing: SizingStructure,
  gamma: number,
  delta: number,
  strategy: string,
): PowerLaw {
  const p = sizing.power;
  if (!p) {
    throw new Error(
      `${strategy}: this backward strategy derives its cutoffs from a declared ` +
        `power law r = c·y^δ/|f′(z)|^γ, but the sizing rule declares none. ` +
        `Use powerLaw/classic/uniform/discLaw, or bind the strategy to a ` +
        `reference law via its deriveFrom option (design.md, "Sizing rules in code").`,
    );
  }
  if (p.gamma !== gamma || p.delta !== delta) {
    throw new Error(
      `${strategy}: cutoff derivation holds for (γ, δ) = (${gamma}, ${delta}), ` +
        `got (${p.gamma}, ${p.delta}). Generalizing the derivation is queued ` +
        `design work; to draw this law over the reference population, pass the ` +
        `reference rule as the strategy's deriveFrom option.`,
    );
  }
  return p;
}
