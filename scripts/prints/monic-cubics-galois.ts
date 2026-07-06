/**
 * The monic cubic starscape colored by Galois group — the first picture
 * from the coloring pillar. Same frame and disc¼ sizing as
 * monic-cubics-cone, but WITHOUT the irreducible filter: reducible cubics
 * (the embedded quadratic starscape) recede to gray, C₃ cubics (disc a
 * perfect square — the cyclic, totally-real-field case) glow amber, S₃
 * blue. The legend prints from the rule's declared classes — derived, not
 * hand-maintained.
 * Usage: node monic-cubics-galois.ts [DUST_R] [c] [W] [H]
 */

import { byGaloisGroup } from "../../src/core/coloring.ts";
import { viewConeMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { type Style, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const DUST_R = Number(process.argv[2] ?? 4);
const C_SZ = Number(process.argv[3] ?? 0.03);
const W_PX = Number(process.argv[4] ?? 3600);
const H_PX = Number(process.argv[5] ?? W_PX);

const coloring = byGaloisGroup(3);
const style: Style = {
  sizing: discLaw({ alpha: 0.25, beta: 0, c: C_SZ, degree: 3 }), // the uniformity locus
  coloring,
};

const legend = coloring.classes
  ?.map((name, k) => {
    const [r, g, b] = coloring.palette![k];
    return `${name} = rgb(${r}, ${g}, ${b})`;
  })
  .join(" · ");
console.log(`monic-cubics-galois: ${W_PX}x${H_PX}px, c = ${C_SZ}, R = ${DUST_R}`);
console.log(`  legend: ${legend}`);

const t0 = performance.now();
const result = renderPrint({
  search: viewConeMonicCubics({ dustR: DUST_R }),
  filters: [upperHalfPlane], // no irreducible filter: "reducible" is a class here
  style,
  view: { center: [0, 1.0], height: 2.4 },
  image: { width: W_PX, height: H_PX, compositing: "opaque" },
});

const tRender = performance.now();
console.log(
  `  ${result.stats.population} — ${result.stats.polynomials} candidates, ` +
  `${result.stats.drawn} drawn — ${((tRender - t0) / 1000).toFixed(1)} s`,
);

const out = `outputs/monic-cubics-galois-${DUST_R}-${C_SZ}-${W_PX}x${H_PX}.png`;
writePng(out, result.rgb, W_PX, H_PX);
console.log(`  written — ${((performance.now() - tRender) / 1000).toFixed(1)} s → ${out}`);
