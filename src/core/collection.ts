/**
 * Collections: the middle stage of family → collection → solve + style
 * (design.md, Level 3 — "The collection model", settled 2026-07-06).
 *
 * A Collection turns a family into a finite bag of polynomials TO SOLVE. It
 * is coefficient-space and pre-solve: membership is decided from what is
 * known before solving — coefficients, and quantities algebraic in them. It
 * never sees a solved root and never sees a sizing law. Forward collections
 * enumerate a coefficient-space region; backward collections march a window
 * outward to a stop cutoff — a plain number the DEMO computes (from a named
 * depth-law function when the cutoff is visibility), never a law handed to
 * search.
 */
import type { Family } from "./family/types.ts";

/** Kernel-dialect sink: reused coefficient batches, stride degree + 1,
 *  valid only for the duration of the callback. */
export type BatchSink = (coeffs: Float64Array, count: number) => void;

/**
 * The ×3 visibility dust: march to 3·A_visible so sub-pixel texture
 * survives (labeled heuristic, live-sampling.md §2). Shared by every
 * backward depth-law derivation.
 */
export const DUST_FACTOR = 3;

/**
 * A finite bag of polynomials, bound to whatever cutoffs define it.
 */
export interface Collection {
  readonly family: Family;
  /**
   * Stream every member in kernel batches, deterministic order. May
   * overshoot by rounding slack (conventions.md: bounds are EPS-widened;
   * exact membership / clipping filters downstream). Returns the count
   * emitted.
   */
  collect(onBatch: BatchSink): number;
  /** The frozen provenance string, e.g. "Φ_cone(W, A = 812)" — embeds in
   *  artifacts and the live HUD. */
  describe(): string;
  /** The coverage plan's status: proved lemma or labeled heuristic. */
  readonly coverage: "proved" | "heuristic";
}
