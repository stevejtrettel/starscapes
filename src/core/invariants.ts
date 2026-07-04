/**
 * Invariants: pure functions of a polynomial, computed once per polynomial
 * and visible to style and filter functions. Exact while inputs are exact
 * integers with intermediates below 2⁵³ (see conventions.md).
 */

/** Discriminant, degrees 2 and 3 (higher degrees arrive with their solver). */
export function discriminant(coeffs: Float64Array, off: number, degree: number): number {
  if (degree === 2) {
    const c = coeffs[off];
    const b = coeffs[off + 1];
    const a = coeffs[off + 2];
    return b * b - 4 * a * c;
  }
  if (degree === 3) {
    const d = coeffs[off];
    const c = coeffs[off + 1];
    const b = coeffs[off + 2];
    const a = coeffs[off + 3];
    return (
      18 * a * b * c * d - 4 * b * b * b * d + b * b * c * c
      - 4 * a * c * c * c - 27 * a * a * d * d
    );
  }
  throw new Error(`discriminant: unsupported degree ${degree}`);
}

/** Naive height: max |coefficient|. */
export function height(coeffs: Float64Array, off: number, len: number): number {
  let h = 0;
  for (let k = 0; k < len; k++) {
    const a = Math.abs(coeffs[off + k]);
    if (a > h) h = a;
  }
  return h;
}
