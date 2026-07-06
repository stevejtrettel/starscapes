/**
 * Styles: arbitrary user functions from a root's data to visual channels.
 * A RootRow is a zero-allocation cursor over one root — the pipeline reuses
 * a single mutable row, so style functions must read, never retain it.
 * Sizes carry declared units (design.md Level 1).
 */

export interface RootRow {
  readonly degree: number;
  readonly re: number;
  readonly im: number;
  readonly mult: number;
  readonly disc: number;
  readonly height: number;
  /** Irreducible over ℚ (exact — see invariants.ts). */
  readonly irreducible: boolean;
}

/** The pipeline's reused cursor — the one writer of a RootRow. */
export type MutableRootRow = { -readonly [K in keyof RootRow]: RootRow[K] };

export type SizeUnits = "world" | "screen" | "hyperbolic";

export interface Style {
  readonly sizeUnits: SizeUnits;
  /**
   * Declared scale constant c of the size law, when the style has one.
   * Backward search strategies derive their visibility depth from it —
   * declared structure buys derivation (design.md Level 3). Styles without
   * one still render under forward searches.
   */
  readonly sizeScale?: number;
  /** Radius in the declared units. */
  size(row: RootRow): number;
  /** Writes r, g, b in [0, 1] into out[0..2]. */
  color(row: RootRow, out: Float64Array): void;
}

export type RootFilter = (row: RootRow) => boolean;

/** Keep one representative per conjugate pair (and drop real roots). */
export const upperHalfPlane: RootFilter = (row) => row.im > 0;

/** Exclude reducible polynomials — e.g. the quadratic starscape embedded in
 *  the cubic one via (linear)·(quadratic) factorizations. */
export const irreducibleOnly: RootFilter = (row) => row.irreducible;

/**
 * The canonical starscape sizing: hyperbolic radius scale/|disc|, capped.
 * (Euclidean radius is then Im z · scale/|disc| — the renderer applies the
 * Im z factor because the units say "hyperbolic".)
 */
export function hyperbolicSize(
  scale: number, cap = 0.5,
): Pick<Style, "sizeUnits" | "sizeScale" | "size"> {
  return {
    sizeUnits: "hyperbolic",
    sizeScale: scale,
    size: (row) => Math.min(cap, scale / Math.abs(row.disc)),
  };
}

/** Solid-color helper. */
export function solid(r: number, g: number, b: number): Style["color"] {
  return (_row, out) => {
    out[0] = r;
    out[1] = g;
    out[2] = b;
  };
}
