/**
 * The quadratic starscape at print scale: the backward view-cone strategy
 * (Φ_cone at the derived visibility depth, docs/live-sampling.md) through
 * the shared print pipeline — the E8-validated look, with resolution doing
 * the deepening.
 * Usage: node quadratics-cone.ts [c] [W] [H] [std|uniform]
 * uniform: r_world = c·√y/√|disc| — the β = ½ law on the quadratic
 * uniformity locus (member density 4a²y per unit area, so ink(y) ~
 * y^{1−2β}; std's β = 0 shows the observed y-gradient).
 */

import { viewConeQuadratics } from "../../src/core/search/cone.ts";
import { type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const C_SZ = Number(process.argv[2] ?? 0.035);
const W_PX = Number(process.argv[3] ?? 3600);
const H_PX = Number(process.argv[4] ?? W_PX);
const SIZING = (process.argv[5] ?? "std") as "std" | "uniform";
const RADIUS_CAP = 0.5;

const style: Style = {
  sizeUnits: "hyperbolic",
  sizeScale: C_SZ,
  size: SIZING === "std"
    ? (row) => Math.min(RADIUS_CAP, C_SZ / Math.sqrt(Math.abs(row.disc)))
    : (row) => Math.min(RADIUS_CAP, C_SZ / (Math.sqrt(row.im) * Math.sqrt(Math.abs(row.disc)))),
  color: solid(0.05, 0.05, 0.05),
};

console.log(`quadratics-cone: ${W_PX}x${H_PX}px, c = ${C_SZ}, ${SIZING}`);
const t0 = performance.now();

const result = renderPrint({
  search: viewConeQuadratics(),
  filters: [upperHalfPlane],
  style,
  view: { center: [0, 1.1], height: 2.6 },
  image: { width: W_PX, height: H_PX, compositing: "opaque" },
});

const tRender = performance.now();
console.log(
  `  ${result.stats.population} — ${result.stats.polynomials} quadratics, ` +
  `${result.stats.drawn} drawn — ${((tRender - t0) / 1000).toFixed(1)} s`,
);

writePng(`outputs/quadratics-cone-${C_SZ}-${SIZING}-${W_PX}x${H_PX}.png`, result.rgb, W_PX, H_PX);
console.log(`  written — ${((performance.now() - tRender) / 1000).toFixed(1)} s`);
