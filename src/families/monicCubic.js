import { CONFIG } from '../config.js';

/**
 * Generates monic cubic polynomials x³ + ax² + bx + c
 * where a, b, c are integers in a specified range.
 * (Leading coefficient is always 1)
 *
 * Implements the PolynomialFamily interface (see families/types.js).
 */
export class MonicCubicFamily {
  name = 'Monic Cubics';
  degree = 3;
  coefficientCount = 4; // [1, a, b, c]

  constructor(min, max) {
    this.min = min ?? CONFIG.COEFFICIENT_RANGE.MIN;
    this.max = max ?? CONFIG.COEFFICIENT_RANGE.MAX;
  }

  /**
   * Generate all monic cubic polynomials with integer coefficients in range.
   * Format: [1, a, b, c] for x³ + ax² + bx + c
   */
  generate(output, maxCount) {
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
  getTotalCount() {
    const range = this.max - this.min + 1;
    return range * range * range;
  }
}
