/**
 * Reader views: convenient object access over the flat kernel structures.
 * For tests, debugging, and any code that isn't a hot loop. Storage truth is
 * flat; these are trivial derivations of it, so they cannot drift.
 */
import { format } from "./polynomial.ts";
import type { RootSlots } from "./solve/types.ts";

export interface PolyView {
  readonly degree: number;
  /** Ascending: coeffs[k] is the coefficient of x^k. */
  readonly coeffs: number[];
  toString(): string;
}

/** The i-th polynomial of a coefficient batch with the given stride (degree + 1). */
export function polyAt(coeffs: Float64Array, degree: number, i: number): PolyView {
  const off = i * (degree + 1);
  const slice = Array.from(coeffs.subarray(off, off + degree + 1));
  return {
    degree,
    coeffs: slice,
    toString: () => format(coeffs, off, degree + 1),
  };
}

export interface RootView {
  readonly re: number;
  readonly im: number;
  readonly mult: number;
}

/** The distinct roots of the i-th degree-d polynomial in a RootSlots. */
export function rootsAt(slots: RootSlots, degree: number, i: number): RootView[] {
  const base = i * degree;
  const out: RootView[] = [];
  for (let k = 0; k < slots.count[i]; k++) {
    out.push({ re: slots.re[base + k], im: slots.im[base + k], mult: slots.mult[base + k] });
  }
  return out;
}
