/**
 * Root storage: d slots per polynomial (d = degree). A polynomial's distinct
 * roots occupy its first `count` slots, each carrying a multiplicity; the
 * multiplicities over those slots always sum to d ("all roots, always").
 * Real roots have im exactly 0. Complex roots come in conjugate pairs, the
 * upper-half-plane member first. Slot order is deterministic per solver:
 * real roots ascending, then conjugate pairs ascending by real part.
 */
export interface RootSlots {
  re: Float64Array;
  im: Float64Array;
  mult: Uint8Array;
  /** Distinct-root count per polynomial. */
  count: Uint8Array;
}

export function allocRootSlots(polyCount: number, degree: number): RootSlots {
  return {
    re: new Float64Array(polyCount * degree),
    im: new Float64Array(polyCount * degree),
    mult: new Uint8Array(polyCount * degree),
    count: new Uint8Array(polyCount),
  };
}
