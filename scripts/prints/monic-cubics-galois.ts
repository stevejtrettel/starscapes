/**
 * The monic cubic starscape colored by Galois group — the first picture
 * from the coloring pillar. Same frame and disc¼ sizing as
 * monic-cubics-cone, but WITHOUT the irreducible cut: reducible cubics
 * (the embedded quadratic starscape) recede to gray, C₃ cubics (disc a
 * perfect square — the cyclic, totally-real-field case) glow amber, S₃
 * blue. The legend prints from the rule's declared classes — derived, not
 * hand-maintained.
 * Usage: node monic-cubics-galois.ts [DUST_R] [c] [W] [H]
 */

import { byGaloisGroup } from "../../src/core/coloring.ts";
import { viewConeMonicCubics, visibleReachMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const DUST_R = Number(process.argv[2] ?? 4);
const C_SZ = Number(process.argv[3] ?? 0.03);
const W_PX = Number(process.argv[4] ?? 3600);
const H_PX = Number(process.argv[5] ?? W_PX);

const law = discLaw({ alpha: 0.25, beta: 0, c: C_SZ, degree: 3 }); // the uniformity locus
const coloring = byGaloisGroup(3);
const rgb = new Float64Array(3); // the author-owned scratch (scene.ts, Dot)

console.log(`monic-cubics-galois: ${W_PX}x${H_PX}px, c = ${C_SZ}, R = ${DUST_R}`);
print(`monic-cubics-galois-${DUST_R}-${C_SZ}-${W_PX}x${H_PX}`, {
  view: { center: [0, 1.0], height: 2.4 },
  image: { width: W_PX, height: H_PX, compositing: "opaque" },
  picture: (view) => ({
    collection: viewConeMonicCubics({
      window: view.window,
      rho: visibleReachMonicCubics(C_SZ, view.worldPerPixel, DUST_R),
      pad: C_SZ,
    }),
    legend: coloring,
    draw(poly, dot) {
      // No irreducible cut: "reducible" is a class here.
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        coloring.color(root, rgb);
        dot(root, law.size(root), rgb[0], rgb[1], rgb[2]);
      }
    },
  }),
});
