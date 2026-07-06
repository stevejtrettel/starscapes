/**
 * Uniformity experiment: the `visual` criterion (root-space-constant tube)
 * plus adaptive march depth (aMax ∝ 1/y), against the fixed-ε baseline.
 * Prediction: the top-heavy dust gradient flattens and the near-axis
 * undersampling fills in.
 */
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { inverse } from "../../src/core/search/inverse.ts";
import { classic } from "../../src/core/sizing.ts";
import { type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const SIZE = 800;
const style: Style = {
  sizing: classic(0.035),
  color: solid(0.05, 0.05, 0.05),
};

const search = inverse({
  aMax: 400,
  epsilon: 0.07,       // root-space scale: ε(z) = ε₀/‖(1, z, z²)‖
  criterion: "visual",
  adaptiveDepth: 9,    // march to a ≈ 9/y before the hard cap
});

const t0 = performance.now();
const result = renderPrint({
  family: integerPolynomials({ degree: 2 }),
  search,
  filters: [upperHalfPlane],
  style,
  view: { center: [0, 1.1], height: 2.6 },
  image: { width: SIZE, compositing: "opaque" },
});
const ms = performance.now() - t0;

writePng("outputs/uniform-visual.png", result.rgb, result.width, result.height);
console.log(
  `visual+adaptive: ${result.stats.polynomials} polys, ${result.stats.drawn} drawn, ${ms.toFixed(0)} ms`,
);
