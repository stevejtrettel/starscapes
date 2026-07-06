/**
 * The pure offline renderer: view + image + picture → developed pixels.
 * Builds the ViewInfo, calls the picture ONCE, then runs collect → solve →
 * draw → deposit → develop. Node-free — the print harness (print.ts) owns
 * files, clocks, and logging; comparison harnesses (render-diff, cap-off)
 * call this directly for raw buffers.
 */
import type { ColoringRule } from "../core/coloring.ts";
import { drawBatch } from "../core/drawPass.ts";
import type { Picture } from "../core/scene.ts";
import { DEFAULT_BATCH_CAPACITY } from "../core/search/forward.ts";
import { solveCubicBatch } from "../core/solve/cubic.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots } from "../core/solve/types.ts";
import { createRaster, depositDisk, develop, type Raster } from "../render/raster.ts";

export interface View {
  /** Center of the window in ℂ. */
  center: readonly [number, number];
  /** Vertical extent of the window in world units; width follows the image aspect. */
  height: number;
}

export interface ImageSpec {
  width: number;
  height?: number;
  compositing: "additive" | "opaque";
  supersample?: number;
}

export interface RenderResult {
  rgb: Uint8ClampedArray;
  width: number;
  height: number;
  stats: {
    polynomials: number;
    roots: number;
    drawn: number;
    /** Φ's frozen provenance — Collection.describe(). */
    population: string;
  };
  /** Derived from scene.legend's declared structure, when present. */
  legend?: string;
}

/** A legend line from a coloring rule's declared structure — the
 *  describe() philosophy applied to color (design.md, coloring rules). */
export function legendOf(rule: ColoringRule): string | undefined {
  if (rule.classes && rule.palette) {
    return rule.classes
      .map((name, k) => {
        const [r, g, b] = rule.palette![k];
        return `${name} = rgb(${r}, ${g}, ${b})`;
      })
      .join(" · ");
  }
  if (rule.scalar) {
    const { label, domain, transform } = rule.scalar;
    return `${label}: ${domain[0]} → ${domain[1]} (${transform})`;
  }
  return undefined;
}

export function render(view: View, image: ImageSpec, picture: Picture): RenderResult {
  const width = image.width;
  const imgHeight = image.height ?? width;
  const ss = image.supersample ?? 2;
  const raster: Raster = createRaster(width, imgHeight, image.compositing, ss);

  // World window → supersampled pixel coordinates.
  const worldH = view.height;
  const worldW = worldH * (width / imgHeight);
  const left = view.center[0] - worldW / 2;
  const top = view.center[1] + worldH / 2;
  const pxPerWorld = (imgHeight * ss) / worldH;

  const scene = picture({
    window: { left, top, worldW, worldH },
    worldPerPixel: worldH / imgHeight,
    height: worldH,
  });
  const degree = scene.collection.family.degree;

  const slots = allocRootSlots(DEFAULT_BATCH_CAPACITY, degree);
  let roots = 0;
  let drawn = 0;

  const polynomials = scene.collection.collect((coeffs, count) => {
    if (degree === 2) solveQuadraticBatch(coeffs, count, slots);
    else if (degree === 3) solveCubicBatch(coeffs, count, slots);
    else throw new Error(`no solver for degree ${degree} yet`);

    roots += drawBatch(coeffs, count, degree, slots, scene.draw, (re, im, rWorld, r, g, b) => {
      depositDisk(raster, (re - left) * pxPerWorld, (top - im) * pxPerWorld, rWorld * pxPerWorld, r, g, b);
      drawn++;
    });
  });

  const legend = scene.legend ? legendOf(scene.legend) : undefined;
  return {
    rgb: develop(raster),
    width,
    height: imgHeight,
    stats: { polynomials, roots, drawn, population: scene.collection.describe() },
    ...(legend !== undefined ? { legend } : {}),
  };
}
