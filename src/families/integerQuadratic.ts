import type { PolynomialFamily } from './types';
import { CONFIG } from '../config';

/**
 * Generates quadratic polynomials ax² + bx + c
 * where a, b, c are integers in a specified range.
 */
export class IntegerQuadraticFamily implements PolynomialFamily {
  readonly name = 'Integer Quadratics';
  readonly degree = 2;
  readonly coefficientCount = 3;

  private min: number;
  private max: number;

  constructor(min?: number, max?: number) {
    this.min = min ?? CONFIG.COEFFICIENT_RANGE.MIN;
    this.max = max ?? CONFIG.COEFFICIENT_RANGE.MAX;
  }

  /**
   * Generate all integer coefficient quadratics in the range.
   * Skips a = 0 (not a quadratic).
   */
  generate(output: Float32Array, maxCount: number): number {
    const { min, max } = this;
    let index = 0;

    for (let a = min; a <= max && index < maxCount; a++) {
      // Skip a = 0 (not a valid quadratic)
      if (a === 0) continue;

      for (let b = min; b <= max && index < maxCount; b++) {
        for (let c = min; c <= max && index < maxCount; c++) {
          const offset = index * 3;
          output[offset] = a;
          output[offset + 1] = b;
          output[offset + 2] = c;
          index++;
        }
      }
    }

    return index;
  }

  /**
   * Calculate total number of polynomials that would be generated.
   */
  getTotalCount(): number {
    const range = this.max - this.min + 1;
    // All combinations minus those where a = 0
    const aCount = range - (this.min <= 0 && this.max >= 0 ? 1 : 0);
    return aCount * range * range;
  }
}
