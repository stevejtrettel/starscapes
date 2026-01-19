/**
 * PolynomialFamily Interface Documentation
 * ========================================
 *
 * Each family generates coefficients for a specific class of polynomials.
 * Any family class should have these properties and methods:
 *
 * Properties:
 *   name             - Human-readable name (string)
 *   degree           - Polynomial degree (number)
 *   coefficientCount - Number of coefficients per polynomial, usually degree + 1 (number)
 *
 * Methods:
 *   generate(output, maxCount)
 *     - output: Float32Array to write coefficients into
 *     - maxCount: maximum number of polynomials to generate
 *     - returns: actual number of polynomials generated (may be less than maxCount)
 *     - Coefficients are in descending order: [aₙ, aₙ₋₁, ..., a₁, a₀]
 *
 *   getTotalCount()
 *     - returns: total number of polynomials that would be generated
 */

// This file is for documentation only - no exports needed
