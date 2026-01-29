import type { PolynomialFamily } from './types';
import { CONFIG } from '../config';

/**
 * A cubic family where the coefficients a,b,c,d of ax³ + bx² + cx + d
 * are given as functions of 1, 2, or 3 parameters (j, k, l).
 *
 * Supply a mapping function (j, k, l) => [a, b, c, d].
 * Parameters that aren't used can be ignored.
 */
export class ParametricCubicFamily implements PolynomialFamily {
  readonly name: string;
  readonly degree = 3;
  readonly coefficientCount = 4;

  private min: number;
  private max: number;
  private paramCount: 1 | 2 | 3;
  private mapCoeffs: (j: number, k: number, l: number) => [number, number, number, number];
  private skipZeroLeading: boolean;

  /**
   * @param name        Display name for the family
   * @param paramCount  Number of free parameters: 1, 2, or 3
   * @param mapCoeffs   Function mapping (j, k, l) to [a, b, c, d]
   * @param options     Optional: min/max range for parameters, whether to skip a=0
   */
  constructor(
    name: string,
    paramCount: 1 | 2 | 3,
    mapCoeffs: (j: number, k: number, l: number) => [number, number, number, number],
    options?: { min?: number; max?: number; skipZeroLeading?: boolean },
  ) {
    this.name = name;
    this.paramCount = paramCount;
    this.mapCoeffs = mapCoeffs;
    this.min = options?.min ?? CONFIG.COEFFICIENT_RANGE.MIN;
    this.max = options?.max ?? CONFIG.COEFFICIENT_RANGE.MAX;
    this.skipZeroLeading = options?.skipZeroLeading ?? false;
  }

  generate(output: Float32Array, maxCount: number): number {
    const { min, max, paramCount, mapCoeffs, skipZeroLeading } = this;
    let index = 0;

    const lMin = paramCount >= 3 ? min : 0;
    const lMax = paramCount >= 3 ? max : 0;
    const kMin = paramCount >= 2 ? min : 0;
    const kMax = paramCount >= 2 ? max : 0;

    for (let j = min; j <= max && index < maxCount; j++) {
      for (let k = kMin; k <= kMax && index < maxCount; k++) {
        for (let l = lMin; l <= lMax && index < maxCount; l++) {
          const [a, b, c, d] = mapCoeffs(j, k, l);

          if (skipZeroLeading && a === 0) continue;

          const offset = index * 4;
          output[offset] = a;
          output[offset + 1] = b;
          output[offset + 2] = c;
          output[offset + 3] = d;
          index++;
        }
      }
    }

    return index;
  }

  getTotalCount(): number {
    const range = this.max - this.min + 1;
    // This is an upper bound; skipZeroLeading may reduce actual count
    if (this.paramCount === 1) return range;
    if (this.paramCount === 2) return range * range;
    return range * range * range;
  }
}
