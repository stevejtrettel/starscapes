/**
 * Interface for polynomial coefficient generators.
 * Each family generates coefficients for a specific class of polynomials.
 */
export interface PolynomialFamily {
  /** Human-readable name */
  readonly name: string;

  /** Polynomial degree */
  readonly degree: number;

  /** Number of coefficients per polynomial (degree + 1) */
  readonly coefficientCount: number;

  /**
   * Generate coefficients into a pre-allocated buffer.
   * Coefficients are in descending order: [aₙ, aₙ₋₁, ..., a₁, a₀]
   *
   * @param output Buffer to write coefficients into
   * @param maxCount Maximum number of polynomials to generate
   * @returns Actual number of polynomials generated (may be less than maxCount)
   */
  generate(output: Float32Array, maxCount: number): number;
}
