/**
 * Styles: what a picture draws per root — a sizing rule (sizing.ts, the
 * settled pillar) plus a color function. A RootRow is a zero-allocation
 * cursor over one root — the pipeline reuses a single mutable row, so
 * style and filter functions must read, never retain it.
 */
import type { SizingRule } from "./sizing.ts";

export interface RootRow {
  readonly degree: number;
  readonly re: number;
  readonly im: number;
  readonly mult: number;
  readonly disc: number;
  /** |f′(z)| at this root — |a_d|·∏|z − w| over the co-roots; 0 at a
   *  multiple root. The power-law sizing coordinate (sizing.ts).
   *  Filled after filters run (it is the style pass's one real per-root
   *  cost and most roots get filtered): sizing/color read it, filters see
   *  NaN. Revisit if a filter ever needs it. */
  readonly fprime: number;
  readonly height: number;
  /** Irreducible over ℚ (exact — see invariants.ts). */
  readonly irreducible: boolean;
}

/** The pipeline's reused cursor — the one writer of a RootRow. */
export type MutableRootRow = { -readonly [K in keyof RootRow]: RootRow[K] };

export interface Style {
  /** The size half: Euclidean world radius + hyperbolic cap (sizing.ts). */
  readonly sizing: SizingRule;
  /** Writes r, g, b in [0, 1] into out[0..2]. */
  color(row: RootRow, out: Float64Array): void;
}

export type RootFilter = (row: RootRow) => boolean;

/** Keep one representative per conjugate pair (and drop real roots). */
export const upperHalfPlane: RootFilter = (row) => row.im > 0;

/** Exclude reducible polynomials — e.g. the quadratic starscape embedded in
 *  the cubic one via (linear)·(quadratic) factorizations. */
export const irreducibleOnly: RootFilter = (row) => row.irreducible;

/** Solid-color helper. */
export function solid(r: number, g: number, b: number): Style["color"] {
  return (_row, out) => {
    out[0] = r;
    out[1] = g;
    out[2] = b;
  };
}
