/**
 * The window: a rectangle of ℂ, the one piece of view geometry every layer
 * shares — collections march it, cameras serialize it, rasters map it to
 * pixels. Plain immutable data.
 */

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
