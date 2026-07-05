/**
 * E12: the deep geodesic print with SUB-HALO local quotas — 8px cells
 * (smaller than the existence halos), quota scaled to cell area, and a
 * cells-outer march (each cell runs its own contiguous cone ranges; prints
 * don't need the live view's levels-outer streaming). See
 * docs/experiments.md E12 for the prediction.
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";
import { writePng } from "../../src/offline/png.ts";
import { createRaster, depositDisk, develop } from "../../src/render/raster.ts";
import { ownsRoot, tileGrid } from "../../src/live/tiling.ts";

const VIEW = { centerRe: 0.6, centerIm: 0.8, height: 0.15 };
const SIZE = 3600;
const SS = 2;
const C0 = 0.035;
const HOME_HEIGHT = 2.6;
const RADIUS_CAP = 0.5;
const DUST_FACTOR = 3;
const CELL_PX = 8;
const N_QUOTA = 3; // 48 · (8/32)² — the same density target as E10/E11
const A_BLOCK = 64; // stop checks at block granularity (deterministic)
const WORK_GUARD = 2_000_000;
const DEPTH_GUARD = 100_000;

const cEff = C0 * Math.cbrt(VIEW.height / HOME_HEIGHT);
const aUniform = Math.ceil((DUST_FACTOR * cEff * SIZE) / (2 * VIEW.height));

const worldW = VIEW.height;
const left = VIEW.centerRe - worldW / 2;
const top = VIEW.centerIm + VIEW.height / 2;
const pxPerWorld = (SIZE / VIEW.height) * SS;
const pad = cEff / 2;
const paddedWindow = { left: left - pad, top: top + pad, worldW: worldW + 2 * pad, worldH: VIEW.height + 2 * pad };

const cellWorld = (CELL_PX * VIEW.height) / SIZE;
const grid = tileGrid(VIEW, SIZE, SIZE, CELL_PX, cellWorld);
const aMargin = Math.ceil(cEff / (2 * cellWorld));

console.log(
  `geodesic-fill: ${SIZE}px, c = ${cEff.toFixed(4)}, floor a ≤ ${aUniform}, ` +
  `${grid.tiles.length} cells of ${CELL_PX}px, quota ${N_QUOTA}, margin a ≤ ${aMargin}`,
);

const t0 = performance.now();
const raster = createRaster(SIZE, SIZE, "opaque", SS);
const slots = allocRootSlots(4096, 2);
let drawn = 0;
let polynomials = 0;
let deepest = 0;

const draw = (re: number, im: number, disc: number): void => {
  const rHyp = Math.min(RADIUS_CAP, cEff / Math.sqrt(-disc));
  depositDisk(
    raster,
    (re - left) * pxPerWorld,
    (top - im) * pxPerWorld,
    rHyp * im * pxPerWorld,
    0.05, 0.05, 0.05,
  );
  drawn++;
};

// Pass 1: margin dots (bigger than a cell), whole padded window.
if (aMargin >= 1) {
  polynomials += coneQuadratics(paddedWindow, 1, aMargin, (coeffs, count) => {
    solveQuadraticBatch(coeffs, count, slots);
    for (let i = 0; i < count; i++) {
      const disc = discriminant(coeffs, i * 3, 2);
      if (disc < 0) draw(slots.re[i * 2], slots.im[i * 2], disc);
    }
  });
}

// Pass 2: cells-outer — each cell marches its own contiguous ranges.
let quotaStops = 0;
let workStops = 0;
for (let ti = 0; ti < grid.tiles.length; ti++) {
  const t = grid.tiles[ti];
  if (t.top <= 0) continue;
  const w = { left: t.left, top: t.top, worldW: t.right - t.left, worldH: t.top - t.bottom };

  let owned = 0;
  let work = 0;
  let a = 1;
  while (a <= DEPTH_GUARD) {
    const aTo = Math.min(DEPTH_GUARD, a + A_BLOCK - 1);
    coneQuadratics(w, a, aTo, (coeffs, count) => {
      solveQuadraticBatch(coeffs, count, slots);
      for (let i = 0; i < count; i++) {
        const aCoef = coeffs[i * 3 + 2];
        const disc = discriminant(coeffs, i * 3, 2);
        if (disc >= 0) continue;
        const re = slots.re[i * 2];
        const im = slots.im[i * 2];
        if (!ownsRoot(t, re, im)) continue;
        owned++;
        if (aCoef > aMargin) {
          polynomials++;
          draw(re, im, disc);
        }
      }
    });
    // Work proxy: b-range summed over the block.
    work += (aTo - a + 1) * Math.max(1, (a + aTo) * (t.right - t.left) + 1);
    if (aTo > deepest) deepest = aTo;
    a = aTo + 1;
    if (owned >= N_QUOTA && a > aUniform) { quotaStops++; break; }
    if (work >= WORK_GUARD) { workStops++; break; }
  }

  if ((ti + 1) % 50_000 === 0) {
    console.log(`  … ${ti + 1}/${grid.tiles.length} cells, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  }
}

const tMarch = performance.now();
console.log(
  `  ${polynomials} polynomials, ${drawn} drawn, deepest ${deepest}, ` +
  `stops: ${quotaStops} quota / ${workStops} work — ${((tMarch - t0) / 1000).toFixed(1)} s`,
);

writePng("outputs/geodesic-fill.png", develop(raster), SIZE, SIZE);
console.log(`  written — ${((performance.now() - tMarch) / 1000).toFixed(1)} s → outputs/geodesic-fill.png`);
