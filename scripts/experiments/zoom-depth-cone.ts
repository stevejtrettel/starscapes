/**
 * E5: E4's zoom ladder, view-cone enumeration, no ceiling. See
 * docs/experiments.md for the prediction.
 */
import { coneQuadratics } from "../../src/core/search/cone.ts";

const Z0 = { re: 0.318, im: 0.842 };
const VIEWPORT = 600;
const SIZE_SCALE = 0.035;
const DUST_FACTOR = 3;
const DEPTH_FLOOR = 5;

console.log("k | height   | demanded a | population | ms");
for (let k = 0; k <= 9; k++) {
  const height = 2.6 / 2 ** k;
  const aMax = Math.max(
    DEPTH_FLOOR,
    Math.ceil((DUST_FACTOR * SIZE_SCALE * VIEWPORT) / (2 * height)),
  );
  const window = {
    left: Z0.re - height / 2,
    top: Z0.im + height / 2,
    worldW: height,
    worldH: height,
  };

  const t0 = performance.now();
  let population = 0;
  coneQuadratics(window, 1, aMax, (_coeffs, count) => {
    population += count;
  });
  const ms = performance.now() - t0;

  console.log(
    `${k} | ${height.toExponential(2)} | ${String(aMax).padStart(8)} | ` +
    `${String(population).padStart(9)} | ${ms.toFixed(1)}`,
  );
}
