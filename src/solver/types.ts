import type { RootBuffer } from '../render/diskRenderer';

/**
 * Interface for polynomial root solvers.
 * Solvers use GPU transform feedback to compute roots.
 */
export interface Solver {
  /**
   * Solve for roots from a WebGL buffer of coefficients.
   *
   * @param coefficientBuffer Buffer containing coefficients
   * @param count Number of polynomials
   * @returns RootBuffer with solved roots
   */
  solve(coefficientBuffer: WebGLBuffer, count: number): RootBuffer;

  /**
   * Solve for roots from a Float32Array of coefficients.
   * Convenience method that handles buffer creation.
   *
   * @param coefficients Array of coefficients
   * @returns RootBuffer with solved roots
   */
  solveFromArray(coefficients: Float32Array): RootBuffer;

  /**
   * Clean up GPU resources.
   */
  dispose(): void;
}
