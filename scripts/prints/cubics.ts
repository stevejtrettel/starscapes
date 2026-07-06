/**
 * First cubic picture: integer cubics in a box, upper-half-plane roots,
 * √|disc| hyperbolic sizing. Zero engine changes from the quadratic print —
 * the degree-generality check.
 */

import { solid } from "../../src/core/coloring.ts";
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box } from "../../src/core/search/forward.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { type Style, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const style: Style = {
  // c·y/√|disc| — the steep (γ, δ) = (2, 2) point at degree 3 (sizing.ts).
  sizing: discLaw({ alpha: 0.5, beta: 1, c: 0.05, degree: 3 }),
  coloring: solid(0.05, 0.05, 0.05),
};

const t0 = performance.now();
const result = renderPrint({
  family: integerPolynomials({ degree: 3 }),
  search: box(10),
  filters: [upperHalfPlane],
  style,
  view: { center: [0, 1.0], height: 2.4 },
  image: { width: 1400, compositing: "opaque" },
});
const ms = performance.now() - t0;

writePng("outputs/cubics.png", result.rgb, result.width, result.height);
const { polynomials, roots, drawn } = result.stats;
console.log(`cubics: ${polynomials} polynomials, ${roots} roots, ${drawn} drawn, ${ms.toFixed(0)} ms`);
