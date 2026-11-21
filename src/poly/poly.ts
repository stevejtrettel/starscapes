/**
 * Real polynomials as coefficient vectors, ascending:
 *
 *     f = Σ f[k] xᵏ,      deg f = f.length − 1.
 *
 * Ascending order makes every textbook formula transcribe by subscript.
 * Complex numbers are passed as (re, im) pairs and returned through small
 * out-arrays, so nothing here allocates per call.
 */

export type Poly = ArrayLike<number>;

/** Index of the highest nonzero coefficient; −1 for the zero polynomial. */
export function degree(f: Poly): number {
  let k = f.length - 1;
  while (k >= 0 && f[k] === 0) k--;
  return k;
}

/** f(x) for real x. */
export function evalReal(f: Poly, x: number): number {
  let acc = 0;
  for (let k = f.length - 1; k >= 0; k--) acc = acc * x + f[k];
  return acc;
}

/**
 * f(z) and f′(z) at z = s + iy, by one Horner pass:
 * out = [Re f, Im f, Re f′, Im f′].
 */
export function evalJet(f: Poly, s: number, y: number, out: Float64Array): void {
  let pr = 0;
  let pi = 0;
  let dr = 0;
  let di = 0;
  for (let k = f.length - 1; k >= 0; k--) {
    // f′ ← f′·z + f  (uses the value of f before this step), then f ← f·z + f[k]
    const tr = dr * s - di * y + pr;
    di = dr * y + di * s + pi;
    dr = tr;
    const ur = pr * s - pi * y + f[k];
    pi = pr * y + pi * s;
    pr = ur;
  }
  out[0] = pr;
  out[1] = pi;
  out[2] = dr;
  out[3] = di;
}

/** The derivative f′. */
export function derivative(f: Poly): number[] {
  const out: number[] = [];
  for (let k = 1; k < f.length; k++) out.push(k * f[k]);
  return out;
}

/** The Taylor shift x ↦ f(x + t), by repeated synthetic division. */
export function shift(f: Poly, t: number): number[] {
  const g = Array.from(f);
  const n = g.length;
  for (let i = 0; i < n - 1; i++) {
    for (let k = n - 2; k >= i; k--) g[k] += t * g[k + 1];
  }
  return g;
}

/** Naive height: max |coefficient|. */
export function height(f: Poly): number {
  let h = 0;
  for (let k = 0; k < f.length; k++) h = Math.max(h, Math.abs(f[k]));
  return h;
}

/** As written on paper, highest power first: "2x^3 - x + 1". */
export function format(f: Poly): string {
  const parts: string[] = [];
  for (let k = f.length - 1; k >= 0; k--) {
    const a = f[k];
    if (a === 0) continue;
    const sign = a < 0 ? "-" : parts.length === 0 ? "" : "+";
    const mag = Math.abs(a);
    const coef = mag === 1 && k > 0 ? "" : String(mag);
    const power = k === 0 ? "" : k === 1 ? "x" : `x^${k}`;
    parts.push(`${sign}${sign && parts.length > 0 ? " " : ""}${coef}${power}`);
  }
  return parts.length === 0 ? "0" : parts.join(" ");
}
