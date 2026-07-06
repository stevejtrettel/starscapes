/**
 * E13: monic cubic cone across a zoom ladder at FIXED size scale —
 * testing docs/monic-cubic-sampling.md's convergence claims (§4).
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { solveCubicBatch } from "../../src/core/solve/cubic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";

const Z0 = { re: 0.318, im: 0.842 };
const VIEWPORT = 600;
const C_SZ = 0.03;
const RADIUS_CAP = 0.5;
const DUST = 3;
const DOT_MIN_PX = 0.5;

console.log("k | height   | rho   | candidates | drawn | ink % | ms");
for (let k = 0; k <= 8; k++) {
  const height = 2.4 / 2 ** k;
  const p = height / VIEWPORT;
  const rho = Math.sqrt((DUST * C_SZ) / (2 * p));
  const pad = C_SZ / 2;
  const window = {
    left: Z0.re - height / 2 - pad,
    top: Z0.im + height / 2 + pad,
    worldW: height + 2 * pad,
    worldH: height + 2 * pad,
  };
  const pxPerWorld = VIEWPORT / height;
  const screenPx = VIEWPORT * VIEWPORT;

  const slots = allocRootSlots(4096, 3);
  const t0 = performance.now();
  let drawn = 0;
  let inkPx = 0;
  const candidates = coneMonicCubics(window, rho, (coeffs, count) => {
    solveCubicBatch(coeffs, count, slots);
    for (let i = 0; i < count; i++) {
      const disc = discriminant(coeffs, i * 4, 3);
      if (disc >= 0) continue; // need a complex pair
      // UHP member: find the slot with im > 0.
      for (let s = 0; s < slots.count[i]; s++) {
        const im = slots.im[i * 3 + s];
        if (im <= 0) continue;
        const rHyp = Math.min(RADIUS_CAP, C_SZ / Math.sqrt(-disc));
        const rPx = Math.max(rHyp * im * pxPerWorld, DOT_MIN_PX);
        inkPx += Math.min(Math.PI * rPx * rPx, screenPx);
        drawn++;
      }
    }
  });
  const ms = performance.now() - t0;

  console.log(
    `${k} | ${height.toExponential(2)} | ${rho.toFixed(1).padStart(5)} | ` +
    `${String(candidates).padStart(9)} | ${String(drawn).padStart(6)} | ` +
    `${(100 * inkPx / screenPx).toFixed(1).padStart(5)} | ${ms.toFixed(0)}`,
  );
}
