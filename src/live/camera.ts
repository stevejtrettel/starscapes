/**
 * Camera moves. The camera is a View (fibre/window.ts) — immutable data —
 * and the two interactions are pure functions of it. Screen coordinates
 * are CSS pixels, origin top-left, y down.
 */
import type { View } from "../fibre/window.ts";

/** The point of ℂ under a screen pixel. */
export function pixelToWorld(
  view: View, px: number, py: number, viewportW: number, viewportH: number,
): [re: number, im: number] {
  const pixel = view.height / viewportH;
  return [view.centre[0] + (px - viewportW / 2) * pixel, view.centre[1] - (py - viewportH / 2) * pixel];
}

/** Drag by (dx, dy) pixels: the picture follows the cursor. */
export function pan(view: View, dx: number, dy: number, viewportH: number): View {
  const pixel = view.height / viewportH;
  return { centre: [view.centre[0] - dx * pixel, view.centre[1] + dy * pixel], height: view.height };
}

/** Zoom by `factor` (> 1 zooms in), keeping the point under the cursor fixed. */
export function zoomAt(
  view: View, factor: number, px: number, py: number, viewportW: number, viewportH: number,
): View {
  const [re, im] = pixelToWorld(view, px, py, viewportW, viewportH);
  const height = view.height / factor;
  const pixel = height / viewportH;
  return { centre: [re - (px - viewportW / 2) * pixel, im + (py - viewportH / 2) * pixel], height };
}
