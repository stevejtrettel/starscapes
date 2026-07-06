/**
 * The authoring surface (design.md, Level 3 — "sentences, not specs"): a
 * Scene is a collection plus ONE per-polynomial draw function — the
 * mathematician's sentence, with laws and colorings as values used inside
 * it, filters as ifs, and zero-or-more dots per root as how many times you
 * call `dot`. A Picture is a Scene as a function of the view, so zoom laws
 * (E9 constant ink) and depth derivations appear as visible formulas in the
 * demo; print calls picture(view) once, live calls it per camera move.
 */

import type { Collection } from "./collection.ts";
import type { ColoringRule } from "./coloring.ts";
import type { PolyRow, RootRow } from "./rows.ts";
import type { Window } from "./window.ts";

/**
 * Emit one dot at a root. Five scalars (settled 2026-07-06): zero
 * allocation in the hottest loop; a coloring rule is used with an
 * author-owned scratch — `rule.color(root, rgb); dot(root, r, rgb[0],
 * rgb[1], rgb[2])`. Non-finite or ≤ 0 radii are dropped here (a multiple
 * root under an uncapped power law has |f′(z)| = 0 ⇒ radius ∞ — flagged by
 * dropping, never drawn).
 */
export type Dot = (at: RootRow, rWorld: number, r: number, g: number, b: number) => void;

export interface Scene {
  readonly collection: Collection;
  /** The sentence: per-polynomial filters are ifs BEFORE the root loop
   *  (decided once); per-root filters and sizing live inside it. */
  draw(poly: PolyRow, dot: Dot): void;
  /** Optional: the coloring rule, so print/HUD derive a legend from its
   *  declared classes/scalar structure. */
  readonly legend?: ColoringRule;
}

/** What a Picture sees of the view — pure geometry. */
export interface ViewInfo {
  /** The view's window, unfattened — collections add their own escape pad. */
  readonly window: Window;
  /** World units per OUTPUT pixel (live: CSS px; print: image px, not
   *  supersampled) — the visibility threshold. */
  readonly worldPerPixel: number;
  /** = window.worldH; redundant, but constant-ink formulas read better. */
  readonly height: number;
}

export type Picture = (view: ViewInfo) => Scene;
