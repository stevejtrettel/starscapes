/**
 * The full lattice family: all integer polynomials of exactly the given
 * degree. Parameters are the coefficients themselves (ascending), so φ is
 * the identity. Exact degree and canonical sign are part of the definition:
 * the leading coefficient ranges over [1, ∞) — no linears hiding in the
 * quadratics, and f/−f (identical roots) enumerated once. A fully-signed
 * variant can be added when a picture needs sign to carry meaning.
 */
import type { Family } from "./types.ts";

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
      const names = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const terms: string[] = [];
      for (let k = degree; k >= 0; k--) {
        const name = names[degree - k] ?? `c${degree - k}`;
        const power = k === 0 ? "" : k === 1 ? "x" : `x^${k}`;
        terms.push(`${name}${power}`);
      }
      return `integer polynomials ${terms.join(" + ")} of exact degree ${degree}, leading coefficient > 0`;
    },
  };
}
