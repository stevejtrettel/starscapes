/**
 * E6: ink-budget depth across the E4/E5 zoom ladder. Mirrors the live
 * worker's mechanism exactly. See docs/experiments.md for the prediction.
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";

const Z0 = { re: 0.318, im: 0.842 };
const VIEWPORT = 600;
const SIZE_SCALE = 0.035;
const RADIUS_CAP = 0.5;
const INK_BUDGET = 0.25;
const DOT_MIN_PX = 0.5;
const DEPTH_GUARD = 100_000;

console.log("k | height   | depth reached | kept dots | ink % | ms");
for (let k = 0; k <= 9; k++) {
  const height = 2.6 / 2 ** k;
  const pxPerWorld = VIEWPORT / height;
  const budgetPx = INK_BUDGET * VIEWPORT * VIEWPORT;
  const pad = SIZE_SCALE / 2;
  const window = {
    left: Z0.re - height / 2 - pad,
    top: Z0.im + height / 2 + pad,
    worldW: height + 2 * pad,
    worldH: height + 2 * pad,
  };

  const slots = allocRootSlots(4096, 2);
  const t0 = performance.now();
  let inkPx = 0;
  let kept = 0;
  let aReached = 0;

  for (let a = 1; a <= DEPTH_GUARD; a++) {
    coneQuadratics(window, a, a, (coeffs, count) => {
      solveQuadraticBatch(coeffs, count, slots);
      for (let i = 0; i < count; i++) {
        if (discriminant(coeffs, i * 3, 2) >= 0) continue;
        const im = slots.im[i * 2];
        const rHyp = Math.min(RADIUS_CAP, SIZE_SCALE / Math.sqrt(-discriminant(coeffs, i * 3, 2)));
        const rPx = Math.max(rHyp * im * pxPerWorld, DOT_MIN_PX);
        inkPx += Math.PI * rPx * rPx;
        kept++;
      }
    });
    aReached = a;
    if (inkPx >= budgetPx) break;
  }
  const ms = performance.now() - t0;

  console.log(
    `${k} | ${height.toExponential(2)} | ${String(aReached).padStart(10)} | ` +
    `${String(kept).padStart(8)} | ${(100 * inkPx / (VIEWPORT * VIEWPORT)).toFixed(1)} | ${ms.toFixed(1)}`,
  );
}
