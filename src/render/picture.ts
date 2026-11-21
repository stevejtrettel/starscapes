/**
 * From a starscape to an image: the one pipeline behind every print.
 *
 *     stars at least `faintest` pixels in radius whose discs meet the
 *     view  →  size  →  colour  →  raster.
 *
 * The catalogue is magnitude-limited: it is complete down to the stated
 * radius and contains nothing smaller. Since sub-sample discs deposit
 * their true area (render/raster.ts), lowering `faintest` refines the
 * picture rather than changing its character; whether it converges as
 * faintest → 0 is a property of the size law (style/sizeLaw.ts).
 */
import type { Star } from "../catalogue/star.ts";
import { type View, type Window, windowOf } from "../fibre/window.ts";
import { keeps, lawAt, type Recipe } from "../recipe.ts";
import { type Starscape, starscape } from "../starscape.ts";
import { paint } from "../style/colour.ts";
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

/** One step of a picture: the stars with rMin ≤ natural radius < rMax, to be sought in `window`. */
export interface Step {
  readonly rMin: number;
  readonly rMax: number;
  readonly window: Window;
}

/**
 * The plan of a picture of W at the given pixel size: the stars of radius
 * at least `faintest` pixels whose discs can meet W, cut into shells
 * [r, 2r) by radius, largest first.
 *
 * A disc centred outside W can still reach into it, so each shell is
 * sought in W enlarged by that shell's largest radius — a wide margin for
 * the few large stars, a negligible one for the many small. (One margin
 * for all, the largest, would at deep zoom enumerate a region many times
 * the view.) Re-deriving each shell separately costs a bounded factor,
 * since the population grows like a power of 1/r.
 *
 * Windows stay half a pixel above the real axis: below that nothing is
 * resolvable, and a catalogue may be infinite there.
 *
 * A finite family (a box, a ball, a plane) has no such structure: its
 * catalogue is enumerated whole whatever the radii, and the only general
 * bound on a radius is the cap. For these the margin is limited to half
 * the height of W — a disc centred farther outside is not drawn — since
 * otherwise a deep zoom would enumerate everything within the largest
 * conceivable radius of the view.
 */
export function plan(scape: Starscape, W: Window, pixel: number, faintest: number): Step[] {
  const rMin = faintest * pixel;
  // The largest radius of any star whose disc meets W: r ≤ radiusBound(y) at height y ≤ y₁ + r.
  let largest = scape.radiusBound(W.y1);
  largest = 1.01 * scape.radiusBound(W.y1 + largest);

  const maxMargin = scape.population === null ? (W.y1 - W.y0) / 2 : Infinity;
  const step = (lo: number, hi: number): Step => {
    const margin = Math.min(hi, largest, maxMargin);
    return {
      rMin: lo,
      rMax: hi,
      window: { s0: W.s0 - margin, s1: W.s1 + margin, y0: Math.max(W.y0 - margin, pixel / 2), y1: W.y1 + margin },
    };
  };
  if (scape.population === null) return [step(rMin, Infinity)];

  const steps: Step[] = [];
  const count = Math.max(1, Math.ceil(Math.log2(largest / rMin)));
  for (let k = count - 1; k >= 0; k--) {
    steps.push(step(rMin * 2 ** k, k === count - 1 ? Infinity : rMin * 2 ** (k + 1)));
  }
  return steps;
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

  const draw = (star: Star): void => {
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
  };
  for (const step of plan(scape, W, pixel, options.faintest ?? 0.25)) {
    scape.stars(step.rMin, step.rMax)(step.window, draw);
  }

  return { rgb: develop(raster), width, height, stars };
}

/**
 * A recipe as an image of the given size: the size law is taken at the
 * image's pixel size (recipe.ts), so the picture carries the same ink at
 * any resolution.
 */
export function renderRecipe(
  recipe: Recipe,
  size: { width: number; height?: number; compositing?: Compositing; supersample?: number },
): Picture {
  const height = size.height ?? size.width;
  const scape = starscape({ family: recipe.spec.family, law: lawAt(recipe, recipe.view.height / height) });
  return renderPicture(scape, recipe.view, {
    ...size,
    height,
    faintest: recipe.faintest,
    colour: paint(recipe.colouring),
    keep: keeps(recipe),
  });
}
