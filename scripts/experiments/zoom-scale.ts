/**
 * E9: zoom-adaptive size scale across the zoom ladder — fixed c vs
 * c(h) = c₀·(h/2.6)^⅓, mirroring the live worker. Reports population and
 * ink fraction (Σ per-dot pixel area, each clipped at screen area).
 * See docs/experiments.md for the prediction.
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";

const Z0 = { re: 0.318, im: 0.842 };
const VIEWPORT = 600;
const C0 = 0.035;
const RADIUS_CAP = 0.5;
const DUST_FACTOR = 3;
const DEPTH_FLOOR = 5;
const DOT_MIN_PX = 0.5;
const HOME_HEIGHT = 2.6;

function run(height: number, adaptive: boolean): { pop: number; ink: number; aMax: number; ms: number } {
  const t0 = performance.now();
  const c = adaptive ? C0 * Math.cbrt(height / HOME_HEIGHT) : C0;
  const aMax = Math.max(DEPTH_FLOOR, Math.ceil((DUST_FACTOR * c * VIEWPORT) / (2 * height)));
  const pxPerWorld = VIEWPORT / height;
  const screenPx = VIEWPORT * VIEWPORT;
  const pad = c / 2;
  const window = {
    left: Z0.re - height / 2 - pad,
    top: Z0.im + height / 2 + pad,
    worldW: height + 2 * pad,
    worldH: height + 2 * pad,
  };

  const slots = allocRootSlots(4096, 2);
  let pop = 0;
  let inkPx = 0;
  coneQuadratics(window, 1, aMax, (coeffs, count) => {
    solveQuadraticBatch(coeffs, count, slots);
    for (let i = 0; i < count; i++) {
      const disc = discriminant(coeffs, i * 3, 2);
      if (disc >= 0) continue;
      const im = slots.im[i * 2];
      const rHyp = Math.min(RADIUS_CAP, c / Math.sqrt(-disc));
      const rPx = Math.max(rHyp * im * pxPerWorld, DOT_MIN_PX);
      inkPx += Math.min(Math.PI * rPx * rPx, screenPx);
      pop++;
    }
  });

  return { pop, ink: inkPx / screenPx, aMax, ms: performance.now() - t0 };
}

console.log("k | height   | FIXED pop / ink% / depth | ADAPTIVE pop / ink% / depth | ms(adaptive)");
for (let k = 0; k <= 9; k++) {
  const height = 2.6 / 2 ** k;
  const f = run(height, false);
  const a = run(height, true);
  console.log(
    `${k} | ${height.toExponential(2)} | ${String(f.pop).padStart(8)} / ${(100 * f.ink).toFixed(0).padStart(5)} / ${f.aMax} | ` +
    `${String(a.pop).padStart(8)} / ${(100 * a.ink).toFixed(0).padStart(4)} / ${a.aMax} | ${a.ms.toFixed(0)}`,
  );
}
