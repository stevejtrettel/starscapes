/**
 * The offline pipeline: family ∩ search → solve → invariants → filters →
 * style → deposit → develop. A print script calls renderPrint with a
 * specification that reads like the picture's description; this file is the
 * interpreter. (Node-free: the caller writes the developed image out.)
 */
import type { Family } from "../core/family/types.ts";
import { cubicIrreducible, discriminant, height, quadraticIrreducible } from "../core/invariants.ts";
import { type BoxSearch, DEFAULT_BATCH_CAPACITY, enumerateBox } from "../core/search/forward.ts";
import { harvestQuadratics, type InverseSearch } from "../core/search/inverse.ts";
import type { Population, SearchStrategy } from "../core/search/types.ts";
import { solveCubicBatch } from "../core/solve/cubic.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots } from "../core/solve/types.ts";
import type { MutableRootRow, RootFilter, Style } from "../core/style.ts";
import { createRaster, depositDisk, develop, type Raster } from "../render/raster.ts";

export interface View {
  /** Center of the window in ℂ. */
  center: readonly [number, number];
  /** Vertical extent of the window in world units; width follows the image aspect. */
  height: number;
}

export interface PrintSpec {
  /** Required for box/inverse searches; a SearchStrategy brings its own. */
  family?: Family;
  search: BoxSearch | InverseSearch | SearchStrategy;
  filters?: RootFilter[];
  style: Style;
  view: View;
  image: {
    width: number;
    height?: number;
    compositing: "additive" | "opaque";
    supersample?: number;
  };
}

export interface PrintResult {
  rgb: Uint8ClampedArray;
  width: number;
  height: number;
  stats: {
    polynomials: number;
    roots: number;
    drawn: number;
    /** Φ's frozen provenance (strategy searches only). */
    population?: string;
  };
}

export function renderPrint(spec: PrintSpec): PrintResult {
  const family = "mode" in spec.search ? spec.search.family : spec.family;
  if (!family) throw new Error("box/inverse searches need spec.family");
  const { style } = spec;
  const degree = family.degree;
  const stride = degree + 1;
  const filters = spec.filters ?? [];

  const width = spec.image.width;
  const imgHeight = spec.image.height ?? width;
  const ss = spec.image.supersample ?? 2;
  const raster: Raster = createRaster(width, imgHeight, spec.image.compositing, ss);

  // World window → supersampled pixel coordinates.
  const worldH = spec.view.height;
  const worldW = worldH * (width / imgHeight);
  const left = spec.view.center[0] - worldW / 2;
  const top = spec.view.center[1] + worldH / 2;
  const pxPerWorld = (imgHeight * ss) / worldH;

  const slots = allocRootSlots(DEFAULT_BATCH_CAPACITY, degree);
  const colorOut = new Float64Array(3);

  // The reused row cursor (style functions read, never retain — see style.ts).
  const row: MutableRootRow = {
    degree,
    re: 0,
    im: 0,
    mult: 0,
    disc: 0,
    height: 0,
    irreducible: true,
  };
  const realRoots = new Float64Array(degree);

  let roots = 0;
  let drawn = 0;

  const onBatch = (coeffs: Float64Array, count: number) => {
    if (degree === 2) solveQuadraticBatch(coeffs, count, slots);
    else if (degree === 3) solveCubicBatch(coeffs, count, slots);
    else throw new Error(`no solver for degree ${degree} yet`);

    for (let i = 0; i < count; i++) {
      const off = i * stride;
      row.disc = discriminant(coeffs, off, degree);
      row.height = height(coeffs, off, stride);
      const base = i * degree;

      if (degree === 2) {
        row.irreducible = quadraticIrreducible(row.disc);
      } else {
        // Gather the polynomial's real roots for the rational-root test.
        let nReal = 0;
        for (let k = 0; k < slots.count[i]; k++) {
          if (slots.im[base + k] === 0) realRoots[nReal++] = slots.re[base + k];
        }
        row.irreducible = cubicIrreducible(coeffs, off, realRoots, nReal);
      }

      slot: for (let k = 0; k < slots.count[i]; k++) {
        roots++;
        row.re = slots.re[base + k];
        row.im = slots.im[base + k];
        row.mult = slots.mult[base + k];
        for (const keep of filters) if (!keep(row)) continue slot;

        // Declared units → Euclidean world radius.
        let rWorld = style.size(row);
        if (style.sizeUnits === "hyperbolic") rWorld *= Math.abs(row.im);
        const rPx = style.sizeUnits === "screen" ? rWorld * ss : rWorld * pxPerWorld;
        if (rPx <= 0) continue;

        style.color(row, colorOut);
        const cx = (row.re - left) * pxPerWorld;
        const cy = (top - row.im) * pxPerWorld;
        depositDisk(raster, cx, cy, rPx, colorOut[0], colorOut[1], colorOut[2]);
        drawn++;
      }
    }
  };

  let polynomials: number;
  let population: Population | undefined;
  if ("mode" in spec.search) {
    // Strategy: bind to this print's view; every cutoff is derived.
    if (style.sizeScale === undefined) {
      throw new Error("a search strategy derives its depth from the style's declared sizeScale");
    }
    population = spec.search.populationFor({
      window: { left, top, worldW, worldH },
      worldPerPixel: worldH / imgHeight,
      sizeScale: style.sizeScale,
    });
    polynomials = population.enumerate(onBatch);
  } else if (spec.search.kind === "box") {
    polynomials = enumerateBox(family, spec.search, onBatch);
  } else {
    if (degree !== 2) throw new Error("inverse search supports quadratics only (for now)");
    // Trace points: one per output pixel (constant-ink default seeding).
    polynomials = harvestQuadratics(
      spec.search,
      { left, top, worldW, worldH },
      width, imgHeight,
      onBatch,
    );
  }

  return {
    rgb: develop(raster),
    width,
    height: imgHeight,
    stats: {
      polynomials,
      roots,
      drawn,
      ...(population ? { population: population.describe() } : {}),
    },
  };
}
