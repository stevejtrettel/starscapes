/**
 * First light: integer quadratics in a box — the classic test case.
 * Roots of ax² + bx + c, |a|,|b|,|c| ≤ 40, upper half plane, sized by the
 * January hyperbolic-radius law c/|disc| — the (γ, δ) = (2, 1) point,
 * steeper in depth than classic(c) — opaque compositing (smaller disks on
 * top).
 */
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box } from "../../src/core/search/forward.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const style: Style = {
  sizing: discLaw({ alpha: 1, beta: 1, c: 0.06, degree: 2 }),
  color: solid(0.05, 0.05, 0.05),
};

for (const compositing of ["opaque", "additive"] as const) {
  const t0 = performance.now();
  const result = renderPrint({
    family: integerPolynomials({ degree: 2 }),
    search: box(40),
    filters: [upperHalfPlane],
    style,
    view: { center: [0, 1.1], height: 2.6 },
    image: { width: 1600, compositing },
  });
  const ms = performance.now() - t0;

  const out = `outputs/first-light-${compositing}.png`;
  writePng(out, result.rgb, result.width, result.height);
  const { polynomials, roots, drawn } = result.stats;
  console.log(
    `first-light (${compositing}): ${polynomials} polynomials, ${roots} roots, ` +
    `${drawn} drawn, ${ms.toFixed(0)} ms → ${out}`,
  );
}
