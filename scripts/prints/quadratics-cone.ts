/**
 * The quadratic starscape at print scale: view-cone population at the
 * derived visibility depth (docs/live-sampling.md), hyperbolic sizing —
 * the E8-validated look, with resolution doing the deepening.
 * Usage: node quadratics-cone.ts [c] [W] [H] [std|uniform]
 * uniform: r_world = c*sqrt(y)/sqrt|disc| — the beta = 1/2 law on the
 * quadratic uniformity locus (member density 4a^2*y per unit area, so
 * ink(y) ~ y^{1-2beta}; std's beta = 0 shows the observed y-gradient).
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";
import { writePng } from "../../src/offline/png.ts";
import { createRaster, depositDisk, develop } from "../../src/render/raster.ts";

const VIEW = { centerRe: 0, centerIm: 1.1, height: 2.6 };
const C_SZ = Number(process.argv[2] ?? 0.035);
const W_PX = Number(process.argv[3] ?? 3600);
const H_PX = Number(process.argv[4] ?? W_PX);
const SS = 2;
const RADIUS_CAP = 0.5;
const DUST_FACTOR = 3;
const SIZING = (process.argv[5] ?? "std") as "std" | "uniform";

const aMax = Math.ceil((DUST_FACTOR * C_SZ * H_PX) / (2 * VIEW.height));
const worldW = VIEW.height * (W_PX / H_PX);
const left = VIEW.centerRe - worldW / 2;
const top = VIEW.centerIm + VIEW.height / 2;
const pxPerWorld = (H_PX / VIEW.height) * SS;
const pad = C_SZ / 2;
const window = { left: left - pad, top: top + pad, worldW: worldW + 2 * pad, worldH: VIEW.height + 2 * pad };

console.log(`quadratics-cone: ${W_PX}x${H_PX}px, c = ${C_SZ}, depth a ≤ ${aMax}`);

const t0 = performance.now();
const raster = createRaster(W_PX, H_PX, "opaque", SS);
const slots = allocRootSlots(4096, 2);
let drawn = 0;

const polys = coneQuadratics(window, 1, aMax, (coeffs, count) => {
  solveQuadraticBatch(coeffs, count, slots);
  for (let i = 0; i < count; i++) {
    const disc = discriminant(coeffs, i * 3, 2);
    if (disc >= 0) continue; // UHP pairs only (automatically irreducible)
    const re = slots.re[i * 2];
    const im = slots.im[i * 2];
    const rWorld = SIZING === "std"
      ? Math.min(RADIUS_CAP * im, (C_SZ / Math.sqrt(-disc)) * im)
      : Math.min(RADIUS_CAP * im, (C_SZ * Math.sqrt(im)) / Math.sqrt(-disc));
    depositDisk(
      raster,
      (re - left) * pxPerWorld,
      (top - im) * pxPerWorld,
      rWorld * pxPerWorld,
      0.05, 0.05, 0.05,
    );
    drawn++;
  }
});

const tMarch = performance.now();
console.log(`  ${polys} quadratics, ${drawn} drawn — ${((tMarch - t0) / 1000).toFixed(1)} s`);

writePng(`outputs/quadratics-cone-${C_SZ}-${SIZING}-${W_PX}x${H_PX}.png`, develop(raster), W_PX, H_PX);
console.log(`  written — ${((performance.now() - tMarch) / 1000).toFixed(1)} s`);
