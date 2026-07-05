/**
 * E11: the deep geodesic print with PRINT-SCALE LOCAL QUOTAS — the uniform
 * print depth as floor, plus per-cell marching until each 32px print cell
 * owns N* members. At print resolution a cell ≈ halo width, so the quota
 * targets the existence halos exactly; empty-level scans there cost only
 * ∝ a·cellWidth. See docs/experiments.md E11 for the prediction.
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
const CELL_PX = 32;
const N_QUOTA = 48;
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
  `geodesic-deep-quota: ${SIZE}px, c = ${cEff.toFixed(4)}, floor a ≤ ${aUniform}, ` +
  `${grid.tiles.length} cells, margin a ≤ ${aMargin}`,
);

const t0 = performance.now();
const raster = createRaster(SIZE, SIZE, "opaque", SS);
const slots = allocRootSlots(4096, 2);
let drawn = 0;
let polynomials = 0;

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

// Pass 2: per-cell quota march (uniform depth as floor).
const cells = grid.tiles;
const ownedCount = new Int32Array(cells.length);
const work = new Float64Array(cells.length);
const stopped = new Uint8Array(cells.length);
let active = cells.length;
for (let ti = 0; ti < cells.length; ti++) {
  if (cells[ti].top <= 0) { stopped[ti] = 1; active--; }
}

let deepest = 0;
for (let a = 1; a <= DEPTH_GUARD && active > 0; a++) {
  deepest = a;
  const emit = a > aMargin;
  for (let ti = 0; ti < cells.length; ti++) {
    if (stopped[ti]) continue;
    const t = cells[ti];
    const w = { left: t.left, top: t.top, worldW: t.right - t.left, worldH: t.top - t.bottom };
    coneQuadratics(w, a, a, (coeffs, count) => {
      if (emit) polynomials += count;
      solveQuadraticBatch(coeffs, count, slots);
      for (let i = 0; i < count; i++) {
        const disc = discriminant(coeffs, i * 3, 2);
        if (disc >= 0) continue;
        const re = slots.re[i * 2];
        const im = slots.im[i * 2];
        if (!ownsRoot(t, re, im)) continue;
        ownedCount[ti]++;
        if (emit) draw(re, im, disc);
      }
    });
    work[ti] += Math.max(1, 2 * a * (t.right - t.left) + 1);
    if ((ownedCount[ti] >= N_QUOTA && a >= aUniform) || work[ti] >= WORK_GUARD) {
      stopped[ti] = 1;
      active--;
    }
  }
  if (a % 500 === 0) console.log(`  … level ${a}, ${active} cells still digging`);
}

const tMarch = performance.now();
console.log(
  `  ${polynomials} polynomials, ${drawn} drawn, deepest level ${deepest} — ` +
  `${((tMarch - t0) / 1000).toFixed(1)} s`,
);

writePng("outputs/geodesic-deep-quota.png", develop(raster), SIZE, SIZE);
console.log(`  written — ${((performance.now() - tMarch) / 1000).toFixed(1)} s → outputs/geodesic-deep-quota.png`);
