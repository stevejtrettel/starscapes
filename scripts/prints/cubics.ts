/**
 * First cubic picture: integer cubics in a box, upper-half-plane roots,
 * √|disc| hyperbolic sizing. Zero engine changes from the quadratic print —
 * the degree-generality check.
 */
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box } from "../../src/core/search/forward.ts";
import { type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const style: Style = {
  sizeUnits: "hyperbolic",
  size: (r) => Math.min(0.5, 0.05 / Math.sqrt(Math.abs(r.disc))),
  color: solid(0.05, 0.05, 0.05),
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
