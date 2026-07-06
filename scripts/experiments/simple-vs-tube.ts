/**
 * E8: the simple approach (cone, v1 depth, draw everything) vs v1's tube
 * harvest vs a fixed box, on a geodesic-adjacent window. Decides which
 * ingredient of v1 filled the regions near thick geodesics. See
 * docs/experiments.md.
 */

import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { box, enumerateBox } from "../../src/core/search/forward.ts";
import { harvestQuadratics, inverse } from "../../src/core/search/inverse.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";
import { writePng } from "../../src/offline/png.ts";
import { createRaster, depositDisk, develop } from "../../src/render/raster.ts";

const VIEW = { centerRe: 0.6, centerIm: 0.8, height: 0.15 };
const SIZE = 700;
const SIZE_SCALE = 0.035;
const RADIUS_CAP = 0.5;
const DUST_FACTOR = 3;

const worldW = VIEW.height;
const left = VIEW.centerRe - worldW / 2;
const top = VIEW.centerIm + VIEW.height / 2;
const pxPerWorld = SIZE / VIEW.height;
const pad = SIZE_SCALE / 2;
const window = { left: left - pad, top: top + pad, worldW: worldW + 2 * pad, worldH: VIEW.height + 2 * pad };

// v1's derived depth law at this view.
const A_MAX = Math.ceil((DUST_FACTOR * SIZE_SCALE * SIZE) / (2 * VIEW.height)); // = 245

/** Render a stream of quadratic coefficient batches; returns strip stats. */
function render(
  name: string,
  source: (onBatch: (coeffs: Float64Array, count: number) => void) => number,
): void {
  const t0 = performance.now();
  const raster = createRaster(SIZE, SIZE, "opaque", 2);
  const slots = allocRootSlots(4096, 2);
  let drawn = 0;
  let inStrip = 0;

  const polys = source((coeffs, count) => {
    solveQuadraticBatch(coeffs, count, slots);
    for (let i = 0; i < count; i++) {
      const disc = discriminant(coeffs, i * 3, 2);
      if (disc >= 0) continue;
      const re = slots.re[i * 2];
      const im = slots.im[i * 2];
      const rHyp = Math.min(RADIUS_CAP, SIZE_SCALE / Math.sqrt(-disc));
      const cx = (re - left) * pxPerWorld * 2; // supersample 2
      const cy = (top - im) * pxPerWorld * 2;
      depositDisk(raster, cx, cy, rHyp * im * pxPerWorld * 2, 0.05, 0.05, 0.05);
      drawn++;
      if (Math.abs(re * re + im * im - 1) < 0.01) inStrip++;
    }
  });

  const ms = performance.now() - t0;
  writePng(`outputs/e8-${name}.png`, develop(raster), SIZE, SIZE);
  console.log(
    `${name}: ${polys} polys, ${drawn} drawn, ${inStrip} roots in strip ||z|²−1|<0.01, ${ms.toFixed(0)} ms`,
  );
}

console.log(`window ${VIEW.centerRe}±${worldW / 2} + ${VIEW.centerIm}i, depth A=${A_MAX}`);

// (A) Simple: cone, v1 depth, draw everything.
render("simple-cone", (onBatch) => coneQuadratics(window, 1, A_MAX, onBatch));

// (B) v1 tube: per-pixel rays, visual ε, same depth.
render("v1-tube", (onBatch) =>
  harvestQuadratics(
    inverse({ aMax: A_MAX, epsilon: 2 * SIZE_SCALE, criterion: "visual" }),
    window, Math.ceil(SIZE / 2), Math.ceil(SIZE / 2), onBatch,
  ));

// (C) Fixed box reference.
render("box40", (onBatch) => {
  let total = 0;
  enumerateBox(integerPolynomials({ degree: 2 }), box(40), (coeffs, count) => {
    onBatch(coeffs, count);
    total += count;
  });
  return total;
});
