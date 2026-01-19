/**
 * Solver Interface Documentation
 * ==============================
 *
 * Solvers use GPU transform feedback to compute polynomial roots.
 * Any solver class should implement these methods:
 *
 * solve(coefficientBuffer, count)
 *   - coefficientBuffer: WebGLBuffer containing coefficients
 *   - count: number of polynomials
 *   - returns: RootBuffer { buffer, count }
 *
 * solveFromArray(coefficients)
 *   - coefficients: Float32Array of coefficients
 *   - returns: RootBuffer { buffer, count }
 *   - Convenience method that handles buffer creation
 *
 * dispose()
 *   - Clean up GPU resources
 *
 *
 * RootBuffer Format
 * =================
 * {
 *   buffer: WebGLBuffer,  // Contains [re, im, radius, discriminant, ...]
 *   count: number         // Number of roots
 * }
 */

// This file is for documentation only - no exports needed
