/**
 * E4: measure the zoom depth wall (see docs/experiments.md for the
 * prediction). Mirrors the live worker's parameters exactly; zooms into a
 * fixed point and records demanded vs delivered depth, harvest count, time.
 */
import { harvestQuadratics, inverse } from "../../src/core/search/inverse.ts";

const Z0 = { re: 0.318, im: 0.842 };
const VIEWPORT = 600; // square; seeds at half resolution, as in the worker
const SIZE_SCALE = 0.035;
const DUST_FACTOR = 3;
const DEPTH_FLOOR = 5;
const DEPTH_CEIL = 800;

console.log("k | height   | demanded a | delivered a | harvested | ms");
for (let k = 0; k <= 9; k++) {
  const height = 2.6 / 2 ** k;
  const demanded = Math.max(
    DEPTH_FLOOR,
    Math.ceil((DUST_FACTOR * SIZE_SCALE * VIEWPORT) / (2 * height)),
  );
  const delivered = Math.min(DEPTH_CEIL, demanded);

  const worldW = height;
  const window = {
    left: Z0.re - worldW / 2,
    top: Z0.im + height / 2,
    worldW,
    worldH: height,
  };
  const seeds = Math.ceil(VIEWPORT / 2);
  const search = inverse({ aMax: delivered, epsilon: 2 * SIZE_SCALE, criterion: "visual" });

  const t0 = performance.now();
  let harvested = 0;
  harvestQuadratics(search, window, seeds, seeds, (_coeffs, count) => {
    harvested += count;
  });
  const ms = performance.now() - t0;

  console.log(
    `${k} | ${height.toExponential(2)} | ${String(demanded).padStart(8)} | ` +
    `${String(delivered).padStart(8)} | ${String(harvested).padStart(9)} | ${ms.toFixed(0)}`,
  );
}
