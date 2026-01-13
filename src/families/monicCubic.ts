import type { PolynomialFamily } from './types';
import { CONFIG } from '../config';

/**
 * Generates monic cubic polynomials x³ + ax² + bx + c
 * where a, b, c are integers in a specified range.
 * (Leading coefficient is always 1)
 */
export class MonicCubicFamily implements PolynomialFamily {
  readonly name = 'Monic Cubics';
  readonly degree = 3;
  readonly coefficientCount = 4; // [1, a, b, c]

  private min: number;
  private max: number;

  constructor(min?: number, max?: number) {
    this.min = min ?? CONFIG.COEFFICIENT_RANGE.MIN;
    this.max = max ?? CONFIG.COEFFICIENT_RANGE.MAX;
  }

  /**
   * Generate all monic cubic polynomials with integer coefficients in range.
   * Format: [1, a, b, c] for x³ + ax² + bx + c
   */
  generate(output: Float32Array, maxCount: number): number {
    const { min, max } = this;
    let index = 0;

    for (let a = min; a <= max && index < maxCount; a++) {
      for (let b = min; b <= max && index < maxCount; b++) {
        for (let c = min; c <= max && index < maxCount; c++) {
          const offset = index * 4;
          output[offset] = 1;     // Leading coefficient (monic)
          output[offset + 1] = a;
          output[offset + 2] = b;
          output[offset + 3] = c;
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
    return range * range * range;
  }
}
