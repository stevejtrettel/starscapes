/**
 * From a starscape to an image: the one pipeline behind every print.
 *
 *     stars at least `faintest` pixels in radius, in the view (padded so
 *     that discs centred just outside still draw)  →  size  →  colour  →
 *     raster.
 *
 * The catalogue is magnitude-limited: it is complete down to the stated
 * radius and contains nothing smaller. Since sub-sample discs deposit
 * their true area (render/raster.ts), lowering `faintest` refines the
 * picture rather than changing its character; whether it converges as
 * faintest → 0 is a property of the size law (style/sizeLaw.ts).
 */
import type { Star } from "../catalogue/star.ts";
import { type View, type Window, windowOf } from "../fibre/window.ts";
import type { Starscape } from "../starscape.ts";
import { type Compositing, createRaster, depositDisc, develop } from "./raster.ts";

export interface PictureOptions {
  readonly width: number;
  readonly height?: number;
  readonly compositing?: Compositing;
  readonly supersample?: number;
  /** Radius, in pixels, of the faintest stars included. */
  readonly faintest?: number;
  /** Writes the star's colour, components in [0, 1], to rgb. Default: near-black ink. */
  readonly colour?: (star: Star, rgb: Float64Array) => void;
  /** Stars for which this returns false are not drawn. */
  readonly keep?: (star: Star) => boolean;
}

export interface Picture {
  readonly rgb: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  /** Stars drawn. */
  readonly stars: number;
}

const INK = 0.05;

/**
 * The window to enumerate so that every disc meeting W is found: W padded
 * by the largest radius a star near it can have, and kept half a pixel
 * above the real axis (below that nothing is resolvable, and a catalogue
 * may be infinite there).
 */
export function reach(scape: Starscape, W: Window, pixel: number): Window {
  let margin = scape.radiusBound(W.y1);
  margin = 1.01 * scape.radiusBound(W.y1 + margin);
  return {
    s0: W.s0 - margin,
    s1: W.s1 + margin,
    y0: Math.max(W.y0 - margin, pixel / 2),
    y1: W.y1 + margin,
  };
}

export function renderPicture(scape: Starscape, view: View, options: PictureOptions): Picture {
  const width = options.width;
  const height = options.height ?? width;
  const pixel = view.height / height;
  const raster = createRaster(width, height, options.compositing ?? "opaque", options.supersample ?? 2);

  const W = windowOf(view, width / height);
  const top = view.centre[1] + view.height / 2;
  const rgb = new Float64Array([INK, INK, INK]);
  let stars = 0;

  scape.stars((options.faintest ?? 0.25) * pixel)(reach(scape, W, pixel), (star) => {
    if (options.keep && !options.keep(star)) return;
    options.colour?.(star, rgb);
    depositDisc(
      raster,
      (star.s - W.s0) / pixel,
      (top - star.y) / pixel,
      scape.radius(star) / pixel,
      rgb[0], rgb[1], rgb[2],
    );
    stars++;
  });

  return { rgb: develop(raster), width, height, stars };
}
