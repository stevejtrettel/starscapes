/**
 * Forward search: a region in coefficient/parameter space cuts a finite
 * piece out of a family, and we enumerate all of it. Enumeration order is
 * deterministic (odometer: parameter 0 fastest, last parameter slowest),
 * which the reproducibility promise depends on.
 *
 * Polynomials are emitted in reused coefficient batches (kernel dialect):
 * `onBatch(coeffs, count)` with stride degree + 1, valid for the duration
 * of the callback only.
 */
import type { Family } from "../family/types.ts";

export interface BoxSearch {
  readonly kind: "box";
  /** |parameter| ≤ bound, intersected with the family's own constraints. */
  readonly bound: number;
}

export function box(bound: number): BoxSearch {
  if (!Number.isInteger(bound) || bound < 1) {
    throw new Error(`box bound must be a positive integer, got ${bound}`);
  }
  return { kind: "box", bound };
}

export const DEFAULT_BATCH_CAPACITY = 4096;

/** Enumerate family ∩ box. Returns the total number of polynomials emitted. */
export function enumerateBox(
  family: Family,
  search: BoxSearch,
  onBatch: (coeffs: Float64Array, count: number) => void,
  batchCapacity = DEFAULT_BATCH_CAPACITY,
): number {
  const k = family.paramCount;
  const stride = family.degree + 1;

  // Per-parameter inclusive ranges: box ∩ family constraint.
  const lo = new Int32Array(k);
  const hi = new Int32Array(k);
  for (let j = 0; j < k; j++) {
    const [cLo, cHi] = family.paramConstraint(j);
    lo[j] = Math.max(-search.bound, cLo);
    hi[j] = Math.min(search.bound, cHi);
    if (lo[j] > hi[j]) return 0; // empty intersection
  }

  const params = Int32Array.from(lo);
  const coeffs = new Float64Array(batchCapacity * stride);
  let inBatch = 0;
  let total = 0;

  outer: for (;;) {
    family.coefficients(params, coeffs, inBatch * stride);
    inBatch++;
    total++;
    if (inBatch === batchCapacity) {
      onBatch(coeffs, inBatch);
      inBatch = 0;
    }
    // Odometer step: parameter 0 fastest.
    for (let j = 0; ; j++) {
      if (j === k) break outer;
      if (params[j] < hi[j]) {
        params[j]++;
        break;
      }
      params[j] = lo[j];
    }
  }

  if (inBatch > 0) onBatch(coeffs, inBatch);
  return total;
}
