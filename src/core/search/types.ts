/**
 * Search strategies: the population contract as code (design.md, Level 3 —
 * "Search strategies in code"). Two types split HOW WE CHOOSE from WHAT GOT
 * CHOSEN: a SearchStrategy is one precise answer to "which polynomials of
 * the family belong to this picture"; binding it to a view derives every
 * cutoff (nothing dialed) and yields the Population Φ — the finite set the
 * picture draws. The interface is family-generic; implementations are
 * per-family derivations (see cone.ts, coneMonicCubic.ts).
 */
import type { Family } from "../family/types.ts";
import type { SizingStructure } from "../sizing.ts";

/** A window on ℂ: left/top corner plus world extents. */
export interface Window {
  left: number;
  top: number;
  worldW: number;
  worldH: number;
}

/** Fatten a window by `pad` on every side, so dots centered just outside
 *  the view still get drawn. */
export function fattenWindow(w: Window, pad: number): Window {
  return {
    left: w.left - pad,
    top: w.top + pad,
    worldW: w.worldW + 2 * pad,
    worldH: w.worldH + 2 * pad,
  };
}

/**
 * The ×3 visibility dust: march to 3·A_visible so sub-pixel texture
 * survives (labeled heuristic, live-sampling.md §2). Shared by every
 * backward strategy's depth derivation.
 */
export const DUST_FACTOR = 3;

/**
 * What a strategy sees when binding. Carries the style's sizing structure
 * as well as the window: derived depth is style-dependent through
 * visibility. Populations are view- AND style-dependent by design
 * (Φ_visible), not by leak. Strategies that derive from size structure
 * pull the declared power law via requirePower (sizing.ts, Option A) and
 * fail loudly when it is absent or the wrong point.
 */
export interface ViewContext {
  /** The view's window, unfattened — strategies add their own escape pad. */
  readonly window: Window;
  /** World units per output pixel (h / viewportH): the visibility threshold. */
  readonly worldPerPixel: number;
  /** The style's sizing structure: cap + declared power law, if any. */
  readonly sizing: SizingStructure;
}

/** Kernel-dialect sink: reused coefficient batches, stride degree + 1,
 *  valid only for the duration of the callback. */
export type BatchSink = (coeffs: Float64Array, count: number) => void;

/**
 * Φ itself, finite and bound: what one picture draws.
 */
export interface Population {
  /** The frozen provenance string, e.g. "Φ_cone(W, A = 812)" — embeds in
   *  artifacts and the live HUD. */
  describe(): string;
  /**
   * Stream every member in kernel batches, deterministic order. May
   * overshoot by rounding slack (conventions.md: bounds are EPS-widened;
   * exact membership / clipping filters downstream). Returns the count
   * emitted.
   */
  enumerate(onBatch: BatchSink): number;
  /** The coverage plan's status: proved lemma or labeled heuristic. */
  readonly coverage: "proved" | "heuristic";
}

/**
 * The first-class citizen. Forward strategies cut a region out of
 * coefficient space and ignore the window; backward strategies start from
 * the window in root space. The picture spec stores strategy + dials
 * alongside the view — the camera is single-sourced, and the live explorer
 * is honestly "regenerate Φ on every camera move."
 */
export interface SearchStrategy {
  readonly mode: "forward" | "backward";
  readonly family: Family;
  /** Bind to a view: derive every cutoff, return the concrete Φ. */
  populationFor(view: ViewContext): Population;
}
