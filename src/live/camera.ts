/**
 * The explorer camera: a window on ℂ, identical in meaning to the offline
 * View — center plus vertical extent, width following the viewport aspect.
 * Plain immutable data (it serializes straight into a saved recipe), with
 * pure functions for the two interactions.
 */

export interface Camera {
  readonly centerRe: number;
  readonly centerIm: number;
  /** Vertical extent of the window in world units. */
  readonly height: number;
}

/** World units per CSS pixel at the current viewport height. */
export function worldPerPixel(camera: Camera, viewportH: number): number {
  return camera.height / viewportH;
}

/** Screen pixel (origin top-left, y down) → point of ℂ. */
export function pixelToWorld(
  camera: Camera, px: number, py: number, viewportW: number, viewportH: number,
): { re: number; im: number } {
  const w = worldPerPixel(camera, viewportH);
  return {
    re: camera.centerRe + (px - viewportW / 2) * w,
    im: camera.centerIm - (py - viewportH / 2) * w,
  };
}

/** Drag by (dxPx, dyPx) screen pixels: the picture follows the cursor. */
export function pan(
  camera: Camera, dxPx: number, dyPx: number, viewportH: number,
): Camera {
  const w = worldPerPixel(camera, viewportH);
  return {
    centerRe: camera.centerRe - dxPx * w,
    centerIm: camera.centerIm + dyPx * w,
    height: camera.height,
  };
}

/**
 * Zoom by `factor` (> 1 zooms in) keeping the world point under the cursor
 * fixed — the invariant that makes zooming feel like diving toward a spot.
 */
export function zoomAt(
  camera: Camera, factor: number,
  px: number, py: number, viewportW: number, viewportH: number,
): Camera {
  const anchor = pixelToWorld(camera, px, py, viewportW, viewportH);
  const height = camera.height / factor;
  const w = height / viewportH;
  return {
    centerRe: anchor.re - (px - viewportW / 2) * w,
    centerIm: anchor.im + (py - viewportH / 2) * w,
    height,
  };
}
