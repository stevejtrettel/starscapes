/**
 * The full lattice family: all integer polynomials of exactly the given
 * degree. Parameters are the coefficients themselves (ascending), so φ is
 * the identity. Exact degree and canonical sign are part of the definition:
 * the leading coefficient ranges over [1, ∞) — no linears hiding in the
 * quadratics, and f/−f (identical roots) enumerated once. A fully-signed
 * variant can be added when a picture needs sign to carry meaning.
 *
 * The monic sub-lattice is its own family (leading coefficient fixed at 1,
 * so it is not a parameter): degree d, d free coefficients.
 */
import type { Family } from "./types.ts";

const NAMES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** "ax^2 + bx + c"-style term list: `leading` is the x^degree term as given;
 *  lower coefficients are named from NAMES[nameFrom] downward in degree. */
function describeTerms(degree: number, leading: string, nameFrom: number): string {
  const terms: string[] = [leading];
  for (let k = degree - 1; k >= 0; k--) {
    const idx = nameFrom + (degree - 1 - k);
    const name = NAMES[idx] ?? `c${idx}`;
    const power = k === 0 ? "" : k === 1 ? "x" : `x^${k}`;
    terms.push(`${name}${power}`);
  }
  return terms.join(" + ");
}

export function integerPolynomials(opts: { degree: number }): Family {
  const { degree } = opts;
  if (!Number.isInteger(degree) || degree < 1) {
    throw new Error(`degree must be a positive integer, got ${degree}`);
  }
  const paramCount = degree + 1;
  return {
    degree,
    paramCount,
    paramConstraint(j) {
      return j === degree ? [1, Infinity] : [-Infinity, Infinity];
    },
    coefficients(params, out, outOff) {
      for (let k = 0; k < paramCount; k++) out[outOff + k] = params[k];
    },
    describe() {
      const lead = degree === 1 ? "ax" : `ax^${degree}`;
      return `integer polynomials ${describeTerms(degree, lead, 1)} of exact degree ${degree}, leading coefficient > 0`;
    },
  };
}

/** Monic integer polynomials of exactly the given degree: xᵈ + Σ aₖxᵏ.
 *  The leading 1 is part of the definition, not a parameter. */
export function monicPolynomials(opts: { degree: number }): Family {
  const { degree } = opts;
  if (!Number.isInteger(degree) || degree < 1) {
    throw new Error(`degree must be a positive integer, got ${degree}`);
  }
  return {
    degree,
    paramCount: degree,
    paramConstraint() {
      return [-Infinity, Infinity];
    },
    coefficients(params, out, outOff) {
      for (let k = 0; k < degree; k++) out[outOff + k] = params[k];
      out[outOff + degree] = 1;
    },
    describe() {
      const lead = degree === 1 ? "x" : `x^${degree}`;
      return `monic integer polynomials ${describeTerms(degree, lead, 0)}`;
    },
  };
}
