import { CONFIG } from '../config.js';

/**
 * Generates constrained cubic polynomials ax³ + bx² + cx + b
 * where the constant term equals the x² coefficient.
 * Parameters: a, b, c are integers in a specified range (a ≠ 0).
 *
 * Implements the PolynomialFamily interface (see families/types.js).
 */
export class ConstrainedCubicFamily {
  name = 'Constrained Cubics (ax³ + bx² + cx + b)';
  degree = 3;
  coefficientCount = 4; // [a, b, c, b] but we store [a, b, c, d] where d=b

  constructor(min, max) {
    this.min = min ?? CONFIG.COEFFICIENT_RANGE.MIN;
    this.max = max ?? CONFIG.COEFFICIENT_RANGE.MAX;
  }

  /**
   * Generate constrained cubic polynomials.
   * Format: [a, b, c, b] for ax³ + bx² + cx + b
   */
  generate(output, maxCount) {
    const { min, max } = this;
    let index = 0;

    for (let a = min; a <= max && index < maxCount; a++) {
      // Skip a = 0 (not a cubic)
      if (a === 0) continue;

      for (let b = min; b <= max && index < maxCount; b++) {
        for (let c = min; c <= max && index < maxCount; c++) {
          const offset = index * 4;
          output[offset] = a;
          output[offset + 1] = b;
          output[offset + 2] = c;
          output[offset + 3] = b; // Constraint: constant = x² coefficient
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
    // a can be anything except 0, b and c are free
    const aCount = range - (this.min <= 0 && this.max >= 0 ? 1 : 0);
    return aCount * range * range;
  }
}
