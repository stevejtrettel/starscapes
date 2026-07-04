/**
 * A family is a specification of an infinite set of polynomials: a map φ
 * from integer parameters to coefficient vectors, plus the constraints that
 * define membership. Search strategies (forward boxes, the inverse sampler)
 * select finite pieces of it; the family itself is the mathematical object.
 */
export interface Family {
  readonly degree: number;
  readonly paramCount: number;
  /**
   * Intrinsic constraint on parameter j, as an inclusive range (±Infinity
   * when unconstrained). Search regions intersect with these — e.g. exact
   * degree and canonical sign appear as a leading-parameter range [1, ∞).
   */
  paramConstraint(j: number): [number, number];
  /** φ: write the coefficients (ascending) of the polynomial at `params`. */
  coefficients(params: Int32Array, out: Float64Array, outOff: number): void;
  /** Human-readable, descending display order — used in metadata and HUDs. */
  describe(): string;
}
