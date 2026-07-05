/**
 * High-quality offline render of the geodesic window from the live
 * explorer — the same picture law (zoom-adaptive scale c(h), E9), resolved
 * at PRINT depth: the visibility law with print pixels gives ~5× the live
 * march depth, so the sub-pixel dust of the live view becomes resolved
 * tiny dots and the existence halos tighten by the same factor
 * (distance ≥ 1/2A). View-cone population, everything drawn, opaque
 * compositing, 2× supersampling.
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";
import { writePng } from "../../src/offline/png.ts";
import { createRaster, depositDisk, develop } from "../../src/render/raster.ts";

const VIEW = { centerRe: 0.6, centerIm: 0.8, height: 0.15 };
const SIZE = 3600; // square print, px
const SS = 2;
const C0 = 0.035;
const HOME_HEIGHT = 2.6;
const RADIUS_CAP = 0.5;
const DUST_FACTOR = 3;

const cEff = C0 * Math.cbrt(VIEW.height / HOME_HEIGHT); // the live picture's scale at this window
const aMax = Math.ceil((DUST_FACTOR * cEff * SIZE) / (2 * VIEW.height)); // print-depth visibility law

const worldW = VIEW.height;
const left = VIEW.centerRe - worldW / 2;
const top = VIEW.centerIm + VIEW.height / 2;
const pxPerWorld = (SIZE / VIEW.height) * SS;
const pad = cEff / 2;
const window = { left: left - pad, top: top + pad, worldW: worldW + 2 * pad, worldH: VIEW.height + 2 * pad };

console.log(`geodesic-deep: ${SIZE}px, c = ${cEff.toFixed(4)}, depth a ≤ ${aMax}`);

const t0 = performance.now();
const raster = createRaster(SIZE, SIZE, "opaque", SS);
const slots = allocRootSlots(4096, 2);
let drawn = 0;

const polys = coneQuadratics(window, 1, aMax, (coeffs, count) => {
  solveQuadraticBatch(coeffs, count, slots);
  for (let i = 0; i < count; i++) {
    const disc = discriminant(coeffs, i * 3, 2);
    if (disc >= 0) continue;
    const re = slots.re[i * 2];
    const im = slots.im[i * 2];
    const rHyp = Math.min(RADIUS_CAP, cEff / Math.sqrt(-disc));
    depositDisk(
      raster,
      (re - left) * pxPerWorld,
      (top - im) * pxPerWorld,
      rHyp * im * pxPerWorld,
      0.05, 0.05, 0.05,
    );
    drawn++;
  }
});

const tSolve = performance.now();
console.log(`  ${polys} polynomials, ${drawn} drawn — ${((tSolve - t0) / 1000).toFixed(1)} s`);

const rgb = develop(raster);
writePng("outputs/geodesic-deep.png", rgb, SIZE, SIZE);
console.log(`  developed + written — ${((performance.now() - tSolve) / 1000).toFixed(1)} s → outputs/geodesic-deep.png`);
