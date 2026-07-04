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
}

export type SizeUnits = "world" | "screen" | "hyperbolic";

export interface Style {
  readonly sizeUnits: SizeUnits;
  /** Radius in the declared units. */
  size(row: RootRow): number;
  /** Writes r, g, b in [0, 1] into out[0..2]. */
  color(row: RootRow, out: Float64Array): void;
}

export type RootFilter = (row: RootRow) => boolean;

/** Keep one representative per conjugate pair (and drop real roots). */
export const upperHalfPlane: RootFilter = (row) => row.im > 0;

/**
 * The canonical starscape sizing: hyperbolic radius scale/|disc|, capped.
 * (Euclidean radius is then Im z · scale/|disc| — the renderer applies the
 * Im z factor because the units say "hyperbolic".)
 */
export function hyperbolicSize(scale: number, cap = 0.5): Pick<Style, "sizeUnits" | "size"> {
  return {
    sizeUnits: "hyperbolic",
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
