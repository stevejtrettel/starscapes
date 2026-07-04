/**
 * Polynomials as coefficient slices of Float64Array, in ASCENDING order:
 * coeffs[off + k] is a_k, the coefficient of x^k, as in f = Σ a_k x^k.
 * Display order (printing) is descending, as written on paper — see format().
 */

/** Degree = index of the highest nonzero coefficient; -1 for the zero polynomial. */
export function degreeOf(coeffs: Float64Array, off = 0, len = coeffs.length - off): number {
  for (let k = len - 1; k >= 0; k--) {
    if (coeffs[off + k] !== 0) return k;
  }
  return -1;
}

/** f(x) for real x, by Horner. `len` = number of coefficients (degree + 1). */
export function evalReal(coeffs: Float64Array, x: number, off = 0, len = coeffs.length - off): number {
  let acc = 0;
  for (let k = len - 1; k >= 0; k--) acc = acc * x + coeffs[off + k];
  return acc;
}

/** f'(x) for real x, by Horner on the derivative's coefficients (k+1)·a_{k+1}. */
export function evalDerivReal(coeffs: Float64Array, x: number, off = 0, len = coeffs.length - off): number {
  let acc = 0;
  for (let k = len - 1; k >= 1; k--) acc = acc * x + k * coeffs[off + k];
  return acc;
}

/**
 * f(z) for complex z = re + i·im, by Horner. Writes [Re f(z), Im f(z)]
 * into out[outOff], out[outOff + 1].
 */
export function evalComplex(
  coeffs: Float64Array, re: number, im: number,
  out: Float64Array, outOff = 0,
  off = 0, len = coeffs.length - off,
): void {
  let ar = 0;
  let ai = 0;
  for (let k = len - 1; k >= 0; k--) {
    const r = ar * re - ai * im + coeffs[off + k];
    ai = ar * im + ai * re;
    ar = r;
  }
  out[outOff] = ar;
  out[outOff + 1] = ai;
}

/** |f(z)|² for complex z — the residual used in tests and honesty checks. */
export function residual2(
  coeffs: Float64Array, re: number, im: number,
  off = 0, len = coeffs.length - off,
): number {
  let ar = 0;
  let ai = 0;
  for (let k = len - 1; k >= 0; k--) {
    const r = ar * re - ai * im + coeffs[off + k];
    ai = ar * im + ai * re;
    ar = r;
  }
  return ar * ar + ai * ai;
}

/**
 * Divide f by (x − r), writing the quotient's coefficients (ascending) into
 * `out`. The quotient has len − 1 coefficients. Returns the remainder f(r).
 */
export function deflateByRoot(
  coeffs: Float64Array, r: number,
  out: Float64Array, outOff = 0,
  off = 0, len = coeffs.length - off,
): number {
  let acc = coeffs[off + len - 1];
  for (let k = len - 2; k >= 0; k--) {
    out[outOff + k] = acc;
    acc = acc * r + coeffs[off + k];
  }
  return acc;
}

/** Descending-order display, as written on paper: "x^3 - 2x + 1". */
export function format(coeffs: Float64Array, off = 0, len = coeffs.length - off): string {
  const parts: string[] = [];
  for (let k = len - 1; k >= 0; k--) {
    const a = coeffs[off + k];
    if (a === 0) continue;
    const sign = a < 0 ? "-" : parts.length === 0 ? "" : "+";
    const mag = Math.abs(a);
    const coef = mag === 1 && k > 0 ? "" : String(mag);
    const power = k === 0 ? "" : k === 1 ? "x" : `x^${k}`;
    parts.push(`${sign}${sign && parts.length > 0 ? " " : ""}${coef}${power}`);
  }
  return parts.length === 0 ? "0" : parts.join(" ");
}
