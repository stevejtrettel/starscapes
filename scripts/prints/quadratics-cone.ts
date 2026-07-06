/**
 * The quadratic starscape at print scale: Φ_cone at the derived visibility
 * depth (docs/live-sampling.md) — the E8-validated look, with resolution
 * doing the deepening.
 * Usage: node quadratics-cone.ts [c] [W] [H] [std|uniform]
 * uniform: r_world = c·√y/√|disc| — the β = ½ law on the quadratic
 * uniformity locus. The depth derivation holds for the CLASSIC law, so the
 * uniform comparison draws its law over the classic-law population — two
 * visible values below (the E-known near-axis under-march, labeled; a
 * uniform-law depth derivation is queued design work).
 */

import { viewConeQuadratics, visibleDepthQuadratics } from "../../src/core/search/cone.ts";
import { classic, uniform } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const C_SZ = Number(process.argv[2] ?? 0.035);
const W_PX = Number(process.argv[3] ?? 3600);
const H_PX = Number(process.argv[4] ?? W_PX);
const SIZING = (process.argv[5] ?? "std") as "std" | "uniform";

const law = SIZING === "std" ? classic(C_SZ) : uniform(C_SZ);

console.log(`quadratics-cone: ${W_PX}x${H_PX}px, c = ${C_SZ}, ${SIZING}`);
print(`quadratics-cone-${C_SZ}-${SIZING}-${W_PX}x${H_PX}`, {
  view: { center: [0, 1.1], height: 2.6 },
  image: { width: W_PX, height: H_PX, compositing: "opaque" },
  picture: (view) => ({
    collection: viewConeQuadratics({
      window: view.window,
      aMax: visibleDepthQuadratics(C_SZ, view.worldPerPixel), // classic-law depth
      pad: C_SZ / 2, // escape pad = the biggest dot (a = 1)
    }),
    draw(poly, dot) {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    },
  }),
});
