/**
 * The monic cubic starscape, uniformly viewed: the classic frame drawn
 * from the view-cone population Φ₃ᵐᵒⁿ(W, ρ) — every monic integer cubic
 * with a complex root in the window and real root within ρ of it
 * (docs/monic-cubic-sampling.md; E13). Irreducible only, UHP pairs,
 * hyperbolic sizing. No box, hence no nebulae; no saturation by theorem.
 * DUST_R multiplies the visibility cutoff for print texture (population
 * ∝ ρ³ makes dust cheap — labeled aesthetic dial).
 */
import { cubicIrreducible, discriminant } from "../../src/core/invariants.ts";
import { coneMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { solveCubicBatch } from "../../src/core/solve/cubic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";
import { writePng } from "../../src/offline/png.ts";
import { createRaster, depositDisk, develop } from "../../src/render/raster.ts";

const VIEW = { centerRe: 0, centerIm: 1.0, height: 2.4 };
const W_PX = Number(process.argv[5] ?? 3600);
const H_PX = Number(process.argv[6] ?? W_PX); // frame width follows aspect
const SS = 2;
const C_SZ = Number(process.argv[3] ?? 0.03);
const RADIUS_CAP = 0.5;
const DUST = 3;   // visibility dust factor (as everywhere)
const DUST_R = Number(process.argv[2] ?? 4); // extra print-texture depth on ρ (aesthetic, labeled)
// Sizing law: "disc" = hyperbolic c/sqrt|disc| (world r ∝ 1/q, steep, convergent ink)
// vs "fprime" = c/|f'(z)| (world r ∝ 1/sqrt(q), the faithful generalization of the
// quadratic 1/2a law — |f'(z)| = 2y*sqrt(q); see chat/docs). Same population either way.
const SIZING = (process.argv[4] ?? "disc") as "disc" | "fprime" | "disc4";


const p = VIEW.height / H_PX;
const rho = DUST_R * Math.sqrt((DUST * C_SZ) / (2 * p));

const worldW = VIEW.height * (W_PX / H_PX);
const left = VIEW.centerRe - worldW / 2;
const top = VIEW.centerIm + VIEW.height / 2;
const pxPerWorld = (H_PX / VIEW.height) * SS;
const pad = C_SZ / 2;
const window = { left: left - pad, top: top + pad, worldW: worldW + 2 * pad, worldH: VIEW.height + 2 * pad };

console.log(`monic-cubics-cone: ${W_PX}x${H_PX}px, c = ${C_SZ}, ρ = ${rho.toFixed(1)}`);

const t0 = performance.now();
const raster = createRaster(W_PX, H_PX, "opaque", SS);
const slots = allocRootSlots(4096, 3);
const realRoots = new Float64Array(3);
let drawn = 0;

const candidates = coneMonicCubics(window, rho, (coeffs, count) => {
  solveCubicBatch(coeffs, count, slots);
  for (let i = 0; i < count; i++) {
    const off = i * 4;
    const disc = discriminant(coeffs, off, 3);
    if (disc >= 0) continue; // need a complex pair

    let nReal = 0;
    let re = 0;
    let im = -1;
    for (let k = 0; k < slots.count[i]; k++) {
      const y = slots.im[i * 3 + k];
      if (y === 0) realRoots[nReal++] = slots.re[i * 3 + k];
      else if (y > 0) {
        re = slots.re[i * 3 + k];
        im = y;
      }
    }
    if (im <= 0) continue;
    if (!cubicIrreducible(coeffs, off, realRoots, nReal)) continue;

    // q = sqrt|disc|/(2y); world radius: disc-law c/2q, fprime-law c/(2*sqrt(q)).
    const q = Math.sqrt(-disc) / (2 * im);
    // disc: c/2q (steep, vertically even) · fprime: c/2√q (harmonic, top-heavy)
    // disc4: c/|disc|^{1/4} — the geometric mean: harmonic in depth AND
    // vertically even (the y^{-1/2} squares away the family's 2y·dy measure).
    const rWorld = SIZING === "disc"
      ? Math.min(RADIUS_CAP * im, C_SZ / (2 * q))
      : SIZING === "fprime"
        ? Math.min(RADIUS_CAP * im, C_SZ / (2 * Math.sqrt(q)))
        : Math.min(RADIUS_CAP * im, C_SZ / Math.sqrt(Math.sqrt(-disc)));
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
console.log(`  ${candidates} candidates, ${drawn} drawn — ${((tMarch - t0) / 1000).toFixed(1)} s`);

writePng(`outputs/monic-cubics-cone-${DUST_R}-${C_SZ}-${SIZING}-${W_PX}x${H_PX}.png`, develop(raster), W_PX, H_PX);
console.log(`  written — ${((performance.now() - tMarch) / 1000).toFixed(1)} s → outputs/monic-cubics-cone-${DUST_R}-${C_SZ}-${SIZING}-${W_PX}x${H_PX}.png`);
