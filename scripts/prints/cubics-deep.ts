/**
 * High-resolution cubic starscape: the classic full frame via forward box
 * search (view-blind is right when the view is the whole frame), at print
 * scale. Integer cubics ax³ + bx² + cx + d, upper-half-plane roots,
 * √|disc| hyperbolic sizing, opaque compositing.
 */
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box } from "../../src/core/search/forward.ts";
import { irreducibleOnly, type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const BOUND = 30; // 30 · 61³ ≈ 6.8M cubics
const SIZE = 3600;

const style: Style = {
  sizeUnits: "hyperbolic",
  size: (r) => Math.min(0.5, 0.03 / Math.sqrt(Math.abs(r.disc))),
  color: solid(0.05, 0.05, 0.05),
};

for (const [name, filters] of [
  ["all", [upperHalfPlane]],
  ["irreducible", [upperHalfPlane, irreducibleOnly]],
] as const) {
  const t0 = performance.now();
  const result = renderPrint({
    family: integerPolynomials({ degree: 3 }),
    search: box(BOUND),
    filters: [...filters],
    style,
    view: { center: [0, 1.0], height: 2.4 },
    image: { width: SIZE, compositing: "opaque" },
  });
  const ms = performance.now() - t0;

  const out = `outputs/cubics-deep-${name}.png`;
  writePng(out, result.rgb, result.width, result.height);
  const { polynomials, roots, drawn } = result.stats;
  console.log(
    `cubics-deep (${name}): ${polynomials} cubics, ${roots} roots, ${drawn} drawn, ` +
    `${(ms / 1000).toFixed(1)} s → ${out}`,
  );
}
